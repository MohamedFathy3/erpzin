export interface PurchaseReturn {
    id: number;
    return_number: string;
    invoice_number: string;
    total_amount: string;
    reason: string | null;
    items: ReturnItem[];
    created_at: string;
}

export interface ReturnItem {
    id: number;
    product_name?: string;
    quantity?: number;
    price?: number;
}

export interface PurchaseReturnsResponse {
    data: PurchaseReturn[];
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
        path: string;
        per_page: number;
        to: number;
        total: number;
    };
    result: string;
    message: string;
    status: number;
}

export interface PurchaseReturnFilters {
    search?: string;
    date_from?: string;
    date_to?: string;
    amount_min?: number;
}

export interface PurchaseInvoiceDetails {
    id: number;
    invoice_number: string;
    supplier: {
        id: number;
        name: string;
    };
    items: Array<{
        product_id: number;
        product_name: string;
        quantity: number;
        price: string;
    }>;
}