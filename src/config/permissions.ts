// config/permissions.ts
export type UserRole = 'admin' | 'Cashier' | 'manager' | 'accountant' | 'sales' | 'purchasing' | 'warehouse' | 'hr' | 'viewer';

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
    allowedRoles: ['admin',  'manager', 'accountant', 'sales', 'purchasing', 'warehouse', 'hr', 'viewer'],
  },
  {
    id: 'pos',
    path: '/pos',
    label: 'POS',
    labelAr: 'نقطة البيع',
    icon: 'ShoppingCart',
    allowedRoles: ['admin', 'Cashier', 'manager', 'sales'],
  },
  {
    id: 'inventory',
    path: '/inventory',
    label: 'Inventory',
    labelAr: 'المخزون',
    icon: 'Package',
    allowedRoles: ['admin', 'manager', 'purchasing', 'warehouse'],
  },
  {
    id: 'sales',
    path: '/sales',
    label: 'Sales',
    labelAr: 'المبيعات',
    icon: 'Receipt',
    allowedRoles: ['admin', 'manager', 'sales', 'Cashier', 'accountant'],
  },
  {
    id: 'purchasing',
    path: '/purchasing',
    label: 'Purchasing',
    labelAr: 'المشتريات',
    icon: 'Truck',
    allowedRoles: ['admin', 'manager', 'purchasing'],
  },
  {
    id: 'finance',
    path: '/finance',
    label: 'Finance',
    labelAr: 'المالية',
    icon: 'Wallet',
    allowedRoles: ['admin', 'manager', 'accountant'],
  },
  {
    id: 'hr',
    path: '/hr',
    label: 'HR',
    labelAr: 'الموارد البشرية',
    icon: 'Users',
    allowedRoles: ['admin', 'manager', 'hr'],
  },
  {
    id: 'crm',
    path: '/crm',
    label: 'CRM',
    labelAr: 'العملاء',
    icon: 'Crown',
    allowedRoles: ['admin', 'manager', 'sales'],
  },
  {
    id: 'reports',
    path: '/reports',
    label: 'Reports',
    labelAr: 'التقارير',
    icon: 'FileBarChart',
    allowedRoles: ['admin', 'manager', 'accountant', 'sales', 'purchasing', 'warehouse', 'hr', 'viewer'],
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