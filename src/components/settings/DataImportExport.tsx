import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Download, 
  Package, 
  Users, 
  Truck, 
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import * as XLSX from 'xlsx';
import OpeningBalances from '@/components/inventory/OpeningBalances';

const DataImportExport: React.FC = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('opening');
  const [isExporting, setIsExporting] = useState<string | null>(null);

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
            <CardContent>
              <div className="flex gap-3">
                <Button onClick={exportCustomers} disabled={isExporting === 'customers'}>
                  {isExporting === 'customers' ? (
                    <Loader2 size={16} className="animate-spin me-2" />
                  ) : (
                    <Download size={16} className="me-2" />
                  )}
                  {language === 'ar' ? 'تصدير العملاء' : 'Export Customers'}
                </Button>
                <Button variant="outline" disabled>
                  <Upload size={16} className="me-2" />
                  {language === 'ar' ? 'استيراد العملاء' : 'Import Customers'}
                  <Badge variant="secondary" className="ms-2 text-xs">
                    {language === 'ar' ? 'قريباً' : 'Soon'}
                  </Badge>
                </Button>
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
            <CardContent>
              <div className="flex gap-3">
                <Button onClick={exportSuppliers} disabled={isExporting === 'suppliers'}>
                  {isExporting === 'suppliers' ? (
                    <Loader2 size={16} className="animate-spin me-2" />
                  ) : (
                    <Download size={16} className="me-2" />
                  )}
                  {language === 'ar' ? 'تصدير الموردين' : 'Export Suppliers'}
                </Button>
                <Button variant="outline" disabled>
                  <Upload size={16} className="me-2" />
                  {language === 'ar' ? 'استيراد الموردين' : 'Import Suppliers'}
                  <Badge variant="secondary" className="ms-2 text-xs">
                    {language === 'ar' ? 'قريباً' : 'Soon'}
                  </Badge>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DataImportExport;
