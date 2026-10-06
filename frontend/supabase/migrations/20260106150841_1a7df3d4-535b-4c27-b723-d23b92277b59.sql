-- Create purchase invoices table for managing incoming goods
CREATE TABLE public.purchase_invoices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_number TEXT NOT NULL UNIQUE,
    supplier_id UUID REFERENCES public.suppliers(id),
    purchase_order_id UUID REFERENCES public.purchase_orders(id),
    branch_id UUID REFERENCES public.branches(id),
    warehouse_id UUID REFERENCES public.warehouses(id),
    invoice_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    due_date TIMESTAMP WITH TIME ZONE,
    payment_method TEXT DEFAULT 'credit', -- cash, credit, bank_transfer, check
    payment_status TEXT DEFAULT 'unpaid', -- paid, partial, unpaid
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    paid_amount NUMERIC DEFAULT 0,
    remaining_amount NUMERIC DEFAULT 0,
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase invoice items table
CREATE TABLE public.purchase_invoice_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    product_variant_id UUID REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    discount_percent NUMERIC DEFAULT 0,
    discount_amount NUMERIC DEFAULT 0,
    tax_percent NUMERIC DEFAULT 0,
    tax_amount NUMERIC DEFAULT 0,
    total_cost NUMERIC NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplier transactions table for tracking debts and payments
CREATE TABLE public.supplier_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    transaction_type TEXT NOT NULL, -- invoice, payment, refund, adjustment
    reference_type TEXT, -- purchase_invoice, payment, etc.
    reference_id UUID, -- links to invoice or payment
    amount NUMERIC NOT NULL DEFAULT 0,
    balance_before NUMERIC DEFAULT 0,
    balance_after NUMERIC DEFAULT 0,
    description TEXT,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create supplier payments table
CREATE TABLE public.supplier_payments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_number TEXT NOT NULL UNIQUE,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    invoice_id UUID REFERENCES public.purchase_invoices(id),
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash', -- cash, bank_transfer, check
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    reference_number TEXT, -- check number, transfer reference, etc.
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add balance and credit fields to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_limit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS tax_number TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add average_cost field to products table for weighted average cost
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS average_cost NUMERIC DEFAULT 0;

-- Enable RLS on new tables
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for purchase_invoices
CREATE POLICY "Purchase invoices are viewable by everyone" 
ON public.purchase_invoices FOR SELECT USING (true);

CREATE POLICY "Purchase invoices can be managed by authenticated users" 
ON public.purchase_invoices FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create RLS policies for purchase_invoice_items
CREATE POLICY "Purchase invoice items are viewable by everyone" 
ON public.purchase_invoice_items FOR SELECT USING (true);

CREATE POLICY "Purchase invoice items can be managed by authenticated users" 
ON public.purchase_invoice_items FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create RLS policies for supplier_transactions
CREATE POLICY "Supplier transactions are viewable by everyone" 
ON public.supplier_transactions FOR SELECT USING (true);

CREATE POLICY "Supplier transactions can be managed by authenticated users" 
ON public.supplier_transactions FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create RLS policies for supplier_payments
CREATE POLICY "Supplier payments are viewable by everyone" 
ON public.supplier_payments FOR SELECT USING (true);

CREATE POLICY "Supplier payments can be managed by authenticated users" 
ON public.supplier_payments FOR ALL 
USING (auth.uid() IS NOT NULL) 
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to generate invoice number
CREATE OR REPLACE FUNCTION public.generate_purchase_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO counter FROM public.purchase_invoices;
    new_number := 'PI-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$;

-- Create function to generate payment number
CREATE OR REPLACE FUNCTION public.generate_payment_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO counter FROM public.supplier_payments;
    new_number := 'PAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$;

-- Create trigger for updated_at on purchase_invoices
CREATE TRIGGER update_purchase_invoices_updated_at
BEFORE UPDATE ON public.purchase_invoices
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();