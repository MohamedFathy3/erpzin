-- Create inventory_movements table to track all stock movements
CREATE TABLE public.inventory_movements (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('in', 'out', 'adjustment', 'transfer_in', 'transfer_out', 'opening_balance', 'inventory_count')),
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL DEFAULT 0,
    new_stock INTEGER NOT NULL DEFAULT 0,
    reference_type TEXT, -- 'sale', 'purchase', 'transfer', 'adjustment', 'inventory_count', 'opening_balance'
    reference_id UUID, -- ID of the related document
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_counts table for stock counting/inventory
CREATE TABLE public.inventory_counts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    count_number TEXT NOT NULL UNIQUE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'completed', 'cancelled')),
    count_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    total_items INTEGER DEFAULT 0,
    variance_items INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create inventory_count_items table for individual items in a count
CREATE TABLE public.inventory_count_items (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    count_id UUID NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    system_quantity INTEGER NOT NULL DEFAULT 0,
    counted_quantity INTEGER,
    variance INTEGER GENERATED ALWAYS AS (COALESCE(counted_quantity, 0) - system_quantity) STORED,
    notes TEXT,
    counted_at TIMESTAMP WITH TIME ZONE,
    counted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create low_stock_alerts table
CREATE TABLE public.low_stock_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL DEFAULT 'low_stock' CHECK (alert_type IN ('low_stock', 'out_of_stock', 'overstock')),
    current_quantity INTEGER NOT NULL,
    threshold_quantity INTEGER NOT NULL,
    is_read BOOLEAN DEFAULT false,
    is_resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create opening_balances table
CREATE TABLE public.opening_balances (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost NUMERIC NOT NULL DEFAULT 0,
    total_value NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    balance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id, warehouse_id, balance_date)
);

-- Create product_imports table to track import history
CREATE TABLE public.product_imports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    file_name TEXT NOT NULL,
    total_rows INTEGER NOT NULL DEFAULT 0,
    successful_rows INTEGER NOT NULL DEFAULT 0,
    failed_rows INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_log JSONB,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all new tables
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.low_stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opening_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_imports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_movements
CREATE POLICY "Public read access" ON public.inventory_movements FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.inventory_movements FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for inventory_counts
CREATE POLICY "Public read access" ON public.inventory_counts FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.inventory_counts FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for inventory_count_items
CREATE POLICY "Public read access" ON public.inventory_count_items FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.inventory_count_items FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for low_stock_alerts
CREATE POLICY "Public read access" ON public.low_stock_alerts FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.low_stock_alerts FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for opening_balances
CREATE POLICY "Public read access" ON public.opening_balances FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.opening_balances FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for product_imports
CREATE POLICY "Public read access" ON public.product_imports FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.product_imports FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Function to generate inventory count number
CREATE OR REPLACE FUNCTION public.generate_count_number()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
    new_number TEXT;
    counter INTEGER;
BEGIN
    SELECT COUNT(*) + 1 INTO counter FROM public.inventory_counts;
    new_number := 'IC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(counter::TEXT, 4, '0');
    RETURN new_number;
END;
$$;

-- Function to check and create low stock alerts
CREATE OR REPLACE FUNCTION public.check_low_stock_alerts()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    -- Check if stock is below minimum
    IF NEW.stock <= COALESCE(NEW.min_stock, 5) THEN
        INSERT INTO public.low_stock_alerts (product_id, alert_type, current_quantity, threshold_quantity)
        VALUES (
            NEW.id,
            CASE WHEN NEW.stock = 0 THEN 'out_of_stock' ELSE 'low_stock' END,
            NEW.stock,
            COALESCE(NEW.min_stock, 5)
        )
        ON CONFLICT DO NOTHING;
    ELSE
        -- Resolve any existing alerts
        UPDATE public.low_stock_alerts 
        SET is_resolved = true, resolved_at = now()
        WHERE product_id = NEW.id AND is_resolved = false;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create trigger for low stock alerts
CREATE TRIGGER check_product_stock_level
AFTER INSERT OR UPDATE OF stock ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.check_low_stock_alerts();

-- Add updated_at triggers
CREATE TRIGGER update_inventory_counts_updated_at
BEFORE UPDATE ON public.inventory_counts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opening_balances_updated_at
BEFORE UPDATE ON public.opening_balances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();