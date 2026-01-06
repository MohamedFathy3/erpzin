import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import CategoryManager from '@/components/inventory/CategoryManager';
import ProductList, { Product } from '@/components/inventory/ProductList';
import ProductForm, { ProductFormData } from '@/components/inventory/ProductForm';
import ProductVariantsModal from '@/components/inventory/ProductVariantsModal';
import { BarcodeScanner, BarcodeLabelPrinter } from '@/components/inventory/BarcodeSystem';
import StockTransfer from '@/components/inventory/StockTransfer';
import InventoryReports from '@/components/inventory/InventoryReports';
import LowStockAlerts from '@/components/inventory/LowStockAlerts';
import InventoryCount from '@/components/inventory/InventoryCount';
import InventoryMovements from '@/components/inventory/InventoryMovements';
import OpeningBalances from '@/components/inventory/OpeningBalances';
import ExcelImport from '@/components/inventory/ExcelImport';
import SizeColorManager from '@/components/inventory/SizeColorManager';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, ScanBarcode, Printer, Package, ArrowRightLeft, BarChart3, Bell, ClipboardList, ArrowUpDown, Wallet, FileSpreadsheet, Palette, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
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
  const [priceRange, setPriceRange] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isCategoryCollapsed, setIsCategoryCollapsed] = useState(false);

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
    categoryId: p.categories?.id || '',
    price: Number(p.price),
    cost: Number(p.cost || 0),
    stock: p.stock,
    variants: 0,
    image: p.image_url,
    status: !p.is_active ? 'inactive' : p.stock === 0 ? 'out_of_stock' : p.stock <= (p.min_stock || 5) ? 'low_stock' : 'active',
    hasVariants: p.has_variants || false
  }));

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.nameAr.includes(searchQuery) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.barcode && product.barcode.includes(searchQuery));

      // Status filter
      const matchesStatus = statusFilter === 'all' || product.status === statusFilter;

      // Stock filter
      let matchesStock = true;
      if (stockFilter === 'in_stock') matchesStock = product.stock > 10;
      else if (stockFilter === 'low_stock') matchesStock = product.stock > 0 && product.stock <= 10;
      else if (stockFilter === 'out_of_stock') matchesStock = product.stock === 0;

      // Price range filter
      let matchesPrice = true;
      if (priceRange === '0-10000') matchesPrice = product.price <= 10000;
      else if (priceRange === '10000-50000') matchesPrice = product.price > 10000 && product.price <= 50000;
      else if (priceRange === '50000-100000') matchesPrice = product.price > 50000 && product.price <= 100000;
      else if (priceRange === '100000+') matchesPrice = product.price > 100000;

      // Category filter
      const matchesCategory = categoryFilter === 'all' || (product as any).categoryId === categoryFilter;

      return matchesSearch && matchesStatus && matchesStock && matchesPrice && matchesCategory;
    });
  }, [products, searchQuery, statusFilter, stockFilter, priceRange, categoryFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, stockFilter, priceRange, categoryFilter]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setStockFilter('all');
    setPriceRange('all');
    setCategoryFilter('all');
    setSearchQuery('');
  };

  const hasActiveFilters = statusFilter !== 'all' || stockFilter !== 'all' || priceRange !== 'all' || categoryFilter !== 'all' || searchQuery !== '';

  const handleAddProduct = () => { setEditProduct(null); setShowProductForm(true); };
  const handleEditProduct = (product: Product) => {
    setEditProduct({
      id: product.id, name: product.name, nameAr: product.nameAr, description: '', descriptionAr: '',
      sku: product.sku, barcode: product.barcode || '', categoryId: '', price: product.price,
      cost: product.cost, hasVariants: product.variants > 0, variants: [], 
      selectedSizes: [], selectedColors: [],
      stock: product.stock,
      reorderPoint: 5, status: product.status === 'inactive' ? 'inactive' : 'active',
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
    setSelectedProductForVariants({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      sku: product.sku,
      image: product.image
    });
    setShowVariantsModal(true);
  };
  const handleSaveProduct = () => { toast({ title: language === 'ar' ? 'تم الحفظ' : 'Saved' }); refetch(); };
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
              <TabsList className="h-9 bg-muted/50 p-1">
                <TabsTrigger value="products" className="flex items-center gap-1.5 text-xs px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Package size={14} />
                  {language === 'ar' ? 'قائمة المنتجات' : 'Product List'}
                </TabsTrigger>
                <TabsTrigger value="variants" className="flex items-center gap-1.5 text-xs px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Palette size={14} />
                  {language === 'ar' ? 'المقاسات والألوان' : 'Sizes & Colors'}
                </TabsTrigger>
                <TabsTrigger value="import" className="flex items-center gap-1.5 text-xs px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileSpreadsheet size={14} />
                  {language === 'ar' ? 'استيراد' : 'Import'}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* إدارة المخزون */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground px-1">
                {language === 'ar' ? 'إدارة المخزون' : 'Stock Management'}
              </span>
              <TabsList className="h-9 bg-muted/50 p-1">
                <TabsTrigger value="transfers" className="flex items-center gap-1.5 text-xs px-3 data-[state=active]:bg-chart-2 data-[state=active]:text-white">
                  <ArrowRightLeft size={14} />
                  {language === 'ar' ? 'التحويلات' : 'Transfers'}
                </TabsTrigger>
                <TabsTrigger value="count" className="flex items-center gap-1.5 text-xs px-3 data-[state=active]:bg-chart-2 data-[state=active]:text-white">
                  <ClipboardList size={14} />
                  {language === 'ar' ? 'الجرد' : 'Count'}
                </TabsTrigger>
                <TabsTrigger value="opening" className="flex items-center gap-1.5 text-xs px-3 data-[state=active]:bg-chart-2 data-[state=active]:text-white">
                  <Wallet size={14} />
                  {language === 'ar' ? 'أول المدة' : 'Opening'}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* التقارير والمراقبة */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground px-1">
                {language === 'ar' ? 'التقارير والمراقبة' : 'Reports & Monitoring'}
              </span>
              <TabsList className="h-9 bg-muted/50 p-1">
                <TabsTrigger value="reports" className="flex items-center gap-1.5 text-xs px-3 data-[state=active]:bg-chart-3 data-[state=active]:text-white">
                  <BarChart3 size={14} />
                  {language === 'ar' ? 'التقارير' : 'Reports'}
                </TabsTrigger>
                <TabsTrigger value="movements" className="flex items-center gap-1.5 text-xs px-3 data-[state=active]:bg-chart-3 data-[state=active]:text-white">
                  <ArrowUpDown size={14} />
                  {language === 'ar' ? 'الحركات' : 'Movements'}
                </TabsTrigger>
                <TabsTrigger value="alerts" className="flex items-center gap-1.5 text-xs px-3 data-[state=active]:bg-chart-3 data-[state=active]:text-white">
                  <Bell size={14} />
                  {language === 'ar' ? 'التنبيهات' : 'Alerts'}
                </TabsTrigger>
              </TabsList>
            </div>
          </div>

          <TabsContent value="products" className="flex-1 flex flex-col mt-4">
            {/* Actions Bar */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Button variant="outline" size="sm" onClick={() => setShowBarcodeScanner(true)}><ScanBarcode size={16} className="me-2" />{language === 'ar' ? 'مسح الباركود' : 'Scan'}</Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectedProductForPrint(null); setShowBarcodePrinter(true); }}><Printer size={16} className="me-2" />{language === 'ar' ? 'طباعة' : 'Print'}</Button>
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
                  {/* Search */}
                  <div className="col-span-2 md:col-span-1">
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                      <Input 
                        placeholder={language === 'ar' ? 'بحث...' : 'Search...'} 
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

                  {/* Price Range Filter */}
                  <Select value={priceRange} onValueChange={setPriceRange}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={language === 'ar' ? 'السعر' : 'Price'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{language === 'ar' ? 'جميع الأسعار' : 'All Prices'}</SelectItem>
                      <SelectItem value="0-10000">{language === 'ar' ? 'أقل من 10,000' : 'Under 10,000'}</SelectItem>
                      <SelectItem value="10000-50000">10,000 - 50,000</SelectItem>
                      <SelectItem value="50000-100000">50,000 - 100,000</SelectItem>
                      <SelectItem value="100000+">{language === 'ar' ? 'أكثر من 100,000' : 'Over 100,000'}</SelectItem>
                    </SelectContent>
                  </Select>
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

          <TabsContent value="transfers" className="flex-1 mt-4"><StockTransfer /></TabsContent>
          <TabsContent value="reports" className="flex-1 mt-4"><InventoryReports /></TabsContent>
          <TabsContent value="alerts" className="flex-1 mt-4"><LowStockAlerts /></TabsContent>
          <TabsContent value="count" className="flex-1 mt-4"><InventoryCount /></TabsContent>
          <TabsContent value="movements" className="flex-1 mt-4"><InventoryMovements /></TabsContent>
          <TabsContent value="opening" className="flex-1 mt-4"><OpeningBalances /></TabsContent>
          <TabsContent value="import" className="flex-1 mt-4"><ExcelImport /></TabsContent>
          <TabsContent value="variants" className="flex-1 mt-4"><SizeColorManager /></TabsContent>
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
