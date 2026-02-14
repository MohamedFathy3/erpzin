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
    balance?: number;
    created_at?: string;
    updated_at?: string;
}

export interface PurchaseInvoiceItem {
    product_id: number;
    product_name: string;
    quantity: number;
    price: string;
    discount: string;
    tax: string;
    total: string;
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
    currency: string;
    tax: string;
    invoice_date: string;
    due_date: string;
    payment_method: string;
    note: string | null;
    subtotal: string;
    discount_total: string;
    tax_total: string;
    total_amount: string;
    paid_amount?: string;
    remaining_amount?: string;
    payment_status?: string;
    items: PurchaseInvoiceItem[];
    created_at: string;
}

export interface PurchaseInvoiceDetailsResponse {
    data: PurchaseInvoice;
    result: string;
    message: string;
    status: number;
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

export interface PurchaseReturnItem {
    id: number;
    invoice_number: string;
    supplier_name: string;
    total: number;
    refund_method: string;
    reason: string;
    created_at: string;
}

export interface PurchaseReturnsResponse {
    data: PurchaseReturnItem[];
    meta?: {
        total?: number;
        current_page?: number;
        last_page?: number;
        per_page?: number;
        from?: number;
        to?: number;
    };
}
