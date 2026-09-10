// types/purchase.types.ts
export interface InvoiceItem {
  id: string;
  product_id: number | null;
  product_variant_id?: number | null;
  size_id?: number | null;
  product_name: string;
  product_sku: string;
  size_name?: string;
  color_name?: string;
  stock: number;
  quantity: number;
  unit_cost: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  total_cost: number;
  product_unit_id?: number | null;
  color_id?: number | null;

}

export interface PurchaseInvoicePayload {
  supplier_id: number;
  branch_id: number | null;
  warehouse_id: number;
  currency_id: number;
  tax_id: number | null;
  payment_method: string;
  invoice_date: string;
  due_date: string | null;
  note: string | null;
  paid_amount: number;
  remaining_amount: number;
  treasury_id: number | null;
  items: PurchaseInvoiceItemPayload[];
}

export interface PurchaseInvoiceItemPayload {
  product_id: number;
  product_variant_id?: number | null;
  size_id?: number | null;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  product_unit_id?: number | null;
  color_id?: number | null;
  store:number,
}

export interface Supplier {
  id: number;
  name: string;
  name_ar?: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
  credit_limit?: number;
  payment_terms?: number;
  active: boolean;
  balance?: number;
}

export interface Branch {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
}

export interface Warehouse {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  branch_id?: number;
}

export interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
  exchange_rate: string;
  active: boolean;
  default: boolean;
}

export interface Tax {
  id: number;
  name: string;
  name_ar?: string;
  rate: number;
  active: boolean;
  default?: boolean;
}

export interface Treasury {
  id: number;
  name: string;
  name_ar?: string;
  branch_id: number;
  balance: number;
  currency: string;
  is_main: boolean;
  notes?: string;
}

export interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  barcode?: string;
  cost?: number;
  price?: number;
  stock: number;
  has_variants?: boolean;
  active: boolean;
  units?: ProductUnit[];
}

export interface ProductUnit {
  id: number;
  unit_id: number;
  unit_name: string;
  cost_price: string;
  sell_price: string;
  barcode: string;
  colors?: ProductColor[];
}

export interface ProductColor {
  id: number;
  color_id: number;
  color: string;
  stock: number;
}

export interface ApiPurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier: { id: number; name: string; name_ar?: string };
  branch: { id: number; name: string; name_ar?: string };
  warehouse: { id: number; name: string; name_ar?: string };
  treasury: { id: number; name: string; name_ar?: string; is_main?: boolean } | null;
  currency: { id: number; name: string; code: string; symbol: string };
  tax: { id: number; name: string; rate: string } | null;
  invoice_date: string;
  due_date: string;
  payment_method: string;
  note: string | null;
  subtotal: number;
  paid_amount: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
  remaining_amount: number;
  items: ApiInvoiceItem[];
  created_at: string;
  updated_at: string;
}

export interface ApiInvoiceItem {
  id: number;
  product_id: number;
  product_name: string;
  product_name_ar?: string;
  product_sku: string;
  product_variant_id?: number;
  variant_details?: { size?: string; color?: string } | null;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
  product_unit_id?: number;
  color_id?: number;
}