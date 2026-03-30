// components/inventory/AddProductWithBalance.tsx
import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Package, Building2, FolderOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface Warehouse {
  id: number;
  name: string;
  branch_id?: {
    id: number;
    name: string;
  };
}

interface Category {
  id: number;
  name: string;
  name_ar?: string;
  type?: string;
  parent_id?: number | null;
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
    name: '',
    name_ar: '',
    description: '',
    description_ar: '',
    sku: '',
    barcode: '',
    cost: 0,
    price: 0,
    beginning_balance: 1,
    warehouse_id: '',
    category_id: '',
    reorder_level: 5
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

  // جلب التصنيفات
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['categories-for-product'],
    queryFn: async () => {
      const response = await api.post('/category/index', {
        "orderBy": "id",
        "orderByDirection": "asc",
        "perPage": 1000,
        "paginate": false
      });
      return response.data?.data || [];
    },
    enabled: isOpen
  });

  // توليد SKU تلقائي
  const generateSKU = () => {
    const prefix = 'PROD';
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    return `${prefix}-${randomNum}`;
  };

  // توليد Barcode تلقائي
  const generateBarcode = () => {
    return Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
  };

  // تعبئة الحقول عند فتح المودال
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        name_ar: '',
        description: '',
        description_ar: '',
        sku: generateSKU(),
        barcode: generateBarcode(),
        cost: 0,
        price: 0,
        beginning_balance: 0,
        warehouse_id: '',
        category_id: '',
        reorder_level: 5
      });
    }
  }, [isOpen]);

  // إضافة منتج جديد
  const addProductMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: formData.name,
        name_ar: formData.name_ar || '',
        description: formData.description || '',
        description_ar: formData.description_ar || '',
        sku: formData.sku,
        barcode: formData.barcode,
        cost: formData.cost,
        price: formData.price,
        beginning_balance: formData.beginning_balance,
        reorder_level: formData.reorder_level,
        warehouse_id: formData.warehouse_id ? parseInt(formData.warehouse_id) : null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        status: 'active'
      };

      console.log('📤 Adding new product with balance:', payload);
      
      const response = await api.post('/product', payload);
      return response.data;
    },
    onSuccess: () => {
      toast({ 
        title: language === 'ar' ? 'تم إضافة المنتج بنجاح' : 'Product added successfully',
        description: language === 'ar' 
          ? `تم إضافة المنتج ${formData.name} مع رصيد ${formData.beginning_balance} قطعة`
          : `Added product ${formData.name} with ${formData.beginning_balance} pieces balance`
      });
      queryClient.invalidateQueries({ queryKey: ['products-with-opening'] });
      queryClient.invalidateQueries({ queryKey: ['products-for-balance'] });
      onClose();
      if (onSuccess) onSuccess();
    },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      console.error('Error adding product:', error);
      toast({ 
        title: language === 'ar' ? 'حدث خطأ' : 'Error', 
        description: error.response?.data?.message || error.message, 
        variant: 'destructive' 
      });
    }
  });

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast({ 
        title: language === 'ar' ? 'اسم المنتج مطلوب' : 'Product name is required', 
        variant: 'destructive' 
      });
      return;
    }
    if (formData.cost <= 0) {
      toast({ 
        title: language === 'ar' ? 'سعر التكلفة مطلوب' : 'Cost price is required', 
        variant: 'destructive' 
      });
      return;
    }
    if (formData.price <= 0) {
      toast({ 
        title: language === 'ar' ? 'سعر البيع مطلوب' : 'Selling price is required', 
        variant: 'destructive' 
      });
      return;
    }
    addProductMutation.mutate();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const t = {
    title: language === 'ar' ? 'إضافة منتج جديد مع رصيد أول المدة' : 'Add New Product with Opening Balance',
    name: language === 'ar' ? 'اسم المنتج' : 'Product Name',
    nameAr: language === 'ar' ? 'اسم المنتج (عربي)' : 'Product Name (Arabic)',
    description: language === 'ar' ? 'الوصف' : 'Description',
    sku: language === 'ar' ? 'SKU' : 'SKU',
    barcode: language === 'ar' ? 'الباركود' : 'Barcode',
    cost: language === 'ar' ? 'سعر التكلفة' : 'Cost Price',
    price: language === 'ar' ? 'سعر البيع' : 'Selling Price',
    beginningBalance: language === 'ar' ? 'رصيد أول المدة' : 'Opening Balance',
    warehouse: language === 'ar' ? 'المستودع' : 'Warehouse',
    category: language === 'ar' ? 'التصنيف' : 'Category',
    reorderLevel: language === 'ar' ? 'حد إعادة الطلب' : 'Reorder Level',
    add: language === 'ar' ? 'إضافة' : 'Add',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    selectWarehouse: language === 'ar' ? 'اختر المستودع' : 'Select warehouse',
    selectCategory: language === 'ar' ? 'اختر التصنيف' : 'Select category',
    totalValue: language === 'ar' ? 'القيمة الإجمالية' : 'Total Value',
    noCategory: language === 'ar' ? 'بدون تصنيف' : 'No category',
    noWarehouse: language === 'ar' ? 'بدون مستودع' : 'No warehouse'
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={18} className="text-emerald-500" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label>{t.name} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Product name"
              />
            </div>
          
          </div>

          <div className="space-y-2">
            <Label>{t.description}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Product description..."
              rows={2}
            />
          </div>

          {/* SKU & Barcode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.sku}</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.sku}
                  onChange={(e) => handleChange('sku', e.target.value)}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleChange('sku', generateSKU())}
                >
                  <Loader2 size={16} className="rotate-90" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.barcode}</Label>
              <div className="flex gap-2">
                <Input
                  value={formData.barcode}
                  onChange={(e) => handleChange('barcode', e.target.value)}
                  className="font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleChange('barcode', generateBarcode())}
                >
                  <Loader2 size={16} className="rotate-90" />
                </Button>
              </div>
            </div>
          </div>

          {/* Category & Warehouse */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <FolderOpen size={14} />
                {t.category}
              </Label>
              <Select 
                value={formData.category_id || "none"} 
                onValueChange={(val) => handleChange('category_id', val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectCategory} />
                </SelectTrigger>
                <SelectContent>
                  {categoriesLoading ? (
                    <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="none">{t.noCategory}</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {language === 'ar' && category.name_ar ? category.name_ar : category.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 size={14} />
                {t.warehouse}
              </Label>
              <Select 
                value={formData.warehouse_id || "none"} 
                onValueChange={(val) => handleChange('warehouse_id', val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectWarehouse} />
                </SelectTrigger>
                <SelectContent>
                  {warehousesLoading ? (
                    <SelectItem value="loading" disabled>جاري التحميل...</SelectItem>
                  ) : (
                    <>
                      <SelectItem value="none">{t.noWarehouse}</SelectItem>
                      {warehouses.map((warehouse) => (
                        <SelectItem key={warehouse.id} value={warehouse.id.toString()}>
                          {warehouse.name}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t.cost} *</Label>
              <Input
                type="number"
                value={formData.cost || ''}
                onChange={(e) => handleChange('cost', Number(e.target.value))}
                min={0}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.price} *</Label>
              <Input
                type="number"
                value={formData.price || ''}
                onChange={(e) => handleChange('price', Number(e.target.value))}
                min={0}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>{t.reorderLevel}</Label>
              <Input
                type="number"
                value={formData.reorder_level || ''}
                onChange={(e) => handleChange('reorder_level', Number(e.target.value))}
                min={0}
                placeholder="5"
              />
            </div>
          </div>

        
            
         
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={addProductMutation.isPending}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {addProductMutation.isPending ? (
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