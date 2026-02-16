-- Migration 011: Strict multi-tenant RLS policies
-- NOTE: API routes using service_role still bypass RLS. This migration enforces
-- org isolation for authenticated DB sessions and prevents anon table access.

BEGIN;

CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    NULLIF(auth.jwt() ->> 'sub', ''),
    NULLIF(current_setting('request.jwt.claim.sub', true), '')
  );
$$;

CREATE OR REPLACE FUNCTION app.is_org_member(target_org text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, app
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.org_id = target_org
      AND m.active = true
      AND m.user_id = app.current_user_id()
  );
$$;

REVOKE ALL ON FUNCTION app.current_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION app.is_org_member(text) FROM PUBLIC;
GRANT USAGE ON SCHEMA app TO authenticated;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION app.is_org_member(text) TO authenticated;

-- Enable RLS and drop any existing policies first.
DO $$
DECLARE
  t text;
  p record;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'categories',
    'products',
    'inventory',
    'suppliers',
    'orders',
    'order_items',
    'warehouse_settings',
    'warehouse_faces',
    'warehouse_locations',
    'warehouse_map_layouts',
    'memberships'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    FOR p IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- Org-isolated CRUD policies for org-bound tables.
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
    'warehouse_settings',
    'warehouse_faces',
    'warehouse_locations',
    'warehouse_map_layouts'
  ]
  LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (app.is_org_member(org_id))',
      t || '_select_org',
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (app.is_org_member(org_id))',
      t || '_insert_org',
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (app.is_org_member(org_id)) WITH CHECK (app.is_org_member(org_id))',
      t || '_update_org',
      t
    );
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (app.is_org_member(org_id))',
      t || '_delete_org',
      t
    );
  END LOOP;
END $$;

-- Memberships table: authenticated users can read only their own memberships.
DO $$
BEGIN
  IF to_regclass('public.memberships') IS NOT NULL THEN
    CREATE POLICY memberships_select_self
      ON public.memberships
      FOR SELECT
      TO authenticated
      USING (user_id = app.current_user_id() AND active = true);
  END IF;
END $$;

COMMIT;
