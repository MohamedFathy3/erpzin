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
  return '/';
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
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
  const hasAccess = canAccessPage(user.role as any, location.pathname);

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