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
import { useQuery } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import api from '@/lib/api';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: ProductFormData) => void | Promise<void>;
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
  imageId?: number;
  imageUrl?: string;
  branchIds: string[];
  warehouseIds: string[];
  valuationMethod: 'fifo' | 'lifo' | 'weighted_average';
}

export const transformApiProductToFormData = (apiProduct: any): ProductFormData => {
  let imageUrl = '';
  let imageId: number | undefined;
  
  if (apiProduct.image) {
    if (typeof apiProduct.image === 'object') {
      imageId = apiProduct.image.id;
      imageUrl = apiProduct.image.fullUrl || apiProduct.image.previewUrl || '';
    } else if (typeof apiProduct.image === 'number') {
      imageId = apiProduct.image;
    }
  } else if (apiProduct.image_url) {
    imageUrl = apiProduct.image_url;
  } else if (apiProduct.imageUrl) {
    imageUrl = apiProduct.imageUrl;
  }

  // تحويل active (boolean) إلى status (string)
  const status = apiProduct.active === true ? 'active' : 'inactive';

  return {
    id: apiProduct.id?.toString(),
    name: apiProduct.name || '',
    nameAr: apiProduct.name_ar || apiProduct.name || '',
    description: apiProduct.description || '',
    descriptionAr: apiProduct.description_ar || '',
    sku: apiProduct.sku || '',
    barcode: apiProduct.barcode || '',
    categoryId: apiProduct.category?.id?.toString() || apiProduct.category_id?.toString() || '',
    price: Number(apiProduct.price) || 0,
    cost: Number(apiProduct.cost) || 0,
    hasVariants: apiProduct.has_variants || false,
    variants: [],
    selectedSizes: [],
    selectedColors: [],
    stock: Number(apiProduct.stock) || 0,
    reorderPoint: Number(apiProduct.reorder_level) || 5,
    status: status, // هنا التحويل المهم
    imageId,
    imageUrl,
    branchIds: apiProduct.branch_ids || [],
    warehouseIds: apiProduct.warehouse_ids || [],
    valuationMethod: apiProduct.valuation_method || 'fifo'
  };
};

const generateSKU = (): string => {
  const prefix = 'PROD';
  const randomNum = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}-${randomNum}`;
};

const generateBarcode = (): string => {
  return Math.floor(1000000000000 + Math.random() * 9000000000000).toString();
};

interface DbCategory {
  id: string | number; // يمكن أن يكون string أو number
  name: string;
  name_ar: string | null;
  parent_id: string | number | null;
  type?: string;
}

// تصحيح دالة flattenDbCategories
const flattenDbCategories = (categories: DbCategory[]): { id: string; name: string; nameAr: string }[] => {
  const result: { id: string; name: string; nameAr: string }[] = [];
  
  // Filter out categories without valid ID - تصحيح للرقم
  const validCategories = categories.filter(cat => {
    if (cat.id === undefined || cat.id === null) return false;
    
    // تحقق من أن الـ id ليس NaN أو فارغ
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
    
    // تأكد أن الـ id هو string
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
      // المقارنة كـ strings لضمان التوافق
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
  editProduct
}) => {
  const { language } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [uploadedImageIds, setUploadedImageIds] = useState<number[]>([]);
  const [imageUploadMethod, setImageUploadMethod] = useState<'url' | 'upload' | 'none'>('none');

  // Fetch categories
  const { data: dbCategories = [], isLoading: loadingCategories } = useQuery({
    queryKey: ['categories-for-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/category/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
      }
    },
    enabled: isOpen,
  });

  // Fetch branches
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['branches-for-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/branch/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching branches:', error);
        return [];
      }
    },
    enabled: isOpen,
  });

  // Fetch warehouses
  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses-for-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/warehouse/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching warehouses:', error);
        return [];
      }
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
    imageId: undefined,
    imageUrl: '',
    branchIds: [],
    warehouseIds: [],
    valuationMethod: 'fifo'
  });

  const [formData, setFormData] = useState<ProductFormData>(getInitialFormData());

  useEffect(() => {
    if (isOpen) {
      if (editProduct) {
        setFormData(editProduct);
        if (editProduct.imageId) {
          setImageUploadMethod('upload');
        } else if (editProduct.imageUrl) {
          setImageUploadMethod('url');
        } else {
          setImageUploadMethod('none');
        }
      } else {
        setFormData(getInitialFormData());
        setImageUploadMethod('none');
        setUploadedImageIds([]);
      }
    }
  }, [isOpen, editProduct]);

  const handleChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // دالة معالجة تغيير الـ Input للأرقام
  const handleNumberChange = (field: keyof ProductFormData, value: string) => {
    // إذا كانت القيمة فارغة، ضع 0
    if (value === '' || value === undefined || value === null) {
      handleChange(field, 0);
      return;
    }
    
    // تحقق من أن القيمة رقمية
    const numValue = parseFloat(value);
    
    // إذا كانت NaN، ضع 0
    if (isNaN(numValue)) {
      handleChange(field, 0);
    } else {
      handleChange(field, numValue);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'يرجى اختيار ملف صورة' : 'Please select an image file',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' : 'Image size must be less than 5MB',
        variant: 'destructive'
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/media', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      const imageData = response.data.data || response.data;
      const imageId = imageData.id;
      
      if (imageId) {
        setUploadedImageIds([imageId]);
        handleChange('imageId', imageId);
        handleChange('imageUrl', '');
        setImageUploadMethod('upload');
        
        toast({
          title: language === 'ar' ? 'تم الرفع بنجاح' : 'Upload successful',
          description: language === 'ar' ? 'تم رفع صورة المنتج' : 'Product image uploaded',
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image',
        variant: 'destructive'
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleUrlSubmit = () => {
    if (imageUrlInput.trim()) {
      handleChange('imageUrl', imageUrlInput.trim());
      handleChange('imageId', undefined);
      setImageUploadMethod('url');
      setUploadedImageIds([]);
      setImageUrlInput('');
      setShowUrlInput(false);
      
      toast({
        title: language === 'ar' ? 'تم الإضافة' : 'Added',
        description: language === 'ar' ? 'تم إضافة رابط الصورة' : 'Image URL added',
      });
    }
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
    setImageUploadMethod('none');
    setUploadedImageIds([]);
    
    toast({
      title: language === 'ar' ? 'تم الحذف' : 'Removed',
      description: language === 'ar' ? 'تم إزالة الصورة' : 'Image removed',
    });
  };

 const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const productData: any = {
    name: formData.name,
    name_ar: formData.nameAr,
    description: formData.description,
    description_ar: formData.descriptionAr,
    sku: formData.sku,
    barcode: formData.barcode,
    category_id: formData.categoryId || null,
    price: formData.price,
    cost: formData.cost,
    stock: formData.stock,
    reorder_level: formData.reorderPoint,
    active: formData.status === 'active', // تحويل من string إلى boolean
    has_variants: formData.hasVariants,
    branch_ids: formData.branchIds,
    warehouse_ids: formData.warehouseIds,
    valuation_method: formData.valuationMethod
  };

  if (formData.imageId) {
    productData.image = formData.imageId;
  } else if (formData.imageUrl) {
    productData.image_url = formData.imageUrl;
  }

  if (formData.id) {
    productData.id = formData.id;
  }

  try {
    await onSave(productData);
  } catch (error) {
    console.error('Error saving product:', error);
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
            <div className="flex gap-4 items-start">
              <div className="relative w-32 h-32 border-2 border-dashed border-border rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
                {getCurrentImage() ? (
                  <>
                    <img 
                      src={getCurrentImage()} 
                      alt="Product" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
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
                  <ImageIcon className="w-10 h-10 text-muted-foreground" />
                )}
              </div>
              
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
                    {language === 'ar' ? 'رفع صورة' : 'Upload Image'}
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
                
                {imageUploadMethod === 'upload' && formData.imageId && (
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' 
                      ? `تم رفع الصورة (ID: ${formData.imageId})`
                      : `Image uploaded (ID: ${formData.imageId})`
                    }
                  </p>
                )}
                
                {imageUploadMethod === 'url' && formData.imageUrl && (
                  <p className="text-xs text-muted-foreground truncate">
                    {language === 'ar' 
                      ? `رابط الصورة: ${formData.imageUrl.substring(0, 50)}...`
                      : `Image URL: ${formData.imageUrl.substring(0, 50)}...`
                    }
                  </p>
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

          {/* Pricing - التصحيح هنا لمنع NaN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{language === 'ar' ? 'سعر البيع' : 'Selling Price'}</Label>
              <Input
                type="number"
                value={formData.price === 0 ? '' : formData.price} // منع عرض 0
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
                value={formData.cost === 0 ? '' : formData.cost} // منع عرض 0
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
                value={formData.reorderPoint === 0 ? '' : formData.reorderPoint} // منع عرض 0
                onChange={(e) => handleNumberChange('reorderPoint', e.target.value)}
                min={0}
                placeholder="5"
              />
            </div>
          </div>

          {/* Stock Input */}
          <div>
            <Label>{language === 'ar' ? 'المخزون الابتدائي' : 'Initial Stock'}</Label>
            <Input
              type="number"
              value={formData.stock === 0 ? '' : formData.stock}
              onChange={(e) => handleNumberChange('stock', e.target.value)}
              min={0}
              placeholder="0"
              className="max-w-xs"
            />
          </div>

          {/* باقي الكود بدون تغيير */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">
                  {language === 'ar' ? 'الفروع والمستودعات' : 'Branches & Warehouses'}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleBranchWarehouseConnection}
                >
                  {language === 'ar' ? 'إدارة التوصيلات' : 'Manage Connections'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Branches */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Building2 size={16} className="text-primary" />
                    {language === 'ar' ? 'الفروع' : 'Branches'}
                  </Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-muted/30 rounded-lg border">
                    {loadingBranches ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : branches.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {language === 'ar' ? 'لا توجد فروع' : 'No branches available'}
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Checkbox
                            id="select-all-branches"
                            checked={formData.branchIds.length === branches.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleChange('branchIds', branches.map(b => b.id.toString()));
                              } else {
                                handleChange('branchIds', []);
                              }
                            }}
                          />
                          <label htmlFor="select-all-branches" className="text-sm font-medium cursor-pointer">
                            {language === 'ar' ? 'اختيار الكل' : 'Select All'}
                          </label>
                        </div>
                        {branches.map((branch) => (
                          <div key={branch.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`branch-${branch.id}`}
                              checked={formData.branchIds.includes(branch.id.toString())}
                              onCheckedChange={(checked) => {
                                const newBranchIds = checked
                                  ? [...formData.branchIds, branch.id.toString()]
                                  : formData.branchIds.filter(id => id !== branch.id.toString());
                                handleChange('branchIds', newBranchIds);
                              }}
                            />
                            <label htmlFor={`branch-${branch.id}`} className="text-sm cursor-pointer flex-1">
                              {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                            </label>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Warehouses */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <Warehouse size={16} className="text-primary" />
                    {language === 'ar' ? 'المستودعات' : 'Warehouses'}
                  </Label>
                  <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-muted/30 rounded-lg border">
                    {loadingWarehouses ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    ) : warehouses.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {language === 'ar' ? 'لا توجد مستودعات' : 'No warehouses available'}
                      </p>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 pb-2 border-b">
                          <Checkbox
                            id="select-all-warehouses"
                            checked={formData.warehouseIds.length === warehouses.length}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                handleChange('warehouseIds', warehouses.map(w => w.id.toString()));
                              } else {
                                handleChange('warehouseIds', []);
                              }
                            }}
                          />
                          <label htmlFor="select-all-warehouses" className="text-sm font-medium cursor-pointer">
                            {language === 'ar' ? 'اختيار الكل' : 'Select All'}
                          </label>
                        </div>
                        {warehouses.map((warehouse) => (
                          <div key={warehouse.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`warehouse-${warehouse.id}`}
                              checked={formData.warehouseIds.includes(warehouse.id.toString())}
                              onCheckedChange={(checked) => {
                                const newWarehouseIds = checked
                                  ? [...formData.warehouseIds, warehouse.id.toString()]
                                  : formData.warehouseIds.filter(id => id !== warehouse.id.toString());
                                handleChange('warehouseIds', newWarehouseIds);
                              }}
                            />
                            <label htmlFor={`warehouse-${warehouse.id}`} className="text-sm cursor-pointer flex-1">
                              {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                            </label>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Valuation Method */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <Label className="flex items-center gap-2 text-lg font-semibold">
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
              <p className="text-sm text-muted-foreground">
                {formData.valuationMethod === 'fifo' && (language === 'ar' 
                  ? 'أقدم المخزون يُباع أولاً - مناسب للبضائع سريعة التلف'
                  : 'Oldest inventory sold first - Suitable for perishable goods')}
                {formData.valuationMethod === 'lifo' && (language === 'ar' 
                  ? 'أحدث المخزون يُباع أولاً - مناسب للبضائع غير قابلة للتلف'
                  : 'Newest inventory sold first - Suitable for non-perishable goods')}
                {formData.valuationMethod === 'weighted_average' && (language === 'ar' 
                  ? 'متوسط تكلفة جميع الوحدات - يوفر استقرار في التكاليف'
                  : 'Average cost of all units - Provides cost stability')}
              </p>
            </CardContent>
          </Card>

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