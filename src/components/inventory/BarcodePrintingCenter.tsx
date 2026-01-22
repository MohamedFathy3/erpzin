import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import JsBarcode from 'jsbarcode';
import { 
  Printer, 
  Plus, 
  Minus, 
  Trash2, 
  Search,
  Settings2,
  Eye,
  Download,
  LayoutGrid,
  Type,
  Barcode,
  Tag,
  Package,
  Save,
  RotateCcw
} from 'lucide-react';

interface PrintProduct {
  id: string;
  name: string;
  nameAr: string;
  sku: string;
  barcode: string;
  price: number;
  quantity: number;
  isVariant?: boolean;
  variantInfo?: string;
  variantInfoAr?: string;
}

interface ProductVariant {
  id: string;
  sku: string;
  barcode: string | null;
  stock: number;
  price_adjustment: number | null;
  size?: { id: string; name: string; name_ar: string | null; code: string } | null;
  color?: { id: string; name: string; name_ar: string | null; hex_code: string | null } | null;
}

interface LabelDesign {
  width: number;
  height: number;
  showProductName: boolean;
  showPrice: boolean;
  showSku: boolean;
  showBarcode: boolean;
  fontSize: number;
  barcodeHeight: number;
  barcodeWidth: number;
  padding: number;
  borderEnabled: boolean;
  companyName: string;
  showCompanyName: boolean;
}

interface PrinterConfig {
  type: 'thermal' | 'inkjet' | 'laser';
  paperWidth: number;
  paperHeight: number;
  dpi: number;
  labelsPerRow: number;
  marginTop: number;
  marginLeft: number;
  gapX: number;
  gapY: number;
}

const defaultDesign: LabelDesign = {
  width: 50,
  height: 30,
  showProductName: true,
  showPrice: true,
  showSku: true,
  showBarcode: true,
  fontSize: 10,
  barcodeHeight: 40,
  barcodeWidth: 1.5,
  padding: 4,
  borderEnabled: false,
  companyName: '',
  showCompanyName: false
};

const defaultPrinterConfig: PrinterConfig = {
  type: 'thermal',
  paperWidth: 100,
  paperHeight: 150,
  dpi: 203,
  labelsPerRow: 2,
  marginTop: 5,
  marginLeft: 5,
  gapX: 3,
  gapY: 3
};

const printerPresets = {
  thermal_58mm: { type: 'thermal' as const, paperWidth: 58, paperHeight: 40, dpi: 203, labelsPerRow: 1, marginTop: 2, marginLeft: 2, gapX: 0, gapY: 2 },
  thermal_80mm: { type: 'thermal' as const, paperWidth: 80, paperHeight: 50, dpi: 203, labelsPerRow: 1, marginTop: 3, marginLeft: 3, gapX: 0, gapY: 3 },
  thermal_100mm: { type: 'thermal' as const, paperWidth: 100, paperHeight: 60, dpi: 300, labelsPerRow: 2, marginTop: 5, marginLeft: 5, gapX: 5, gapY: 5 },
  a4_inkjet: { type: 'inkjet' as const, paperWidth: 210, paperHeight: 297, dpi: 300, labelsPerRow: 3, marginTop: 10, marginLeft: 10, gapX: 5, gapY: 5 },
  a4_laser: { type: 'laser' as const, paperWidth: 210, paperHeight: 297, dpi: 600, labelsPerRow: 3, marginTop: 10, marginLeft: 10, gapX: 5, gapY: 5 }
};

const BarcodePrintingCenter: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [selectedProducts, setSelectedProducts] = useState<PrintProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [design, setDesign] = useState<LabelDesign>(defaultDesign);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(defaultPrinterConfig);
  const [activeTab, setActiveTab] = useState('products');
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { data: products = [] } = useQuery({
    queryKey: ['barcode-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, name_ar, sku, barcode, price, has_variants')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch product variants
  const { data: productVariants = [] } = useQuery({
    queryKey: ['barcode-product-variants'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id,
          product_id,
          sku,
          barcode,
          stock,
          price_adjustment,
          size:sizes(id, name, name_ar, code),
          color:colors(id, name, name_ar, hex_code)
        `)
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Create a map of product id to its variants
  const productVariantsMap = React.useMemo(() => {
    const map = new Map<string, any[]>();
    productVariants.forEach(v => {
      const list = map.get(v.product_id) || [];
      list.push(v);
      map.set(v.product_id, list);
    });
    return map;
  }, [productVariants]);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.name_ar && p.name_ar.includes(searchQuery)) ||
    p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchQuery))
  );

  const handleAddProduct = (product: typeof products[0], variant?: any) => {
    const productId = variant ? `${product.id}-${variant.id}` : product.id;
    const existing = selectedProducts.find(p => p.id === productId);
    
    if (existing) {
      setSelectedProducts(prev => 
        prev.map(p => p.id === productId ? { ...p, quantity: p.quantity + 1 } : p)
      );
    } else {
      const variantInfo = variant 
        ? [variant.size?.name, variant.color?.name].filter(Boolean).join(' - ')
        : undefined;
      const variantInfoAr = variant 
        ? [variant.size?.name_ar || variant.size?.name, variant.color?.name_ar || variant.color?.name].filter(Boolean).join(' - ')
        : undefined;
      
      const price = variant 
        ? product.price + (variant.price_adjustment || 0)
        : product.price;
      
      setSelectedProducts(prev => [...prev, {
        id: productId,
        name: product.name,
        nameAr: product.name_ar || product.name,
        sku: variant?.sku || product.sku,
        barcode: variant?.barcode || variant?.sku || product.barcode || product.sku,
        price: price,
        quantity: 1,
        isVariant: !!variant,
        variantInfo,
        variantInfoAr
      }]);
    }
    
    const displayName = isRTL ? product.name_ar || product.name : product.name;
    const variantDisplay = variant 
      ? ` (${isRTL ? (variant.size?.name_ar || variant.size?.name || '') : (variant.size?.name || '')} ${isRTL ? (variant.color?.name_ar || variant.color?.name || '') : (variant.color?.name || '')})`
      : '';
    
    toast({
      title: isRTL ? 'تمت الإضافة' : 'Added',
      description: `${displayName}${variantDisplay}`
    });
  };

  const handleRemoveProduct = (id: string) => {
    setSelectedProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleQuantityChange = (id: string, delta: number) => {
    setSelectedProducts(prev => 
      prev.map(p => {
        if (p.id === id) {
          const newQty = Math.max(1, p.quantity + delta);
          return { ...p, quantity: newQty };
        }
        return p;
      })
    );
  };

  const handleQuantityInput = (id: string, value: string) => {
    const qty = parseInt(value) || 1;
    setSelectedProducts(prev => 
      prev.map(p => p.id === id ? { ...p, quantity: Math.max(1, qty) } : p)
    );
  };

  const totalLabels = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);

  const applyPreset = (preset: keyof typeof printerPresets) => {
    setPrinterConfig(printerPresets[preset]);
    toast({ title: isRTL ? 'تم تطبيق الإعداد' : 'Preset Applied' });
  };

  const resetDesign = () => {
    setDesign(defaultDesign);
    toast({ title: isRTL ? 'تم إعادة التصميم' : 'Design Reset' });
  };

  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      toast({ title: isRTL ? 'لا توجد منتجات' : 'No products selected', variant: 'destructive' });
      return;
    }

    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return;

    const labels: string[] = [];
    selectedProducts.forEach(product => {
      for (let i = 0; i < product.quantity; i++) {
        const productLabel = product.isVariant 
          ? `${isRTL ? product.nameAr : product.name} (${isRTL ? product.variantInfoAr : product.variantInfo})`
          : (isRTL ? product.nameAr : product.name);
        
        labels.push(`
          <div class="label" style="
            width: ${design.width}mm;
            height: ${design.height}mm;
            padding: ${design.padding}mm;
            border: ${design.borderEnabled ? '1px solid #333' : 'none'};
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            page-break-inside: avoid;
            box-sizing: border-box;
            margin: ${printerConfig.gapY / 2}mm ${printerConfig.gapX / 2}mm;
          ">
            ${design.showCompanyName && design.companyName ? `<div style="font-size: ${design.fontSize - 2}px; font-weight: 600; margin-bottom: 2px;">${design.companyName}</div>` : ''}
            ${design.showProductName ? `<div style="font-size: ${design.fontSize}px; font-weight: 600; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px;">${productLabel}</div>` : ''}
            ${design.showBarcode ? `<canvas id="bc-${product.id.replace(/-/g, '_')}-${i}"></canvas>` : ''}
            ${design.showSku && !design.showBarcode ? `<div style="font-size: ${design.fontSize - 1}px; font-family: monospace;">${product.sku}</div>` : ''}
            ${design.showPrice ? `<div style="font-size: ${design.fontSize + 2}px; font-weight: bold; margin-top: 2px;">${product.price.toLocaleString()} YER</div>` : ''}
          </div>
        `);
      }
    });

    const labelsHtml = labels.join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
        <head>
          <title>${isRTL ? 'طباعة الباركود' : 'Print Barcodes'}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: Arial, sans-serif; 
              padding: ${printerConfig.marginTop}mm ${printerConfig.marginLeft}mm;
            }
            .labels-container {
              display: flex;
              flex-wrap: wrap;
              justify-content: flex-start;
            }
            @media print {
              .no-print { display: none !important; }
              body { padding: ${printerConfig.marginTop}mm ${printerConfig.marginLeft}mm; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 15px; padding: 10px; background: #f0f0f0; border-radius: 8px;">
            <button onclick="window.print()" style="padding: 12px 24px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600;">
              ${isRTL ? '🖨️ طباعة الملصقات' : '🖨️ Print Labels'}
            </button>
            <span style="margin: 0 15px; color: #666;">${isRTL ? `إجمالي الملصقات: ${totalLabels}` : `Total Labels: ${totalLabels}`}</span>
          </div>
          <div class="labels-container">
            ${labelsHtml}
          </div>
          <script>
            ${selectedProducts.map((product, pIndex) => 
              Array.from({ length: product.quantity }, (_, i) => `
                try {
                  JsBarcode("#bc-${product.id.replace(/-/g, '_')}-${i}", "${product.barcode}", {
                    format: "CODE128",
                    width: ${design.barcodeWidth},
                    height: ${design.barcodeHeight},
                    displayValue: true,
                    fontSize: ${design.fontSize - 2},
                    margin: 2,
                    textMargin: 1
                  });
                } catch(e) { console.error(e); }
              `).join('')
            ).join('')}
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();

    toast({
      title: isRTL ? 'جاري الطباعة' : 'Printing',
      description: isRTL ? `${totalLabels} ملصق` : `${totalLabels} labels`
    });
  };

  // Generate preview barcode
  useEffect(() => {
    if (canvasRef.current && selectedProducts.length > 0) {
      try {
        JsBarcode(canvasRef.current, selectedProducts[0].barcode, {
          format: 'CODE128',
          width: design.barcodeWidth,
          height: design.barcodeHeight,
          displayValue: true,
          fontSize: design.fontSize - 2,
          margin: 2
        });
      } catch (e) {
        console.error('Barcode preview error:', e);
      }
    }
  }, [selectedProducts, design]);

  const t = {
    title: isRTL ? 'مركز طباعة الباركود' : 'Barcode Printing Center',
    products: isRTL ? 'المنتجات' : 'Products',
    design: isRTL ? 'التصميم' : 'Design',
    printer: isRTL ? 'الطابعة' : 'Printer',
    preview: isRTL ? 'معاينة' : 'Preview',
    search: isRTL ? 'بحث عن منتج...' : 'Search products...',
    selectedProducts: isRTL ? 'المنتجات المختارة' : 'Selected Products',
    noProducts: isRTL ? 'لم يتم اختيار منتجات' : 'No products selected',
    addProducts: isRTL ? 'أضف منتجات من القائمة' : 'Add products from the list',
    totalLabels: isRTL ? 'إجمالي الملصقات' : 'Total Labels',
    print: isRTL ? 'طباعة' : 'Print',
    labelSize: isRTL ? 'حجم الملصق' : 'Label Size',
    width: isRTL ? 'العرض' : 'Width',
    height: isRTL ? 'الارتفاع' : 'Height',
    showName: isRTL ? 'إظهار الاسم' : 'Show Name',
    showPrice: isRTL ? 'إظهار السعر' : 'Show Price',
    showSku: isRTL ? 'إظهار الرمز' : 'Show SKU',
    showBarcode: isRTL ? 'إظهار الباركود' : 'Show Barcode',
    fontSize: isRTL ? 'حجم الخط' : 'Font Size',
    barcodeHeight: isRTL ? 'ارتفاع الباركود' : 'Barcode Height',
    barcodeWidth: isRTL ? 'عرض الخط' : 'Line Width',
    padding: isRTL ? 'الهوامش' : 'Padding',
    border: isRTL ? 'إطار' : 'Border',
    companyName: isRTL ? 'اسم الشركة' : 'Company Name',
    showCompany: isRTL ? 'إظهار الشركة' : 'Show Company',
    printerType: isRTL ? 'نوع الطابعة' : 'Printer Type',
    thermal: isRTL ? 'حرارية' : 'Thermal',
    inkjet: isRTL ? 'نافثة الحبر' : 'Inkjet',
    laser: isRTL ? 'ليزر' : 'Laser',
    presets: isRTL ? 'إعدادات مسبقة' : 'Presets',
    paperSize: isRTL ? 'حجم الورق' : 'Paper Size',
    labelsPerRow: isRTL ? 'ملصقات بالصف' : 'Labels/Row',
    margins: isRTL ? 'الهوامش' : 'Margins',
    gaps: isRTL ? 'الفجوات' : 'Gaps',
    reset: isRTL ? 'إعادة تعيين' : 'Reset',
    mm: isRTL ? 'مم' : 'mm',
    px: isRTL ? 'بكسل' : 'px'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
            <Printer className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
            <p className="text-sm text-muted-foreground">
              {isRTL ? 'إنشاء وطباعة ملصقات الباركود للمنتجات' : 'Create and print barcode labels for products'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-base px-3 py-1.5">
            <Tag className="h-4 w-4 me-2" />
            {t.totalLabels}: <span className="font-bold ms-1">{totalLabels}</span>
          </Badge>
          <Button 
            onClick={handlePrint} 
            disabled={selectedProducts.length === 0}
            className="gradient-success text-white"
          >
            <Printer className="h-4 w-4 me-2" />
            {t.print}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Products Selection */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 h-11 bg-muted/60">
              <TabsTrigger value="products" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Package className="h-4 w-4 me-2" />
                {t.products}
              </TabsTrigger>
              <TabsTrigger value="design" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LayoutGrid className="h-4 w-4 me-2" />
                {t.design}
              </TabsTrigger>
              <TabsTrigger value="printer" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Settings2 className="h-4 w-4 me-2" />
                {t.printer}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ps-10"
                />
              </div>

              {/* Products List */}
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[350px]">
                    <div className="divide-y divide-border">
                      {filteredProducts.map(product => {
                        const variants = productVariantsMap.get(product.id) || [];
                        const hasVariants = product.has_variants && variants.length > 0;
                        
                        return (
                          <div key={product.id} className="border-b border-border last:border-0">
                            {/* Main Product Row */}
                            <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-foreground truncate">
                                    {isRTL ? product.name_ar || product.name : product.name}
                                  </p>
                                  {hasVariants && (
                                    <Badge variant="secondary" className="text-xs">
                                      {variants.length} {isRTL ? 'متغيرات' : 'variants'}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="font-mono">{product.sku}</span>
                                  <span>{product.price?.toLocaleString()} YER</span>
                                </div>
                              </div>
                              {!hasVariants && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleAddProduct(product)}
                                  className="shrink-0"
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            
                            {/* Variants List */}
                            {hasVariants && (
                              <div className="ps-6 pe-3 pb-2 space-y-1">
                                {variants.map((variant: any) => {
                                  const variantName = [
                                    isRTL ? (variant.size?.name_ar || variant.size?.name) : variant.size?.name,
                                    isRTL ? (variant.color?.name_ar || variant.color?.name) : variant.color?.name
                                  ].filter(Boolean).join(' - ');
                                  
                                  return (
                                    <div
                                      key={variant.id}
                                      className="flex items-center justify-between py-2 px-3 bg-muted/30 rounded-lg hover:bg-muted/60 transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        {variant.color?.hex_code && (
                                          <div
                                            className="w-4 h-4 rounded-full border border-border"
                                            style={{ backgroundColor: variant.color.hex_code }}
                                          />
                                        )}
                                        <div>
                                          <p className="text-sm font-medium">{variantName || variant.sku}</p>
                                          <p className="text-xs text-muted-foreground font-mono">{variant.sku}</p>
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleAddProduct(product, variant)}
                                        className="h-7"
                                      >
                                        <Plus className="h-3 w-3 me-1" />
                                        {isRTL ? 'إضافة' : 'Add'}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Selected Products */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    {t.selectedProducts} ({selectedProducts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>{t.noProducts}</p>
                      <p className="text-sm">{t.addProducts}</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {selectedProducts.map(product => (
                          <div
                            key={product.id}
                            className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium truncate">
                                  {isRTL ? product.nameAr : product.name}
                                </p>
                                {product.isVariant && (
                                  <Badge variant="outline" className="text-xs">
                                    {isRTL ? product.variantInfoAr : product.variantInfo}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground font-mono">{product.sku}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(product.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min={1}
                                value={product.quantity}
                                onChange={(e) => handleQuantityInput(product.id, e.target.value)}
                                className="w-16 h-8 text-center"
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => handleQuantityChange(product.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => handleRemoveProduct(product.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="design" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t.labelSize}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={resetDesign}>
                      <RotateCcw className="h-4 w-4 me-1" />
                      {t.reset}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.width} ({t.mm})</Label>
                      <Input
                        type="number"
                        value={design.width}
                        onChange={(e) => setDesign(d => ({ ...d, width: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.height} ({t.mm})</Label>
                      <Input
                        type="number"
                        value={design.height}
                        onChange={(e) => setDesign(d => ({ ...d, height: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>{t.showName}</Label>
                      <Switch
                        checked={design.showProductName}
                        onCheckedChange={(v) => setDesign(d => ({ ...d, showProductName: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{t.showPrice}</Label>
                      <Switch
                        checked={design.showPrice}
                        onCheckedChange={(v) => setDesign(d => ({ ...d, showPrice: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{t.showSku}</Label>
                      <Switch
                        checked={design.showSku}
                        onCheckedChange={(v) => setDesign(d => ({ ...d, showSku: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{t.showBarcode}</Label>
                      <Switch
                        checked={design.showBarcode}
                        onCheckedChange={(v) => setDesign(d => ({ ...d, showBarcode: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>{t.border}</Label>
                      <Switch
                        checked={design.borderEnabled}
                        onCheckedChange={(v) => setDesign(d => ({ ...d, borderEnabled: v }))}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{t.fontSize}</Label>
                        <span className="text-sm text-muted-foreground">{design.fontSize}{t.px}</span>
                      </div>
                      <Slider
                        value={[design.fontSize]}
                        onValueChange={([v]) => setDesign(d => ({ ...d, fontSize: v }))}
                        min={6}
                        max={20}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{t.barcodeHeight}</Label>
                        <span className="text-sm text-muted-foreground">{design.barcodeHeight}{t.px}</span>
                      </div>
                      <Slider
                        value={[design.barcodeHeight]}
                        onValueChange={([v]) => setDesign(d => ({ ...d, barcodeHeight: v }))}
                        min={20}
                        max={100}
                        step={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{t.barcodeWidth}</Label>
                        <span className="text-sm text-muted-foreground">{design.barcodeWidth}</span>
                      </div>
                      <Slider
                        value={[design.barcodeWidth * 10]}
                        onValueChange={([v]) => setDesign(d => ({ ...d, barcodeWidth: v / 10 }))}
                        min={5}
                        max={30}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>{t.padding}</Label>
                        <span className="text-sm text-muted-foreground">{design.padding}{t.mm}</span>
                      </div>
                      <Slider
                        value={[design.padding]}
                        onValueChange={([v]) => setDesign(d => ({ ...d, padding: v }))}
                        min={0}
                        max={10}
                        step={1}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>{t.showCompany}</Label>
                      <Switch
                        checked={design.showCompanyName}
                        onCheckedChange={(v) => setDesign(d => ({ ...d, showCompanyName: v }))}
                      />
                    </div>
                    {design.showCompanyName && (
                      <Input
                        placeholder={t.companyName}
                        value={design.companyName}
                        onChange={(e) => setDesign(d => ({ ...d, companyName: e.target.value }))}
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="printer" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t.presets}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={() => applyPreset('thermal_58mm')}>
                      {isRTL ? 'حرارية 58مم' : 'Thermal 58mm'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => applyPreset('thermal_80mm')}>
                      {isRTL ? 'حرارية 80مم' : 'Thermal 80mm'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => applyPreset('thermal_100mm')}>
                      {isRTL ? 'حرارية 100مم' : 'Thermal 100mm'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => applyPreset('a4_inkjet')}>
                      {isRTL ? 'A4 نافثة' : 'A4 Inkjet'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => applyPreset('a4_laser')}>
                      {isRTL ? 'A4 ليزر' : 'A4 Laser'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t.printerType}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select
                    value={printerConfig.type}
                    onValueChange={(v) => setPrinterConfig(c => ({ ...c, type: v as PrinterConfig['type'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="thermal">{t.thermal}</SelectItem>
                      <SelectItem value="inkjet">{t.inkjet}</SelectItem>
                      <SelectItem value="laser">{t.laser}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.paperSize} ({t.width})</Label>
                      <Input
                        type="number"
                        value={printerConfig.paperWidth}
                        onChange={(e) => setPrinterConfig(c => ({ ...c, paperWidth: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.paperSize} ({t.height})</Label>
                      <Input
                        type="number"
                        value={printerConfig.paperHeight}
                        onChange={(e) => setPrinterConfig(c => ({ ...c, paperHeight: Number(e.target.value) }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.labelsPerRow}</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={printerConfig.labelsPerRow}
                        onChange={(e) => setPrinterConfig(c => ({ ...c, labelsPerRow: Number(e.target.value) }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>DPI</Label>
                      <Select
                        value={String(printerConfig.dpi)}
                        onValueChange={(v) => setPrinterConfig(c => ({ ...c, dpi: Number(v) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="203">203 DPI</SelectItem>
                          <SelectItem value="300">300 DPI</SelectItem>
                          <SelectItem value="600">600 DPI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.margins} (Top/Left)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="Top"
                          value={printerConfig.marginTop}
                          onChange={(e) => setPrinterConfig(c => ({ ...c, marginTop: Number(e.target.value) }))}
                        />
                        <Input
                          type="number"
                          placeholder="Left"
                          value={printerConfig.marginLeft}
                          onChange={(e) => setPrinterConfig(c => ({ ...c, marginLeft: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.gaps} (X/Y)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          placeholder="X"
                          value={printerConfig.gapX}
                          onChange={(e) => setPrinterConfig(c => ({ ...c, gapX: Number(e.target.value) }))}
                        />
                        <Input
                          type="number"
                          placeholder="Y"
                          value={printerConfig.gapY}
                          onChange={(e) => setPrinterConfig(c => ({ ...c, gapY: Number(e.target.value) }))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel - Preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {t.preview}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                ref={previewRef}
                className="bg-white border-2 border-dashed border-border rounded-lg p-4 flex items-center justify-center min-h-[200px]"
              >
                {selectedProducts.length > 0 ? (
                  <div 
                    className="text-center"
                    style={{
                      width: `${design.width * 3}px`,
                      minHeight: `${design.height * 3}px`,
                      padding: `${design.padding * 3}px`,
                      border: design.borderEnabled ? '1px solid #333' : 'none',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {design.showCompanyName && design.companyName && (
                      <p style={{ fontSize: `${design.fontSize - 2}px`, fontWeight: 600, marginBottom: '4px' }}>
                        {design.companyName}
                      </p>
                    )}
                    {design.showProductName && (
                      <p style={{ fontSize: `${design.fontSize}px`, fontWeight: 600, marginBottom: '4px' }}>
                        {isRTL ? selectedProducts[0].nameAr : selectedProducts[0].name}
                      </p>
                    )}
                    {design.showBarcode && (
                      <canvas ref={canvasRef} className="mx-auto" />
                    )}
                    {design.showSku && !design.showBarcode && (
                      <p style={{ fontSize: `${design.fontSize - 1}px`, fontFamily: 'monospace' }}>
                        {selectedProducts[0].sku}
                      </p>
                    )}
                    {design.showPrice && (
                      <p style={{ fontSize: `${design.fontSize + 2}px`, fontWeight: 'bold', marginTop: '4px' }}>
                        {selectedProducts[0].price.toLocaleString()} YER
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground">
                    <Barcode className="h-16 w-16 mx-auto mb-3 opacity-20" />
                    <p>{isRTL ? 'اختر منتج للمعاينة' : 'Select a product to preview'}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.labelSize}:</span>
                  <span className="font-medium">{design.width} × {design.height} {t.mm}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.printerType}:</span>
                  <span className="font-medium capitalize">{printerConfig.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.labelsPerRow}:</span>
                  <span className="font-medium">{printerConfig.labelsPerRow}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BarcodePrintingCenter;
