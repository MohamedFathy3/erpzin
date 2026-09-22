const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير النظام',
  administrator: 'مدير النظام',
  'super admin': 'المدير العام',
  'super administrator': 'المدير العام',
  tenant_admin: 'مدير المستأجر',
  'tenant admin': 'مدير المستأجر',
  company_admin: 'مدير الشركة',
  'company admin': 'مدير الشركة',
  manager: 'مدير',
  cashier: 'أمين الصندوق',
  accountant: 'محاسب',
  sales: 'مبيعات',
  purchasing: 'مشتريات',
  warehouse: 'مخازن',
  hr: 'موارد بشرية',
  viewer: 'مشاهد',
};

const MODULE_LABELS: Record<string, string> = {
  general: 'عام',
  dashboard: 'لوحة التحكم',
  inventory: 'المخزون',
  sales: 'المبيعات',
  purchasing: 'المشتريات',
  finance: 'المالية',
  accounting: 'المحاسبة',
  hr: 'الموارد البشرية',
  crm: 'العملاء',
  reports: 'التقارير',
  settings: 'الإعدادات',
  users: 'المستخدمون',
  employees: 'الموظفون',
  notifications: 'الإشعارات',
  manufacturing: 'التصنيع',
  projects: 'المشروعات',
  workflow: 'سير العمل',
};

const ACTION_LABELS: Record<string, string> = {
  view: 'عرض',
  read: 'عرض',
  list: 'عرض القائمة',
  create: 'إنشاء',
  add: 'إضافة',
  store: 'إضافة',
  edit: 'تعديل',
  update: 'تعديل',
  manage: 'إدارة',
  delete: 'حذف',
  remove: 'حذف',
  export: 'تصدير',
  import: 'استيراد',
  approve: 'اعتماد',
  send: 'إرسال',
  close: 'إغلاق',
  print: 'طباعة',
  pay: 'دفع',
};

const normalize = (value?: string | null) => (value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');

export const roleLabel = (name?: string | null) => {
  if (!name) return 'بدون دور';
  return ROLE_LABELS[normalize(name)] || name;
};

export const moduleLabel = (module?: string | null) => {
  if (!module) return 'عام';
  return MODULE_LABELS[normalize(module)] || module;
};

/** Uses the backend Arabic name first, then creates a readable Arabic fallback from the permission key. */
export const permissionLabel = (permission: {
  key?: string;
  slug?: string;
  name?: string;
  name_ar?: string | null;
}) => {
  if (permission.name_ar) return permission.name_ar;
  if (permission.name && !/^[a-z0-9_.-]+$/i.test(permission.name)) return permission.name;

  const key = permission.key || permission.slug || permission.name || '';
  const parts = key.toLowerCase().split(/[._:-]+/).filter(Boolean);
  if (parts.length === 0) return 'صلاحية';
  const action = ACTION_LABELS[parts.at(-1) || ''];
  const module = moduleLabel(parts[0]);
  return action ? `${action} ${module}` : key;
};

export const permissionKey = (permission: { key?: string; slug?: string; name?: string; id?: number }) =>
  permission.key || permission.slug || permission.name || `permission-${permission.id ?? ''}`;
