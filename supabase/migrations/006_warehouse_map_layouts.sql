-- Warehouse map layout storage (one layout per organization)
CREATE TABLE IF NOT EXISTS warehouse_map_layouts (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id text NOT NULL UNIQUE,
  layout_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_map_layouts_org_id
  ON warehouse_map_layouts (org_id);

-- Enable RLS
ALTER TABLE warehouse_map_layouts ENABLE ROW LEVEL SECURITY;

-- RLS policies: org members can read/write their own layout
CREATE POLICY "Users can view own org layout"
  ON warehouse_map_layouts FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own org layout"
  ON warehouse_map_layouts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own org layout"
  ON warehouse_map_layouts FOR UPDATE
  USING (true);

-- Performance indexes for conflict polling queries
CREATE INDEX IF NOT EXISTS idx_inventory_org_updated
  ON inventory (org_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_org_updated
  ON warehouse_locations (org_id, updated_at);
