// components/AddBalanceModal.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Building2, Package, Search, X, Save, Loader2, Barcode, Hash, Warehouse } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useSearchProducts } from '../hooks/useProducts';
import { SelectedProductsTable } from './SelectedProductsTable';
import { VariantSelectionModal } from './VariantSelectionModal';
import { Product, Branch, Warehouse as WarehouseType, SelectedProduct } from '../types';
import api from '@/lib/api';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';

interface AddBalanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedProducts: SelectedProduct[];
  onProductsChange: (products: SelectedProduct[]) => void;
  branches: Branch[];
  selectedBranch: string;
  selectedWarehouse: string;
  onSave: (products: SelectedProduct[]) => void;
  isSaving: boolean;
  onSuccess?: () => void;

  mode?: 'add' | 'edit';
  editingRecordId?: number | null;
  originalStock?: number | null;
  originalWarehouseId?: number | null;
  originalUnitId?: number | null;
  originalColorId?: number | null;
}

type SearchType = 'name' | 'sku' | 'barcode';

export const AddBalanceModal: React.FC<AddBalanceModalProps> = ({
  open,
  onOpenChange,
  selectedProducts,
  onProductsChange,
  branches = [],
  selectedBranch,
  selectedWarehouse,
  onSave,
  isSaving: externalIsSaving,
  onSuccess,
  mode = 'add',
  editingRecordId = null,
  originalStock = null,
  originalWarehouseId = null,
  originalUnitId = null,
  originalColorId = null,
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('name');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<Product | null>(null);
  const [localSelectedBranch, setLocalSelectedBranch] = useState<string>(String(selectedBranch || 'all'));
  const [localSelectedWarehouse, setLocalSelectedWarehouse] = useState<string>(String(selectedWarehouse || 'all'));
  const [isInternalSaving, setIsInternalSaving] = useState(false);

  const isSaving = externalIsSaving || isInternalSaving;
  const isEditMode = mode === 'edit';

  // ✅ مزامنة القيم مع الـ props عند الفتح
  useEffect(() => {
    if (open) {
      setLocalSelectedBranch(String(selectedBranch || 'all'));
      setLocalSelectedWarehouse(String(selectedWarehouse || 'all'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  // ✅ جلب المخازن
  // ✅ جلب المخازن — في وضع التعديل نستخدم /products/warehouses
  const { data: warehouses = [], isLoading: isLoadingWarehouses } = useQuery({
    queryKey: [
      'modal-warehouses',
      localSelectedBranch,
      isEditMode,
      selectedProducts[0]?.product?.id ?? null,
    ],
    queryFn: async () => {
      try {
        if (isEditMode && selectedProducts[0]?.product?.id) {
          const response = await api.post('/products/warehouses', {
            product_id: selectedProducts[0].product.id,
          });

          console.log('📦 Product warehouses response:', response.data);

          if (response.data?.result === 'Success') {
            const data = response.data.data || [];
            console.log('📦 Warehouses count:', data.length);

            // ✅ فلتر بس لو الفرع محدد و branch_id مش null
            if (localSelectedBranch && localSelectedBranch !== 'all') {
              const filtered = data.filter(
                (w: any) =>
                  w.branch_id !== null &&
                  String(w.branch_id) === String(localSelectedBranch)
              );
              console.log('📦 Filtered by branch:', localSelectedBranch, filtered.length);
              return filtered;
            }

            return data;
          }
          return [];
        }

        // ✅ وضع الإضافة
        const filters: any = { active: true };
        if (localSelectedBranch && localSelectedBranch !== 'all') {
          filters.branch_id = parseInt(localSelectedBranch, 10);
        }

        const response = await api.post('/warehouse/index', {
          filters,
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false,
        });

        if (response.data?.result === 'Success') return response.data.data || [];
        return [];
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        return [];
      }
    },
    enabled: open,
  });
  // ✅ البحث
  const { data: searchResults = [], isLoading: isSearching } = useSearchProducts({
    searchQuery,
    selectedBranch: localSelectedBranch,
    selectedWarehouse: localSelectedWarehouse,
    searchType,
    enabled: open && !isEditMode,
  });

  const filteredProducts = searchResults.slice(0, 10);

  // ✅ في وضع الإضافة فقط: اختيار أول مخزن تلقائياً
  // ✅ في وضع الإضافة فقط: اختيار أول مخزن
  useEffect(() => {
    if (isEditMode) return;
    if (!open) return;
    if (warehouses.length === 0) return;

    if (localSelectedWarehouse === 'all') {
      setLocalSelectedWarehouse(String(warehouses[0].id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouses, isEditMode, open]);
  const handleAddProduct = (product: Product) => {
    if (product.units && product.units.length > 0) {
      setSelectedProductForVariant(product);
    } else {
      const warehouseId = localSelectedWarehouse !== 'all' ? parseInt(localSelectedWarehouse) : null;
      const newProduct: SelectedProduct = {
        product,
        quantity: 1,
        cost: product.cost,
        price: product.price || (product.cost || 0) * 1.3,
        unit_id: product.unit_id || null,
        warehouse_id: warehouseId || undefined,
        branch_id: localSelectedBranch !== 'all' ? parseInt(localSelectedBranch) : undefined,
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

  // ✅ تجهيز البيانات
  const prepareItemsForSave = () => {
    const warehouseId = localSelectedWarehouse !== 'all' ? parseInt(localSelectedWarehouse) : null;
    const branchId = localSelectedBranch !== 'all' ? parseInt(localSelectedBranch) : null;

    return selectedProducts
      .map(item => {
        if (!item.product?.id) return null;

        const finalWarehouseId = item.warehouse_id || warehouseId;

        const base: any = {
          product_id: item.product.id,
          warehouse_id: finalWarehouseId,
          branch_id: item.branch_id || branchId,
          unit_id: item.unitId || item.unit_id || null,
          color_id: item.colorId || null,
          stock: item.quantity,
          cost: item.cost,
        };

        if (isEditMode) {
          base.old_stock = originalStock ?? 0;
          base.old_warehouse_id = originalWarehouseId ?? finalWarehouseId;
          base.old_unit_id = originalUnitId ?? base.unit_id;
          base.old_color_id = originalColorId ?? base.color_id;
          base.record_id = editingRecordId;
        }

        return base;
      })
      .filter(item => item !== null);
  };

  // ✅ الحفظ
  const handleSave = async () => {
    const items = prepareItemsForSave();

    if (items.length === 0) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'لا توجد منتجات صالحة للحفظ' : 'No valid products to save',
        variant: 'destructive',
      });
      return;
    }

    const missingWarehouse = items.some(item => !item.warehouse_id);
    if (missingWarehouse) {
      toast({
        title: language === 'ar' ? 'المخزن مطلوب' : 'Warehouse Required',
        description:
          language === 'ar'
            ? 'من فضلك اختر المخزن قبل الحفظ'
            : 'Please select a warehouse before saving',
        variant: 'destructive',
      });
      return;
    }

    setIsInternalSaving(true);

    try {
      const endpoint = isEditMode ? '/products/update-stock' : '/products/add-stock';
      const payload = isEditMode ? items[0] : { items };

      console.log(`📦 Sending to ${endpoint}:`, payload);

      const response = await api.post(endpoint, payload);

      if (
        response.data?.status === 200 ||
        response.data?.success ||
        response.data?.result === 'Success' ||
        (response.status >= 200 && response.status < 300)
      ) {
        toast({
          title: language === 'ar' ? 'تم بنجاح' : 'Success',
          description:
            response.data?.message ||
            (isEditMode
              ? language === 'ar'
                ? 'تم تحديث الرصيد بنجاح'
                : 'Stock updated successfully'
              : language === 'ar'
                ? 'تم إضافة الرصيد بنجاح'
                : 'Stock added successfully'),
          variant: 'default',
        });

        await queryClient.invalidateQueries({ queryKey: ['products-with-balance'] });
        await queryClient.invalidateQueries({ queryKey: ['products'] });
        await queryClient.invalidateQueries({ queryKey: ['product-list-warehouses'] });
        await queryClient.invalidateQueries({ queryKey: ['modal-warehouses'] });

        onSave(selectedProducts);
        if (onSuccess) onSuccess();

        onProductsChange([]);
        onOpenChange(false);
      } else {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description:
            response.data?.message ||
            response.data?.error ||
            (language === 'ar' ? 'حدث خطأ أثناء الحفظ' : 'An error occurred while saving'),
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('API Error:', error);
      toast({
        title: language === 'ar' ? 'خطأ في الاتصال' : 'Connection Error',
        description:
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          (language === 'ar' ? 'حدث خطأ في الاتصال بالسيرفر' : 'Connection error occurred'),
        variant: 'destructive',
      });
    } finally {
      setIsInternalSaving(false);
    }
  };

  const totalQuantity = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
  const totalValue = selectedProducts.reduce((sum, p) => sum + p.quantity * (p.cost || 0), 0);

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    setSearchQuery('');
  };

  const t = {
    addBalance: language === 'ar' ? 'إضافة رصيد أول المدة' : 'Add Opening Balance',
    editBalance: language === 'ar' ? 'تعديل الرصيد' : 'Edit Stock',
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
    update: language === 'ar' ? 'تحديث' : 'Update',
    allBranches: language === 'ar' ? 'جميع الفروع' : 'All Branches',
    allWarehouses: language === 'ar' ? 'جميع المستودعات' : 'All Warehouses',
    selectBranch: language === 'ar' ? 'اختر الفرع' : 'Select branch',
    selectWarehouse: language === 'ar' ? 'اختر المستودع' : 'Select warehouse',
    currentBranch: language === 'ar' ? 'الفرع الحالي' : 'Current Branch',
    currentWarehouse: language === 'ar' ? 'المخزن الحالي' : 'Current Warehouse',
    sku: language === 'ar' ? 'الرقم التسلسلي' : 'SKU',
    barcode: language === 'ar' ? 'الباركود' : 'Barcode',
    stock: language === 'ar' ? 'المخزون' : 'Stock',
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
              <div
                className={`p-2 rounded-xl ${isEditMode
                  ? 'bg-amber-100 dark:bg-amber-900/30'
                  : 'bg-emerald-100 dark:bg-emerald-900/30'
                  }`}
              >
                <Package
                  className={
                    isEditMode
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }
                  size={20}
                />
              </div>
              {isEditMode ? t.editBalance : t.addBalance}
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
                  disabled={isSaving}
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <Building2 size={14} className="text-muted-foreground" />
                  {t.branch}
                </Label>
                <Select
                  value={localSelectedBranch}
                  onValueChange={(value) => {
                    setLocalSelectedBranch(String(value));
                    setLocalSelectedWarehouse('all');
                  }}
                  disabled={isSaving || isEditMode}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t.selectBranch} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allBranches}</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="flex items-center gap-2 text-sm font-medium mb-1.5">
                  <Warehouse size={14} className="text-muted-foreground" />
                  {t.warehouse}
                </Label>
                <Select
                  value={localSelectedWarehouse}
                  onValueChange={(v) => setLocalSelectedWarehouse(String(v))}
                  disabled={isSaving || isLoadingWarehouses}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue
                      placeholder={
                        isLoadingWarehouses
                          ? language === 'ar'
                            ? 'جاري التحميل...'
                            : 'Loading...'
                          : t.selectWarehouse
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allWarehouses}</SelectItem>

                    {warehouses.map((warehouse: any) => {
                      const wid = String(warehouse.warehouse_id ?? warehouse.id);
                      const wname = language === 'ar'
                        ? (warehouse.warehouse_name_ar || warehouse.warehouse_name || warehouse.name_ar || warehouse.name)
                        : (warehouse.warehouse_name || warehouse.name);

                      const bname = language === 'ar'
                        ? (warehouse.branch_name_ar || warehouse.branch_name)
                        : warehouse.branch_name;

                      return (
                        <SelectItem key={wid} value={wid}>
                          {wname}
                          {bname ? ` - ${bname}` : ''}
                          {warehouse.stock !== undefined && ` (${warehouse.stock})`}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>

                {localSelectedBranch !== 'all' &&
                  warehouses.length === 0 &&
                  !isLoadingWarehouses && (
                    <p className="text-xs text-amber-600 mt-1">
                      {language === 'ar'
                        ? 'لا توجد مخازن لهذا الفرع'
                        : 'No warehouses found for this branch'}
                    </p>
                  )}
              </div>
            </div>

            {/* Product Search */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Package size={14} />
                  {t.products}
                </h3>

                {!isEditMode && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={searchType === 'name' ? 'default' : 'outline'}
                      onClick={() => handleSearchTypeChange('name')}
                      className="h-8 px-3"
                      disabled={isSaving}
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
                      disabled={isSaving}
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
                      disabled={isSaving}
                    >
                      <Barcode size={12} className="me-1" />
                      {language === 'ar' ? 'باركود' : 'Barcode'}
                    </Button>
                  </div>
                )}
              </div>

              {!isEditMode && (
                <>
                  <div className="relative mb-3">
                    <Search
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      size={16}
                    />
                    <Input
                      placeholder={getPlaceholder()}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 bg-background"
                      disabled={isSaving}
                      autoFocus
                    />
                  </div>

                  {isSearching && (
                    <div className="text-center py-4">
                      <Loader2 className="animate-spin mx-auto text-primary" size={24} />
                    </div>
                  )}

                  {searchQuery && !isSearching && filteredProducts.length > 0 && (
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
                                ? product.name_ar || product.name || 'غير معروف'
                                : product.name || 'Unknown'}
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
                            <p className="text-sm font-mono font-semibold">
                              {formatCurrency(product.cost || 0)}
                            </p>
                            {product.stock && product.stock > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {t.stock}: {product.stock}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {searchQuery && !isSearching && filteredProducts.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground border rounded-lg">
                      {language === 'ar' ? 'لا توجد منتجات مطابقة' : 'No matching products found'}
                    </div>
                  )}
                </>
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
                {t.totalQuantity}:{' '}
                <span className="font-bold text-emerald-600">{totalQuantity}</span>
              </span>
              <span className="text-sm font-medium">
                {t.totalValue}:{' '}
                <span className="font-bold text-primary">{formatCurrency(totalValue)}</span>
              </span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                size="sm"
                disabled={isSaving}
              >
                <X size={14} className="me-1.5" />
                {t.cancel}
              </Button>

              <Button
                onClick={handleSave}
                disabled={selectedProducts.length === 0 || isSaving}
                className={`gap-2 ${isEditMode
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                size="sm"
              >
                {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                {isEditMode ? t.update : t.save}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!isEditMode && (
        <VariantSelectionModal
          product={selectedProductForVariant}
          onClose={() => setSelectedProductForVariant(null)}
          onAdd={(product, unit, color, quantity) => {
            const warehouseId =
              localSelectedWarehouse !== 'all' ? parseInt(localSelectedWarehouse) : undefined;
            const branchId =
              localSelectedBranch !== 'all' ? parseInt(localSelectedBranch) : undefined;

            const newProduct: SelectedProduct = {
              product,
              unitId: unit?.unit_id,
              unitName: unit?.unit_name,
              colorId: color?.color_id,
              colorName: color?.color,
              quantity,
              cost: unit ? parseFloat(unit.cost_price) : product.cost || 0,
              price: unit
                ? parseFloat(unit.sell_price)
                : product.price || (product.cost || 0) * 1.3,
              warehouse_id: warehouseId,
              branch_id: branchId,
            };

            const existingIndex = selectedProducts.findIndex(
              p =>
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
      )}
    </>
  );
};