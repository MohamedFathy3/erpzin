import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Upload, Barcode, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import VariantMatrix, { VariantOption, ProductVariant } from './VariantMatrix';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductFormData) => void;
  categories?: any[]; // Keep for backwards compatibility but we'll fetch from DB
  editProduct?: ProductFormData | null;
}

export interface ProductFormData {
  id?: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  sku: string;
  barcode: string;
  categoryId: string;
  price: number;
  cost: number;
  hasVariants: boolean;
  variants: ProductVariant[];
  selectedSizes: string[];
  selectedColors: string[];
  stock: number;
  reorderPoint: number;
  status: 'active' | 'inactive';
}

// Default sizes and colors are now loaded from database via VariantMatrix

const generateSKU = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const nums = '0123456789';
  let sku = '';
  for (let i = 0; i < 2; i++) sku += chars.charAt(Math.floor(Math.random() * chars.length));
  sku += '-';
  for (let i = 0; i < 4; i++) sku += nums.charAt(Math.floor(Math.random() * nums.length));
  return sku;
};

const generateBarcode = (): string => {
  return Math.floor(Math.random() * 9000000000000 + 1000000000000).toString();
};

interface DbCategory {
  id: string;
  name: string;
  name_ar: string | null;
  parent_id: string | null;
}

const flattenDbCategories = (categories: DbCategory[]): { id: string; name: string; nameAr: string }[] => {
  // Build parent map
  const parentMap: Record<string, DbCategory> = {};
  categories.forEach(cat => { parentMap[cat.id] = cat; });
  
  return categories.map(cat => {
    let prefix = '';
    let current = cat;
    const ancestors: string[] = [];
    
    while (current.parent_id && parentMap[current.parent_id]) {
      current = parentMap[current.parent_id];
      ancestors.unshift(current.name);
    }
    
    if (ancestors.length > 0) {
      prefix = ancestors.join(' > ') + ' > ';
    }
    
    return {
      id: cat.id,
      name: prefix + cat.name,
      nameAr: prefix + (cat.name_ar || cat.name),
    };
  });
};

const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSave,
  editProduct
}) => {
  const { language } = useLanguage();
  
  // Fetch categories from database
  const { data: dbCategories = [] } = useQuery({
    queryKey: ['categories-for-form'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, name_ar, parent_id')
        .order('name');
      if (error) throw error;
      return data as DbCategory[];
    },
    enabled: isOpen,
  });

  const flatCategories = flattenDbCategories(dbCategories);
  
  const [formData, setFormData] = useState<ProductFormData>(editProduct || {
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    sku: generateSKU(),
    barcode: generateBarcode(),
    categoryId: '',
    price: 0,
    cost: 0,
    hasVariants: false,
    variants: [],
    selectedSizes: [],
    selectedColors: [],
    stock: 0,
    reorderPoint: 5,
    status: 'active'
  });

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-4xl mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h2 className="text-xl font-bold text-foreground">
            {editProduct 
              ? (language === 'ar' ? 'تعديل المنتج' : 'Edit Product')
              : (language === 'ar' ? 'إضافة منتج جديد' : 'Add New Product')
            }
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>{language === 'ar' ? 'اسم المنتج (إنجليزي)' : 'Product Name (English)'}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Boys Classic Jeans"
                  required
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'اسم المنتج (عربي)' : 'Product Name (Arabic)'}</Label>
                <Input
                  value={formData.nameAr}
                  onChange={(e) => handleChange('nameAr', e.target.value)}
                  placeholder="جينز أولاد كلاسيك"
                  dir="rtl"
                  required
                />
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>{language === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  placeholder="Product description..."
                  rows={2}
                />
              </div>
              <div>
                <Label>{language === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                <Textarea
                  value={formData.descriptionAr}
                  onChange={(e) => handleChange('descriptionAr', e.target.value)}
                  placeholder="وصف المنتج..."
                  dir="rtl"
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* SKU & Barcode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{language === 'ar' ? 'التصنيف' : 'Category'}</Label>
              <Select value={formData.categoryId} onValueChange={(val) => handleChange('categoryId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر التصنيف' : 'Select category'} />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  {flatCategories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {language === 'ar' ? cat.nameAr : cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{language === 'ar' ? 'SKU' : 'SKU'}</Label>
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
                  <RefreshCw size={16} />
                </Button>
              </div>
            </div>
            <div>
              <Label>{language === 'ar' ? 'الباركود' : 'Barcode'}</Label>
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
                  <Barcode size={16} />
                </Button>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>{language === 'ar' ? 'سعر البيع' : 'Selling Price'}</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'التكلفة' : 'Cost'}</Label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => handleChange('cost', parseFloat(e.target.value) || 0)}
                min={0}
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'المخزون' : 'Stock'}</Label>
              <Input
                type="number"
                value={formData.stock}
                onChange={(e) => handleChange('stock', parseInt(e.target.value) || 0)}
                min={0}
                disabled={formData.hasVariants}
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'حد إعادة الطلب' : 'Reorder Point'}</Label>
              <Input
                type="number"
                value={formData.reorderPoint}
                onChange={(e) => handleChange('reorderPoint', parseInt(e.target.value) || 0)}
                min={0}
              />
            </div>
          </div>

          {/* Variants Toggle */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="font-medium text-foreground">
                {language === 'ar' ? 'هل للمنتج متغيرات؟' : 'Does this product have variants?'}
              </p>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' ? 'ألوان ومقاسات مختلفة' : 'Different colors and sizes'}
              </p>
            </div>
            <Switch
              checked={formData.hasVariants}
              onCheckedChange={(checked) => handleChange('hasVariants', checked)}
            />
          </div>

          {/* Variant Matrix */}
          {formData.hasVariants && (
            <VariantMatrix
              variants={formData.variants}
              baseSku={formData.sku}
              basePrice={formData.price}
              onVariantChange={(variants) => handleChange('variants', variants)}
              selectedSizes={formData.selectedSizes}
              selectedColors={formData.selectedColors}
              onSizeSelectionChange={(sizes) => handleChange('selectedSizes', sizes)}
              onColorSelectionChange={(colors) => handleChange('selectedColors', colors)}
            />
          )}

          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="font-medium text-foreground">
                {language === 'ar' ? 'حالة المنتج' : 'Product Status'}
              </p>
              <p className="text-sm text-muted-foreground">
                {formData.status === 'active' 
                  ? (language === 'ar' ? 'المنتج متاح للبيع' : 'Product is available for sale')
                  : (language === 'ar' ? 'المنتج غير متاح' : 'Product is not available')
                }
              </p>
            </div>
            <Switch
              checked={formData.status === 'active'}
              onCheckedChange={(checked) => handleChange('status', checked ? 'active' : 'inactive')}
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-muted/30">
          <Button variant="outline" onClick={onClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
            {editProduct 
              ? (language === 'ar' ? 'حفظ التغييرات' : 'Save Changes')
              : (language === 'ar' ? 'إضافة المنتج' : 'Add Product')
            }
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;
