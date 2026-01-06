-- Create warehouses table
CREATE TABLE public.warehouses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    code TEXT,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    address TEXT,
    phone TEXT,
    manager_name TEXT,
    is_active BOOLEAN DEFAULT true,
    is_main BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access" ON public.warehouses
    FOR SELECT USING (true);

CREATE POLICY "Authenticated write access" ON public.warehouses
    FOR ALL USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_warehouses_updated_at
    BEFORE UPDATE ON public.warehouses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();