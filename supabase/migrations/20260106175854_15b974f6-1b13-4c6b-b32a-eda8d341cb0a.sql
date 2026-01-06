-- Create purchase returns table
CREATE TABLE public.purchase_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_number TEXT NOT NULL UNIQUE,
  original_invoice_id UUID REFERENCES public.purchase_invoices(id),
  original_invoice_number TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  branch_id UUID REFERENCES public.branches(id),
  warehouse_id UUID REFERENCES public.warehouses(id),
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  subtotal NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(15,2) DEFAULT 0,
  discount_amount NUMERIC(15,2) DEFAULT 0,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  refund_method TEXT DEFAULT 'credit',
  refund_status TEXT DEFAULT 'pending',
  reason TEXT,
  notes TEXT,
  status TEXT DEFAULT 'pending',
  processed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase return items table
CREATE TABLE public.purchase_return_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  return_id UUID NOT NULL REFERENCES public.purchase_returns(id) ON DELETE CASCADE,
  original_item_id UUID REFERENCES public.purchase_invoice_items(id),
  product_id UUID REFERENCES public.products(id),
  product_variant_id UUID REFERENCES public.product_variants(id),
  product_name TEXT NOT NULL,
  quantity NUMERIC(15,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.purchase_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_return_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for purchase_returns
CREATE POLICY "Allow all operations on purchase_returns" 
ON public.purchase_returns 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create RLS policies for purchase_return_items
CREATE POLICY "Allow all operations on purchase_return_items" 
ON public.purchase_return_items 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to generate purchase return number
CREATE OR REPLACE FUNCTION public.generate_purchase_return_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_number TEXT;
  current_count INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO current_count FROM public.purchase_returns;
  new_number := 'PR-' || LPAD(current_count::TEXT, 6, '0');
  RETURN new_number;
END;
$$;

-- Create trigger for updating updated_at
CREATE TRIGGER update_purchase_returns_updated_at
BEFORE UPDATE ON public.purchase_returns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();