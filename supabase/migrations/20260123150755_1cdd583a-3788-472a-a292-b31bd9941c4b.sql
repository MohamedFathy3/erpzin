-- Create journal entries table (القيود المحاسبية)
CREATE TABLE public.journal_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  description_ar TEXT,
  reference_type TEXT, -- 'sales_invoice', 'purchase_invoice', 'expense', 'revenue', 'manual', etc.
  reference_id UUID,
  total_debit NUMERIC NOT NULL DEFAULT 0,
  total_credit NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'posted', 'cancelled'
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  branch_id UUID,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create journal entry lines table (بنود القيد)
CREATE TABLE public.journal_entry_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  debit_amount NUMERIC NOT NULL DEFAULT 0,
  credit_amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  cost_center TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

-- Create policies for journal_entries
CREATE POLICY "Authenticated read access" ON public.journal_entries
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated write access" ON public.journal_entries
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Create policies for journal_entry_lines
CREATE POLICY "Authenticated read access" ON public.journal_entry_lines
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated write access" ON public.journal_entry_lines
  FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Create indexes for better performance
CREATE INDEX idx_journal_entries_date ON public.journal_entries(entry_date);
CREATE INDEX idx_journal_entries_status ON public.journal_entries(status);
CREATE INDEX idx_journal_entries_reference ON public.journal_entries(reference_type, reference_id);
CREATE INDEX idx_journal_entry_lines_account ON public.journal_entry_lines(account_id);
CREATE INDEX idx_journal_entry_lines_entry ON public.journal_entry_lines(journal_entry_id);

-- Function to generate journal entry number
CREATE OR REPLACE FUNCTION public.generate_journal_entry_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  current_year TEXT;
  next_seq INTEGER;
BEGIN
  current_year := to_char(CURRENT_DATE, 'YYYY');
  
  SELECT COALESCE(MAX(CAST(SUBSTRING(entry_number FROM 'JE-' || current_year || '-(\d+)') AS INTEGER)), 0) + 1
  INTO next_seq
  FROM public.journal_entries
  WHERE entry_number LIKE 'JE-' || current_year || '-%';
  
  new_number := 'JE-' || current_year || '-' || LPAD(next_seq::TEXT, 6, '0');
  RETURN new_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to update account balances when journal entry is posted
CREATE OR REPLACE FUNCTION public.update_account_balances()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status != 'posted') THEN
    -- Update balances for all accounts in this entry
    UPDATE public.chart_of_accounts coa
    SET balance = balance + (
      SELECT COALESCE(SUM(
        CASE 
          WHEN coa.account_type IN ('asset', 'expense') THEN jel.debit_amount - jel.credit_amount
          ELSE jel.credit_amount - jel.debit_amount
        END
      ), 0)
      FROM public.journal_entry_lines jel
      WHERE jel.journal_entry_id = NEW.id AND jel.account_id = coa.id
    ),
    updated_at = now()
    WHERE coa.id IN (
      SELECT account_id FROM public.journal_entry_lines WHERE journal_entry_id = NEW.id
    );
  END IF;
  
  IF NEW.status = 'cancelled' AND OLD.status = 'posted' THEN
    -- Reverse the balances
    UPDATE public.chart_of_accounts coa
    SET balance = balance - (
      SELECT COALESCE(SUM(
        CASE 
          WHEN coa.account_type IN ('asset', 'expense') THEN jel.debit_amount - jel.credit_amount
          ELSE jel.credit_amount - jel.debit_amount
        END
      ), 0)
      FROM public.journal_entry_lines jel
      WHERE jel.journal_entry_id = NEW.id AND jel.account_id = coa.id
    ),
    updated_at = now()
    WHERE coa.id IN (
      SELECT account_id FROM public.journal_entry_lines WHERE journal_entry_id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for updating account balances
CREATE TRIGGER trigger_update_account_balances
  AFTER UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_account_balances();