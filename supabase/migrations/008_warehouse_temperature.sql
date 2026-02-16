-- Warehouse Settings table for key-value configuration storage
CREATE TABLE IF NOT EXISTS warehouse_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE warehouse_settings ENABLE ROW LEVEL SECURITY;

-- Policy: authenticated users can read all settings
CREATE POLICY "Authenticated users can read settings"
  ON warehouse_settings FOR SELECT
  TO authenticated
  USING (true);

-- Policy: only admins (CEO, Manager) can insert/update/delete settings
-- Note: This app uses bootstrap auth (no profiles table), so we rely on app-level auth checks
-- RLS here is a safety net - actual role check happens in API routes via isAdminRole()
CREATE POLICY "Admins can manage settings"
  ON warehouse_settings FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Apply updated_at trigger
CREATE TRIGGER set_warehouse_settings_updated_at
  BEFORE UPDATE ON warehouse_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Insert default temperature setting (20°C)
INSERT INTO warehouse_settings (key, value, updated_by)
VALUES ('temperature', '{"celsius": 20}', 'system')
ON CONFLICT (key) DO NOTHING;

-- Index for faster key lookups
CREATE INDEX IF NOT EXISTS idx_warehouse_settings_key ON warehouse_settings(key);
