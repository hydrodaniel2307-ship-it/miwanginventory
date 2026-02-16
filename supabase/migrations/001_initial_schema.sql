-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Products
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  description text,
  category_id uuid references categories(id) on delete set null,
  unit_price numeric(12, 2) not null default 0,
  cost_price numeric(12, 2) not null default 0,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Inventory
create table if not exists inventory (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade unique,
  quantity integer not null default 0,
  min_quantity integer not null default 0,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Suppliers
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Orders
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  type text not null check (type in ('purchase', 'sale')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  supplier_id uuid references suppliers(id) on delete set null,
  total_amount numeric(12, 2) not null default 0,
  notes text,
  order_date timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Order Items
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) not null default 0
);

-- Indexes
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_sku on products(sku);
create index if not exists idx_inventory_product on inventory(product_id);
create index if not exists idx_orders_supplier on orders(supplier_id);
create index if not exists idx_orders_status on orders(status);
create index if not exists idx_orders_type on orders(type);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_order_items_product on order_items(product_id);

-- Updated at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger set_categories_updated_at before update on categories for each row execute function update_updated_at();
create trigger set_products_updated_at before update on products for each row execute function update_updated_at();
create trigger set_inventory_updated_at before update on inventory for each row execute function update_updated_at();
create trigger set_suppliers_updated_at before update on suppliers for each row execute function update_updated_at();
create trigger set_orders_updated_at before update on orders for each row execute function update_updated_at();

-- Enable Row Level Security
alter table categories enable row level security;
alter table products enable row level security;
alter table inventory enable row level security;
alter table suppliers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- RLS Policies: Allow authenticated users full access
create policy "Authenticated users can read categories" on categories for select to authenticated using (true);
create policy "Authenticated users can insert categories" on categories for insert to authenticated with check (true);
create policy "Authenticated users can update categories" on categories for update to authenticated using (true);
create policy "Authenticated users can delete categories" on categories for delete to authenticated using (true);

create policy "Authenticated users can read products" on products for select to authenticated using (true);
create policy "Authenticated users can insert products" on products for insert to authenticated with check (true);
create policy "Authenticated users can update products" on products for update to authenticated using (true);
create policy "Authenticated users can delete products" on products for delete to authenticated using (true);

create policy "Authenticated users can read inventory" on inventory for select to authenticated using (true);
create policy "Authenticated users can insert inventory" on inventory for insert to authenticated with check (true);
create policy "Authenticated users can update inventory" on inventory for update to authenticated using (true);
create policy "Authenticated users can delete inventory" on inventory for delete to authenticated using (true);

create policy "Authenticated users can read suppliers" on suppliers for select to authenticated using (true);
create policy "Authenticated users can insert suppliers" on suppliers for insert to authenticated with check (true);
create policy "Authenticated users can update suppliers" on suppliers for update to authenticated using (true);
create policy "Authenticated users can delete suppliers" on suppliers for delete to authenticated using (true);

create policy "Authenticated users can read orders" on orders for select to authenticated using (true);
create policy "Authenticated users can insert orders" on orders for insert to authenticated with check (true);
create policy "Authenticated users can update orders" on orders for update to authenticated using (true);
create policy "Authenticated users can delete orders" on orders for delete to authenticated using (true);

create policy "Authenticated users can read order_items" on order_items for select to authenticated using (true);
create policy "Authenticated users can insert order_items" on order_items for insert to authenticated with check (true);
create policy "Authenticated users can update order_items" on order_items for update to authenticated using (true);
create policy "Authenticated users can delete order_items" on order_items for delete to authenticated using (true);
