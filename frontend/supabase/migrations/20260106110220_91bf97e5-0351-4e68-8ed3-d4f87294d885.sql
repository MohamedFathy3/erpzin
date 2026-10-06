-- Company settings table
CREATE TABLE public.company_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL DEFAULT 'INJAZ',
  name_ar TEXT DEFAULT 'إنجاز',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  tax_number TEXT,
  commercial_register TEXT,
  default_currency TEXT DEFAULT 'YER',
  tax_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Branches table
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  code TEXT UNIQUE,
  address TEXT,
  phone TEXT,
  manager_name TEXT,
  is_active BOOLEAN DEFAULT true,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tax rates table
CREATE TABLE public.tax_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  rate NUMERIC NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_rates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for read access
CREATE POLICY "Public read access" ON public.company_settings FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.branches FOR SELECT USING (true);
CREATE POLICY "Public read access" ON public.tax_rates FOR SELECT USING (true);

-- RLS Policies for authenticated write access
CREATE POLICY "Authenticated write access" ON public.company_settings FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write access" ON public.branches FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated write access" ON public.tax_rates FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Triggers for updated_at
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tax_rates_updated_at BEFORE UPDATE ON public.tax_rates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default data
INSERT INTO public.company_settings (name, name_ar, default_currency, tax_rate) VALUES 
('INJAZ Trading Co.', 'شركة إنجاز التجارية', 'YER', 0);

INSERT INTO public.branches (name, name_ar, code, address, is_main, is_active) VALUES
('Abra', 'أبرا', 'ABR', 'شارع الزبيري، صنعاء', true, true),
('Primark', 'بريمارك', 'PRM', 'شارع حدة، صنعاء', false, true),
('Fashion Kings', 'فاشن كينجز', 'FKG', 'شارع الستين، صنعاء', false, true),
('Ahyan', 'أحيان', 'AHY', 'شارع تعز، صنعاء', false, true);

INSERT INTO public.tax_rates (name, name_ar, rate, is_default, is_active) VALUES
('No Tax', 'بدون ضريبة', 0, true, true),
('VAT 5%', 'ضريبة القيمة المضافة 5%', 5, false, true),
('VAT 10%', 'ضريبة القيمة المضافة 10%', 10, false, true),
('VAT 15%', 'ضريبة القيمة المضافة 15%', 15, false, true);