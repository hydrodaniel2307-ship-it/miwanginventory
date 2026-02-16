export type Product = {
  id: string;
  org_id: string;
  name: string;
  sku: string;
  description?: string;
  category_id?: string;
  unit_price: number;
  cost_price: number;
  image_url?: string;
  units_per_box?: number;
  active?: boolean;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  org_id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

export type Inventory = {
  id: string;
  org_id: string;
  product_id: string;
  quantity: number;
  min_quantity: number;
  location?: string;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  org_id: string;
  order_number: string;
  type: "purchase" | "sale";
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  supplier_id?: string;
  total_amount: number;
  notes?: string;
  order_date: string;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  org_id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type Supplier = {
  id: string;
  org_id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
  updated_at: string;
};

export type WarehouseFace = {
  id: string;
  org_id: string;
  face_no: number;
  name: string;
  bay_count: number;
  level_count: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type WarehouseLocation = {
  id: string;
  org_id: string;
  code: string;
  face_no?: number | null;
  bay_no?: number | null;
  level_no?: number | null;
  active: boolean;
  is_virtual: boolean;
  display_name?: string | null;
  created_at: string;
  updated_at: string;
};

export type WarehouseMapLayout = {
  id: string;
  org_id: string;
  warehouse_id: string;
  version: number;
  layout_json: import("@/lib/map-layout").DecorItem[];
  layout_data: import("@/lib/map-layout").DecorItem[];
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type WarehouseSettings = {
  id: string;
  org_id: string;
  key: string;
  value: Record<string, unknown>;
  updated_at: string;
  updated_by?: string | null;
  created_at: string;
};

export type WarehouseCell = {
  id: string;
  org_id: string;
  location_id?: string | null;
  face_no?: number | null;
  bay_no?: number | null;
  level_no?: number | null;
  pos_x: number;
  pos_y: number;
  pos_z: number;
  width: number;
  height: number;
  depth: number;
  cell_type: 'shelf' | 'cold' | 'empty' | 'reserved';
  label?: string | null;
  color?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
};
