-- جدول الإشعارات
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_ar TEXT,
    message TEXT NOT NULL,
    message_ar TEXT,
    type TEXT NOT NULL DEFAULT 'info', -- info, warning, error, success
    category TEXT NOT NULL DEFAULT 'system', -- low_stock, overdue_invoice, system, backup
    reference_id UUID,
    reference_type TEXT, -- product, invoice, customer, supplier
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    read_at TIMESTAMP WITH TIME ZONE
);

-- جدول سجل المراجعة
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    action TEXT NOT NULL, -- create, update, delete, login, logout
    table_name TEXT,
    record_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول الكوبونات
CREATE TABLE public.coupons (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_ar TEXT,
    description TEXT,
    discount_type TEXT NOT NULL DEFAULT 'percentage', -- percentage, fixed
    discount_value NUMERIC NOT NULL DEFAULT 0,
    min_purchase_amount NUMERIC DEFAULT 0,
    max_discount_amount NUMERIC,
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    usage_per_customer INTEGER DEFAULT 1,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    applicable_products UUID[], -- null means all products
    applicable_categories UUID[], -- null means all categories
    applicable_customers UUID[], -- null means all customers
    branch_id UUID REFERENCES public.branches(id),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول استخدام الكوبونات
CREATE TABLE public.coupon_usage (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES public.customers(id),
    sale_id UUID,
    discount_amount NUMERIC NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول إعدادات النسخ الاحتياطي
CREATE TABLE public.backup_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT false,
    frequency TEXT DEFAULT 'daily', -- daily, weekly, monthly
    backup_time TIME DEFAULT '03:00:00',
    retention_days INTEGER DEFAULT 30,
    last_backup_at TIMESTAMP WITH TIME ZONE,
    next_backup_at TIMESTAMP WITH TIME ZONE,
    backup_location TEXT DEFAULT 'local',
    email_notifications BOOLEAN DEFAULT true,
    notification_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- جدول سجل النسخ الاحتياطي
CREATE TABLE public.backup_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    backup_type TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, manual
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, failed
    file_name TEXT,
    file_size BIGINT,
    tables_backed_up TEXT[],
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id)
);

-- تفعيل RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;

-- سياسات الإشعارات
CREATE POLICY "Users can view their notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "System can create notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update their notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL);

-- سياسات سجل المراجعة
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);

-- سياسات الكوبونات
CREATE POLICY "Anyone can view active coupons"
ON public.coupons FOR SELECT
USING (true);

CREATE POLICY "Admins can manage coupons"
ON public.coupons FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- سياسات استخدام الكوبونات
CREATE POLICY "Anyone can view coupon usage"
ON public.coupon_usage FOR SELECT
USING (true);

CREATE POLICY "Anyone can create coupon usage"
ON public.coupon_usage FOR INSERT
WITH CHECK (true);

-- سياسات إعدادات النسخ الاحتياطي
CREATE POLICY "Admins can manage backup settings"
ON public.backup_settings FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view backup logs"
ON public.backup_logs FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Triggers للتحديث التلقائي
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_backup_settings_updated_at
BEFORE UPDATE ON public.backup_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- دالة لإنشاء إشعارات المخزون المنخفض
CREATE OR REPLACE FUNCTION public.create_low_stock_notification()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.stock <= COALESCE(NEW.min_stock, 5) AND (OLD.stock > COALESCE(OLD.min_stock, 5) OR OLD IS NULL) THEN
        INSERT INTO public.notifications (title, title_ar, message, message_ar, type, category, reference_id, reference_type)
        VALUES (
            'Low Stock Alert',
            'تنبيه مخزون منخفض',
            'Product ' || NEW.name || ' has low stock: ' || NEW.stock || ' units remaining',
            'المنتج ' || COALESCE(NEW.name_ar, NEW.name) || ' مخزونه منخفض: ' || NEW.stock || ' وحدة متبقية',
            'warning',
            'low_stock',
            NEW.id,
            'product'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER product_low_stock_notification
AFTER UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.create_low_stock_notification();

-- إدراج إعدادات النسخ الاحتياطي الافتراضية
INSERT INTO public.backup_settings (is_enabled, frequency, backup_time, retention_days)
VALUES (false, 'daily', '03:00:00', 30);