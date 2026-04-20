/* eslint-disable @typescript-eslint/no-explicit-any */
// OpeningBalances.tsx - المكون الرئيسي المعدل
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Plus, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useProducts, useBranches, useWarehouses } from './hooks/useProducts';
import { useSaveOpeningBalances, useDeleteOpeningBalance } from './hooks/useOpeningBalances';
import { ProductFilters } from './components/ProductFilters';
import { ProductList } from './components/ProductList';
import { ProductGrid } from './components/ProductGrid';
import { AddBalanceModal } from './components/AddBalanceModal';
import { ImportDialog } from './components/ImportDialog';
import { SelectedProduct } from './types';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const OpeningBalances: React.FC = () => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  
  // UI State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [activeView, setActiveView] = useState<'list' | 'grid'>('list');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  
  // Data fetching
  const { data: products = [], isLoading, refetch } = useProducts({
    searchQuery,
    selectedBranch,
    selectedWarehouse
  });
  const { data: branches = [] } = useBranches();
  const { data: warehouses = [] } = useWarehouses(selectedBranch);
  
  // Mutations
  const saveBalances = useSaveOpeningBalances();
  const deleteBalance = useDeleteOpeningBalance();
  
 // أضف هذه الدالة في ملف OpeningBalances.tsx
const handleExport = () => {
  if (products.length === 0) {
    toast({
      title: language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export',
      variant: 'destructive'
    });
    return;
  }

  // تحويل البيانات إلى الصيغة المطلوبة للـ Excel
  const exportData = products.map((product, index) => ({
    '#': index + 1,
    [language === 'ar' ? 'اسم المنتج' : 'Product Name']: language === 'ar' 
      ? (product.name_ar || product.name || 'N/A')
      : (product.name || 'N/A'),
    'SKU': product.sku || 'N/A',
    [language === 'ar' ? 'الباركود' : 'Barcode']: product.barcode || 'N/A',
    [language === 'ar' ? 'التصنيف' : 'Category']: getCategoryName(product.category),
    [language === 'ar' ? 'الرصيد الافتتاحي' : 'Opening Balance']: product.beginning_balance || 0,
    [language === 'ar' ? 'المخزون الحالي' : 'Current Stock']: product.stock || 0,
    [language === 'ar' ? 'سعر التكلفة' : 'Cost Price']: product.cost || 0,
    [language === 'ar' ? 'سعر البيع' : 'Selling Price']: product.price || 0,
    [language === 'ar' ? 'الحد الأدنى' : 'Min Stock']: product.reorder_level || 0,
    [language === 'ar' ? 'الحالة' : 'Status']: product.active 
      ? (language === 'ar' ? 'نشط' : 'Active')
      : (language === 'ar' ? 'غير نشط' : 'Inactive'),
  }));

  // إنشاء ورقة العمل
  const ws = XLSX.utils.json_to_sheet(exportData);
  
  // ضبط عرض الأعمدة (اختياري)
  const colWidths = [
    { wch: 5 },   // #
    { wch: 30 },  // اسم المنتج
    { wch: 15 },  // SKU
    { wch: 15 },  // الباركود
    { wch: 20 },  // التصنيف
    { wch: 15 },  // الرصيد الافتتاحي
    { wch: 15 },  // المخزون الحالي
    { wch: 15 },  // سعر التكلفة
    { wch: 15 },  // سعر البيع
    { wch: 12 },  // الحد الأدنى
    { wch: 10 },  // الحالة
  ];
  ws['!cols'] = colWidths;

  // إنشاء المصنف
  const wb = XLSX.utils.book_new();
  const sheetName = language === 'ar' ? 'بضاعة أول المدة' : 'Opening Balances';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // تحميل الملف
  const fileName = `opening_balances_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
  
  // إشعار نجاح
  toast({
    title: language === 'ar' ? 'تم التصدير بنجاح' : 'Export successful',
    description: language === 'ar' 
      ? `تم تصدير ${products.length} منتج`
      : `Exported ${products.length} products`,
  });
};

// دالة مساعدة لجلب اسم التصنيف (لأن الـ category يمكن أن يكون object)
const getCategoryName = (category: any): string => {
  if (!category) return 'N/A';
  if (typeof category === 'string') return category;
  if (category.name) return category.name;
  if (category.name_ar) return category.name_ar;
  return 'N/A';
};
  
  const t = {
    title: language === 'ar' ? 'بضاعة أول المدة' : 'Opening Balances',
    description: language === 'ar' ? 'إدارة أرصدة أول المدة للمنتجات' : 'Manage opening balances for products',
    add: language === 'ar' ? 'إضافة رصيد' : 'Add Balance',
    import: language === 'ar' ? 'استيراد' : 'Import',
    export: language === 'ar' ? 'تصدير' : 'Export',
  };
  
  return (
    <>
      <Card className="shadow-sm border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                  <Package className="text-emerald-600 dark:text-emerald-400" size={20} />
                </div>
                {t.title}
              </CardTitle>
              <CardDescription className="mt-1.5">{t.description}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleExport} 
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={products.length === 0}
              >
                <FileSpreadsheet size={16} />
                {t.export}
              </Button>
              <Button 
                onClick={() => setShowImportDialog(true)} 
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Upload size={16} />
                {t.import}
              </Button>
              <Button onClick={() => setShowAddModal(true)} size="sm" className="gap-2">
                <Plus size={16} />
                {t.add}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <ProductFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            selectedWarehouse={selectedWarehouse}
            onWarehouseChange={setSelectedWarehouse}
            activeView={activeView}
            onViewChange={setActiveView}
            branches={branches}
            warehouses={warehouses}
          />
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-primary" size={32} />
            </div>
          ) : activeView === 'list' ? (
            <ProductList products={products} onDelete={deleteBalance.mutate} />
          ) : (
            <ProductGrid products={products} onDelete={deleteBalance.mutate} />
          )}
        </CardContent>
      </Card>
      
      <AddBalanceModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        selectedProducts={selectedProducts}
        onProductsChange={setSelectedProducts}
        branches={branches}
        warehouses={warehouses}
        selectedBranch={selectedBranch}
        selectedWarehouse={selectedWarehouse}
        onSave={saveBalances.mutate}
        isSaving={saveBalances.isPending}
      />
      
      <ImportDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportSuccess={refetch}
      />
    </>
  );
};

export default OpeningBalances;