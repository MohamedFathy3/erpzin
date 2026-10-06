-- =====================================================
-- SECURITY FIX: Require authentication for all data access
-- =====================================================

-- Drop all existing permissive public SELECT policies and replace with authenticated access
-- Then drop all unrestricted write policies and replace with authenticated access

-- =====================================================
-- 1. FIX PUBLIC_DATA_EXPOSURE - Convert public SELECT to authenticated
-- =====================================================

-- attendance
DROP POLICY IF EXISTS "Public read access" ON attendance;
CREATE POLICY "Authenticated read access" ON attendance FOR SELECT USING (auth.uid() IS NOT NULL);

-- bank_transactions
DROP POLICY IF EXISTS "Public read access" ON bank_transactions;
CREATE POLICY "Authenticated read access" ON bank_transactions FOR SELECT USING (auth.uid() IS NOT NULL);

-- banks
DROP POLICY IF EXISTS "Public read access" ON banks;
CREATE POLICY "Authenticated read access" ON banks FOR SELECT USING (auth.uid() IS NOT NULL);

-- branch_warehouses
DROP POLICY IF EXISTS "Public read access" ON branch_warehouses;
CREATE POLICY "Authenticated read access" ON branch_warehouses FOR SELECT USING (auth.uid() IS NOT NULL);

-- branches
DROP POLICY IF EXISTS "Public read access" ON branches;
CREATE POLICY "Authenticated read access" ON branches FOR SELECT USING (auth.uid() IS NOT NULL);

-- categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Authenticated read access" ON categories FOR SELECT USING (auth.uid() IS NOT NULL);

-- chart_of_accounts
DROP POLICY IF EXISTS "Public read access" ON chart_of_accounts;
CREATE POLICY "Authenticated read access" ON chart_of_accounts FOR SELECT USING (auth.uid() IS NOT NULL);

-- colors
DROP POLICY IF EXISTS "Colors are viewable by everyone" ON colors;
CREATE POLICY "Authenticated read access" ON colors FOR SELECT USING (auth.uid() IS NOT NULL);

-- company_settings
DROP POLICY IF EXISTS "Public read access" ON company_settings;
CREATE POLICY "Authenticated read access" ON company_settings FOR SELECT USING (auth.uid() IS NOT NULL);

-- coupons
DROP POLICY IF EXISTS "Anyone can view active coupons" ON coupons;
CREATE POLICY "Authenticated read access" ON coupons FOR SELECT USING (auth.uid() IS NOT NULL);

-- coupon_usage
DROP POLICY IF EXISTS "Anyone can view coupon usage" ON coupon_usage;
CREATE POLICY "Authenticated read access" ON coupon_usage FOR SELECT USING (auth.uid() IS NOT NULL);

-- custom_roles
DROP POLICY IF EXISTS "Anyone can read custom roles" ON custom_roles;
CREATE POLICY "Authenticated read access" ON custom_roles FOR SELECT USING (auth.uid() IS NOT NULL);

-- customers
DROP POLICY IF EXISTS "Public read access" ON customers;
CREATE POLICY "Authenticated read access" ON customers FOR SELECT USING (auth.uid() IS NOT NULL);

-- delivery_persons
DROP POLICY IF EXISTS "Delivery persons are viewable by everyone" ON delivery_persons;
CREATE POLICY "Authenticated read access" ON delivery_persons FOR SELECT USING (auth.uid() IS NOT NULL);

-- employees
DROP POLICY IF EXISTS "Public read access" ON employees;
CREATE POLICY "Authenticated read access" ON employees FOR SELECT USING (auth.uid() IS NOT NULL);

-- expenses
DROP POLICY IF EXISTS "Public read access" ON expenses;
CREATE POLICY "Authenticated read access" ON expenses FOR SELECT USING (auth.uid() IS NOT NULL);

-- inventory_count_items
DROP POLICY IF EXISTS "Public read access" ON inventory_count_items;
CREATE POLICY "Authenticated read access" ON inventory_count_items FOR SELECT USING (auth.uid() IS NOT NULL);

-- inventory_counts
DROP POLICY IF EXISTS "Public read access" ON inventory_counts;
CREATE POLICY "Authenticated read access" ON inventory_counts FOR SELECT USING (auth.uid() IS NOT NULL);

-- inventory_movements
DROP POLICY IF EXISTS "Public read access" ON inventory_movements;
CREATE POLICY "Authenticated read access" ON inventory_movements FOR SELECT USING (auth.uid() IS NOT NULL);

-- low_stock_alerts
DROP POLICY IF EXISTS "Public read access" ON low_stock_alerts;
CREATE POLICY "Authenticated read access" ON low_stock_alerts FOR SELECT USING (auth.uid() IS NOT NULL);

-- opening_balances
DROP POLICY IF EXISTS "Public read access" ON opening_balances;
CREATE POLICY "Authenticated read access" ON opening_balances FOR SELECT USING (auth.uid() IS NOT NULL);

-- payment_methods
DROP POLICY IF EXISTS "Payment methods are viewable by everyone" ON payment_methods;
CREATE POLICY "Authenticated read access" ON payment_methods FOR SELECT USING (auth.uid() IS NOT NULL);

-- permissions
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permissions;
CREATE POLICY "Authenticated read access" ON permissions FOR SELECT USING (auth.uid() IS NOT NULL);

-- product_imports
DROP POLICY IF EXISTS "Public read access" ON product_imports;
CREATE POLICY "Authenticated read access" ON product_imports FOR SELECT USING (auth.uid() IS NOT NULL);

-- product_variants
DROP POLICY IF EXISTS "Product variants are viewable by everyone" ON product_variants;
CREATE POLICY "Authenticated read access" ON product_variants FOR SELECT USING (auth.uid() IS NOT NULL);

-- products
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Authenticated read access" ON products FOR SELECT USING (auth.uid() IS NOT NULL);

-- promotions
DROP POLICY IF EXISTS "Promotions are viewable by everyone" ON promotions;
CREATE POLICY "Authenticated read access" ON promotions FOR SELECT USING (auth.uid() IS NOT NULL);

-- promotion_products
DROP POLICY IF EXISTS "Promotion products are viewable by everyone" ON promotion_products;
CREATE POLICY "Authenticated read access" ON promotion_products FOR SELECT USING (auth.uid() IS NOT NULL);

-- purchase_invoices
DROP POLICY IF EXISTS "Purchase invoices are viewable by everyone" ON purchase_invoices;
CREATE POLICY "Authenticated read access" ON purchase_invoices FOR SELECT USING (auth.uid() IS NOT NULL);

-- purchase_invoice_items
DROP POLICY IF EXISTS "Purchase invoice items are viewable by everyone" ON purchase_invoice_items;
CREATE POLICY "Authenticated read access" ON purchase_invoice_items FOR SELECT USING (auth.uid() IS NOT NULL);

-- purchase_orders
DROP POLICY IF EXISTS "Public read access" ON purchase_orders;
CREATE POLICY "Authenticated read access" ON purchase_orders FOR SELECT USING (auth.uid() IS NOT NULL);

-- purchase_order_items
DROP POLICY IF EXISTS "Public read access" ON purchase_order_items;
CREATE POLICY "Authenticated read access" ON purchase_order_items FOR SELECT USING (auth.uid() IS NOT NULL);

-- revenues
DROP POLICY IF EXISTS "Public read access" ON revenues;
CREATE POLICY "Authenticated read access" ON revenues FOR SELECT USING (auth.uid() IS NOT NULL);

-- role_permissions
DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON role_permissions;
CREATE POLICY "Authenticated read access" ON role_permissions FOR SELECT USING (auth.uid() IS NOT NULL);

-- sales
DROP POLICY IF EXISTS "Public read access" ON sales;
CREATE POLICY "Authenticated read access" ON sales FOR SELECT USING (auth.uid() IS NOT NULL);

-- sale_items
DROP POLICY IF EXISTS "Public read access" ON sale_items;
CREATE POLICY "Authenticated read access" ON sale_items FOR SELECT USING (auth.uid() IS NOT NULL);

-- sizes
DROP POLICY IF EXISTS "Sizes are viewable by everyone" ON sizes;
CREATE POLICY "Authenticated read access" ON sizes FOR SELECT USING (auth.uid() IS NOT NULL);

-- stock_transfers
DROP POLICY IF EXISTS "Public read access" ON stock_transfers;
CREATE POLICY "Authenticated read access" ON stock_transfers FOR SELECT USING (auth.uid() IS NOT NULL);

-- stock_transfer_items
DROP POLICY IF EXISTS "Public read access" ON stock_transfer_items;
CREATE POLICY "Authenticated read access" ON stock_transfer_items FOR SELECT USING (auth.uid() IS NOT NULL);

-- supplier_payments
DROP POLICY IF EXISTS "Supplier payments are viewable by everyone" ON supplier_payments;
CREATE POLICY "Authenticated read access" ON supplier_payments FOR SELECT USING (auth.uid() IS NOT NULL);

-- supplier_transactions
DROP POLICY IF EXISTS "Supplier transactions are viewable by everyone" ON supplier_transactions;
CREATE POLICY "Authenticated read access" ON supplier_transactions FOR SELECT USING (auth.uid() IS NOT NULL);

-- suppliers
DROP POLICY IF EXISTS "Public read access" ON suppliers;
CREATE POLICY "Authenticated read access" ON suppliers FOR SELECT USING (auth.uid() IS NOT NULL);

-- tax_rates
DROP POLICY IF EXISTS "Public read access" ON tax_rates;
CREATE POLICY "Authenticated read access" ON tax_rates FOR SELECT USING (auth.uid() IS NOT NULL);

-- treasuries
DROP POLICY IF EXISTS "Public read access" ON treasuries;
CREATE POLICY "Authenticated read access" ON treasuries FOR SELECT USING (auth.uid() IS NOT NULL);

-- treasury_transactions
DROP POLICY IF EXISTS "Public read access" ON treasury_transactions;
CREATE POLICY "Authenticated read access" ON treasury_transactions FOR SELECT USING (auth.uid() IS NOT NULL);

-- warehouse_stock
DROP POLICY IF EXISTS "Public read access" ON warehouse_stock;
CREATE POLICY "Authenticated read access" ON warehouse_stock FOR SELECT USING (auth.uid() IS NOT NULL);

-- warehouses
DROP POLICY IF EXISTS "Public read access" ON warehouses;
CREATE POLICY "Authenticated read access" ON warehouses FOR SELECT USING (auth.uid() IS NOT NULL);

-- profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Authenticated read access" ON profiles FOR SELECT USING (auth.uid() IS NOT NULL);

-- =====================================================
-- 2. FIX MISSING_RLS - Replace unrestricted write access with authenticated
-- =====================================================

-- salesmen - replace unrestricted policy
DROP POLICY IF EXISTS "Allow all access to salesmen" ON salesmen;
CREATE POLICY "Authenticated users can manage salesmen" ON salesmen FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- sales_invoices - replace unrestricted policy
DROP POLICY IF EXISTS "Allow all access to sales_invoices" ON sales_invoices;
CREATE POLICY "Authenticated users can manage sales_invoices" ON sales_invoices FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- sales_invoice_items - replace unrestricted policy
DROP POLICY IF EXISTS "Allow all access to sales_invoice_items" ON sales_invoice_items;
CREATE POLICY "Authenticated users can manage sales_invoice_items" ON sales_invoice_items FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- sales_returns - replace unrestricted policy
DROP POLICY IF EXISTS "Allow all access to sales_returns" ON sales_returns;
CREATE POLICY "Authenticated users can manage sales_returns" ON sales_returns FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- sales_return_items - replace unrestricted policy
DROP POLICY IF EXISTS "Allow all access to sales_return_items" ON sales_return_items;
CREATE POLICY "Authenticated users can manage sales_return_items" ON sales_return_items FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- purchase_returns - replace unrestricted policy
DROP POLICY IF EXISTS "Allow all operations on purchase_returns" ON purchase_returns;
CREATE POLICY "Authenticated users can manage purchase_returns" ON purchase_returns FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- purchase_return_items - replace unrestricted policy
DROP POLICY IF EXISTS "Allow all operations on purchase_return_items" ON purchase_return_items;
CREATE POLICY "Authenticated users can manage purchase_return_items" ON purchase_return_items FOR ALL 
  USING (auth.uid() IS NOT NULL) 
  WITH CHECK (auth.uid() IS NOT NULL);

-- coupon_usage - replace unrestricted INSERT policy with authenticated + validation
DROP POLICY IF EXISTS "Anyone can create coupon usage" ON coupon_usage;
CREATE POLICY "Authenticated users can create coupon usage" ON coupon_usage FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (SELECT 1 FROM coupons WHERE id = coupon_id AND is_active = true)
  );