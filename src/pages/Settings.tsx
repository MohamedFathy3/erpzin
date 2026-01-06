import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
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
  Warehouse
} from 'lucide-react';
import UsersPermissions from '@/components/settings/UsersPermissions';
import BranchesWarehouses from '@/components/settings/BranchesWarehouses';

const Settings = () => {
  const { language, direction, setLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('company');
  const [isEditingCompany, setIsEditingCompany] = useState(false);

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
    phones: [] as string[]
  });

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
        phones: (companySettings as any).phones || []
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

  const translations = {
    en: {
      title: 'Settings',
      company: 'Company Info',
      branches: 'Branches & Warehouses',
      currency: 'Currency & Taxes',
      language: 'Language',
      users: 'Users & Permissions',
      companyName: 'Company Name',
      companyNameAr: 'Company Name (Arabic)',
      address: 'Address',
      phone: 'Phone',
      email: 'Email',
      website: 'Website',
      taxNumber: 'Tax Number',
      commercialReg: 'Commercial Register',
      save: 'Save Changes',
      edit: 'Edit',
      cancel: 'Cancel',
      branchName: 'Branch Name',
      branchNameAr: 'Branch Name (Arabic)',
      branchCode: 'Code',
      manager: 'Manager',
      mainBranch: 'Main Branch',
      active: 'Active',
      inactive: 'Inactive',
      addBranch: 'Add Branch',
      editBranch: 'Edit Branch',
      defaultCurrency: 'Default Currency',
      taxRates: 'Tax Rates',
      taxName: 'Tax Name',
      taxNameAr: 'Tax Name (Arabic)',
      rate: 'Rate',
      default: 'Default',
      addTax: 'Add Tax Rate',
      currencies: 'Available Currencies',
      selectLanguage: 'Select Language',
      english: 'English',
      arabic: 'العربية',
      generalSettings: 'General Settings',
      systemLanguage: 'System Language',
      currencySettings: 'Currency Settings',
      taxSettings: 'Tax Settings',
      warehouses: 'Warehouses',
      warehouseName: 'Warehouse Name',
      warehouseNameAr: 'Warehouse Name (Arabic)',
      warehouseCode: 'Code',
      addWarehouse: 'Add Warehouse',
      selectBranch: 'Select Branch',
      linkedBranch: 'Linked Branch',
      mainWarehouse: 'Main Warehouse',
      notes: 'Notes'
    },
    ar: {
      title: 'الإعدادات',
      company: 'معلومات الشركة',
      branches: 'الفروع والمخازن',
      currency: 'العملة والضرائب',
      language: 'اللغة',
      users: 'المستخدمين والصلاحيات',
      companyName: 'اسم الشركة',
      companyNameAr: 'اسم الشركة (بالعربية)',
      address: 'العنوان',
      phone: 'الهاتف',
      email: 'البريد الإلكتروني',
      website: 'الموقع الإلكتروني',
      taxNumber: 'الرقم الضريبي',
      commercialReg: 'السجل التجاري',
      save: 'حفظ التغييرات',
      edit: 'تعديل',
      cancel: 'إلغاء',
      branchName: 'اسم الفرع',
      branchNameAr: 'اسم الفرع (بالعربية)',
      branchCode: 'الرمز',
      manager: 'المدير',
      mainBranch: 'الفرع الرئيسي',
      active: 'نشط',
      inactive: 'غير نشط',
      addBranch: 'إضافة فرع',
      editBranch: 'تعديل الفرع',
      defaultCurrency: 'العملة الافتراضية',
      taxRates: 'معدلات الضرائب',
      taxName: 'اسم الضريبة',
      taxNameAr: 'اسم الضريبة (بالعربية)',
      rate: 'النسبة',
      default: 'افتراضي',
      addTax: 'إضافة ضريبة',
      currencies: 'العملات المتاحة',
      selectLanguage: 'اختر اللغة',
      english: 'English',
      arabic: 'العربية',
      generalSettings: 'الإعدادات العامة',
      systemLanguage: 'لغة النظام',
      currencySettings: 'إعدادات العملة',
      taxSettings: 'إعدادات الضرائب',
      warehouses: 'المخازن',
      warehouseName: 'اسم المخزن',
      warehouseNameAr: 'اسم المخزن (بالعربية)',
      warehouseCode: 'الرمز',
      addWarehouse: 'إضافة مخزن',
      selectBranch: 'اختر الفرع',
      linkedBranch: 'الفرع المرتبط',
      mainWarehouse: 'المخزن الرئيسي',
      notes: 'ملاحظات'
    }
  };

  const t = translations[language];

  const currencies = [
    { code: 'YER', name: 'Yemeni Rial', nameAr: 'ريال يمني', symbol: '﷼' },
    { code: 'SAR', name: 'Saudi Riyal', nameAr: 'ريال سعودي', symbol: '﷼' },
    { code: 'USD', name: 'US Dollar', nameAr: 'دولار أمريكي', symbol: '$' },
    { code: 'EUR', name: 'Euro', nameAr: 'يورو', symbol: '€' },
    { code: 'AED', name: 'UAE Dirham', nameAr: 'درهم إماراتي', symbol: 'د.إ' }
  ];

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

  return (
    <MainLayout activeItem="settings">
      <div className="space-y-6" dir={direction}>
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <SettingsIcon className="text-primary" size={24} />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{t.title}</h1>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building2 size={16} />
              <span className="hidden sm:inline">{t.company}</span>
            </TabsTrigger>
            <TabsTrigger value="branches" className="flex items-center gap-2">
              <Store size={16} />
              <span className="hidden sm:inline">{t.branches}</span>
            </TabsTrigger>
            <TabsTrigger value="currency" className="flex items-center gap-2">
              <DollarSign size={16} />
              <span className="hidden sm:inline">{t.currency}</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users size={16} />
              <span className="hidden sm:inline">{t.users}</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Languages size={16} />
              <span className="hidden sm:inline">{t.language}</span>
            </TabsTrigger>
          </TabsList>

          {/* Company Tab */}
          <TabsContent value="company" className="mt-6">
            <Card className="card-elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t.company}</CardTitle>
                    <CardDescription>
                      {language === 'ar' ? 'معلومات الشركة الأساسية' : 'Basic company information'}
                    </CardDescription>
                  </div>
                  {!isEditingCompany ? (
                    <Button variant="outline" onClick={() => setIsEditingCompany(true)}>
                      <Edit size={16} className="me-2" />
                      {t.edit}
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => setIsEditingCompany(false)}>
                        {t.cancel}
                      </Button>
                      <Button className="gradient-success" onClick={handleSaveCompany}>
                        <Save size={16} className="me-2" />
                        {t.save}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logos Section */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2 text-base font-semibold">
                    <Image size={18} />
                    {language === 'ar' ? 'شعارات الشركة' : 'Company Logos'}
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Full Logo (Expanded Sidebar) */}
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'الشعار الكامل (القائمة المفتوحة)' : 'Full Logo (Expanded Sidebar)'}
                      </Label>
                      <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[120px] bg-muted/20">
                        {companyForm.logo_url ? (
                          <div className="relative group">
                            <img 
                              src={companyForm.logo_url} 
                              alt="Company Logo" 
                              className="max-h-20 max-w-full object-contain"
                            />
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
                            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              {language === 'ar' ? 'لا يوجد شعار' : 'No logo uploaded'}
                            </p>
                          </div>
                        )}
                        {isEditingCompany && (
                          <label className="mt-3">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleLogoUpload(e, 'full')}
                              disabled={uploadingLogo}
                            />
                            <Button variant="outline" size="sm" asChild disabled={uploadingLogo}>
                              <span className="cursor-pointer">
                                {uploadingLogo 
                                  ? (language === 'ar' ? 'جاري الرفع...' : 'Uploading...') 
                                  : (language === 'ar' ? 'رفع شعار' : 'Upload Logo')}
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* Icon Logo (Collapsed Sidebar) */}
                    <div className="space-y-3">
                      <Label className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'أيقونة الشعار (القائمة المطوية)' : 'Icon Logo (Collapsed Sidebar)'}
                      </Label>
                      <div className="border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center min-h-[120px] bg-muted/20">
                        {companyForm.logo_icon_url ? (
                          <div className="relative group">
                            <img 
                              src={companyForm.logo_icon_url} 
                              alt="Company Icon" 
                              className="max-h-16 max-w-16 object-contain"
                            />
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
                            <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              {language === 'ar' ? 'لا يوجد أيقونة' : 'No icon uploaded'}
                            </p>
                          </div>
                        )}
                        {isEditingCompany && (
                          <label className="mt-3">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => handleLogoUpload(e, 'icon')}
                              disabled={uploadingLogoIcon}
                            />
                            <Button variant="outline" size="sm" asChild disabled={uploadingLogoIcon}>
                              <span className="cursor-pointer">
                                {uploadingLogoIcon 
                                  ? (language === 'ar' ? 'جاري الرفع...' : 'Uploading...') 
                                  : (language === 'ar' ? 'رفع أيقونة' : 'Upload Icon')}
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Company Names */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    <MapPin size={16} />
                    {t.address}
                  </Label>
                  <Input 
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    disabled={!isEditingCompany}
                  />
                </div>

                {/* Phone Numbers Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Phone size={16} />
                      {language === 'ar' ? 'أرقام الهواتف' : 'Phone Numbers'}
                    </Label>
                    {isEditingCompany && (
                      <Button variant="outline" size="sm" onClick={addPhoneNumber}>
                        <Plus size={14} className="me-1" />
                        {language === 'ar' ? 'إضافة رقم' : 'Add Number'}
                      </Button>
                    )}
                  </div>
                  
                  {/* Main Phone */}
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'الرقم الرئيسي' : 'Main Number'}
                    </Label>
                    <Input 
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      disabled={!isEditingCompany}
                      dir="ltr"
                      placeholder="+967 XXX XXX XXX"
                    />
                  </div>

                  {/* Additional Phones */}
                  {companyForm.phones.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'أرقام إضافية' : 'Additional Numbers'}
                      </Label>
                      {companyForm.phones.map((phone, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input 
                            value={phone}
                            onChange={(e) => updatePhoneNumber(index, e.target.value)}
                            disabled={!isEditingCompany}
                            dir="ltr"
                            placeholder="+967 XXX XXX XXX"
                          />
                          {isEditingCompany && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removePhoneNumber(index)}
                            >
                              <Trash2 size={16} />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Mail size={16} />
                    {t.email}
                  </Label>
                  <Input 
                    value={companyForm.email}
                    onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                    disabled={!isEditingCompany}
                    type="email"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Globe size={16} />
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
                      <FileText size={16} />
                      {t.taxNumber}
                    </Label>
                    <Input 
                      value={companyForm.tax_number}
                      onChange={(e) => setCompanyForm({ ...companyForm, tax_number: e.target.value })}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Branches & Warehouses Tab */}
          <TabsContent value="branches" className="mt-6">
            <BranchesWarehouses />
          </TabsContent>

          {/* Currency & Taxes Tab */}
          <TabsContent value="currency" className="mt-6 space-y-6">
            {/* Currency Settings */}
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign size={20} />
                  {t.currencySettings}
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
                            <span className="text-muted-foreground">
                              - {language === 'ar' ? currency.nameAr : currency.name}
                            </span>
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
                      <Card key={currency.code} className={`p-3 cursor-pointer transition-all ${companyForm.default_currency === currency.code ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}>
                        <div className="text-center">
                          <p className="text-2xl font-bold">{currency.symbol}</p>
                          <p className="font-mono text-sm">{currency.code}</p>
                          <p className="text-xs text-muted-foreground">
                            {language === 'ar' ? currency.nameAr : currency.name}
                          </p>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tax Settings */}
            <Card className="card-elevated">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Percent size={20} />
                    {t.taxSettings}
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Plus size={16} className="me-2" />
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
                            <Label>{t.taxNameAr}</Label>
                            <Input placeholder={t.taxNameAr} dir="rtl" />
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
                        <TableCell className="font-medium">
                          {language === 'ar' ? tax.name_ar || tax.name : tax.name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{tax.rate}%</Badge>
                        </TableCell>
                        <TableCell>
                          {tax.is_default && (
                            <Badge className="bg-primary">{t.default}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tax.is_active ? 'default' : 'secondary'}>
                            {tax.is_active ? t.active : t.inactive}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users & Permissions Tab */}
          <TabsContent value="users" className="mt-6">
            <UsersPermissions />
          </TabsContent>

          {/* Language Tab */}
          <TabsContent value="language" className="mt-6">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Languages size={20} />
                  {t.generalSettings}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>{t.systemLanguage}</Label>
                  <div className="grid grid-cols-2 gap-4 max-w-md">
                    <Card 
                      className={`p-4 cursor-pointer transition-all ${language === 'en' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                      onClick={() => setLanguage('en')}
                    >
                      <div className="text-center">
                        <p className="text-2xl mb-2">🇺🇸</p>
                        <p className="font-medium">English</p>
                        <p className="text-xs text-muted-foreground">Left to Right</p>
                      </div>
                    </Card>
                    <Card 
                      className={`p-4 cursor-pointer transition-all ${language === 'ar' ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}`}
                      onClick={() => setLanguage('ar')}
                    >
                      <div className="text-center">
                        <p className="text-2xl mb-2">🇾🇪</p>
                        <p className="font-medium">العربية</p>
                        <p className="text-xs text-muted-foreground">من اليمين لليسار</p>
                      </div>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Settings;
