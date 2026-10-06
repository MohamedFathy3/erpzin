-- Create POS shifts table for shift management
CREATE TABLE public.pos_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_number TEXT NOT NULL,
  cashier_id UUID REFERENCES auth.users(id),
  branch_id UUID REFERENCES public.branches(id),
  opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  opening_amount NUMERIC NOT NULL DEFAULT 0,
  closing_amount NUMERIC,
  expected_amount NUMERIC,
  cash_sales NUMERIC DEFAULT 0,
  card_sales NUMERIC DEFAULT 0,
  other_sales NUMERIC DEFAULT 0,
  total_sales NUMERIC DEFAULT 0,
  total_returns NUMERIC DEFAULT 0,
  transactions_count INTEGER DEFAULT 0,
  variance NUMERIC,
  variance_notes TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create POS returns table
CREATE TABLE public.pos_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_number TEXT NOT NULL,
  original_sale_id UUID REFERENCES public.sales(id),
  original_invoice_number TEXT,
  shift_id UUID REFERENCES public.pos_shifts(id),
  customer_id UUID REFERENCES public.customers(id),
  return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  return_type TEXT NOT NULL DEFAULT 'partial',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  refund_method TEXT DEFAULT 'cash',
  reason TEXT,
  notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create POS return items table
CREATE TABLE public.pos_return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID NOT NULL REFERENCES public.pos_returns(id) ON DELETE CASCADE,
  original_sale_item_id UUID REFERENCES public.sale_items(id),
  product_id UUID REFERENCES public.products(id),
  product_variant_id UUID REFERENCES public.product_variants(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pos_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_return_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pos_shifts
CREATE POLICY "POS shifts are viewable by authenticated users" 
ON public.pos_shifts FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "POS shifts can be managed by authenticated users" 
ON public.pos_shifts FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for pos_returns
CREATE POLICY "POS returns are viewable by authenticated users" 
ON public.pos_returns FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "POS returns can be managed by authenticated users" 
ON public.pos_returns FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for pos_return_items
CREATE POLICY "POS return items are viewable by authenticated users" 
ON public.pos_return_items FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "POS return items can be managed by authenticated users" 
ON public.pos_return_items FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Function to generate shift number
CREATE OR REPLACE FUNCTION public.generate_shift_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO counter FROM public.pos_shifts;
    new_number := 'SH-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$;

-- Function to generate return number
CREATE OR REPLACE FUNCTION public.generate_return_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO counter FROM public.pos_returns;
    new_number := 'RET-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$;