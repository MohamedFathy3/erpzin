// export interface PurchaseInvoice {
//     id: number;
//     invoice_number: string;
//     supplier: {
//         id: number;
//         name: string;
//     };
//     branch: string;
//     warehouse: string;
//     currency: string | null;
//     tax: string | null;
//     invoice_date: string;
//     due_date: string | null;
//     payment_method: string;
//     note: string | null;
//     subtotal: string;
//     discount_total: string;
//     tax_total: string;
//     total_amount: string;
//     paid_amount?: string;
//     remaining_amount?: string;
//     payment_status?: string;
//     items: any[];
//     created_at: string;
// }


// export interface PurchaseInvoicesResponse {
//     data: PurchaseInvoice[];
//     links: any;
//     meta: {
//         current_page: number;
//         from: number;
//         last_page: number;
//         per_page: number;
//         to: number;
//         total: number;
//     };
//     result: string;
//     message: string;
//     status: number;
// }

export interface PaymentResponse {
    message: string;
    invoice: PurchaseInvoice;
    remaining: number;
    payment?: PurchaseInvoicePayment;
}

export interface PurchaseInvoicePayment {
  id: number;
  purchase_invoice_id: number;
  treasury_id: number | null;
  bank_id: number | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference_number?: string | null;
  treasury_name?: string | null;
  created_by: number | null;
  created_by_type: string | null;
  journal_entry_id: number | null;
  notes: string | null;
}
export interface PurchaseInvoiceItem {
  product_id: number;
  product_name: string;
  product_name_ar?: string;
  product_sku?: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  total: number;
  variant_details?: {
    size?: string;
    color?: string;
  } | null;
}


export interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier_id: number;
  supplier_name: string;
  supplier_name_ar: string | null;
  branch_id: number;
  branch_name: string;
  warehouse_id: number;
  warehouse_name: string;
  treasury_id: number;
  treasury_name: string;
  currency_id: number;
  currency_code: string;
  tax_id: number | null;
  tax_rate: string | null;
  invoice_date: string;
  due_date: string | null;
  payment_method: string;
  note: string | null;
  subtotal: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  posting_journal_entry_id?: number | null;
  workflow_status?: string | null;
  payments?: PurchaseInvoicePayment[];
  items: PurchaseInvoiceItem[];
  created_at: string;
  updated_at: string;
}
export interface PurchaseInvoicesResponse {
  data: PurchaseInvoice[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  result: string;
  message: string;
  status: number;
}




export interface PaymentPayload {
    amount: number;
    treasury_id?: number;
    payment_method?: string;
    reference_number?: string;
    notes?: string;
    payment_date: string;
}
