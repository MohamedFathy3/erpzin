-- Add logo_icon_url for collapsed sidebar and phones array for multiple phone numbers
ALTER TABLE public.company_settings 
ADD COLUMN IF NOT EXISTS logo_icon_url TEXT,
ADD COLUMN IF NOT EXISTS phones TEXT[] DEFAULT '{}';