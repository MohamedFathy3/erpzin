import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
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
  Languages,
  Users,
  Upload,
  X,
  Image,
  Warehouse,
  Cog,
  Database,
  ChevronRight,
  Shield,
  CreditCard,
  Bell,
  Palette,
  Flag,
  Calendar,
  Printer
} from 'lucide-react';
import UsersPermissions from '@/components/settings/UsersPermissions';
import BranchesWarehouses from '@/components/settings/BranchesWarehouses';
import ModuleSettings from '@/components/settings/ModuleSettings';
import PaymentMethodsManager from '@/components/settings/PaymentMethodsManager';
import BackupManager from '@/components/settings/BackupManager';
import PrintingSettings from '@/components/settings/PrintingSettings';
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

const Settings = () => {
  const { language, direction, setLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const [activeSection, setActiveSection] = useState('company');
  const [isEditingCompany, setIsEditingCompany] = useState(false);

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
      id: 'currency', 
      icon: DollarSign, 
      label: 'Currency & Taxes', 
      labelAr: 'العملات والضرائب',
      description: 'Financial settings',
      descriptionAr: 'الإعدادات المالية',
      category: 'business'
    },
    { 
      id: 'payment', 
      icon: CreditCard, 
      label: 'Payment Methods', 
      labelAr: 'طرق الدفع',
      description: 'Configure payment options',
      descriptionAr: 'تهيئة خيارات الدفع',
      category: 'business'
    },
    { 
      id: 'modules', 
      icon: Cog, 
      label: 'Module Settings', 
      labelAr: 'إعدادات الموديولات',
      description: 'Configure system modules',
      descriptionAr: 'تهيئة وحدات النظام',
      category: 'business'
    },
    { 
      id: 'printing', 
      icon: Printer, 
      label: 'Printing & Documents', 
      labelAr: 'الطباعة والمستندات',
      description: 'Invoice design and printers',
      descriptionAr: 'تصميم الفواتير والطابعات',
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
      id: 'backup', 
      icon: Database, 
      label: 'Backup & Restore', 
      labelAr: 'النسخ الاحتياطي',
      description: 'Data backup management',
      descriptionAr: 'إدارة النسخ الاحتياطية',
      category: 'system'
    },
  ];

  // Fetch company settings
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('company_settings').select('*').single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch tax rates
  const { data: taxRates = [] } = useQuery({
    queryKey: ['tax-rates'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tax_rates').select('*').order('rate', { ascending: true });
      if (error) throw error;
      return data;
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
    tax_number: '',
    commercial_register: '',
    default_currency: 'YER',
    tax_rate: 0,
    logo_url: '',
    logo_icon_url: '',
    phones: [] as string[],
    country: 'YE',
    calendar_system: 'gregorian' as 'gregorian' | 'hijri' | 'both'
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

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingLogoIcon, setUploadingLogoIcon] = useState(false);

  // Update company form when data loads
  React.useEffect(() => {
    if (companySettings) {
      setCompanyForm({
        name: companySettings.name || '',
        name_ar: companySettings.name_ar || '',
        address: companySettings.address || '',
        phone: companySettings.phone || '',
        email: companySettings.email || '',
        website: companySettings.website || '',
        tax_number: companySettings.tax_number || '',
        commercial_register: companySettings.commercial_register || '',
        default_currency: companySettings.default_currency || 'YER',
        tax_rate: companySettings.tax_rate || 0,
        logo_url: (companySettings as any).logo_url || '',
        logo_icon_url: (companySettings as any).logo_icon_url || '',
        phones: (companySettings as any).phones || [],
        country: (companySettings as any).country || 'YE',
        calendar_system: (companySettings as any).calendar_system || 'gregorian'
      });
    }
  }, [companySettings]);

  // Handle logo upload
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'full' | 'icon') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const setUploading = type === 'full' ? setUploadingLogo : setUploadingLogoIcon;
    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${type}-logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      if (type === 'full') {
        setCompanyForm(prev => ({ ...prev, logo_url: publicUrl }));
      } else {
        setCompanyForm(prev => ({ ...prev, logo_icon_url: publicUrl }));
      }

      toast({ title: language === 'ar' ? 'تم رفع الشعار بنجاح' : 'Logo uploaded successfully' });
    } catch (error) {
      toast({ title: language === 'ar' ? 'خطأ في رفع الشعار' : 'Error uploading logo', variant: 'destructive' });
    } finally {
      setUploading(false);
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

  // Use arabCurrencies for currency selection
  const currencies = arabCurrencies;

  const handleSaveCompany = async () => {
    if (!companySettings?.id) return;
    
    const { error } = await supabase
      .from('company_settings')
      .update(companyForm)
      .eq('id', companySettings.id);
    
    if (error) {
      toast({ title: language === 'ar' ? 'خطأ في الحفظ' : 'Error saving', variant: 'destructive' });
    } else {
      toast({ title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully' });
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      setIsEditingCompany(false);
    }
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
    taxSettings: language === 'ar' ? 'إعدادات الضرائب' : 'Tax Settings',
    taxName: language === 'ar' ? 'اسم الضريبة' : 'Tax Name',
    rate: language === 'ar' ? 'النسبة' : 'Rate',
    default: language === 'ar' ? 'افتراضي' : 'Default',
    active: language === 'ar' ? 'نشط' : 'Active',
    inactive: language === 'ar' ? 'غير نشط' : 'Inactive',
    addTax: language === 'ar' ? 'إضافة ضريبة' : 'Add Tax',
    systemLanguage: language === 'ar' ? 'لغة النظام' : 'System Language',
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
                <p className="text-sm text-muted-foreground">{language === 'ar' ? 'إدارة معلومات وهوية شركتك' : 'Manage your company details and branding'}</p>
              </div>
              {!isEditingCompany ? (
                <Button onClick={() => setIsEditingCompany(true)} className="gap-2">
                  <Edit size={16} />
                  {t.edit}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditingCompany(false)}>
                    {t.cancel}
                  </Button>
                  <Button className="gradient-success gap-2" onClick={handleSaveCompany}>
                    <Save size={16} />
                    {t.save}
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
                      {companyForm.logo_url ? (
                        <div className="relative group">
                          <img src={companyForm.logo_url} alt="Logo" className="max-h-20 max-w-full object-contain" />
                          {isEditingCompany && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -end-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setCompanyForm(prev => ({ ...prev, logo_url: '' }))}
                            >
                              <X size={12} />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground">{language === 'ar' ? 'لا يوجد شعار' : 'No logo'}</p>
                        </div>
                      )}
                      {isEditingCompany && (
                        <label className="mt-4">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'full')} disabled={uploadingLogo} />
                          <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                            <span className="cursor-pointer">{uploadingLogo ? (language === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (language === 'ar' ? 'رفع شعار' : 'Upload')}</span>
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Icon Logo */}
                  <div className="space-y-3">
                    <Label className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'أيقونة الشعار' : 'Logo Icon'}
                    </Label>
                    <div className="border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center min-h-[140px] bg-muted/10 hover:bg-muted/20 transition-colors">
                      {companyForm.logo_icon_url ? (
                        <div className="relative group">
                          <img src={companyForm.logo_icon_url} alt="Icon" className="max-h-16 max-w-16 object-contain" />
                          {isEditingCompany && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute -top-2 -end-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setCompanyForm(prev => ({ ...prev, logo_icon_url: '' }))}
                            >
                              <X size={12} />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="mx-auto h-10 w-10 text-muted-foreground/50 mb-2" />
                          <p className="text-sm text-muted-foreground">{language === 'ar' ? 'لا يوجد أيقونة' : 'No icon'}</p>
                        </div>
                      )}
                      {isEditingCompany && (
                        <label className="mt-4">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, 'icon')} disabled={uploadingLogoIcon} />
                          <Button variant="outline" size="sm" asChild disabled={uploadingLogoIcon}>
                            <span className="cursor-pointer">{uploadingLogoIcon ? (language === 'ar' ? 'جاري الرفع...' : 'Uploading...') : (language === 'ar' ? 'رفع أيقونة' : 'Upload')}</span>
                          </Button>
                        </label>
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
                    <Input value={companyForm.name} onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })} disabled={!isEditingCompany} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.companyNameAr}</Label>
                    <Input value={companyForm.name_ar} onChange={(e) => setCompanyForm({ ...companyForm, name_ar: e.target.value })} disabled={!isEditingCompany} dir="rtl" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><MapPin size={14} />{t.address}</Label>
                  <Input value={companyForm.address} onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })} disabled={!isEditingCompany} />
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
                    <Label className="flex items-center gap-2"><Phone size={14} />{t.phone}</Label>
                    <Input value={companyForm.phone} onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })} disabled={!isEditingCompany} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Mail size={14} />{t.email}</Label>
                    <Input value={companyForm.email} onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })} disabled={!isEditingCompany} type="email" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Globe size={14} />{t.website}</Label>
                    <Input value={companyForm.website} onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })} disabled={!isEditingCompany} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2"><FileText size={14} />{t.taxNumber}</Label>
                    <Input value={companyForm.tax_number} onChange={(e) => setCompanyForm({ ...companyForm, tax_number: e.target.value })} disabled={!isEditingCompany} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t.commercialReg}</Label>
                  <Input value={companyForm.commercial_register} onChange={(e) => setCompanyForm({ ...companyForm, commercial_register: e.target.value })} disabled={!isEditingCompany} />
                </div>

                {/* Additional Phones */}
                {isEditingCompany && (
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-3">
                      <Label>{language === 'ar' ? 'أرقام إضافية' : 'Additional Numbers'}</Label>
                      <Button variant="outline" size="sm" onClick={addPhoneNumber}>
                        <Plus size={14} className="me-1" />
                        {language === 'ar' ? 'إضافة' : 'Add'}
                      </Button>
                    </div>
                    {companyForm.phones.map((phone, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <Input value={phone} onChange={(e) => updatePhoneNumber(index, e.target.value)} dir="ltr" />
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => removePhoneNumber(index)}>
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

                  {/* Default Currency */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign size={14} />
                      {language === 'ar' ? 'العملة الافتراضية' : 'Default Currency'}
                    </Label>
                    <Select 
                      value={companyForm.default_currency} 
                      onValueChange={(val) => setCompanyForm({ ...companyForm, default_currency: val })}
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
                    <p className="text-xs text-muted-foreground">{language === 'ar' ? 'الدولة' : 'Country'}</p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-lg border-2 text-center transition-all",
                    isEditingCompany ? "border-primary bg-primary/5" : "border-border bg-muted/20"
                  )}>
                    <p className="text-2xl mb-1">
                      {arabCurrencies.find(c => c.code === companyForm.default_currency)?.symbol || '$'}
                    </p>
                    <p className="text-sm font-medium">
                      {arabCurrencies.find(c => c.code === companyForm.default_currency)?.[language === 'ar' ? 'nameAr' : 'name'] || companyForm.default_currency}
                    </p>
                    <p className="text-xs text-muted-foreground">{language === 'ar' ? 'العملة' : 'Currency'}</p>
                  </div>
                  <div className={cn(
                    "p-4 rounded-lg border-2 text-center transition-all",
                    isEditingCompany ? "border-primary bg-primary/5" : "border-border bg-muted/20"
                  )}>
                    <p className="text-2xl mb-1">📅</p>
                    <p className="text-sm font-medium">
                      {calendarSystems.find(s => s.id === companyForm.calendar_system)?.[language === 'ar' ? 'nameAr' : 'name'] || companyForm.calendar_system}
                    </p>
                    <p className="text-xs text-muted-foreground">{language === 'ar' ? 'التقويم' : 'Calendar'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'branches':
        return <BranchesWarehouses />;

      case 'modules':
        return <ModuleSettings />;

      case 'currency':
        return (
          <div className="space-y-6 animate-fade-in">
            {/* Currency Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign size={20} />
                  {language === 'ar' ? 'إعدادات العملة' : 'Currency Settings'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t.defaultCurrency}</Label>
                  <Select value={companyForm.default_currency} onValueChange={(val) => setCompanyForm({ ...companyForm, default_currency: val })}>
                    <SelectTrigger className="w-full max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(currency => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <span className="flex items-center gap-2">
                            <span className="font-mono">{currency.code}</span>
                            <span className="text-muted-foreground">- {language === 'ar' ? currency.nameAr : currency.name}</span>
                            <span>{currency.symbol}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <Label className="mb-3 block">{t.currencies}</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {currencies.map(currency => (
                      <Card 
                        key={currency.code} 
                        className={cn(
                          "p-4 cursor-pointer transition-all hover:scale-105",
                          companyForm.default_currency === currency.code 
                            ? 'border-primary bg-primary/5 shadow-lg shadow-primary/20' 
                            : 'hover:border-primary/50'
                        )}
                        onClick={() => setCompanyForm({ ...companyForm, default_currency: currency.code })}
                      >
                        <div className="text-center">
                          <p className="text-3xl font-bold mb-1">{currency.symbol}</p>
                          <p className="font-mono text-sm font-medium">{currency.code}</p>
                          <p className="text-xs text-muted-foreground">{language === 'ar' ? currency.nameAr : currency.name}</p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax Settings */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Percent size={20} />
                    {t.taxSettings}
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Plus size={16} />
                        {t.addTax}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t.addTax}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>{t.taxName}</Label>
                            <Input placeholder={t.taxName} />
                          </div>
                          <div className="space-y-2">
                            <Label>{language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'}</Label>
                            <Input placeholder={language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name'} dir="rtl" />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>{t.rate} (%)</Label>
                          <Input type="number" placeholder="0" min="0" max="100" />
                        </div>
                        <Button className="w-full gradient-success">{t.addTax}</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.taxName}</TableHead>
                      <TableHead>{t.rate}</TableHead>
                      <TableHead>{t.default}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {taxRates.map((tax) => (
                      <TableRow key={tax.id}>
                        <TableCell className="font-medium">{language === 'ar' ? tax.name_ar || tax.name : tax.name}</TableCell>
                        <TableCell><Badge variant="outline">{tax.rate}%</Badge></TableCell>
                        <TableCell>{tax.is_default && <Badge className="bg-primary">{t.default}</Badge>}</TableCell>
                        <TableCell><Badge variant={tax.is_active ? 'default' : 'secondary'}>{tax.is_active ? t.active : t.inactive}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        );

      case 'payment':
        return <PaymentMethodsManager />;

      case 'printing':
        return <PrintingSettings />;

      case 'users':
        return <UsersPermissions />;

      case 'backup':
        return <BackupManager />;

      default:
        return null;
    }
  };

  return (
    <MainLayout activeItem="settings">
      <div className="h-[calc(100vh-4rem)]" dir={direction}>
        <div className="flex h-full gap-6">
          {/* Sidebar Navigation */}
          <div className="w-72 flex-shrink-0 hidden lg:block">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                    <SettingsIcon className="text-primary" size={22} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{t.title}</CardTitle>
                    <CardDescription className="text-xs">{language === 'ar' ? 'إدارة إعدادات النظام' : 'Manage system settings'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-12rem)]">
                  <div className="px-3 pb-3 space-y-4">
                    {/* General */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">{t.general}</p>
                      <div className="space-y-1">
                        {getSectionsByCategory('general').map((section) => (
                          <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-start transition-all",
                              activeSection === section.id
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "hover:bg-muted"
                            )}
                          >
                            <section.icon size={18} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{language === 'ar' ? section.labelAr : section.label}</p>
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
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Business */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">{t.business}</p>
                      <div className="space-y-1">
                        {getSectionsByCategory('business').map((section) => (
                          <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-start transition-all",
                              activeSection === section.id
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "hover:bg-muted"
                            )}
                          >
                            <section.icon size={18} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{language === 'ar' ? section.labelAr : section.label}</p>
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
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* System */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 mb-2">{t.system}</p>
                      <div className="space-y-1">
                        {getSectionsByCategory('system').map((section) => (
                          <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-start transition-all",
                              activeSection === section.id
                                ? "bg-primary text-primary-foreground shadow-md"
                                : "hover:bg-muted"
                            )}
                          >
                            <section.icon size={18} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{language === 'ar' ? section.labelAr : section.label}</p>
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
