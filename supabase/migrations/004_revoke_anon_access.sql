-- Revoke all anon (unauthenticated) access to database tables.
-- The app uses a server-side service_role key; the anon key should have no write access.
-- Run this AFTER setting SUPABASE_SERVICE_ROLE_KEY in .env.local.

-- Categories
DROP POLICY IF EXISTS "Anon can read categories" ON categories;
DROP POLICY IF EXISTS "Anon can insert categories" ON categories;
DROP POLICY IF EXISTS "Anon can update categories" ON categories;
DROP POLICY IF EXISTS "Anon can delete categories" ON categories;

-- Products
DROP POLICY IF EXISTS "Anon can read products" ON products;
DROP POLICY IF EXISTS "Anon can insert products" ON products;
DROP POLICY IF EXISTS "Anon can update products" ON products;
DROP POLICY IF EXISTS "Anon can delete products" ON products;

-- Inventory
DROP POLICY IF EXISTS "Anon can read inventory" ON inventory;
DROP POLICY IF EXISTS "Anon can insert inventory" ON inventory;
DROP POLICY IF EXISTS "Anon can update inventory" ON inventory;
DROP POLICY IF EXISTS "Anon can delete inventory" ON inventory;

-- Suppliers
DROP POLICY IF EXISTS "Anon can read suppliers" ON suppliers;
DROP POLICY IF EXISTS "Anon can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Anon can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Anon can delete suppliers" ON suppliers;

-- Orders
DROP POLICY IF EXISTS "Anon can read orders" ON orders;
DROP POLICY IF EXISTS "Anon can insert orders" ON orders;
DROP POLICY IF EXISTS "Anon can update orders" ON orders;
DROP POLICY IF EXISTS "Anon can delete orders" ON orders;

-- Order Items
DROP POLICY IF EXISTS "Anon can read order_items" ON order_items;
DROP POLICY IF EXISTS "Anon can insert order_items" ON order_items;
DROP POLICY IF EXISTS "Anon can update order_items" ON order_items;
DROP POLICY IF EXISTS "Anon can delete order_items" ON order_items;

-- Warehouse Faces
DROP POLICY IF EXISTS "Anon can read warehouse_faces" ON warehouse_faces;
DROP POLICY IF EXISTS "Anon can insert warehouse_faces" ON warehouse_faces;
DROP POLICY IF EXISTS "Anon can update warehouse_faces" ON warehouse_faces;

-- Warehouse Locations
DROP POLICY IF EXISTS "Anon can read warehouse_locations" ON warehouse_locations;
DROP POLICY IF EXISTS "Anon can insert warehouse_locations" ON warehouse_locations;
DROP POLICY IF EXISTS "Anon can update warehouse_locations" ON warehouse_locations;
