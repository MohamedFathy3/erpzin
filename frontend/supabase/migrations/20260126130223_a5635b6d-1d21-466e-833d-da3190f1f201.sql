-- Create a test product with variants
INSERT INTO public.products (
  id,
  name,
  name_ar,
  sku,
  barcode,
  price,
  cost,
  stock,
  category_id,
  has_variants,
  is_active
) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Test T-Shirt',
  'تيشيرت تجريبي',
  'TSH-001',
  '1234567890123',
  150,
  80,
  0,
  'e14d0938-c669-44cb-89ab-94f9d0b89941',
  true,
  true
) ON CONFLICT (id) DO UPDATE SET has_variants = true;

-- Create variants for the product (3 sizes x 3 colors = 9 variants)
INSERT INTO public.product_variants (product_id, size_id, color_id, sku, barcode, stock, price_adjustment, cost_adjustment, is_active)
VALUES
  -- Size 35
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '0aa50bbb-dfe0-4741-a4d8-34316350d272', 'bbddac9c-0a99-4c51-9ee5-07b45648cc83', 'TSH-001-35-BLK', '1234567890101', 10, 0, 0, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '0aa50bbb-dfe0-4741-a4d8-34316350d272', 'c8f6a531-653b-42d6-b132-93fbc63be90f', 'TSH-001-35-WHT', '1234567890102', 5, 0, 0, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '0aa50bbb-dfe0-4741-a4d8-34316350d272', 'c6baacc9-c6db-499d-b973-634329b949c0', 'TSH-001-35-RED', '1234567890103', 0, 0, 0, true),
  -- Size 46
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'dbbd74aa-88c8-4789-acf0-b0984dfd4547', 'bbddac9c-0a99-4c51-9ee5-07b45648cc83', 'TSH-001-46-BLK', '1234567890201', 8, 10, 5, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'dbbd74aa-88c8-4789-acf0-b0984dfd4547', 'c8f6a531-653b-42d6-b132-93fbc63be90f', 'TSH-001-46-WHT', '1234567890202', 3, 10, 5, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'dbbd74aa-88c8-4789-acf0-b0984dfd4547', '069d6ba3-686a-4cc2-92d6-c352825b93ff', 'TSH-001-46-BLU', '1234567890203', 0, 10, 5, true),
  -- Size 3XL
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '83639a27-05de-47da-9579-945891c0c0a5', 'bbddac9c-0a99-4c51-9ee5-07b45648cc83', 'TSH-001-3XL-BLK', '1234567890301', 12, 20, 10, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '83639a27-05de-47da-9579-945891c0c0a5', 'f873b9ed-b1d9-4dcd-a0c9-0b0fe9b1f0ae', 'TSH-001-3XL-NAV', '1234567890302', 2, 20, 10, true),
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '83639a27-05de-47da-9579-945891c0c0a5', 'c6baacc9-c6db-499d-b973-634329b949c0', 'TSH-001-3XL-RED', '1234567890303', 0, 20, 10, true)
ON CONFLICT (sku) DO NOTHING;