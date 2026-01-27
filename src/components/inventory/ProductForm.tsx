import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Upload, Barcode, RefreshCw, Link, ImageIcon, Loader2, Building2, Warehouse, Calculator } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import VariantMatrix, { VariantOption, ProductVariant } from './VariantMatrix';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductFormData) => void | Promise<void>;
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
  imageUrl: string;
  // New fields for branch/warehouse/valuation
  branchIds: string[];
  warehouseIds: string[];
  valuationMethod: 'fifo' | 'lifo' | 'weighted_average';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  
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

  // Fetch branches from database
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-for-form'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, name_ar')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  // Fetch warehouses from database
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-for-form'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, name_ar')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: isOpen,
  });

  const flatCategories = flattenDbCategories(dbCategories);
  
  const getInitialFormData = (): ProductFormData => ({
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
    status: 'active',
    imageUrl: '',
    branchIds: [],
    warehouseIds: [],
    valuationMethod: 'fifo'
  });

  const [formData, setFormData] = useState<ProductFormData>(editProduct || getInitialFormData());

  // Update form data when editProduct changes (for editing existing products)
  useEffect(() => {
    if (isOpen && editProduct) {
      setFormData(editProduct);
    } else if (isOpen && !editProduct) {
      setFormData(getInitialFormData());
    }
  }, [isOpen, editProduct]);

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(language === 'ar' ? 'يرجى اختيار صورة' : 'Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' : 'Image size must be less than 5MB');
      return;
    }

    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `products/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(filePath);

      handleChange('imageUrl', publicUrl);
      toast.success(language === 'ar' ? 'تم رفع الصورة بنجاح' : 'Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(language === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUrlSubmit = () => {
    if (imageUrlInput.trim()) {
      handleChange('imageUrl', imageUrlInput.trim());
      setImageUrlInput('');
      setShowUrlInput(false);
      toast.success(language === 'ar' ? 'تم إضافة رابط الصورة' : 'Image URL added');
    }
  };

  const removeImage = () => {
    handleChange('imageUrl', '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
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
          {/* Product Image */}
          <div className="space-y-3">
            <Label>{language === 'ar' ? 'صورة المنتج' : 'Product Image'}</Label>
            <div className="flex gap-4 items-start">
              {/* Image Preview */}
              <div className="relative w-32 h-32 border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
                {formData.imageUrl ? (
                  <>
                    <img 
                      src={formData.imageUrl} 
                      alt="Product" 
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              
              {/* Upload Options */}
              <div className="flex-1 space-y-3">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    className="flex-1"
                  >
                    {isUploadingImage ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    {language === 'ar' ? 'رفع من الجهاز' : 'Upload from Device'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                  >
                    <Link className="w-4 h-4" />
                  </Button>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {showUrlInput && (
                  <div className="flex gap-2">
                    <Input
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder={language === 'ar' ? 'أدخل رابط الصورة...' : 'Enter image URL...'}
                      className="flex-1"
                    />
                    <Button type="button" onClick={handleUrlSubmit} size="sm">
                      {language === 'ar' ? 'إضافة' : 'Add'}
                    </Button>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground">
                  {language === 'ar' 
                    ? 'الحد الأقصى: 5 ميجابايت - الصيغ: JPG, PNG, GIF, WEBP'
                    : 'Max: 5MB - Formats: JPG, PNG, GIF, WEBP'
                  }
                </p>
              </div>
            </div>
          </div>

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

          {/* Branch, Warehouse & Valuation Method */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/20 rounded-lg border border-border">
            {/* Branches Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 size={16} className="text-primary" />
                {language === 'ar' ? 'الفروع' : 'Branches'}
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto p-2 bg-background rounded-md border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="all-branches"
                    checked={(formData.branchIds || []).length === 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleChange('branchIds', []);
                      }
                    }}
                  />
                  <label htmlFor="all-branches" className="text-sm cursor-pointer">
                    {language === 'ar' ? 'جميع الفروع' : 'All Branches'}
                  </label>
                </div>
                {branches.map((branch) => (
                  <div key={branch.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`branch-${branch.id}`}
                      checked={(formData.branchIds || []).includes(branch.id)}
                      onCheckedChange={(checked) => {
                        const currentIds = formData.branchIds || [];
                        if (checked) {
                          handleChange('branchIds', [...currentIds, branch.id]);
                        } else {
                          handleChange('branchIds', currentIds.filter(id => id !== branch.id));
                        }
                      }}
                    />
                    <label htmlFor={`branch-${branch.id}`} className="text-sm cursor-pointer">
                      {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Warehouses Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Warehouse size={16} className="text-primary" />
                {language === 'ar' ? 'المخازن' : 'Warehouses'}
              </Label>
              <div className="space-y-2 max-h-32 overflow-y-auto p-2 bg-background rounded-md border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="all-warehouses"
                    checked={(formData.warehouseIds || []).length === 0}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        handleChange('warehouseIds', []);
                      }
                    }}
                  />
                  <label htmlFor="all-warehouses" className="text-sm cursor-pointer">
                    {language === 'ar' ? 'جميع المخازن' : 'All Warehouses'}
                  </label>
                </div>
                {warehouses.map((warehouse) => (
                  <div key={warehouse.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`warehouse-${warehouse.id}`}
                      checked={(formData.warehouseIds || []).includes(warehouse.id)}
                      onCheckedChange={(checked) => {
                        const currentIds = formData.warehouseIds || [];
                        if (checked) {
                          handleChange('warehouseIds', [...currentIds, warehouse.id]);
                        } else {
                          handleChange('warehouseIds', currentIds.filter(id => id !== warehouse.id));
                        }
                      }}
                    />
                    <label htmlFor={`warehouse-${warehouse.id}`} className="text-sm cursor-pointer">
                      {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Valuation Method */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calculator size={16} className="text-primary" />
                {language === 'ar' ? 'طريقة تقييم المخزون' : 'Inventory Valuation Method'}
              </Label>
              <Select 
                value={formData.valuationMethod} 
                onValueChange={(val: 'fifo' | 'lifo' | 'weighted_average') => handleChange('valuationMethod', val)}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="fifo">
                    {language === 'ar' ? 'الوارد أولاً صادر أولاً (FIFO)' : 'First In, First Out (FIFO)'}
                  </SelectItem>
                  <SelectItem value="lifo">
                    {language === 'ar' ? 'الوارد أخيراً صادر أولاً (LIFO)' : 'Last In, First Out (LIFO)'}
                  </SelectItem>
                  <SelectItem value="weighted_average">
                    {language === 'ar' ? 'المتوسط المرجح' : 'Weighted Average'}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {formData.valuationMethod === 'fifo' && (language === 'ar' ? 'أقدم المخزون يُباع أولاً' : 'Oldest inventory sold first')}
                {formData.valuationMethod === 'lifo' && (language === 'ar' ? 'أحدث المخزون يُباع أولاً' : 'Newest inventory sold first')}
                {formData.valuationMethod === 'weighted_average' && (language === 'ar' ? 'متوسط تكلفة جميع الوحدات' : 'Average cost of all units')}
              </p>
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
              baseCost={formData.cost}
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
