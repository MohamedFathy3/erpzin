// components/inventory/AddProductWithBalance.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, Building2, Plus, Trash2, AlertCircle, Search } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { debounce } from 'lodash';

interface Warehouse {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  cost: number;
  units?: Array<{
    id: number;
    unit_id: number;
    unit_name: string;
    colors?: Array<{
      id: number;
      color_id: number;
      color: string;
      hex_code: string;
    }>;
  }>;
}

interface StockItem {
  id: string;
  product_id: string;
  product_name?: string;
  warehouse_id: string;
  unit_id: string;
  color_id: string;
  stock: number;
  cost: number;
}

interface AddProductWithBalanceProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddProductWithBalance: React.FC<AddProductWithBalanceProps> = ({ isOpen, onClose, onSuccess }) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  
  const [items, setItems] = useState<StockItem[]>([
    { id: Date.now().toString(), product_id: '', warehouse_id: '', unit_id: '', color_id: '', stock: 1, cost: 0 }
  ]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // جلب المنتجات مع البحث
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ['products-for-opening-balance', debouncedSearchTerm],
    queryFn: async () => {
      const response = await api.post('/product/index', {
        filters: { 
          name: debouncedSearchTerm || undefined
        },
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 100,
        paginate: false,
        delete: false
      });
      return response.data?.data || [];
    },
    enabled: isOpen
  });

  // جلب المستودعات
  const { data: warehouses = [], isLoading: warehousesLoading } = useQuery<Warehouse[]>({
    queryKey: ['warehouses-for-product'],
    queryFn: async () => {
      const response = await api.post('/warehouse/index', {
        "orderBy": "id",
        "orderByDirection": "asc",
        "perPage": 1000,
        "paginate": true,
        "delete": false
      });
      return response.data?.data || [];
    },
    enabled: isOpen
  });

  // الحصول على المنتجات المتاحة (المستخدمة وغير المستخدمة)
  const getAvailableProducts = (currentItemId: string) => {
    // المنتجات المختارة في الصفوف الأخرى
    const selectedProductIds = items
      .filter(item => item.id !== currentItemId && item.product_id)
      .map(item => parseInt(item.product_id));
    
    // فلترة المنتجات التي لم يتم اختيارها
    return products.filter(product => !selectedProductIds.includes(product.id));
  };

  // إضافة رصيد متعدد للمنتجات
  const addMultipleStockMutation = useMutation({
    mutationFn: async () => {
      const validItems = items.filter(item => item.product_id && item.warehouse_id && item.stock > 0);
      
      const payload = {
        items: validItems.map(item => ({
          product_id: parseInt(item.product_id),
          warehouse_id: parseInt(item.warehouse_id),
          unit_id: item.unit_id ? parseInt(item.unit_id) : undefined,
          color_id: item.color_id ? parseInt(item.color_id) : undefined,
          stock: item.stock,
          cost: item.cost
        }))
      };

      console.log('📤 Adding multiple stocks:', payload);
      
      const response = await api.post('/products/add-stock', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast({ 
        title: language === 'ar' ? 'تم إضافة الرصيد بنجاح' : 'Stock added successfully',
        description: language === 'ar' 
          ? `تم إضافة ${data.imported_count || items.filter(i => i.product_id).length} منتج`
          : `Added ${data.imported_count || items.filter(i => i.product_id).length} products`
      });
      
      queryClient.invalidateQueries({ queryKey: ['products-with-balance'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-balance'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-opening'] });
      
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      console.error('Error adding stocks:', error);
      toast({ 
        title: language === 'ar' ? 'حدث خطأ' : 'Error', 
        description: error.response?.data?.message || error.message, 
        variant: 'destructive' 
      });
    }
  });

  useEffect(() => {
    if (isOpen) {
      setItems([{ id: Date.now().toString(), product_id: '', warehouse_id: '', unit_id: '', color_id: '', stock: 1, cost: 0 }]);
      setSearchTerm('');
      setDebouncedSearchTerm('');
    }
  }, [isOpen]);

  const addNewRow = () => {
    setItems([...items, { id: Date.now().toString(), product_id: '', warehouse_id: '', unit_id: '', color_id: '', stock: 1, cost: 0 }]);
  };

  const removeRow = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    } else {
      toast({
        title: language === 'ar' ? 'لا يمكن الحذف' : 'Cannot delete',
        description: language === 'ar' ? 'يجب أن يكون هناك منتج واحد على الأقل' : 'At least one product is required',
      });
    }
  };

  const updateItem = (id: string, field: keyof StockItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // إذا تم تغيير المنتج، جلب اسمه وسعره
        if (field === 'product_id' && value) {
          const product = products.find(p => p.id.toString() === value);
          if (product) {
            updated.product_name = language === 'ar' && product.name_ar ? product.name_ar : product.name;
            // تعيين سعر التكلفة الافتراضي من المنتج
            if (product.cost && updated.cost === 0) {
              updated.cost = product.cost;
            }
          }
        }
        
        return updated;
      }
      return item;
    }));
  };

  const getAvailableUnits = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    return product?.units || [];
  };

  const getAvailableColors = (productId: string, unitId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    const unit = product?.units?.find(u => u.unit_id.toString() === unitId);
    return unit?.colors || [];
  };

  const handleSubmit = () => {
    const validItems = items.filter(item => item.product_id && item.warehouse_id && item.stock > 0);
    
    if (validItems.length === 0) {
      toast({
        title: language === 'ar' ? 'لا توجد بيانات صالحة' : 'No valid data',
        description: language === 'ar' ? 'يرجى إدخال منتج واحد على الأقل' : 'Please enter at least one valid product',
        variant: 'destructive'
      });
      return;
    }
    
    addMultipleStockMutation.mutate();
  };

  const t = {
    title: language === 'ar' ? 'إضافة رصيد أول المدة' : 'Add Opening Balances',
    description: language === 'ar' ? 'إضافة رصيد لمنتجات متعددة' : 'Add stock to multiple products',
    product: language === 'ar' ? 'المنتج' : 'Product',
    warehouse: language === 'ar' ? 'المستودع' : 'Warehouse',
    unit: language === 'ar' ? 'الوحدة' : 'Unit',
    color: language === 'ar' ? 'اللون' : 'Color',
    stock: language === 'ar' ? 'الكمية' : 'Stock',
    cost: language === 'ar' ? 'سعر التكلفة' : 'Cost',
    actions: language === 'ar' ? 'إجراءات' : 'Actions',
    addRow: language === 'ar' ? 'إضافة منتج آخر' : 'Add Another Product',
    add: language === 'ar' ? 'إضافة الكل' : 'Add All',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    selectProduct: language === 'ar' ? 'اختر المنتج' : 'Select product',
    selectWarehouse: language === 'ar' ? 'اختر المستودع' : 'Select warehouse',
    selectUnit: language === 'ar' ? 'اختر الوحدة' : 'Select unit',
    selectColor: language === 'ar' ? 'اختر اللون' : 'Select color',
    searchProduct: language === 'ar' ? 'بحث عن منتج...' : 'Search product...',
    noUnit: language === 'ar' ? 'لا توجد وحدات' : 'No units',
    noColor: language === 'ar' ? 'لا توجد ألوان' : 'No colors',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={18} className="text-emerald-500" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {language === 'ar' 
                ? 'يمكنك إضافة عدة منتجات دفعة واحدة. اضغط على "إضافة منتج آخر" لإضافة صف جديد.'
                : 'You can add multiple products at once. Click "Add Another Product" to add a new row.'}
            </AlertDescription>
          </Alert>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[250px]">{t.product} *</TableHead>
                  <TableHead className="min-w-[150px]">{t.warehouse} *</TableHead>
                  <TableHead className="min-w-[120px]">{t.unit}</TableHead>
                  <TableHead className="min-w-[120px]">{t.color}</TableHead>
                  <TableHead className="min-w-[100px]">{t.stock} *</TableHead>
                  <TableHead className="min-w-[120px]">{t.cost} *</TableHead>
                  <TableHead className="w-[50px]">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => {
                  const availableUnits = getAvailableUnits(item.product_id);
                  const availableColors = getAvailableColors(item.product_id, item.unit_id);
                  const availableProducts = getAvailableProducts(item.id);
                  
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="space-y-2">
                          {/* Search Input for Products */}
                          <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder={t.searchProduct}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="pl-8"
                            />
                          </div>
                          
                          {/* Products Select */}
                          <Select 
                            value={item.product_id} 
                            onValueChange={(val) => updateItem(item.id, 'product_id', val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={t.selectProduct} />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                              {productsLoading ? (
                                <SelectItem value="loading" disabled>
                                  <div className="flex items-center gap-2">
                                    <Loader2 className="animate-spin" size={14} />
                                    {t.loading}
                                  </div>
                                </SelectItem>
                              ) : availableProducts.length === 0 ? (
                                <SelectItem value="no-results" disabled>
                                  {language === 'ar' ? 'لا توجد منتجات متاحة' : 'No products available'}
                                </SelectItem>
                              ) : (
                                availableProducts.map((product) => (
                                  <SelectItem key={product.id} value={product.id.toString()}>
                                    <div>
                                      <div>{language === 'ar' && product.name_ar ? product.name_ar : product.name}</div>
                                      <div className="text-xs text-muted-foreground">{product.sku}</div>
                                    </div>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={item.warehouse_id} 
                          onValueChange={(val) => updateItem(item.id, 'warehouse_id', val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={t.selectWarehouse} />
                          </SelectTrigger>
                          <SelectContent>
                            {warehousesLoading ? (
                              <SelectItem value="loading" disabled>{t.loading}</SelectItem>
                            ) : (
                              warehouses.map((warehouse) => (
                                <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                                  {warehouse.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={item.unit_id} 
                          onValueChange={(val) => updateItem(item.id, 'unit_id', val)}
                          disabled={availableUnits.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={availableUnits.length === 0 ? t.noUnit : t.selectUnit} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableUnits.map((unit) => (
                              <SelectItem key={unit.id} value={unit.unit_id.toString()}>
                                {unit.unit_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={item.color_id} 
                          onValueChange={(val) => updateItem(item.id, 'color_id', val)}
                          disabled={availableColors.length === 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={availableColors.length === 0 ? t.noColor : t.selectColor} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableColors.map((color) => (
                              <SelectItem key={color.id} value={color.color_id.toString()}>
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-3 h-3 rounded-full border" 
                                    style={{ backgroundColor: color.hex_code }}
                                  />
                                  {color.color}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.stock || ''}
                          onChange={(e) => updateItem(item.id, 'stock', Number(e.target.value))}
                          min={1}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.cost || ''}
                          onChange={(e) => updateItem(item.id, 'cost', Number(e.target.value))}
                          min={0}
                          step="0.01"
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRow(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <Button 
            variant="outline" 
            onClick={addNewRow}
            className="gap-2"
          >
            <Plus size={16} />
            {t.addRow}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={addMultipleStockMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-600 gap-2"
          >
            {addMultipleStockMutation.isPending ? (
              <Loader2 className="animate-spin" size={16} />
            ) : null}
            {t.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductWithBalance;