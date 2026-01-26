-- Create module_settings table to store all module configurations
CREATE TABLE IF NOT EXISTS public.module_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_name TEXT NOT NULL UNIQUE,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read settings
CREATE POLICY "Allow authenticated users to read module settings"
  ON public.module_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to update/insert settings
CREATE POLICY "Allow authenticated users to manage module settings"
  ON public.module_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default POS settings
INSERT INTO public.module_settings (module_name, settings)
VALUES (
  'pos',
  '{"enableQuickSale": true, "requireCustomer": false, "printReceiptAutomatically": true, "allowNegativeStock": false, "requireShiftOpen": true, "defaultPaymentMethod": "cash", "enableDiscount": true, "maxDiscountPercent": 20, "enableHoldOrders": true, "enableReturns": true, "returnPeriodDays": 14, "showLowStockWarning": true, "enableDelivery": true}'
)
ON CONFLICT (module_name) DO NOTHING;

-- Insert default Inventory settings
INSERT INTO public.module_settings (module_name, settings)
VALUES (
  'inventory',
  '{"enableBarcodes": true, "autoGenerateSKU": true, "skuPrefix": "PRD", "enableVariants": true, "defaultMinStock": 5, "lowStockAlertEnabled": true, "enableMultipleWarehouses": true}'
)
ON CONFLICT (module_name) DO NOTHING;