-- Create function to sync product stock with sum of variants
CREATE OR REPLACE FUNCTION public.sync_product_stock_from_variants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_variant_stock INTEGER;
BEGIN
  -- Calculate total stock from all active variants
  SELECT COALESCE(SUM(stock), 0) INTO total_variant_stock
  FROM public.product_variants
  WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
    AND is_active = true;
  
  -- Update the main product stock
  UPDATE public.products
  SET stock = total_variant_stock,
      updated_at = now()
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Create trigger to sync product stock when variant stock changes
DROP TRIGGER IF EXISTS sync_product_stock_on_variant_change ON public.product_variants;
CREATE TRIGGER sync_product_stock_on_variant_change
AFTER INSERT OR UPDATE OF stock, is_active OR DELETE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_stock_from_variants();

-- Run initial sync for all products with variants
UPDATE public.products p
SET stock = (
  SELECT COALESCE(SUM(pv.stock), 0)
  FROM public.product_variants pv
  WHERE pv.product_id = p.id AND pv.is_active = true
),
updated_at = now()
WHERE has_variants = true;