// types/loyalty.ts
export interface LoyaltySettings {
  id?: number;
  points: number;
  point_value: number;
  silver: number;
  gold: number;
  platinum: number;
}

export interface Customer {
  id: string;
  name: string;
  name_ar: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  point: number;
  last_paid_amount: number | null;
  total_purchases?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerFormData {
  name: string;
  name_ar: string;
  phone: string;
  email: string;
  address: string;
}

export interface Tier {
  name: string;
  threshold: number;
  color: string;
  icon: JSX.Element;
  label: string;
}