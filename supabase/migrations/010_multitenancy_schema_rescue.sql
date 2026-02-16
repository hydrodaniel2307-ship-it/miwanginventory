-- Migration 010: Multi-tenant schema rescue (CLI-free / idempotent)
-- Goals:
-- 1) Ensure warehouse_map_layouts exists (fix PGRST205)
-- 2) Add memberships table for server-side org derivation
-- 3) Ensure org_id exists across core/warehouse tables with safe backfill
-- 4) Normalize per-org uniqueness and indexes for multi-tenant isolation

BEGIN;

-- Shared trigger helper (safe to re-run)
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- memberships (org_id + user_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL,
  user_id text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, user_id)
);

DROP TRIGGER IF EXISTS set_memberships_updated_at ON public.memberships;
CREATE TRIGGER set_memberships_updated_at
BEFORE UPDATE ON public.memberships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_memberships_user_active
  ON public.memberships (user_id, active);
CREATE INDEX IF NOT EXISTS idx_memberships_org_active
  ON public.memberships (org_id, active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_memberships_user_default_active
  ON public.memberships (user_id)
  WHERE is_default = true AND active = true;

-- Bootstrap seed for existing local login flow.
INSERT INTO public.memberships (org_id, user_id, role, active, is_default)
VALUES ('miwang-main', 'ceo', 'CEO', true, true)
ON CONFLICT (org_id, user_id) DO UPDATE
SET active = EXCLUDED.active;

-- ---------------------------------------------------------------------------
-- warehouse_settings (org-aware key/value)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouse_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL DEFAULT 'miwang-main',
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouse_settings
  ADD COLUMN IF NOT EXISTS org_id text,
  ADD COLUMN IF NOT EXISTS key text,
  ADD COLUMN IF NOT EXISTS value jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_by text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

UPDATE public.warehouse_settings
SET org_id = 'miwang-main'
WHERE org_id IS NULL;

ALTER TABLE public.warehouse_settings
  ALTER COLUMN org_id SET DEFAULT 'miwang-main',
  ALTER COLUMN org_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.warehouse_settings'::regclass
      AND conname = 'warehouse_settings_key_key'
  ) THEN
    ALTER TABLE public.warehouse_settings
      DROP CONSTRAINT warehouse_settings_key_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_settings_org_key
  ON public.warehouse_settings (org_id, key);
CREATE INDEX IF NOT EXISTS idx_warehouse_settings_org_key
  ON public.warehouse_settings (org_id, key);

DROP TRIGGER IF EXISTS set_warehouse_settings_updated_at ON public.warehouse_settings;
CREATE TRIGGER set_warehouse_settings_updated_at
BEFORE UPDATE ON public.warehouse_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- warehouse_map_layouts (runtime fix + v2 shape)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouse_map_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id text NOT NULL DEFAULT 'miwang-main',
  warehouse_id text NOT NULL DEFAULT 'main',
  version integer NOT NULL DEFAULT 1,
  layout_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  layout_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouse_map_layouts
  ADD COLUMN IF NOT EXISTS org_id text,
  ADD COLUMN IF NOT EXISTS warehouse_id text,
  ADD COLUMN IF NOT EXISTS version integer,
  ADD COLUMN IF NOT EXISTS layout_json jsonb,
  ADD COLUMN IF NOT EXISTS layout_data jsonb DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'warehouse_map_layouts'
      AND column_name = 'updated_by'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE public.warehouse_map_layouts
      ALTER COLUMN updated_by TYPE text USING updated_by::text;
  END IF;
END $$;

UPDATE public.warehouse_map_layouts
SET
  org_id = COALESCE(org_id, 'miwang-main'),
  warehouse_id = COALESCE(NULLIF(warehouse_id, ''), 'main'),
  version = COALESCE(NULLIF(version, 0), 1),
  layout_json = COALESCE(layout_json, layout_data, '[]'::jsonb),
  layout_data = COALESCE(layout_data, layout_json, '[]'::jsonb);

ALTER TABLE public.warehouse_map_layouts
  ALTER COLUMN org_id SET DEFAULT 'miwang-main',
  ALTER COLUMN warehouse_id SET DEFAULT 'main',
  ALTER COLUMN version SET DEFAULT 1,
  ALTER COLUMN layout_json SET DEFAULT '[]'::jsonb,
  ALTER COLUMN layout_data SET DEFAULT '[]'::jsonb,
  ALTER COLUMN org_id SET NOT NULL,
  ALTER COLUMN warehouse_id SET NOT NULL,
  ALTER COLUMN version SET NOT NULL,
  ALTER COLUMN layout_json SET NOT NULL,
  ALTER COLUMN layout_data SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.warehouse_map_layouts'::regclass
      AND conname = 'warehouse_map_layouts_org_id_key'
  ) THEN
    ALTER TABLE public.warehouse_map_layouts
      DROP CONSTRAINT warehouse_map_layouts_org_id_key;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_map_layouts_org_warehouse
  ON public.warehouse_map_layouts (org_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_map_layouts_org_updated
  ON public.warehouse_map_layouts (org_id, updated_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.warehouse_map_layouts'::regclass
      AND conname = 'warehouse_map_layouts_version_positive'
  ) THEN
    ALTER TABLE public.warehouse_map_layouts
      ADD CONSTRAINT warehouse_map_layouts_version_positive
      CHECK (version > 0);
  END IF;
END $$;

DROP TRIGGER IF EXISTS set_warehouse_map_layouts_updated_at ON public.warehouse_map_layouts;
CREATE TRIGGER set_warehouse_map_layouts_updated_at
BEFORE UPDATE ON public.warehouse_map_layouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- Safe org_id migration for domain tables (nullable -> backfill -> not null)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categories',
    'products',
    'inventory',
    'suppliers',
    'orders',
    'order_items',
    'warehouse_faces',
    'warehouse_locations',
    'warehouse_settings',
    'warehouse_map_layouts'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id text', t);
    EXECUTE format(
      'UPDATE public.%I SET org_id = ''miwang-main'' WHERE org_id IS NULL',
      t
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN org_id SET DEFAULT ''miwang-main''',
      t
    );
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN org_id SET NOT NULL',
      t
    );
  END LOOP;
END $$;

-- Data consistency backfill from parent rows where applicable
UPDATE public.inventory i
SET org_id = p.org_id
FROM public.products p
WHERE i.product_id = p.id
  AND i.org_id IS DISTINCT FROM p.org_id;

UPDATE public.order_items oi
SET org_id = o.org_id
FROM public.orders o
WHERE oi.order_id = o.id
  AND oi.org_id IS DISTINCT FROM o.org_id;

-- Per-org uniqueness
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.categories'::regclass
      AND conname = 'categories_name_key'
  ) THEN
    ALTER TABLE public.categories DROP CONSTRAINT categories_name_key;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_org_name
  ON public.categories (org_id, name);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND conname = 'products_sku_key'
  ) THEN
    ALTER TABLE public.products DROP CONSTRAINT products_sku_key;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_products_org_sku
  ON public.products (org_id, sku);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.orders'::regclass
      AND conname = 'orders_order_number_key'
  ) THEN
    ALTER TABLE public.orders DROP CONSTRAINT orders_order_number_key;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_org_order_number
  ON public.orders (org_id, order_number);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.inventory'::regclass
      AND conname = 'inventory_product_id_key'
  ) THEN
    ALTER TABLE public.inventory DROP CONSTRAINT inventory_product_id_key;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_org_product
  ON public.inventory (org_id, product_id);

-- Org indexes
CREATE INDEX IF NOT EXISTS idx_categories_org_id ON public.categories (org_id);
CREATE INDEX IF NOT EXISTS idx_products_org_id ON public.products (org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_org_id ON public.inventory (org_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org_id ON public.suppliers (org_id);
CREATE INDEX IF NOT EXISTS idx_orders_org_id ON public.orders (org_id);
CREATE INDEX IF NOT EXISTS idx_order_items_org_id ON public.order_items (org_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_faces_org_id ON public.warehouse_faces (org_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_locations_org_id ON public.warehouse_locations (org_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_settings_org_id ON public.warehouse_settings (org_id);

COMMIT;
