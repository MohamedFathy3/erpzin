export interface PurchaseOrdersResponse {
    data: PurchaseOrder[];
    links: any;
    meta: any;
    result: string;
    message: string;
    status: number;
}
export interface PurchaseOrder {
    id: number;
    order_number: string;
    supplier: {
        id: number;
        name: string;
    } | null;
    expected_delivery: string | null;
    total_amount: string;
    notes: string | null;
    items: Array<{
        product_id: number;
        product_name: string;
        quantity: number;
        unit_cost: string;
        total: string;
    }>;
    created_at: string;
    status?: string;
}
