import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import FileUploader from '@/components/FileUploader';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Settings as SettingsIcon,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Percent,
  Save,
  Store,
  FileText,
  Users,
  Upload,
  X,
  Image,
  Cog,
  ChevronRight,
  ChevronLeft,
  Shield,
  CreditCard,
  Flag,
  Calendar,
  Printer,
  Download,
  Upload as UploadIcon,
  Database,
  Bell,
  HardDrive
} from 'lucide-react';
import UsersPermissions from '@/components/settings/UsersPermissions';
import BranchesWarehouses from '@/components/settings/BranchesWarehouses';
import ModuleSettings from '@/components/settings/ModuleSettings';
import PaymentMethodsManager from '@/components/settings/PaymentMethodsManager';
import PrintingSettings from '@/components/settings/PrintingSettings';
import DataManagement from '@/components/settings/DataManagement';
import DataImportExport from '@/components/settings/DataImportExport';
import AuditLogViewer from '@/components/settings/AuditLogViewer';
import CurrencyTaxManager from '@/components/settings/CurrencyTaxManager';
import BackupManager from '@/components/settings/BackupManager';
import { cn } from '@/lib/utils';

interface SettingsSection {
  id: string;
  icon: React.ElementType;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  category: 'general' | 'business' | 'system';
}

interface AdminData {
  id: number;
  name: string;
  email: string;
  // الصور يمكن تكون string أو object
  logoUrl?: string;
  logo?: number | null | any; // <-- غيره ل any عشان تقبل object
  logo_icon?: string | any; // <-- غيره ل any
  logo_icon_image?: any;
  address?: string;
  phone?: string;
  active: number;
  tax_id?: string;
  commercial_register?: string;
  country?: string;
  currency?: string;
  date?: string;
  created_at: string;
  updated_at: string;
  website?: string;
  // حقول إضافية
  name_ar?: string;
  logo_url?: string;
  logo_icon_url?: string;
  calendar_system?: 'gregorian' | 'hijri' | 'both';
  tax_rate?: number;
  image?: number | null;
  imageUrl?: string;
}

const Settings = () => {
  const { language, direction, setLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('company');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [logoId, setLogoId] = useState<number | null>(null);
  const [logoIconId, setLogoIconId] = useState<number | null>(null);
  const [adminId, setAdminId] = useState<number | null>(null);

  const sections: SettingsSection[] = [
    // General Settings
    { 
      id: 'company', 
      icon: Building2, 
      label: 'Company Profile', 
      labelAr: 'ملف الشركة',
      description: 'Company information and branding',
      descriptionAr: 'معلومات الشركة والهوية',
      category: 'general'
    },
    { 
      id: 'branches', 
      icon: Store, 
      label: 'Branches & Warehouses', 
      labelAr: 'الفروع والمخازن',
      description: 'Manage locations and storage',
      descriptionAr: 'إدارة المواقع والتخزين',
      category: 'general'
    },
    // Business Settings
    { 
      id: 'currency', 
      icon: DollarSign, 
      label: 'Currency & Taxes', 
      labelAr: 'العملات والضرائب',
      description: 'Financial settings',
      descriptionAr: 'الإعدادات المالية',
      category: 'business'
    },
   

    { 
      id: 'import-export', 
      icon: Download, 
      label: 'Import & Export', 
      labelAr: 'استيراد وتصدير البيانات',
      description: 'Opening balances, customers, suppliers',
      descriptionAr: 'أول المدة والعملاء والموردين',
      category: 'business'
    },
    // System Settings
    { 
      id: 'users', 
      icon: Users, 
      label: 'Users & Permissions', 
      labelAr: 'المستخدمين والصلاحيات',
      description: 'Manage user access',
      descriptionAr: 'إدارة صلاحيات المستخدمين',
      category: 'system'
    },
    { 
      id: 'data-management', 
      icon: Database, 
      label: 'Data Management', 
      labelAr: 'إدارة البيانات',
      description: 'Delete system data (Admin only)',
      descriptionAr: 'حذف بيانات النظام (مدير النظام فقط)',
      category: 'system'
    },
    { 
      id: 'audit-log', 
      icon: Shield, 
      label: 'Audit Log', 
      labelAr: 'سجل المراجعة',
      description: 'Track all system changes',
      descriptionAr: 'تتبع جميع تغييرات النظام',
      category: 'system'
    },
    { 
      id: 'backup', 
      icon: HardDrive, 
      label: 'Backup & Restore', 
      labelAr: 'النسخ الاحتياطي',
      description: 'Export and import backups',
      descriptionAr: 'تصدير واستيراد النسخ الاحتياطية',
      category: 'system'
    },
  ];

  // Fetch admin data (GET /get-admin)
  const { data: adminData } = useQuery({
    queryKey: ['admin-data'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/get-admin');
        console.log('Admin data fetched:', data);
        return data.data;
      } catch (error) {
        console.error('Error fetching admin data:', error);
        throw error;
      }
    }
  });

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: '',
    name_ar: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    tax_id: '',
    commercial_register: '',
    country: 'YE',
    currency: 'YER',
    date: new Date().toISOString().split('T')[0],
    logo: null as number | null,
    logo_icon: null as number | null,
    logo_url: '',
    logo_icon_url: '',
    phones: [] as string[],
    calendar_system: 'gregorian' as 'gregorian' | 'hijri' | 'both',
    tax_rate: 0,
    password: '' // لحقل كلمة المرور
  });

  // Arab countries list
  const arabCountries = [
    { code: 'YE', name: 'Yemen', nameAr: 'اليمن' },
    { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية' },
    { code: 'AE', name: 'UAE', nameAr: 'الإمارات' },
    { code: 'KW', name: 'Kuwait', nameAr: 'الكويت' },
    { code: 'QA', name: 'Qatar', nameAr: 'قطر' },
    { code: 'BH', name: 'Bahrain', nameAr: 'البحرين' },
    { code: 'OM', name: 'Oman', nameAr: 'عُمان' },
    { code: 'IQ', name: 'Iraq', nameAr: 'العراق' },
    { code: 'JO', name: 'Jordan', nameAr: 'الأردن' },
    { code: 'SY', name: 'Syria', nameAr: 'سوريا' },
    { code: 'LB', name: 'Lebanon', nameAr: 'لبنان' },
    { code: 'PS', name: 'Palestine', nameAr: 'فلسطين' },
    { code: 'EG', name: 'Egypt', nameAr: 'مصر' },
    { code: 'SD', name: 'Sudan', nameAr: 'السودان' },
    { code: 'LY', name: 'Libya', nameAr: 'ليبيا' },
    { code: 'TN', name: 'Tunisia', nameAr: 'تونس' },
    { code: 'DZ', name: 'Algeria', nameAr: 'الجزائر' },
    { code: 'MA', name: 'Morocco', nameAr: 'المغرب' },
    { code: 'MR', name: 'Mauritania', nameAr: 'موريتانيا' },
    { code: 'SO', name: 'Somalia', nameAr: 'الصومال' },
    { code: 'DJ', name: 'Djibouti', nameAr: 'جيبوتي' },
    { code: 'KM', name: 'Comoros', nameAr: 'جزر القمر' },
  ];

  // Arab currencies list
  const arabCurrencies = [
    { code: 'YER', name: 'Yemeni Rial', nameAr: 'ريال يمني', symbol: '﷼', country: 'YE' },
    { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: '﷼', country: 'SA' },
    { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'د.إ', country: 'AE' },
    { code: 'KWD', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', symbol: 'د.ك', country: 'KW' },
    { code: 'QAR', name: 'Qatari Riyal', nameAr: 'ريال قطري', symbol: '﷼', country: 'QA' },
    { code: 'BHD', name: 'Bahraini Dinar', nameAr: 'دينار بحريني', symbol: 'د.ب', country: 'BH' },
    { code: 'OMR', name: 'Omani Rial', nameAr: 'ريال عماني', symbol: '﷼', country: 'OM' },
    { code: 'IQD', name: 'Iraqi Dinar', nameAr: 'دينار عراقي', symbol: 'د.ع', country: 'IQ' },
    { code: 'JOD', name: 'Jordanian Dinar', nameAr: 'دينار أردني', symbol: 'د.أ', country: 'JO' },
    { code: 'SYP', name: 'Syrian Pound', nameAr: 'ليرة سورية', symbol: 'ل.س', country: 'SY' },
    { code: 'LBP', name: 'Lebanese Pound', nameAr: 'ليرة لبنانية', symbol: 'ل.ل', country: 'LB' },
    { code: 'EGP', name: 'Egyptian Pound', nameAr: 'جنيه مصري', symbol: 'ج.م', country: 'EG' },
    { code: 'SDG', name: 'Sudanese Pound', nameAr: 'جنيه سوداني', symbol: 'ج.س', country: 'SD' },
    { code: 'LYD', name: 'Libyan Dinar', nameAr: 'دينار ليبي', symbol: 'د.ل', country: 'LY' },
    { code: 'TND', name: 'Tunisian Dinar', nameAr: 'دينار تونسي', symbol: 'د.ت', country: 'TN' },
    { code: 'DZD', name: 'Algerian Dinar', nameAr: 'دينار جزائري', symbol: 'د.ج', country: 'DZ' },
    { code: 'MAD', name: 'Moroccan Dirham', nameAr: 'درهم مغربي', symbol: 'د.م', country: 'MA' },
    { code: 'MRU', name: 'Mauritanian Ouguiya', nameAr: 'أوقية موريتانية', symbol: 'أ.م', country: 'MR' },
    { code: 'SOS', name: 'Somali Shilling', nameAr: 'شلن صومالي', symbol: 'S', country: 'SO' },
    { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$', country: null },
    { code: 'EUR', name: 'Euro', nameAr: 'يورو', symbol: '€', country: null },
  ];

  // Calendar systems
  const calendarSystems = [
    { id: 'gregorian', name: 'Gregorian Calendar', nameAr: 'التاريخ الميلادي' },
    { id: 'hijri', name: 'Hijri Calendar', nameAr: 'التاريخ الهجري' },
    { id: 'both', name: 'Both Calendars', nameAr: 'الميلادي والهجري معاً' },
  ];

  // Fetch logo URLs when logo IDs change
  useEffect(() => {
    const fetchLogoUrl = async (logoId: number, isIcon: boolean = false) => {
      try {
        const { data } = await api.get(`/media/${logoId}`);
        const url = data.data?.url || data.data?.path || data.data?.imageUrl;
        
        if (url) {
          setCompanyForm(prev => ({
            ...prev,
            [isIcon ? 'logo_icon_url' : 'logo_url']: url
          }));
        }
      } catch (error) {
        console.error('Error fetching logo:', error);
      }
    };

    if (companyForm.logo) {
      fetchLogoUrl(companyForm.logo);
    }
    if (companyForm.logo_icon) {
      fetchLogoUrl(companyForm.logo_icon, true);
    }
  }, [companyForm.logo, companyForm.logo_icon]);

  // Update company form when admin data loads
 // Update company form when admin data loads
useEffect(() => {
  if (adminData) {
    const data = adminData as AdminData;
    console.log('Setting form with admin data:', data);
    
    // جلب ID الـ Admin وتخزينه
    setAdminId(data.id);
    
    // التحضير للبيانات
    const phones = data.phone ? [data.phone] : [];
    
    // استخراج الـ URL من الـ logo object إذا كان object
    let logoUrl = '';
    let logoId: number | null = null;
    
    if (data.logo) {
      if (typeof data.logo === 'object' && data.logo !== null) {
        // لو logo كان object
        logoUrl = data.logo.fullUrl || data.logo.previewUrl || data.logo.url || '';
        logoId = data.logo.id;
      } else if (typeof data.logo === 'number') {
        // لو logo كان number
        logoId = data.logo;
        logoUrl = data.logoUrl || '';
      } else if (typeof data.logo === 'string') {
        // لو logo كان string URL
        logoUrl = data.logo;
      }
    }
    
    // نفس الشيء لـ logo_icon
    let logoIconUrl = '';
    let logoIconId: number | null = null;
    
    if (data.logo_icon) {
      if (typeof data.logo_icon === 'object' && data.logo_icon !== null) {
        logoIconUrl = data.logo_icon.fullUrl || data.logo_icon.previewUrl || data.logo_icon.url || '';
        logoIconId = data.logo_icon.id;
      } else if (typeof data.logo_icon === 'number') {
        logoIconId = data.logo_icon;
        logoIconUrl = data.logo_icon || '';
      } else if (typeof data.logo_icon === 'string') {
        logoIconUrl = data.logo_icon;
      }
    }
    
    // استخدام imageUrl إذا كان موجود
    const finalLogoUrl = logoUrl || data.imageUrl || '';
    
    setCompanyForm({
      name: data.name || '',
      name_ar: data.name_ar || data.name || '',
      address: data.address || '',
      phone: data.phone || '',
      email: data.email || '',
      website: data.website || '',
      tax_id: data.tax_id || '',
      commercial_register: data.commercial_register || '',
      country: data.country || 'YE',
      currency: data.currency || 'YER',
      date: data.date || new Date().toISOString().split('T')[0],
      logo: logoId, // استخدم الـ ID فقط
      logo_icon: logoIconId, // استخدم الـ ID فقط
      logo_url: finalLogoUrl, // الـ URL الكامل
      logo_icon_url: logoIconUrl,
      phones: phones,
      calendar_system: data.calendar_system || 'gregorian',
      tax_rate: data.tax_rate || 0,
      password: ''
    });

    if (logoId) {
      setLogoId(logoId);
    }
    if (logoIconId) {
      setLogoIconId(logoIconId);
    }
    
    console.log('Form set with:', {
      logoId,
      logoUrl: finalLogoUrl,
      logoIconId,
      logoIconUrl
    });
  }
}, [adminData]);

  // Handle logo upload success
  const handleLogoUploadSuccess = (ids: number[], type: 'full' | 'icon') => {
    if (ids.length > 0) {
      if (type === 'full') {
        setCompanyForm(prev => ({ ...prev, logo: ids[0] }));
        setLogoId(ids[0]);
        
        // جلب الـ URL تلقائياً بعد الرفع
        setTimeout(() => {
          const fetchUrl = async () => {
            try {
              const { data } = await api.get(`/media/${ids[0]}`);
              const url = data.data?.url || data.data?.path;
              if (url) {
                setCompanyForm(prev => ({ ...prev, logo_url: url }));
              }
            } catch (error) {
              console.error('Error fetching uploaded logo URL:', error);
            }
          };
          fetchUrl();
        }, 1000);
      } else {
        setCompanyForm(prev => ({ ...prev, logo_icon: ids[0] }));
        setLogoIconId(ids[0]);
        
        // جلب الـ URL تلقائياً بعد الرفع
        setTimeout(() => {
          const fetchUrl = async () => {
            try {
              const { data } = await api.get(`/media/${ids[0]}`);
              const url = data.data?.url || data.data?.path;
              if (url) {
                setCompanyForm(prev => ({ ...prev, logo_icon_url: url }));
              }
            } catch (error) {
              console.error('Error fetching uploaded icon URL:', error);
            }
          };
          fetchUrl();
        }, 1000);
      }
      
      toast({
        title: language === 'ar' ? 'تم رفع الشعار بنجاح' : 'Logo uploaded successfully',
        variant: 'default'
      });
    }
  };

  // Handle adding phone number
  const addPhoneNumber = () => {
    setCompanyForm(prev => ({ ...prev, phones: [...prev.phones, ''] }));
  };

  // Handle removing phone number
  const removePhoneNumber = (index: number) => {
    setCompanyForm(prev => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index)
    }));
  };

  // Handle updating phone number
  const updatePhoneNumber = (index: number, value: string) => {
    setCompanyForm(prev => ({
      ...prev,
      phones: prev.phones.map((p, i) => i === index ? value : p)
    }));
  };

  // Update admin settings mutation
  const updateAdminMutation = useMutation({
    mutationFn: async (formData: typeof companyForm) => {
      if (!adminId) {
        throw new Error('Admin ID not found');
      }

      // تحضير البيانات للإرسال
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dataToSend: any = {
        name: formData.name,
        name_ar: formData.name_ar,
        address: formData.address,
        phone: formData.phone || formData.phones[0] || '', // استخدام أول رقم إذا كان phones فارغ
        email: formData.email,
        website: formData.website,
        tax_id: formData.tax_id,
        commercial_register: formData.commercial_register,
        country: formData.country,
        currency: formData.currency,
        date: formData.date,
        logo: formData.logo,
        logo_icon: formData.logo_icon,
      };

      // فقط إذا كان المستخدم أدخل كلمة مرور جديدة
      if (formData.password && formData.password.trim() !== '') {
        dataToSend.password = formData.password;
      }

      console.log('Sending update data:', dataToSend);
      
      // استخدام الـ ID الديناميكي
      const response = await api.put(`/admin/${adminId}`, dataToSend);
      return response.data;
    },
    onSuccess: (data) => {
      console.log('Update successful:', data);
      toast({
        title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully',
        variant: 'default'
      });
      queryClient.invalidateQueries({ queryKey: ['admin-data'] });
      setIsEditingCompany(false);
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      console.error('Update error:', error);
      toast({
        title: language === 'ar' ? 'خطأ في الحفظ' : 'Error saving',
        description: error.response?.data?.message || error.message || 'Something went wrong',
        variant: 'destructive'
      });
    }
  });

  const handleSaveCompany = () => {
    updateAdminMutation.mutate(companyForm);
  };

  const t = {
    title: language === 'ar' ? 'الإعدادات' : 'Settings',
    general: language === 'ar' ? 'عام' : 'General',
    business: language === 'ar' ? 'الأعمال' : 'Business',
    system: language === 'ar' ? 'النظام' : 'System',
    edit: language === 'ar' ? 'تعديل' : 'Edit',
    save: language === 'ar' ? 'حفظ' : 'Save',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    companyName: language === 'ar' ? 'اسم الشركة' : 'Company Name',
    companyNameAr: language === 'ar' ? 'اسم الشركة (بالعربية)' : 'Company Name (Arabic)',
    address: language === 'ar' ? 'العنوان' : 'Address',
    phone: language === 'ar' ? 'الهاتف' : 'Phone',
    email: language === 'ar' ? 'البريد الإلكتروني' : 'Email',
    website: language === 'ar' ? 'الموقع' : 'Website',
    taxNumber: language === 'ar' ? 'الرقم الضريبي' : 'Tax Number',
    commercialReg: language === 'ar' ? 'السجل التجاري' : 'Commercial Register',
    defaultCurrency: language === 'ar' ? 'العملة الافتراضية' : 'Default Currency',
    currencies: language === 'ar' ? 'العملات المتاحة' : 'Available Currencies',
    systemLanguage: language === 'ar' ? 'لغة النظام' : 'System Language',
    password: language === 'ar' ? 'كلمة المرور' : 'Password',
    changePassword: language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password',
    leaveEmpty: language === 'ar' ? 'اترك فارغاً إذا لم ترد التغيير' : 'Leave empty if you do not wish to change',
    currentLogo: language === 'ar' ? 'الشعار الحالي' : 'Current Logo',
    uploadNewLogo: language === 'ar' ? 'رفع شعار جديد' : 'Upload New Logo',
  };

  const getSectionsByCategory = (category: 'general' | 'business' | 'system') => {
    return sections.filter(s => s.category === category);
  };

  const activeConfig = sections.find(s => s.id === activeSection);

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'company':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Header with Edit Button */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">{language === 'ar' ? 'معلومات الشركة' : 'Company Information'}</h2>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إدارة معلومات وهوية شركتك' : 'Manage your company details and branding'}
                </p>
              </div>
              {!isEditingCompany ? (
                <Button onClick={() => setIsEditingCompany(true)} className="gap-2">
                  <Edit size={16} />
                  {t.edit}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditingCompany(false)}
                    disabled={updateAdminMutation.isPending}
                  >
                    {t.cancel}
                  </Button>
                  <Button 
                    className="gradient-success gap-2"
                    onClick={handleSaveCompany}
                    disabled={updateAdminMutation.isPending || !adminId}
                  >
                    {updateAdminMutation.isPending ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        {t.save}
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>

            {/* Logos Section */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Image size={18} />
                  {language === 'ar' ? 'شعارات الشركة' : 'Company Logos'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Full Logo */}
<div className="space-y-3">
  <Label className="text-sm text-muted-foreground">
    {language === 'ar' ? 'الشعار الكامل' : 'Full Logo'}
  </Label>
  <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center min-h-[140px] bg-muted/10 hover:bg-muted/20 transition-colors">
    {companyForm.logo_url || (companyForm.logo && typeof companyForm.logo === 'string') ? (
      <div className="relative group">
        <img 
          src={companyForm.logo_url || (companyForm.logo as string)} 
          alt="Logo" 
          className="max-h-20 max-w-full object-contain" 
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden text-center">
          <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'لا يمكن عرض الصورة' : 'Cannot display image'}
          </p>
        </div>
        {isEditingCompany && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -end-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => {
              setCompanyForm(prev => ({ 
                ...prev, 
                logo: null,
                logo_url: '' 
              }));
              setLogoId(null);
            }}
          >
            <X size={12} />
          </Button>
        )}
      </div>
    ) : (
      <div className="text-center">
        <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          {language === 'ar' ? 'لا يوجد شعار' : 'No logo'}
        </p>
      </div>
    )}
    {isEditingCompany && (
      <div className="mt-4">
        <FileUploader
          label=""
          onUploadSuccess={(ids) => handleLogoUploadSuccess(ids, 'full')}
          onUploadError={(error) => {
            toast({
              title: language === 'ar' ? 'خطأ في رفع الشعار' : 'Error uploading logo',
              variant: 'destructive'
            });
          }}
          multiple={false}
          accept="image/*"
          maxFiles={1}
        />
      </div>
    )}
  </div>
</div>

              {/* Icon Logo */}
<div className="space-y-3">
  <Label className="text-sm text-muted-foreground">
    {language === 'ar' ? 'أيقونة الشعار' : 'Logo Icon'}
  </Label>
  <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center min-h-[140px] bg-muted/10 hover:bg-muted/20 transition-colors">
    {companyForm.logo_icon_url || (companyForm.logo_icon && typeof companyForm.logo_icon === 'string') ? (
      <div className="relative group">
        <img 
          src={companyForm.logo_icon_url || (companyForm.logo_icon as string)} 
          alt="Icon" 
          className="max-h-16 max-w-16 object-contain" 
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
        />
        <div className="hidden text-center">
          <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">
            {language === 'ar' ? 'لا يمكن عرض الصورة' : 'Cannot display image'}
          </p>
        </div>
        {isEditingCompany && (
          <Button
            variant="destructive"
            size="icon"
            className="absolute -top-2 -end-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => {
              setCompanyForm(prev => ({ 
                ...prev, 
                logo_icon: null,
                logo_icon_url: '' 
              }));
              setLogoIconId(null);
            }}
          >
            <X size={12} />
          </Button>
        )}
      </div>
    ) : (
      <div className="text-center">
        <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
        <p className="text-sm text-muted-foreground">
          {language === 'ar' ? 'لا يوجد أيقونة' : 'No icon'}
        </p>
      </div>
    )}
    {isEditingCompany && (
      <div className="mt-4">
        <FileUploader
          label=""
          onUploadSuccess={(ids) => handleLogoUploadSuccess(ids, 'icon')}
          onUploadError={(error) => {
            toast({
              title: language === 'ar' ? 'خطأ في رفع الأيقونة' : 'Error uploading icon',
              variant: 'destructive'
            });
          }}
          multiple={false}
          accept="image/*"
          maxFiles={1}
        />
      </div>
    )}
  </div>
</div>
                </div>
              </CardContent>
            </Card>

            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 size={18} />
                  {language === 'ar' ? 'المعلومات الأساسية' : 'Basic Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.companyName}</Label>
                    <Input 
                      value={companyForm.name} 
                      onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} 
                      disabled={!isEditingCompany} 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.companyNameAr}</Label>
                    <Input 
                      value={companyForm.name_ar} 
                      onChange={(e) => setCompanyForm({ ...companyForm, name_ar: e.target.value })} 
                      disabled={!isEditingCompany} 
                      dir="rtl" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin size={14} />
                    {t.address}
                  </Label>
                  <Input 
                    value={companyForm.address} 
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} 
                    disabled={!isEditingCompany} 
                  />
                </div>
              </CardContent>
            </Card>

            {/* Contact Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone size={18} />
                  {language === 'ar' ? 'معلومات الاتصال' : 'Contact Information'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Phone size={14} />
                      {t.phone}
                    </Label>
                    <Input 
                      value={companyForm.phone} 
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} 
                      disabled={!isEditingCompany} 
                      dir="ltr" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail size={14} />
                      {t.email}
                    </Label>
                    <Input 
                      value={companyForm.email} 
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} 
                      disabled={!isEditingCompany} 
                      type="email" 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe size={14} />
                      {t.website}
                    </Label>
                    <Input 
                      value={companyForm.website} 
                      onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} 
                      disabled={!isEditingCompany} 
                      dir="ltr" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <FileText size={14} />
                      {t.taxNumber}
                    </Label>
                    <Input 
                      value={companyForm.tax_id} 
                      onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })} 
                      disabled={!isEditingCompany} 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.commercialReg}</Label>
                  <Input 
                    value={companyForm.commercial_register} 
                    onChange={(e) => setCompanyForm({ ...companyForm, commercial_register: e.target.value })} 
                    disabled={!isEditingCompany} 
                  />
                </div>

                {/* Additional Phones */}
                {isEditingCompany && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3">
                      <Label>
                        {language === 'ar' ? 'أرقام إضافية' : 'Additional Numbers'}
                      </Label>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={addPhoneNumber}
                        disabled={companyForm.phones.length >= 5}
                      >
                        <Plus size={14} className="me-1" />
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </Button>
                    </div>
                    {companyForm.phones.map((phone, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input 
                          value={phone} 
                          onChange={(e) => updatePhoneNumber(index, e.target.value)} 
                          dir="ltr" 
                          placeholder="+967 XXX XXX XXX"
                        />
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => removePhoneNumber(index)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Regional Settings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Flag size={18} />
                  {language === 'ar' ? 'الإعدادات الإقليمية' : 'Regional Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Country */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Flag size={14} />
                      {language === 'ar' ? 'الدولة' : 'Country'}
                    </Label>
                    <Select 
                      value={companyForm.country} 
                      onValueChange={(val) => setCompanyForm({ ...companyForm, country: val })}
                      disabled={!isEditingCompany}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {arabCountries.map(country => (
                          <SelectItem key={country.code} value={country.code}>
                            <span className="flex items-center gap-2">
                              <span>{language === 'ar' ? country.nameAr : country.name}</span>
                              <span className="text-muted-foreground text-xs">({country.code})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign size={14} />
                      {language === 'ar' ? 'العملة' : 'Currency'}
                    </Label>
                    <Select 
                      value={companyForm.currency} 
                      onValueChange={(val) => setCompanyForm({ ...companyForm, currency: val })}
                      disabled={!isEditingCompany}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {arabCurrencies.map(currency => (
                          <SelectItem key={currency.code} value={currency.code}>
                            <span className="flex items-center gap-2">
                              <span className="font-bold">{currency.symbol}</span>
                              <span>{language === 'ar' ? currency.nameAr : currency.name}</span>
                              <span className="text-muted-foreground text-xs">({currency.code})</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Calendar System */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar size={14} />
                      {language === 'ar' ? 'نظام التاريخ' : 'Calendar System'}
                    </Label>
                    <Select 
                      value={companyForm.calendar_system} 
                      onValueChange={(val: 'gregorian' | 'hijri' | 'both') => setCompanyForm({ ...companyForm, calendar_system: val })}
                      disabled={!isEditingCompany}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {calendarSystems.map(system => (
                          <SelectItem key={system.id} value={system.id}>
                            {language === 'ar' ? system.nameAr : system.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Visual representation of selected options */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                  <div className={cn(
                    "p-4 rounded-lg border-2 text-center transition-all",
                    isEditingCompany ? "border-primary bg-primary/5" : "border-border bg-muted/20"
                  )}>
                    <p className="text-2xl mb-1">🏴</p>
                    <p className="text-sm font-medium">
                      {arabCountries.find(c => c.code === companyForm.country)?.[language === 'ar' ? 'nameAr' : 'name'] || companyForm.country}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'الدولة' : 'Country'}
                    </p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-lg border-2 text-center transition-all",
                    isEditingCompany ? "border-primary bg-primary/5" : "border-border bg-muted/20"
                  )}>
                    <p className="text-2xl mb-1">
                      {arabCurrencies.find(c => c.code === companyForm.currency)?.symbol || '$'}
                    </p>
                    <p className="text-sm font-medium">
                      {arabCurrencies.find(c => c.code === companyForm.currency)?.[language === 'ar' ? 'nameAr' : 'name'] || companyForm.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'العملة' : 'Currency'}
                    </p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-lg border-2 text-center transition-all",
                    isEditingCompany ? "border-primary bg-primary/5" : "border-border bg-muted/20"
                  )}>
                    <p className="text-2xl mb-1">📅</p>
                    <p className="text-sm font-medium">
                      {calendarSystems.find(s => s.id === companyForm.calendar_system)?.[language === 'ar' ? 'nameAr' : 'name'] || companyForm.calendar_system}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'التقويم' : 'Calendar'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Password Section (Optional) */}
            {isEditingCompany && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield size={18} />
                    {language === 'ar' ? 'تغيير كلمة المرور' : 'Change Password'}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {language === 'ar' ? 'اترك الحقل فارغاً إذا لم ترد تغيير كلمة المرور' : 'Leave field empty if you don\'t want to change password'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>{t.password}</Label>
                    <Input 
                      type="password"
                      value={companyForm.password} 
                      onChange={(e) => setCompanyForm({ ...companyForm, password: e.target.value })} 
                      placeholder={language === 'ar' ? 'أدخل كلمة مرور جديدة' : 'Enter new password'}
                      autoComplete="new-password"
                    />
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? 'كلمة المرور يجب أن تكون على الأقل 6 أحرف' : 'Password must be at least 6 characters'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 'branches':
        return <BranchesWarehouses />;

      case 'modules':
        return <ModuleSettings />;

      case 'currency':
        return <CurrencyTaxManager />;

      case 'payment':
        return <PaymentMethodsManager />;

      case 'printing':
        return <PrintingSettings />;

      case 'import-export':
        return <DataImportExport />;

      case 'users':
        return <UsersPermissions />;

      case 'data-management':
        return <DataManagement />;

      case 'audit-log':
        return <AuditLogViewer />;

      case 'backup':
        return <BackupManager />;

      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <SettingsIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">
                {language === 'ar' ? 'اختر قسم من القائمة' : 'Select a section from the menu'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ar' ? 'قم باختيار قسم للإعدادات لعرض محتوياته' : 'Select a settings section to view its contents'}
              </p>
            </div>
          </div>
        );
    }
  };

  // Show loading while fetching admin data
  if (!adminData && !adminId) {
    return (
      <MainLayout activeItem="settings">
        <div className="h-[calc(100vh-4rem)] flex items-center justify-center" dir={direction}>
          <div className="text-center">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">
              {language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading data...'}
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout activeItem="settings">
      <div className="h-[calc(100vh-4rem)]" dir={direction}>
        <div className="flex h-full gap-6">
          {/* Sidebar Navigation */}
          <div className={cn(
            "flex-shrink-0 hidden lg:block transition-all duration-300 relative",
            sidebarCollapsed ? "w-16" : "w-72"
          )}>
            {/* Collapse Toggle Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className={cn(
                "absolute top-4 z-10 w-6 h-6 rounded-full bg-primary flex items-center justify-center",
                "text-primary-foreground shadow-md hover:bg-primary/90 transition-colors",
                direction === 'rtl' ? "-left-3" : "-right-3"
              )}
              title={sidebarCollapsed 
                ? (language === 'ar' ? 'توسيع القائمة' : 'Expand menu')
                : (language === 'ar' ? 'طي القائمة' : 'Collapse menu')
              }
            >
              {direction === 'rtl' 
                ? (sidebarCollapsed ? <ChevronLeft size={14} /> : <ChevronRight size={14} />)
                : (sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />)
              }
            </button>

            <Card className="h-full">
              {!sidebarCollapsed && (
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                      <SettingsIcon className="text-primary" size={22} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{t.title}</CardTitle>
                      <CardDescription className="text-xs">
                        {language === 'ar' ? 'إدارة إعدادات النظام' : 'Manage system settings'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              )}
              <CardContent className={cn("p-0", sidebarCollapsed && "pt-10")}>
                <ScrollArea className={sidebarCollapsed ? "h-[calc(100vh-8rem)]" : "h-[calc(100vh-12rem)]"}>
                  <div className={cn("pb-3 space-y-4", sidebarCollapsed ? "px-1" : "px-3")}>
                    {/* General */}
                    <div>
                      {!sidebarCollapsed && (
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                          {t.general}
                        </p>
                      )}
                      <div className="space-y-1">
                        {getSectionsByCategory('general').map((section) => (
                          <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            title={sidebarCollapsed ? (language === 'ar' ? section.labelAr : section.label) : undefined}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-lg text-start transition-all",
                              sidebarCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                              activeSection === section.id
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "hover:bg-muted"
                            )}
                          >
                            <section.icon size={18} />
                            {!sidebarCollapsed && (
                              <>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {language === 'ar' ? section.labelAr : section.label}
                                  </p>
                                  <p className={cn(
                                    "text-xs truncate",
                                    activeSection === section.id ? "text-primary-foreground/70" : "text-muted-foreground"
                                  )}>
                                    {language === 'ar' ? section.descriptionAr : section.description}
                                  </p>
                                </div>
                                <ChevronRight size={16} className={cn(
                                  "transition-transform",
                                  activeSection === section.id && "rotate-90"
                                )} />
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Business */}
                    <div>
                      {!sidebarCollapsed && (
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                          {t.business}
                        </p>
                      )}
                      <div className="space-y-1">
                        {getSectionsByCategory('business').map((section) => (
                          <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            title={sidebarCollapsed ? (language === 'ar' ? section.labelAr : section.label) : undefined}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-lg text-start transition-all",
                              sidebarCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                              activeSection === section.id
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "hover:bg-muted"
                            )}
                          >
                            <section.icon size={18} />
                            {!sidebarCollapsed && (
                              <>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {language === 'ar' ? section.labelAr : section.label}
                                  </p>
                                  <p className={cn(
                                    "text-xs truncate",
                                    activeSection === section.id ? "text-primary-foreground/70" : "text-muted-foreground"
                                  )}>
                                    {language === 'ar' ? section.descriptionAr : section.description}
                                  </p>
                                </div>
                                <ChevronRight size={16} className={cn(
                                  "transition-transform",
                                  activeSection === section.id && "rotate-90"
                                )} />
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* System */}
                    <div>
                      {!sidebarCollapsed && (
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">
                          {t.system}
                        </p>
                      )}
                      <div className="space-y-1">
                        {getSectionsByCategory('system').map((section) => (
                          <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            title={sidebarCollapsed ? (language === 'ar' ? section.labelAr : section.label) : undefined}
                            className={cn(
                              "w-full flex items-center gap-3 rounded-lg text-start transition-all",
                              sidebarCollapsed ? "justify-center px-2 py-3" : "px-3 py-2.5",
                              activeSection === section.id
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "hover:bg-muted"
                            )}
                          >
                            <section.icon size={18} />
                            {!sidebarCollapsed && (
                              <>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">
                                    {language === 'ar' ? section.labelAr : section.label}
                                  </p>
                                  <p className={cn(
                                    "text-xs truncate",
                                    activeSection === section.id ? "text-primary-foreground/70" : "text-muted-foreground"
                                  )}>
                                    {language === 'ar' ? section.descriptionAr : section.description}
                                  </p>
                                </div>
                                <ChevronRight size={16} className={cn(
                                  "transition-transform",
                                  activeSection === section.id && "rotate-90"
                                )} />
                              </>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Navigation */}
          <div className="lg:hidden w-full mb-4">
            <Select value={activeSection} onValueChange={setActiveSection}>
              <SelectTrigger className="w-full">
                <SelectValue>
                  {activeConfig && (
                    <span className="flex items-center gap-2">
                      <activeConfig.icon size={16} />
                      {language === 'ar' ? activeConfig.labelAr : activeConfig.label}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    <span className="flex items-center gap-2">
                      <section.icon size={16} />
                      {language === 'ar' ? section.labelAr : section.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="pe-4 pb-6">
                {renderSectionContent()}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;