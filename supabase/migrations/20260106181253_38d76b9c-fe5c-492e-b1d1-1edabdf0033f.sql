-- Create payment methods table for Yemen
CREATE TABLE public.payment_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  supported_currencies TEXT[] DEFAULT '{}',
  requires_reference BOOLEAN DEFAULT false,
  reference_label VARCHAR(100),
  reference_label_ar VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  icon VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- Create policies for payment methods
CREATE POLICY "Payment methods are viewable by everyone"
  ON public.payment_methods
  FOR SELECT
  USING (true);

CREATE POLICY "Payment methods can be managed by authenticated users"
  ON public.payment_methods
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Create updated_at trigger
CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default Yemen payment methods
INSERT INTO public.payment_methods (code, name, name_ar, type, supported_currencies, requires_reference, reference_label, reference_label_ar, sort_order, icon) VALUES
  ('CASH_YER', 'Cash (YER)', 'نقدًا - ريال يمني', 'cash', ARRAY['YER'], false, NULL, NULL, 1, 'Banknote'),
  ('CASH_USD', 'Cash (USD)', 'نقدًا - دولار أمريكي', 'cash', ARRAY['USD'], false, NULL, NULL, 2, 'DollarSign'),
  ('CASH_SAR', 'Cash (SAR)', 'نقدًا - ريال سعودي', 'cash', ARRAY['SAR'], false, NULL, NULL, 3, 'Banknote'),
  ('WALLET_KURIMI', 'Kurimi (M-Floos)', 'محفظة الكريمي (أم فلوس)', 'e-wallet', ARRAY['YER', 'USD'], true, 'Transaction Number', 'رقم العملية', 4, 'Wallet'),
  ('WALLET_JAWALI', 'Jawali Wallet', 'محفظة جوالي', 'e-wallet', ARRAY['YER'], true, 'Transaction Number', 'رقم العملية', 5, 'Wallet'),
  ('WALLET_ONECASH', 'ONE Cash', 'وان كاش (ONE Cash)', 'e-wallet', ARRAY['YER'], true, 'Transaction Number', 'رقم العملية', 6, 'Wallet'),
  ('WALLET_MM', 'Mobile Money', 'موبايل موني', 'e-wallet', ARRAY['YER'], true, 'Transaction Number', 'رقم العملية', 7, 'Smartphone'),
  ('BANK_POS', 'POS Card / Shabaka', 'شبكة / نقاط بيع بنكية', 'bank-card', ARRAY['YER', 'USD'], true, 'Receipt Number', 'رقم الإيصال', 8, 'CreditCard'),
  ('BANK_TRANS', 'Bank Transfer', 'تحويل بنكي', 'bank', ARRAY['YER', 'USD', 'SAR', 'EUR', 'AED'], true, 'Transfer Receipt', 'صورة الإشعار', 9, 'Building2'),
  ('CREDIT_ACC', 'Credit / Receivables', 'آجل (ذمم عملاء)', 'credit', ARRAY['YER', 'USD', 'SAR', 'EUR', 'AED'], false, NULL, NULL, 10, 'FileText');