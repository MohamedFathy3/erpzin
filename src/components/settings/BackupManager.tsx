import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Download, 
  Upload, 
  Database, 
  FileJson, 
  Clock,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  RefreshCw,
  Shield,
  Package,
  Users,
  ShoppingCart,
  DollarSign,
  Settings,
  Building2,
  Truck,
  Archive
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BackupData {
  version: string;
  timestamp: string;
  tables: Record<string, any[]>;
}

interface TableConfig {
  name: string;
  label: string;
  labelAr: string;
  icon: React.ElementType;
  category: 'core' | 'transactions' | 'settings';
}

const BackupManager = () => {
  const { language } = useLanguage();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [importProgress, setImportProgress] = useState(0);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  const translations = {
    en: {
      title: 'Backup & Restore',
      description: 'Export and import system data backup',
      exportData: 'Export Backup',
      importData: 'Restore Backup',
      selectTables: 'Select Data to Backup',
      selectAll: 'Select All',
      deselectAll: 'Deselect All',
      coreData: 'Core Data',
      transactions: 'Transactions',
      settingsData: 'Settings',
      exporting: 'Exporting...',
      importing: 'Importing...',
      exportSuccess: 'Backup exported successfully',
      importSuccess: 'Backup restored successfully',
      importError: 'Error restoring backup',
      invalidFile: 'Invalid backup file',
      lastBackup: 'Last Backup',
      never: 'Never',
      warning: 'Warning',
      importWarning: 'Restoring a backup will replace existing data. This action cannot be undone.',
      continue: 'Continue',
      cancel: 'Cancel',
      fileSelected: 'File selected',
      selectFile: 'Select backup file',
      backupInfo: 'Backup Information',
      tablesCount: 'Tables',
      recordsCount: 'Total Records',
      fileSize: 'File Size',
      products: 'Products',
      categories: 'Categories',
      customers: 'Customers',
      suppliers: 'Suppliers',
      sales: 'Sales',
      purchases: 'Purchases',
      inventory: 'Inventory',
      employees: 'Employees',
      branches: 'Branches',
      warehouses: 'Warehouses',
      companySettings: 'Company Settings',
      paymentMethods: 'Payment Methods',
      taxRates: 'Tax Rates',
      chartOfAccounts: 'Chart of Accounts',
      banks: 'Banks'
    },
    ar: {
      title: 'النسخ الاحتياطي والاستعادة',
      description: 'تصدير واستيراد نسخة احتياطية من بيانات النظام',
      exportData: 'تصدير نسخة احتياطية',
      importData: 'استعادة نسخة احتياطية',
      selectTables: 'اختر البيانات للنسخ الاحتياطي',
      selectAll: 'تحديد الكل',
      deselectAll: 'إلغاء التحديد',
      coreData: 'البيانات الأساسية',
      transactions: 'المعاملات',
      settingsData: 'الإعدادات',
      exporting: 'جاري التصدير...',
      importing: 'جاري الاستيراد...',
      exportSuccess: 'تم تصدير النسخة الاحتياطية بنجاح',
      importSuccess: 'تم استعادة النسخة الاحتياطية بنجاح',
      importError: 'خطأ في استعادة النسخة الاحتياطية',
      invalidFile: 'ملف نسخة احتياطية غير صالح',
      lastBackup: 'آخر نسخة احتياطية',
      never: 'لم يتم بعد',
      warning: 'تحذير',
      importWarning: 'استعادة النسخة الاحتياطية ستستبدل البيانات الحالية. لا يمكن التراجع عن هذا الإجراء.',
      continue: 'متابعة',
      cancel: 'إلغاء',
      fileSelected: 'تم اختيار الملف',
      selectFile: 'اختر ملف النسخة الاحتياطية',
      backupInfo: 'معلومات النسخة الاحتياطية',
      tablesCount: 'الجداول',
      recordsCount: 'إجمالي السجلات',
      fileSize: 'حجم الملف',
      products: 'المنتجات',
      categories: 'الفئات',
      customers: 'العملاء',
      suppliers: 'الموردين',
      sales: 'المبيعات',
      purchases: 'المشتريات',
      inventory: 'المخزون',
      employees: 'الموظفين',
      branches: 'الفروع',
      warehouses: 'المخازن',
      companySettings: 'إعدادات الشركة',
      paymentMethods: 'طرق الدفع',
      taxRates: 'معدلات الضرائب',
      chartOfAccounts: 'شجرة الحسابات',
      banks: 'البنوك'
    }
  };

  const t = translations[language];

  const tableConfigs: TableConfig[] = [
    // Core Data
    { name: 'products', label: 'Products', labelAr: 'المنتجات', icon: Package, category: 'core' },
    { name: 'product_variants', label: 'Product Variants', labelAr: 'متغيرات المنتجات', icon: Package, category: 'core' },
    { name: 'categories', label: 'Categories', labelAr: 'الفئات', icon: Package, category: 'core' },
    { name: 'customers', label: 'Customers', labelAr: 'العملاء', icon: Users, category: 'core' },
    { name: 'suppliers', label: 'Suppliers', labelAr: 'الموردين', icon: Truck, category: 'core' },
    { name: 'employees', label: 'Employees', labelAr: 'الموظفين', icon: Users, category: 'core' },
    { name: 'colors', label: 'Colors', labelAr: 'الألوان', icon: Package, category: 'core' },
    { name: 'sizes', label: 'Sizes', labelAr: 'المقاسات', icon: Package, category: 'core' },
    
    // Transactions
    { name: 'sales', label: 'Sales', labelAr: 'المبيعات', icon: ShoppingCart, category: 'transactions' },
    { name: 'sale_items', label: 'Sale Items', labelAr: 'عناصر المبيعات', icon: ShoppingCart, category: 'transactions' },
    { name: 'sales_invoices', label: 'Sales Invoices', labelAr: 'فواتير المبيعات', icon: ShoppingCart, category: 'transactions' },
    { name: 'sales_invoice_items', label: 'Sales Invoice Items', labelAr: 'عناصر فواتير المبيعات', icon: ShoppingCart, category: 'transactions' },
    { name: 'purchase_orders', label: 'Purchase Orders', labelAr: 'أوامر الشراء', icon: Truck, category: 'transactions' },
    { name: 'purchase_order_items', label: 'Purchase Order Items', labelAr: 'عناصر أوامر الشراء', icon: Truck, category: 'transactions' },
    { name: 'purchase_invoices', label: 'Purchase Invoices', labelAr: 'فواتير الشراء', icon: Truck, category: 'transactions' },
    { name: 'purchase_invoice_items', label: 'Purchase Invoice Items', labelAr: 'عناصر فواتير الشراء', icon: Truck, category: 'transactions' },
    { name: 'inventory_movements', label: 'Inventory Movements', labelAr: 'حركات المخزون', icon: Archive, category: 'transactions' },
    { name: 'expenses', label: 'Expenses', labelAr: 'المصروفات', icon: DollarSign, category: 'transactions' },
    { name: 'revenues', label: 'Revenues', labelAr: 'الإيرادات', icon: DollarSign, category: 'transactions' },
    { name: 'bank_transactions', label: 'Bank Transactions', labelAr: 'معاملات البنك', icon: DollarSign, category: 'transactions' },
    
    // Settings
    { name: 'branches', label: 'Branches', labelAr: 'الفروع', icon: Building2, category: 'settings' },
    { name: 'warehouses', label: 'Warehouses', labelAr: 'المخازن', icon: Building2, category: 'settings' },
    { name: 'branch_warehouses', label: 'Branch Warehouses', labelAr: 'ربط الفروع بالمخازن', icon: Building2, category: 'settings' },
    { name: 'company_settings', label: 'Company Settings', labelAr: 'إعدادات الشركة', icon: Settings, category: 'settings' },
    { name: 'payment_methods', label: 'Payment Methods', labelAr: 'طرق الدفع', icon: DollarSign, category: 'settings' },
    { name: 'chart_of_accounts', label: 'Chart of Accounts', labelAr: 'شجرة الحسابات', icon: DollarSign, category: 'settings' },
    { name: 'banks', label: 'Banks', labelAr: 'البنوك', icon: Building2, category: 'settings' },
  ];

  // Initialize with all tables selected
  React.useEffect(() => {
    if (selectedTables.length === 0) {
      setSelectedTables(tableConfigs.map(t => t.name));
    }
    // Load last backup time from localStorage
    const lastBackupTime = localStorage.getItem('lastBackupTime');
    if (lastBackupTime) {
      setLastBackup(lastBackupTime);
    }
  }, []);

  const toggleTable = (tableName: string) => {
    setSelectedTables(prev => 
      prev.includes(tableName) 
        ? prev.filter(t => t !== tableName)
        : [...prev, tableName]
    );
  };

  const selectAllTables = () => {
    setSelectedTables(tableConfigs.map(t => t.name));
  };

  const deselectAllTables = () => {
    setSelectedTables([]);
  };

  const selectCategory = (category: 'core' | 'transactions' | 'settings') => {
    const categoryTables = tableConfigs.filter(t => t.category === category).map(t => t.name);
    const allSelected = categoryTables.every(t => selectedTables.includes(t));
    
    if (allSelected) {
      setSelectedTables(prev => prev.filter(t => !categoryTables.includes(t)));
    } else {
      setSelectedTables(prev => [...new Set([...prev, ...categoryTables])]);
    }
  };

  const handleExport = async () => {
    if (selectedTables.length === 0) {
      toast({ 
        title: language === 'ar' ? 'الرجاء تحديد جداول للتصدير' : 'Please select tables to export', 
        variant: 'destructive' 
      });
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    try {
      const backupData: BackupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        tables: {}
      };

      for (let i = 0; i < selectedTables.length; i++) {
        const tableName = selectedTables[i];
        setExportProgress(((i + 1) / selectedTables.length) * 100);

        const { data, error } = await supabase
          .from(tableName as any)
          .select('*');

        if (error) {
          console.error(`Error exporting ${tableName}:`, error);
          continue;
        }

        backupData.tables[tableName] = data || [];
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save last backup time
      const now = new Date().toISOString();
      localStorage.setItem('lastBackupTime', now);
      setLastBackup(now);

      toast({ title: t.exportSuccess });
    } catch (error) {
      console.error('Export error:', error);
      toast({ 
        title: language === 'ar' ? 'خطأ في التصدير' : 'Export error', 
        variant: 'destructive' 
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress(0);

    try {
      const text = await file.text();
      const backupData: BackupData = JSON.parse(text);

      // Validate backup file
      if (!backupData.version || !backupData.timestamp || !backupData.tables) {
        throw new Error('Invalid backup file');
      }

      const tableNames = Object.keys(backupData.tables);
      
      for (let i = 0; i < tableNames.length; i++) {
        const tableName = tableNames[i];
        const records = backupData.tables[tableName];
        setImportProgress(((i + 1) / tableNames.length) * 100);

        if (records.length === 0) continue;

        // Delete existing data
        await supabase.from(tableName as any).delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // Insert new data in batches
        const batchSize = 100;
        for (let j = 0; j < records.length; j += batchSize) {
          const batch = records.slice(j, j + batchSize);
          const { error } = await supabase.from(tableName as any).insert(batch);
          if (error) {
            console.error(`Error importing ${tableName}:`, error);
          }
        }
      }

      toast({ title: t.importSuccess });
    } catch (error) {
      console.error('Import error:', error);
      toast({ 
        title: t.importError, 
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive' 
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
      // Reset file input
      event.target.value = '';
    }
  };

  const getCategoryTables = (category: 'core' | 'transactions' | 'settings') => {
    return tableConfigs.filter(t => t.category === category);
  };

  const isCategorySelected = (category: 'core' | 'transactions' | 'settings') => {
    const categoryTables = getCategoryTables(category);
    return categoryTables.every(t => selectedTables.includes(t.name));
  };

  const isCategoryPartiallySelected = (category: 'core' | 'transactions' | 'settings') => {
    const categoryTables = getCategoryTables(category);
    const selectedCount = categoryTables.filter(t => selectedTables.includes(t.name)).length;
    return selectedCount > 0 && selectedCount < categoryTables.length;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US');
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Database className="text-primary" size={20} />
              </div>
              <div>
                <CardTitle>{t.title}</CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock size={16} />
              <span>{t.lastBackup}: </span>
              <Badge variant="outline">
                {lastBackup ? formatDate(lastBackup) : t.never}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Export Section */}
      <Card className="card-elevated">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Download size={20} />
              {t.exportData}
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAllTables}>
                {t.selectAll}
              </Button>
              <Button variant="outline" size="sm" onClick={deselectAllTables}>
                {t.deselectAll}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Label className="text-base font-semibold">{t.selectTables}</Label>
          
          {/* Core Data */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isCategorySelected('core')}
                onCheckedChange={() => selectCategory('core')}
                className={isCategoryPartiallySelected('core') ? 'data-[state=checked]:bg-primary/50' : ''}
              />
              <Label className="font-semibold flex items-center gap-2 cursor-pointer" onClick={() => selectCategory('core')}>
                <HardDrive size={16} />
                {t.coreData}
              </Label>
              <Badge variant="secondary">{getCategoryTables('core').filter(t => selectedTables.includes(t.name)).length}/{getCategoryTables('core').length}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ps-6">
              {getCategoryTables('core').map((table) => (
                <div key={table.name} className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedTables.includes(table.name)}
                    onCheckedChange={() => toggleTable(table.name)}
                  />
                  <Label className="text-sm cursor-pointer flex items-center gap-1" onClick={() => toggleTable(table.name)}>
                    <table.icon size={14} className="text-muted-foreground" />
                    {language === 'ar' ? table.labelAr : table.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Transactions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isCategorySelected('transactions')}
                onCheckedChange={() => selectCategory('transactions')}
                className={isCategoryPartiallySelected('transactions') ? 'data-[state=checked]:bg-primary/50' : ''}
              />
              <Label className="font-semibold flex items-center gap-2 cursor-pointer" onClick={() => selectCategory('transactions')}>
                <RefreshCw size={16} />
                {t.transactions}
              </Label>
              <Badge variant="secondary">{getCategoryTables('transactions').filter(t => selectedTables.includes(t.name)).length}/{getCategoryTables('transactions').length}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ps-6">
              {getCategoryTables('transactions').map((table) => (
                <div key={table.name} className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedTables.includes(table.name)}
                    onCheckedChange={() => toggleTable(table.name)}
                  />
                  <Label className="text-sm cursor-pointer flex items-center gap-1" onClick={() => toggleTable(table.name)}>
                    <table.icon size={14} className="text-muted-foreground" />
                    {language === 'ar' ? table.labelAr : table.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox 
                checked={isCategorySelected('settings')}
                onCheckedChange={() => selectCategory('settings')}
                className={isCategoryPartiallySelected('settings') ? 'data-[state=checked]:bg-primary/50' : ''}
              />
              <Label className="font-semibold flex items-center gap-2 cursor-pointer" onClick={() => selectCategory('settings')}>
                <Settings size={16} />
                {t.settingsData}
              </Label>
              <Badge variant="secondary">{getCategoryTables('settings').filter(t => selectedTables.includes(t.name)).length}/{getCategoryTables('settings').length}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 ps-6">
              {getCategoryTables('settings').map((table) => (
                <div key={table.name} className="flex items-center gap-2">
                  <Checkbox 
                    checked={selectedTables.includes(table.name)}
                    onCheckedChange={() => toggleTable(table.name)}
                  />
                  <Label className="text-sm cursor-pointer flex items-center gap-1" onClick={() => toggleTable(table.name)}>
                    <table.icon size={14} className="text-muted-foreground" />
                    {language === 'ar' ? table.labelAr : table.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Export Button */}
          <div className="flex items-center gap-4">
            <Button 
              className="gradient-primary"
              onClick={handleExport}
              disabled={isExporting || selectedTables.length === 0}
            >
              {isExporting ? (
                <>
                  <RefreshCw size={16} className="me-2 animate-spin" />
                  {t.exporting}
                </>
              ) : (
                <>
                  <Download size={16} className="me-2" />
                  {t.exportData}
                </>
              )}
            </Button>
            <Badge variant="outline">
              {selectedTables.length} {language === 'ar' ? 'جدول محدد' : 'tables selected'}
            </Badge>
          </div>
          
          {isExporting && (
            <div className="space-y-2">
              <Progress value={exportProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{Math.round(exportProgress)}%</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload size={20} />
            {t.importData}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="text-destructive mt-0.5" size={20} />
            <div>
              <p className="font-medium text-destructive">{t.warning}</p>
              <p className="text-sm text-muted-foreground">{t.importWarning}</p>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <div className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
                <FileJson className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">{t.selectFile}</p>
                <p className="text-sm text-muted-foreground">JSON (.json)</p>
              </div>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="text-destructive" size={20} />
                  {t.warning}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t.importWarning}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                <AlertDialogAction asChild>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={handleImport}
                      disabled={isImporting}
                    />
                    <span>{t.continue}</span>
                  </label>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <RefreshCw size={16} className="animate-spin" />
                <span>{t.importing}</span>
              </div>
              <Progress value={importProgress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center">{Math.round(importProgress)}%</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BackupManager;
