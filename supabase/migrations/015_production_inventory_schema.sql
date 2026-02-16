-- ============================================================================
-- Migration 015: Production Inventory Schema
-- ============================================================================
--
-- CRITICAL CHANGES:
--   1. inventory_transactions   — batch grouping for movements
--   2. warehouse_cells.zone     — ambient / cold / hazmat zone tracking
--   3. inventory_movements      — add tx_id FK, product_id denormalization
--   4. inventory constraints    — multi-cell support, no-negative-qty
--   5. Capacity enforcement     — trigger rejects over-capacity writes
--   6. Atomic PL/pgSQL funcs   — fn_inventory_receive / transfer / adjust
--   7. Updated stock_balances   — view with zone
--   8. RLS for new table
--
-- BACKWARD COMPATIBILITY:
--   - inventory.location (text) is NOT dropped here.  API migration (step 3)
--     will stop writing it; a future migration will DROP COLUMN.
--   - cell_id remains NULLABLE for legacy rows.  New inserts should always
--     include cell_id; the composite unique enforces uniqueness for non-null.
-- ============================================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. inventory_transactions — groups movements into atomic batches
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text        NOT NULL DEFAULT 'miwang-main',
  tx_type       text        NOT NULL
                            CHECK (tx_type IN ('RECEIVE','SHIP','TRANSFER','ADJUST','COUNT')),
  status        text        NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','committed','rolled_back')),
  reference     text,                      -- PO number, shipment ID, etc.
  notes         text,
  user_id       text        NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  committed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_org_created
  ON public.inventory_transactions (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inv_tx_status_pending
  ON public.inventory_transactions (org_id, status)
  WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. warehouse_cells — add zone column
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'warehouse_cells'
      AND column_name  = 'zone'
  ) THEN
    ALTER TABLE public.warehouse_cells
      ADD COLUMN zone text NOT NULL DEFAULT 'ambient';

    ALTER TABLE public.warehouse_cells
      ADD CONSTRAINT chk_warehouse_cells_zone
      CHECK (zone IN ('ambient','cold','hazmat'));

    -- Backfill: cold cell_type → cold zone
    UPDATE public.warehouse_cells
    SET zone = 'cold'
    WHERE cell_type = 'cold' AND zone = 'ambient';
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. inventory_movements — add tx_id and product_id columns
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS tx_id uuid
  REFERENCES public.inventory_transactions(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_movements
  ADD COLUMN IF NOT EXISTS product_id uuid
  REFERENCES public.products(id) ON DELETE CASCADE;

-- Backfill product_id from inventory for existing rows
UPDATE public.inventory_movements m
SET product_id = i.product_id
FROM public.inventory i
WHERE m.item_id = i.id
  AND m.product_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_inv_movements_tx
  ON public.inventory_movements (tx_id) WHERE tx_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inv_movements_product
  ON public.inventory_movements (org_id, product_id, created_at DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. inventory — multi-cell support + no-negative-quantity
-- ═══════════════════════════════════════════════════════════════════════════

-- 4a. Drop the old UNIQUE on product_id (created inline in 001_initial_schema)
--     Postgres auto-names it: inventory_product_id_key
ALTER TABLE public.inventory
  DROP CONSTRAINT IF EXISTS inventory_product_id_key;

-- 4b. No-negative-quantity enforcement
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_inventory_qty_non_negative'
      AND conrelid = 'public.inventory'::regclass
  ) THEN
    ALTER TABLE public.inventory
      ADD CONSTRAINT chk_inventory_qty_non_negative
      CHECK (quantity >= 0);
  END IF;
END $$;

-- 4c. Composite unique — same product in same cell = one row
--     Partial index: only enforced when cell_id IS NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_product_cell
  ON public.inventory (org_id, product_id, cell_id)
  WHERE cell_id IS NOT NULL;

-- 4d. Legacy fallback — one row per product when cell_id IS NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_product_nocell
  ON public.inventory (org_id, product_id)
  WHERE cell_id IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Capacity enforcement trigger
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.check_cell_capacity()
RETURNS TRIGGER AS $$
DECLARE
  cell_cap int;
  current_total int;
BEGIN
  -- Skip check if no cell assigned
  IF NEW.cell_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get cell capacity (0 means unlimited)
  SELECT capacity INTO cell_cap
  FROM public.warehouse_cells
  WHERE id = NEW.cell_id;

  IF cell_cap IS NULL OR cell_cap <= 0 THEN
    RETURN NEW;
  END IF;

  -- Sum all inventory in this cell EXCLUDING the row being inserted/updated
  SELECT COALESCE(SUM(quantity), 0) INTO current_total
  FROM public.inventory
  WHERE cell_id = NEW.cell_id
    AND id IS DISTINCT FROM NEW.id;

  IF (current_total + NEW.quantity) > cell_cap THEN
    RAISE EXCEPTION
      'Cell capacity exceeded: current=%, adding=%, capacity=%',
      current_total, NEW.quantity, cell_cap
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_cell_capacity ON public.inventory;
CREATE TRIGGER trg_check_cell_capacity
  BEFORE INSERT OR UPDATE OF quantity, cell_id ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.check_cell_capacity();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Atomic transaction functions
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 6a. fn_inventory_receive (입고) ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_inventory_receive(
  p_org_id    text,
  p_user_id   text,
  p_reference text,
  p_items     jsonb   -- [{"product_id":"uuid","cell_id":"uuid","quantity":int}]
) RETURNS uuid AS $$
DECLARE
  v_tx_id  uuid;
  v_item   jsonb;
  v_inv_id uuid;
BEGIN
  -- Create transaction header
  INSERT INTO public.inventory_transactions
    (org_id, tx_type, status, reference, user_id)
  VALUES
    (p_org_id, 'RECEIVE', 'pending', p_reference, p_user_id)
  RETURNING id INTO v_tx_id;

  -- Process each line item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Upsert: same product + same cell → add quantity
    INSERT INTO public.inventory
      (org_id, product_id, cell_id, quantity, min_quantity)
    VALUES (
      p_org_id,
      (v_item ->> 'product_id')::uuid,
      (v_item ->> 'cell_id')::uuid,
      (v_item ->> 'quantity')::int,
      0
    )
    ON CONFLICT (org_id, product_id, cell_id) WHERE cell_id IS NOT NULL
    DO UPDATE SET
      quantity = public.inventory.quantity + (v_item ->> 'quantity')::int
    RETURNING id INTO v_inv_id;

    -- Capacity trigger fires on the INSERT/UPDATE above.
    -- If it raises, the whole transaction rolls back automatically.

    -- Record audit movement
    INSERT INTO public.inventory_movements
      (org_id, tx_id, item_id, product_id, to_cell_id,
       quantity, movement_type, user_id)
    VALUES (
      p_org_id, v_tx_id, v_inv_id,
      (v_item ->> 'product_id')::uuid,
      (v_item ->> 'cell_id')::uuid,
      (v_item ->> 'quantity')::int,
      'PUTAWAY', p_user_id
    );
  END LOOP;

  -- Commit transaction header
  UPDATE public.inventory_transactions
  SET status = 'committed', committed_at = now()
  WHERE id = v_tx_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- ─── 6b. fn_inventory_transfer (이동) ────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_inventory_transfer(
  p_org_id       text,
  p_user_id      text,
  p_product_id   uuid,
  p_from_cell_id uuid,
  p_to_cell_id   uuid,
  p_quantity     int,
  p_notes        text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_tx_id       uuid;
  v_from_inv_id uuid;
  v_to_inv_id   uuid;
  v_current_qty int;
BEGIN
  -- Validate
  IF p_quantity <= 0 THEN
    RAISE EXCEPTION 'Transfer quantity must be positive'
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_from_cell_id = p_to_cell_id THEN
    RAISE EXCEPTION 'Source and destination cells must differ'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Lock source row (SELECT ... FOR UPDATE prevents concurrent modification)
  SELECT id, quantity INTO v_from_inv_id, v_current_qty
  FROM public.inventory
  WHERE org_id     = p_org_id
    AND product_id = p_product_id
    AND cell_id    = p_from_cell_id
  FOR UPDATE;

  IF v_from_inv_id IS NULL THEN
    RAISE EXCEPTION 'Source inventory not found for product % in cell %',
      p_product_id, p_from_cell_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_current_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock: available=%, requested=%',
      v_current_qty, p_quantity
      USING ERRCODE = 'check_violation';
  END IF;

  -- Create transaction header
  INSERT INTO public.inventory_transactions
    (org_id, tx_type, status, notes, user_id)
  VALUES
    (p_org_id, 'TRANSFER', 'pending', p_notes, p_user_id)
  RETURNING id INTO v_tx_id;

  -- Decrease source
  UPDATE public.inventory
  SET quantity = quantity - p_quantity
  WHERE id = v_from_inv_id;

  -- Clean up zero-quantity rows
  DELETE FROM public.inventory
  WHERE id = v_from_inv_id AND quantity = 0;

  -- Increase destination (upsert)
  INSERT INTO public.inventory
    (org_id, product_id, cell_id, quantity, min_quantity)
  VALUES
    (p_org_id, p_product_id, p_to_cell_id, p_quantity, 0)
  ON CONFLICT (org_id, product_id, cell_id) WHERE cell_id IS NOT NULL
  DO UPDATE SET
    quantity = public.inventory.quantity + p_quantity
  RETURNING id INTO v_to_inv_id;

  -- Record audit movement
  INSERT INTO public.inventory_movements
    (org_id, tx_id, item_id, product_id,
     from_cell_id, to_cell_id, quantity,
     movement_type, user_id)
  VALUES (
    p_org_id, v_tx_id, v_to_inv_id, p_product_id,
    p_from_cell_id, p_to_cell_id, p_quantity,
    'TRANSFER', p_user_id
  );

  -- Commit
  UPDATE public.inventory_transactions
  SET status = 'committed', committed_at = now()
  WHERE id = v_tx_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- ─── 6c. fn_inventory_adjust (조정) ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.fn_inventory_adjust(
  p_org_id       text,
  p_user_id      text,
  p_product_id   uuid,
  p_cell_id      uuid,
  p_new_quantity int,
  p_reason       text
) RETURNS uuid AS $$
DECLARE
  v_tx_id   uuid;
  v_inv_id  uuid;
  v_old_qty int;
  v_delta   int;
BEGIN
  IF p_new_quantity < 0 THEN
    RAISE EXCEPTION 'Adjusted quantity cannot be negative'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Lock current row (or discover it doesn't exist)
  SELECT id, quantity INTO v_inv_id, v_old_qty
  FROM public.inventory
  WHERE org_id     = p_org_id
    AND product_id = p_product_id
    AND cell_id    = p_cell_id
  FOR UPDATE;

  -- Create transaction header
  INSERT INTO public.inventory_transactions
    (org_id, tx_type, status, notes, user_id)
  VALUES
    (p_org_id, 'ADJUST', 'pending', p_reason, p_user_id)
  RETURNING id INTO v_tx_id;

  IF v_inv_id IS NULL THEN
    -- No existing row → create
    INSERT INTO public.inventory
      (org_id, product_id, cell_id, quantity, min_quantity)
    VALUES
      (p_org_id, p_product_id, p_cell_id, p_new_quantity, 0)
    RETURNING id INTO v_inv_id;
    v_old_qty := 0;
  ELSE
    -- Update existing
    UPDATE public.inventory
    SET quantity = p_new_quantity
    WHERE id = v_inv_id;
  END IF;

  v_delta := p_new_quantity - v_old_qty;

  -- Record audit movement (skip if no actual change)
  IF v_delta != 0 THEN
    INSERT INTO public.inventory_movements
      (org_id, tx_id, item_id, product_id,
       from_cell_id, to_cell_id, quantity,
       movement_type, reason, user_id)
    VALUES (
      p_org_id, v_tx_id, v_inv_id, p_product_id,
      CASE WHEN v_delta < 0 THEN p_cell_id ELSE NULL END,  -- decrease = from
      CASE WHEN v_delta > 0 THEN p_cell_id ELSE NULL END,  -- increase = to
      ABS(v_delta),
      'ADJUST', p_reason, p_user_id
    );
  END IF;

  -- Clean up zero-quantity rows
  DELETE FROM public.inventory
  WHERE id = v_inv_id AND quantity = 0;

  -- Commit
  UPDATE public.inventory_transactions
  SET status = 'committed', committed_at = now()
  WHERE id = v_tx_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Updated stock_balances view (adds zone)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.stock_balances AS
SELECT
  i.id        AS item_id,
  i.org_id,
  i.product_id,
  i.cell_id,
  wc.code     AS cell_code,
  wc.zone     AS cell_zone,
  i.quantity,
  i.min_quantity,
  p.name      AS product_name,
  p.sku
FROM public.inventory i
LEFT JOIN public.warehouse_cells wc ON wc.id = i.cell_id
LEFT JOIN public.products p         ON p.id  = i.product_id;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. RLS for inventory_transactions
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tx_select"
  ON public.inventory_transactions FOR SELECT
  TO authenticated
  USING (org_id = 'miwang-main');

CREATE POLICY "tx_insert"
  ON public.inventory_transactions FOR INSERT
  TO authenticated
  WITH CHECK (org_id = 'miwang-main');

CREATE POLICY "tx_update"
  ON public.inventory_transactions FOR UPDATE
  TO authenticated
  USING (org_id = 'miwang-main');

COMMIT;
