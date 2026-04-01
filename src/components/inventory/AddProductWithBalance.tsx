// components/inventory/AddProductWithBalance.tsx
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, Building2, FolderOpen, PackageSearch } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Warehouse {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  units?: Array<{
    id: number;           // id بتاع العلاقة (مش هنستخدمه)
    unit_id: number;      // ده اللي هنبعته للـ API
    unit_name: string;
    colors?: Array<{
      id: number;         // id بتاع العلاقة (مش هنستخدمه)
      color_id: number;   // ده اللي هنبعته للـ API
      color: string;
      hex_code: string;
    }>;
  }>;
}

interface AddProductWithBalanceProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddProductWithBalance: React.FC<AddProductWithBalanceProps> = ({ isOpen, onClose, onSuccess }) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    product_id: '',
    warehouse_id: '',
    unit_id: '',      // هنا هنخزن unit_id مش id
    color_id: '',     // هنا هنخزن color_id مش id
    stock: 1
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // جلب المنتجات
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['products-for-opening-balance'],
    queryFn: async () => {
      const response = await api.post('/product/index', {
        filters: { 
          active: true
        },
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 1000,
        paginate: false
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

  // جلب الوحدات بناءً على المنتج المختار - بنستخدم unit_id
  const availableUnits = selectedProduct?.units || [];

  // جلب الألوان بناءً على الوحدة المختارة - بنستخدم color_id
  const selectedUnit = availableUnits.find(u => u.unit_id.toString() === formData.unit_id);
  const availableColors = selectedUnit?.colors || [];

  // إضافة رصيد للمنتج
  const addStockMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        product_id: parseInt(formData.product_id),
        warehouse_id: parseInt(formData.warehouse_id),
        stock: formData.stock
      };

      // بنبعت unit_id مش id
      if (formData.unit_id) {
        payload.unit_id = parseInt(formData.unit_id);
      }

      // بنبعت color_id مش id
      if (formData.color_id) {
        payload.color_id = parseInt(formData.color_id);
      }

      console.log('📤 Adding stock to existing product:', payload);
      
      const response = await api.post('/products/add-stock', payload);
      return response.data;
    },
    onSuccess: () => {
      toast({ 
        title: language === 'ar' ? 'تم إضافة الرصيد بنجاح' : 'Stock added successfully',
        description: language === 'ar' 
          ? `تم إضافة ${formData.stock} قطعة للمنتج`
          : `Added ${formData.stock} pieces to product`
      });
      
      queryClient.invalidateQueries({ queryKey: ['products-with-balance'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-balance'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-opening'] });
      
      onClose();
      if (onSuccess) onSuccess();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      console.error('Error adding stock:', error);
      toast({ 
        title: language === 'ar' ? 'حدث خطأ' : 'Error', 
        description: error.response?.data?.message || error.message, 
        variant: 'destructive' 
      });
    }
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        product_id: '',
        warehouse_id: '',
        unit_id: '',
        color_id: '',
        stock: 1
      });
      setSelectedProduct(null);
    }
  }, [isOpen]);

  const handleProductChange = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    setSelectedProduct(product || null);
    setFormData(prev => ({
      ...prev,
      product_id: productId,
      unit_id: '',  // reset unit
      color_id: ''  // reset color
    }));
  };

  // بنخزن unit_id مش id
  const handleUnitChange = (unitIdValue: string) => {
    setFormData(prev => ({
      ...prev,
      unit_id: unitIdValue,
      color_id: '' // reset color when unit changes
    }));
  };

  // بنخزن color_id مش id
  const handleColorChange = (colorIdValue: string) => {
    setFormData(prev => ({
      ...prev,
      color_id: colorIdValue
    }));
  };

  const handleSubmit = () => {
    if (!formData.product_id) {
      toast({ 
        title: language === 'ar' ? 'يرجى اختيار المنتج' : 'Please select a product', 
        variant: 'destructive' 
      });
      return;
    }
    if (!formData.warehouse_id) {
      toast({ 
        title: language === 'ar' ? 'يرجى اختيار المستودع' : 'Please select a warehouse', 
        variant: 'destructive' 
      });
      return;
    }
    if (formData.stock <= 0) {
      toast({ 
        title: language === 'ar' ? 'الكمية يجب أن تكون أكبر من صفر' : 'Stock must be greater than zero', 
        variant: 'destructive' 
      });
      return;
    }
    addStockMutation.mutate();
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const t = {
    title: language === 'ar' ? 'إضافة رصيد أول المدة' : 'Add Opening Balance',
    description: language === 'ar' ? 'إضافة رصيد لمنتج موجود' : 'Add stock to existing product',
    product: language === 'ar' ? 'المنتج' : 'Product',
    warehouse: language === 'ar' ? 'المستودع' : 'Warehouse',
    unit: language === 'ar' ? 'وحدة القياس' : 'Unit',
    color: language === 'ar' ? 'اللون' : 'Color',
    stock: language === 'ar' ? 'الكمية' : 'Stock Quantity',
    add: language === 'ar' ? 'إضافة' : 'Add',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    selectProduct: language === 'ar' ? 'اختر المنتج' : 'Select product',
    selectWarehouse: language === 'ar' ? 'اختر المستودع' : 'Select warehouse',
    selectUnit: language === 'ar' ? 'اختر الوحدة' : 'Select unit',
    selectColor: language === 'ar' ? 'اختر اللون' : 'Select color',
    noUnit: language === 'ar' ? 'لا توجد وحدات' : 'No units available',
    noColor: language === 'ar' ? 'لا توجد ألوان' : 'No colors available',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={18} className="text-emerald-500" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Product Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <PackageSearch size={14} />
              {t.product} *
            </Label>
            <Select 
              value={formData.product_id} 
              onValueChange={handleProductChange}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.selectProduct} />
              </SelectTrigger>
              <SelectContent>
                {productsLoading ? (
                  <SelectItem value="loading" disabled>
                    {t.loading}
                  </SelectItem>
                ) : (
                  products.map((product) => (
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

          {/* Warehouse Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Building2 size={14} />
              {t.warehouse} *
            </Label>
            <Select 
              value={formData.warehouse_id} 
              onValueChange={(val) => handleChange('warehouse_id', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.selectWarehouse} />
              </SelectTrigger>
              <SelectContent>
                {warehousesLoading ? (
                  <SelectItem value="loading" disabled>
                    {t.loading}
                  </SelectItem>
                ) : (
                  warehouses.map((warehouse) => (
                    <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                      {warehouse.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Selection - بنستخدم unit_id كـ value */}
          {availableUnits.length > 0 && (
            <div className="space-y-2">
              <Label>{t.unit}</Label>
              <Select 
                value={formData.unit_id} 
                onValueChange={handleUnitChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectUnit} />
                </SelectTrigger>
                <SelectContent>
                  {availableUnits.map((unit) => (
                    <SelectItem 
                      key={unit.id} 
                      value={unit.unit_id.toString()}  // بنستخدم unit_id مش id
                    >
                      {unit.unit_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Color Selection - بنستخدم color_id كـ value */}
          {availableColors.length > 0 && (
            <div className="space-y-2">
              <Label>{t.color}</Label>
              <Select 
                value={formData.color_id} 
                onValueChange={handleColorChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectColor} />
                </SelectTrigger>
                <SelectContent>
                  {availableColors.map((color) => (
                    <SelectItem 
                      key={color.id} 
                      value={color.color_id.toString()}  // بنستخدم color_id مش id
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border" 
                          style={{ backgroundColor: color.hex_code }}
                        />
                        {color.color}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Stock Quantity */}
          <div className="space-y-2">
            <Label>{t.stock} *</Label>
            <Input
              type="number"
              value={formData.stock || ''}
              onChange={(e) => handleChange('stock', Number(e.target.value))}
              min={1}
              placeholder="0"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={addStockMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {addStockMutation.isPending ? (
              <Loader2 className="animate-spin me-1" size={16} />
            ) : null}
            {t.add}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddProductWithBalance;