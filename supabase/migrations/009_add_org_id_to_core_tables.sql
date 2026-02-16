-- Migration 009: Add org_id to core business tables
-- Ensures consistency with warehouse tables that already have org_id.
-- Single-org setup: all rows default to 'miwang-main'.

-- 1) Add org_id column to core tables (idempotent, auto-backfills via DEFAULT)
ALTER TABLE categories       ADD COLUMN IF NOT EXISTS org_id text NOT NULL DEFAULT 'miwang-main';
ALTER TABLE products         ADD COLUMN IF NOT EXISTS org_id text NOT NULL DEFAULT 'miwang-main';
ALTER TABLE inventory        ADD COLUMN IF NOT EXISTS org_id text NOT NULL DEFAULT 'miwang-main';
ALTER TABLE suppliers        ADD COLUMN IF NOT EXISTS org_id text NOT NULL DEFAULT 'miwang-main';
ALTER TABLE orders           ADD COLUMN IF NOT EXISTS org_id text NOT NULL DEFAULT 'miwang-main';
ALTER TABLE order_items      ADD COLUMN IF NOT EXISTS org_id text NOT NULL DEFAULT 'miwang-main';
ALTER TABLE warehouse_settings ADD COLUMN IF NOT EXISTS org_id text NOT NULL DEFAULT 'miwang-main';

-- 2) Index that migration 006 tried to create (inventory.org_id now exists)
CREATE INDEX IF NOT EXISTS idx_inventory_org_updated
  ON inventory (org_id, updated_at);

-- 3) Per-table org_id indexes for filtered queries
CREATE INDEX IF NOT EXISTS idx_categories_org ON categories (org_id);
CREATE INDEX IF NOT EXISTS idx_products_org   ON products (org_id);
CREATE INDEX IF NOT EXISTS idx_inventory_org  ON inventory (org_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_org  ON suppliers (org_id);
CREATE INDEX IF NOT EXISTS idx_orders_org     ON orders (org_id);
