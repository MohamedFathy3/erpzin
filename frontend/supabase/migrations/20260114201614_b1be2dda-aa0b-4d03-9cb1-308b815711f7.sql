-- Create permissions table to store all available permissions
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(50) NOT NULL,
  module_ar VARCHAR(50) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete', 'export', 'import', 'approve')),
  description VARCHAR(255),
  description_ar VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(module, action)
);

-- Create role_permissions junction table
CREATE TABLE public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(role, permission_id)
);

-- Enable RLS
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permissions (read for all authenticated, write for admins)
CREATE POLICY "Authenticated users can view permissions"
ON public.permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage permissions"
ON public.permissions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for role_permissions
CREATE POLICY "Authenticated users can view role permissions"
ON public.role_permissions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage role permissions"
ON public.role_permissions FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Insert default permissions for all modules
INSERT INTO public.permissions (module, module_ar, action, description, description_ar, sort_order) VALUES
-- Dashboard
('dashboard', 'لوحة التحكم', 'view', 'View dashboard', 'عرض لوحة التحكم', 1),
-- Inventory
('inventory', 'المخزون', 'view', 'View inventory', 'عرض المخزون', 10),
('inventory', 'المخزون', 'create', 'Add products', 'إضافة منتجات', 11),
('inventory', 'المخزون', 'edit', 'Edit products', 'تعديل المنتجات', 12),
('inventory', 'المخزون', 'delete', 'Delete products', 'حذف المنتجات', 13),
('inventory', 'المخزون', 'import', 'Import products', 'استيراد المنتجات', 14),
('inventory', 'المخزون', 'export', 'Export products', 'تصدير المنتجات', 15),
-- POS
('pos', 'نقطة البيع', 'view', 'Access POS', 'الوصول لنقطة البيع', 20),
('pos', 'نقطة البيع', 'create', 'Create sales', 'إنشاء مبيعات', 21),
('pos', 'نقطة البيع', 'edit', 'Edit sales', 'تعديل المبيعات', 22),
('pos', 'نقطة البيع', 'delete', 'Cancel sales', 'إلغاء المبيعات', 23),
-- Sales
('sales', 'المبيعات', 'view', 'View sales', 'عرض المبيعات', 30),
('sales', 'المبيعات', 'create', 'Create invoices', 'إنشاء فواتير', 31),
('sales', 'المبيعات', 'edit', 'Edit invoices', 'تعديل الفواتير', 32),
('sales', 'المبيعات', 'delete', 'Delete invoices', 'حذف الفواتير', 33),
('sales', 'المبيعات', 'approve', 'Approve returns', 'الموافقة على المرتجعات', 34),
('sales', 'المبيعات', 'export', 'Export sales data', 'تصدير بيانات المبيعات', 35),
-- Purchasing
('purchasing', 'المشتريات', 'view', 'View purchases', 'عرض المشتريات', 40),
('purchasing', 'المشتريات', 'create', 'Create purchase orders', 'إنشاء أوامر الشراء', 41),
('purchasing', 'المشتريات', 'edit', 'Edit purchases', 'تعديل المشتريات', 42),
('purchasing', 'المشتريات', 'delete', 'Delete purchases', 'حذف المشتريات', 43),
('purchasing', 'المشتريات', 'approve', 'Approve purchase orders', 'الموافقة على أوامر الشراء', 44),
-- CRM
('crm', 'إدارة العملاء', 'view', 'View customers', 'عرض العملاء', 50),
('crm', 'إدارة العملاء', 'create', 'Add customers', 'إضافة عملاء', 51),
('crm', 'إدارة العملاء', 'edit', 'Edit customers', 'تعديل العملاء', 52),
('crm', 'إدارة العملاء', 'delete', 'Delete customers', 'حذف العملاء', 53),
-- HR
('hr', 'الموارد البشرية', 'view', 'View employees', 'عرض الموظفين', 60),
('hr', 'الموارد البشرية', 'create', 'Add employees', 'إضافة موظفين', 61),
('hr', 'الموارد البشرية', 'edit', 'Edit employees', 'تعديل الموظفين', 62),
('hr', 'الموارد البشرية', 'delete', 'Delete employees', 'حذف الموظفين', 63),
('hr', 'الموارد البشرية', 'approve', 'Approve attendance', 'الموافقة على الحضور', 64),
-- Finance
('finance', 'المالية', 'view', 'View finances', 'عرض المالية', 70),
('finance', 'المالية', 'create', 'Create transactions', 'إنشاء معاملات', 71),
('finance', 'المالية', 'edit', 'Edit transactions', 'تعديل المعاملات', 72),
('finance', 'المالية', 'delete', 'Delete transactions', 'حذف المعاملات', 73),
('finance', 'المالية', 'approve', 'Approve expenses', 'الموافقة على المصروفات', 74),
('finance', 'المالية', 'export', 'Export financial reports', 'تصدير التقارير المالية', 75),
-- Reports
('reports', 'التقارير', 'view', 'View reports', 'عرض التقارير', 80),
('reports', 'التقارير', 'create', 'Generate reports', 'إنشاء تقارير', 81),
('reports', 'التقارير', 'export', 'Export reports', 'تصدير التقارير', 82),
-- Settings
('settings', 'الإعدادات', 'view', 'View settings', 'عرض الإعدادات', 90),
('settings', 'الإعدادات', 'edit', 'Edit settings', 'تعديل الإعدادات', 91),
('settings', 'الإعدادات', 'create', 'Manage users', 'إدارة المستخدمين', 92),
('settings', 'الإعدادات', 'delete', 'Delete users', 'حذف المستخدمين', 93);

-- Insert default role permissions for admin (full access)
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'admin', id FROM public.permissions;

-- Insert default permissions for moderator
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'moderator', id FROM public.permissions 
WHERE module IN ('dashboard', 'inventory', 'sales', 'purchasing', 'crm', 'reports')
AND action IN ('view', 'create', 'edit', 'export');

-- Insert default permissions for cashier
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'cashier', id FROM public.permissions 
WHERE (module = 'pos' AND action IN ('view', 'create', 'edit'))
OR (module = 'dashboard' AND action = 'view')
OR (module = 'crm' AND action IN ('view', 'create'))
OR (module = 'sales' AND action = 'view');

-- Insert default permissions for viewer
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'viewer', id FROM public.permissions 
WHERE action = 'view' AND module IN ('dashboard', 'inventory', 'sales', 'reports');

-- Create function to check permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _module text, _action text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    JOIN public.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = _user_id
      AND p.module = _module
      AND p.action = _action
      AND p.is_active = true
  )
$$;