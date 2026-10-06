-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  icon TEXT DEFAULT 'Package',
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  cost DECIMAL(10,2) DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  min_stock INTEGER DEFAULT 5,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Create policies for categories (public read for POS)
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Categories can be managed by authenticated users" 
ON public.categories FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create policies for products (public read for POS)
CREATE POLICY "Products are viewable by everyone" 
ON public.products FOR SELECT USING (true);

CREATE POLICY "Products can be managed by authenticated users" 
ON public.products FOR ALL 
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample categories
INSERT INTO public.categories (name, name_ar, icon) VALUES
('Electronics', 'إلكترونيات', 'Smartphone'),
('Clothing', 'ملابس', 'Shirt'),
('Food & Beverages', 'مأكولات ومشروبات', 'Coffee'),
('Home & Garden', 'المنزل والحديقة', 'Home'),
('Sports', 'رياضة', 'Dumbbell');

-- Insert sample products
INSERT INTO public.products (name, name_ar, sku, barcode, price, cost, stock, min_stock, category_id, image_url) 
SELECT 
  'iPhone 15 Pro', 'آيفون 15 برو', 'ELEC-001', '1234567890123', 4999.00, 4200.00, 25, 5, id, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=200'
FROM public.categories WHERE name = 'Electronics';

INSERT INTO public.products (name, name_ar, sku, barcode, price, cost, stock, min_stock, category_id, image_url) 
SELECT 
  'Samsung Galaxy S24', 'سامسونج جالاكسي S24', 'ELEC-002', '1234567890124', 3999.00, 3400.00, 18, 5, id, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=200'
FROM public.categories WHERE name = 'Electronics';

INSERT INTO public.products (name, name_ar, sku, barcode, price, cost, stock, min_stock, category_id, image_url) 
SELECT 
  'Men Cotton T-Shirt', 'تيشيرت قطني رجالي', 'CLTH-001', '2234567890123', 89.00, 45.00, 150, 20, id, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200'
FROM public.categories WHERE name = 'Clothing';

INSERT INTO public.products (name, name_ar, sku, barcode, price, cost, stock, min_stock, category_id, image_url) 
SELECT 
  'Women Dress', 'فستان نسائي', 'CLTH-002', '2234567890124', 299.00, 180.00, 45, 10, id, 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200'
FROM public.categories WHERE name = 'Clothing';

INSERT INTO public.products (name, name_ar, sku, barcode, price, cost, stock, min_stock, category_id, image_url) 
SELECT 
  'Arabic Coffee 500g', 'قهوة عربية 500 جرام', 'FOOD-001', '3234567890123', 75.00, 50.00, 200, 30, id, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200'
FROM public.categories WHERE name = 'Food & Beverages';

INSERT INTO public.products (name, name_ar, sku, barcode, price, cost, stock, min_stock, category_id, image_url) 
SELECT 
  'Premium Dates 1kg', 'تمور فاخرة 1 كيلو', 'FOOD-002', '3234567890124', 120.00, 80.00, 85, 15, id, 'https://images.unsplash.com/photo-1593299883578-32da9f9d5e5c?w=200'
FROM public.categories WHERE name = 'Food & Beverages';

INSERT INTO public.products (name, name_ar, sku, barcode, price, cost, stock, min_stock, category_id, image_url) 
SELECT 
  'Garden Chair Set', 'طقم كراسي حديقة', 'HOME-001', '4234567890123', 850.00, 600.00, 12, 3, id, 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=200'
FROM public.categories WHERE name = 'Home & Garden';

INSERT INTO public.products (name, name_ar, sku, barcode, price, cost, stock, min_stock, category_id, image_url) 
SELECT 
  'Yoga Mat Pro', 'سجادة يوغا احترافية', 'SPRT-001', '5234567890123', 149.00, 90.00, 60, 10, id, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=200'
FROM public.categories WHERE name = 'Sports';