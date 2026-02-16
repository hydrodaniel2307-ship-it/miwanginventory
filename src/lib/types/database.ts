export type Product = {
  id: string;
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
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
};

export type Inventory = {
  id: string;
  product_id: string;
  quantity: number;
  min_quantity: number;
  location?: string;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
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
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export type Supplier = {
  id: string;
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
