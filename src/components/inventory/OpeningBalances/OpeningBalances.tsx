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
  
  const handleExport = () => {
    // Export logic...
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
              <Loader2 className="animate-spin" size={32} className="text-primary" />
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