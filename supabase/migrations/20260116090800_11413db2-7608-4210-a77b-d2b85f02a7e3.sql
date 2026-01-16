-- Create currencies table
CREATE TABLE public.currencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  country_code VARCHAR(5),
  exchange_rate NUMERIC DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  decimal_places INTEGER DEFAULT 2,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Currencies are viewable by everyone"
  ON public.currencies FOR SELECT USING (true);

CREATE POLICY "Currencies can be managed by authenticated users"
  ON public.currencies FOR ALL USING (auth.uid() IS NOT NULL);

-- Create updated_at trigger
CREATE TRIGGER update_currencies_updated_at
  BEFORE UPDATE ON public.currencies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default currencies for Arab countries
INSERT INTO public.currencies (code, name, name_ar, symbol, country_code, exchange_rate, is_active, is_default, sort_order) VALUES
  ('YER', 'Yemeni Rial', 'ريال يمني', '﷼', 'YE', 1, true, true, 1),
  ('SAR', 'Saudi Riyal', 'ريال سعودي', '﷼', 'SA', 0.0027, true, false, 2),
  ('USD', 'US Dollar', 'دولار أمريكي', '$', NULL, 0.004, true, false, 3),
  ('AED', 'UAE Dirham', 'درهم إماراتي', 'د.إ', 'AE', 0.015, true, false, 4),
  ('EGP', 'Egyptian Pound', 'جنيه مصري', 'ج.م', 'EG', 0.2, true, false, 5),
  ('KWD', 'Kuwaiti Dinar', 'دينار كويتي', 'د.ك', 'KW', 0.0013, true, false, 6),
  ('QAR', 'Qatari Riyal', 'ريال قطري', '﷼', 'QA', 0.015, true, false, 7),
  ('BHD', 'Bahraini Dinar', 'دينار بحريني', 'د.ب', 'BH', 0.0015, true, false, 8),
  ('OMR', 'Omani Rial', 'ريال عماني', '﷼', 'OM', 0.0015, true, false, 9),
  ('JOD', 'Jordanian Dinar', 'دينار أردني', 'د.أ', 'JO', 0.0028, true, false, 10),
  ('EUR', 'Euro', 'يورو', '€', NULL, 0.0037, true, false, 11);