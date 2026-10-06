// types/index.ts
export interface Unit {
  id: number;
  unit_id: number;
  unit_name: string;
  cost_price: string;
  sell_price: string;
  barcode: string;
  colors: Color[];
}

export interface Color {
  id: number;
  color_id: number;
  color: string;
  stock: number;
  hex_code: string;
}

export interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  category_id?: number;
unit_id?: number;
  cost: number;
  stock?: number;
  barcode?: string;
  price?: number;
  units?: Unit[];
}

export interface ImportPreviewItem {
  row: number;
  product_name: string;
  sku: string;
  quantity: number;
  cost_price: number;
  barcode: string;
  price: number;
  status: 'pending' | 'valid' | 'error';
  error?: string;
}

export interface SelectedProduct {
  product: Product;
  unit_id?: number;
  unitName?: string;
  unitId?: number;
  colorId?: number;
  colorName?: string;
  quantity: number;
  cost: number;
  price: number;
  warehouse_id?: number;
  branch_id?: number;
  barcode?: string;
}

export interface Branch {
  id: number;
  name: string;
  name_ar?: string;
}

export interface Warehouse {
  id: number;
  name: string;
  name_ar?: string;
}