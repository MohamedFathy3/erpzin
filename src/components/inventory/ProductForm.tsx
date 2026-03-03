import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Upload, Barcode, RefreshCw, Link, ImageIcon, Loader2, Building2, Warehouse, Calculator, Eye, ExternalLink } from 'lucide-react';
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
import { Card, CardContent } from '@/components/ui/card';
import VariantMatrix, { ProductVariant } from './VariantMatrix';
import { toast } from '@/hooks/use-toast';
import FileUploader from '@/components/FileUploader';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductFormData) => void | Promise<void>;
  editProduct?: ProductFormData | null;
  branches?: any[];
  warehouses?: any[];
  categories?: any[];
  isLoadingBranches?: boolean;
  isLoadingWarehouses?: boolean;
  isLoadingCategories?: boolean;
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
  imageId?: number;
  imageUrl?: string;
  branchIds: string[];
  warehouseIds: string[];
  valuationMethod: 'fifo' | 'lifo' | 'weighted_average';
}

export const transformApiProductToFormData = (apiProduct: any): ProductFormData => {
  
  let imageUrl = '';
  let imageId: number | undefined;
  
  // معالجة الصورة
  if (apiProduct.image) {
    if (typeof apiProduct.image === 'object') {
      imageId = apiProduct.image.id;
      imageUrl = apiProduct.image.fullUrl || apiProduct.image.previewUrl || apiProduct.image.url || '';
    } else if (typeof apiProduct.image === 'number') {
      imageId = apiProduct.image;
    }
  } else if (apiProduct.image_url) {
    imageUrl = apiProduct.image_url;
  }
  
  // تحويل active (boolean) إلى status (string)
  const status = apiProduct.active === true || apiProduct.status === 'active' ? 'active' : 'inactive';
  
  // تأكد من أن category_id معالج بشكل صحيح
  const categoryId = apiProduct.category?.id?.toString() || 
                     apiProduct.category_id?.toString() || 
                     '';

  // معالجة المتغيرات
  let variants = [];
  
  if (apiProduct.variants && apiProduct.variants.length > 0) {
    variants = apiProduct.variants;
  } else if (apiProduct.units && apiProduct.units.length > 0) {
    variants = apiProduct.units;
  }

  const result = {
    id: apiProduct.id?.toString(),
    name: apiProduct.name || '',
    nameAr: apiProduct.name_ar || apiProduct.name || '',
    description: apiProduct.description || '',
    descriptionAr: apiProduct.description_ar || '',
    sku: apiProduct.sku || '',
    barcode: apiProduct.barcode || '',
    categoryId: categoryId,
    price: Number(apiProduct.price) || 0,
    cost: Number(apiProduct.cost) || 0,
    hasVariants: apiProduct.has_variants || false,
    variants: variants,
    selectedSizes: [],
    selectedColors: [],
    stock: Number(apiProduct.stock) || 0,
    reorderPoint: Number(apiProduct.reorder_level) || 5,
    status: status,
    imageId,
    imageUrl,
    branchIds: Array.isArray(apiProduct.branch_ids) 
      ? apiProduct.branch_ids.map((id: any) => id.toString())
      : [],
    warehouseIds: Array.isArray(apiProduct.warehouse_ids) 
      ? apiProduct.warehouse_ids.map((id: any) => id.toString())
      : [],
    valuationMethod: apiProduct.valuation_method || 'fifo'
  };
  
  return result;
};

// ✅ أضف هذه الدالة في نفس الملف (في الأعلى أو الأسفل)
const generateBarcode = (): string => {
  return Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
};

const generateSKU = (): string => {
  const prefix = 'PROD';
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${randomNum}`;
};



interface DbCategory {
  id: string | number;
  name: string;
  name_ar: string | null;
  parent_id: string | number | null;
  type?: string;
}

const flattenDbCategories = (categories: DbCategory[]): { id: string; name: string; nameAr: string }[] => {
  const result: { id: string; name: string; nameAr: string }[] = [];
  
  // Filter out categories without valid ID
  const validCategories = categories.filter(cat => {
    if (cat.id === undefined || cat.id === null) return false;
    
    if (typeof cat.id === 'number') {
      return !isNaN(cat.id) && cat.id > 0;
    } else if (typeof cat.id === 'string') {
      return cat.id.trim() !== '';
    }
    return false;
  });

  const buildPath = (category: DbCategory, path: string = '', pathAr: string = ''): void => {
    const currentName = category.name || 'Unnamed';
    const currentNameAr = category.name_ar || currentName;
    
    const newPath = path ? `${currentName} > ${path}` : currentName;
    const newPathAr = pathAr ? `${currentNameAr} > ${pathAr}` : currentNameAr;
    
    result.push({
      id: category.id.toString(),
      name: newPath,
      nameAr: newPathAr,
    });
  };

  // Main categories
  const mainCategories = validCategories.filter(cat => !cat.parent_id || cat.type === 'category');
  mainCategories.forEach(cat => buildPath(cat));
  
  // Sub-categories
  const subCategories = validCategories.filter(cat => cat.parent_id && cat.type === 'sub_category');
  subCategories.forEach(subCat => {
    const parent = validCategories.find(cat => {
      return cat.id.toString() === subCat.parent_id?.toString();
    });
    if (parent) {
      buildPath(subCat, parent.name, parent.name_ar || parent.name);
    } else {
      buildPath(subCat);
    }
  });
  
  return result.sort((a, b) => a.name.localeCompare(b.name));
};

const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSave,
  editProduct,
  branches = [],
  warehouses = [],
  categories = [],
  isLoadingBranches = false,
  isLoadingWarehouses = false,
  isLoadingCategories = false
}) => {
  const { language } = useLanguage();
  const [uploadedImageIds, setUploadedImageIds] = useState<number[]>([]);
  
  // تأكد أن categories مصفوفة وليست undefined
  const flatCategories = flattenDbCategories(categories || []);

  const getInitialFormData = (): ProductFormData => {
    const data = {
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
      status: 'active' as const,
      imageId: undefined,
      imageUrl: '',
      branchIds: [],
      warehouseIds: [],
      valuationMethod: 'fifo' as const
    };
    
    return data;
  };

  const [formData, setFormData] = useState<ProductFormData>(getInitialFormData());


  useEffect(() => {
    
    if (isOpen) {
      if (editProduct) {
     
        
        // تأكد أن الأرقام تتحول بشكل صحيح
        const processedEditData = {
          ...editProduct,
          price: Number(editProduct.price) || 0,
          cost: Number(editProduct.cost) || 0,
          stock: Number(editProduct.stock) || 0,
          reorderPoint: Number(editProduct.reorderPoint) || 5
        };
        
        setFormData(processedEditData);
        
      } else {
        const initialData = getInitialFormData();
        setFormData(initialData);
      }
    }
  }, [isOpen, editProduct]);

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNumberChange = (field: keyof ProductFormData, value: string) => {
    if (field === 'categoryId') {
      handleChange(field, value);
      return;
    }
    
    if (value === '' || value === undefined || value === null) {
      handleChange(field, 0);
      return;
    }
    
    const numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      handleChange(field, 0);
    } else {
      handleChange(field, numValue);
    }
  };

  const handleImageUploadSuccess = (ids: number[]) => {
    setUploadedImageIds(ids);
    if (ids.length > 0) {
      handleChange('imageId', ids[0]);
      handleChange('imageUrl', '');
    }
    
    toast({
      title: language === 'ar' ? 'تم الرفع بنجاح' : 'Upload successful',
      description: language === 'ar' 
        ? `تم رفع ${ids.length} صورة` 
        : `${ids.length} image(s) uploaded`,
    });
  };

  const handleImageUploadError = (error: Error) => {
    toast({
      title: language === 'ar' ? 'خطأ' : 'Error',
      description: language === 'ar' 
        ? 'فشل رفع الصورة' 
        : 'Failed to upload image',
      variant: 'destructive'
    });
  };

  const handleBranchWarehouseConnection = () => {
    toast({
      title: language === 'ar' ? 'تحذير' : 'Warning',
      description: language === 'ar' 
        ? 'يرجى توصيل الفروع بالمستودعات من لوحة التحكم الرئيسية'
        : 'Please connect branches to warehouses from the main dashboard',
      variant: 'default'
    });
  };

  const getCurrentImage = () => {
    if (formData.imageUrl) {
      return formData.imageUrl;
    }
    return formData.imageId ? `/api/images/${formData.imageId}` : '';
  };

  const removeImage = () => {
    handleChange('imageId', undefined);
    handleChange('imageUrl', '');
    setUploadedImageIds([]);
    
    toast({
      title: language === 'ar' ? 'تم الحذف' : 'Removed',
      description: language === 'ar' ? 'تم إزالة الصورة' : 'Image removed',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
   
    
    if (!formData.name.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'اسم المنتج مطلوب' 
          : 'Product name is required',
        variant: 'destructive'
      });
      return;
    }
    
    if (!formData.sku.trim()) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' 
          ? 'SKU مطلوب' 
          : 'SKU is required',
        variant: 'destructive'
      });
      return;
    }
    
    const productFormData: ProductFormData = {
      ...formData,
      price: Number(formData.price) || 0,
      cost: Number(formData.cost) || 0,
      stock: Number(formData.stock) || 0,
      reorderPoint: Number(formData.reorderPoint) || 5,
    };

    try {
      await onSave(productFormData);
    } catch (error) {
      console.error('Error in form submission:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-4xl mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
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
            
            {(formData.imageUrl || formData.imageId) && (
              <div className="mb-4">
                <Label className="mb-2 block">
                  {language === 'ar' ? 'الصورة الحالية' : 'Current Image'}
                </Label>
                <div className="relative w-32 h-32 border-2 border-border rounded-lg overflow-hidden bg-muted/30">
                  {getCurrentImage() ? (
                    <>
                      <img 
                        src={getCurrentImage()} 
                        alt="Product" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML = 
                            '<div class="w-full h-full flex items-center justify-center"><ImageIcon class="w-10 h-10 text-muted-foreground" /></div>';
                        }}
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                      >
                        <X size={14} />
                      </button>
                      <a 
                        href={getCurrentImage()} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="absolute bottom-1 right-1 p-1 bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-10 h-10 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <FileUploader
              label={language === 'ar' ? 'رفع صورة جديدة' : 'Upload New Image'}
              onUploadSuccess={handleImageUploadSuccess}
              onUploadError={handleImageUploadError}
              multiple={false}
              accept="image/*"
              maxFiles={1}
              maxSize={5 * 1024 * 1024}
              preview={true}
              uniqueId="product-image-upload"
            />
            
            
            
            <p className="text-xs text-muted-foreground">
              {language === 'ar' 
                ? 'الحد الأقصى: 5 ميجابايت - الصيغ: JPG, PNG, GIF, WEBP. يمكنك رفع صورة أو إدخال رابط.'
                : 'Max: 5MB - Formats: JPG, PNG, GIF, WEBP. You can upload an image or enter a URL.'
              }
            </p>
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
           
            </div>
          </div>

          {/* SKU & Barcode */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{language === 'ar' ? 'التصنيف' : 'Category'}</Label>
              <Select 
                value={formData.categoryId || "none"} 
                onValueChange={(val) => handleChange('categoryId', val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر التصنيف' : 'Select category'} />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border z-50">
                  <SelectItem value="none">
                    {language === 'ar' ? 'بدون تصنيف' : 'No category'}
                  </SelectItem>
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
                  required
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{language === 'ar' ? 'سعر البيع' : 'Selling Price'}</Label>
              <Input
                type="number"
                value={formData.price === 0 ? '' : formData.price}
                onChange={(e) => handleNumberChange('price', e.target.value)}
                min={0}
                step="0.01"
                required
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'التكلفة' : 'Cost'}</Label>
              <Input
                type="number"
                value={formData.cost === 0 ? '' : formData.cost}
                onChange={(e) => handleNumberChange('cost', e.target.value)}
                min={0}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>{language === 'ar' ? 'حد إعادة الطلب' : 'Reorder Point'}</Label>
              <Input
                type="number"
                value={formData.reorderPoint === 0 ? '' : formData.reorderPoint}
                onChange={(e) => handleNumberChange('reorderPoint', e.target.value)}
                min={0}
                placeholder="5"
              />
            </div>
          </div>

         

          {/* Branches & Warehouses */}
        

        

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
              onVariantChange={(variants) => {
                console.log('🎯 Variants changed:', variants);
                handleChange('variants', variants);
              }}
              selectedSizes={formData.selectedSizes}
              selectedColors={formData.selectedColors}
              onSizeSelectionChange={(sizes) => {
                console.log('📏 Sizes selected:', sizes);
                handleChange('selectedSizes', sizes);
              }}
              onColorSelectionChange={(colors) => {
                console.log('🎨 Colors selected:', colors);
                handleChange('selectedColors', colors);
              }}
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
          <Button type="button" variant="outline" onClick={onClose}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
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