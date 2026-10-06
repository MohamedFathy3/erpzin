-- Create sample sales invoices
INSERT INTO sales_invoices (
  invoice_number, invoice_type, customer_id, branch_id, warehouse_id,
  subtotal, discount_amount, discount_percent, tax_amount, tax_percent,
  total_amount, paid_amount, remaining_amount, payment_status, payment_method,
  invoice_date, status
) VALUES 
(
  'SI-20260110-0001', 'standard', 'cd15c007-da82-4d4f-a2a0-5f22dea9b4ba', 
  '34f795cf-4d20-46ae-a0d9-93b152a935fd', 'f410b1ab-361e-4597-8741-a69cbbfac5d3',
  1200, 0, 0, 180, 15, 1380, 1380, 0, 'paid', 'cash',
  '2026-01-10', 'active'
),
(
  'SI-20260111-0001', 'standard', 'c298fd21-d875-46c3-b91a-a7d0e5a3f538',
  '34f795cf-4d20-46ae-a0d9-93b152a935fd', 'f410b1ab-361e-4597-8741-a69cbbfac5d3',
  2500, 125, 5, 356.25, 15, 2731.25, 1000, 1731.25, 'partial', 'credit',
  '2026-01-11', 'active'
),
(
  'SI-20260112-0001', 'standard', '17ca7ecb-a164-4137-bfcd-38992719187e',
  '34f795cf-4d20-46ae-a0d9-93b152a935fd', 'f410b1ab-361e-4597-8741-a69cbbfac5d3',
  850, 0, 0, 127.5, 15, 977.5, 0, 977.5, 'pending', 'credit',
  '2026-01-12', 'active'
),
(
  'SI-20260113-0001', 'standard', 'cd15c007-da82-4d4f-a2a0-5f22dea9b4ba',
  '34f795cf-4d20-46ae-a0d9-93b152a935fd', 'f410b1ab-361e-4597-8741-a69cbbfac5d3',
  3200, 160, 5, 456, 15, 3496, 3496, 0, 'paid', 'card',
  '2026-01-13', 'active'
);

-- Get the invoice IDs for items
DO $$
DECLARE
  inv1_id UUID;
  inv2_id UUID;
  inv3_id UUID;
  inv4_id UUID;
BEGIN
  SELECT id INTO inv1_id FROM sales_invoices WHERE invoice_number = 'SI-20260110-0001';
  SELECT id INTO inv2_id FROM sales_invoices WHERE invoice_number = 'SI-20260111-0001';
  SELECT id INTO inv3_id FROM sales_invoices WHERE invoice_number = 'SI-20260112-0001';
  SELECT id INTO inv4_id FROM sales_invoices WHERE invoice_number = 'SI-20260113-0001';

  -- Invoice 1 items
  INSERT INTO sales_invoice_items (invoice_id, product_id, product_name, sku, quantity, unit_price, total_price)
  VALUES 
    (inv1_id, '7304e1a8-2e68-49ab-85f9-932cb44ed51b', 'Black Cotton T-Shirt', 'MTS-002', 5, 85, 425),
    (inv1_id, '132ec529-dcf5-4969-8846-70216732339e', 'Navy Blue Polo', 'MTS-003', 3, 120, 360),
    (inv1_id, 'cbf04445-8ddf-4aab-b55d-f17dd5ea7ba4', 'Slim Fit Jeans Blue', 'MPT-001', 2, 199, 398);

  -- Invoice 2 items
  INSERT INTO sales_invoice_items (invoice_id, product_id, product_name, sku, quantity, unit_price, total_price)
  VALUES 
    (inv2_id, '8b133674-9420-4fda-8e40-c3326d91202c', 'Leather Jacket Black', 'MJK-001', 2, 650, 1300),
    (inv2_id, 'dfad87b9-5028-427c-9c93-9b1a60c80ad2', 'Floral Summer Dress', 'WDR-001', 3, 320, 960);

  -- Invoice 3 items
  INSERT INTO sales_invoice_items (invoice_id, product_id, product_name, sku, quantity, unit_price, total_price)
  VALUES 
    (inv3_id, '6e15037a-26fd-4ca0-adda-f6f65f3851a3', 'Striped Casual Shirt', 'MTS-004', 4, 145, 580),
    (inv3_id, '47f64f92-6b61-4534-8708-702b5f85ed00', 'Denim Jacket Blue', 'MJK-002', 1, 280, 280);

  -- Invoice 4 items
  INSERT INTO sales_invoice_items (invoice_id, product_id, product_name, sku, quantity, unit_price, total_price)
  VALUES 
    (inv4_id, 'dbbb5ee3-ccce-45e6-aadc-dd339b89f06b', 'Black Evening Dress', 'WDR-002', 3, 550, 1650),
    (inv4_id, '83e06609-65f4-4815-87da-20483bc71291', 'Winter Puffer Jacket', 'MJK-003', 2, 450, 900),
    (inv4_id, 'dea63e71-3bce-475f-8023-9ed424c2c15d', 'Khaki Chinos', 'MPT-003', 3, 180, 540);
END $$;

-- Create sample purchase invoices
INSERT INTO purchase_invoices (
  invoice_number, supplier_id, branch_id, warehouse_id,
  subtotal, discount_amount, tax_amount, total_amount,
  paid_amount, remaining_amount, payment_status, payment_method,
  invoice_date
) VALUES 
(
  'PI-20260108-0001', 'b25b4324-0183-43e8-9dbc-2035911c38cb',
  '34f795cf-4d20-46ae-a0d9-93b152a935fd', 'f410b1ab-361e-4597-8741-a69cbbfac5d3',
  5000, 0, 750, 5750, 5750, 0, 'paid', 'cash',
  '2026-01-08'
),
(
  'PI-20260109-0001', 'bbafd1de-6ed4-4a2f-9b56-b826caab97d7',
  '34f795cf-4d20-46ae-a0d9-93b152a935fd', 'f410b1ab-361e-4597-8741-a69cbbfac5d3',
  8000, 400, 1140, 8740, 4000, 4740, 'partial', 'credit',
  '2026-01-09'
),
(
  'PI-20260112-0001', 'e150fd5a-d838-4da2-8aa7-f421162e44c7',
  '34f795cf-4d20-46ae-a0d9-93b152a935fd', 'f410b1ab-361e-4597-8741-a69cbbfac5d3',
  3500, 0, 525, 4025, 0, 4025, 'unpaid', 'credit',
  '2026-01-12'
);

-- Get purchase invoice IDs and add items
DO $$
DECLARE
  pinv1_id UUID;
  pinv2_id UUID;
  pinv3_id UUID;
BEGIN
  SELECT id INTO pinv1_id FROM purchase_invoices WHERE invoice_number = 'PI-20260108-0001';
  SELECT id INTO pinv2_id FROM purchase_invoices WHERE invoice_number = 'PI-20260109-0001';
  SELECT id INTO pinv3_id FROM purchase_invoices WHERE invoice_number = 'PI-20260112-0001';

  -- Purchase Invoice 1 items
  INSERT INTO purchase_invoice_items (invoice_id, product_id, quantity, unit_cost, total_cost)
  VALUES 
    (pinv1_id, '7304e1a8-2e68-49ab-85f9-932cb44ed51b', 50, 38, 1900),
    (pinv1_id, '132ec529-dcf5-4969-8846-70216732339e', 30, 55, 1650),
    (pinv1_id, '6e15037a-26fd-4ca0-adda-f6f65f3851a3', 20, 65, 1300);

  -- Purchase Invoice 2 items
  INSERT INTO purchase_invoice_items (invoice_id, product_id, quantity, unit_cost, total_cost)
  VALUES 
    (pinv2_id, '8b133674-9420-4fda-8e40-c3326d91202c', 15, 300, 4500),
    (pinv2_id, '47f64f92-6b61-4534-8708-702b5f85ed00', 25, 130, 3250);

  -- Purchase Invoice 3 items
  INSERT INTO purchase_invoice_items (invoice_id, product_id, quantity, unit_cost, total_cost)
  VALUES 
    (pinv3_id, 'dfad87b9-5028-427c-9c93-9b1a60c80ad2', 15, 140, 2100),
    (pinv3_id, 'dbbb5ee3-ccce-45e6-aadc-dd339b89f06b', 5, 250, 1250);
END $$;

-- Create sample sales returns
INSERT INTO sales_returns (
  return_number, original_invoice_number, invoice_type, customer_id,
  subtotal, tax_amount, total_amount, refund_method, reason, status, return_date
) VALUES 
(
  'SR-20260114-0001', 'SI-20260110-0001', 'standard', 'cd15c007-da82-4d4f-a2a0-5f22dea9b4ba',
  170, 25.5, 195.5, 'cash', 'عيب في المنتج', 'completed', '2026-01-14'
);

-- Add return items
DO $$
DECLARE
  ret1_id UUID;
BEGIN
  SELECT id INTO ret1_id FROM sales_returns WHERE return_number = 'SR-20260114-0001';

  INSERT INTO sales_return_items (return_id, product_id, product_name, quantity, unit_price, total_price, reason)
  VALUES 
    (ret1_id, '7304e1a8-2e68-49ab-85f9-932cb44ed51b', 'Black Cotton T-Shirt', 2, 85, 170, 'عيب في المنتج');
END $$;

-- Create sample purchase returns
INSERT INTO purchase_returns (
  return_number, original_invoice_number, supplier_id, branch_id, warehouse_id,
  subtotal, tax_amount, total_amount, refund_method, reason, status, return_date
) VALUES 
(
  'PR-20260114-0001', 'PI-20260108-0001', 'b25b4324-0183-43e8-9dbc-2035911c38cb',
  '34f795cf-4d20-46ae-a0d9-93b152a935fd', 'f410b1ab-361e-4597-8741-a69cbbfac5d3',
  380, 57, 437, 'credit', 'منتجات تالفة', 'completed', '2026-01-14'
);

-- Add purchase return items
DO $$
DECLARE
  pret1_id UUID;
BEGIN
  SELECT id INTO pret1_id FROM purchase_returns WHERE return_number = 'PR-20260114-0001';

  INSERT INTO purchase_return_items (return_id, product_id, product_name, quantity, unit_cost, total_cost, reason)
  VALUES 
    (pret1_id, '7304e1a8-2e68-49ab-85f9-932cb44ed51b', 'Black Cotton T-Shirt', 10, 38, 380, 'منتجات تالفة');
END $$;