
-- Chart of Accounts (شجرة الحسابات)
CREATE TABLE public.chart_of_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_ar TEXT,
  account_type TEXT NOT NULL CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
  parent_id UUID REFERENCES public.chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  is_header BOOLEAN DEFAULT false,
  balance NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Revenues (الإيرادات)
CREATE TABLE public.revenues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  revenue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  reference_number TEXT,
  payment_method TEXT DEFAULT 'cash',
  branch_id UUID REFERENCES public.branches(id),
  account_id UUID REFERENCES public.chart_of_accounts(id),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Treasuries (الخزائن)
CREATE TABLE public.treasuries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  code TEXT UNIQUE,
  branch_id UUID REFERENCES public.branches(id),
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'YER',
  is_active BOOLEAN DEFAULT true,
  is_main BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Banks (البنوك)
CREATE TABLE public.banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT,
  account_number TEXT,
  iban TEXT,
  swift_code TEXT,
  branch_id UUID REFERENCES public.branches(id),
  balance NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'YER',
  is_active BOOLEAN DEFAULT true,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Treasury Transactions (حركات الخزينة)
CREATE TABLE public.treasury_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  treasury_id UUID NOT NULL REFERENCES public.treasuries(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer')),
  amount NUMERIC NOT NULL,
  balance_before NUMERIC DEFAULT 0,
  balance_after NUMERIC DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Bank Transactions (حركات البنك)
CREATE TABLE public.bank_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_id UUID NOT NULL REFERENCES public.banks(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'transfer', 'check')),
  amount NUMERIC NOT NULL,
  balance_before NUMERIC DEFAULT 0,
  balance_after NUMERIC DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  check_number TEXT,
  description TEXT,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add branch_id to expenses table
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.chart_of_accounts(id);

-- Enable RLS
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Public read access" ON public.chart_of_accounts FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.chart_of_accounts FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON public.revenues FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.revenues FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON public.treasuries FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.treasuries FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON public.banks FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.banks FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON public.treasury_transactions FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.treasury_transactions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Public read access" ON public.bank_transactions FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON public.bank_transactions FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Insert default chart of accounts
INSERT INTO public.chart_of_accounts (code, name, name_ar, account_type, is_header) VALUES
('1', 'Assets', 'الأصول', 'asset', true),
('11', 'Current Assets', 'الأصول المتداولة', 'asset', true),
('111', 'Cash', 'النقدية', 'asset', false),
('112', 'Banks', 'البنوك', 'asset', false),
('113', 'Accounts Receivable', 'المدينون', 'asset', false),
('114', 'Inventory', 'المخزون', 'asset', false),
('12', 'Fixed Assets', 'الأصول الثابتة', 'asset', true),
('121', 'Equipment', 'المعدات', 'asset', false),
('122', 'Furniture', 'الأثاث', 'asset', false),
('2', 'Liabilities', 'الالتزامات', 'liability', true),
('21', 'Current Liabilities', 'الالتزامات المتداولة', 'liability', true),
('211', 'Accounts Payable', 'الدائنون', 'liability', false),
('212', 'Accrued Expenses', 'المصروفات المستحقة', 'liability', false),
('3', 'Equity', 'حقوق الملكية', 'equity', true),
('31', 'Capital', 'رأس المال', 'equity', false),
('32', 'Retained Earnings', 'الأرباح المحتجزة', 'equity', false),
('4', 'Revenue', 'الإيرادات', 'revenue', true),
('41', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', false),
('42', 'Service Revenue', 'إيرادات الخدمات', 'revenue', false),
('43', 'Other Revenue', 'إيرادات أخرى', 'revenue', false),
('5', 'Expenses', 'المصروفات', 'expense', true),
('51', 'Operating Expenses', 'مصروفات التشغيل', 'expense', true),
('511', 'Salaries', 'الرواتب', 'expense', false),
('512', 'Rent', 'الإيجار', 'expense', false),
('513', 'Utilities', 'المرافق', 'expense', false),
('514', 'Supplies', 'المستلزمات', 'expense', false),
('52', 'Administrative Expenses', 'المصروفات الإدارية', 'expense', true),
('521', 'Office Supplies', 'مستلزمات المكتب', 'expense', false),
('522', 'Communication', 'الاتصالات', 'expense', false);

-- Update parent_id references
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '1') WHERE code IN ('11', '12');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '11') WHERE code IN ('111', '112', '113', '114');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '12') WHERE code IN ('121', '122');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '2') WHERE code = '21';
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '21') WHERE code IN ('211', '212');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '3') WHERE code IN ('31', '32');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '4') WHERE code IN ('41', '42', '43');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '5') WHERE code IN ('51', '52');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '51') WHERE code IN ('511', '512', '513', '514');
UPDATE public.chart_of_accounts SET parent_id = (SELECT id FROM public.chart_of_accounts WHERE code = '52') WHERE code IN ('521', '522');
