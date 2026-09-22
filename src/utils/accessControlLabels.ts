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
  hr: 'الموارد البشرية',
  viewer: 'مشاهد',
};

const MODULE_LABELS: Record<string, string> = {
  general: 'عام',
  access_control: 'التحكم في الوصول',
  dashboard: 'لوحة التحكم',
  inventory: 'المخزون',
  sales: 'المبيعات',
  purchasing: 'المشتريات',
  finance: 'المالية',
  accounting: 'المحاسبة',
  hr: 'الموارد البشرية',
  human_resources: 'الموارد البشرية',
  employees: 'الموظفون',
  employee: 'الموظف',
  crm: 'العملاء',
  customers: 'العملاء',
  reports: 'التقارير',
  settings: 'الإعدادات',
  users: 'المستخدمون',
  notifications: 'الإشعارات',
  manufacturing: 'التصنيع',
  automotive: 'خدمة السيارات',
  projects: 'المشروعات',
  workflow: 'سير العمل',
  ai_assistant: 'المساعد الذكي',
  whatsapp: 'واتساب',
  branches: 'الفروع',
  warehouses: 'المخازن',
  products: 'المنتجات',
  suppliers: 'الموردون',
  invoices: 'الفواتير',
  payments: 'المدفوعات',
};

const ACTION_LABELS: Record<string, string> = {
  view: 'عرض',
  show: 'عرض',
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
  restore: 'استعادة',
  'force delete': 'حذف نهائي',
  export: 'تصدير',
  import: 'استيراد',
  approve: 'اعتماد',
  send: 'إرسال',
  close: 'إغلاق',
  print: 'طباعة',
  pay: 'دفع',
  edit_settings: 'تعديل الإعدادات',
};

const WORD_LABELS: Record<string, string> = {
  access: 'الوصول',
  control: 'التحكم',
  ai: 'الذكاء الاصطناعي',
  assistant: 'المساعد',
  automotive: 'السيارات',
  customer: 'العميل',
  customers: 'العملاء',
  employee: 'الموظف',
  employees: 'الموظفون',
  human: 'البشرية',
  resources: 'الموارد',
  resource: 'المورد',
  user: 'المستخدم',
  users: 'المستخدمون',
  role: 'الدور',
  roles: 'الأدوار',
  permission: 'الصلاحية',
  permissions: 'الصلاحيات',
  product: 'المنتج',
  products: 'المنتجات',
  supplier: 'المورد',
  suppliers: 'الموردون',
  report: 'التقرير',
  reports: 'التقارير',
  invoice: 'الفاتورة',
  invoices: 'الفواتير',
  branch: 'الفرع',
  branches: 'الفروع',
  warehouse: 'المخزن',
  warehouses: 'المخازن',
  settings: 'الإعدادات',
  fields: 'الحقول',
  field: 'الحقل',
  menus: 'القوائم',
  menu: 'القائمة',
  items: 'العناصر',
  item: 'العنصر',
  pages: 'الصفحات',
  page: 'الصفحة',
  sections: 'الأقسام',
  section: 'القسم',
  notifications: 'الإشعارات',
  notifications_: 'الإشعارات',
  hr: 'الموارد البشرية',
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

const translateWords = (value: string) => value
  .split(/[\s_.:-]+/)
  .filter(Boolean)
  .map((word) => WORD_LABELS[normalize(word)] || MODULE_LABELS[normalize(word)] || word)
  .join(' ');

const translatePermissionName = (name: string) => {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, ' ');
  if (ACTION_LABELS[normalized]) return ACTION_LABELS[normalized];

  const words = normalized.split(' ');
  const firstAction = ACTION_LABELS[words[0]];
  const lastAction = ACTION_LABELS[words.at(-1) || ''];
  if (firstAction && words.length > 1) return `${firstAction} ${translateWords(words.slice(1).join(' '))}`;
  if (lastAction && words.length > 1) return `${translateWords(words.slice(0, -1).join(' '))} ${lastAction}`;
  return translateWords(name);
};

/** Uses the backend Arabic name first, then translates legacy English permission names or keys. */
export const permissionLabel = (permission: {
  key?: string;
  slug?: string;
  name?: string;
  name_ar?: string | null;
}) => {
  if (permission.name_ar) return permission.name_ar;
  const source = permission.name || permission.key || permission.slug || '';
  if (!source) return 'صلاحية';
  return translatePermissionName(source);
};

export const permissionKey = (permission: { key?: string; slug?: string; name?: string; id?: number }) =>
  permission.key || permission.slug || permission.name || `permission-${permission.id ?? ''}`;
