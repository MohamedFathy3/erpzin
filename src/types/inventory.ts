export interface Warehouse {
  id: number;
  name: string;
  name_ar?: string;
  code: string;
  phone: string;
  address: string;
  manager: string;
  active: boolean;
  main_branch: boolean;
  note: string;
  branch_id?: {
    id: number;
    name: string;
    code: string;
    phone: string;
    address: string;
    manager: string;
    active: boolean;
    main_branch: boolean;
    image: string;
    created_at: string;
    updated_at: string;
  } | null;
  image?: string;
  created_at?: string;
  updated_at?: string;
}

// ========== Product Types ==========
export interface Product {
  id: number;
  name: string;
  name_ar?: string;
  description?: string;
  sku: string;
  barcode?: string;
  price: number | string;
  sell_price?: number | string;
  cost_price?: number | string;
  stock: number;
  reorder_level: number;
  active: boolean;
  image_url?: string | null;
  imageUrl?: string | null;
  image?: any;
  units?: any[];
  category?: any;
  created_at?: string;
  updated_at?: string;
}

// ========== Warehouse Product Types ==========
export interface WarehouseProduct {
  id: number;
  name: string;
  name_ar?: string;
  description?: string;
  sku: string;
  barcode?: string;
  stock: number;
  price: number | string;
  sell_price?: number | string;
  cost_price?: number | string;
  reorder_level?: number;
  active?: boolean;
  image_url?: string | null;
  imageUrl?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ========== Inventory Record Types ==========
export interface InventoryRecord {
  id: number;
  warehouse_id: number;
  product_id: number;
  system_stock: number;
  counted_stock: number;
  difference: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  warehouse: {
    id: number;
    name: string;
    name_ar?: string;
  };
  product: {
    id: number;
    name: string;
    name_ar?: string;
    sku: string;
    stock?: number;
  };
}

// ========== Inventory Count Types ==========
export interface InventoryCount {
  id: number;
  count_number: string;
  warehouse_id: number;
  warehouse?: Warehouse;
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled';
  note: string | null;
  total_items: number;
  variance_items: number;
  count_date: string;
  completed_date: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  items?: InventoryRecord[];
}

// ========== Counted Product Types ==========
export interface CountedProduct {
  product_id: number;
  counted_stock: number;
}

// ========== API Response Types ==========
export interface InventoryResponse {
  data: InventoryRecord[];
  links?: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta?: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    to: number;
    total: number;
  };
  result: string;
  message: string;
  status: number;
}

export interface SingleInventoryResponse {
  data: InventoryRecord;
  result: string;
  message: string;
  status: number;
}

// ========== Payload Types ==========
export interface CreateInventoryPayload {
  warehouse_id: number;
  note?: string | null;
  products: CountedProduct[];
}

export interface UpdateInventoryPayload {
  counted_stock: number;
  note?: string;
  update_stock?: boolean;
}

export interface UpdateNotePayload {
  note: string;
}

// ========== Filter Types ==========
export interface InventoryFilters {
  warehouse_id?: number;
  product_id?: number;
  date_from?: string;
  date_to?: string;
  search?: string;
}