-- Allow anon role full access to all tables
-- Since auth is handled at the app level (cookie-based session),
-- not via Supabase Auth, all requests come in as 'anon' role.

-- Categories
create policy "Anon can read categories" on categories for select to anon using (true);
create policy "Anon can insert categories" on categories for insert to anon with check (true);
create policy "Anon can update categories" on categories for update to anon using (true);
create policy "Anon can delete categories" on categories for delete to anon using (true);

-- Products
create policy "Anon can read products" on products for select to anon using (true);
create policy "Anon can insert products" on products for insert to anon with check (true);
create policy "Anon can update products" on products for update to anon using (true);
create policy "Anon can delete products" on products for delete to anon using (true);

-- Inventory
create policy "Anon can read inventory" on inventory for select to anon using (true);
create policy "Anon can insert inventory" on inventory for insert to anon with check (true);
create policy "Anon can update inventory" on inventory for update to anon using (true);
create policy "Anon can delete inventory" on inventory for delete to anon using (true);

-- Suppliers
create policy "Anon can read suppliers" on suppliers for select to anon using (true);
create policy "Anon can insert suppliers" on suppliers for insert to anon with check (true);
create policy "Anon can update suppliers" on suppliers for update to anon using (true);
create policy "Anon can delete suppliers" on suppliers for delete to anon using (true);

-- Orders
create policy "Anon can read orders" on orders for select to anon using (true);
create policy "Anon can insert orders" on orders for insert to anon with check (true);
create policy "Anon can update orders" on orders for update to anon using (true);
create policy "Anon can delete orders" on orders for delete to anon using (true);

-- Order Items
create policy "Anon can read order_items" on order_items for select to anon using (true);
create policy "Anon can insert order_items" on order_items for insert to anon with check (true);
create policy "Anon can update order_items" on order_items for update to anon using (true);
create policy "Anon can delete order_items" on order_items for delete to anon using (true);
