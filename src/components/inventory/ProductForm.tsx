  import React, { useState, useRef, useEffect } from 'react';
  import { useLanguage } from '@/contexts/LanguageContext';
  import { useQuery } from '@tanstack/react-query';
  import { cn } from '@/lib/utils';
  import api from '@/lib/api';
  import { X, Barcode, RefreshCw, ImageIcon, Loader2, ExternalLink } from 'lucide-react';
  import { Button } from '@/components/ui/button';
  import { Input } from '@/components/ui/input';
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
  import VariantMatrix, { ProductVariant } from './VariantMatrix';
  import { toast } from '@/hooks/use-toast';
  import FileUploader from '@/components/FileUploader';

  interface UnitOption {
    id: string;
    name: string;
    nameAr: string;
    code: string;
  }

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
    main_unit_id: string;
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
    warehouseStocks?: Record<string, number>;
    valuationMethod: 'fifo' | 'lifo' | 'weighted_average';
  }

  const generateBarcode = (): string =>
    Math.floor(1000000000000 + Math.random() * 9000000000000).toString();

  const generateSKU = (): string => {
    const randomNum = Math.floor(Math.random() * 9000) + 1000;
    return `PROD-${randomNum}`;
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

    const validCategories = categories.filter(cat => {
      if (cat.id === undefined || cat.id === null) return false;
      if (typeof cat.id === 'number') return !isNaN(cat.id) && cat.id > 0;
      if (typeof cat.id === 'string') return cat.id.trim() !== '';
      return false;
    });

    const buildPath = (category: DbCategory, path: string = '', pathAr: string = ''): void => {
      const currentName = category.name || 'Unnamed';
      const currentNameAr = category.name_ar || currentName;
      const newPath = path ? `${currentName} > ${path}` : currentName;
      const newPathAr = pathAr ? `${currentNameAr} > ${pathAr}` : currentNameAr;
      result.push({ id: category.id.toString(), name: newPath, nameAr: newPathAr });
    };

    const mainCategories = validCategories.filter(cat => !cat.parent_id || cat.type === 'category');
    mainCategories.forEach(cat => buildPath(cat));

    const subCategories = validCategories.filter(cat => cat.parent_id && cat.type === 'sub_category');
    subCategories.forEach(subCat => {
      const parent = validCategories.find(cat => cat.id.toString() === subCat.parent_id?.toString());
      if (parent) buildPath(subCat, parent.name, parent.name_ar || parent.name);
      else buildPath(subCat);
    });

    return result.sort((a, b) => a.name.localeCompare(b.name));
  };

  const useUnitsForm = () =>
    useQuery({
      queryKey: ['units-product-form'],
      queryFn: async () => {
        try {
          const response = await api.post('/unit/index', {
            filters: {},
            orderBy: 'id',
            orderByDirection: 'asc',
            perPage: 100,
            paginate: false,
          });
          const units = response.data.data || [];
          return units.map((unit: any) => ({
            id: unit.id.toString(),
            name: unit.name,
            nameAr: unit.name_ar || unit.name,
            code: unit.code,
          }));
        } catch (error) {
          console.error('Error fetching units:', error);
          return [];
        }
      },
    });

  const ProductForm: React.FC<ProductFormProps> = ({
    isOpen,
    onClose,
    onSave,
    editProduct,
    warehouses = [],
    categories = [],
    isLoadingWarehouses = false,
    isLoadingCategories = false,
  }) => {
    const { language } = useLanguage();
    const [uploadedImageIds, setUploadedImageIds] = useState<number[]>([]);

    const flatCategories = flattenDbCategories(categories || []);

    const getInitialFormData = (): ProductFormData => ({
      name: '',
      nameAr: '',
      description: '',
      descriptionAr: '',
      sku: generateSKU(),
      barcode: generateBarcode(),
      categoryId: '',
      main_unit_id: '',
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
      warehouseStocks: {},
      valuationMethod: 'fifo',
    });

    const { data: unitsData = [] } = useUnitsForm();
    const [formData, setFormData] = useState<ProductFormData>(getInitialFormData());
    const lastLoadedProductId = useRef<string | null>(null);

    // ✅ تحميل بيانات المنتج عند فتح الفورم
    useEffect(() => {
      if (!isOpen) {
        lastLoadedProductId.current = null;
        return;
      }

      const currentId = editProduct?.id ?? '__new__';
      if (lastLoadedProductId.current === currentId) return;
      lastLoadedProductId.current = currentId;

      if (editProduct) {
        // ✅ Normalize warehouseStocks و warehouseIds
        const safeStocks: Record<string, number> = {};
        const rawStocks = editProduct.warehouseStocks || {};
        Object.entries(rawStocks).forEach(([id, val]) => {
          safeStocks[String(id)] = Number(val) || 0;
        });

        const safeIds = Array.isArray(editProduct.warehouseIds)
          ? editProduct.warehouseIds.map(String)
          : Object.keys(safeStocks);

        setFormData({
          ...editProduct,
          price: Number(editProduct.price) || 0,
          cost: Number(editProduct.cost) || 0,
          stock: Number(editProduct.stock) || 0,
          reorderPoint: Number(editProduct.reorderPoint) || 5,
          warehouseIds: safeIds,
          warehouseStocks: safeStocks,
        });
      } else {
        setFormData(getInitialFormData());
      }
    }, [isOpen, editProduct?.id]);

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
      handleChange(field, isNaN(numValue) ? 0 : numValue);
    };

    const handleImageUploadSuccess = (ids: number[]) => {
      setUploadedImageIds(ids);
      if (ids.length > 0) {
        handleChange('imageId', ids[0]);
        handleChange('imageUrl', '');
      }
      toast({
        title: language === 'ar' ? 'تم الرفع بنجاح' : 'Upload successful',
        description: language === 'ar' ? `تم رفع ${ids.length} صورة` : `${ids.length} image(s) uploaded`,
      });
    };

    const handleImageUploadError = () => {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image',
        variant: 'destructive',
      });
    };

    const getCurrentImage = () => formData.imageUrl || (formData.imageId ? `/api/images/${formData.imageId}` : '');

    const removeImage = () => {
      handleChange('imageId', undefined);
      handleChange('imageUrl', '');
      setUploadedImageIds([]);
      toast({ title: language === 'ar' ? 'تم الحذف' : 'Removed' });
    };

    // ✅ إجمالي المخزون من كل المخازن
    const totalStock = formData.warehouseIds.reduce(
      (sum, id) => sum + Number(formData.warehouseStocks?.[id] || 0),
      0
    );

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (!formData.name.trim()) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'اسم المنتج مطلوب' : 'Product name is required',
          variant: 'destructive',
        });
        return;
      }

      if (!formData.sku.trim()) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'SKU مطلوب' : 'SKU is required',
          variant: 'destructive',
        });
        return;
      }

      if (formData.warehouseIds.length === 0) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar'
            ? 'يجب اختيار مخزن واحد على الأقل'
            : 'Please select at least one warehouse',
          variant: 'destructive',
        });
        return;
      }

      // ✅ تنبيه بس (مش منع) لو كل الكميات 0
      if (totalStock === 0) {
        const confirmed = window.confirm(
          language === 'ar'
            ? 'كل المخازن المختارة بكمية 0. هل تريد الحفظ على أي حال؟'
            : 'All selected warehouses have 0 quantity. Save anyway?'
        );
        if (!confirmed) return;
      }

      const productFormData: ProductFormData = {
        ...formData,
        price: Number(formData.price) || 0,
        cost: Number(formData.cost) || 0,
        stock: totalStock, // ✅ دايماً مجموع المخازن
        reorderPoint: Number(formData.reorderPoint) || 5,
      };

      try {
        const payload = {
          ...productFormData,

          // Laravel expects snake_case
          warehouse_ids: productFormData.warehouseIds.map(Number),

          warehouse_stocks: Object.fromEntries(
            productFormData.warehouseIds.map((id) => [
              Number(id),
              Number(productFormData.warehouseStocks?.[id] ?? 0),
            ])
          ),

          stock: totalStock,
        };

        console.log('PRODUCT SAVE PAYLOAD:', payload);

        await onSave(payload as ProductFormData);

      } catch (error: any) {
        console.error('PRODUCT SAVE ERROR:', {
          status: error.response?.status,
          response: error.response?.data,
          message: error.message,
        });
      }
    };

    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-4xl mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
            <h2 className="text-xl font-bold text-foreground">
              {editProduct
                ? language === 'ar' ? 'تعديل المنتج' : 'Edit Product'
                : language === 'ar' ? 'إضافة منتج جديد' : 'Add New Product'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
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
                preview
                uniqueId="product-image-upload"
              />
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label>{language === 'ar' ? 'اسم المنتج' : 'Product Name'}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Product name"
                  required
                />
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

            {/* Category / Unit / SKU */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{language === 'ar' ? 'التصنيف' : 'Category'}</Label>
                <Select
                  value={formData.categoryId || 'none'}
                  onValueChange={(val) => handleChange('categoryId', val === 'none' ? '' : val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر التصنيف' : 'Select category'} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border border-border z-50">
                    <SelectItem value="none">{language === 'ar' ? 'بدون تصنيف' : 'No category'}</SelectItem>
                    {flatCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {language === 'ar' ? cat.nameAr : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'ar' ? 'الوحدة الرئيسية' : 'Main Unit'}</Label>
                <Select
                  value={formData.main_unit_id}
                  onValueChange={(val) => handleChange('main_unit_id', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر الوحدة' : 'Select unit'} />
                  </SelectTrigger>
                  <SelectContent>
                    {unitsData.map((unit: UnitOption) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {language === 'ar' ? unit.nameAr : unit.name} ({unit.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>SKU</Label>
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

            {/* Warehouses */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">
                  {language === 'ar' ? 'المخازن والكميات' : 'Warehouses & quantities'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar'
                    ? 'اختر أكثر من مخزن، وحدد كمية افتتاحية مستقلة لكل مخزن.'
                    : 'Select multiple warehouses and set an independent opening quantity for each one.'}
                </p>
              </div>

              {isLoadingWarehouses ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {language === 'ar' ? 'جاري تحميل المخازن...' : 'Loading warehouses...'}
                </div>
              ) : warehouses.length === 0 ? (
                <p className="text-sm text-destructive">
                  {language === 'ar'
                    ? 'لا توجد مخازن متاحة لهذا الحساب.'
                    : 'No warehouses available for this workspace.'}
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {warehouses.map((warehouse: any) => {
                    const id = String(warehouse.id);
                    const selected = formData.warehouseIds.includes(id);

                    return (
                      <div
                        key={id}
                        className={cn(
                          'flex items-center gap-3 rounded-md border p-3',
                          selected && 'border-primary bg-primary/5'
                        )}
                      >
                        <Checkbox
                          checked={selected}
                          onCheckedChange={(checked) => {
                            setFormData(prev => {
                              const nextIds = checked
                                ? Array.from(new Set([...prev.warehouseIds, id]))
                                : prev.warehouseIds.filter(item => item !== id);

                              const nextStocks = { ...(prev.warehouseStocks || {}) };
                              if (checked) {
                                if (nextStocks[id] === undefined) nextStocks[id] = 0;
                              } else {
                                nextStocks[id] = 0;
                              }

                              return { ...prev, warehouseIds: nextIds, warehouseStocks: nextStocks };
                            });
                          }}
                        />

                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{warehouse.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {warehouse.branch?.name ||
                              warehouse.branch_name ||
                              (warehouse.branch_id ? `Branch #${warehouse.branch_id}` : '')}
                          </p>
                        </div>

                        <Input
                          className="w-28"
                          type="number"
                          min="0"
                          step="0.001"
                          disabled={!selected}
                          value={formData.warehouseStocks?.[id] ?? ''}
                          onChange={(event) => {
                            const rawValue = event.target.value;
                            setFormData(prev => ({
                              ...prev,
                              warehouseStocks: {
                                ...(prev.warehouseStocks || {}),
                                [id]: rawValue === '' ? 0 : Number(rawValue),
                              },
                            }));
                          }}
                          placeholder="0"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ✅ عرض إجمالي المخزون */}
              {formData.warehouseIds.length > 0 && (
                <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">
                    {language === 'ar' ? 'إجمالي المخزون الافتتاحي' : 'Total opening stock'}
                  </span>
                  <span className="font-semibold text-foreground">{totalStock}</span>
                </div>
              )}
            </div>

            {/* Variants */}
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
                    ? language === 'ar' ? 'المنتج متاح للبيع' : 'Product is available for sale'
                    : language === 'ar' ? 'المنتج غير متاح' : 'Product is not available'}
                </p>
              </div>
              <Switch
                checked={formData.status === 'active'}
                onCheckedChange={(checked) => handleChange('status', checked ? 'active' : 'inactive')}
              />
            </div>
          </form>

          <div className="flex items-center justify-end gap-3 p-4 border-t border-border bg-muted/30">
            <Button type="button" variant="outline" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button type="submit" onClick={handleSubmit} className="bg-primary hover:bg-primary/90">
              {editProduct
                ? language === 'ar' ? 'حفظ التغييرات' : 'Save Changes'
                : language === 'ar' ? 'إضافة المنتج' : 'Add Product'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  export default ProductForm;