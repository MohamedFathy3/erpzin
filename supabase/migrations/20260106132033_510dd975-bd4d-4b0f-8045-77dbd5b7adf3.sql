-- Create sizes table
CREATE TABLE public.sizes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    code TEXT NOT NULL UNIQUE,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create colors table
CREATE TABLE public.colors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    name_ar TEXT,
    code TEXT NOT NULL UNIQUE,
    hex_code TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product variants table
CREATE TABLE public.product_variants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size_id UUID REFERENCES public.sizes(id),
    color_id UUID REFERENCES public.colors(id),
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT UNIQUE,
    stock INTEGER NOT NULL DEFAULT 0,
    price_adjustment NUMERIC DEFAULT 0,
    cost_adjustment NUMERIC DEFAULT 0,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(product_id, size_id, color_id)
);

-- Enable RLS
ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for sizes
CREATE POLICY "Sizes are viewable by everyone" ON public.sizes FOR SELECT USING (true);
CREATE POLICY "Sizes can be managed by authenticated users" ON public.sizes FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for colors
CREATE POLICY "Colors are viewable by everyone" ON public.colors FOR SELECT USING (true);
CREATE POLICY "Colors can be managed by authenticated users" ON public.colors FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policies for product_variants
CREATE POLICY "Product variants are viewable by everyone" ON public.product_variants FOR SELECT USING (true);
CREATE POLICY "Product variants can be managed by authenticated users" ON public.product_variants FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Add has_variants column to products
ALTER TABLE public.products ADD COLUMN has_variants BOOLEAN DEFAULT false;

-- Trigger for updated_at
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default sizes for clothing
INSERT INTO public.sizes (name, name_ar, code, sort_order) VALUES
('Extra Small', 'صغير جداً', 'XS', 1),
('Small', 'صغير', 'S', 2),
('Medium', 'وسط', 'M', 3),
('Large', 'كبير', 'L', 4),
('Extra Large', 'كبير جداً', 'XL', 5),
('XXL', 'XXL', 'XXL', 6),
('36', '36', '36', 10),
('37', '37', '37', 11),
('38', '38', '38', 12),
('39', '39', '39', 13),
('40', '40', '40', 14),
('41', '41', '41', 15),
('42', '42', '42', 16),
('43', '43', '43', 17),
('44', '44', '44', 18),
('45', '45', '45', 19);

-- Insert default colors
INSERT INTO public.colors (name, name_ar, code, hex_code) VALUES
('Black', 'أسود', 'BLK', '#000000'),
('White', 'أبيض', 'WHT', '#FFFFFF'),
('Red', 'أحمر', 'RED', '#EF4444'),
('Blue', 'أزرق', 'BLU', '#3B82F6'),
('Navy', 'كحلي', 'NAV', '#1E3A5F'),
('Green', 'أخضر', 'GRN', '#22C55E'),
('Yellow', 'أصفر', 'YLW', '#EAB308'),
('Orange', 'برتقالي', 'ORG', '#F97316'),
('Pink', 'وردي', 'PNK', '#EC4899'),
('Purple', 'بنفسجي', 'PRP', '#A855F7'),
('Brown', 'بني', 'BRN', '#92400E'),
('Gray', 'رمادي', 'GRY', '#6B7280'),
('Beige', 'بيج', 'BEG', '#D4C4A8'),
('Khaki', 'كاكي', 'KHK', '#C3B091');