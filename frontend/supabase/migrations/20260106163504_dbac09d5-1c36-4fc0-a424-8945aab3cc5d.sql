
-- Create salesmen table for commission tracking
CREATE TABLE public.salesmen (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID REFERENCES public.employees(id),
    name TEXT NOT NULL,
    name_ar TEXT,
    phone TEXT,
    email TEXT,
    commission_rate NUMERIC DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    branch_id UUID REFERENCES public.branches(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales invoices table (standard invoices)
CREATE TABLE public.sales_invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    invoice_type TEXT NOT NULL DEFAULT 'standard', -- 'standard', 'pos'
    customer_id UUID REFERENCES public.customers(id) NOT NULL,
    salesman_id UUID REFERENCES public.salesmen(id),
    branch_id UUID REFERENCES public.branches(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    due_date DATE,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    discount_percent NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    tax_percent NUMERIC DEFAULT 15,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    remaining_amount NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'cancelled'
    payment_method TEXT, -- 'cash', 'card', 'credit', 'mixed'
    notes TEXT,
    created_by UUID,
    status TEXT DEFAULT 'active', -- 'active', 'cancelled', 'returned'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales invoice items table
CREATE TABLE public.sales_invoice_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.sales_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    product_variant_id UUID REFERENCES public.product_variants(id),
    product_name TEXT NOT NULL,
    sku TEXT,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    discount_percent NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_price NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales returns table (enhanced)
CREATE TABLE public.sales_returns (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    return_number TEXT NOT NULL UNIQUE,
    original_invoice_id UUID REFERENCES public.sales_invoices(id),
    original_invoice_number TEXT,
    invoice_type TEXT DEFAULT 'standard', -- 'standard', 'pos'
    customer_id UUID REFERENCES public.customers(id),
    branch_id UUID REFERENCES public.branches(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    refund_method TEXT, -- 'cash', 'credit_note', 'account_deduction'
    reason TEXT,
    notes TEXT,
    processed_by UUID,
    status TEXT DEFAULT 'completed', -- 'pending', 'completed', 'cancelled'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales return items table
CREATE TABLE public.sales_return_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    return_id UUID NOT NULL REFERENCES public.sales_returns(id) ON DELETE CASCADE,
    original_item_id UUID,
    product_id UUID REFERENCES public.products(id),
    product_variant_id UUID REFERENCES public.product_variants(id),
    product_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    total_price NUMERIC NOT NULL DEFAULT 0,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create function to generate sales invoice number
CREATE OR REPLACE FUNCTION public.generate_sales_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO counter FROM public.sales_invoices;
    new_number := 'SI-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$;

-- Create function to generate sales return number
CREATE OR REPLACE FUNCTION public.generate_sales_return_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO counter FROM public.sales_returns;
    new_number := 'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$;

-- Enable RLS
ALTER TABLE public.salesmen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_return_items ENABLE ROW LEVEL SECURITY;

-- Create policies for salesmen
CREATE POLICY "Allow all access to salesmen" ON public.salesmen FOR ALL USING (true) WITH CHECK (true);

-- Create policies for sales_invoices
CREATE POLICY "Allow all access to sales_invoices" ON public.sales_invoices FOR ALL USING (true) WITH CHECK (true);

-- Create policies for sales_invoice_items
CREATE POLICY "Allow all access to sales_invoice_items" ON public.sales_invoice_items FOR ALL USING (true) WITH CHECK (true);

-- Create policies for sales_returns
CREATE POLICY "Allow all access to sales_returns" ON public.sales_returns FOR ALL USING (true) WITH CHECK (true);

-- Create policies for sales_return_items
CREATE POLICY "Allow all access to sales_return_items" ON public.sales_return_items FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_sales_invoices_customer ON public.sales_invoices(customer_id);
CREATE INDEX idx_sales_invoices_date ON public.sales_invoices(invoice_date);
CREATE INDEX idx_sales_invoices_status ON public.sales_invoices(payment_status);
CREATE INDEX idx_sales_invoices_number ON public.sales_invoices(invoice_number);
CREATE INDEX idx_sales_returns_invoice ON public.sales_returns(original_invoice_id);
CREATE INDEX idx_sales_returns_date ON public.sales_returns(return_date);

-- Add triggers for updated_at
CREATE TRIGGER update_salesmen_updated_at BEFORE UPDATE ON public.salesmen
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_invoices_updated_at BEFORE UPDATE ON public.sales_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sales_returns_updated_at BEFORE UPDATE ON public.sales_returns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
