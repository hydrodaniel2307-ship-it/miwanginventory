ALTER TABLE warehouse_faces ALTER COLUMN bay_count SET DEFAULT 10;
UPDATE warehouse_faces SET bay_count = 10 WHERE bay_count < 10;
