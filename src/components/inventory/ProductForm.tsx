  import React, { useState, useRef, useEffect } from 'react';
  import { useLanguage } from '@/contexts/LanguageContext';
  import { useQuery } from '@tanstack/react-query';
  import { cn } from '@/lib/utils';
  import api from '@/lib/api';
  import { X, Barcode, RefreshCw, ImageIcon, Loader2, ExternalLink, Plus, Tag, Trash2, Ruler } from 'lucide-react';
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

  interface BranchOption {
    id: string | number;
    name?: string;
    name_ar?: string;
  }

  interface WarehouseOption {
    id: string | number;
    name?: string;
    branch_id?: string | number | BranchOption | null;
    branch?: BranchOption | null;
    branch_name?: string;
    branch_name_ar?: string;
  }

  export interface ProductPriceTier {
    price_type: 'retail' | 'wholesale' | 'credit';
    min_quantity: number;
    price: number;
    unit_id?: string;
    color_id?: string;
  }

  interface ProductFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: ProductFormData) => void | Promise<void>;
    editProduct?: ProductFormData | null;
    branches?: BranchOption[];
    warehouses?: WarehouseOption[];
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
    branchPrices?: Record<string, number>;
    warehouseIds: string[];
    warehouseStocks?: Record<string, number>;
    valuationMethod: 'fifo' | 'lifo' | 'weighted_average';
    product_type: 'good' | 'service' | 'material' | 'semi_finished' | 'finished';
    package_size: number | null;
    package_unit: string;
    package_cost: number | null;
    stock_unit: string;
    base_unit: string;
    conversion_factor: number;
    tracking: 'none' | 'lot' | 'serial';
    dimensions: { width?: number; height?: number; depth?: number; unit: string };
    priceTiers: ProductPriceTier[];
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

  const useColorsForm = () =>
    useQuery({
      queryKey: ['colors-product-form'],
      queryFn: async () => {
        const response = await api.post('/color/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false,
        });
        return (response.data.data || []).map((color: any) => ({
          id: String(color.id),
          name: color.name,
        }));
      },
    });

  const ProductForm: React.FC<ProductFormProps> = ({
    isOpen,
    onClose,
    onSave,
    editProduct,
    branches = [],
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
      branchPrices: {},
      warehouseIds: [],
      warehouseStocks: {},
      valuationMethod: 'fifo',
      product_type: 'good',
      package_size: 1,
      package_unit: 'piece',
      package_cost: 0,
      stock_unit: 'piece',
      base_unit: 'piece',
      conversion_factor: 1,
      tracking: 'none',
      dimensions: { unit: 'cm' },
      priceTiers: [],
    });

    const { data: unitsData = [] } = useUnitsForm();
    const { data: colorsData = [], isError: colorsError } = useColorsForm();
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
        const safeBranchPrices: Record<string, number> = {};
        const rawStocks = editProduct.warehouseStocks || {};
        Object.entries(rawStocks).forEach(([id, val]) => {
          safeStocks[String(id)] = Number(val) || 0;
        });
        Object.entries(editProduct.branchPrices || {}).forEach(([id, val]) => {
          safeBranchPrices[String(id)] = Number(val) || 0;
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
          branchPrices: safeBranchPrices,
          warehouseIds: safeIds,
          warehouseStocks: safeStocks,
          product_type: editProduct.product_type || 'good',
          package_size: Number(editProduct.package_size) || 1,
          package_unit: editProduct.package_unit || editProduct.base_unit || editProduct.stock_unit || 'piece',
          package_cost: Number(editProduct.package_cost) || (Number(editProduct.cost) || 0) * (Number(editProduct.package_size) || 1),
          stock_unit: editProduct.stock_unit || '',
          base_unit: editProduct.base_unit || '',
          conversion_factor: Number(editProduct.conversion_factor) || 1,
          tracking: editProduct.tracking || 'none',
          dimensions: editProduct.dimensions || { unit: 'cm' },
          priceTiers: (editProduct.priceTiers || []).map((tier) => ({
            ...tier,
            min_quantity: Number(tier.min_quantity) || 1,
            price: Number(tier.price) || 0,
            unit_id: tier.unit_id ? String(tier.unit_id) : '',
            color_id: tier.color_id ? String(tier.color_id) : '',
          })),
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

    const getWarehouseBranchId = (warehouse: any): string => {
      const branchObject = warehouse?.branch && typeof warehouse.branch === 'object' ? warehouse.branch : null;
      const rawBranchId = warehouse?.branch_id;
      const branchIdObject = rawBranchId && typeof rawBranchId === 'object' ? rawBranchId : null;
      const candidate = branchObject?.id ?? branchIdObject?.id ?? rawBranchId;
      const normalizedCandidate = candidate && typeof candidate === 'object' ? candidate.id : candidate;
      const id = Number(normalizedCandidate);
      return Number.isSafeInteger(id) && id > 0 ? String(id) : '';
    };

    const branchPriceBranchIds = Array.from(new Set([
      ...warehouses.map(getWarehouseBranchId),
      ...(formData.branchIds || []).map(String),
      ...Object.keys(formData.branchPrices || {}),
    ].filter((id) => /^\d+$/.test(id) && Number(id) > 0))).sort((a, b) => Number(a) - Number(b));

    const getBranchLabel = (branchId: string): string => {
      const branch = branches.find((item) => String(item.id) === branchId);
      const warehouse = warehouses.find((item) => getWarehouseBranchId(item) === branchId);
      const warehouseBranch = warehouse?.branch;
      const rawWarehouseBranch = warehouse?.branch_id;
      const warehouseBranchObject = rawWarehouseBranch && typeof rawWarehouseBranch === 'object'
        ? rawWarehouseBranch
        : null;
      const name = branch?.name || warehouseBranch?.name || warehouseBranchObject?.name || warehouse?.branch_name;
      const nameAr = branch?.name_ar || warehouseBranch?.name_ar || warehouseBranchObject?.name_ar || warehouse?.branch_name_ar;
      return language === 'ar'
        ? nameAr || name || `فرع #${branchId}`
        : name || nameAr || `Branch #${branchId}`;
    };

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

      // ✅ تنبيه بس (مش منع) لو كل الكميات 0
      if (formData.warehouseIds.length > 0 && totalStock === 0) {
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
        cost: formData.product_type === 'material'
          ? Number((((Number(formData.package_cost) || 0) / (Number(formData.package_size) || 1)).toFixed(2)))
          : Number(formData.cost) || 0,
        stock: totalStock, // ✅ دايماً مجموع المخازن
        reorderPoint: formData.product_type === 'material'
          ? Number(formData.reorderPoint) || 0
          : Number(formData.reorderPoint) || 5,
        package_size: formData.product_type === 'material' ? Number(formData.package_size) || 1 : null,
        package_unit: formData.product_type === 'material' ? formData.package_unit : '',
        package_cost: formData.product_type === 'material' ? Number(formData.package_cost) || 0 : null,
      };

      try {
        const payload = {
          ...productFormData,
          product_type: productFormData.product_type,
          stock_unit: productFormData.stock_unit || null,
          base_unit: productFormData.base_unit || null,
          conversion_factor: Number(productFormData.conversion_factor) || 1,
          tracking: productFormData.tracking,
          dimensions: productFormData.dimensions,

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

        <div className="relative w-full max-w-6xl mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-5 border-b border-border bg-gradient-to-l from-primary/10 via-muted/30 to-background">
            <div>
              <p className="text-xs font-medium text-primary">{language === 'ar' ? 'إدارة المخزون' : 'Inventory management'}</p>
              <h2 className="mt-1 text-xl font-bold text-foreground">
              {editProduct
                ? formData.product_type === 'material'
                  ? language === 'ar' ? 'تعديل الخامة' : 'Edit Material'
                  : language === 'ar' ? 'تعديل المنتج' : 'Edit Product'
                : formData.product_type === 'material'
                  ? language === 'ar' ? 'إضافة خامة جديدة' : 'Add New Material'
                  : language === 'ar' ? 'إضافة منتج جديد' : 'Add New Product'}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-190px)] overflow-y-auto">
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
                <Label>{language === 'ar'
                  ? formData.product_type === 'material' ? 'اسم الخامة' : 'اسم المنتج'
                  : formData.product_type === 'material' ? 'Material name' : 'Product Name'}</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="Product name"
                  required
                />
              </div>
              {formData.product_type === 'material' && (
                <div>
                  <Label>{language === 'ar' ? 'وصف الخامة' : 'Material description'}</Label>
                  <Input
                    value={formData.description}
                    onChange={(event) => handleChange('description', event.target.value)}
                    placeholder={language === 'ar' ? 'ملاحظات أو مواصفات الخامة' : 'Material notes or specifications'}
                  />
                </div>
              )}
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

            <div className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary"><Ruler size={18} /></div>
                <div>
                  <p className="font-semibold text-foreground">
                    {language === 'ar'
                      ? formData.product_type === 'material' ? 'تفاصيل الخامة ووحداتها' : 'الوحدات والمتغيرات والأبعاد'
                      : formData.product_type === 'material' ? 'Material details & units' : 'Units, variants & dimensions'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {language === 'ar'
                      ? formData.product_type === 'material'
                        ? 'حدد وحدة التخزين والاستخدام، بيانات العبوة، وتكلفة الوحدة وحد التنبيه.'
                        : 'حدد وحدة التخزين والبيع، ومعامل التحويل وأبعاد المنتج.'
                      : formData.product_type === 'material'
                        ? 'Set stock and usage units, package details, unit cost, and low-stock alert.'
                        : 'Set stock and sales units, conversion, and product dimensions.'}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>{language === 'ar' ? 'نوع المنتج' : 'Product type'}</Label>
                  <Select
                    value={formData.product_type}
                    onValueChange={(value: ProductFormData['product_type']) => {
                      if (value === 'material' && formData.product_type !== 'material') {
                        setFormData((previous) => ({
                          ...previous,
                          product_type: value,
                          package_size: previous.package_size || previous.conversion_factor || 1,
                          package_unit: previous.package_unit || previous.base_unit || previous.stock_unit || 'piece',
                          package_cost: previous.package_cost || previous.cost * (previous.package_size || 1),
                        }));
                        return;
                      }
                      handleChange('product_type', value);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="good">{language === 'ar' ? 'منتج' : 'Good'}</SelectItem>
                      <SelectItem value="material">{language === 'ar' ? 'خامة' : 'Material'}</SelectItem>
                      <SelectItem value="semi_finished">{language === 'ar' ? 'نصف مصنع' : 'Semi-finished'}</SelectItem>
                      <SelectItem value="finished">{language === 'ar' ? 'منتج تام' : 'Finished product'}</SelectItem>
                      <SelectItem value="service">{language === 'ar' ? 'خدمة' : 'Service'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar'
                    ? formData.product_type === 'material' ? 'وحدة التخزين' : 'وحدة المخزون'
                    : formData.product_type === 'material' ? 'Inventory unit' : 'Stock unit'}</Label>
                  <Select value={formData.stock_unit || 'piece'} onValueChange={(value) => handleChange('stock_unit', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">{language === 'ar' ? 'قطعة' : 'Piece'}</SelectItem>
                      <SelectItem value="service">{language === 'ar' ? 'خدمة' : 'Service'}</SelectItem>
                      <SelectItem value="m">{language === 'ar' ? 'متر' : 'Meter'}</SelectItem>
                      <SelectItem value="m2">{language === 'ar' ? 'متر مربع' : 'Square meter'}</SelectItem>
                      <SelectItem value="m3">{language === 'ar' ? 'متر مكعب' : 'Cubic meter'}</SelectItem>
                      {unitsData.map((unit: UnitOption) => (
                        <SelectItem key={unit.id} value={unit.code}>
                          {language === 'ar' ? unit.nameAr : unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>{language === 'ar'
                    ? formData.product_type === 'material' ? 'وحدة الاستخدام الأساسية' : 'وحدة البيع/القياس'
                    : formData.product_type === 'material' ? 'Base usage unit' : 'Sales / measure unit'}</Label>
                  <Select value={formData.base_unit || formData.stock_unit || 'piece'} onValueChange={(value) => handleChange('base_unit', value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">{language === 'ar' ? 'قطعة' : 'Piece'}</SelectItem>
                      <SelectItem value="service">{language === 'ar' ? 'خدمة' : 'Service'}</SelectItem>
                      <SelectItem value="m">{language === 'ar' ? 'متر' : 'Meter'}</SelectItem>
                      <SelectItem value="m2">{language === 'ar' ? 'متر مربع' : 'Square meter'}</SelectItem>
                      <SelectItem value="m3">{language === 'ar' ? 'متر مكعب' : 'Cubic meter'}</SelectItem>
                      {unitsData.map((unit: UnitOption) => (
                        <SelectItem key={unit.id} value={unit.code}>
                          {language === 'ar' ? unit.nameAr : unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {formData.product_type === 'material' && (
                <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {language === 'ar' ? 'بيانات العبوة والتكلفة' : 'Package & cost details'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar'
                        ? 'تكلفة الوحدة الأساسية تُحسب تلقائيًا من تكلفة العبوة وحجمها.'
                        : 'Base-unit cost is calculated from package cost and package size.'}
                    </p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <Label>{language === 'ar' ? 'حجم العبوة' : 'Package size'}</Label>
                      <Input
                        type="number"
                        min="0.000001"
                        step="0.001"
                        required
                        value={formData.package_size ?? ''}
                        onChange={(event) => handleNumberChange('package_size', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{language === 'ar' ? 'وحدة العبوة' : 'Package unit'}</Label>
                      <Select value={formData.package_unit || 'piece'} onValueChange={(value) => handleChange('package_unit', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from(new Map<string, string>([
                            ...['piece', 'L', 'ML', 'KG', 'G'].map((code) => [code, code] as const),
                            ...unitsData.map((unit: UnitOption) => [unit.code, language === 'ar' ? unit.nameAr : unit.name] as const),
                          ]).entries()).map(([code, label]) => (
                            <SelectItem key={code} value={code}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>{language === 'ar' ? 'تكلفة العبوة' : 'Package cost'}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={formData.package_cost ?? ''}
                        onChange={(event) => handleNumberChange('package_cost', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>{language === 'ar' ? 'حد تنبيه المخزون' : 'Low-stock alert'}</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={formData.reorderPoint}
                        onChange={(event) => handleNumberChange('reorderPoint', event.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {language === 'ar' ? 'تكلفة الوحدة الأساسية:' : 'Base-unit cost:'}{' '}
                    {((Number(formData.package_cost) || 0) / (Number(formData.package_size) || 1)).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 6 })}
                  </p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <Label>{language === 'ar'
                    ? formData.product_type === 'material' ? 'معامل تحويل وحدة الاستخدام' : 'عدد وحدات المخزون في وحدة القياس'
                    : formData.product_type === 'material' ? 'Usage-unit conversion factor' : 'Stock units per measure unit'}</Label>
                  <Input type="number" min="0.000001" step="0.000001" value={formData.conversion_factor} onChange={(event) => handleNumberChange('conversion_factor', event.target.value)} />
                </div>
                {formData.product_type !== 'material' && (['width', 'height', 'depth'] as const).map((dimension) => (
                  <div key={dimension}>
                    <Label>{language === 'ar' ? ({ width: 'العرض', height: 'الارتفاع', depth: 'العمق' }[dimension]) : dimension}</Label>
                    <Input type="number" min="0" step="0.001" value={formData.dimensions[dimension] ?? ''} onChange={(event) => handleChange('dimensions', { ...formData.dimensions, [dimension]: event.target.value === '' ? undefined : Number(event.target.value) })} />
                  </div>
                ))}
                {formData.product_type !== 'material' && <div>
                  <Label>{language === 'ar' ? 'وحدة الأبعاد' : 'Dimension unit'}</Label>
                  <Select value={formData.dimensions.unit || 'cm'} onValueChange={(value) => handleChange('dimensions', { ...formData.dimensions, unit: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mm">mm</SelectItem>
                      <SelectItem value="cm">cm</SelectItem>
                      <SelectItem value="m">m</SelectItem>
                      <SelectItem value="in">in</SelectItem>
                    </SelectContent>
                  </Select>
                </div>}
              </div>
            </div>

            {/* Pricing */}
            {formData.product_type !== 'material' && <div className="space-y-5 rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600"><Tag size={18} /></div>
                <div>
                  <p className="font-semibold text-foreground">{language === 'ar' ? 'الأسعار حسب نوع البيع والكمية' : 'Prices by sales type and quantity'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{language === 'ar' ? 'السعر الأساسي للتجزئة، ويمكن إضافة سعر جملة أو آجل حسب الوحدة واللون والحد الأدنى للكمية.' : 'Base price is retail. Add wholesale or credit prices by unit, color, and minimum quantity.'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <Label>{language === 'ar' ? 'سعر التجزئة الأساسي' : 'Base retail price'}</Label>
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
              <div className="space-y-3 border-t border-border pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-medium">{language === 'ar' ? 'شرائح الأسعار' : 'Price tiers'}</p>
                      <p className="text-xs text-muted-foreground">{language === 'ar' ? 'يُطبق السعر على الكمية المحددة أو أكثر، ويمكن تخصيصه لوحدة أو لون.' : 'Each tier applies at its minimum quantity and can target a unit or color.'}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleChange('priceTiers', [
                        ...formData.priceTiers,
                        { price_type: 'wholesale', min_quantity: 10, price: 0, unit_id: '', color_id: '' },
                      ])}
                    >
                      <Plus className="me-2 h-4 w-4" />
                      {language === 'ar' ? 'إضافة سعر' : 'Add price'}
                    </Button>
                  </div>
                  {colorsError && (
                    <p role="alert" className="text-sm text-destructive">
                      {language === 'ar' ? 'تعذر تحميل الألوان؛ أعد المحاولة قبل اختيار لون.' : 'Colors could not be loaded. Retry before assigning a color.'}
                    </p>
                  )}
                  {formData.priceTiers.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                      {language === 'ar' ? 'لا توجد أسعار إضافية. أضف سعر جملة أو آجل عند الحاجة.' : 'No additional prices. Add wholesale or credit pricing when needed.'}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.priceTiers.map((tier, index) => (
                        <div key={`${index}-${tier.price_type}`} className="grid gap-3 rounded-lg border border-border bg-muted/20 p-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]">
                          <div>
                            <Label>{language === 'ar' ? 'نوع السعر' : 'Price type'}</Label>
                            <Select
                              value={tier.price_type}
                              onValueChange={(value: ProductPriceTier['price_type']) => {
                                const priceTiers = [...formData.priceTiers];
                                priceTiers[index] = { ...tier, price_type: value };
                                handleChange('priceTiers', priceTiers);
                              }}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="retail">{language === 'ar' ? 'قطاعي' : 'Retail'}</SelectItem>
                                <SelectItem value="wholesale">{language === 'ar' ? 'جملة' : 'Wholesale'}</SelectItem>
                                <SelectItem value="credit">{language === 'ar' ? 'آجل' : 'Credit'}</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>{language === 'ar' ? 'الكمية من' : 'Quantity from'}</Label>
                            <Input type="number" min="0.000001" step="0.001" value={tier.min_quantity} onChange={(event) => {
                              const priceTiers = [...formData.priceTiers];
                              priceTiers[index] = { ...tier, min_quantity: Number(event.target.value) || 1 };
                              handleChange('priceTiers', priceTiers);
                            }} />
                          </div>
                          <div>
                            <Label>{language === 'ar' ? 'السعر' : 'Price'}</Label>
                            <Input type="number" min="0" step="0.01" value={tier.price || ''} onChange={(event) => {
                              const priceTiers = [...formData.priceTiers];
                              priceTiers[index] = { ...tier, price: Number(event.target.value) || 0 };
                              handleChange('priceTiers', priceTiers);
                            }} />
                          </div>
                          <div>
                            <Label>{language === 'ar' ? 'الوحدة' : 'Unit'}</Label>
                            <Select value={tier.unit_id || 'all'} onValueChange={(value) => {
                              const priceTiers = [...formData.priceTiers];
                              priceTiers[index] = { ...tier, unit_id: value === 'all' ? '' : value };
                              handleChange('priceTiers', priceTiers);
                            }}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{language === 'ar' ? 'كل الوحدات' : 'All units'}</SelectItem>
                                {unitsData.map((unit: UnitOption) => <SelectItem key={unit.id} value={unit.id}>{language === 'ar' ? unit.nameAr : unit.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>{language === 'ar' ? 'اللون' : 'Color'}</Label>
                            <Select value={tier.color_id || 'all'} onValueChange={(value) => {
                              const priceTiers = [...formData.priceTiers];
                              priceTiers[index] = { ...tier, color_id: value === 'all' ? '' : value };
                              handleChange('priceTiers', priceTiers);
                            }}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">{language === 'ar' ? 'كل الألوان' : 'All colors'}</SelectItem>
                                {colorsData.map((color: { id: string; name: string }) => <SelectItem key={color.id} value={color.id}>{color.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-end">
                            <Button type="button" variant="ghost" size="icon" aria-label={language === 'ar' ? 'حذف السعر' : 'Remove price'} onClick={() => handleChange('priceTiers', formData.priceTiers.filter((_, tierIndex) => tierIndex !== index))}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>}

            {/* Warehouses */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div>
                <p className="font-medium text-foreground">
                  {language === 'ar' ? 'المخازن والكميات' : 'Warehouses & quantities'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar'
                    ? 'اختيار المخزن اختياري؛ عند تركه فارغًا سيُربط المنتج تلقائيًا بمخزن الفرع الحالي.'
                    : 'Warehouse selection is optional. If left empty, the product is linked to the current branch warehouse automatically.'}
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
                  {warehouses.map((warehouse) => {
                    const id = String(warehouse.id);
                    const selected = formData.warehouseIds.includes(id);
                    const branchObject = warehouse.branch && typeof warehouse.branch === 'object' ? warehouse.branch : null;
                    const rawBranchId = warehouse.branch_id;
                    const branchIdObject = rawBranchId && typeof rawBranchId === 'object' ? rawBranchId : null;
                    const branchId = getWarehouseBranchId(warehouse);
                    const branchFromList = branches.find((item) => String(item.id) === branchId);
                    const branchName = language === 'ar'
                      ? branchObject?.name_ar || branchIdObject?.name_ar || warehouse.branch_name_ar || branchFromList?.name_ar || branchObject?.name || branchIdObject?.name || warehouse.branch_name || branchFromList?.name || (branchId ? `فرع #${branchId}` : '')
                      : branchObject?.name || branchIdObject?.name || warehouse.branch_name || branchFromList?.name || branchObject?.name_ar || branchIdObject?.name_ar || warehouse.branch_name_ar || branchFromList?.name_ar || (branchId ? `Branch #${branchId}` : '');

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
                            {branchName}
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

              {formData.product_type !== 'material' && branchPriceBranchIds.length > 0 && (
                <div className="space-y-3 border-t border-border pt-4">
                  <div>
                    <p className="font-medium text-foreground">
                      {language === 'ar' ? 'سعر البيع حسب الفرع' : 'Selling price by branch'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar'
                        ? 'السعر الفارغ أو 0 يستخدم سعر المنتج الأساسي. أدخل سعرًا خاصًا للفرع عند الحاجة.'
                        : 'Blank or 0 uses the product base price. Enter a branch-specific price only when needed.'}
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {branchPriceBranchIds.map((branchId) => {
                      const branchPrice = Number(formData.branchPrices?.[branchId] ?? 0);
                      const effectivePrice = branchPrice > 0 ? branchPrice : Number(formData.price || 0);
                      return (
                        <div key={branchId} className="flex items-center gap-3 rounded-md border p-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{getBranchLabel(branchId)}</p>
                            <p className="text-xs text-muted-foreground">
                              {language === 'ar'
                                ? `السعر الفعلي: ${effectivePrice.toLocaleString()}${branchPrice > 0 ? ' (سعر خاص)' : ' (سعر المنتج الأساسي)'}`
                                : `Effective price: ${effectivePrice.toLocaleString()}${branchPrice > 0 ? ' (branch price)' : ' (base price)'}`}
                            </p>
                          </div>
                          <div className="w-32">
                            <Label className="text-xs">{language === 'ar' ? 'سعر خاص' : 'Override'}</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={branchPrice > 0 ? branchPrice : ''}
                              placeholder={String(formData.price || 0)}
                              onChange={(event) => {
                                const rawValue = event.target.value;
                                setFormData((prev) => ({
                                  ...prev,
                                  branchPrices: {
                                    ...(prev.branchPrices || {}),
                                    [branchId]: rawValue === '' ? 0 : Math.max(0, Number(rawValue) || 0),
                                  },
                                }));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
            {formData.product_type !== 'material' && <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
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
            </div>}

            {formData.product_type !== 'material' && formData.hasVariants && (
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
