-- 013_mvp_single_layout.sql
-- Single-tenant MVP: keep only warehouse layout read/write concerns.

BEGIN;

CREATE TABLE IF NOT EXISTS public.warehouse_map_layouts (
  warehouse_id text PRIMARY KEY,
  version integer NOT NULL DEFAULT 1,
  layout_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouse_map_layouts
  ADD COLUMN IF NOT EXISTS warehouse_id text,
  ADD COLUMN IF NOT EXISTS version integer,
  ADD COLUMN IF NOT EXISTS layout_json jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'warehouse_map_layouts'
      AND column_name = 'layout_data'
  ) THEN
    UPDATE public.warehouse_map_layouts
      SET layout_json = COALESCE(layout_json, layout_data, '[]'::jsonb)
    WHERE layout_json IS NULL;
  END IF;
END
$$;

UPDATE public.warehouse_map_layouts
SET warehouse_id = 'main'
WHERE warehouse_id IS NULL OR btrim(warehouse_id) = '';

UPDATE public.warehouse_map_layouts
SET version = 1
WHERE version IS NULL OR version < 1;

UPDATE public.warehouse_map_layouts
SET layout_json = '[]'::jsonb
WHERE layout_json IS NULL
   OR jsonb_typeof(layout_json) <> 'array';

UPDATE public.warehouse_map_layouts
SET updated_at = now()
WHERE updated_at IS NULL;

WITH ranked AS (
  SELECT
    ctid,
    row_number() OVER (
      PARTITION BY warehouse_id
      ORDER BY updated_at DESC NULLS LAST, ctid DESC
    ) AS rn
  FROM public.warehouse_map_layouts
)
DELETE FROM public.warehouse_map_layouts t
USING ranked r
WHERE t.ctid = r.ctid
  AND r.rn > 1;

ALTER TABLE public.warehouse_map_layouts
  DROP CONSTRAINT IF EXISTS warehouse_map_layouts_org_id_key;

DROP INDEX IF EXISTS idx_warehouse_map_layouts_org_id;
DROP INDEX IF EXISTS idx_warehouse_map_layouts_org_id_active;
DROP INDEX IF EXISTS idx_warehouse_map_layouts_org_updated;
DROP INDEX IF EXISTS uq_warehouse_map_layouts_org_warehouse;

CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_map_layouts_warehouse_id
  ON public.warehouse_map_layouts (warehouse_id);

ALTER TABLE public.warehouse_map_layouts
  ALTER COLUMN warehouse_id SET NOT NULL,
  ALTER COLUMN version SET DEFAULT 1,
  ALTER COLUMN version SET NOT NULL,
  ALTER COLUMN layout_json SET DEFAULT '[]'::jsonb,
  ALTER COLUMN layout_json SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE public.warehouse_map_layouts DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own org layout" ON public.warehouse_map_layouts;
DROP POLICY IF EXISTS "Users can insert own org layout" ON public.warehouse_map_layouts;
DROP POLICY IF EXISTS "Users can update own org layout" ON public.warehouse_map_layouts;
DROP POLICY IF EXISTS warehouse_map_layouts_select_own_org ON public.warehouse_map_layouts;
DROP POLICY IF EXISTS warehouse_map_layouts_insert_own_org ON public.warehouse_map_layouts;
DROP POLICY IF EXISTS warehouse_map_layouts_update_own_org ON public.warehouse_map_layouts;

ALTER TABLE public.warehouse_map_layouts
  DROP COLUMN IF EXISTS org_id,
  DROP COLUMN IF EXISTS layout_data,
  DROP COLUMN IF EXISTS updated_by;

COMMIT;
