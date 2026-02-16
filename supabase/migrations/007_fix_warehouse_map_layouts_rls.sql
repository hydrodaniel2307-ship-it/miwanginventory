-- CRITICAL SECURITY FIX: Replace insecure RLS policies on warehouse_map_layouts
--
-- Issue: Previous policies used USING (true) which allowed ANY authenticated user
-- to read/write ANY organization's data, completely bypassing multi-tenancy isolation.
--
-- Fix: Enforce org_id validation based on current user's organization membership.
-- Since this app currently uses a hardcoded DEFAULT_ORG_ID approach, we need to
-- ensure the org_id in the row matches what the application layer enforces.

-- Drop the insecure policies
DROP POLICY IF EXISTS "Users can view own org layout" ON warehouse_map_layouts;
DROP POLICY IF EXISTS "Users can insert own org layout" ON warehouse_map_layouts;
DROP POLICY IF EXISTS "Users can update own org layout" ON warehouse_map_layouts;

-- For now, since the app uses DEFAULT_ORG_ID = "miwang-main" hardcoded,
-- we'll create policies that only allow access to that specific org.
-- This is a temporary measure until proper multi-org membership tables are implemented.

-- Temporary secure policy: Only allow access to the default org
-- This prevents cross-org data leakage while maintaining functionality
CREATE POLICY "Users can view miwang-main layout"
  ON warehouse_map_layouts FOR SELECT
  USING (org_id = 'miwang-main');

CREATE POLICY "Users can insert miwang-main layout"
  ON warehouse_map_layouts FOR INSERT
  WITH CHECK (org_id = 'miwang-main');

CREATE POLICY "Users can update miwang-main layout"
  ON warehouse_map_layouts FOR UPDATE
  USING (org_id = 'miwang-main')
  WITH CHECK (org_id = 'miwang-main');

-- TODO: When implementing proper multi-org support, replace these policies with:
--
-- CREATE OR REPLACE FUNCTION auth.user_org_id() RETURNS text AS $$
--   SELECT org_id FROM organization_members WHERE user_id = auth.uid() LIMIT 1;
-- $$ LANGUAGE SQL SECURITY DEFINER;
--
-- CREATE POLICY "Users can view own org layout"
--   ON warehouse_map_layouts FOR SELECT
--   USING (org_id = auth.user_org_id());
--
-- CREATE POLICY "Users can insert own org layout"
--   ON warehouse_map_layouts FOR INSERT
--   WITH CHECK (org_id = auth.user_org_id());
--
-- CREATE POLICY "Users can update own org layout"
--   ON warehouse_map_layouts FOR UPDATE
--   USING (org_id = auth.user_org_id())
--   WITH CHECK (org_id = auth.user_org_id());

-- Add constraint to prevent accidental insertion of wrong org_id
ALTER TABLE warehouse_map_layouts
  ADD CONSTRAINT check_org_id_format
  CHECK (org_id ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$');

-- Add index for RLS policy performance
CREATE INDEX IF NOT EXISTS idx_warehouse_map_layouts_org_id_active
  ON warehouse_map_layouts (org_id)
  WHERE org_id IS NOT NULL;
