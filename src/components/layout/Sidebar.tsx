// components/layout/Sidebar.tsx
import React, { useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSidebarContext } from '@/contexts/SidebarContext';
import { useAuth } from '@/contexts/AuthContext'; // ✅ تأكد من استيراد useAuth فقط
import { getAllowedPages, PAGES } from '@/config/permissions';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';
import { toast } from 'sonner'; // ✅ لإظهار رسالة عند تسجيل الخروج
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  description?: string;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, description, active, collapsed, onClick }) => {
  const button = (
    <button
      onClick={onClick}
      className={cn(
        'sidebar-item w-full',
        active && 'sidebar-item-active',
        collapsed && 'justify-center px-2'
      )}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );

  if (!description) return button;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" align="center" className="max-w-64 text-right leading-5">
        <p className="font-semibold">{label}</p>
        <p className="mt-1 text-xs text-popover-foreground/75">{description}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// دالة لجلب الأيقونة المناسبة
const getIcon = (iconName: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons: Record<string, any> = {
    LayoutDashboard: Icons.LayoutDashboard,
    ShoppingCart: Icons.ShoppingCart,
    Package: Icons.Package,
    Receipt: Icons.Receipt,
    Truck: Icons.Truck,
    Wallet: Icons.Wallet,
    Users: Icons.Users,
    Crown: Icons.Crown,
    FileBarChart: Icons.FileBarChart,
    Settings: Icons.Settings,
    LogOut: Icons.LogOut,
    Warehouse: Icons.Warehouse,
    Factory: Icons.Factory,
    Settings2: Icons.Settings2,
    HardHat: Icons.HardHat,
    Activity: Icons.Activity,
    MessageCircle: Icons.MessageCircle,
    CalendarDays: Icons.CalendarDays,
    CheckSquare: Icons.CheckSquare,
    BrainCircuit: Icons.BrainCircuit,
    KeyRound: Icons.KeyRound,
    FlaskConical: Icons.FlaskConical,
  };
  
  const Icon = icons[iconName] || Icons.LayoutDashboard;
  return <Icon size={20} />;
};

const navDescriptions: Record<string, { ar: string; en: string }> = {
  dashboard: { ar: 'ملخص شامل للأعمال والإحصاءات والنتائج', en: 'Overall business summary, statistics and KPIs' },
  pos: { ar: 'إصدار فواتير البيع والدفع والعملاء من نقطة البيع', en: 'Create sales, payments and customer transactions at POS' },
  posreturn: { ar: 'إرجاع فواتير نقطة البيع والخصومات والفرد والمرتجعات', en: 'Process POS invoice returns and reversals' },
  inventory: { ar: 'إدارة المنتجات والأرصدة والباركود والجرد والعروض', en: 'Manage products, stock, barcode, counts and promotions' },
  'inventory-transfer-requests': { ar: 'اعتماد ورفض طلبات نقل المخزون بين الفروع والمخازن', en: 'Approve or reject stock transfers between branches' },
  sales: { ar: 'إنشاء الفواتير ومتابعة المبيعات والمرتجعات والعملاء', en: 'Manage invoices, sales, returns and customers' },
  purchasing: { ar: 'إدارة أوامر الشراء والموردين والفواتير المستلمة', en: 'Manage suppliers, purchase orders and received invoices' },
  finance: { ar: 'القيود والإيرادات والمصروفات والخزائن والحسابات والتقارير', en: 'Journals, cash, expenses, revenues, accounts and reports' },
  hr: { ar: 'الموظفون والحضور والرواتب والمستحقات والسلف', en: 'Employees, attendance, payroll, advances and bonuses' },
  crm: { ar: 'إدارة العملاء والفرص والمتابعات والحملات', en: 'Manage customers, opportunities, follow-ups and campaigns' },
  whatsapp: { ar: 'إدارة حساب واتساب والرسائل والردود الآلية والحجوزات', en: 'Manage WhatsApp account, messages, automation and appointments' },
  'google-integrations': { ar: 'ربط تقويم Google والمزامنة والأحداث', en: 'Connect Google Calendar and synchronize events' },
  calendar: { ar: 'عرض المهام والمواعيد والأحداث في تقويم واحد', en: 'View tasks, appointments and events in one calendar' },
  tasks: { ar: 'إنشاء المهام والتذكيرات ومتابعة التنفيذ', en: 'Create tasks and reminders and track completion' },
  reports: { ar: 'تقارير المبيعات والأداء والأرباح والملخصات التنفيذية', en: 'Sales, performance, profit and executive reports' },
  'unified-financial-reports': { ar: 'تقرير مالي موحد للمبيعات والمشتريات والنتيجة', en: 'Unified report for sales, purchases and financial results' },
  'employee-financial-reports': { ar: 'رواتب الموظفين والسلف والبونص وكشوف الحساب', en: 'Employee payroll, advances, bonuses and statements' },
  'warehouse-reports': { ar: 'أرصدة المخازن وحركاتها والقيمة والربح المتوقع', en: 'Warehouse balances, movements, values and expected profit' },
  industries: { ar: 'إدارة الصناعات والمنتجات والفئات والوحدات', en: 'Manage industries, products, categories and units' },
  manufacturing: { ar: 'أوامر التصنيع والمراحل والمواد والإنتاج', en: 'Manufacturing orders, stages, materials and production' },
  manufacturingSetup: { ar: 'إعداد الوصفات والمواد ومراحل التصنيع', en: 'Configure recipes, materials and manufacturing stages' },
  productLedger: { ar: 'كشف كل حركة وعمليات شراء وبيع للمنتج', en: 'View every purchase, sale and movement of a product' },
  representative: { ar: 'عمولات المندوب وفواتيره وأداؤه وبيانات عملائه', en: 'Representative invoices, performance, customers and commissions' },
  projects: { ar: 'المشروعات والعقود والمراحل والمصروفات والاعتمادات', en: 'Projects, contracts, stages, expenses and approvals' },
  workflow: { ar: 'تتبع ترابط المبيعات والمخزون والمالية وسجل الأحداث', en: 'Track sales, inventory, finance links and event history' },
  automotive: { ar: 'أوامر صيانة السيارات والفنيين والحركة والمبيعات', en: 'Vehicle service orders, technicians, inventory and sales' },
  aiAssistant: { ar: 'الإجابة عن بيانات النظام وتحليلها بلغة طبيعية', en: 'Answer and analyze ERP data using natural language' },
  'access-control': { ar: 'إضافة الأدوار وتحديد صلاحيات كل قسم لكل مستخدم', en: 'Create roles and define section permissions for users' },
  'my-access': { ar: 'عرض فرعك والصلاحيات والأقسام المتاحة لك', en: 'View your branch and available permissions' },
  'super-admin': { ar: 'إدارة العملاء والمستأجرين والاشتراكات والوصول الشامل', en: 'Manage tenants, subscriptions and global administration' },
  settings: { ar: 'إعدادات الشركة والفروع والخزائن والبيانات العامة', en: 'Company, branches, treasury and general settings' },
  logout: { ar: 'الخروج من الحساب وإنهاء الجلسة الحالية', en: 'Sign out and end the current session' },
};

interface SidebarProps {
  activeItem?: string;
  onNavigate?: (item: string) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeItem = 'dashboard', onNavigate, mobileOpen = false, onClose }) => {
  const { t, direction, language } = useLanguage();
  const { collapsed, toggle } = useSidebarContext();
  const { user, signOut, enabledModules, modulesLoading, permissions, permissionsLoading } = useAuth(); // ✅ استخدم signOut من useAuth
  const navScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const savedPosition = Number(sessionStorage.getItem('sidebar-nav-scroll') || 0);
    if (navScrollRef.current) {
      navScrollRef.current.scrollTop = savedPosition;
    }
  }, []);

  // جلب الصفحات المسموحة للمستخدم
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roleAllowedPages = getAllowedPages(user?.role as any);

  const pageModules: Record<string, string> = {
    automotive: 'automotive_service',
    inventory: 'inventory',
    sales: 'sales',
    purchasing: 'purchasing',
    finance: 'finance',
    hr: 'hr',
    crm: 'crm',
    whatsapp: 'whatsapp',
    'google-integrations': 'google_calendar',
    calendar: 'google_calendar',
    tasks: 'google_calendar',
    reports: 'reports',
    'employee-financial-reports': 'employee_financial_reports',
    'unified-financial-reports': 'reports',
    'warehouse-reports': 'warehouse_reports',
    'inventory-transfer-requests': 'inventory_transfer_requests',
    industries: 'industries',
    manufacturing: 'manufacturing',
    manufacturingSetup: 'manufacturing',
    productLedger: 'product_ledger',
    representative: 'representative',
    projects: 'projects',
    workflow: 'workflow',
    settings: 'settings',
    'access-control': 'access_control',
    aiAssistant: 'ai_assistant',
  };

  const moduleEnabled = (pageId: string) => {
    // Tenant module switches are the highest-level UI gate. A tenant admin
    // must not see a disabled module even when role permissions grant access.
    const module = pageModules[pageId];
    if (user?.super_admin) return true;
    // Hide module entries while the tenant configuration is loading instead
    // of briefly rendering disabled modules and removing them afterward.
    if (modulesLoading) return !module;
    return !module || enabledModules.includes(module);
  };

  const permissionForPage: Record<string, string[]> = {
    dashboard: ['dashboard.view'], automotive: ['automotive.view', 'automotive.reports.view'], inventory: ['inventory.view'], sales: ['sales.view'], pos: ['sales.view'], posreturn: ['sales.pos_return.view'],
    purchasing: ['purchasing.view'], finance: ['finance.view', 'currency.view', 'tax.view', 'treasury.view', 'bank.view'], hr: ['hr.view'], crm: ['crm.view'],
    reports: ['reports.view'], 'unified-financial-reports': ['reports.view'], 'employee-financial-reports': ['employee_financial_reports.view', 'reports.view', 'hr.view'], projects: ['projects.view'], manufacturing: ['manufacturing.view'],
    'access-control': ['access_control.view'], aiAssistant: ['ai_assistant.view'],
  };
  const permissionEnabled = (pageId: string) => {
    if (user?.super_admin || user?.role?.toLowerCase() === 'admin' || permissionsLoading || permissions.length === 0) return true;
    const permissionKeys = permissionForPage[pageId] || [];
    return permissionKeys.length === 0 || permissions.includes('*') || permissionKeys.some((permission) => permissions.includes(permission)) ||
      (pageId === 'access-control' && permissions.includes('roles.manage'));
  };

  const permissionPages = PAGES.filter((page) => permissionEnabled(page.id));
  const allowedPages = Array.from(new Map([...roleAllowedPages, ...permissionPages].map((page) => [page.id, page])).values());

  // تصفية وبناء عناصر القائمة
  const navItems = React.useMemo(() => {
    const items = allowedPages
      .filter(page =>
        ![
          'dashboard',
          'settings',
          'inventory-transfer-requests',
          'productLedger',
          'warehouse-reports',
        ].includes(page.id) &&
        (page.id !== 'access-control' || user?.super_admin || user?.role?.toLowerCase() === 'admin') &&
        moduleEnabled(page.id) &&
        permissionEnabled(page.id)
      )
      .map(page => ({
        id: page.id,
        icon: getIcon(page.icon),
        label: language === 'ar' ? page.labelAr : page.label,
        description: navDescriptions[page.id]?.[language === 'ar' ? 'ar' : 'en'],
      }));
    if (user?.super_admin) items.push({
      id: 'super-admin',
      icon: <Icons.ShieldCheck size={20} />,
      label: language === 'ar' ? 'الإدارة العليا' : 'Super Admin',
      description: navDescriptions['super-admin']?.[language === 'ar' ? 'ar' : 'en'],
    });
    return Array.from(new Map(items.map((item) => [item.id, item])).values());
  }, [allowedPages, enabledModules, language, modulesLoading, permissions, permissionsLoading, user?.super_admin, user?.role]);

  // عناصر القائمة السفلية
  const bottomItems = React.useMemo(() => {
    const items = [];
    
    const settingsPage = allowedPages.find(page => page.id === 'settings' && moduleEnabled(page.id));
    if (settingsPage) {
      items.push({
        id: 'settings',
        icon: getIcon(settingsPage.icon),
        label: language === 'ar' ? settingsPage.labelAr : settingsPage.label,
        description: navDescriptions.settings?.[language === 'ar' ? 'ar' : 'en'],
      });
    }

    items.push({
      id: 'logout',
      icon: <Icons.LogOut size={20} />,
      label: language === 'ar' ? 'تسجيل الخروج' : 'Logout',
      description: navDescriptions.logout?.[language === 'ar' ? 'ar' : 'en'],
    });

    return items;
  }, [allowedPages, enabledModules, language, modulesLoading, user?.super_admin]);

  const navigationGroups = React.useMemo(() => {
    const groups = [
      { key: 'operations', label: language === 'ar' ? 'التشغيل' : 'Operations', ids: ['pos', 'sales', 'purchasing', 'inventory', 'manufacturing', 'manufacturingSetup', 'automotive'] },
      { key: 'relationships', label: language === 'ar' ? 'العملاء والفريق' : 'Relationships', ids: ['crm', 'representative', 'projects', 'tasks', 'workflow', 'whatsapp'] },
      { key: 'insights', label: language === 'ar' ? 'التقارير والعمليات المالية' : 'Finance & Reports', ids: ['finance', 'reports', 'unified-financial-reports', 'employee-financial-reports'] },
      { key: 'workspace', label: language === 'ar' ? 'مساحة العمل' : 'Workspace', ids: ['calendar', 'google-integrations', 'industries', 'aiAssistant'] },
    ];
    return groups.map((group) => ({ ...group, items: group.ids.map((id) => navItems.find((item) => item.id === id)).filter(Boolean) as typeof navItems }))
      .filter((group) => group.items.length > 0);
  }, [language, navItems]);

  const ungroupedItems = navItems.filter((item) => !navigationGroups.some((group) => group.items.some((groupItem) => groupItem.id === item.id)));

  // ✅ دالة معالجة تسجيل الخروج
  const handleLogout = async () => {
    try {
      // إظهار رسالة تأكيد قبل تسجيل الخروج (اختياري)
      const confirmLogout = window.confirm(
        language === 'ar' 
          ? 'هل أنت متأكد من تسجيل الخروج؟' 
          : 'Are you sure you want to logout?'
      );
      
      if (!confirmLogout) return;
      
      // إظهار رسالة جاري تسجيل الخروج
      toast.info(
        language === 'ar' ? 'جاري تسجيل الخروج...' : 'Logging out...'
      );
      
      // استدعاء دالة تسجيل الخروج من الـ context
      await signOut();
      
      // signOut ستقوم بإعادة التوجيه إلى /auth تلقائياً
    } catch (error) {
      console.error('Logout error:', error);
      toast.error(
        language === 'ar' 
          ? 'حدث خطأ أثناء تسجيل الخروج' 
          : 'An error occurred while logging out'
      );
    }
  };

  const CollapseIcon = direction === 'rtl' 
    ? (collapsed ? Icons.ChevronLeft : Icons.ChevronRight)
    : (collapsed ? Icons.ChevronRight : Icons.ChevronLeft);

  return (
    <aside
      className={cn(
        'app-sidebar fixed inset-y-0 z-50 flex h-screen flex-col bg-sidebar transition-all duration-300 md:relative md:z-auto',
        collapsed ? 'w-[72px]' : 'w-64',
        mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center bg-slate-50 m-3 rounded-2xl border border-slate-200/80 overflow-hidden transition-all duration-300',
        collapsed ? 'justify-center p-3' : 'justify-center p-4'
      )}>
        <div className="relative w-full h-12 flex items-center justify-center">
          <img
            src="/fusionx-tech-logo.png"
            alt="Fusion X.tech"
            className={cn(
              'absolute object-contain transition-all duration-300 ease-in-out',
              collapsed 
                ? 'w-10 h-10 opacity-100 scale-100 rotate-0' 
                : 'w-0 h-0 opacity-0 scale-50 rotate-180'
            )}
          />
          <img
            src="/fusionx-tech-logo.png"
            alt="Fusion X.tech"
            className={cn(
              'object-contain transition-all duration-300 ease-in-out',
              collapsed 
                ? 'w-0 h-0 opacity-0 scale-75' 
                : 'h-12 opacity-100 scale-100'
            )}
          />
        </div>
      </div>

      {/* Collapse Button */}
      <button
        onClick={toggle}
        className={cn(
          'absolute top-20 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center',
          'text-primary-foreground shadow-md hover:bg-primary/90 transition-colors',
          direction === 'rtl' ? '-left-3' : '-right-3'
        )}
      >
        <CollapseIcon size={14} />
      </button>

      {/* Navigation */}
      <TooltipProvider delayDuration={350}>
        <nav
          ref={navScrollRef}
          onScroll={(event) => sessionStorage.setItem('sidebar-nav-scroll', String(event.currentTarget.scrollTop))}
          className="flex-1 space-y-1 overflow-y-auto p-3"
        >
          {!collapsed && <p className="mb-2 px-3 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-sidebar-foreground/35">{language === 'ar' ? 'مساحة العمل' : 'Workspace'}</p>}
          <NavItem icon={<Icons.LayoutDashboard size={20} />} label={language === 'ar' ? 'لوحة التحكم' : 'Dashboard'} description={navDescriptions.dashboard?.[language === 'ar' ? 'ar' : 'en']} active={activeItem === 'dashboard'} collapsed={collapsed} onClick={() => { onNavigate?.('dashboard'); onClose?.(); }} />
          {navigationGroups.map((group) => <React.Fragment key={group.key}>
            {!collapsed && <p className="mb-1 mt-5 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/35">{group.label}</p>}
            {group.items.map((item) => <NavItem key={item.id} icon={item.icon} label={item.label} description={item.description} active={activeItem === item.id} collapsed={collapsed} onClick={() => { onNavigate?.(item.id); onClose?.(); }} />)}
          </React.Fragment>)}
          {ungroupedItems.map((item) => <NavItem key={item.id} icon={item.icon} label={item.label} description={item.description} active={activeItem === item.id} collapsed={collapsed} onClick={() => { onNavigate?.(item.id); onClose?.(); }} />)}
        </nav>
      </TooltipProvider>

      {/* Bottom Items */}
      {bottomItems.length > 0 && (
        <div className="p-3 border-t border-sidebar-border space-y-1">
          {bottomItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              description={item.description}
              active={activeItem === item.id}
              collapsed={collapsed}
              onClick={() => {
                if (item.id === 'logout') {
                  handleLogout(); // ✅ استدعاء دالة تسجيل الخروج
                } else {
                  onNavigate?.(item.id);
                  onClose?.();
                }
              }}
            />
          ))}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
