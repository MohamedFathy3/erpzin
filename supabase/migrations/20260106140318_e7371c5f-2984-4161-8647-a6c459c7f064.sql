-- Create delivery_persons table
CREATE TABLE public.delivery_persons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  name_ar TEXT,
  phone TEXT,
  vehicle_type TEXT,
  vehicle_number TEXT,
  is_active BOOLEAN DEFAULT true,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.delivery_persons ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Delivery persons are viewable by everyone" 
ON public.delivery_persons 
FOR SELECT 
USING (true);

CREATE POLICY "Delivery persons can be managed by authenticated users" 
ON public.delivery_persons 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create trigger for updated_at
CREATE TRIGGER update_delivery_persons_updated_at
BEFORE UPDATE ON public.delivery_persons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();