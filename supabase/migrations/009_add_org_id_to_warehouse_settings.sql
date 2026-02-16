-- Migration 009: Add org_id to warehouse_settings table for multi-tenancy
-- This table was created without org_id, which breaks the API

BEGIN;

-- Add org_id column with default
ALTER TABLE public.warehouse_settings
  ADD COLUMN IF NOT EXISTS org_id text NOT NULL DEFAULT 'miwang-main';

-- Drop the old unique constraint on key alone
ALTER TABLE public.warehouse_settings
  DROP CONSTRAINT IF EXISTS warehouse_settings_key_key;

-- Add new unique constraint on (org_id, key)
ALTER TABLE public.warehouse_settings
  ADD CONSTRAINT uq_warehouse_settings_org_key
  UNIQUE (org_id, key);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_warehouse_settings_org_id
  ON public.warehouse_settings (org_id);

-- Update existing rows to have org_id (in case there are any)
UPDATE public.warehouse_settings
  SET org_id = 'miwang-main'
  WHERE org_id IS NULL;

COMMIT;
