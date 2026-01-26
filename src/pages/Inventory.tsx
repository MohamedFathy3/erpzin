import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import CategoryManager from '@/components/inventory/CategoryManager';
import ProductList, { Product } from '@/components/inventory/ProductList';
import ProductForm, { ProductFormData } from '@/components/inventory/ProductForm';
import ProductVariantsModal from '@/components/inventory/ProductVariantsModal';
import { BarcodeScanner, BarcodeLabelPrinter } from '@/components/inventory/BarcodeSystem';
import BarcodePrintingCenter from '@/components/inventory/BarcodePrintingCenter';
import StockTransfer from '@/components/inventory/StockTransfer';
import LowStockAlerts from '@/components/inventory/LowStockAlerts';
import InventoryCount from '@/components/inventory/InventoryCount';
// Reports, Movements, Import moved to other sections
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

const ITEMS_PER_PAGE = 10;

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
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(id, name, name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, name_ar')
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  const products: Product[] = dbProducts.map(p => ({
    id: p.id,
    name: p.name,
    nameAr: p.name_ar || p.name,
    sku: p.sku,
    barcode: p.barcode,
    category: p.categories?.name || 'Uncategorized',
    categoryAr: p.categories?.name_ar || 'غير مصنف',
    categoryId: p.category_id || '',
    price: Number(p.price),
    cost: Number(p.cost || 0),
    stock: p.stock,
    minStock: p.min_stock || 5,
    variants: 0,
    image: p.image_url,
    status: !p.is_active ? 'inactive' : p.stock === 0 ? 'out_of_stock' : p.stock <= (p.min_stock || 5) ? 'low_stock' : 'active',
    hasVariants: p.has_variants || false
  }));

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
      const matchesCategory = categoryFilter === 'all' || (product as any).categoryId === categoryFilter;

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

  const handleAddProduct = () => { setEditProduct(null); setShowProductForm(true); };
  const handleEditProduct = async (product: Product) => {
    // Fetch existing variants for this product
    let variants: any[] = [];
    let selectedSizes: string[] = [];
    let selectedColors: string[] = [];
    
    if (product.hasVariants) {
      const { data: existingVariants } = await supabase
        .from('product_variants')
        .select(`
          id,
          sku,
          barcode,
          stock,
          price_adjustment,
          cost_adjustment,
          is_active,
          size_id,
          color_id,
          size:sizes(id, name, name_ar, code),
          color:colors(id, name, name_ar, hex_code)
        `)
        .eq('product_id', product.id);
      
      if (existingVariants && existingVariants.length > 0) {
        // Extract unique sizes and colors
        const uniqueSizeIds = new Set<string>();
        const uniqueColorIds = new Set<string>();
        
        existingVariants.forEach(v => {
          if (v.size_id) uniqueSizeIds.add(v.size_id);
          if (v.color_id) uniqueColorIds.add(v.color_id);
        });
        
        selectedSizes = Array.from(uniqueSizeIds);
        selectedColors = Array.from(uniqueColorIds);
        
        // Group variants by size to extract size-level pricing
        const sizeMap = new Map<string, { cost: number; price: number; barcode: string }>();
        existingVariants.forEach(v => {
          if (v.size_id && !sizeMap.has(v.size_id)) {
            sizeMap.set(v.size_id, {
              cost: product.cost + (v.cost_adjustment || 0),
              price: product.price + (v.price_adjustment || 0),
              barcode: v.barcode || ''
            });
          }
        });
        
        // Convert to variant format expected by VariantMatrix
        variants = existingVariants.map(v => ({
          sizeId: v.size_id,
          colorId: v.color_id,
          sku: v.sku,
          barcode: v.barcode || '',
          stock: v.stock,
          cost: product.cost + (v.cost_adjustment || 0),
          price: product.price + (v.price_adjustment || 0),
          isEnabled: v.is_active ?? true
        }));
      }
    }

    setEditProduct({
      id: product.id, 
      name: product.name, 
      nameAr: product.nameAr, 
      description: '', 
      descriptionAr: '',
      sku: product.sku, 
      barcode: product.barcode || '', 
      categoryId: product.categoryId || '', 
      price: product.price,
      cost: product.cost, 
      hasVariants: product.hasVariants || false, 
      variants,
      selectedSizes,
      selectedColors,
      stock: product.stock,
      reorderPoint: product.minStock || 5, 
      status: product.status === 'inactive' ? 'inactive' : 'active',
      imageUrl: product.image || ''
    });
    setShowProductForm(true);
  };
  const handleDeleteProduct = () => { toast({ title: language === 'ar' ? 'تم الحذف' : 'Deleted' }); refetch(); };
  const handleDuplicateProduct = () => { toast({ title: language === 'ar' ? 'تم النسخ' : 'Duplicated' }); };
  const handleViewProduct = (product: Product) => { handleEditProduct(product); };
  const handlePrintBarcode = (product: Product) => {
    setSelectedProductForPrint({ id: product.id, name: product.name, name_ar: product.nameAr, sku: product.sku, barcode: product.barcode, price: product.price, stock: product.stock });
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

  // Save product with variants to database
  const handleSaveProduct = async (formData: ProductFormData) => {
    try {
      let productId = formData.id;

      // Prepare product data
      const productData = {
        name: formData.name,
        name_ar: formData.nameAr,
        sku: formData.sku,
        barcode: formData.barcode || null,
        category_id: formData.categoryId || null,
        price: formData.price,
        cost: formData.cost,
        stock: formData.stock,
        min_stock: formData.reorderPoint,
        is_active: formData.status === 'active',
        has_variants: formData.hasVariants && formData.variants.filter(v => v.enabled).length > 0,
        image_url: formData.imageUrl || null
      };

      if (productId) {
        // Update existing product
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId);
        
        if (updateError) throw updateError;
      } else {
        // Insert new product
        const { data: newProduct, error: insertError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
        
        if (insertError) throw insertError;
        productId = newProduct.id;
      }

      // Save variants if product has variants
      if (formData.hasVariants && productId) {
        // Delete existing variants
        await supabase
          .from('product_variants')
          .delete()
          .eq('product_id', productId);

        // Get enabled variants and transform them for DB
        const enabledVariants = formData.variants.filter(v => v.enabled);
        
        if (enabledVariants.length > 0) {
          // Track used barcodes to avoid duplicates
          const usedBarcodes = new Set<string>();
          
          const variantsToInsert = enabledVariants.map(v => {
            // Handle barcode - must be unique or null
            let barcode: string | null = v.barcode?.trim() || null;
            
            // If barcode is empty or duplicate, set to null
            if (barcode) {
              if (usedBarcodes.has(barcode)) {
                barcode = null; // Duplicate within batch, set to null
              } else {
                usedBarcodes.add(barcode);
              }
            }
            
            return {
              product_id: productId,
              size_id: v.sizeId || null,
              color_id: v.colorId || null,
              sku: v.sku,
              barcode: barcode,
              stock: v.stock || 0,
              price_adjustment: v.price - formData.price, // Store as adjustment from base price
              cost_adjustment: v.cost - formData.cost,    // Store as adjustment from base cost
              is_active: true
            };
          });

          const { error: variantsError } = await supabase
            .from('product_variants')
            .insert(variantsToInsert);

          if (variantsError) throw variantsError;
        }
      }

      toast({ 
        title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully',
        description: language === 'ar' 
          ? `تم حفظ المنتج "${formData.name}" مع ${formData.variants.filter(v => v.enabled).length} متغير`
          : `Product "${formData.name}" saved with ${formData.variants.filter(v => v.enabled).length} variants`
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['inventory-products'] });
      queryClient.invalidateQueries({ queryKey: ['product-variants'] });
      queryClient.invalidateQueries({ queryKey: ['product-variants-inventory'] });
      refetch();
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({ 
        title: language === 'ar' ? 'خطأ في الحفظ' : 'Save Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  };
  const handleBarcodeProductFound = (product: any) => {
    const found = products.find(p => p.id === product.id);
    if (found) handleEditProduct(found);
  };

  const barcodeProducts = dbProducts.map(p => ({ id: p.id, name: p.name, name_ar: p.name_ar, sku: p.sku, barcode: p.barcode, price: Number(p.price), stock: p.stock }));

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
              <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90"><Plus size={16} className="me-2" />{language === 'ar' ? 'إضافة منتج' : 'Add Product'}</Button>
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
                    <div className="flex gap-1 flex-wrap">
                      {[
                        { value: 'created_desc', labelAr: 'الأحدث', labelEn: 'Newest' },
                        { value: 'name_asc', labelAr: 'الاسم (أ-ي)', labelEn: 'Name (A-Z)' },
                        { value: 'name_desc', labelAr: 'الاسم (ي-أ)', labelEn: 'Name (Z-A)' },
                        { value: 'barcode_asc', labelAr: 'الباركود ↑', labelEn: 'Barcode ↑' },
                        { value: 'barcode_desc', labelAr: 'الباركود ↓', labelEn: 'Barcode ↓' },
                        { value: 'stock_asc', labelAr: 'المخزون (الأقل)', labelEn: 'Stock (Low)' },
                        { value: 'stock_desc', labelAr: 'المخزون (الأكثر)', labelEn: 'Stock (High)' },
                        { value: 'price_asc', labelAr: 'السعر ↑', labelEn: 'Price ↑' },
                        { value: 'price_desc', labelAr: 'السعر ↓', labelEn: 'Price ↓' },
                      ].map(option => (
                        <Button
                          key={option.value}
                          variant={sortBy === option.value ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => setSortBy(option.value)}
                        >
                          {language === 'ar' ? option.labelAr : option.labelEn}
                        </Button>
                      ))}
                    </div>
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

      <ProductForm isOpen={showProductForm} onClose={() => setShowProductForm(false)} onSave={handleSaveProduct} categories={[]} editProduct={editProduct} />
      <BarcodeScanner isOpen={showBarcodeScanner} onClose={() => setShowBarcodeScanner(false)} onProductFound={handleBarcodeProductFound} products={barcodeProducts} />
      <BarcodeLabelPrinter isOpen={showBarcodePrinter} onClose={() => { setShowBarcodePrinter(false); setSelectedProductForPrint(null); }} products={barcodeProducts} selectedProduct={selectedProductForPrint} />
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
