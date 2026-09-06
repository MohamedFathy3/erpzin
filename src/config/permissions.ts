// config/permissions.ts
export type UserRole = 'admin' | 'Cashier' | 'Manager' | 'Accountant' | 'Sales' | 'purchasing' | 'warehouse' | 'HR' | 'viewer';

export interface PagePermission {
  id: string;
  path: string;
  label: string;
  labelAr: string;
  icon: string;
  allowedRoles: UserRole[];
}

export const PAGES: PagePermission[] = [
  {
    id: 'dashboard',
    path: '/',
    label: 'Dashboard',
    labelAr: 'لوحة التحكم',
    icon: 'LayoutDashboard',
    allowedRoles: ['admin',  'Manager', 'Accountant', 'Sales', 'purchasing', 'warehouse', 'viewer'],
  },
  {
    id: 'pos',
    path: '/pos',
    label: 'POS',
    labelAr: 'نقطة البيع',
    icon: 'ShoppingCart',
    allowedRoles: ['admin', 'Cashier', 'Manager', 'Sales'],
  },
    {
    id: 'posreturn',
    path: '/POSRetrun',
    label: 'POS Return',
    labelAr: 'إرجاع نقاط البيع',
    icon: 'RotateCcw',
    allowedRoles: ['admin', 'Cashier', 'Manager', 'Sales'],
  },
  {
    id: 'inventory',
    path: '/inventory',
    label: 'Inventory',
    labelAr: 'المخزون',
    icon: 'Package',
    allowedRoles: ['admin', 'Manager', 'purchasing', 'warehouse'],
  },
  {
    id: 'sales',
    path: '/sales',
    label: 'Sales',
    labelAr: 'المبيعات',
    icon: 'Receipt',
    allowedRoles: ['admin', 'Manager', 'Sales', 'Cashier', 'Accountant'],
  },
  {
    id: 'purchasing',
    path: '/purchasing',
    label: 'Purchasing',
    labelAr: 'المشتريات',
    icon: 'Truck',
    allowedRoles: ['admin', 'Manager', 'purchasing'],
  },
  {
    id: 'finance',
    path: '/finance',
    label: 'Finance',
    labelAr: 'المالية',
    icon: 'Wallet',
    allowedRoles: ['admin', 'Manager', 'Accountant'],
  },
  {
    id: 'hr',
    path: '/hr',
    label: 'HR',
    labelAr: 'الموارد البشرية',
    icon: 'Users',
    allowedRoles: ['admin', 'Manager', 'HR'],
  },
  {
    id: 'crm',
    path: '/crm',
    label: 'CRM',
    labelAr: 'العملاء',
    icon: 'Crown',
    allowedRoles: ['admin', 'Manager', 'Sales'],
  },
  {
    id: 'reports',
    path: '/reports',
    label: 'Reports',
    labelAr: 'التقارير',
    icon: 'FileBarChart',
    allowedRoles: ['admin', 'Manager', 'Accountant', 'Sales', 'purchasing', 'warehouse', 'HR', 'viewer'],
  },
  {
    id: 'industries',
    path: '/industries',
    label: 'Industries',
    labelAr: 'القطاعات والوحدات',
    icon: 'Factory',
    allowedRoles: ['admin', 'Manager', 'Accountant', 'Sales', 'purchasing', 'warehouse', 'HR', 'viewer'],
  },
  {
    id: 'manufacturing',
    path: '/manufacturing',
    label: 'Manufacturing',
    labelAr: 'المصانع والإنتاج',
    icon: 'Factory',
    allowedRoles: ['admin', 'Manager', 'warehouse', 'purchasing', 'Accountant'],
  },
  {
    id: 'projects',
    path: '/projects',
    label: 'Projects',
    labelAr: 'المقاولات والمشروعات',
    icon: 'HardHat',
    allowedRoles: ['admin', 'Manager', 'Accountant', 'Sales'],
  },
  {
    id: 'settings',
    path: '/settings',
    label: 'Settings',
    labelAr: 'الإعدادات',
    icon: 'Settings',
    allowedRoles: ['admin'],
  },
];

// ✅ دالة للتحقق من صلاحية الوصول للصفحة
export const canAccessPage = (role: UserRole | undefined, path: string): boolean => {
  if (!role) return false;
  if (role === 'admin') return true; // الأدمن كل حاجة
  
  const page = PAGES.find(p => p.path === path);
  if (!page) return false;
  
  return page.allowedRoles.includes(role);
};

// ✅ دالة لجلب الصفحات المسموحة للمستخدم
export const getAllowedPages = (role: UserRole | undefined): PagePermission[] => {
  if (!role) return [];
  if (role === 'admin') return PAGES; // الأدمن كل حاجة
  
  return PAGES.filter(page => page.allowedRoles.includes(role));
};
