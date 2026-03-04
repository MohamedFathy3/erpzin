import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import CategoryManager from '@/components/inventory/CategoryManager';
import ProductList, { Product, transformApiProduct } from '@/components/inventory/ProductList';
import ProductForm, { ProductFormData } from '@/components/inventory/ProductForm';
import ProductVariantsModal from '@/components/inventory/ProductVariantsModal';
import { BarcodeScanner, BarcodeLabelPrinter } from '@/components/inventory/BarcodeSystem';
import BarcodePrintingCenter from '@/components/inventory/BarcodePrintingCenter';
import StockTransfer from '@/components/inventory/StockTransfer';
import LowStockAlerts from '@/components/inventory/LowStockAlerts';
import InventoryCount from '@/components/inventory/InventoryCount';
import UnitsVariantsManager from '@/components/inventory/UnitsVariantsManager';
import PromotionsManager from '@/components/inventory/PromotionsManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Package, ArrowRightLeft, Bell, ClipboardList, Palette, Filter, X, Tag, Gift, SortAsc } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { ProductVariant } from '@/hooks/useVariantData';

const ITEMS_PER_PAGE = 10;

export const transformApiProductToFormData = (apiProduct: any): ProductFormData => {
  console.log('🔧 [TRANSFORM] Input to transform function:', apiProduct);
  
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

  // معالجة المتغيرات من الـ units
  const variants: ProductVariant[] = [];
  const selectedSizes: string[] = [];
  const selectedColors: string[] = [];

  if (apiProduct.units && Array.isArray(apiProduct.units)) {
    console.log('🔧 [TRANSFORM] Processing units:', apiProduct.units.length);
    
    apiProduct.units.forEach((unit: any, index: number) => {
      if (unit.unit_id) {
        selectedSizes.push(unit.unit_id.toString());
      }
      
      // إذا كان هناك ألوان في الـ unit
      if (unit.colors && Array.isArray(unit.colors)) {
        unit.colors.forEach((color: any) => {
          if (color.color_id) {
            selectedColors.push(color.color_id.toString());
          }
          
          const variant: ProductVariant = {
            id: `${unit.unit_id || index}-${color.color_id || index}`,
            colorId: color.color_id?.toString() || '',
            unitId: unit.unit_id?.toString() || '',
            sku: unit.sku || `${apiProduct.sku}-${unit.unit_id || index}-${color.color_id || index}`,
            barcode: unit.barcode || '',
            customBarcode: false,
            stock: color.stock || unit.stock || apiProduct.stock || 0,
            cost: unit.cost_price || apiProduct.cost || 0,
            price: unit.sell_price || apiProduct.price || 0,
            enabled: true
          };
          variants.push(variant);
        });
      } else {
        // إذا لم يكن هناك ألوان، ننشئ variant واحد فقط
        const variant: ProductVariant = {
          id: `${unit.unit_id || index}`,
          colorId: '',
          unitId: unit.unit_id?.toString() || '',
          sku: unit.sku || `${apiProduct.sku}-${unit.unit_id || index}`,
          barcode: unit.barcode || '',
          customBarcode: false,
          stock: unit.stock || apiProduct.stock || 0,
          cost: unit.cost_price || apiProduct.cost || 0,
          price: unit.sell_price || apiProduct.price || 0,
          enabled: true
        };
        variants.push(variant);
      }
    });
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
    selectedSizes: selectedSizes,
    selectedColors: selectedColors,
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
  
  console.log('✅ Transformed form data:', {
    ...result,
    variantsCount: result.variants.length,
    selectedSizes: result.selectedSizes,
    selectedColors: result.selectedColors
  });
  
  return result;
};

// إعداد اعتراض الطلبات للتصحيح
api.interceptors.request.use(
  (config) => {
    console.log('📤 API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      params: config.params
    });
    return config;
  },
  (error) => {
    console.error('📤 Request Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    console.log('📥 API Response:', {
      url: response.config.url,
      status: response.status,
      data: response.data
    });
    return response;
  },
  (error) => {
    console.error('📥 Response Error:', {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    return Promise.reject(error);
  }
);

const Inventory: React.FC = () => {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('products');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductFormData | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showBarcodePrinter, setShowBarcodePrinter] = useState(false);
  const [selectedProductForPrint, setSelectedProductForPrint] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showVariantsModal, setShowVariantsModal] = useState(false);
  const [selectedProductForVariants, setSelectedProductForVariants] = useState<any>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('created_desc');
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);

  const queryClient = useQueryClient();

  // ========== جلب المنتجات مع فلترة حسب الفئة ==========
  const { data: dbProducts = [], refetch, isLoading: productsLoading } = useQuery({
    queryKey: ['inventory-products', selectedCategory, categoryFilter, statusFilter],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false,
          delete: false
        };

        // ✅ الأولوية: selectedCategory من CategoryManager (القائمة الجانبية)
        if (selectedCategory && selectedCategory !== 'all') {
          payload.filters = {
            category_id: parseInt(selectedCategory)
          };
          console.log('📦 Filtering by CategoryManager category:', selectedCategory);
        }
        // ✅ الثاني: categoryFilter من Select الفئات
        else if (categoryFilter && categoryFilter !== 'all') {
          payload.filters = {
            category_id: parseInt(categoryFilter)
          };
          console.log('📦 Filtering by FilterSelect category:', categoryFilter);
        }

        // ✅ فلترة حسب الحالة (active/inactive)
        if (statusFilter !== 'all') {
          if (!payload.filters) payload.filters = {};
          payload.filters.active = statusFilter === 'active';
        }

        console.log('📦 Fetching products with payload:', payload);

        const response = await api.post('/product/index', payload);
        const products = response.data.data || [];
        
        return products;
      } catch (error) {
        console.error('❌ Error fetching products:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب المنتجات' : 'Error fetching products',
          variant: 'destructive'
        });
        return [];
      }
    },
  });

  // ========== جلب التصنيفات ==========
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories-filter'],
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
        console.error('❌ Error fetching categories:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب التصنيفات' : 'Error fetching categories',
          variant: 'destructive'
        });
        return [];
      }
    },
  });

  // ========== جلب الفروع ==========
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ['branches'],
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
        console.error('❌ Error fetching branches:', error);
        return [];
      }
    },
  });

  // ========== جلب المستودعات ==========
  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ['warehouses'],
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
        console.error('❌ Error fetching warehouses:', error);
        return [];
      }
    },
  });

  const dbCategories = categories;

  // تحويل المنتجات من API إلى شكل Product
  const products: Product[] = dbProducts.map((product: any) => {
    const transformed = transformApiProduct(product);
    return transformed;
  });

  // ========== فلترة المنتجات في الواجهة ==========
  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // ✅ البحث (الاسم - SKU - الباركود)
      const matchesSearch = searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.nameAr.includes(searchQuery) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

      // ✅ فلترة المخزون
      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = product.stock > 10;
      else if (stockFilter === 'low_stock') matchesStock = product.stock > 0 && product.stock <= 10;
      else if (stockFilter === 'out_of_stock') matchesStock = product.stock === 0;

      return matchesSearch && matchesStock;
    });

    // ✅ ترتيب المنتجات
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (language === 'ar' ? a.nameAr : a.name).localeCompare(language === 'ar' ? b.nameAr : b.name);
        case 'name_desc':
          return (language === 'ar' ? b.nameAr : b.name).localeCompare(language === 'ar' ? a.nameAr : a.name);
        case 'barcode_asc':
          return (a.barcode || '').localeCompare(b.barcode || '');
        case 'barcode_desc':
          return (b.barcode || '').localeCompare(a.barcode || '');
        case 'stock_asc':
          return a.stock - b.stock;
        case 'stock_desc':
          return b.stock - a.stock;
        case 'price_asc':
          return a.price - b.price;
        case 'price_desc':
          return b.price - a.price;
        case 'sku_asc':
          return a.sku.localeCompare(b.sku);
        case 'sku_desc':
          return b.sku.localeCompare(a.sku);
        case 'created_desc':
        default:
          return 0;
      }
    });

    return filtered;
  }, [products, searchQuery, stockFilter, sortBy, language]);

  // ========== Pagination ==========
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, stockFilter, categoryFilter, sortBy, selectedCategory]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setStockFilter('all');
    setCategoryFilter('all');
    setSelectedCategory(null);
    setSearchQuery('');
    setSortBy('created_desc');
  };

  const hasActiveFilters = statusFilter !== 'all' || stockFilter !== 'all' || categoryFilter !== 'all' || selectedCategory !== null || searchQuery !== '' || sortBy !== 'created_desc';

  const handleAddProduct = () => { 
    setEditProduct(null); 
    setShowProductForm(true); 
  };

  const handleEditProduct = async (product: Product) => {
    try {
      setShowProductForm(true);
      
      const response = await api.get(`/product/${product.id}`);
      const dbProduct = response.data.data;
      
      if (!dbProduct) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'المنتج غير موجود' : 'Product not found',
          variant: 'destructive'
        });
        return;
      }
      
      const formData = transformApiProductToFormData(dbProduct);
      setEditProduct(formData);
      
    } catch (error) {
      console.error('❌ Error fetching product details:', error);
      toast({
        title: language === 'ar' ? 'تحذير' : 'Warning',
        description: language === 'ar' 
          ? 'تم فتح النموذج ولكن بعض البيانات قد لا تكون محدثة'
          : 'Form opened but some data may not be current',
        variant: 'default'
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      await api.delete(`/product/delete`,{
        data: { items: [productId] }
      });
      toast({ 
        title: language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully',
        variant: 'default'
      });
      refetch();
    } catch (error) {
      toast({ 
        title: language === 'ar' ? 'خطأ في الحذف' : 'Delete Error',
        variant: 'destructive'
      });
    }
  };

  const handleDuplicateProduct = (product: Product) => {
    setEditProduct({
      ...product,
      id: undefined,
      name: `${product.name} (Copy)`,
      nameAr: `${product.nameAr} (نسخة)`,
      sku: `${product.sku}-COPY`,
    });
    setShowProductForm(true);
    toast({ 
      title: language === 'ar' ? 'تم تجهيز النسخة' : 'Ready to duplicate',
      description: language === 'ar' ? 'قم بتعديل البيانات ثم احفظ' : 'Edit data then save'
    });
  };

  const handleViewProduct = (product: Product) => { 
    handleEditProduct(product); 
  };

  const handlePrintBarcode = (product: Product) => {
    setSelectedProductForPrint({ 
      id: product.id, 
      name: product.name, 
      name_ar: product.nameAr, 
      sku: product.sku, 
      barcode: product.barcode, 
      price: product.price, 
      stock: product.stock 
    });
    setShowBarcodePrinter(true);
  };

  const handleViewVariants = (product: Product) => {
    const dbProduct = dbProducts.find((p: any) => p.id.toString() === product.id);
    setSelectedProductForVariants({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      cost: product.cost,
      sku: product.sku,
      stock: product.stock,
      image: product.image,
      imageUrl: product.imageUrl,
      image_url: product.image_url,
      minStock: product.minStock,
      units: dbProduct?.units || []
    });
    setShowVariantsModal(true);
  };

  const handleSaveProduct = async (formData: ProductFormData) => {
    try {
      // Prepare product data for API
      const productData: any = {
        name: formData.name,
        description: formData.description || '',
        category_id: formData.categoryId ? parseInt(formData.categoryId) : null,
        sku: formData.sku,
        barcode: formData.barcode || null,
        reorder_level: formData.reorderPoint || 5,
        cost: formData.cost || 0,
        price: formData.price || 0,
        stock: formData.stock || 0,
        active: formData.status === 'active',
        has_variants: formData.hasVariants || false,
        branch_ids: formData.branchIds && formData.branchIds.length > 0 
          ? formData.branchIds.map(id => parseInt(id)) 
          : [],
        warehouse_ids: formData.warehouseIds && formData.warehouseIds.length > 0 
          ? formData.warehouseIds.map(id => parseInt(id)) 
          : [],
        valuation_method: formData.valuationMethod || 'fifo',
        units: []
      };

      // إضافة الاسم العربي والوصف العربي
      if (formData.nameAr && formData.nameAr.trim() !== '') {
        productData.name_ar = formData.nameAr;
      }
      if (formData.descriptionAr && formData.descriptionAr.trim() !== '') {
        productData.description_ar = formData.descriptionAr;
      }

      // معالجة الصورة
      if (formData.imageId && formData.imageId > 0) {
        productData.image = formData.imageId;
      } else if (formData.imageUrl && formData.imageUrl.trim() !== '') {
        productData.image_url = formData.imageUrl;
      }

      // Handle variants if product has variants
      if (formData.hasVariants && formData.variants && formData.variants.length > 0) {
        const enabledVariants = formData.variants.filter(v => v.enabled);
        
        if (enabledVariants.length > 0) {
          const units: any[] = [];
          
          enabledVariants.forEach(variant => {
            const unitData: any = {
              unit_id: variant.unitId && variant.unitId !== '' ? parseInt(variant.unitId) : null,
              cost_price: variant.cost || formData.cost || 0,
              sell_price: variant.price || formData.price || 0,
              barcode: variant.barcode || `${formData.sku}-${variant.unitId || ''}-${variant.colorId || ''}`
            };
            
            if (variant.colorId && variant.colorId !== '') {
              unitData.colors = [{
                color_id: parseInt(variant.colorId),
                stock: variant.stock || formData.stock || 0
              }];
            }
            
            units.push(unitData);
          });
          
          productData.units = units;
        }
      }

      let productId = formData.id;
      let response;

      if (productId) {
        // Update existing product
        console.log('🔄 Updating existing product ID:', productId);
        response = await api.put(`/product/${productId}`, productData);
        console.log('✅ Update response:', response.data);
        
        toast({ 
          title: language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully',
          description: language === 'ar' 
            ? `تم تحديث المنتج "${formData.name}"`
            : `Product "${formData.name}" updated`
        });
      } else {
        // Create new product
        response = await api.post('/product', productData);
        productId = response.data.id;
        
        toast({ 
          title: language === 'ar' ? 'تم الإضافة بنجاح' : 'Added successfully',
          description: language === 'ar' 
            ? `تم إضافة المنتج "${formData.name}"`
            : `Product "${formData.name}" added`
        });
      }

      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      refetch();
      
      // إغلاق النموذج
      setShowProductForm(false);
      setEditProduct(null);
      
    } catch (error: any) {
      let errorMessage = 'Unknown error';
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        errorMessage = Object.values(error.response.data.errors).flat().join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('❌ Save error:', errorMessage);
      
      toast({ 
        title: language === 'ar' ? 'خطأ في الحفظ' : 'Save Error',
        description: errorMessage,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleBarcodeProductFound = (product: any) => {
    const found = products.find(p => p.id === product.id);
    if (found) handleEditProduct(found);
  };

  const barcodeProducts = dbProducts.map((p: any) => ({ 
    id: p.id, 
    name: p.name, 
    name_ar: p.name_ar, 
    sku: p.sku, 
    barcode: p.barcode, 
    price: Number(p.price), 
    stock: p.stock 
  }));

  const isLoading = productsLoading || categoriesLoading;

  // ========== Render ==========
  return (
    <MainLayout activeItem="inventory">
      <div className="h-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'ar' ? 'المخزون والمنتجات' : 'Inventory & Products'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة المنتجات والتصنيفات والمخزون' : 'Manage products, categories, and inventory'}
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          {/* Tabs Header */}
          <div className="flex flex-wrap items-center gap-6 pb-4 border-b border-border mb-4">
            {/* المنتجات والإعدادات */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground px-1">
                {language === 'ar' ? 'المنتجات' : 'Products'}
              </span>
              <TabsList className="h-10 bg-muted/60 p-1 rounded-lg shadow-sm">
                <TabsTrigger value="products" className="flex items-center gap-1.5 text-xs px-3.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
                  <Package size={14} />
                  {language === 'ar' ? 'قائمة المنتجات' : 'Products'}
                </TabsTrigger>
                <TabsTrigger value="variants" className="flex items-center gap-1.5 text-xs px-3.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
                  <Palette size={14} />
                  {language === 'ar' ? 'الوحدات والمتغيرات' : 'Units & Variants'}
                </TabsTrigger>
                <TabsTrigger value="barcode" className="flex items-center gap-1.5 text-xs px-3.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all">
                  <Tag size={14} />
                  {language === 'ar' ? 'طباعة الباركود' : 'Barcode'}
                </TabsTrigger>
                <TabsTrigger value="promotions" className="flex items-center gap-1.5 text-xs px-3.5 rounded-md data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                  <Gift size={14} />
                  {language === 'ar' ? 'العروض' : 'Promotions'}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* إدارة المخزون */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground px-1">
                {language === 'ar' ? 'إدارة المخزون' : 'Stock Management'}
              </span>
              <TabsList className="h-10 bg-emerald-50/80 dark:bg-emerald-950/30 p-1 rounded-lg shadow-sm">
                <TabsTrigger value="transfers" className="flex items-center gap-1.5 text-xs px-3.5 rounded-md data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                  <ArrowRightLeft size={14} />
                  {language === 'ar' ? 'التحويلات' : 'Transfers'}
                </TabsTrigger>
                <TabsTrigger value="count" className="flex items-center gap-1.5 text-xs px-3.5 rounded-md data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                  <ClipboardList size={14} />
                  {language === 'ar' ? 'الجرد' : 'Count'}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* التنبيهات */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground px-1">
                {language === 'ar' ? 'المراقبة' : 'Monitoring'}
              </span>
              <TabsList className="h-10 bg-violet-50/80 dark:bg-violet-950/30 p-1 rounded-lg shadow-sm">
                <TabsTrigger value="alerts" className="flex items-center gap-1.5 text-xs px-3.5 rounded-md data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all">
                  <Bell size={14} />
                  {language === 'ar' ? 'التنبيهات' : 'Alerts'}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          {/* Products Tab */}
          <TabsContent value="products" className="flex-1 flex flex-col mt-2">
            {/* Actions Bar */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90">
                <Plus size={16} className="me-2" />
                {language === 'ar' ? 'إضافة منتج' : 'Add Product'}
              </Button>
            </div>

            {/* Filters Card */}
            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Filter size={18} className="text-muted-foreground" />
                  <span className="font-medium text-foreground">
                    {language === 'ar' ? 'تصفية المنتجات' : 'Filter Products'}
                  </span>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="ms-auto text-destructive hover:text-destructive">
                      <X size={14} className="me-1" />
                      {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Search by barcode or name */}
                  <div className="col-span-2">
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                      <Input 
                        placeholder={language === 'ar' ? 'بحث بالباركود أو الاسم أو SKU...' : 'Search by barcode, name, or SKU...'} 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="ps-9 h-9"
                      />
                    </div>
                  </div>

                  {/* Category Filter - Select */}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={language === 'ar' ? 'التصنيف' : 'Category'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}
                      </SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {language === 'ar' ? cat.name_ar || cat.name : cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={language === 'ar' ? 'الحالة' : 'Status'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === 'ar' ? 'جميع الحالات' : 'All Status'}
                      </SelectItem>
                      <SelectItem value="active">
                        {language === 'ar' ? 'نشط' : 'Active'}
                      </SelectItem>
                      <SelectItem value="inactive">
                        {language === 'ar' ? 'غير نشط' : 'Inactive'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Stock Filter */}
                <div className="mt-3">
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="h-9 w-full md:w-64">
                      <SelectValue placeholder={language === 'ar' ? 'المخزون' : 'Stock'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">
                        {language === 'ar' ? 'جميع المخزون' : 'All Stock'}
                      </SelectItem>
                      <SelectItem value="in_stock">
                        {language === 'ar' ? 'متوفر (+10)' : 'In Stock (+10)'}
                      </SelectItem>
                      <SelectItem value="low_stock">
                        {language === 'ar' ? 'منخفض (1-10)' : 'Low (1-10)'}
                      </SelectItem>
                      <SelectItem value="out_of_stock">
                        {language === 'ar' ? 'نفذ (0)' : 'Out (0)'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="flex-1 flex gap-4 min-h-0">
              {/* Category Manager Sidebar */}
              <div className={cn(
                "flex-shrink-0 hidden lg:block transition-all duration-300",
                isCategoryCollapsed ? "w-12" : "w-64"
              )}>
                <CategoryManager 
                  selectedCategory={selectedCategory} 
                  onSelectCategory={setSelectedCategory}
                  isCollapsed={isCategoryCollapsed}
                  onCollapseChange={setIsCategoryCollapsed}
                />
              </div>
              
              {/* Product List */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <ProductList 
                      products={paginatedProducts} 
                      onEdit={handleEditProduct} 
                      onDelete={handleDeleteProduct} 
                      onDuplicate={handleDuplicateProduct} 
                      onView={handleViewProduct} 
                      onPrintBarcode={handlePrintBarcode}
                      onViewVariants={handleViewVariants}
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={handlePageChange}
                      totalProducts={filteredProducts.length}
                      itemsPerPage={ITEMS_PER_PAGE}
                    />
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Other Tabs */}
          <TabsContent value="transfers" className="flex-1 mt-2">
            <Card className="shadow-md border-border">
              <CardContent className="p-4">
                <StockTransfer />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="alerts" className="flex-1 mt-2">
            <Card className="shadow-md border-border">
              <CardContent className="p-4">
                <LowStockAlerts />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="count" className="flex-1 mt-2">
            <Card className="shadow-md border-border">
              <CardContent className="p-4">
                <InventoryCount />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="variants" className="flex-1 mt-2">
            <UnitsVariantsManager />
          </TabsContent>
          
          <TabsContent value="barcode" className="flex-1 mt-2">
            <BarcodePrintingCenter />
          </TabsContent>
          
          <TabsContent value="promotions" className="flex-1 mt-2">
            <PromotionsManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <ProductForm 
        isOpen={showProductForm} 
        onClose={() => {
          setShowProductForm(false);
          setEditProduct(null);
        }} 
        onSave={handleSaveProduct} 
        editProduct={editProduct} 
        branches={branches}
        warehouses={warehouses}
        categories={dbCategories}
        isLoadingBranches={loadingBranches}
        isLoadingWarehouses={loadingWarehouses}
        isLoadingCategories={categoriesLoading}
      />
      
      <BarcodeScanner 
        isOpen={showBarcodeScanner} 
        onClose={() => setShowBarcodeScanner(false)} 
        onProductFound={handleBarcodeProductFound} 
        products={barcodeProducts} 
      />
      
      <BarcodeLabelPrinter 
        isOpen={showBarcodePrinter} 
        onClose={() => { 
          setShowBarcodePrinter(false); 
          setSelectedProductForPrint(null); 
        }} 
        products={barcodeProducts} 
        selectedProduct={selectedProductForPrint} 
      />
      
      <ProductVariantsModal 
        isOpen={showVariantsModal} 
        onClose={() => { 
          setShowVariantsModal(false); 
          setSelectedProductForVariants(null); 
        }} 
        product={selectedProductForVariants}
        onEditProduct={() => {
          setShowVariantsModal(false);
          if (selectedProductForVariants) {
            const found = products.find(p => p.id === selectedProductForVariants.id);
            if (found) handleEditProduct(found);
          }
        }}
      />
    </MainLayout>
  );
};

export default Inventory;