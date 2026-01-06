import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import CategoryTree, { Category } from '@/components/inventory/CategoryTree';
import ProductList, { Product } from '@/components/inventory/ProductList';
import ProductForm, { ProductFormData } from '@/components/inventory/ProductForm';
import { BarcodeScanner, BarcodeLabelPrinter } from '@/components/inventory/BarcodeSystem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Download, Upload, Filter, ScanBarcode, Printer } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Mock categories
const mockCategories: Category[] = [
  {
    id: 'boys',
    name: 'Boys',
    nameAr: 'أولاد',
    parentId: null,
    productCount: 45,
    children: [
      { id: 'boys-pants', name: 'Pants', nameAr: 'بناطيل', parentId: 'boys', productCount: 20, children: [
        { id: 'boys-jeans', name: 'Jeans', nameAr: 'جينز', parentId: 'boys-pants', productCount: 12, children: [] },
        { id: 'boys-shorts', name: 'Shorts', nameAr: 'شورتات', parentId: 'boys-pants', productCount: 8, children: [] }
      ]},
      { id: 'boys-shirts', name: 'Shirts', nameAr: 'قمصان', parentId: 'boys', productCount: 15, children: [] },
      { id: 'boys-tshirts', name: 'T-Shirts', nameAr: 'تيشيرتات', parentId: 'boys', productCount: 10, children: [] }
    ]
  },
  {
    id: 'girls',
    name: 'Girls',
    nameAr: 'بنات',
    parentId: null,
    productCount: 52,
    children: [
      { id: 'girls-dresses', name: 'Dresses', nameAr: 'فساتين', parentId: 'girls', productCount: 25, children: [] },
      { id: 'girls-skirts', name: 'Skirts', nameAr: 'تنانير', parentId: 'girls', productCount: 15, children: [] },
      { id: 'girls-tops', name: 'Tops', nameAr: 'بلايز', parentId: 'girls', productCount: 12, children: [] }
    ]
  },
  {
    id: 'women',
    name: 'Women',
    nameAr: 'نساء',
    parentId: null,
    productCount: 78,
    children: [
      { id: 'women-dresses', name: 'Dresses', nameAr: 'فساتين', parentId: 'women', productCount: 30, children: [] },
      { id: 'women-pants', name: 'Pants', nameAr: 'بناطيل', parentId: 'women', productCount: 25, children: [] },
      { id: 'women-blouses', name: 'Blouses', nameAr: 'بلوزات', parentId: 'women', productCount: 23, children: [] }
    ]
  },
  {
    id: 'men',
    name: 'Men',
    nameAr: 'رجال',
    parentId: null,
    productCount: 65,
    children: [
      { id: 'men-shirts', name: 'Shirts', nameAr: 'قمصان', parentId: 'men', productCount: 35, children: [] },
      { id: 'men-pants', name: 'Pants', nameAr: 'بناطيل', parentId: 'men', productCount: 30, children: [] }
    ]
  },
  {
    id: 'accessories',
    name: 'Accessories',
    nameAr: 'إكسسوارات',
    parentId: null,
    productCount: 40,
    children: [
      { id: 'acc-bags', name: 'Bags', nameAr: 'حقائب', parentId: 'accessories', productCount: 20, children: [] },
      { id: 'acc-belts', name: 'Belts', nameAr: 'أحزمة', parentId: 'accessories', productCount: 20, children: [] }
    ]
  }
];

const Inventory: React.FC = () => {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductFormData | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [showBarcodePrinter, setShowBarcodePrinter] = useState(false);
  const [selectedProductForPrint, setSelectedProductForPrint] = useState<any>(null);

  // Fetch products from database
  const { data: dbProducts = [], refetch } = useQuery({
    queryKey: ['inventory-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name, name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Transform DB products to match component interface
  const products: Product[] = dbProducts.map(p => ({
    id: p.id,
    name: p.name,
    nameAr: p.name_ar || p.name,
    sku: p.sku,
    barcode: p.barcode,
    category: p.categories?.name || 'Uncategorized',
    categoryAr: p.categories?.name_ar || 'غير مصنف',
    price: Number(p.price),
    cost: Number(p.cost || 0),
    stock: p.stock,
    variants: 0,
    status: !p.is_active ? 'inactive' : p.stock === 0 ? 'out_of_stock' : p.stock <= (p.min_stock || 5) ? 'low_stock' : 'active'
  }));

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.nameAr.includes(searchQuery) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.barcode && product.barcode.includes(searchQuery));
    
    return matchesSearch;
  });

  const handleAddProduct = () => {
    setEditProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditProduct({
      id: product.id,
      name: product.name,
      nameAr: product.nameAr,
      description: '',
      descriptionAr: '',
      sku: product.sku,
      barcode: product.barcode || '',
      categoryId: '',
      price: product.price,
      cost: product.cost,
      hasVariants: product.variants > 0,
      variants: [],
      stock: product.stock,
      reorderPoint: 5,
      status: product.status === 'inactive' ? 'inactive' : 'active'
    });
    setShowProductForm(true);
  };

  const handleDeleteProduct = (productId: string) => {
    toast({
      title: language === 'ar' ? 'تم الحذف' : 'Deleted',
      description: language === 'ar' ? 'تم حذف المنتج بنجاح' : 'Product deleted successfully'
    });
    refetch();
  };

  const handleDuplicateProduct = (product: Product) => {
    toast({
      title: language === 'ar' ? 'تم النسخ' : 'Duplicated',
      description: language === 'ar' ? 'تم نسخ المنتج بنجاح' : 'Product duplicated successfully'
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

  const handleSaveProduct = (productData: ProductFormData) => {
    toast({
      title: language === 'ar' ? 'تم الحفظ' : 'Saved',
      description: language === 'ar' ? 'تم حفظ المنتج بنجاح' : 'Product saved successfully'
    });
    refetch();
  };

  const handleBarcodeProductFound = (product: any) => {
    const found = products.find(p => p.id === product.id);
    if (found) {
      handleEditProduct(found);
    }
  };

  // Products for barcode system
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
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'ar' ? 'المخزون والمنتجات' : 'Inventory & Products'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة المنتجات والتصنيفات والمتغيرات' : 'Manage products, categories, and variants'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowBarcodeScanner(true)}
            >
              <ScanBarcode size={16} className="me-2" />
              {language === 'ar' ? 'قارئ الباركود' : 'Scan Barcode'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedProductForPrint(null);
                setShowBarcodePrinter(true);
              }}
            >
              <Printer size={16} className="me-2" />
              {language === 'ar' ? 'طباعة باركود' : 'Print Barcode'}
            </Button>
            <Button variant="outline" size="sm">
              <Download size={16} className="me-2" />
              {language === 'ar' ? 'تصدير' : 'Export'}
            </Button>
            <Button variant="outline" size="sm">
              <Upload size={16} className="me-2" />
              {language === 'ar' ? 'استيراد' : 'Import'}
            </Button>
            <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90">
              <Plus size={16} className="me-2" />
              {language === 'ar' ? 'إضافة منتج' : 'Add Product'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Category Sidebar */}
          <div className="w-72 flex-shrink-0 hidden lg:block">
            <CategoryTree
              categories={mockCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onAddCategory={() => toast({ title: 'Coming soon' })}
              onEditCategory={() => toast({ title: 'Coming soon' })}
              onDeleteCategory={() => toast({ title: 'Coming soon' })}
            />
          </div>

          {/* Products Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Search & Filter Bar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  placeholder={language === 'ar' ? 'بحث بالاسم أو SKU أو الباركود...' : 'Search by name, SKU or barcode...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-10"
                />
              </div>
              <Button variant="outline" size="icon" className="lg:hidden">
                <Filter size={18} />
              </Button>
            </div>

            {/* Products Table */}
            <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
              <ProductList
                products={filteredProducts}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                onDuplicate={handleDuplicateProduct}
                onView={handleViewProduct}
                onPrintBarcode={handlePrintBarcode}
              />
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
              <span>
                {language === 'ar' 
                  ? `عرض ${filteredProducts.length} من ${products.length} منتج`
                  : `Showing ${filteredProducts.length} of ${products.length} products`
                }
              </span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled>
                  {language === 'ar' ? 'السابق' : 'Previous'}
                </Button>
                <Button variant="outline" size="sm" disabled>
                  {language === 'ar' ? 'التالي' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Form Modal */}
      <ProductForm
        isOpen={showProductForm}
        onClose={() => setShowProductForm(false)}
        onSave={handleSaveProduct}
        categories={mockCategories}
        editProduct={editProduct}
      />

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onProductFound={handleBarcodeProductFound}
        products={barcodeProducts}
      />

      {/* Barcode Printer Modal */}
      <BarcodeLabelPrinter
        isOpen={showBarcodePrinter}
        onClose={() => {
          setShowBarcodePrinter(false);
          setSelectedProductForPrint(null);
        }}
        products={barcodeProducts}
        selectedProduct={selectedProductForPrint}
      />
    </MainLayout>
  );
};

export default Inventory;
