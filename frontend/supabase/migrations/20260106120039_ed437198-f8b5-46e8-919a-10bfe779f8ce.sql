-- Create stock transfers table
CREATE TABLE public.stock_transfers (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transfer_number TEXT NOT NULL UNIQUE,
    from_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    to_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
    transfer_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    total_items INTEGER DEFAULT 0,
    total_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT different_warehouses CHECK (from_warehouse_id != to_warehouse_id)
);

-- Create stock transfer items table
CREATE TABLE public.stock_transfer_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    transfer_id UUID NOT NULL REFERENCES public.stock_transfers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    received_quantity INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create warehouse stock table to track stock per warehouse
CREATE TABLE public.warehouse_stock (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_quantity INTEGER DEFAULT 0,
    max_quantity INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(warehouse_id, product_id)
);

-- Enable RLS
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouse_stock ENABLE ROW LEVEL SECURITY;

-- Create policies for stock_transfers
CREATE POLICY "Public read access" ON public.stock_transfers
    FOR SELECT USING (true);

CREATE POLICY "Authenticated write access" ON public.stock_transfers
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create policies for stock_transfer_items
CREATE POLICY "Public read access" ON public.stock_transfer_items
    FOR SELECT USING (true);

CREATE POLICY "Authenticated write access" ON public.stock_transfer_items
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create policies for warehouse_stock
CREATE POLICY "Public read access" ON public.warehouse_stock
    FOR SELECT USING (true);

CREATE POLICY "Authenticated write access" ON public.warehouse_stock
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_stock_transfers_updated_at
    BEFORE UPDATE ON public.stock_transfers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to generate transfer number
CREATE OR REPLACE FUNCTION public.generate_transfer_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO counter FROM public.stock_transfers;
    new_number := 'TR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$;