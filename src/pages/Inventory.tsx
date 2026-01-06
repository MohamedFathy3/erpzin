import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import CategoryTree, { Category } from '@/components/inventory/CategoryTree';
import ProductList, { Product } from '@/components/inventory/ProductList';
import ProductForm, { ProductFormData } from '@/components/inventory/ProductForm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Download, Upload, Filter } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Mock data
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

const mockProducts: Product[] = [
  { id: '1', name: 'Boys Classic Jeans', nameAr: 'جينز أولاد كلاسيك', sku: 'BJ-001', category: 'Boys > Pants > Jeans', categoryAr: 'أولاد > بناطيل > جينز', price: 4500, cost: 2800, stock: 125, variants: 18, status: 'active' },
  { id: '2', name: 'Girls Summer Dress', nameAr: 'فستان صيفي بنات', sku: 'GD-002', category: 'Girls > Dresses', categoryAr: 'بنات > فساتين', price: 6000, cost: 3500, stock: 45, variants: 12, status: 'active' },
  { id: '3', name: 'Women Elegant Blouse', nameAr: 'بلوزة نسائية أنيقة', sku: 'WB-003', category: 'Women > Blouses', categoryAr: 'نساء > بلوزات', price: 8500, cost: 5000, stock: 8, variants: 15, status: 'low_stock' },
  { id: '4', name: 'Men Formal Shirt', nameAr: 'قميص رجالي رسمي', sku: 'MS-004', category: 'Men > Shirts', categoryAr: 'رجال > قمصان', price: 7000, cost: 4200, stock: 67, variants: 24, status: 'active' },
  { id: '5', name: 'Boys Sport T-Shirt', nameAr: 'تيشيرت رياضي أولاد', sku: 'BT-005', category: 'Boys > T-Shirts', categoryAr: 'أولاد > تيشيرتات', price: 2500, cost: 1500, stock: 0, variants: 12, status: 'out_of_stock' },
  { id: '6', name: 'Girls Floral Skirt', nameAr: 'تنورة زهور بنات', sku: 'GS-006', category: 'Girls > Skirts', categoryAr: 'بنات > تنانير', price: 3800, cost: 2200, stock: 32, variants: 8, status: 'active' },
  { id: '7', name: 'Women Casual Pants', nameAr: 'بنطال نسائي كاجوال', sku: 'WP-007', category: 'Women > Pants', categoryAr: 'نساء > بناطيل', price: 5500, cost: 3300, stock: 56, variants: 20, status: 'active' },
  { id: '8', name: 'Leather Classic Belt', nameAr: 'حزام جلد كلاسيك', sku: 'AC-008', category: 'Accessories > Belts', categoryAr: 'إكسسوارات > أحزمة', price: 2000, cost: 1000, stock: 89, variants: 6, status: 'active' },
];

const Inventory: React.FC = () => {
  const { language } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductForm, setShowProductForm] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductFormData | null>(null);
  const [products, setProducts] = useState<Product[]>(mockProducts);

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === '' ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.nameAr.includes(searchQuery) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    
    // For simplicity, we're not filtering by category in mock data
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
      barcode: '',
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
    setProducts(prev => prev.filter(p => p.id !== productId));
    toast({
      title: language === 'ar' ? 'تم الحذف' : 'Deleted',
      description: language === 'ar' ? 'تم حذف المنتج بنجاح' : 'Product deleted successfully'
    });
  };

  const handleDuplicateProduct = (product: Product) => {
    const newProduct: Product = {
      ...product,
      id: Date.now().toString(),
      sku: product.sku + '-COPY',
      name: product.name + ' (Copy)',
      nameAr: product.nameAr + ' (نسخة)'
    };
    setProducts(prev => [...prev, newProduct]);
    toast({
      title: language === 'ar' ? 'تم النسخ' : 'Duplicated',
      description: language === 'ar' ? 'تم نسخ المنتج بنجاح' : 'Product duplicated successfully'
    });
  };

  const handleViewProduct = (product: Product) => {
    handleEditProduct(product);
  };

  const handleSaveProduct = (productData: ProductFormData) => {
    if (productData.id) {
      // Update existing
      setProducts(prev => prev.map(p => 
        p.id === productData.id 
          ? {
              ...p,
              name: productData.name,
              nameAr: productData.nameAr,
              sku: productData.sku,
              price: productData.price,
              cost: productData.cost,
              stock: productData.hasVariants 
                ? productData.variants.reduce((sum, v) => sum + v.stock, 0)
                : productData.stock,
              variants: productData.variants.length,
              status: productData.status === 'inactive' ? 'inactive' : 
                     (productData.stock === 0 ? 'out_of_stock' : 
                     (productData.stock <= productData.reorderPoint ? 'low_stock' : 'active'))
            }
          : p
      ));
      toast({
        title: language === 'ar' ? 'تم الحفظ' : 'Saved',
        description: language === 'ar' ? 'تم تحديث المنتج بنجاح' : 'Product updated successfully'
      });
    } else {
      // Add new
      const newProduct: Product = {
        id: Date.now().toString(),
        name: productData.name,
        nameAr: productData.nameAr,
        sku: productData.sku,
        category: 'Uncategorized',
        categoryAr: 'غير مصنف',
        price: productData.price,
        cost: productData.cost,
        stock: productData.hasVariants 
          ? productData.variants.reduce((sum, v) => sum + v.stock, 0)
          : productData.stock,
        variants: productData.variants.length,
        status: 'active'
      };
      setProducts(prev => [...prev, newProduct]);
      toast({
        title: language === 'ar' ? 'تمت الإضافة' : 'Added',
        description: language === 'ar' ? 'تم إضافة المنتج بنجاح' : 'Product added successfully'
      });
    }
  };

  return (
    <MainLayout>
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
          <div className="flex items-center gap-2">
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
                  placeholder={language === 'ar' ? 'بحث بالاسم أو SKU...' : 'Search by name or SKU...'}
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
    </MainLayout>
  );
};

export default Inventory;
