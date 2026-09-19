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
  const roleRoutes: Record<string, string> = {
    cashier: '/pos',
    sales: '/sales',
    purchasing: '/purchasing',
    warehouse: '/inventory',
    accountant: '/finance',
    hr: '/hr',
    manager: '/dashboard',
    admin: '/dashboard',
  };
  const preferredRoute = roleRoutes[role.toLowerCase()];
  if (preferredRoute && allowedPages.some(page => page.path === preferredRoute)) {
    return preferredRoute;
  }
  
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
  const { user, loading, permissions, permissionsLoading, enabledModules, modulesLoading } = useAuth();
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
  const pagePermission: Record<string, string[]> = {
    '/dashboard': ['dashboard.view'], '/automotive': ['automotive.dashboard.view'], '/inventory': ['inventory.view'], '/sales': ['sales.view'],
    '/pos': ['sales.view'], '/purchasing': ['purchasing.view'], '/finance': ['finance.view', 'currency.view', 'tax.view', 'treasury.view', 'bank.view'],
    '/hr': ['hr.view'], '/crm': ['crm.view'], '/reports': ['reports.view'], '/inventory-transfer-requests': ['inventory.transfer_requests.view'],
    '/projects': ['projects.view'], '/manufacturing': ['manufacturing.view'],
    '/access-control': ['access_control.view'], '/ai-assistant': ['ai_assistant.view'],
  };
  const permissionKeys = pagePermission[location.pathname] || [];
  const moduleForPath: Record<string, string> = {
    '/hr': 'hr', '/automotive': 'automotive_service',
    '/inventory': 'inventory',
    '/sales': 'sales',
    '/purchasing': 'purchasing',
    '/finance': 'finance',
    '/crm': 'crm',
    '/reports': 'reports',
    '/manufacturing': 'manufacturing',
    '/projects': 'projects',
    '/workflow': 'workflow',
    '/access-control': 'access_control',
    '/ai-assistant': 'ai_assistant',
  };
  const requiredModule = moduleForPath[location.pathname];
  // Do not render a protected page while server-backed authorization state is
  // unknown; otherwise a direct URL can briefly expose the page during refresh.
  if (permissionsLoading || (requiredModule && modulesLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري التحقق من الصلاحيات...</p>
        </div>
      </div>
    );
  }
  const moduleAccess = Boolean(user.super_admin) || modulesLoading || !requiredModule || enabledModules.includes(requiredModule);
  if (!moduleAccess) {
    return <Navigate to="/dashboard" replace />;
  }
  const isAdmin = Boolean(user.super_admin) || normalizedRole === 'admin';
  const isAccessManager = location.pathname === '/access-control' && normalizedRole === 'admin';
  const permissionAccess = permissionKeys.length === 0 || permissions.includes('*') ||
    permissionKeys.some((permission) => permissions.includes(permission)) ||
    (permissionKeys.includes('access_control.view') && permissions.includes('roles.manage'));
  // An explicitly assigned permission overrides the role's default page list.
  // This is what lets one employee receive an extra module without changing
  // the role shared by other employees.
  const roleOrPermissionAccess = permissionKeys.length > 0
    ? permissionAccess
    : canAccessPage(normalizedRole as any, location.pathname);
  const hasAccess = isAdmin || isAccessManager || (permissions.length > 0 && roleOrPermissionAccess);

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
