import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ShoppingCart, 
  Package, 
  DollarSign, 
  Truck, 
  Users, 
  UserCheck,
  Save,
  RotateCcw,
  Printer,
  Receipt,
  Bell,
  Shield,
  Clock,
  Calculator,
  FileText,
  Barcode,
  AlertTriangle,
  CreditCard,
  Building2,
  Percent
} from 'lucide-react';

const ModuleSettings = () => {
  const { language } = useLanguage();
  const [activeModule, setActiveModule] = useState('pos');
  const queryClient = useQueryClient();

  // Default POS Settings
  const defaultPosSettings = {
    enableQuickSale: true,
    requireCustomer: false,
    printReceiptAutomatically: true,
    allowNegativeStock: false,
    requireShiftOpen: true,
    defaultPaymentMethod: 'cash',
    enableDiscount: true,
    maxDiscountPercent: 20,
    enableHoldOrders: true,
    enableReturns: true,
    returnPeriodDays: 14,
    showLowStockWarning: true,
    enableDelivery: true,
    receiptPrinterName: '',
    receiptHeader: '',
    receiptFooter: ''
  };

  // Fetch POS settings from database
  const { data: dbPosSettings } = useQuery({
    queryKey: ['module-settings', 'pos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_settings')
        .select('settings')
        .eq('module_name', 'pos')
        .single();
      
      if (error) return defaultPosSettings;
      const dbSettings = (data?.settings || {}) as Record<string, unknown>;
      return { ...defaultPosSettings, ...dbSettings } as typeof defaultPosSettings;
    }
  });

  const [posSettings, setPosSettings] = useState(defaultPosSettings);

  // Sync local state with database
  useEffect(() => {
    if (dbPosSettings) {
      setPosSettings(dbPosSettings);
    }
  }, [dbPosSettings]);

  // Mutation to save settings
  const saveSettingsMutation = useMutation({
    mutationFn: async ({ moduleName, settings }: { moduleName: string; settings: any }) => {
      const { error } = await supabase
        .from('module_settings')
        .upsert({
          module_name: moduleName,
          settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'module_name' });
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['module-settings', variables.moduleName] });
      queryClient.invalidateQueries({ queryKey: ['pos-settings'] });
      toast({ 
        title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Settings saved successfully'
      });
    },
    onError: () => {
      toast({ 
        title: language === 'ar' ? 'خطأ في الحفظ' : 'Failed to save settings',
        variant: 'destructive'
      });
    }
  });

  // Inventory Settings
  const [inventorySettings, setInventorySettings] = useState({
    enableBarcodes: true,
    autoGenerateSKU: true,
    skuPrefix: 'PRD',
    enableVariants: true,
    trackSerialNumbers: false,
    defaultMinStock: 5,
    lowStockAlertEnabled: true,
    enableExpiryTracking: false,
    autoUpdateAverageCost: true,
    enableMultipleWarehouses: true,
    requireApprovalForTransfers: true,
    enableInventoryCount: true,
    countFrequencyDays: 30,
    // Promotions Settings
    enablePromotions: true,
    maxPromotionDiscount: 50,
    allowStackingPromotions: false,
    autoApplyPromotions: true,
    showPromotionBadge: true
  });

  // Finance Settings
  const [financeSettings, setFinanceSettings] = useState({
    fiscalYearStart: '01',
    defaultCurrency: 'YER',
    enableMultiCurrency: false,
    autoGenerateVoucherNumbers: true,
    voucherPrefix: 'VCH',
    requireApprovalForExpenses: true,
    expenseApprovalThreshold: 10000,
    enableBudgeting: true,
    enableCostCenters: false,
    autoReconcileBankTransactions: false,
    defaultPaymentTermsDays: 30,
    enableLateFees: false,
    lateFeePercent: 2,
    // Treasury & Banks Settings
    enableTreasury: true,
    enableBankAccounts: true,
    requireBankReconciliation: false,
    trackCheckNumbers: true,
    enableBankTransfers: true,
    // Accounts Payable Settings
    enableAccountsPayable: true,
    payableReminderDays: 7,
    autoCreatePayableFromInvoice: true,
    // Chart of Accounts Settings
    enableChartOfAccounts: true,
    accountCodeFormat: 'numeric',
    maxAccountDepth: 5
  });

  // Purchasing Settings
  const [purchasingSettings, setPurchasingSettings] = useState({
    autoGeneratePONumbers: true,
    poPrefix: 'PO',
    requireApprovalForPO: true,
    poApprovalThreshold: 50000,
    enableSupplierRatings: true,
    defaultPaymentTermsDays: 30,
    enablePartialReceiving: true,
    autoUpdateProductCost: true,
    sendEmailOnPOCreation: false,
    enableSupplierPortal: false,
    reorderPointEnabled: true,
    autoCreatePOOnLowStock: false,
    // Purchase Returns Settings
    enablePurchaseReturns: true,
    returnPrefix: 'PR',
    requireReturnApproval: false,
    autoUpdateStockOnReturn: true,
    trackReturnReasons: true
  });

  // HR Settings
  const [hrSettings, setHrSettings] = useState({
    workingDaysPerWeek: 6,
    workingHoursPerDay: 8,
    enableAttendance: true,
    attendanceMethod: 'manual',
    enableExcelImportAttendance: true,
    enableOvertime: true,
    overtimeRate: 1.5,
    enableLeaveManagement: true,
    annualLeaveDays: 21,
    enablePayroll: true,
    payrollCycle: 'monthly',
    enableAdvances: true,
    maxAdvancePercent: 50,
    enablePerformanceReviews: false,
    enableSalesCommissions: true,
    defaultCommissionRate: 2,
    enableDeliveryPersons: true,
    trackDeliveryStatus: true
  });

  // CRM Settings
  const [crmSettings, setCrmSettings] = useState({
    enableLoyaltyProgram: true,
    pointsPerCurrencyUnit: 1,
    pointsRedemptionRate: 100,
    enableCustomerGroups: true,
    enableCreditLimit: true,
    defaultCreditLimit: 0,
    enableCustomerNotes: true,
    trackPurchaseHistory: true,
    enableBirthdayReminders: false,
    sendSMSNotifications: false,
    sendEmailNotifications: false,
    enableCustomerFeedback: false
  });

  // Sales Settings
  const [salesSettings, setSalesSettings] = useState({
    autoGenerateInvoiceNumbers: true,
    invoicePrefix: 'INV',
    enableSalesmen: true,
    enableSalesReturns: true,
    returnApprovalRequired: false,
    enableDueDates: true,
    defaultDueDays: 30,
    enablePartialPayments: true,
    trackSalesmanPerformance: true,
    enableQuotations: true,
    quotationValidityDays: 7
  });

  // Reports Settings
  const [reportsSettings, setReportsSettings] = useState({
    enableReportPreview: true,
    defaultExportFormat: 'excel',
    enableReportScheduling: false,
    enableEmailReports: false,
    showReportSummary: true,
    enableCustomReports: true,
    retainReportsDays: 90,
    enableHRReports: true,
    enableSalesCommissionReports: true,
    enableDeliveryReports: true,
    // Advanced Reports
    enableProfitLossReport: true,
    enableSalesAnalysisReport: true,
    enableCustomerSupplierMovement: true,
    enableInventoryValuationReport: true,
    enableCashFlowReport: true,
    defaultReportPeriod: 'month',
    comparePreviousPeriod: true
  });

  const handleSave = (module: string) => {
    let settings: any;
    switch (module) {
      case 'pos':
        settings = posSettings;
        break;
      case 'inventory':
        settings = inventorySettings;
        break;
      case 'finance':
        settings = financeSettings;
        break;
      case 'purchasing':
        settings = purchasingSettings;
        break;
      case 'sales':
        settings = salesSettings;
        break;
      case 'hr':
        settings = hrSettings;
        break;
      case 'crm':
        settings = crmSettings;
        break;
      case 'reports':
        settings = reportsSettings;
        break;
      default:
        return;
    }
    
    saveSettingsMutation.mutate({ moduleName: module, settings });
  };

  const handleReset = (module: string) => {
    toast({ 
      title: language === 'ar' ? 'تم إعادة التعيين' : 'Settings reset',
      description: language === 'ar' ? 'تم إعادة الإعدادات للقيم الافتراضية' : 'Settings reset to defaults'
    });
  };

  const getModuleName = (module: string) => {
    const names: Record<string, { en: string; ar: string }> = {
      pos: { en: 'Point of Sale', ar: 'نقاط البيع' },
      inventory: { en: 'Inventory', ar: 'المخزون' },
      finance: { en: 'Finance', ar: 'المالية' },
      purchasing: { en: 'Purchasing', ar: 'المشتريات' },
      sales: { en: 'Sales', ar: 'المبيعات' },
      hr: { en: 'Human Resources', ar: 'الموارد البشرية' },
      crm: { en: 'Customer Relations', ar: 'العملاء' },
      reports: { en: 'Reports', ar: 'التقارير' }
    };
    return language === 'ar' ? names[module]?.ar : names[module]?.en;
  };

  const modules = [
    { id: 'pos', icon: ShoppingCart, label: language === 'ar' ? 'نقاط البيع' : 'POS' },
    { id: 'sales', icon: Receipt, label: language === 'ar' ? 'المبيعات' : 'Sales' },
    { id: 'inventory', icon: Package, label: language === 'ar' ? 'المخزون' : 'Inventory' },
    { id: 'finance', icon: DollarSign, label: language === 'ar' ? 'المالية' : 'Finance' },
    { id: 'purchasing', icon: Truck, label: language === 'ar' ? 'المشتريات' : 'Purchasing' },
    { id: 'hr', icon: Users, label: language === 'ar' ? 'الموارد البشرية' : 'HR' },
    { id: 'crm', icon: UserCheck, label: language === 'ar' ? 'العملاء' : 'CRM' },
    { id: 'reports', icon: FileText, label: language === 'ar' ? 'التقارير' : 'Reports' }
  ];

  const SettingRow = ({ 
    label, 
    description, 
    children 
  }: { 
    label: string; 
    description?: string; 
    children: React.ReactNode 
  }) => (
    <div className="flex items-center justify-between py-4 border-b last:border-0">
      <div className="space-y-0.5">
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeModule} onValueChange={setActiveModule}>
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1">
          {modules.map((module) => (
            <TabsTrigger key={module.id} value={module.id} className="flex items-center gap-2">
              <module.icon size={16} />
              <span className="hidden sm:inline">{module.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* POS Settings */}
        <TabsContent value="pos" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart size={20} />
                    {language === 'ar' ? 'إعدادات نقاط البيع' : 'POS Settings'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'تخصيص إعدادات شاشة البيع والمبيعات' : 'Customize point of sale and sales settings'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleReset('pos')}>
                    <RotateCcw size={16} className="me-2" />
                    {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                  </Button>
                  <Button onClick={() => handleSave('pos')}>
                    <Save size={16} className="me-2" />
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Sales Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Receipt size={16} />
                  {language === 'ar' ? 'إعدادات المبيعات' : 'Sales Settings'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل البيع السريع' : 'Enable Quick Sale'}
                  description={language === 'ar' ? 'السماح بإتمام البيع بدون تحديد عميل' : 'Allow completing sale without customer'}
                >
                  <Switch 
                    checked={posSettings.enableQuickSale}
                    onCheckedChange={(val) => setPosSettings({ ...posSettings, enableQuickSale: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'إلزام تحديد العميل' : 'Require Customer'}
                  description={language === 'ar' ? 'يجب تحديد عميل لكل فاتورة' : 'Customer must be selected for each invoice'}
                >
                  <Switch 
                    checked={posSettings.requireCustomer}
                    onCheckedChange={(val) => setPosSettings({ ...posSettings, requireCustomer: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'السماح بالبيع بمخزون سالب' : 'Allow Negative Stock Sales'}
                >
                  <Switch 
                    checked={posSettings.allowNegativeStock}
                    onCheckedChange={(val) => setPosSettings({ ...posSettings, allowNegativeStock: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل طلبات التوصيل' : 'Enable Delivery Orders'}
                >
                  <Switch 
                    checked={posSettings.enableDelivery}
                    onCheckedChange={(val) => setPosSettings({ ...posSettings, enableDelivery: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Shift & Payment */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock size={16} />
                  {language === 'ar' ? 'الورديات والدفع' : 'Shifts & Payment'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'إلزام فتح وردية' : 'Require Open Shift'}
                  description={language === 'ar' ? 'يجب فتح وردية قبل البيع' : 'Shift must be opened before sales'}
                >
                  <Switch 
                    checked={posSettings.requireShiftOpen}
                    onCheckedChange={(val) => setPosSettings({ ...posSettings, requireShiftOpen: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'طريقة الدفع الافتراضية' : 'Default Payment Method'}
                >
                  <Select 
                    value={posSettings.defaultPaymentMethod}
                    onValueChange={(val) => setPosSettings({ ...posSettings, defaultPaymentMethod: val })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                      <SelectItem value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</SelectItem>
                      <SelectItem value="transfer">{language === 'ar' ? 'تحويل' : 'Transfer'}</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </div>

              <Separator />

              {/* Discounts & Returns */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Percent size={16} />
                  {language === 'ar' ? 'الخصومات والمرتجعات' : 'Discounts & Returns'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل الخصومات' : 'Enable Discounts'}
                >
                  <Switch 
                    checked={posSettings.enableDiscount}
                    onCheckedChange={(val) => setPosSettings({ ...posSettings, enableDiscount: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'الحد الأقصى للخصم (%)' : 'Max Discount (%)'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={posSettings.maxDiscountPercent}
                    onChange={(e) => setPosSettings({ ...posSettings, maxDiscountPercent: Number(e.target.value) })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل المرتجعات' : 'Enable Returns'}
                >
                  <Switch 
                    checked={posSettings.enableReturns}
                    onCheckedChange={(val) => setPosSettings({ ...posSettings, enableReturns: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'فترة الإرجاع (أيام)' : 'Return Period (Days)'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={posSettings.returnPeriodDays}
                    onChange={(e) => setPosSettings({ ...posSettings, returnPeriodDays: Number(e.target.value) })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Printing */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Printer size={16} />
                  {language === 'ar' ? 'الطباعة' : 'Printing'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'طباعة الفاتورة تلقائياً' : 'Auto Print Receipt'}
                >
                  <Switch 
                    checked={posSettings.printReceiptAutomatically}
                    onCheckedChange={(val) => setPosSettings({ ...posSettings, printReceiptAutomatically: val })}
                  />
                </SettingRow>
                <div className="space-y-2 pt-2">
                  <Label>{language === 'ar' ? 'رأس الفاتورة' : 'Receipt Header'}</Label>
                  <Input 
                    value={posSettings.receiptHeader}
                    onChange={(e) => setPosSettings({ ...posSettings, receiptHeader: e.target.value })}
                    placeholder={language === 'ar' ? 'نص يظهر في رأس الفاتورة' : 'Text to show in receipt header'}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{language === 'ar' ? 'تذييل الفاتورة' : 'Receipt Footer'}</Label>
                  <Input 
                    value={posSettings.receiptFooter}
                    onChange={(e) => setPosSettings({ ...posSettings, receiptFooter: e.target.value })}
                    placeholder={language === 'ar' ? 'نص يظهر في تذييل الفاتورة' : 'Text to show in receipt footer'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inventory Settings */}
        <TabsContent value="inventory" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package size={20} />
                    {language === 'ar' ? 'إعدادات المخزون' : 'Inventory Settings'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'تخصيص إعدادات المنتجات والمخزون' : 'Customize products and inventory settings'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleReset('inventory')}>
                    <RotateCcw size={16} className="me-2" />
                    {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                  </Button>
                  <Button onClick={() => handleSave('inventory')}>
                    <Save size={16} className="me-2" />
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Product Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Barcode size={16} />
                  {language === 'ar' ? 'إعدادات المنتجات' : 'Product Settings'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل الباركود' : 'Enable Barcodes'}
                >
                  <Switch 
                    checked={inventorySettings.enableBarcodes}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, enableBarcodes: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'إنشاء SKU تلقائياً' : 'Auto Generate SKU'}
                >
                  <Switch 
                    checked={inventorySettings.autoGenerateSKU}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, autoGenerateSKU: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'بادئة SKU' : 'SKU Prefix'}
                >
                  <Input 
                    className="w-24"
                    value={inventorySettings.skuPrefix}
                    onChange={(e) => setInventorySettings({ ...inventorySettings, skuPrefix: e.target.value })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل المتغيرات (مقاسات/ألوان)' : 'Enable Variants (Sizes/Colors)'}
                >
                  <Switch 
                    checked={inventorySettings.enableVariants}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, enableVariants: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Stock Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {language === 'ar' ? 'إعدادات المخزون' : 'Stock Settings'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'الحد الأدنى الافتراضي' : 'Default Min Stock'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={inventorySettings.defaultMinStock}
                    onChange={(e) => setInventorySettings({ ...inventorySettings, defaultMinStock: Number(e.target.value) })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل تنبيهات المخزون المنخفض' : 'Enable Low Stock Alerts'}
                >
                  <Switch 
                    checked={inventorySettings.lowStockAlertEnabled}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, lowStockAlertEnabled: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تتبع تواريخ الصلاحية' : 'Track Expiry Dates'}
                >
                  <Switch 
                    checked={inventorySettings.enableExpiryTracking}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, enableExpiryTracking: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تحديث متوسط التكلفة تلقائياً' : 'Auto Update Average Cost'}
                >
                  <Switch 
                    checked={inventorySettings.autoUpdateAverageCost}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, autoUpdateAverageCost: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Warehouse Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building2 size={16} />
                  {language === 'ar' ? 'إعدادات المخازن' : 'Warehouse Settings'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل المخازن المتعددة' : 'Enable Multiple Warehouses'}
                >
                  <Switch 
                    checked={inventorySettings.enableMultipleWarehouses}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, enableMultipleWarehouses: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'طلب موافقة على التحويلات' : 'Require Transfer Approval'}
                >
                  <Switch 
                    checked={inventorySettings.requireApprovalForTransfers}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, requireApprovalForTransfers: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل جرد المخزون' : 'Enable Inventory Count'}
                >
                  <Switch 
                    checked={inventorySettings.enableInventoryCount}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, enableInventoryCount: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تكرار الجرد (أيام)' : 'Count Frequency (Days)'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={inventorySettings.countFrequencyDays}
                    onChange={(e) => setInventorySettings({ ...inventorySettings, countFrequencyDays: Number(e.target.value) })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Promotions Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Receipt size={16} />
                  {language === 'ar' ? 'إعدادات العروض والتخفيضات' : 'Promotions Settings'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل العروض' : 'Enable Promotions'}
                  description={language === 'ar' ? 'السماح بإنشاء وتطبيق العروض الترويجية' : 'Allow creating and applying promotional offers'}
                >
                  <Switch 
                    checked={inventorySettings.enablePromotions}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, enablePromotions: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'الحد الأقصى لخصم العرض (%)' : 'Max Promotion Discount (%)'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={inventorySettings.maxPromotionDiscount}
                    onChange={(e) => setInventorySettings({ ...inventorySettings, maxPromotionDiscount: Number(e.target.value) })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'السماح بتراكم العروض' : 'Allow Stacking Promotions'}
                  description={language === 'ar' ? 'تطبيق أكثر من عرض على نفس المنتج' : 'Apply multiple promotions to same product'}
                >
                  <Switch 
                    checked={inventorySettings.allowStackingPromotions}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, allowStackingPromotions: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تطبيق العروض تلقائياً' : 'Auto Apply Promotions'}
                >
                  <Switch 
                    checked={inventorySettings.autoApplyPromotions}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, autoApplyPromotions: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'إظهار شارة العرض' : 'Show Promotion Badge'}
                  description={language === 'ar' ? 'عرض شارة للمنتجات التي عليها عروض' : 'Display badge on products with active promotions'}
                >
                  <Switch 
                    checked={inventorySettings.showPromotionBadge}
                    onCheckedChange={(val) => setInventorySettings({ ...inventorySettings, showPromotionBadge: val })}
                  />
                </SettingRow>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Finance Settings */}
        <TabsContent value="finance" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign size={20} />
                    {language === 'ar' ? 'إعدادات المالية' : 'Finance Settings'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'تخصيص إعدادات الحسابات والمالية' : 'Customize accounting and finance settings'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleReset('finance')}>
                    <RotateCcw size={16} className="me-2" />
                    {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                  </Button>
                  <Button onClick={() => handleSave('finance')}>
                    <Save size={16} className="me-2" />
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* General Finance */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calculator size={16} />
                  {language === 'ar' ? 'الإعدادات العامة' : 'General Settings'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'بداية السنة المالية' : 'Fiscal Year Start'}
                >
                  <Select 
                    value={financeSettings.fiscalYearStart}
                    onValueChange={(val) => setFinanceSettings({ ...financeSettings, fiscalYearStart: val })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => (
                        <SelectItem key={i} value={String(i + 1).padStart(2, '0')}>
                          {new Date(2000, i, 1).toLocaleString(language === 'ar' ? 'ar' : 'en', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل العملات المتعددة' : 'Enable Multi-Currency'}
                >
                  <Switch 
                    checked={financeSettings.enableMultiCurrency}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, enableMultiCurrency: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Vouchers */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText size={16} />
                  {language === 'ar' ? 'السندات' : 'Vouchers'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'إنشاء أرقام السندات تلقائياً' : 'Auto Generate Voucher Numbers'}
                >
                  <Switch 
                    checked={financeSettings.autoGenerateVoucherNumbers}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, autoGenerateVoucherNumbers: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'بادئة السندات' : 'Voucher Prefix'}
                >
                  <Input 
                    className="w-24"
                    value={financeSettings.voucherPrefix}
                    onChange={(e) => setFinanceSettings({ ...financeSettings, voucherPrefix: e.target.value })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Expenses */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <CreditCard size={16} />
                  {language === 'ar' ? 'المصروفات' : 'Expenses'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'طلب موافقة على المصروفات' : 'Require Expense Approval'}
                >
                  <Switch 
                    checked={financeSettings.requireApprovalForExpenses}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, requireApprovalForExpenses: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'حد الموافقة على المصروفات' : 'Expense Approval Threshold'}
                >
                  <Input 
                    type="number"
                    className="w-28"
                    value={financeSettings.expenseApprovalThreshold}
                    onChange={(e) => setFinanceSettings({ ...financeSettings, expenseApprovalThreshold: Number(e.target.value) })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل الميزانيات' : 'Enable Budgeting'}
                >
                  <Switch 
                    checked={financeSettings.enableBudgeting}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, enableBudgeting: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Payment Terms */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock size={16} />
                  {language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'فترة الدفع الافتراضية (أيام)' : 'Default Payment Terms (Days)'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={financeSettings.defaultPaymentTermsDays}
                    onChange={(e) => setFinanceSettings({ ...financeSettings, defaultPaymentTermsDays: Number(e.target.value) })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل غرامات التأخير' : 'Enable Late Fees'}
                >
                  <Switch 
                    checked={financeSettings.enableLateFees}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, enableLateFees: val })}
                  />
                </SettingRow>
                {financeSettings.enableLateFees && (
                  <SettingRow 
                    label={language === 'ar' ? 'نسبة غرامة التأخير (%)' : 'Late Fee Percent (%)'}
                  >
                    <Input 
                      type="number"
                      className="w-20"
                      value={financeSettings.lateFeePercent}
                      onChange={(e) => setFinanceSettings({ ...financeSettings, lateFeePercent: Number(e.target.value) })}
                    />
                  </SettingRow>
                )}
              </div>

              <Separator />

              {/* Treasury & Banks Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building2 size={16} />
                  {language === 'ar' ? 'الخزائن والبنوك' : 'Treasury & Banks'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل الخزائن' : 'Enable Treasury'}
                >
                  <Switch 
                    checked={financeSettings.enableTreasury}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, enableTreasury: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل الحسابات البنكية' : 'Enable Bank Accounts'}
                >
                  <Switch 
                    checked={financeSettings.enableBankAccounts}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, enableBankAccounts: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تتبع أرقام الشيكات' : 'Track Check Numbers'}
                >
                  <Switch 
                    checked={financeSettings.trackCheckNumbers}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, trackCheckNumbers: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل التحويلات البنكية' : 'Enable Bank Transfers'}
                >
                  <Switch 
                    checked={financeSettings.enableBankTransfers}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, enableBankTransfers: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Accounts Payable Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Receipt size={16} />
                  {language === 'ar' ? 'الذمم الدائنة' : 'Accounts Payable'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل الذمم الدائنة' : 'Enable Accounts Payable'}
                >
                  <Switch 
                    checked={financeSettings.enableAccountsPayable}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, enableAccountsPayable: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'أيام التذكير بالدفع' : 'Payment Reminder Days'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={financeSettings.payableReminderDays}
                    onChange={(e) => setFinanceSettings({ ...financeSettings, payableReminderDays: Number(e.target.value) })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'إنشاء ذمة تلقائياً من الفاتورة' : 'Auto Create Payable from Invoice'}
                >
                  <Switch 
                    checked={financeSettings.autoCreatePayableFromInvoice}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, autoCreatePayableFromInvoice: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Chart of Accounts Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText size={16} />
                  {language === 'ar' ? 'شجرة الحسابات' : 'Chart of Accounts'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل شجرة الحسابات' : 'Enable Chart of Accounts'}
                >
                  <Switch 
                    checked={financeSettings.enableChartOfAccounts}
                    onCheckedChange={(val) => setFinanceSettings({ ...financeSettings, enableChartOfAccounts: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'أقصى عمق للحسابات' : 'Max Account Depth'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={financeSettings.maxAccountDepth}
                    onChange={(e) => setFinanceSettings({ ...financeSettings, maxAccountDepth: Number(e.target.value) })}
                  />
                </SettingRow>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Purchasing Settings */}
        <TabsContent value="purchasing" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Truck size={20} />
                    {language === 'ar' ? 'إعدادات المشتريات' : 'Purchasing Settings'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'تخصيص إعدادات المشتريات والموردين' : 'Customize purchasing and supplier settings'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleReset('purchasing')}>
                    <RotateCcw size={16} className="me-2" />
                    {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                  </Button>
                  <Button onClick={() => handleSave('purchasing')}>
                    <Save size={16} className="me-2" />
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Purchase Orders */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText size={16} />
                  {language === 'ar' ? 'أوامر الشراء' : 'Purchase Orders'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'إنشاء أرقام أوامر الشراء تلقائياً' : 'Auto Generate PO Numbers'}
                >
                  <Switch 
                    checked={purchasingSettings.autoGeneratePONumbers}
                    onCheckedChange={(val) => setPurchasingSettings({ ...purchasingSettings, autoGeneratePONumbers: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'بادئة أوامر الشراء' : 'PO Prefix'}
                >
                  <Input 
                    className="w-24"
                    value={purchasingSettings.poPrefix}
                    onChange={(e) => setPurchasingSettings({ ...purchasingSettings, poPrefix: e.target.value })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'طلب موافقة على أوامر الشراء' : 'Require PO Approval'}
                >
                  <Switch 
                    checked={purchasingSettings.requireApprovalForPO}
                    onCheckedChange={(val) => setPurchasingSettings({ ...purchasingSettings, requireApprovalForPO: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'حد الموافقة على أوامر الشراء' : 'PO Approval Threshold'}
                >
                  <Input 
                    type="number"
                    className="w-28"
                    value={purchasingSettings.poApprovalThreshold}
                    onChange={(e) => setPurchasingSettings({ ...purchasingSettings, poApprovalThreshold: Number(e.target.value) })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Receiving */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Package size={16} />
                  {language === 'ar' ? 'الاستلام' : 'Receiving'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'السماح بالاستلام الجزئي' : 'Enable Partial Receiving'}
                >
                  <Switch 
                    checked={purchasingSettings.enablePartialReceiving}
                    onCheckedChange={(val) => setPurchasingSettings({ ...purchasingSettings, enablePartialReceiving: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تحديث تكلفة المنتج تلقائياً' : 'Auto Update Product Cost'}
                >
                  <Switch 
                    checked={purchasingSettings.autoUpdateProductCost}
                    onCheckedChange={(val) => setPurchasingSettings({ ...purchasingSettings, autoUpdateProductCost: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Suppliers */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users size={16} />
                  {language === 'ar' ? 'الموردين' : 'Suppliers'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل تقييم الموردين' : 'Enable Supplier Ratings'}
                >
                  <Switch 
                    checked={purchasingSettings.enableSupplierRatings}
                    onCheckedChange={(val) => setPurchasingSettings({ ...purchasingSettings, enableSupplierRatings: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'فترة الدفع الافتراضية (أيام)' : 'Default Payment Terms (Days)'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={purchasingSettings.defaultPaymentTermsDays}
                    onChange={(e) => setPurchasingSettings({ ...purchasingSettings, defaultPaymentTermsDays: Number(e.target.value) })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Reorder */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Bell size={16} />
                  {language === 'ar' ? 'إعادة الطلب' : 'Reorder'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل نقطة إعادة الطلب' : 'Enable Reorder Point'}
                >
                  <Switch 
                    checked={purchasingSettings.reorderPointEnabled}
                    onCheckedChange={(val) => setPurchasingSettings({ ...purchasingSettings, reorderPointEnabled: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'إنشاء أمر شراء تلقائياً عند نفاد المخزون' : 'Auto Create PO on Low Stock'}
                >
                  <Switch 
                    checked={purchasingSettings.autoCreatePOOnLowStock}
                    onCheckedChange={(val) => setPurchasingSettings({ ...purchasingSettings, autoCreatePOOnLowStock: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Purchase Returns Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <RotateCcw size={16} />
                  {language === 'ar' ? 'مرتجعات المشتريات' : 'Purchase Returns'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل مرتجعات المشتريات' : 'Enable Purchase Returns'}
                >
                  <Switch 
                    checked={purchasingSettings.enablePurchaseReturns}
                    onCheckedChange={(val) => setPurchasingSettings({ ...purchasingSettings, enablePurchaseReturns: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'بادئة المرتجعات' : 'Return Prefix'}
                >
                  <Input 
                    className="w-24"
                    value={purchasingSettings.returnPrefix}
                    onChange={(e) => setPurchasingSettings({ ...purchasingSettings, returnPrefix: e.target.value })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'طلب موافقة على المرتجعات' : 'Require Return Approval'}
                >
                  <Switch 
                    checked={purchasingSettings.requireReturnApproval}
                    onCheckedChange={(val) => setPurchasingSettings({ ...purchasingSettings, requireReturnApproval: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تحديث المخزون تلقائياً عند الإرجاع' : 'Auto Update Stock on Return'}
                >
                  <Switch 
                    checked={purchasingSettings.autoUpdateStockOnReturn}
                    onCheckedChange={(val) => setPurchasingSettings({ ...purchasingSettings, autoUpdateStockOnReturn: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تتبع أسباب الإرجاع' : 'Track Return Reasons'}
                >
                  <Switch 
                    checked={purchasingSettings.trackReturnReasons}
                    onCheckedChange={(val) => setPurchasingSettings({ ...purchasingSettings, trackReturnReasons: val })}
                  />
                </SettingRow>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HR Settings */}
        <TabsContent value="hr" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users size={20} />
                    {language === 'ar' ? 'إعدادات الموارد البشرية' : 'HR Settings'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'تخصيص إعدادات الموظفين والرواتب' : 'Customize employee and payroll settings'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleReset('hr')}>
                    <RotateCcw size={16} className="me-2" />
                    {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                  </Button>
                  <Button onClick={() => handleSave('hr')}>
                    <Save size={16} className="me-2" />
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Working Hours */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock size={16} />
                  {language === 'ar' ? 'ساعات العمل' : 'Working Hours'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'أيام العمل في الأسبوع' : 'Working Days per Week'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={hrSettings.workingDaysPerWeek}
                    onChange={(e) => setHrSettings({ ...hrSettings, workingDaysPerWeek: Number(e.target.value) })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'ساعات العمل في اليوم' : 'Working Hours per Day'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={hrSettings.workingHoursPerDay}
                    onChange={(e) => setHrSettings({ ...hrSettings, workingHoursPerDay: Number(e.target.value) })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Attendance */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Shield size={16} />
                  {language === 'ar' ? 'الحضور والانصراف' : 'Attendance'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل تتبع الحضور' : 'Enable Attendance Tracking'}
                >
                  <Switch 
                    checked={hrSettings.enableAttendance}
                    onCheckedChange={(val) => setHrSettings({ ...hrSettings, enableAttendance: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'طريقة تسجيل الحضور' : 'Attendance Method'}
                >
                  <Select 
                    value={hrSettings.attendanceMethod}
                    onValueChange={(val) => setHrSettings({ ...hrSettings, attendanceMethod: val })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">{language === 'ar' ? 'يدوي' : 'Manual'}</SelectItem>
                      <SelectItem value="biometric">{language === 'ar' ? 'بصمة' : 'Biometric'}</SelectItem>
                      <SelectItem value="qr">{language === 'ar' ? 'QR' : 'QR Code'}</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل العمل الإضافي' : 'Enable Overtime'}
                >
                  <Switch 
                    checked={hrSettings.enableOvertime}
                    onCheckedChange={(val) => setHrSettings({ ...hrSettings, enableOvertime: val })}
                  />
                </SettingRow>
                {hrSettings.enableOvertime && (
                  <SettingRow 
                    label={language === 'ar' ? 'معدل العمل الإضافي' : 'Overtime Rate'}
                  >
                    <Input 
                      type="number"
                      step="0.1"
                      className="w-20"
                      value={hrSettings.overtimeRate}
                      onChange={(e) => setHrSettings({ ...hrSettings, overtimeRate: Number(e.target.value) })}
                    />
                  </SettingRow>
                )}
              </div>

              <Separator />

              {/* Excel Import Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText size={16} />
                  {language === 'ar' ? 'استيراد البيانات' : 'Data Import'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل استيراد الحضور من Excel' : 'Enable Excel Attendance Import'}
                  description={language === 'ar' ? 'السماح باستيراد سجلات الحضور من ملفات Excel' : 'Allow importing attendance records from Excel files'}
                >
                  <Switch 
                    checked={hrSettings.enableExcelImportAttendance}
                    onCheckedChange={(val) => setHrSettings({ ...hrSettings, enableExcelImportAttendance: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Leave & Payroll */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <DollarSign size={16} />
                  {language === 'ar' ? 'الإجازات والرواتب' : 'Leave & Payroll'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل إدارة الإجازات' : 'Enable Leave Management'}
                >
                  <Switch 
                    checked={hrSettings.enableLeaveManagement}
                    onCheckedChange={(val) => setHrSettings({ ...hrSettings, enableLeaveManagement: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'أيام الإجازة السنوية' : 'Annual Leave Days'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={hrSettings.annualLeaveDays}
                    onChange={(e) => setHrSettings({ ...hrSettings, annualLeaveDays: Number(e.target.value) })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل الرواتب' : 'Enable Payroll'}
                >
                  <Switch 
                    checked={hrSettings.enablePayroll}
                    onCheckedChange={(val) => setHrSettings({ ...hrSettings, enablePayroll: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'دورة الرواتب' : 'Payroll Cycle'}
                >
                  <Select 
                    value={hrSettings.payrollCycle}
                    onValueChange={(val) => setHrSettings({ ...hrSettings, payrollCycle: val })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">{language === 'ar' ? 'أسبوعي' : 'Weekly'}</SelectItem>
                      <SelectItem value="biweekly">{language === 'ar' ? 'نصف شهري' : 'Biweekly'}</SelectItem>
                      <SelectItem value="monthly">{language === 'ar' ? 'شهري' : 'Monthly'}</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل السلف' : 'Enable Advances'}
                >
                  <Switch 
                    checked={hrSettings.enableAdvances}
                    onCheckedChange={(val) => setHrSettings({ ...hrSettings, enableAdvances: val })}
                  />
                </SettingRow>
                {hrSettings.enableAdvances && (
                  <SettingRow 
                    label={language === 'ar' ? 'الحد الأقصى للسلفة (%)' : 'Max Advance (%)'}
                  >
                    <Input 
                      type="number"
                      className="w-20"
                      value={hrSettings.maxAdvancePercent}
                      onChange={(e) => setHrSettings({ ...hrSettings, maxAdvancePercent: Number(e.target.value) })}
                    />
                  </SettingRow>
                )}
              </div>

              <Separator />

              {/* Commissions & Delivery */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Truck size={16} />
                  {language === 'ar' ? 'العمولات والتوصيل' : 'Commissions & Delivery'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل عمولات المبيعات' : 'Enable Sales Commissions'}
                  description={language === 'ar' ? 'حساب عمولات مندوبي المبيعات' : 'Calculate salesman commissions'}
                >
                  <Switch 
                    checked={hrSettings.enableSalesCommissions}
                    onCheckedChange={(val) => setHrSettings({ ...hrSettings, enableSalesCommissions: val })}
                  />
                </SettingRow>
                {hrSettings.enableSalesCommissions && (
                  <SettingRow 
                    label={language === 'ar' ? 'نسبة العمولة الافتراضية (%)' : 'Default Commission Rate (%)'}
                  >
                    <Input 
                      type="number"
                      step="0.5"
                      className="w-20"
                      value={hrSettings.defaultCommissionRate}
                      onChange={(e) => setHrSettings({ ...hrSettings, defaultCommissionRate: Number(e.target.value) })}
                    />
                  </SettingRow>
                )}
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل مناديب التوصيل' : 'Enable Delivery Persons'}
                  description={language === 'ar' ? 'إدارة مناديب التوصيل وتتبعهم' : 'Manage and track delivery persons'}
                >
                  <Switch 
                    checked={hrSettings.enableDeliveryPersons}
                    onCheckedChange={(val) => setHrSettings({ ...hrSettings, enableDeliveryPersons: val })}
                  />
                </SettingRow>
                {hrSettings.enableDeliveryPersons && (
                  <SettingRow 
                    label={language === 'ar' ? 'تتبع حالة التوصيل' : 'Track Delivery Status'}
                  >
                    <Switch 
                      checked={hrSettings.trackDeliveryStatus}
                      onCheckedChange={(val) => setHrSettings({ ...hrSettings, trackDeliveryStatus: val })}
                    />
                  </SettingRow>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CRM Settings */}
        <TabsContent value="crm" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck size={20} />
                    {language === 'ar' ? 'إعدادات العملاء' : 'CRM Settings'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'تخصيص إعدادات العملاء وبرامج الولاء' : 'Customize customer and loyalty settings'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleReset('crm')}>
                    <RotateCcw size={16} className="me-2" />
                    {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                  </Button>
                  <Button onClick={() => handleSave('crm')}>
                    <Save size={16} className="me-2" />
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Loyalty Program */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Receipt size={16} />
                  {language === 'ar' ? 'برنامج الولاء' : 'Loyalty Program'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل برنامج الولاء' : 'Enable Loyalty Program'}
                >
                  <Switch 
                    checked={crmSettings.enableLoyaltyProgram}
                    onCheckedChange={(val) => setCrmSettings({ ...crmSettings, enableLoyaltyProgram: val })}
                  />
                </SettingRow>
                {crmSettings.enableLoyaltyProgram && (
                  <>
                    <SettingRow 
                      label={language === 'ar' ? 'نقاط لكل وحدة عملة' : 'Points per Currency Unit'}
                    >
                      <Input 
                        type="number"
                        className="w-20"
                        value={crmSettings.pointsPerCurrencyUnit}
                        onChange={(e) => setCrmSettings({ ...crmSettings, pointsPerCurrencyUnit: Number(e.target.value) })}
                      />
                    </SettingRow>
                    <SettingRow 
                      label={language === 'ar' ? 'معدل استبدال النقاط' : 'Points Redemption Rate'}
                      description={language === 'ar' ? 'عدد النقاط لكل وحدة عملة' : 'Points needed per currency unit'}
                    >
                      <Input 
                        type="number"
                        className="w-20"
                        value={crmSettings.pointsRedemptionRate}
                        onChange={(e) => setCrmSettings({ ...crmSettings, pointsRedemptionRate: Number(e.target.value) })}
                      />
                    </SettingRow>
                  </>
                )}
              </div>

              <Separator />

              {/* Customer Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users size={16} />
                  {language === 'ar' ? 'إعدادات العملاء' : 'Customer Settings'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل مجموعات العملاء' : 'Enable Customer Groups'}
                >
                  <Switch 
                    checked={crmSettings.enableCustomerGroups}
                    onCheckedChange={(val) => setCrmSettings({ ...crmSettings, enableCustomerGroups: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل حد الائتمان' : 'Enable Credit Limit'}
                >
                  <Switch 
                    checked={crmSettings.enableCreditLimit}
                    onCheckedChange={(val) => setCrmSettings({ ...crmSettings, enableCreditLimit: val })}
                  />
                </SettingRow>
                {crmSettings.enableCreditLimit && (
                  <SettingRow 
                    label={language === 'ar' ? 'حد الائتمان الافتراضي' : 'Default Credit Limit'}
                  >
                    <Input 
                      type="number"
                      className="w-28"
                      value={crmSettings.defaultCreditLimit}
                      onChange={(e) => setCrmSettings({ ...crmSettings, defaultCreditLimit: Number(e.target.value) })}
                    />
                  </SettingRow>
                )}
                <SettingRow 
                  label={language === 'ar' ? 'تتبع سجل المشتريات' : 'Track Purchase History'}
                >
                  <Switch 
                    checked={crmSettings.trackPurchaseHistory}
                    onCheckedChange={(val) => setCrmSettings({ ...crmSettings, trackPurchaseHistory: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Notifications */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Bell size={16} />
                  {language === 'ar' ? 'الإشعارات' : 'Notifications'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تذكير أعياد الميلاد' : 'Birthday Reminders'}
                >
                  <Switch 
                    checked={crmSettings.enableBirthdayReminders}
                    onCheckedChange={(val) => setCrmSettings({ ...crmSettings, enableBirthdayReminders: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'إرسال رسائل SMS' : 'Send SMS Notifications'}
                >
                  <Switch 
                    checked={crmSettings.sendSMSNotifications}
                    onCheckedChange={(val) => setCrmSettings({ ...crmSettings, sendSMSNotifications: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'إرسال رسائل البريد الإلكتروني' : 'Send Email Notifications'}
                >
                  <Switch 
                    checked={crmSettings.sendEmailNotifications}
                    onCheckedChange={(val) => setCrmSettings({ ...crmSettings, sendEmailNotifications: val })}
                  />
                </SettingRow>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Settings */}
        <TabsContent value="sales" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt size={20} />
                    {language === 'ar' ? 'إعدادات المبيعات' : 'Sales Settings'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'تخصيص إعدادات فواتير المبيعات والمندوبين' : 'Customize sales invoices and salesmen settings'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleReset('sales')}>
                    <RotateCcw size={16} className="me-2" />
                    {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                  </Button>
                  <Button onClick={() => handleSave('sales')}>
                    <Save size={16} className="me-2" />
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invoice Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <FileText size={16} />
                  {language === 'ar' ? 'إعدادات الفواتير' : 'Invoice Settings'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'إنشاء أرقام الفواتير تلقائياً' : 'Auto Generate Invoice Numbers'}
                >
                  <Switch 
                    checked={salesSettings.autoGenerateInvoiceNumbers}
                    onCheckedChange={(val) => setSalesSettings({ ...salesSettings, autoGenerateInvoiceNumbers: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'بادئة الفواتير' : 'Invoice Prefix'}
                >
                  <Input 
                    className="w-24"
                    value={salesSettings.invoicePrefix}
                    onChange={(e) => setSalesSettings({ ...salesSettings, invoicePrefix: e.target.value })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل تاريخ الاستحقاق' : 'Enable Due Dates'}
                >
                  <Switch 
                    checked={salesSettings.enableDueDates}
                    onCheckedChange={(val) => setSalesSettings({ ...salesSettings, enableDueDates: val })}
                  />
                </SettingRow>
                {salesSettings.enableDueDates && (
                  <SettingRow 
                    label={language === 'ar' ? 'فترة الاستحقاق الافتراضية (أيام)' : 'Default Due Days'}
                  >
                    <Input 
                      type="number"
                      className="w-20"
                      value={salesSettings.defaultDueDays}
                      onChange={(e) => setSalesSettings({ ...salesSettings, defaultDueDays: Number(e.target.value) })}
                    />
                  </SettingRow>
                )}
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل الدفعات الجزئية' : 'Enable Partial Payments'}
                >
                  <Switch 
                    checked={salesSettings.enablePartialPayments}
                    onCheckedChange={(val) => setSalesSettings({ ...salesSettings, enablePartialPayments: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Salesmen Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <UserCheck size={16} />
                  {language === 'ar' ? 'إعدادات المندوبين' : 'Salesmen Settings'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل المندوبين' : 'Enable Salesmen'}
                  description={language === 'ar' ? 'ربط الفواتير بمندوبي المبيعات' : 'Link invoices to salesmen'}
                >
                  <Switch 
                    checked={salesSettings.enableSalesmen}
                    onCheckedChange={(val) => setSalesSettings({ ...salesSettings, enableSalesmen: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تتبع أداء المندوبين' : 'Track Salesman Performance'}
                >
                  <Switch 
                    checked={salesSettings.trackSalesmanPerformance}
                    onCheckedChange={(val) => setSalesSettings({ ...salesSettings, trackSalesmanPerformance: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Returns & Quotations */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <RotateCcw size={16} />
                  {language === 'ar' ? 'المرتجعات والعروض' : 'Returns & Quotations'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل مرتجعات المبيعات' : 'Enable Sales Returns'}
                >
                  <Switch 
                    checked={salesSettings.enableSalesReturns}
                    onCheckedChange={(val) => setSalesSettings({ ...salesSettings, enableSalesReturns: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'طلب موافقة على المرتجعات' : 'Require Return Approval'}
                >
                  <Switch 
                    checked={salesSettings.returnApprovalRequired}
                    onCheckedChange={(val) => setSalesSettings({ ...salesSettings, returnApprovalRequired: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل عروض الأسعار' : 'Enable Quotations'}
                >
                  <Switch 
                    checked={salesSettings.enableQuotations}
                    onCheckedChange={(val) => setSalesSettings({ ...salesSettings, enableQuotations: val })}
                  />
                </SettingRow>
                {salesSettings.enableQuotations && (
                  <SettingRow 
                    label={language === 'ar' ? 'صلاحية العرض (أيام)' : 'Quotation Validity (Days)'}
                  >
                    <Input 
                      type="number"
                      className="w-20"
                      value={salesSettings.quotationValidityDays}
                      onChange={(e) => setSalesSettings({ ...salesSettings, quotationValidityDays: Number(e.target.value) })}
                    />
                  </SettingRow>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Settings */}
        <TabsContent value="reports" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText size={20} />
                    {language === 'ar' ? 'إعدادات التقارير' : 'Reports Settings'}
                  </CardTitle>
                  <CardDescription>
                    {language === 'ar' ? 'تخصيص إعدادات التقارير والمعاينة والتصدير' : 'Customize reports, preview and export settings'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleReset('reports')}>
                    <RotateCcw size={16} className="me-2" />
                    {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                  </Button>
                  <Button onClick={() => handleSave('reports')}>
                    <Save size={16} className="me-2" />
                    {language === 'ar' ? 'حفظ' : 'Save'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Display Settings */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Receipt size={16} />
                  {language === 'ar' ? 'إعدادات العرض' : 'Display Settings'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل معاينة التقارير' : 'Enable Report Preview'}
                  description={language === 'ar' ? 'عرض التقرير مباشرة قبل الطباعة أو التصدير' : 'Show report preview before print or export'}
                >
                  <Switch 
                    checked={reportsSettings.enableReportPreview}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, enableReportPreview: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'عرض ملخص التقرير' : 'Show Report Summary'}
                >
                  <Switch 
                    checked={reportsSettings.showReportSummary}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, showReportSummary: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'صيغة التصدير الافتراضية' : 'Default Export Format'}
                >
                  <Select 
                    value={reportsSettings.defaultExportFormat}
                    onValueChange={(val) => setReportsSettings({ ...reportsSettings, defaultExportFormat: val })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">{language === 'ar' ? 'Excel' : 'Excel'}</SelectItem>
                      <SelectItem value="pdf">{language === 'ar' ? 'PDF' : 'PDF'}</SelectItem>
                      <SelectItem value="csv">{language === 'ar' ? 'CSV' : 'CSV'}</SelectItem>
                    </SelectContent>
                  </Select>
                </SettingRow>
              </div>

              <Separator />

              {/* Report Types */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Package size={16} />
                  {language === 'ar' ? 'أنواع التقارير' : 'Report Types'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل التقارير المخصصة' : 'Enable Custom Reports'}
                >
                  <Switch 
                    checked={reportsSettings.enableCustomReports}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, enableCustomReports: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل تقارير الموارد البشرية' : 'Enable HR Reports'}
                  description={language === 'ar' ? 'تقارير الحضور والرواتب' : 'Attendance and payroll reports'}
                >
                  <Switch 
                    checked={reportsSettings.enableHRReports}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, enableHRReports: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل تقارير عمولات المبيعات' : 'Enable Sales Commission Reports'}
                >
                  <Switch 
                    checked={reportsSettings.enableSalesCommissionReports}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, enableSalesCommissionReports: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل تقارير التوصيل' : 'Enable Delivery Reports'}
                >
                  <Switch 
                    checked={reportsSettings.enableDeliveryReports}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, enableDeliveryReports: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Advanced Reports */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calculator size={16} />
                  {language === 'ar' ? 'التقارير المتقدمة' : 'Advanced Reports'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل تقرير الأرباح والخسائر' : 'Enable Profit & Loss Report'}
                >
                  <Switch 
                    checked={reportsSettings.enableProfitLossReport}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, enableProfitLossReport: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل تقرير تحليل المبيعات' : 'Enable Sales Analysis Report'}
                >
                  <Switch 
                    checked={reportsSettings.enableSalesAnalysisReport}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, enableSalesAnalysisReport: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل تقرير حركة العملاء والموردين' : 'Enable Customer/Supplier Movement'}
                >
                  <Switch 
                    checked={reportsSettings.enableCustomerSupplierMovement}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, enableCustomerSupplierMovement: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'مقارنة بالفترة السابقة' : 'Compare with Previous Period'}
                >
                  <Switch 
                    checked={reportsSettings.comparePreviousPeriod}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, comparePreviousPeriod: val })}
                  />
                </SettingRow>
              </div>

              <Separator />

              {/* Scheduling & Retention */}
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock size={16} />
                  {language === 'ar' ? 'الجدولة والاحتفاظ' : 'Scheduling & Retention'}
                </h4>
                <SettingRow 
                  label={language === 'ar' ? 'تفعيل جدولة التقارير' : 'Enable Report Scheduling'}
                >
                  <Switch 
                    checked={reportsSettings.enableReportScheduling}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, enableReportScheduling: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'إرسال التقارير بالبريد' : 'Email Reports'}
                >
                  <Switch 
                    checked={reportsSettings.enableEmailReports}
                    onCheckedChange={(val) => setReportsSettings({ ...reportsSettings, enableEmailReports: val })}
                  />
                </SettingRow>
                <SettingRow 
                  label={language === 'ar' ? 'فترة الاحتفاظ بالتقارير (أيام)' : 'Retain Reports (Days)'}
                >
                  <Input 
                    type="number"
                    className="w-20"
                    value={reportsSettings.retainReportsDays}
                    onChange={(e) => setReportsSettings({ ...reportsSettings, retainReportsDays: Number(e.target.value) })}
                  />
                </SettingRow>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModuleSettings;
