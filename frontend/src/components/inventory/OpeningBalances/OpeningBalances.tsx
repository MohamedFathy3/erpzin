/* eslint-disable @typescript-eslint/no-explicit-any */
// OpeningBalances.tsx - المكون الرئيسي الكامل
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Package, Plus, Upload, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useApp } from '@/contexts/AppContext';
import { useProductsWithBalance } from './hooks/useProducts';  // ✅ تغيير الاستيراد
import { useSaveOpeningBalances, useDeleteOpeningBalance } from './hooks/useOpeningBalances';
import { ProductFilters } from './components/ProductFilters';
import { ProductList } from './components/ProductList';
import { ProductGrid } from './components/ProductGrid';
import { AddBalanceModal } from './components/AddBalanceModal';
import { ImportDialog } from './components/ImportDialog';
import { SelectedProduct } from './types';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

const OpeningBalances: React.FC = () => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const { currentBranch } = useApp();
  
  // UI State
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>(
    currentBranch?.id ? String(currentBranch.id) : 'all'
  );
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [activeView, setActiveView] = useState<'list' | 'grid'>('list');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(16);
  



  const handleBalanceSaved = () => {
  // تحديث البيانات في الجدول
  refetch();
  // لو عاوز ترجع للصفحة الأولى
  setCurrentPage(1);
};


  // ✅ جلب الفروع من الـ API
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-opening'],
    queryFn: async () => {
      try {
        const response = await api.post('/branch/index', {
          filters: { active: true },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching branches:', error);
        return [];
      }
    },
  });
  
  // ✅ جلب المخازن بناءً على الفرع المحدد
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-opening', selectedBranch],
    queryFn: async () => {
      if (!selectedBranch || selectedBranch === 'all') {
        return [];
      }
      
      try {
        const response = await api.post('/warehouse/index', {
          filters: { 
            active: true,
            branch_id: parseInt(selectedBranch, 10)
          },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false
        });
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        return [];
      }
    },
    enabled: !!selectedBranch && selectedBranch !== 'all',
  });
  
  // ✅ Data fetching with pagination - استخدم الهوك الجديد
  const { 
    data: productsResponse, 
    isLoading, 
    refetch 
  } = useProductsWithBalance({  // ✅ تغيير اسم الهوك
    searchQuery,
    selectedBranch,
    selectedWarehouse,
    page: currentPage,
    perPage: perPage
  });
  
  const products = productsResponse?.data || [];
  const paginationMeta = productsResponse?.meta;
  
  // Mutations
  const saveBalances = useSaveOpeningBalances();
  const deleteBalance = useDeleteOpeningBalance();
  
  // تحديث الفرع لما يتغير من الـ Header
  useEffect(() => {
    if (currentBranch?.id) {
      setSelectedBranch(String(currentBranch.id));
      setCurrentPage(1);
    }
  }, [currentBranch?.id]);
  
  // Reset to page 1 when search/filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedBranch, selectedWarehouse]);
  
  // دالة التصدير
  const handleExport = () => {
    if (products.length === 0) {
      toast({
        title: language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export',
        variant: 'destructive'
      });
      return;
    }

    const exportData = products.map((product: any, index: number) => ({
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

    const ws = XLSX.utils.json_to_sheet(exportData);
    
    const colWidths = [
      { wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    const sheetName = language === 'ar' ? 'بضاعة أول المدة' : 'Opening Balances';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    const fileName = `opening_balances_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    toast({
      title: language === 'ar' ? 'تم التصدير بنجاح' : 'Export successful',
      description: language === 'ar' 
        ? `تم تصدير ${products.length} منتج`
        : `Exported ${products.length} products`,
    });
  };

  // دالة مساعدة لجلب اسم التصنيف
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
            <ProductList 
              products={products} 
              onDelete={deleteBalance.mutate}
              isDeleting={deleteBalance.isPending}
              deletingId={deleteBalance.variables as number | null}
            />
          ) : (
            <ProductGrid 
              products={products} 
              onDelete={deleteBalance.mutate}
              isDeleting={deleteBalance.isPending}
              deletingId={deleteBalance.variables as number | null}
            />
          )}
          
          {/* Pagination */}
          {paginationMeta && paginationMeta.last_page > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t flex-wrap gap-3">
              <div className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? `عرض ${paginationMeta.from || 1} إلى ${paginationMeta.to || paginationMeta.total} من ${paginationMeta.total} منتج`
                  : `Showing ${paginationMeta.from || 1} to ${paginationMeta.to || paginationMeta.total} of ${paginationMeta.total} products`
                }
              </div>
              
              <div className="flex items-center gap-3">
                {/* Select عدد العناصر */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'عرض' : 'Show'}:
                  </span>
                  <select
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(parseInt(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 px-2 text-sm border rounded-md bg-background"
                  >
                    <option value={16}>16</option>
                    <option value={32}>32</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                
                {/* أزرار التنقل */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 px-3"
                  >
                    {language === 'ar' ? 'السابق' : 'Previous'}
                  </Button>
                  
                  <div className="flex items-center gap-1 px-3">
                    <span className="text-sm font-medium">
                      {currentPage} / {paginationMeta.last_page}
                    </span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(paginationMeta.last_page, p + 1))}
                    disabled={currentPage === paginationMeta.last_page}
                    className="h-8 px-3"
                  >
                    {language === 'ar' ? 'التالي' : 'Next'}
                  </Button>
                </div>
              </div>
            </div>
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
        onSuccess={handleBalanceSaved}
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