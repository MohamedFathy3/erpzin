// components/auth/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessPage, getAllowedPages } from '@/config/permissions';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// دالة لتحديد الصفحة الافتراضية بناءً على دور المستخدم
const getDefaultRoute = (role: string): string => {
  const allowedPages = getAllowedPages(role as any);
  
  // ترتيب الأولويات للصفحات (حسب أهمية كل دور)
  const priorityPages = ['dashboard', 'pos', 'sales', 'inventory', 'purchasing', 'finance', 'hr', 'crm', 'reports'];
  
  // البحث عن أول صفحة في قائمة الأولويات مسموحة للمستخدم
  for (const pageId of priorityPages) {
    const page = allowedPages.find(p => p.id === pageId);
    if (page) {
      return page.path;
    }
  }
  
  // إذا لم يتم العثور على صفحة من الأولويات، خذ أول صفحة مسموحة
  if (allowedPages.length > 0) {
    return allowedPages[0].path;
  }
  
  // في حالة عدم وجود أي صفحة مسموحة (نادراً ما يحدث)
  return '/dashboard';
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, permissions, permissionsLoading } = useAuth();
  const location = useLocation();

  // أثناء تحميل بيانات المستخدم
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا لم يكن المستخدم مسجل الدخول
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // التحقق من صلاحية الوصول للصفحة الحالية
  const normalizedRole = typeof user.role === 'string' ? user.role.toLowerCase() : user.role;
  const pagePermission: Record<string, string> = {
    '/dashboard': 'dashboard.view', '/inventory': 'inventory.view', '/sales': 'sales.view',
    '/pos': 'sales.view', '/purchasing': 'purchasing.view', '/finance': 'finance.view',
    '/hr': 'hr.view', '/crm': 'crm.view', '/reports': 'reports.view',
    '/projects': 'projects.view', '/manufacturing': 'manufacturing.view',
    '/access-control': 'access_control.view', '/ai-assistant': 'ai_assistant.view',
  };
  const permissionKey = pagePermission[location.pathname];
  const isAdmin = Boolean(user.super_admin) || normalizedRole === 'admin';
  const isAccessManager = location.pathname === '/access-control' && normalizedRole === 'manager';
  const permissionAccess = !permissionKey || permissions.includes('*') ||
    permissions.includes(permissionKey) || (permissionKey === 'access_control.view' && permissions.includes('roles.manage'));
  const hasAccess = isAdmin || isAccessManager || (canAccessPage(normalizedRole as any, location.pathname) &&
    (permissionsLoading || (permissions.length > 0 && permissionAccess)));

  // إذا لم يكن لديه صلاحية
  if (!hasAccess) {
    toast.error('ليس لديك صلاحية للوصول إلى هذه الصفحة');
    
    // توجيه المستخدم إلى الصفحة المناسبة حسب دوره
    const defaultRoute = getDefaultRoute(user.role);
    return <Navigate to={defaultRoute} replace />;
  }

  // إذا كان لديه صلاحية، عرض الصفحة
  return <>{children}</>;
};

export default ProtectedRoute;
