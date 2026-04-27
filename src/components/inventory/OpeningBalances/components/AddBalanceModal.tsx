import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Building2, Package, Search, X, Save, Loader2, Barcode, Hash } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useProducts, useSearchProductsByName, useSearchProductsBySku, useSearchProductsByBarcode } from '../hooks/useProducts';
import { SelectedProductsTable } from './SelectedProductsTable';
import { VariantSelectionModal } from './VariantSelectionModal';
import { Product, Branch, Warehouse, SelectedProduct } from '../types';

interface AddBalanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: SelectedProduct[];
  onProductsChange: (products: SelectedProduct[]) => void;
  branches: Branch[];
  warehouses: Warehouse[];
  selectedBranch: string;
  selectedWarehouse: string;
  onSave: (products: SelectedProduct[]) => void;
  isSaving: boolean;
}

type SearchType = 'name' | 'sku' | 'barcode';

export const AddBalanceModal: React.FC<AddBalanceModalProps> = ({
  open,
  onOpenChange,
  selectedProducts,
  onProductsChange,
  selectedBranch,
  branches = [], 
  warehouses = [], 
  selectedWarehouse,
  onSave,
  isSaving
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('name');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  
  // ✅ هوك البحث العام (لما ميكونش في بحث محدد)
  const { data: generalProducts = [] } = useProducts({
    searchQuery: searchQuery || '___empty___',
    selectedBranch,
    selectedWarehouse
  });

  // ✅ هوكات البحث المنفصلة
  const { data: nameResults = [], isLoading: nameLoading } = useSearchProductsByName(
    searchType === 'name' ? searchQuery : '',
    searchType === 'name' && searchQuery.length > 0
  );

  const { data: skuResults = [], isLoading: skuLoading } = useSearchProductsBySku(
    searchType === 'sku' ? searchQuery : '',
    searchType === 'sku' && searchQuery.length > 0
  );

  const { data: barcodeResults = [], isLoading: barcodeLoading } = useSearchProductsByBarcode(
    searchType === 'barcode' ? searchQuery : '',
    searchType === 'barcode' && searchQuery.length > 0
  );

  // ✅ اختيار النتائج حسب نوع البحث
  const getFilteredProducts = (): Product[] => {
    if (!searchQuery) return [];
    
    switch (searchType) {
      case 'name':
        return nameResults;
      case 'sku':
        return skuResults;
      case 'barcode':
        return barcodeResults;
      default:
        return generalProducts.filter(p => {
          const searchLower = searchQuery.toLowerCase();
          return (
            (p.name && p.name.toLowerCase().includes(searchLower)) ||
            (p.name_ar && p.name_ar.toLowerCase().includes(searchLower)) ||
            (p.sku && p.sku.toLowerCase().includes(searchLower)) ||
            (p.barcode && p.barcode.toLowerCase().includes(searchLower))
          );
        });
    }
  };

  const isLoading = () => {
    if (!searchQuery) return false;
    switch (searchType) {
      case 'name': return nameLoading;
      case 'sku': return skuLoading;
      case 'barcode': return barcodeLoading;
      default: return false;
    }
  };

  const filteredProducts = getFilteredProducts().slice(0, 10);

  const handleAddProduct = (product: Product) => {
    if (product.units && product.units.length > 0) {
      setSelectedProductForVariant(product);
    } else {
      const newProduct: SelectedProduct = {
        product,
        quantity: 1,
        cost: product.cost,
        price: product.price || (product.cost || 0) * 1.3
      };
      onProductsChange([...selectedProducts, newProduct]);
    }
    setSearchQuery('');
  };

  const handleRemoveProduct = (index: number) => {
    onProductsChange(selectedProducts.filter((_, i) => i !== index));
  };

  const handleUpdateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveProduct(index);
      return;
    }
    const updated = [...selectedProducts];
    updated[index].quantity = quantity;
    onProductsChange(updated);
  };

  const handleUpdateCost = (index: number, cost: number) => {
    const updated = [...selectedProducts];
    updated[index].cost = cost;
    onProductsChange(updated);
  };

  const totalQuantity = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
  const totalValue = selectedProducts.reduce((sum, p) => sum + (p.quantity * (p.cost || 0)), 0);

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    setSearchQuery('');
  };

  const t = {
    addBalance: language === 'ar' ? 'إضافة رصيد أول المدة' : 'Add Opening Balance',
    date: language === 'ar' ? 'التاريخ' : 'Date',
    branch: language === 'ar' ? 'الفرع' : 'Branch',
    warehouse: language === 'ar' ? 'المستودع' : 'Warehouse',
    products: language === 'ar' ? 'المنتجات' : 'Products',
    searchByName: language === 'ar' ? 'ابحث باسم المنتج...' : 'Search by product name...',
    searchBySku: language === 'ar' ? 'ابحث بالرقم التسلسلي (SKU)...' : 'Search by SKU...',
    searchByBarcode: language === 'ar' ? 'ابحث بالباركود...' : 'Search by barcode...',
    totalQuantity: language === 'ar' ? 'إجمالي الكمية' : 'Total Quantity',
    totalValue: language === 'ar' ? 'القيمة الإجمالية' : 'Total Value',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    save: language === 'ar' ? 'حفظ' : 'Save',
    allBranches: language === 'ar' ? 'جميع الفروع' : 'All Branches',
    allWarehouses: language === 'ar' ? 'جميع المستودعات' : 'All Warehouses',
    selectBranch: language === 'ar' ? 'اختر الفرع' : 'Select branch',
    selectWarehouse: language === 'ar' ? 'اختر المستودع' : 'Select warehouse',
    sku: language === 'ar' ? 'الرقم التسلسلي' : 'SKU',
    barcode: language === 'ar' ? 'الباركود' : 'Barcode',
    stock: language === 'ar' ? 'المخزون' : 'Stock',
    searchBy: language === 'ar' ? 'نوع البحث' : 'Search Type',
    name: language === 'ar' ? 'الاسم' : 'Name',
  };

  const getPlaceholder = () => {
    switch (searchType) {
      case 'name': return t.searchByName;
      case 'sku': return t.searchBySku;
      case 'barcode': return t.searchByBarcode;
      default: return t.searchByName;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Package className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              {t.addBalance}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-xl">
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <Calendar size={14} className="text-muted-foreground" />
                  {t.date}
                </Label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-background"
                />
              </div>
              
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <Building2 size={14} className="text-muted-foreground" />
                  {t.branch}
                </Label>
                <Select value={selectedBranch} onValueChange={() => {}}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t.selectBranch} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allBranches}</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id.toString()}>
                        {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  {t.warehouse}
                </Label>
                <Select value={selectedWarehouse} onValueChange={() => {}}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t.selectWarehouse} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allWarehouses}</SelectItem>
                    {warehouses.map((warehouse) => (
                      <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                        {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Search Section */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Package size={14} />
                  {t.products}
                </h3>
                
                {/* ✅ أزرار تبديل نوع البحث */}
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={searchType === 'name' ? 'default' : 'outline'}
                    onClick={() => handleSearchTypeChange('name')}
                    className="h-8 px-3"
                  >
                    <Package size={12} className="me-1" />
                    {t.name}
                  </Button>
                  
                  <Button
                    type="button"
                    size="sm"
                    variant={searchType === 'sku' ? 'default' : 'outline'}
                    onClick={() => handleSearchTypeChange('sku')}
                    className="h-8 px-3"
                  >
                    <Hash size={12} className="me-1" />
                    SKU
                  </Button>
                  
                  <Button
                    type="button"
                    size="sm"
                    variant={searchType === 'barcode' ? 'default' : 'outline'}
                    onClick={() => handleSearchTypeChange('barcode')}
                    className="h-8 px-3"
                  >
                    <Barcode size={12} className="me-1" />
                    {language === 'ar' ? 'باركود' : 'Barcode'}
                  </Button>
                </div>
              </div>
              
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <Input
                  placeholder={getPlaceholder()}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-background"
                  autoFocus
                />
              </div>

              {isLoading() && (
                <div className="text-center py-4">
                  <Loader2 className="animate-spin mx-auto text-primary" size={24} />
                </div>
              )}

              {searchQuery && !isLoading() && filteredProducts.length > 0 && (
                <div className="border rounded-lg overflow-hidden max-h-[250px] overflow-y-auto mb-4">
                  {filteredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 flex items-center justify-between transition-colors"
                      onClick={() => handleAddProduct(product)}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {language === 'ar' 
                            ? (product.name_ar || product.name || 'غير معروف') 
                            : (product.name || 'Unknown')}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                          {product.sku && (
                            <span className="font-mono flex items-center gap-1">
                              <span className="font-medium">{t.sku}:</span> {product.sku}
                            </span>
                          )}
                          {product.barcode && (
                            <span className="font-mono flex items-center gap-1">
                              <Barcode size={10} />
                              <span className="font-medium">{t.barcode}:</span> {product.barcode}
                            </span>
                          )}
                          {product.units && product.units.length > 0 && (
                            <span className="text-emerald-600">
                              {product.units.length} {language === 'ar' ? 'مقاس' : 'units'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-mono font-semibold">{formatCurrency(product.cost || 0)}</p>
                        {product.stock && product.stock > 0 && (
                          <p className="text-xs text-muted-foreground">{t.stock}: {product.stock}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && !isLoading() && filteredProducts.length === 0 && (
                <div className="text-center py-4 text-muted-foreground border rounded-lg">
                  {language === 'ar' ? 'لا توجد منتجات مطابقة' : 'No matching products found'}
                </div>
              )}

              <SelectedProductsTable
                products={selectedProducts}
                onUpdateQuantity={handleUpdateQuantity}
                onUpdateCost={handleUpdateCost}
                onRemove={handleRemoveProduct}
              />
            </div>
          </div>

          <DialogFooter className="p-4 pt-3 border-t bg-muted/30 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {t.totalQuantity}: <span className="font-bold text-emerald-600">{totalQuantity}</span>
              </span>
              <span className="text-sm font-medium">
                {t.totalValue}: <span className="font-bold text-primary">{formatCurrency(totalValue)}</span>
              </span>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} size="sm">
                <X size={14} className="me-1.5" />
                {t.cancel}
              </Button>
              
              <Button 
                onClick={() => onSave(selectedProducts)}
                disabled={selectedProducts.length === 0 || isSaving}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                size="sm"
              >
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                {t.save}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VariantSelectionModal
        product={selectedProductForVariant}
        onClose={() => setSelectedProductForVariant(null)}
        onAdd={(product, unit, color, quantity) => {
          const newProduct: SelectedProduct = {
            product,
            unitId: unit?.unit_id,
            unitName: unit?.unit_name,
            colorId: color?.color_id,
            colorName: color?.color,
            quantity,
            cost: unit ? parseFloat(unit.cost_price) : (product.cost || 0),
            price: unit ? parseFloat(unit.sell_price) : (product.price || (product.cost || 0) * 1.3)
          };
          
          const existingIndex = selectedProducts.findIndex(p => 
            p.product.id === product.id && 
            p.unitId === unit?.unit_id && 
            p.colorId === color?.color_id
          );
          
          if (existingIndex >= 0) {
            const updated = [...selectedProducts];
            updated[existingIndex].quantity += quantity;
            onProductsChange(updated);
          } else {
            onProductsChange([...selectedProducts, newProduct]);
          }
          
          setSelectedProductForVariant(null);
        }}
      />
    </>
  );
};