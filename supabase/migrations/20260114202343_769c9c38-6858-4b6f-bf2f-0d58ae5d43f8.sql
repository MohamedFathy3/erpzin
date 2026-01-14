-- Add username and warehouse_id to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username VARCHAR(100) UNIQUE,
ADD COLUMN IF NOT EXISTS warehouse_id UUID REFERENCES public.warehouses(id);

-- Create index for username lookup
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Create custom roles table
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  name_ar VARCHAR(100),
  description TEXT,
  description_ar TEXT,
  color VARCHAR(20) DEFAULT '#6366f1',
  icon VARCHAR(50) DEFAULT 'Shield',
  is_system BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Allow read for authenticated
CREATE POLICY "Anyone can read custom roles" ON public.custom_roles
FOR SELECT TO authenticated USING (true);

-- Allow admin to manage custom roles
CREATE POLICY "Admins can manage custom roles" ON public.custom_roles
FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert default system roles
INSERT INTO public.custom_roles (name, name_ar, description, description_ar, color, icon, is_system) VALUES
('admin', 'مدير النظام', 'Full system access with all permissions', 'صلاحيات كاملة للوصول إلى جميع الميزات', '#f59e0b', 'Crown', true),
('moderator', 'مشرف', 'Manage inventory, sales, and reports', 'إدارة المخزون والمبيعات والتقارير', '#3b82f6', 'Shield', true),
('cashier', 'كاشير', 'POS operations and basic access', 'عمليات نقطة البيع والوصول الأساسي', '#10b981', 'ShoppingCart', true),
('viewer', 'مشاهد', 'Read-only access to view data', 'صلاحية القراءة فقط لعرض البيانات', '#64748b', 'Eye', true)
ON CONFLICT (name) DO NOTHING;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_custom_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_custom_roles_timestamp
BEFORE UPDATE ON public.custom_roles
FOR EACH ROW
EXECUTE FUNCTION update_custom_roles_updated_at();