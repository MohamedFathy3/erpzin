// types/returns.ts
export interface ReturnItem {
  id: string;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  reason: string;
  color?: string | null;
  size?: string | null;
  quantity_sold?: number;
}

export interface ReturnPayload {
  refund_method: string;
  reason: string;
  items: Array<{
    product_id: number;
    color: string | null;
    size: string | null;
    quantity: number;
    price: number;
  }>;
  payments: Array<{
    method: string;
    amount: number;
  }>;
  invoice_number?: string;
}

export interface ReturnResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    return_number: string;
    invoice_number: string;
    total_amount: number;
    refund_method: string;
    created_at: string;
  };
}