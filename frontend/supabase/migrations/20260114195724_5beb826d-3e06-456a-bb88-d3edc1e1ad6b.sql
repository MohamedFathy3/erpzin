-- Create promotions table
CREATE TABLE public.promotions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  description TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value NUMERIC NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  min_quantity INTEGER DEFAULT 1,
  max_uses INTEGER, -- null = unlimited
  current_uses INTEGER DEFAULT 0,
  branch_id UUID REFERENCES public.branches(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create promotion_products junction table
CREATE TABLE public.promotion_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  promotion_id UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  special_discount_value NUMERIC, -- Override promotion discount for specific product
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(promotion_id, product_id, product_variant_id)
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotion_products ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for promotions
CREATE POLICY "Promotions are viewable by everyone" 
ON public.promotions 
FOR SELECT 
USING (true);

CREATE POLICY "Promotions can be managed by authenticated users" 
ON public.promotions 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create RLS policies for promotion_products
CREATE POLICY "Promotion products are viewable by everyone" 
ON public.promotion_products 
FOR SELECT 
USING (true);

CREATE POLICY "Promotion products can be managed by authenticated users" 
ON public.promotion_products 
FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_promotions_dates ON public.promotions(start_date, end_date);
CREATE INDEX idx_promotions_active ON public.promotions(is_active);
CREATE INDEX idx_promotion_products_promotion ON public.promotion_products(promotion_id);
CREATE INDEX idx_promotion_products_product ON public.promotion_products(product_id);

-- Create trigger for updated_at
CREATE TRIGGER update_promotions_updated_at
BEFORE UPDATE ON public.promotions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();