import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import CategoryManager from '@/components/inventory/CategoryManager';
import ProductList, { Product } from '@/components/inventory/ProductList';
import ProductForm, { ProductFormData } from '@/components/inventory/ProductForm';
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
import { Plus, Search, ScanBarcode, Printer, Package, ArrowRightLeft, BarChart3, Bell, ClipboardList, ArrowUpDown, Wallet, FileSpreadsheet, Palette } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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

  const handleAddProduct = () => { setEditProduct(null); setShowProductForm(true); };
  const handleEditProduct = (product: Product) => {
    setEditProduct({
      id: product.id, name: product.name, nameAr: product.nameAr, description: '', descriptionAr: '',
      sku: product.sku, barcode: product.barcode || '', categoryId: '', price: product.price,
      cost: product.cost, hasVariants: product.variants > 0, variants: [], 
      selectedSizes: [], selectedColors: [],
      stock: product.stock,
      reorderPoint: 5, status: product.status === 'inactive' ? 'inactive' : 'active'
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
          <TabsList className="w-fit flex-wrap h-auto gap-1">
            <TabsTrigger value="products" className="flex items-center gap-1.5"><Package size={14} />{language === 'ar' ? 'المنتجات' : 'Products'}</TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-1.5"><ArrowRightLeft size={14} />{language === 'ar' ? 'نقل المخزون' : 'Transfers'}</TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5"><BarChart3 size={14} />{language === 'ar' ? 'التقارير' : 'Reports'}</TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-1.5"><Bell size={14} />{language === 'ar' ? 'التنبيهات' : 'Alerts'}</TabsTrigger>
            <TabsTrigger value="count" className="flex items-center gap-1.5"><ClipboardList size={14} />{language === 'ar' ? 'الجرد' : 'Count'}</TabsTrigger>
            <TabsTrigger value="movements" className="flex items-center gap-1.5"><ArrowUpDown size={14} />{language === 'ar' ? 'الحركات' : 'Movements'}</TabsTrigger>
            <TabsTrigger value="opening" className="flex items-center gap-1.5"><Wallet size={14} />{language === 'ar' ? 'أول المدة' : 'Opening'}</TabsTrigger>
            <TabsTrigger value="import" className="flex items-center gap-1.5"><FileSpreadsheet size={14} />{language === 'ar' ? 'استيراد' : 'Import'}</TabsTrigger>
            <TabsTrigger value="variants" className="flex items-center gap-1.5"><Palette size={14} />{language === 'ar' ? 'المقاسات والألوان' : 'Sizes & Colors'}</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="flex-1 flex flex-col mt-4">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <Button variant="outline" size="sm" onClick={() => setShowBarcodeScanner(true)}><ScanBarcode size={16} className="me-2" />{language === 'ar' ? 'مسح الباركود' : 'Scan'}</Button>
              <Button variant="outline" size="sm" onClick={() => { setSelectedProductForPrint(null); setShowBarcodePrinter(true); }}><Printer size={16} className="me-2" />{language === 'ar' ? 'طباعة' : 'Print'}</Button>
              <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90"><Plus size={16} className="me-2" />{language === 'ar' ? 'إضافة منتج' : 'Add Product'}</Button>
            </div>
            <div className="flex-1 flex gap-4 min-h-0">
              <div className="w-64 flex-shrink-0 hidden lg:block">
                <CategoryManager selectedCategory={selectedCategory} onSelectCategory={setSelectedCategory} />
              </div>
              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input placeholder={language === 'ar' ? 'بحث...' : 'Search...'} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-10" />
                  </div>
                </div>
                <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden">
                  <ProductList products={filteredProducts} onEdit={handleEditProduct} onDelete={handleDeleteProduct} onDuplicate={handleDuplicateProduct} onView={handleViewProduct} onPrintBarcode={handlePrintBarcode} />
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
    </MainLayout>
  );
};

export default Inventory;
