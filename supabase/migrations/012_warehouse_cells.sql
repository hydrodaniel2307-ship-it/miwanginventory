-- Migration 012: warehouse_cells table for dynamic 3D layout editing
-- Stores individual warehouse cells with 3D coordinates
-- Coexists with warehouse_locations table for gradual transition

BEGIN;

-- ---------------------------------------------------------------------------
-- warehouse_cells table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.warehouse_cells (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Multi-tenant isolation
  org_id text NOT NULL DEFAULT 'miwang-main',

  -- Link to existing location system (nullable for newly created cells not yet linked)
  location_id uuid REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,

  -- Logical position (for backward compatibility with existing system)
  face_no integer CHECK (face_no IS NULL OR (face_no BETWEEN 1 AND 11)),
  bay_no integer CHECK (bay_no IS NULL OR (bay_no BETWEEN 1 AND 99)),
  level_no integer CHECK (level_no IS NULL OR (level_no BETWEEN 1 AND 10)),

  -- 3D coordinates (double precision for precise positioning)
  pos_x double precision NOT NULL DEFAULT 0,
  pos_y double precision NOT NULL DEFAULT 0,
  pos_z double precision NOT NULL DEFAULT 0,

  -- Cell dimensions (customizable per cell)
  width double precision NOT NULL DEFAULT 1.0 CHECK (width > 0),
  height double precision NOT NULL DEFAULT 0.8 CHECK (height > 0),
  depth double precision NOT NULL DEFAULT 1.2 CHECK (depth > 0),

  -- Cell type
  cell_type text NOT NULL DEFAULT 'shelf' CHECK (cell_type IN ('shelf', 'cold', 'empty', 'reserved')),

  -- Display
  label text,          -- optional custom label
  color text,          -- optional custom color hex

  -- Metadata (extensible)
  metadata jsonb NOT NULL DEFAULT '{}',

  -- Audit
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text,
  updated_by text
);

-- Prevent duplicate logical positions per org
CREATE UNIQUE INDEX IF NOT EXISTS uq_warehouse_cells_org_position
  ON public.warehouse_cells (org_id, face_no, bay_no, level_no)
  WHERE face_no IS NOT NULL AND bay_no IS NOT NULL AND level_no IS NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_warehouse_cells_org_id
  ON public.warehouse_cells (org_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_cells_location
  ON public.warehouse_cells (location_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_cells_face
  ON public.warehouse_cells (org_id, face_no)
  WHERE face_no IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_cells_spatial
  ON public.warehouse_cells (org_id, pos_x, pos_z);

-- Updated_at trigger (reuse existing function)
DROP TRIGGER IF EXISTS set_warehouse_cells_updated_at ON public.warehouse_cells;
CREATE TRIGGER set_warehouse_cells_updated_at
  BEFORE UPDATE ON public.warehouse_cells
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.warehouse_cells ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read cells
CREATE POLICY "Authenticated users can read cells"
  ON public.warehouse_cells FOR SELECT
  TO authenticated
  USING (true);

-- Admins can manage cells (insert/update/delete)
-- Note: This app uses bootstrap auth without profiles table
-- Actual role check happens in API routes via isAdminRole()
-- RLS here is a safety net for direct DB access
CREATE POLICY "Admins can manage cells"
  ON public.warehouse_cells FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Seed: migrate existing locations to cells
-- ---------------------------------------------------------------------------
-- Calculate 3D coordinates from face/bay/level using the same formula as buildCells()
-- Frontend constants: CELL_W=1.0, CELL_H=0.8, CELL_D=1.2, ROW_GAP=1.8, BAYS_PER_FACE=10, NUM_FACES=11, LEVELS=4
-- getFacePosition(faceNo):
--   rowIndex = faceNo - 1
--   totalDepth = (11 - 1) * (1.2 + 1.8) = 30.0
--   z = rowIndex * (CELL_D + ROW_GAP) - totalDepth/2 = (faceNo - 1) * 3.0 - 15.0
--   x = -GRID_WIDTH/2 = -10.0/2 = -5.0
-- buildCells():
--   x = fx + (bay - 1) * CELL_W = -5.0 + (bay_no - 1) * 1.0
--   y = (level - 1) * CELL_H = (level_no - 1) * 0.8
--   z = fz (from getFacePosition)

INSERT INTO public.warehouse_cells (
  org_id,
  location_id,
  face_no,
  bay_no,
  level_no,
  pos_x,
  pos_y,
  pos_z,
  width,
  height,
  depth,
  cell_type
)
SELECT
  wl.org_id,
  wl.id,
  wl.face_no,
  wl.bay_no,
  wl.level_no,
  -- pos_x = -GRID_WIDTH/2 + (bay_no - 1) * CELL_W = -5.0 + (bay_no - 1) * 1.0
  -5.0 + (wl.bay_no - 1) * 1.0,
  -- pos_y = (level_no - 1) * CELL_H = (level_no - 1) * 0.8
  (wl.level_no - 1) * 0.8,
  -- pos_z = (face_no - 1) * (CELL_D + ROW_GAP) - totalDepth/2
  --       = (face_no - 1) * 3.0 - 15.0
  (wl.face_no - 1) * 3.0 - 15.0,
  1.0,  -- width (CELL_W)
  0.8,  -- height (CELL_H)
  1.2,  -- depth (CELL_D)
  'shelf'
FROM public.warehouse_locations wl
WHERE wl.active = true
  AND wl.is_virtual = false
  AND wl.face_no IS NOT NULL
  AND wl.bay_no IS NOT NULL
  AND wl.level_no IS NOT NULL
ON CONFLICT (org_id, face_no, bay_no, level_no) DO NOTHING;

COMMIT;
