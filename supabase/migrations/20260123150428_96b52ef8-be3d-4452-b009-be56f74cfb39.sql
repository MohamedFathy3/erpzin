-- First, clear existing chart of accounts to start fresh
DELETE FROM chart_of_accounts;

-- Insert comprehensive chart of accounts for ERP system
-- 1. Assets (الأصول)
INSERT INTO chart_of_accounts (code, name, name_ar, account_type, is_header, is_active, balance) VALUES
('1', 'Assets', 'الأصول', 'asset', true, true, 0),
('11', 'Current Assets', 'الأصول المتداولة', 'asset', true, true, 0),
('111', 'Cash and Banks', 'النقدية والبنوك', 'asset', true, true, 0),
('1111', 'Main Cash', 'الصندوق الرئيسي', 'asset', false, true, 0),
('1112', 'POS Cash', 'صندوق نقطة البيع', 'asset', false, true, 0),
('1113', 'Bank Accounts', 'الحسابات البنكية', 'asset', true, true, 0),
('11131', 'Local Bank Account', 'الحساب البنكي المحلي', 'asset', false, true, 0),
('11132', 'Foreign Currency Account', 'حساب العملة الأجنبية', 'asset', false, true, 0),
('1114', 'Electronic Wallets', 'المحافظ الإلكترونية', 'asset', false, true, 0),
('112', 'Receivables', 'المدينون', 'asset', true, true, 0),
('1121', 'Customer Receivables', 'ذمم العملاء', 'asset', false, true, 0),
('1122', 'Employee Advances', 'سلف الموظفين', 'asset', false, true, 0),
('1123', 'Notes Receivable', 'أوراق قبض', 'asset', false, true, 0),
('113', 'Inventory', 'المخزون', 'asset', true, true, 0),
('1131', 'Goods Inventory', 'مخزون البضائع', 'asset', false, true, 0),
('1132', 'Raw Materials', 'المواد الخام', 'asset', false, true, 0),
('1133', 'Consumables', 'المستهلكات', 'asset', false, true, 0),
('114', 'Prepaid Expenses', 'المصروفات المدفوعة مقدماً', 'asset', true, true, 0),
('1141', 'Prepaid Rent', 'إيجار مدفوع مقدماً', 'asset', false, true, 0),
('1142', 'Prepaid Insurance', 'تأمين مدفوع مقدماً', 'asset', false, true, 0),
('12', 'Fixed Assets', 'الأصول الثابتة', 'asset', true, true, 0),
('121', 'Property and Buildings', 'العقارات والمباني', 'asset', false, true, 0),
('122', 'Vehicles', 'السيارات', 'asset', false, true, 0),
('123', 'Furniture and Equipment', 'الأثاث والمعدات', 'asset', false, true, 0),
('124', 'Computer Equipment', 'أجهزة الحاسوب', 'asset', false, true, 0),
('125', 'Accumulated Depreciation', 'مجمع الإهلاك', 'asset', false, true, 0);

-- Update parent_id relationships for Assets
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '1') WHERE code IN ('11', '12');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '11') WHERE code IN ('111', '112', '113', '114');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '111') WHERE code IN ('1111', '1112', '1113', '1114');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '1113') WHERE code IN ('11131', '11132');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '112') WHERE code IN ('1121', '1122', '1123');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '113') WHERE code IN ('1131', '1132', '1133');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '114') WHERE code IN ('1141', '1142');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '12') WHERE code IN ('121', '122', '123', '124', '125');

-- 2. Liabilities (الالتزامات)
INSERT INTO chart_of_accounts (code, name, name_ar, account_type, is_header, is_active, balance) VALUES
('2', 'Liabilities', 'الالتزامات', 'liability', true, true, 0),
('21', 'Current Liabilities', 'الالتزامات المتداولة', 'liability', true, true, 0),
('211', 'Payables', 'الدائنون', 'liability', true, true, 0),
('2111', 'Supplier Payables', 'ذمم الموردين', 'liability', false, true, 0),
('2112', 'Notes Payable', 'أوراق دفع', 'liability', false, true, 0),
('212', 'Accrued Expenses', 'المصروفات المستحقة', 'liability', true, true, 0),
('2121', 'Salaries Payable', 'رواتب مستحقة', 'liability', false, true, 0),
('2122', 'Utilities Payable', 'خدمات مستحقة', 'liability', false, true, 0),
('213', 'Taxes Payable', 'الضرائب المستحقة', 'liability', true, true, 0),
('2131', 'VAT Payable', 'ضريبة القيمة المضافة', 'liability', false, true, 0),
('2132', 'Income Tax Payable', 'ضريبة الدخل', 'liability', false, true, 0),
('214', 'Customer Deposits', 'أمانات العملاء', 'liability', false, true, 0),
('22', 'Long Term Liabilities', 'الالتزامات طويلة الأجل', 'liability', true, true, 0),
('221', 'Bank Loans', 'قروض بنكية', 'liability', false, true, 0),
('222', 'End of Service Benefits', 'مكافأة نهاية الخدمة', 'liability', false, true, 0);

-- Update parent_id relationships for Liabilities
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '2') WHERE code IN ('21', '22');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '21') WHERE code IN ('211', '212', '213', '214');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '211') WHERE code IN ('2111', '2112');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '212') WHERE code IN ('2121', '2122');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '213') WHERE code IN ('2131', '2132');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '22') WHERE code IN ('221', '222');

-- 3. Equity (حقوق الملكية)
INSERT INTO chart_of_accounts (code, name, name_ar, account_type, is_header, is_active, balance) VALUES
('3', 'Equity', 'حقوق الملكية', 'equity', true, true, 0),
('31', 'Capital', 'رأس المال', 'equity', false, true, 0),
('32', 'Retained Earnings', 'الأرباح المحتجزة', 'equity', false, true, 0),
('33', 'Current Year Profit/Loss', 'أرباح/خسائر العام الحالي', 'equity', false, true, 0),
('34', 'Reserves', 'الاحتياطيات', 'equity', true, true, 0),
('341', 'Legal Reserve', 'الاحتياطي القانوني', 'equity', false, true, 0),
('342', 'General Reserve', 'الاحتياطي العام', 'equity', false, true, 0);

-- Update parent_id relationships for Equity
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '3') WHERE code IN ('31', '32', '33', '34');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '34') WHERE code IN ('341', '342');

-- 4. Revenue (الإيرادات)
INSERT INTO chart_of_accounts (code, name, name_ar, account_type, is_header, is_active, balance) VALUES
('4', 'Revenue', 'الإيرادات', 'revenue', true, true, 0),
('41', 'Sales Revenue', 'إيرادات المبيعات', 'revenue', true, true, 0),
('411', 'Product Sales', 'مبيعات المنتجات', 'revenue', false, true, 0),
('412', 'Service Revenue', 'إيرادات الخدمات', 'revenue', false, true, 0),
('413', 'Sales Returns', 'مردودات المبيعات', 'revenue', false, true, 0),
('414', 'Sales Discounts', 'خصومات المبيعات', 'revenue', false, true, 0),
('42', 'Other Revenue', 'إيرادات أخرى', 'revenue', true, true, 0),
('421', 'Interest Income', 'إيرادات الفوائد', 'revenue', false, true, 0),
('422', 'Rental Income', 'إيرادات الإيجار', 'revenue', false, true, 0),
('423', 'Commission Income', 'إيرادات العمولات', 'revenue', false, true, 0),
('424', 'Miscellaneous Income', 'إيرادات متنوعة', 'revenue', false, true, 0);

-- Update parent_id relationships for Revenue
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '4') WHERE code IN ('41', '42');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '41') WHERE code IN ('411', '412', '413', '414');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '42') WHERE code IN ('421', '422', '423', '424');

-- 5. Expenses (المصروفات)
INSERT INTO chart_of_accounts (code, name, name_ar, account_type, is_header, is_active, balance) VALUES
('5', 'Expenses', 'المصروفات', 'expense', true, true, 0),
('51', 'Cost of Goods Sold', 'تكلفة البضاعة المباعة', 'expense', true, true, 0),
('511', 'Purchases', 'المشتريات', 'expense', false, true, 0),
('512', 'Purchase Returns', 'مردودات المشتريات', 'expense', false, true, 0),
('513', 'Purchase Discounts', 'خصومات المشتريات', 'expense', false, true, 0),
('514', 'Freight In', 'مصاريف الشحن', 'expense', false, true, 0),
('52', 'Operating Expenses', 'المصروفات التشغيلية', 'expense', true, true, 0),
('521', 'Salaries and Wages', 'الرواتب والأجور', 'expense', true, true, 0),
('5211', 'Employee Salaries', 'رواتب الموظفين', 'expense', false, true, 0),
('5212', 'Overtime', 'العمل الإضافي', 'expense', false, true, 0),
('5213', 'Employee Benefits', 'مزايا الموظفين', 'expense', false, true, 0),
('5214', 'Social Insurance', 'التأمينات الاجتماعية', 'expense', false, true, 0),
('522', 'Rent Expense', 'مصروف الإيجار', 'expense', false, true, 0),
('523', 'Utilities', 'المرافق', 'expense', true, true, 0),
('5231', 'Electricity', 'الكهرباء', 'expense', false, true, 0),
('5232', 'Water', 'المياه', 'expense', false, true, 0),
('5233', 'Internet and Phone', 'الإنترنت والهاتف', 'expense', false, true, 0),
('524', 'Maintenance', 'الصيانة', 'expense', false, true, 0),
('525', 'Office Supplies', 'مستلزمات مكتبية', 'expense', false, true, 0),
('526', 'Marketing and Advertising', 'التسويق والإعلان', 'expense', false, true, 0),
('527', 'Transportation', 'النقل والمواصلات', 'expense', false, true, 0),
('528', 'Insurance Expense', 'مصروف التأمين', 'expense', false, true, 0),
('529', 'Depreciation Expense', 'مصروف الإهلاك', 'expense', false, true, 0),
('53', 'Financial Expenses', 'المصروفات المالية', 'expense', true, true, 0),
('531', 'Bank Charges', 'رسوم بنكية', 'expense', false, true, 0),
('532', 'Interest Expense', 'مصروف الفوائد', 'expense', false, true, 0),
('533', 'Foreign Exchange Loss', 'خسائر فروق العملة', 'expense', false, true, 0),
('54', 'Other Expenses', 'مصروفات أخرى', 'expense', true, true, 0),
('541', 'Donations', 'تبرعات', 'expense', false, true, 0),
('542', 'Penalties and Fines', 'غرامات وجزاءات', 'expense', false, true, 0),
('543', 'Miscellaneous Expenses', 'مصروفات متنوعة', 'expense', false, true, 0);

-- Update parent_id relationships for Expenses
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '5') WHERE code IN ('51', '52', '53', '54');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '51') WHERE code IN ('511', '512', '513', '514');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '52') WHERE code IN ('521', '522', '523', '524', '525', '526', '527', '528', '529');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '521') WHERE code IN ('5211', '5212', '5213', '5214');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '523') WHERE code IN ('5231', '5232', '5233');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '53') WHERE code IN ('531', '532', '533');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '54') WHERE code IN ('541', '542', '543');