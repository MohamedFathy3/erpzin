-- Update a product to have variants
UPDATE products 
SET has_variants = true 
WHERE id = '10c54555-3aa8-412c-bc08-35dee757cd71';

-- Insert product variants for this product (Classic White T-Shirt)
INSERT INTO product_variants (product_id, size_id, color_id, sku, stock, price_adjustment, cost_adjustment)
SELECT 
  '10c54555-3aa8-412c-bc08-35dee757cd71' as product_id,
  s.id as size_id,
  c.id as color_id,
  'CWT-' || s.code || '-' || c.code as sku,
  FLOOR(RANDOM() * 50 + 5)::int as stock,
  0 as price_adjustment,
  0 as cost_adjustment
FROM sizes s
CROSS JOIN colors c
WHERE s.is_active = true AND c.is_active = true
LIMIT 12;