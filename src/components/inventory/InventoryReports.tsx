import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart3, 
  Package, 
  TrendingDown, 
  TrendingUp, 
  AlertTriangle,
  Download,
  FileText,
  Layers
} from 'lucide-react';

interface ProductVariant {
  id: string;
  sku: string;
  stock: number;
  price_adjustment: number | null;
  cost_adjustment: number | null;
  size: { id: string; name: string; name_ar: string | null } | null;
  color: { id: string; name: string; name_ar: string | null; hex_code: string | null } | null;
  product: {
    id: string;
    name: string;
    name_ar: string | null;
    sku: string;
    cost: number | null;
    price: number;
    min_stock: number | null;
  };
}

const InventoryReports = () => {
  const { language } = useLanguage();
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [reportType, setReportType] = useState<string>('stock_levels');
  const [viewMode, setViewMode] = useState<'products' | 'variants'>('products');

  const t = {
    en: {
      title: 'Inventory Reports',
      description: 'View stock levels, movements, and analytics',
      stockLevels: 'Stock Levels',
      stockMovements: 'Stock Movements',
      stockValuation: 'Stock Valuation',
      lowStock: 'Low Stock',
      allWarehouses: 'All Warehouses',
      product: 'Product',
      sku: 'SKU',
      currentStock: 'Current Stock',
      minStock: 'Min Stock',
      status: 'Status',
      value: 'Value',
      cost: 'Cost',
      totalValue: 'Total Value',
      totalProducts: 'Total Products',
      totalVariants: 'Total Variants',
      lowStockItems: 'Low Stock Items',
      outOfStock: 'Out of Stock',
      inStock: 'In Stock',
      exportPdf: 'Export PDF',
      exportExcel: 'Export Excel',
      noData: 'No data available',
      productsView: 'Products',
      variantsView: 'Variants',
      size: 'Size',
      color: 'Color',
      variant: 'Variant'
    },
    ar: {
      title: 'تقارير المخزون',
      description: 'عرض مستويات المخزون والحركات والتحليلات',
      stockLevels: 'مستويات المخزون',
      stockMovements: 'حركات المخزون',
      stockValuation: 'تقييم المخزون',
      lowStock: 'مخزون منخفض',
      allWarehouses: 'جميع المخازن',
      product: 'المنتج',
      sku: 'رمز المنتج',
      currentStock: 'المخزون الحالي',
      minStock: 'الحد الأدنى',
      status: 'الحالة',
      value: 'القيمة',
      cost: 'التكلفة',
      totalValue: 'القيمة الإجمالية',
      totalProducts: 'إجمالي المنتجات',
      totalVariants: 'إجمالي المتغيرات',
      lowStockItems: 'منتجات منخفضة المخزون',
      outOfStock: 'نفاد المخزون',
      inStock: 'متوفر',
      exportPdf: 'تصدير PDF',
      exportExcel: 'تصدير Excel',
      noData: 'لا توجد بيانات',
      productsView: 'المنتجات',
      variantsView: 'المتغيرات',
      size: 'المقاس',
      color: 'اللون',
      variant: 'المتغير'
    }
  }[language];

  // Fetch warehouses
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('warehouses').select('*').eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch products with stock data
  const { data: products = [] } = useQuery({
    queryKey: ['inventory-report-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('stock', { ascending: true });
      if (error) throw error;
      return data;
    }
  });

  // Fetch product variants with size and color data
  const { data: variants = [] } = useQuery({
    queryKey: ['inventory-report-variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id,
          sku,
          stock,
          price_adjustment,
          cost_adjustment,
          size:sizes(id, name, name_ar),
          color:colors(id, name, name_ar, hex_code),
          product:products(id, name, name_ar, sku, cost, price, min_stock)
        `)
        .eq('is_active', true)
        .order('stock', { ascending: true });
      if (error) throw error;
      return data as ProductVariant[];
    }
  });

  // Calculate statistics
  const productStats = {
    totalProducts: products.length,
    lowStockItems: products.filter(p => p.stock > 0 && p.stock <= (p.min_stock || 5)).length,
    outOfStock: products.filter(p => p.stock === 0).length,
    totalValue: products.reduce((sum, p) => sum + (Number(p.cost || 0) * p.stock), 0)
  };

  const variantStats = {
    totalVariants: variants.length,
    lowStockItems: variants.filter(v => v.stock > 0 && v.stock <= (v.product?.min_stock || 5)).length,
    outOfStock: variants.filter(v => v.stock === 0).length,
    totalValue: variants.reduce((sum, v) => {
      const baseCost = Number(v.product?.cost || 0);
      const costAdj = Number(v.cost_adjustment || 0);
      return sum + ((baseCost + costAdj) * v.stock);
    }, 0)
  };

  const stats = viewMode === 'variants' ? variantStats : productStats;

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) return { label: t.outOfStock, variant: 'destructive' as const };
    if (stock <= minStock) return { label: t.lowStock, variant: 'secondary' as const };
    return { label: t.inStock, variant: 'default' as const };
  };

  const filteredProducts = reportType === 'lowStock' 
    ? products.filter(p => p.stock <= (p.min_stock || 5))
    : products;

  const filteredVariants = reportType === 'lowStock'
    ? variants.filter(v => v.stock <= (v.product?.min_stock || 5))
    : variants;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <BarChart3 className="text-primary" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
            <p className="text-sm text-muted-foreground">{t.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download size={16} className="me-2" />
            {t.exportExcel}
          </Button>
          <Button variant="outline" size="sm">
            <FileText size={16} className="me-2" />
            {t.exportPdf}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Package className="text-blue-500" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {viewMode === 'variants' ? t.totalVariants : t.totalProducts}
                </p>
                <p className="text-2xl font-bold">
                  {viewMode === 'variants' ? variantStats.totalVariants : productStats.totalProducts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <TrendingDown className="text-amber-500" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.lowStockItems}</p>
                <p className="text-2xl font-bold">{stats.lowStockItems}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="text-red-500" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.outOfStock}</p>
                <p className="text-2xl font-bold">{stats.outOfStock}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="text-green-500" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.totalValue}</p>
                <p className="text-2xl font-bold">{stats.totalValue.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={viewMode} onValueChange={(v: 'products' | 'variants') => setViewMode(v)}>
          <SelectTrigger className="w-40">
            <Layers size={16} className="me-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="products">{t.productsView}</SelectItem>
            <SelectItem value="variants">{t.variantsView}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={reportType} onValueChange={setReportType}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stock_levels">{t.stockLevels}</SelectItem>
            <SelectItem value="lowStock">{t.lowStock}</SelectItem>
            <SelectItem value="stockValuation">{t.stockValuation}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.allWarehouses}</SelectItem>
            {warehouses.map(w => (
              <SelectItem key={w.id} value={w.id}>
                {language === 'ar' ? w.name_ar || w.name : w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Report Table */}
      <Card className="card-elevated">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Package size={18} />
            {reportType === 'lowStock' ? t.lowStock : t.stockLevels}
            {viewMode === 'variants' && ` - ${t.variantsView}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] w-full">
            <div className="min-w-[900px]">
              {viewMode === 'products' ? (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="min-w-[200px]">{t.product}</TableHead>
                      <TableHead className="min-w-[120px]">{t.sku}</TableHead>
                      <TableHead className="min-w-[100px]">{t.currentStock}</TableHead>
                      <TableHead className="min-w-[100px]">{t.minStock}</TableHead>
                      <TableHead className="min-w-[100px]">{t.cost}</TableHead>
                      <TableHead className="min-w-[120px]">{t.value}</TableHead>
                      <TableHead className="min-w-[100px]">{t.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {t.noData}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map(product => {
                        const status = getStockStatus(product.stock, product.min_stock || 5);
                        const value = Number(product.cost || 0) * product.stock;
                        return (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">
                              {language === 'ar' ? product.name_ar || product.name : product.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground font-mono text-xs">{product.sku}</TableCell>
                            <TableCell className="font-semibold">{product.stock}</TableCell>
                            <TableCell>{product.min_stock || 5}</TableCell>
                            <TableCell>{Number(product.cost || 0).toLocaleString()}</TableCell>
                            <TableCell className="font-semibold">{value.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              ) : (
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="min-w-[180px]">{t.product}</TableHead>
                      <TableHead className="min-w-[100px]">{t.size}</TableHead>
                      <TableHead className="min-w-[100px]">{t.color}</TableHead>
                      <TableHead className="min-w-[120px]">{t.sku}</TableHead>
                      <TableHead className="min-w-[80px]">{t.currentStock}</TableHead>
                      <TableHead className="min-w-[80px]">{t.cost}</TableHead>
                      <TableHead className="min-w-[100px]">{t.value}</TableHead>
                      <TableHead className="min-w-[90px]">{t.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVariants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          {t.noData}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredVariants.map(variant => {
                        const minStock = variant.product?.min_stock || 5;
                        const status = getStockStatus(variant.stock, minStock);
                        const baseCost = Number(variant.product?.cost || 0);
                        const costAdj = Number(variant.cost_adjustment || 0);
                        const totalCost = baseCost + costAdj;
                        const value = totalCost * variant.stock;
                        
                        return (
                          <TableRow key={variant.id}>
                            <TableCell className="font-medium">
                              {language === 'ar' 
                                ? variant.product?.name_ar || variant.product?.name 
                                : variant.product?.name}
                            </TableCell>
                            <TableCell>
                              {variant.size 
                                ? (language === 'ar' ? variant.size.name_ar || variant.size.name : variant.size.name)
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {variant.color?.hex_code && (
                                  <span 
                                    className="w-4 h-4 rounded-full border border-border flex-shrink-0"
                                    style={{ backgroundColor: variant.color.hex_code }}
                                  />
                                )}
                                <span>
                                  {variant.color 
                                    ? (language === 'ar' ? variant.color.name_ar || variant.color.name : variant.color.name)
                                    : '-'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground font-mono text-xs">{variant.sku}</TableCell>
                            <TableCell className="font-semibold">{variant.stock}</TableCell>
                            <TableCell>{totalCost.toLocaleString()}</TableCell>
                            <TableCell className="font-semibold">{value.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default InventoryReports;
