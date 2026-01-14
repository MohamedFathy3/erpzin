-- Add country and calendar_system columns to company_settings
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'YE',
ADD COLUMN IF NOT EXISTS calendar_system TEXT DEFAULT 'gregorian';