export interface Supplier {
  id: number | string;
  name: string;
  name_ar?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  credit_limit?: number;
  payment_terms?: number;
  is_active?: boolean;
  active?: number;
  note?: string;
}

/**
 * DTO for Create / Update
 */
export interface SupplierDto {
  name: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
  credit_limit?: number;
  payment_terms?: number;
  active: number;
}

interface SupplierResponse {
  result: string;
  data: Supplier;
  message: string;
  status: number;
}

export interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier: {
    id: number;
    name: string;
  };
  branch: string;
  warehouse: string;
  currency: string | null;
  tax: string | null;
  invoice_date: string;
  due_date: string | null;
  payment_method: string;
  note: string | null;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total_amount: string;
  paid_amount?: string;
  remaining_amount?: string;
  payment_status?: string;
  items: any[];
  created_at: string;
}

export interface PurchaseInvoicesResponse {
  data: PurchaseInvoice[];
  links: any;
  meta: {
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
