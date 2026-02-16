-- Migration 014: Relational Integrity for Warehouse Cells
-- Adds FK-based warehouse cell architecture to replace fragile string-based location matching
-- This migration:
-- 1. Adds code and capacity columns to warehouse_cells
-- 2. Creates inventory_movements table for tracking stock movements
-- 3. Creates stock_balances view for unified inventory reporting
-- 4. Adds cell_id FK to inventory table
-- 5. Migrates existing location strings to cell_id references
-- 6. Enables RLS on inventory_movements

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. ALTER warehouse_cells — add missing columns
-- ---------------------------------------------------------------------------

-- Add code column (unique identifier like "F01-B03-L2")
ALTER TABLE public.warehouse_cells ADD COLUMN IF NOT EXISTS code text;

-- Add capacity column (default 0)
ALTER TABLE public.warehouse_cells ADD COLUMN IF NOT EXISTS capacity int NOT NULL DEFAULT 0;

-- Backfill code from face_no/bay_no/level_no for existing cells
UPDATE public.warehouse_cells
SET code = 'F' || LPAD(face_no::text, 2, '0') || '-B' || LPAD(bay_no::text, 2, '0') || '-L' || level_no::text
WHERE face_no IS NOT NULL
  AND bay_no IS NOT NULL
  AND level_no IS NOT NULL
  AND code IS NULL;

-- Add unique constraint on (org_id, code) for non-null codes
CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_cells_org_code
  ON public.warehouse_cells (org_id, code)
  WHERE code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. CREATE inventory_movements table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant isolation
  org_id text NOT NULL DEFAULT 'miwang-main',

  -- Link to inventory item
  item_id uuid NOT NULL REFERENCES public.inventory(id) ON DELETE CASCADE,

  -- Movement locations (nullable for initial putaway or final removal)
  from_cell_id uuid REFERENCES public.warehouse_cells(id) ON DELETE SET NULL,
  to_cell_id uuid REFERENCES public.warehouse_cells(id) ON DELETE SET NULL,

  -- Quantity moved
  quantity int NOT NULL CHECK (quantity > 0),

  -- Movement type
  movement_type text NOT NULL CHECK (movement_type IN ('PUTAWAY', 'PICK', 'TRANSFER', 'ADJUST')),

  -- Optional context
  reason text,
  user_id text,

  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_inventory_movements_org_created
  ON public.inventory_movements (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item
  ON public.inventory_movements (item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_from_cell
  ON public.inventory_movements (from_cell_id);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_to_cell
  ON public.inventory_movements (to_cell_id);

-- ---------------------------------------------------------------------------
-- 3. CREATE stock_balances view
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.stock_balances AS
SELECT
  i.id AS item_id,
  i.org_id,
  i.product_id,
  i.cell_id,
  wc.code AS cell_code,
  i.quantity,
  i.min_quantity,
  p.name AS product_name,
  p.sku
FROM public.inventory i
LEFT JOIN public.warehouse_cells wc ON wc.id = i.cell_id
LEFT JOIN public.products p ON p.id = i.product_id;

-- ---------------------------------------------------------------------------
-- 4. ADD cell_id FK to inventory
-- ---------------------------------------------------------------------------

-- Add cell_id column
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cell_id uuid REFERENCES public.warehouse_cells(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_inventory_cell_id ON public.inventory(cell_id);

-- ---------------------------------------------------------------------------
-- 5. DATA MIGRATION — map existing inventory.location → cell_id
-- ---------------------------------------------------------------------------

-- Map location strings to warehouse_cells.code
UPDATE public.inventory i
SET cell_id = wc.id
FROM public.warehouse_cells wc
WHERE wc.org_id = i.org_id
  AND wc.code = i.location
  AND i.location IS NOT NULL
  AND i.cell_id IS NULL;

-- ---------------------------------------------------------------------------
-- 6. Enable RLS on inventory_movements
-- ---------------------------------------------------------------------------

ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read movements in their org
CREATE POLICY "movements_select"
  ON public.inventory_movements FOR SELECT
  TO authenticated
  USING (org_id = 'miwang-main');

-- Authenticated users can insert movements in their org
CREATE POLICY "movements_insert"
  ON public.inventory_movements FOR INSERT
  TO authenticated
  WITH CHECK (org_id = 'miwang-main');

COMMIT;
