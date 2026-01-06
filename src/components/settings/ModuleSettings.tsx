import React, { useState } from 'react';
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

  // POS Settings
  const [posSettings, setPosSettings] = useState({
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
    countFrequencyDays: 30
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
    lateFeePercent: 2
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
    autoCreatePOOnLowStock: false
  });

  // HR Settings
  const [hrSettings, setHrSettings] = useState({
    workingDaysPerWeek: 6,
    workingHoursPerDay: 8,
    enableAttendance: true,
    attendanceMethod: 'manual',
    enableOvertime: true,
    overtimeRate: 1.5,
    enableLeaveManagement: true,
    annualLeaveDays: 21,
    enablePayroll: true,
    payrollCycle: 'monthly',
    enableAdvances: true,
    maxAdvancePercent: 50,
    enablePerformanceReviews: false
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

  const handleSave = (module: string) => {
    toast({ 
      title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Settings saved successfully',
      description: language === 'ar' ? `تم حفظ إعدادات ${getModuleName(module)}` : `${getModuleName(module)} settings saved`
    });
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
      hr: { en: 'Human Resources', ar: 'الموارد البشرية' },
      crm: { en: 'Customer Relations', ar: 'العملاء' }
    };
    return language === 'ar' ? names[module].ar : names[module].en;
  };

  const modules = [
    { id: 'pos', icon: ShoppingCart, label: language === 'ar' ? 'نقاط البيع' : 'POS' },
    { id: 'inventory', icon: Package, label: language === 'ar' ? 'المخزون' : 'Inventory' },
    { id: 'finance', icon: DollarSign, label: language === 'ar' ? 'المالية' : 'Finance' },
    { id: 'purchasing', icon: Truck, label: language === 'ar' ? 'المشتريات' : 'Purchasing' },
    { id: 'hr', icon: Users, label: language === 'ar' ? 'الموارد البشرية' : 'HR' },
    { id: 'crm', icon: UserCheck, label: language === 'ar' ? 'العملاء' : 'CRM' }
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
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1">
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
      </Tabs>
    </div>
  );
};

export default ModuleSettings;
