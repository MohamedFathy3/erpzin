import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import CategoryManager from '@/components/inventory/CategoryManager';
import ProductList, { Product, transformApiProduct } from '@/components/inventory/ProductList'; // استورد الدالة
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
import { supabase } from '@/integrations/supabase/client';
import api from '@/lib/api';

const ITEMS_PER_PAGE = 10;

export const transformApiProductToFormData = (apiProduct: any): ProductFormData => {
  let imageUrl = '';
  let imageId: number | undefined;
  
  console.log('🔧 Transforming to form data:', apiProduct);
  
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
    status: status,
    imageId,
    imageUrl,
    branchIds: apiProduct.branch_ids || [],
    warehouseIds: apiProduct.warehouse_ids || [],
    valuationMethod: apiProduct.valuation_method || 'fifo'
  };
};

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

  const { data: dbProducts = [], refetch } = useQuery({
    queryKey: ['inventory-products'],
    queryFn: async () => {
      try {
        const response = await api.post('/product/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        const products = response.data.data || [];
        console.log('📦 Raw API products:', products);
        console.log('First product details:', products[0]);
        
        return products;
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب المنتجات' : 'Error fetching products',
          variant: 'destructive'
        });
        return [];
      }
    },
  });

  const { data: categories = [] } = useQuery({
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
        console.error('Error fetching categories:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب التصنيفات' : 'Error fetching categories',
          variant: 'destructive'
        });
        return [];
      }
    },
  });

  // استخدم الدالة transformApiProduct من ProductList
  const products: Product[] = dbProducts.map(product => {
    const transformed = transformApiProduct(product);
    console.log('🔄 Transformed product:', transformed);
    return transformed;
  });

  console.log('🎯 Final products array:', products);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      // Search filter (barcode and name)
      const matchesSearch = searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.nameAr.includes(searchQuery) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;

      // Stock filter
      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = product.stock > 10;
      else if (stockFilter === 'low_stock') matchesStock = product.stock > 0 && product.stock <= 10;
      else if (stockFilter === 'out_of_stock') matchesStock = product.stock === 0;

      // Category filter
      const matchesCategory = categoryFilter === 'all' || product.categoryId === categoryFilter;

      return matchesSearch && matchesStatus && matchesStock && matchesCategory;
    });

    // Sorting
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
  }, [products, searchQuery, statusFilter, stockFilter, categoryFilter, sortBy, language]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, stockFilter, categoryFilter, sortBy]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setStockFilter('all');
    setCategoryFilter('all');
    setSearchQuery('');
    setSortBy('created_desc');
  };

  const hasActiveFilters = statusFilter !== 'all' || stockFilter !== 'all' || categoryFilter !== 'all' || searchQuery !== '' || sortBy !== 'created_desc';

  const handleAddProduct = () => { 
    setEditProduct(null); 
    setShowProductForm(true); 
  };

  const handleEditProduct = async (product: Product) => {
    try {
      const response = await api.get(`/product/${product.id}`);
      const dbProduct = response.data;
      
      // استخدم الدالة الجديدة
      const formData = transformApiProductToFormData(dbProduct);
      
      // إذا كان فيه متغيرات، املأها
      if (formData.hasVariants && product.id) {
        try {
          const variantsResponse = await api.get(`/product-variants?product_id=${product.id}`);
          const existingVariants = variantsResponse.data.data || [];
          
          if (existingVariants.length > 0) {
            const uniqueSizeIds = new Set<string>();
            const uniqueColorIds = new Set<string>();
            
            existingVariants.forEach(v => {
              if (v.size_id) uniqueSizeIds.add(v.size_id.toString());
              if (v.color_id) uniqueColorIds.add(v.color_id.toString());
            });
            
            formData.selectedSizes = Array.from(uniqueSizeIds);
            formData.selectedColors = Array.from(uniqueColorIds);
            
            formData.variants = existingVariants.map(v => ({
              sizeId: v.size_id?.toString(),
              colorId: v.color_id?.toString(),
              sku: v.sku || `${formData.sku}-${v.size_id || ''}-${v.color_id || ''}`,
              barcode: v.barcode || '',
              stock: v.stock || 0,
              cost: v.cost || formData.cost,
              price: v.price || formData.price,
              enabled: v.is_active ?? true
            }));
          }
        } catch (variantError) {
          console.warn('Could not fetch variants:', variantError);
        }
      }
      
      setEditProduct(formData);
      setShowProductForm(true);
      
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast({
        title: language === 'ar' ? 'خطأ في جلب بيانات المنتج' : 'Error fetching product details',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteProduct = () => { 
    toast({ title: language === 'ar' ? 'تم الحذف' : 'Deleted' }); 
    refetch(); 
  };

  const handleDuplicateProduct = () => { 
    toast({ title: language === 'ar' ? 'تم النسخ' : 'Duplicated' }); 
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
    const dbProduct = dbProducts.find(p => p.id === product.id);
    setSelectedProductForVariants({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      cost: product.cost,
      sku: product.sku,
      stock: product.stock,
      image: product.image,
      minStock: product.minStock
    });
    setShowVariantsModal(true);
  };

  const handleSaveProduct = async (formData: ProductFormData) => {
    try {
      // Prepare product data for API
      const productData = {
        name: formData.name,
        name_ar: formData.nameAr || formData.name,
        description: formData.description || '',
        description_ar: formData.descriptionAr || '',
        category_id: formData.categoryId || null,
        sku: formData.sku,
        barcode: formData.barcode || null,
        reorder_level: formData.reorderPoint || 5,
        image_url: formData.imageUrl || null,
        cost: formData.cost,
        price: formData.price,
        stock: formData.stock,
        active: formData.status === 'active',
        has_variants: formData.hasVariants,
        branch_ids: formData.branchIds || [],
        warehouse_ids: formData.warehouseIds || [],
        valuation_method: formData.valuationMethod || 'fifo'
      };

      let productId = formData.id;

      if (productId) {
        // Update existing product
        const response = await api.put(`/product/${productId}`, productData);
        
        toast({ 
          title: language === 'ar' ? 'تم التحديث بنجاح' : 'Updated successfully',
          description: language === 'ar' 
            ? `تم تحديث المنتج "${formData.name}"`
            : `Product "${formData.name}" updated`
        });
      } else {
        // Create new product
        const response = await api.post('/product', productData);
        productId = response.data.id;
        
        toast({ 
          title: language === 'ar' ? 'تم الإضافة بنجاح' : 'Added successfully',
          description: language === 'ar' 
            ? `تم إضافة المنتج "${formData.name}"`
            : `Product "${formData.name}" added`
        });
      }

      // Handle variants separately if product has variants
      if (formData.hasVariants && productId && formData.variants.length > 0) {
        try {
          const enabledVariants = formData.variants.filter(v => v.enabled);
          
          if (enabledVariants.length > 0) {
            const variantsData = enabledVariants.map(variant => ({
              product_id: productId,
              size_id: variant.sizeId || null,
              color_id: variant.colorId || null,
              sku: variant.sku,
              barcode: variant.barcode || null,
              stock: variant.stock || 0,
              price: variant.price,
              cost: variant.cost,
              is_active: true
            }));

            await api.post('/product-variants', { variants: variantsData });
            await api.put(`/product/${productId}`, { has_variants: true });
          }
        } catch (variantError) {
          console.warn('Could not save variants, continuing without them:', variantError);
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['categories-filter'] });
      refetch();
      
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({ 
        title: language === 'ar' ? 'خطأ في الحفظ' : 'Save Error',
        description: error.response?.data?.message || error.message,
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleBarcodeProductFound = (product: any) => {
    const found = products.find(p => p.id === product.id);
    if (found) handleEditProduct(found);
  };

  const barcodeProducts = dbProducts.map(p => ({ 
    id: p.id, 
    name: p.name, 
    name_ar: p.name_ar, 
    sku: p.sku, 
    barcode: p.barcode, 
    price: Number(p.price), 
    stock: p.stock 
  }));

  return (
    <MainLayout activeItem="inventory">
      <div className="h-full flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'المخزون والمنتجات' : 'Inventory & Products'}</h1>
            <p className="text-muted-foreground">{language === 'ar' ? 'إدارة المنتجات والتصنيفات والمخزون' : 'Manage products, categories, and inventory'}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
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
                  <span className="font-medium text-foreground">{language === 'ar' ? 'تصفية المنتجات' : 'Filter Products'}</span>
                  {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="ms-auto text-destructive hover:text-destructive">
                      <X size={14} className="me-1" />
                      {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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

                  {/* Category Filter */}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={language === 'ar' ? 'التصنيف' : 'Category'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'جميع التصنيفات' : 'All Categories'}</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
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
                      <SelectItem value="all">{language === 'ar' ? 'جميع الحالات' : 'All Status'}</SelectItem>
                      <SelectItem value="active">{language === 'ar' ? 'نشط' : 'Active'}</SelectItem>
                      <SelectItem value="inactive">{language === 'ar' ? 'غير نشط' : 'Inactive'}</SelectItem>
                      <SelectItem value="low_stock">{language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}</SelectItem>
                      <SelectItem value="out_of_stock">{language === 'ar' ? 'نفذ المخزون' : 'Out of Stock'}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Stock Filter */}
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={language === 'ar' ? 'المخزون' : 'Stock'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'جميع المخزون' : 'All Stock'}</SelectItem>
                      <SelectItem value="in_stock">{language === 'ar' ? 'متوفر (+10)' : 'In Stock (+10)'}</SelectItem>
                      <SelectItem value="low_stock">{language === 'ar' ? 'منخفض (1-10)' : 'Low (1-10)'}</SelectItem>
                      <SelectItem value="out_of_stock">{language === 'ar' ? 'نفذ (0)' : 'Out (0)'}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Sort Options */}
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SortAsc size={16} className="text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{language === 'ar' ? 'ترتيب حسب:' : 'Sort by:'}</span>
                    {/* يمكن إضافة أزرار التصنيف هنا */}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products Grid */}
            <div className="flex-1 flex gap-4 min-h-0">
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
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
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
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="transfers" className="flex-1 mt-2">
            <Card className="shadow-md border-border"><CardContent className="p-4"><StockTransfer /></CardContent></Card>
          </TabsContent>
          <TabsContent value="alerts" className="flex-1 mt-2">
            <Card className="shadow-md border-border"><CardContent className="p-4"><LowStockAlerts /></CardContent></Card>
          </TabsContent>
          <TabsContent value="count" className="flex-1 mt-2">
            <Card className="shadow-md border-border"><CardContent className="p-4"><InventoryCount /></CardContent></Card>
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

      <ProductForm 
        isOpen={showProductForm} 
        onClose={() => setShowProductForm(false)} 
        onSave={handleSaveProduct} 
        categories={categories} 
        editProduct={editProduct} 
      />
      <BarcodeScanner 
        isOpen={showBarcodeScanner} 
        onClose={() => setShowBarcodeScanner(false)} 
        onProductFound={handleBarcodeProductFound} 
        products={barcodeProducts} 
      />
      <BarcodeLabelPrinter 
        isOpen={showBarcodePrinter} 
        onClose={() => { setShowBarcodePrinter(false); setSelectedProductForPrint(null); }} 
        products={barcodeProducts} 
        selectedProduct={selectedProductForPrint} 
      />
      <ProductVariantsModal 
        isOpen={showVariantsModal} 
        onClose={() => { setShowVariantsModal(false); setSelectedProductForVariants(null); }} 
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