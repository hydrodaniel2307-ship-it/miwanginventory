-- Day 3: Location system foundations
-- Policy: never delete locations/faces; deactivate instead.

-- Product metadata for settings/products
alter table products
  add column if not exists units_per_box integer not null default 1 check (units_per_box > 0),
  add column if not exists active boolean not null default true;

-- Shelf faces (1~11 fixed per org)
create table if not exists warehouse_faces (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  face_no integer not null check (face_no between 1 and 11),
  name text not null,
  bay_count integer not null default 5 check (bay_count between 1 and 99),
  level_count integer not null default 4 check (level_count between 1 and 10),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, face_no)
);

-- Locations generated from face/bay/level combinations + virtual staging
create table if not exists warehouse_locations (
  id uuid primary key default gen_random_uuid(),
  org_id text not null,
  code text not null,
  face_no integer check (face_no between 1 and 11),
  bay_no integer check (bay_no between 1 and 99),
  level_no integer check (level_no between 1 and 10),
  active boolean not null default true,
  is_virtual boolean not null default false,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, code),
  check (
    (is_virtual = true and face_no is null and bay_no is null and level_no is null)
    or
    (is_virtual = false and face_no is not null and bay_no is not null and level_no is not null)
  )
);

create unique index if not exists idx_warehouse_locations_slot_unique
  on warehouse_locations (org_id, face_no, bay_no, level_no)
  where is_virtual = false;

create index if not exists idx_warehouse_faces_org_face
  on warehouse_faces (org_id, face_no);

create index if not exists idx_warehouse_locations_org_code
  on warehouse_locations (org_id, code);

create index if not exists idx_warehouse_locations_org_face
  on warehouse_locations (org_id, face_no);

create index if not exists idx_warehouse_locations_org_active
  on warehouse_locations (org_id, active);

-- Apply updated_at triggers
create trigger set_warehouse_faces_updated_at
before update on warehouse_faces
for each row execute function update_updated_at();

create trigger set_warehouse_locations_updated_at
before update on warehouse_locations
for each row execute function update_updated_at();

-- Deletion guard rails
create or replace function prevent_warehouse_delete()
returns trigger as $$
begin
  raise exception 'Delete is not allowed. Set active=false instead.';
end;
$$ language plpgsql;

create trigger prevent_delete_warehouse_faces
before delete on warehouse_faces
for each row execute function prevent_warehouse_delete();

create trigger prevent_delete_warehouse_locations
before delete on warehouse_locations
for each row execute function prevent_warehouse_delete();

-- Enable RLS
alter table warehouse_faces enable row level security;
alter table warehouse_locations enable row level security;

-- Authenticated policies
create policy "Authenticated users can read warehouse_faces"
  on warehouse_faces for select to authenticated using (true);
create policy "Authenticated users can insert warehouse_faces"
  on warehouse_faces for insert to authenticated with check (true);
create policy "Authenticated users can update warehouse_faces"
  on warehouse_faces for update to authenticated using (true);

create policy "Authenticated users can read warehouse_locations"
  on warehouse_locations for select to authenticated using (true);
create policy "Authenticated users can insert warehouse_locations"
  on warehouse_locations for insert to authenticated with check (true);
create policy "Authenticated users can update warehouse_locations"
  on warehouse_locations for update to authenticated using (true);

-- Anon policies (app-level auth is cookie-based)
create policy "Anon can read warehouse_faces"
  on warehouse_faces for select to anon using (true);
create policy "Anon can insert warehouse_faces"
  on warehouse_faces for insert to anon with check (true);
create policy "Anon can update warehouse_faces"
  on warehouse_faces for update to anon using (true);

create policy "Anon can read warehouse_locations"
  on warehouse_locations for select to anon using (true);
create policy "Anon can insert warehouse_locations"
  on warehouse_locations for insert to anon with check (true);
create policy "Anon can update warehouse_locations"
  on warehouse_locations for update to anon using (true);
