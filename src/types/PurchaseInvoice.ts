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
    result: string;
    data: any;
    message: string;
    status: number;
}


export interface PurchaseInvoice {
    id: number;
    invoice_number: string;
    supplier: {
        id: number;
        name: string;
        name_ar?: string;
    };
    branch: {
        id: number;
        name: string;
        name_ar?: string;
    };
    warehouse: {
        id: number;
        name: string;
        name_ar?: string;
    };
    treasury: {
        id: number;
        name: string;
        name_ar?: string;
        is_main?: boolean;
    } | null;
    currency: {
        id: number;
        name: string;
        code: string;
        symbol: string;
    };
    tax: {
        id: number;
        name: string;
        rate: string;
    } | null;
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
    items: Array<{
        id: number;
        product_id: number;
        product_name: string;
        product_name_ar?: string;
        product_sku: string;
        product_variant_id?: number;
        variant_details?: {
            size?: string;
            color?: string;
        } | null;
        quantity: number;
        price: number;
        discount: number;
        tax: number;
        total: number;
    }>;
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
    payment_method?: string;
    reference_number?: string;
    notes?: string;
    payment_date?: string;
}
