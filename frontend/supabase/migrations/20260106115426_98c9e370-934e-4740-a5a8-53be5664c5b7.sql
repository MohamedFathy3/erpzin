-- Create junction table for many-to-many relationship between branches and warehouses
CREATE TABLE public.branch_warehouses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(branch_id, warehouse_id)
);

-- Remove the direct branch_id from warehouses (we'll use junction table instead)
ALTER TABLE public.warehouses DROP COLUMN IF EXISTS branch_id;

-- Enable RLS
ALTER TABLE public.branch_warehouses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access" ON public.branch_warehouses
    FOR SELECT USING (true);

CREATE POLICY "Authenticated write access" ON public.branch_warehouses
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);