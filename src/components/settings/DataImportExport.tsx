import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Download, 
  Package, 
  Users, 
  Truck, 
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2,
  AlertTriangle,
  FileDown
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import OpeningBalances from '@/components/inventory/OpeningBalances';

interface CustomerImportRow {
  name: string;
  name_ar?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

interface SupplierImportRow {
  name: string;
  name_ar?: string;
  phone?: string;
  email?: string;
  address?: string;
  contact_person?: string;
  tax_number?: string;
}

const DataImportExport: React.FC = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('opening');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Customer import state
  const customerFileRef = useRef<HTMLInputElement>(null);
  const [customerImportData, setCustomerImportData] = useState<CustomerImportRow[]>([]);
  const [customerImportErrors, setCustomerImportErrors] = useState<string[]>([]);
  const [showCustomerImportDialog, setShowCustomerImportDialog] = useState(false);
  const [customerImportProgress, setCustomerImportProgress] = useState(0);
  const [isImportingCustomers, setIsImportingCustomers] = useState(false);

  // Supplier import state
  const supplierFileRef = useRef<HTMLInputElement>(null);
  const [supplierImportData, setSupplierImportData] = useState<SupplierImportRow[]>([]);
  const [supplierImportErrors, setSupplierImportErrors] = useState<string[]>([]);
  const [showSupplierImportDialog, setShowSupplierImportDialog] = useState(false);
  const [supplierImportProgress, setSupplierImportProgress] = useState(0);
  const [isImportingSuppliers, setIsImportingSuppliers] = useState(false);

  // Fetch data for export
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-export'],
    queryFn: async () => {
      const { data, error } = await supabase.from('customers').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-export'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  const { data: openingBalances = [] } = useQuery({
    queryKey: ['opening-balances-export'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opening_balances')
        .select('*, products(name, name_ar, sku), warehouses(name, name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const exportToExcel = (data: any[], fileName: string, sheetName: string) => {
    setIsExporting(fileName);
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({
        title: language === 'ar' ? 'تم التصدير بنجاح' : 'Export successful',
        description: language === 'ar' ? `تم تصدير ${data.length} سجل` : `Exported ${data.length} records`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: language === 'ar' ? 'خطأ في التصدير' : 'Export error',
        variant: 'destructive'
      });
    } finally {
      setIsExporting(null);
    }
  };

  const exportCustomers = () => {
    const exportData = customers.map(c => ({
      [language === 'ar' ? 'الاسم' : 'Name']: c.name,
      [language === 'ar' ? 'الاسم بالعربي' : 'Arabic Name']: c.name_ar || '',
      [language === 'ar' ? 'الهاتف' : 'Phone']: c.phone || '',
      [language === 'ar' ? 'البريد الإلكتروني' : 'Email']: c.email || '',
      [language === 'ar' ? 'العنوان' : 'Address']: c.address || '',
      [language === 'ar' ? 'نقاط الولاء' : 'Loyalty Points']: c.loyalty_points || 0,
      [language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases']: c.total_purchases || 0,
      [language === 'ar' ? 'ملاحظات' : 'Notes']: c.notes || '',
    }));
    exportToExcel(exportData, 'customers', language === 'ar' ? 'العملاء' : 'Customers');
  };

  const exportSuppliers = () => {
    const exportData = suppliers.map(s => ({
      [language === 'ar' ? 'الاسم' : 'Name']: s.name,
      [language === 'ar' ? 'الاسم بالعربي' : 'Arabic Name']: s.name_ar || '',
      [language === 'ar' ? 'الهاتف' : 'Phone']: s.phone || '',
      [language === 'ar' ? 'البريد الإلكتروني' : 'Email']: s.email || '',
      [language === 'ar' ? 'العنوان' : 'Address']: s.address || '',
      [language === 'ar' ? 'جهة الاتصال' : 'Contact Person']: s.contact_person || '',
      [language === 'ar' ? 'الرصيد' : 'Balance']: s.balance || 0,
      [language === 'ar' ? 'الرقم الضريبي' : 'Tax Number']: s.tax_number || '',
    }));
    exportToExcel(exportData, 'suppliers', language === 'ar' ? 'الموردين' : 'Suppliers');
  };

  const exportOpeningBalances = () => {
    const exportData = openingBalances.map(ob => ({
      [language === 'ar' ? 'المنتج' : 'Product']: ob.products?.name || '',
      [language === 'ar' ? 'المنتج بالعربي' : 'Product (Arabic)']: ob.products?.name_ar || '',
      [language === 'ar' ? 'SKU' : 'SKU']: ob.products?.sku || '',
      [language === 'ar' ? 'المستودع' : 'Warehouse']: ob.warehouses?.name || '',
      [language === 'ar' ? 'الكمية' : 'Quantity']: ob.quantity,
      [language === 'ar' ? 'تكلفة الوحدة' : 'Unit Cost']: ob.unit_cost,
      [language === 'ar' ? 'القيمة الإجمالية' : 'Total Value']: ob.total_value,
      [language === 'ar' ? 'تاريخ الرصيد' : 'Balance Date']: ob.balance_date,
      [language === 'ar' ? 'ملاحظات' : 'Notes']: ob.notes || '',
    }));
    exportToExcel(exportData, 'opening_balances', language === 'ar' ? 'أول_المدة' : 'Opening_Balances');
  };

  // Customer import handlers
  const handleCustomerFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        const validData: CustomerImportRow[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          const name = row.name || row.Name || row['الاسم'];
          if (!name) {
            errors.push(`${language === 'ar' ? 'الصف' : 'Row'} ${index + 2}: ${language === 'ar' ? 'اسم العميل مطلوب' : 'Customer name is required'}`);
          } else {
            validData.push({
              name: String(name),
              name_ar: row.name_ar || row['الاسم بالعربي'] || '',
              phone: row.phone || row.Phone || row['الهاتف'] || '',
              email: row.email || row.Email || row['البريد الإلكتروني'] || '',
              address: row.address || row.Address || row['العنوان'] || '',
              notes: row.notes || row.Notes || row['ملاحظات'] || ''
            });
          }
        });

        setCustomerImportData(validData);
        setCustomerImportErrors(errors);
        setShowCustomerImportDialog(true);

      } catch (err) {
        toast({ title: language === 'ar' ? 'صيغة الملف غير صالحة' : 'Invalid file format', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
    if (customerFileRef.current) customerFileRef.current.value = '';
  };

  const importCustomersMutation = useMutation({
    mutationFn: async () => {
      setIsImportingCustomers(true);
      setCustomerImportProgress(0);

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < customerImportData.length; i++) {
        const row = customerImportData[i];
        try {
          const { error } = await supabase.from('customers').insert({
            name: row.name,
            name_ar: row.name_ar || null,
            phone: row.phone || null,
            email: row.email || null,
            address: row.address || null,
            notes: row.notes || null
          });

          if (error) {
            failCount++;
            errors.push(`${language === 'ar' ? 'الصف' : 'Row'} ${i + 1}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err: any) {
          failCount++;
          errors.push(`${language === 'ar' ? 'الصف' : 'Row'} ${i + 1}: ${err.message}`);
        }
        setCustomerImportProgress(Math.round(((i + 1) / customerImportData.length) * 100));
      }

      return { successCount, failCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['customers-export'] });
      toast({
        title: language === 'ar' ? 'تم استيراد العملاء بنجاح' : 'Customers imported successfully',
        description: `${result.successCount} ${language === 'ar' ? 'ناجح' : 'successful'}, ${result.failCount} ${language === 'ar' ? 'فاشل' : 'failed'}`
      });
      setCustomerImportData([]);
      setCustomerImportErrors(result.errors);
      setIsImportingCustomers(false);
      if (result.errors.length === 0) setShowCustomerImportDialog(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في الاستيراد' : 'Import error', variant: 'destructive' });
      setIsImportingCustomers(false);
    }
  });

  const downloadCustomerTemplate = () => {
    const template = [{ name: 'John Doe', name_ar: 'جون دو', phone: '0501234567', email: 'john@example.com', address: 'Riyadh', notes: '' }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, 'customers_template.xlsx');
  };

  // Supplier import handlers
  const handleSupplierFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

        const validData: SupplierImportRow[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          const name = row.name || row.Name || row['الاسم'];
          if (!name) {
            errors.push(`${language === 'ar' ? 'الصف' : 'Row'} ${index + 2}: ${language === 'ar' ? 'اسم المورد مطلوب' : 'Supplier name is required'}`);
          } else {
            validData.push({
              name: String(name),
              name_ar: row.name_ar || row['الاسم بالعربي'] || '',
              phone: row.phone || row.Phone || row['الهاتف'] || '',
              email: row.email || row.Email || row['البريد الإلكتروني'] || '',
              address: row.address || row.Address || row['العنوان'] || '',
              contact_person: row.contact_person || row['جهة الاتصال'] || '',
              tax_number: row.tax_number || row['الرقم الضريبي'] || ''
            });
          }
        });

        setSupplierImportData(validData);
        setSupplierImportErrors(errors);
        setShowSupplierImportDialog(true);

      } catch (err) {
        toast({ title: language === 'ar' ? 'صيغة الملف غير صالحة' : 'Invalid file format', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
    if (supplierFileRef.current) supplierFileRef.current.value = '';
  };

  const importSuppliersMutation = useMutation({
    mutationFn: async () => {
      setIsImportingSuppliers(true);
      setSupplierImportProgress(0);

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < supplierImportData.length; i++) {
        const row = supplierImportData[i];
        try {
          const { error } = await supabase.from('suppliers').insert({
            name: row.name,
            name_ar: row.name_ar || null,
            phone: row.phone || null,
            email: row.email || null,
            address: row.address || null,
            contact_person: row.contact_person || null,
            tax_number: row.tax_number || null
          });

          if (error) {
            failCount++;
            errors.push(`${language === 'ar' ? 'الصف' : 'Row'} ${i + 1}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err: any) {
          failCount++;
          errors.push(`${language === 'ar' ? 'الصف' : 'Row'} ${i + 1}: ${err.message}`);
        }
        setSupplierImportProgress(Math.round(((i + 1) / supplierImportData.length) * 100));
      }

      return { successCount, failCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers-export'] });
      toast({
        title: language === 'ar' ? 'تم استيراد الموردين بنجاح' : 'Suppliers imported successfully',
        description: `${result.successCount} ${language === 'ar' ? 'ناجح' : 'successful'}, ${result.failCount} ${language === 'ar' ? 'فاشل' : 'failed'}`
      });
      setSupplierImportData([]);
      setSupplierImportErrors(result.errors);
      setIsImportingSuppliers(false);
      if (result.errors.length === 0) setShowSupplierImportDialog(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في الاستيراد' : 'Import error', variant: 'destructive' });
      setIsImportingSuppliers(false);
    }
  });

  const downloadSupplierTemplate = () => {
    const template = [{ name: 'ABC Supplies', name_ar: 'شركة أ ب ج', phone: '0501234567', email: 'info@abc.com', address: 'Jeddah', contact_person: 'Ahmed', tax_number: '123456789' }];
    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Suppliers');
    XLSX.writeFile(wb, 'suppliers_template.xlsx');
  };

  const t = {
    title: language === 'ar' ? 'استيراد وتصدير البيانات' : 'Import & Export Data',
    description: language === 'ar' ? 'استيراد وتصدير بيانات النظام' : 'Import and export system data',
    openingBalances: language === 'ar' ? 'بضاعة أول المدة' : 'Opening Balances',
    customers: language === 'ar' ? 'العملاء' : 'Customers',
    suppliers: language === 'ar' ? 'الموردين' : 'Suppliers',
    export: language === 'ar' ? 'تصدير' : 'Export',
    import: language === 'ar' ? 'استيراد' : 'Import',
    records: language === 'ar' ? 'سجل' : 'records',
    exportAll: language === 'ar' ? 'تصدير الكل' : 'Export All',
    downloadTemplate: language === 'ar' ? 'تحميل النموذج' : 'Download Template',
    startImport: language === 'ar' ? 'بدء الاستيراد' : 'Start Import',
    preview: language === 'ar' ? 'معاينة البيانات' : 'Data Preview',
    rowsToImport: language === 'ar' ? 'صفوف للاستيراد' : 'Rows to Import',
    errors: language === 'ar' ? 'الأخطاء' : 'Errors',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    dragDrop: language === 'ar' ? 'اسحب وأفلت ملف Excel هنا، أو انقر للاستعراض' : 'Drag & drop Excel file here, or click to browse',
    supportedFormats: language === 'ar' ? 'الصيغ المدعومة: .xlsx, .xls' : 'Supported formats: .xlsx, .xls',
  };

  const dataCards = [
    {
      id: 'customers',
      icon: Users,
      title: t.customers,
      count: customers.length,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      onExport: exportCustomers,
    },
    {
      id: 'suppliers',
      icon: Truck,
      title: t.suppliers,
      count: suppliers.length,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      onExport: exportSuppliers,
    },
    {
      id: 'opening',
      icon: Package,
      title: t.openingBalances,
      count: openingBalances.length,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
      onExport: exportOpeningBalances,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
          <FileSpreadsheet className="text-primary" size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
      </div>

      {/* Quick Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {dataCards.map((card) => (
          <Card key={card.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={card.color} size={20} />
                  </div>
                  <div>
                    <p className="font-medium">{card.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {card.count} {t.records}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={card.onExport}
                  disabled={isExporting === card.id}
                >
                  {isExporting === card.id ? (
                    <Loader2 size={14} className="animate-spin me-1" />
                  ) : (
                    <Download size={14} className="me-1" />
                  )}
                  {t.export}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs for detailed management */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="opening" className="flex items-center gap-2">
            <Package size={14} />
            {t.openingBalances}
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users size={14} />
            {t.customers}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex items-center gap-2">
            <Truck size={14} />
            {t.suppliers}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="opening" className="mt-4">
          <OpeningBalances />
        </TabsContent>

        <TabsContent value="customers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-blue-500" size={20} />
                {t.customers}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'استيراد وتصدير بيانات العملاء من وإلى ملفات Excel'
                  : 'Import and export customer data from/to Excel files'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                <Button onClick={exportCustomers} disabled={isExporting === 'customers'}>
                  {isExporting === 'customers' ? (
                    <Loader2 size={16} className="animate-spin me-2" />
                  ) : (
                    <Download size={16} className="me-2" />
                  )}
                  {language === 'ar' ? 'تصدير العملاء' : 'Export Customers'}
                </Button>
                <Button variant="outline" onClick={() => customerFileRef.current?.click()}>
                  <Upload size={16} className="me-2" />
                  {language === 'ar' ? 'استيراد العملاء' : 'Import Customers'}
                </Button>
                <Button variant="ghost" onClick={downloadCustomerTemplate}>
                  <FileDown size={16} className="me-2" />
                  {t.downloadTemplate}
                </Button>
                <input
                  ref={customerFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleCustomerFileUpload}
                  className="hidden"
                />
              </div>

              {/* Drag & Drop Area */}
              <div
                onClick={() => customerFileRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload size={40} className="mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-muted-foreground">{t.dragDrop}</p>
                <p className="text-sm text-muted-foreground mt-1">{t.supportedFormats}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="text-orange-500" size={20} />
                {t.suppliers}
              </CardTitle>
              <CardDescription>
                {language === 'ar' 
                  ? 'استيراد وتصدير بيانات الموردين من وإلى ملفات Excel'
                  : 'Import and export supplier data from/to Excel files'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                <Button onClick={exportSuppliers} disabled={isExporting === 'suppliers'}>
                  {isExporting === 'suppliers' ? (
                    <Loader2 size={16} className="animate-spin me-2" />
                  ) : (
                    <Download size={16} className="me-2" />
                  )}
                  {language === 'ar' ? 'تصدير الموردين' : 'Export Suppliers'}
                </Button>
                <Button variant="outline" onClick={() => supplierFileRef.current?.click()}>
                  <Upload size={16} className="me-2" />
                  {language === 'ar' ? 'استيراد الموردين' : 'Import Suppliers'}
                </Button>
                <Button variant="ghost" onClick={downloadSupplierTemplate}>
                  <FileDown size={16} className="me-2" />
                  {t.downloadTemplate}
                </Button>
                <input
                  ref={supplierFileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleSupplierFileUpload}
                  className="hidden"
                />
              </div>

              {/* Drag & Drop Area */}
              <div
                onClick={() => supplierFileRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Upload size={40} className="mx-auto text-muted-foreground mb-3" />
                <p className="font-medium text-muted-foreground">{t.dragDrop}</p>
                <p className="text-sm text-muted-foreground mt-1">{t.supportedFormats}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Customer Import Dialog */}
      <Dialog open={showCustomerImportDialog} onOpenChange={setShowCustomerImportDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="text-blue-500" size={20} />
              {language === 'ar' ? 'استيراد العملاء' : 'Import Customers'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress */}
            {isImportingCustomers && (
              <div className="space-y-2">
                <Progress value={customerImportProgress} />
                <p className="text-sm text-center text-muted-foreground">{customerImportProgress}%</p>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle size={14} className="text-green-500" />
                {customerImportData.length} {t.rowsToImport}
              </Badge>
              {customerImportErrors.length > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle size={14} />
                  {customerImportErrors.length} {t.errors}
                </Badge>
              )}
            </div>

            {/* Preview Table */}
            {customerImportData.length > 0 && (
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الهاتف' : 'Phone'}</TableHead>
                      <TableHead>{language === 'ar' ? 'البريد' : 'Email'}</TableHead>
                      <TableHead>{language === 'ar' ? 'العنوان' : 'Address'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customerImportData.slice(0, 50).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.name_ar}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.address}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}

            {/* Errors */}
            {customerImportErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="font-medium text-destructive mb-2 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {t.errors}
                </p>
                <ScrollArea className="h-[100px]">
                  <ul className="text-sm space-y-1">
                    {customerImportErrors.map((err, i) => (
                      <li key={i} className="text-destructive">{err}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerImportDialog(false)}>
              {t.cancel}
            </Button>
            <Button 
              onClick={() => importCustomersMutation.mutate()}
              disabled={isImportingCustomers || customerImportData.length === 0}
            >
              {isImportingCustomers ? (
                <Loader2 size={16} className="animate-spin me-2" />
              ) : (
                <Upload size={16} className="me-2" />
              )}
              {t.startImport}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Supplier Import Dialog */}
      <Dialog open={showSupplierImportDialog} onOpenChange={setShowSupplierImportDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="text-orange-500" size={20} />
              {language === 'ar' ? 'استيراد الموردين' : 'Import Suppliers'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress */}
            {isImportingSuppliers && (
              <div className="space-y-2">
                <Progress value={supplierImportProgress} />
                <p className="text-sm text-center text-muted-foreground">{supplierImportProgress}%</p>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-4">
              <Badge variant="secondary" className="flex items-center gap-1">
                <CheckCircle size={14} className="text-green-500" />
                {supplierImportData.length} {t.rowsToImport}
              </Badge>
              {supplierImportErrors.length > 0 && (
                <Badge variant="destructive" className="flex items-center gap-1">
                  <AlertTriangle size={14} />
                  {supplierImportErrors.length} {t.errors}
                </Badge>
              )}
            </div>

            {/* Preview Table */}
            {supplierImportData.length > 0 && (
              <ScrollArea className="h-[300px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{language === 'ar' ? 'الاسم' : 'Name'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الاسم بالعربي' : 'Arabic Name'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الهاتف' : 'Phone'}</TableHead>
                      <TableHead>{language === 'ar' ? 'البريد' : 'Email'}</TableHead>
                      <TableHead>{language === 'ar' ? 'جهة الاتصال' : 'Contact'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الرقم الضريبي' : 'Tax Number'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {supplierImportData.slice(0, 50).map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell>{row.name_ar}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.contact_person}</TableCell>
                        <TableCell>{row.tax_number}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            )}

            {/* Errors */}
            {supplierImportErrors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="font-medium text-destructive mb-2 flex items-center gap-2">
                  <AlertCircle size={16} />
                  {t.errors}
                </p>
                <ScrollArea className="h-[100px]">
                  <ul className="text-sm space-y-1">
                    {supplierImportErrors.map((err, i) => (
                      <li key={i} className="text-destructive">{err}</li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSupplierImportDialog(false)}>
              {t.cancel}
            </Button>
            <Button 
              onClick={() => importSuppliersMutation.mutate()}
              disabled={isImportingSuppliers || supplierImportData.length === 0}
            >
              {isImportingSuppliers ? (
                <Loader2 size={16} className="animate-spin me-2" />
              ) : (
                <Upload size={16} className="me-2" />
              )}
              {t.startImport}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataImportExport;
