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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import JsBarcode from 'jsbarcode';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

import {
  Printer,
  Plus,
  Minus,
  Trash2,
  Search,
  Settings2,
  Eye,
  Barcode,
  Tag,
  Package,
  RotateCcw,
  Ruler,
  Palette,
  DollarSign,
  Save,
  Download,
  RefreshCw,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Monitor,
  Hash,
} from 'lucide-react';

// ==================== Types ====================
interface ProductColor {
  id: number;
  color_id: number;
  color: string;
  stock: number;
  hex_code: string;
}

interface ProductUnit {
  id: number;
  unit_id: number;
  unit_name: string;
  cost_price: string;
  sell_price: string;
  barcode: string;
  sku?: string;
  colors?: ProductColor[];
}

interface APIProduct {
  id: number;
  name: string;
  name_ar?: string;
  description: string | null;
  image_url: string | null;
  imageUrl: string;
  sku: string;
  barcode: string;
  stock: number;
  reorder_level: number;
  price: string;
  cost: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
  units?: ProductUnit[];
}

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
  selectedUnit?: ProductUnit;
  selectedColor?: ProductColor;
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

interface BarcodeSettings {
  design: LabelDesign;
  printer: PrinterConfig;
  barcodeFormat: BarcodeFormat;
}

interface VariantDisplaySettings {
  unitCardSize: 'sm' | 'md' | 'lg' | 'xl';
  showStock: boolean;
  showPriceInUnits: boolean;
  colorButtonSize: 'sm' | 'md' | 'lg';
  gridColumns: 1 | 2 | 3 | 4;
  fontSize: number;
  compactMode: boolean;
  showLivePreview: boolean;
  applyToPrint: boolean;
  printScale: number;
  // ✅ حجم أرقام الباركود (زي 0001)
  barcodeTextSize: number;
}

type BarcodeFormat = 'CODE128' | 'CODE39' | 'EAN13' | 'UPC' | 'ITF14' | 'MSI' | 'Pharmacode' | 'CODABAR';

interface BarcodeFormatOption {
  value: BarcodeFormat;
  label: string;
  labelAr: string;
  description: string;
}

const barcodeFormats: BarcodeFormatOption[] = [
  { value: 'CODE128', label: 'Code 128', labelAr: 'كود 128', description: 'يدعم أرقام وحروف - الأكثر شيوعاً' },
  { value: 'CODE39', label: 'Code 39', labelAr: 'كود 39', description: 'يدعم أرقام وحروف' },
  { value: 'EAN13', label: 'EAN-13', labelAr: 'EAN-13', description: '13 رقم - للمنتجات العالمية' },
  { value: 'UPC', label: 'UPC-A', labelAr: 'UPC-A', description: '12 رقم - للمنتجات في أمريكا' },
  { value: 'ITF14', label: 'ITF-14', labelAr: 'ITF-14', description: '14 رقم - للكرتون' },
  { value: 'CODABAR', label: 'Codabar', labelAr: 'كودابار', description: 'للمكتبات وشركات الدم' },
];

// ========== إعدادات فارغة ==========
const emptyDesign: LabelDesign = {
  width: 60,
  height: 40,
  showProductName: true,
  showPrice: true,
  showSku: false,
  showBarcode: true,
  fontSize: 12,
  barcodeHeight: 40,
  barcodeWidth: 2,
  padding: 4,
  borderEnabled: true,
  companyName: '',
  showCompanyName: false
};

const emptyPrinterConfig: PrinterConfig = {
  type: 'thermal',
  paperWidth: 80,
  paperHeight: 50,
  dpi: 203,
  labelsPerRow: 1,
  marginTop: 3,
  marginLeft: 3,
  gapX: 0,
  gapY: 3
};

const defaultVariantDisplaySettings: VariantDisplaySettings = {
  unitCardSize: 'md',
  showStock: true,
  showPriceInUnits: true,
  colorButtonSize: 'md',
  gridColumns: 2,
  fontSize: 14,
  compactMode: false,
  showLivePreview: true,
  applyToPrint: true,
  printScale: 100,
  barcodeTextSize: 14,
};

const printerPresets = {
  thermal_58mm: { type: 'thermal' as const, paperWidth: 58, paperHeight: 40, dpi: 203, labelsPerRow: 1, marginTop: 2, marginLeft: 2, gapX: 0, gapY: 2 },
  thermal_80mm: { type: 'thermal' as const, paperWidth: 80, paperHeight: 50, dpi: 203, labelsPerRow: 1, marginTop: 3, marginLeft: 3, gapX: 0, gapY: 3 },
  a4_inkjet: { type: 'inkjet' as const, paperWidth: 210, paperHeight: 297, dpi: 300, labelsPerRow: 3, marginTop: 10, marginLeft: 10, gapX: 5, gapY: 5 },
};

// ==================== Variant Selector Modal ====================
interface VariantSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: APIProduct;
  onSelect: (product: APIProduct, variant: ProductUnit, color?: ProductColor) => void;
  displaySettings: VariantDisplaySettings;
  barcodeFormat: BarcodeFormat;
}

const VariantSelectorModal: React.FC<VariantSelectorModalProps> = ({
  isOpen,
  onClose,
  product,
  onSelect,
  displaySettings,
  barcodeFormat,
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  
  if (!product) return null;
  
  const getUnitCardClass = () => {
    switch (displaySettings.unitCardSize) {
      case 'sm': return 'px-2 py-1.5 text-xs';
      case 'lg': return 'px-4 py-3 text-base';
      case 'xl': return 'px-5 py-4 text-lg';
      default: return 'px-3 py-2 text-sm';
    }
  };

  const getUnitCardHeight = () => {
    switch (displaySettings.unitCardSize) {
      case 'sm': return 'min-h-[45px]';
      case 'lg': return 'min-h-[75px]';
      case 'xl': return 'min-h-[95px]';
      default: return 'min-h-[60px]';
    }
  };

  const getColorButtonClass = () => {
    switch (displaySettings.colorButtonSize) {
      case 'sm': return 'px-2 py-1 text-xs';
      case 'lg': return 'px-4 py-2 text-base';
      default: return 'px-3 py-1.5 text-sm';
    }
  };

  const getGridColumnsClass = () => {
    switch (displaySettings.gridColumns) {
      case 1: return 'grid-cols-1';
      case 3: return 'grid-cols-3';
      case 4: return 'grid-cols-4';
      default: return 'grid-cols-2';
    }
  };

  const handleUnitSelect = (unit: ProductUnit) => {
    setSelectedUnit(unit);
    setSelectedColor(null);
  };

  const handleColorSelect = (color: ProductColor) => {
    setSelectedColor(color);
  };

  const handleConfirm = () => {
    if (selectedUnit) {
      onSelect(product, selectedUnit, selectedColor);
      onClose();
      setSelectedUnit(null);
      setSelectedColor(null);
    }
  };

  const productName = language === 'ar' 
    ? (product.name_ar || product.name || '') 
    : (product.name || '');

  // معاينة الباركود مع حجم النص المخصص ونوع الباركود
  useEffect(() => {
    if (previewCanvasRef.current && selectedUnit?.barcode && selectedUnit.barcode !== 'NO_BARCODE') {
      try {
        let format = "CODE128";
        switch (barcodeFormat) {
          case 'CODE128': format = "CODE128"; break;
          case 'CODE39': format = "CODE39"; break;
          case 'EAN13': format = "EAN13"; break;
          case 'UPC': format = "UPC"; break;
          case 'ITF14': format = "ITF14"; break;
          case 'CODABAR': format = "codabar"; break;
          default: format = "CODE128";
        }
        
        JsBarcode(previewCanvasRef.current, selectedUnit.barcode, {
          format: format,
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: displaySettings.barcodeTextSize,
          textMargin: 2,
        });
      } catch (e) {
        console.error('Preview barcode error:', e);
      }
    }
  }, [selectedUnit, displaySettings.barcodeTextSize, barcodeFormat]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-5xl" 
        style={{ 
          maxWidth: displaySettings.compactMode ? '800px' : '1000px',
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2" style={{ fontSize: displaySettings.fontSize + 2 }}>
            <Package size={displaySettings.fontSize + 2} />
            {language === 'ar' ? 'اختر المقاس واللون' : 'Select Unit & Color'} - {productName}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Side - Selection */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2" style={{ fontSize: displaySettings.fontSize }}>
                <Ruler size={displaySettings.fontSize} />
                {language === 'ar' ? 'المقاسات المتاحة' : 'Available Units'}
                <Badge variant="outline" className="ml-2">
                  {product.units?.length || 0}
                </Badge>
              </h4>
              <ScrollArea className={`border rounded-md p-2 ${displaySettings.compactMode ? 'h-44' : 'h-52'}`}>
                <div className={`grid ${getGridColumnsClass()} gap-2`}>
                  {product.units?.map((unit) => (
                    <button
                      key={unit.id}
                      onClick={() => handleUnitSelect(unit)}
                      className={cn(
                        "w-full text-left rounded-md transition-all duration-200 hover:scale-[1.02]",
                        getUnitCardClass(),
                        getUnitCardHeight(),
                        selectedUnit?.id === unit.id
                          ? "bg-primary/15 text-primary border-2 border-primary shadow-md"
                          : "bg-muted/30 hover:bg-muted/60 border border-border hover:border-primary/50",
                        displaySettings.compactMode ? "space-y-0" : "space-y-1"
                      )}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold" style={{ fontSize: displaySettings.fontSize }}>
                          {unit.unit_name}
                        </span>
                        {displaySettings.showStock && unit.colors && (
                          <Badge variant="secondary" className="text-[10px]">
                            {unit.colors.reduce((sum, c) => sum + (c.stock || 0), 0)} {language === 'ar' ? 'قطعة' : 'pcs'}
                          </Badge>
                        )}
                      </div>
                      {displaySettings.showPriceInUnits && (
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-muted-foreground">
                            {language === 'ar' ? 'السعر:' : 'Price:'}
                          </span>
                          <span className="font-bold text-primary" style={{ fontSize: displaySettings.fontSize - 2 }}>
                            {formatCurrency(Number(unit.sell_price))}
                          </span>
                        </div>
                      )}
                      {displaySettings.showStock && unit.colors && unit.colors.length > 0 && (
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {unit.colors.length} {language === 'ar' ? 'لون' : 'colors'}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {selectedUnit?.colors && selectedUnit.colors.length > 0 && (
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2" style={{ fontSize: displaySettings.fontSize }}>
                  <Palette size={displaySettings.fontSize} />
                  {language === 'ar' ? 'الألوان المتاحة' : 'Available Colors'}
                  <Badge variant="outline" className="ml-2">
                    {selectedUnit.colors.length}
                  </Badge>
                </h4>
                <ScrollArea className={`border rounded-md p-2 ${displaySettings.compactMode ? 'h-28' : 'h-36'}`}>
                  <div className={`grid ${getGridColumnsClass()} gap-2`}>
                    {selectedUnit.colors.map((color) => (
                      <button
                        key={color.id}
                        onClick={() => handleColorSelect(color)}
                        className={cn(
                          "rounded-md transition-all duration-200 flex items-center gap-2 hover:scale-[1.02]",
                          getColorButtonClass(),
                          selectedColor?.id === color.id
                            ? "bg-primary text-white shadow-md ring-2 ring-primary/50"
                            : "border border-border hover:bg-muted/80",
                        )}
                      >
                        <div 
                          className="w-4 h-4 rounded-full border border-white shadow-sm" 
                          style={{ backgroundColor: color.hex_code || '#000' }} 
                        />
                        <span style={{ fontSize: displaySettings.fontSize - 1 }}>{color.color}</span>
                        {displaySettings.showStock && (
                          <Badge 
                            variant={selectedColor?.id === color.id ? "secondary" : "outline"} 
                            className="text-[10px] ml-auto"
                          >
                            {color.stock}
                          </Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {selectedUnit && (
              <div className={`rounded-lg transition-all duration-200 ${
                displaySettings.unitCardSize === 'xl' ? 'p-4' : 'p-3'
              } bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium flex items-center gap-1" style={{ fontSize: displaySettings.fontSize }}>
                    <DollarSign size={displaySettings.fontSize} />
                    {language === 'ar' ? 'سعر البيع' : 'Sell Price'}:
                  </span>
                  <span className="font-bold text-primary" style={{ fontSize: displaySettings.fontSize + 4 }}>
                    {formatCurrency(Number(selectedUnit.sell_price))}
                  </span>
                </div>
                {selectedColor && (
                  <div className="flex justify-between items-center mt-1 text-sm text-muted-foreground">
                    <span>{language === 'ar' ? 'اللون:' : 'Color:'}</span>
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedColor.hex_code }} />
                      {selectedColor.color}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Side - Live Preview */}
          {displaySettings.showLivePreview && (
            <div className="lg:col-span-1">
              <div className="sticky top-0">
                <h4 className="font-medium mb-3 flex items-center gap-2" style={{ fontSize: displaySettings.fontSize }}>
                  <Monitor size={displaySettings.fontSize} />
                  {language === 'ar' ? 'معاينة حية للملصق' : 'Live Label Preview'}
                  <Badge variant="secondary" className="text-[10px] animate-pulse">
                    LIVE
                  </Badge>
                </h4>
                
                <div className="bg-gray-100 rounded-xl p-4 shadow-lg">
                  {selectedUnit ? (
                    <div 
                      className="bg-white rounded-lg mx-auto shadow-md transition-all duration-200"
                      style={{
                        width: '100%',
                        maxWidth: '280px',
                        padding: '12px',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div className="text-center space-y-2">
                        <div>
                          <p className="font-bold text-gray-800 truncate" style={{ fontSize: displaySettings.fontSize + 2 }}>
                            {productName}
                          </p>
                          <p className="text-sm text-gray-600 mt-0.5">
                            {selectedUnit.unit_name}
                            {selectedColor && ` - ${selectedColor.color}`}
                          </p>
                        </div>
                        
                        {selectedUnit.barcode && selectedUnit.barcode !== 'NO_BARCODE' && (
                          <div className="bg-white p-2 rounded-lg border border-gray-200">
                            <canvas ref={previewCanvasRef} className="mx-auto" style={{ maxWidth: '100%', height: 'auto' }} />
                            <p className="text-xs font-mono text-gray-600 mt-1">
                              {selectedUnit.barcode}
                            </p>
                          </div>
                        )}
                        
                        <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                          <span className="text-xs text-muted-foreground">
                            {language === 'ar' ? 'السعر' : 'Price'}:
                          </span>
                          <span className="text-xl font-bold text-black">
                            {formatCurrency(Number(selectedUnit.sell_price))}
                          </span>
                        </div>
                        
                        {displaySettings.showStock && selectedUnit.colors && (
                          <div className="text-xs text-muted-foreground">
                            {language === 'ar' ? 'المخزون:' : 'Stock:'}{' '}
                            {selectedUnit.colors.reduce((sum, c) => sum + (c.stock || 0), 0)}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground bg-white rounded-lg">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">
                        {language === 'ar' ? 'اختر مقاس لمعاينة الملصق' : 'Select a unit to preview'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-4 mt-2 border-t">
          <Button variant="outline" onClick={onClose} size={displaySettings.compactMode ? "sm" : "default"}>
            {language === 'ar' ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedUnit} size={displaySettings.compactMode ? "sm" : "default"}>
            <Plus className="h-4 w-4 ml-2" />
            {language === 'ar' ? 'إضافة للمنتجات' : 'Add to Products'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== Main Component ====================
const BarcodePrintingCenter: React.FC = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { formatCurrency } = useRegionalSettings();

  const SETTINGS_STORAGE_KEY = 'barcode_printing_settings';
  const VARIANT_SETTINGS_KEY = 'variant_display_settings';

  const [selectedProducts, setSelectedProducts] = useState<PrintProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [design, setDesign] = useState<LabelDesign>(emptyDesign);
  const [printerConfig, setPrinterConfig] = useState<PrinterConfig>(emptyPrinterConfig);
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>('CODE128');
  const [activeTab, setActiveTab] = useState('products');
  const [variantModalOpen, setVariantModalOpen] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<APIProduct | null>(null);
  const [variantDisplaySettings, setVariantDisplaySettings] = useState<VariantDisplaySettings>(defaultVariantDisplaySettings);
  const previewRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // تحميل إعدادات
  useEffect(() => {
    const savedVariantSettings = localStorage.getItem(VARIANT_SETTINGS_KEY);
    if (savedVariantSettings) {
      try {
        const parsed = JSON.parse(savedVariantSettings);
        setVariantDisplaySettings(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Error loading variant settings:', e);
      }
    }
  }, []);

  const updateVariantSettings = (updates: Partial<VariantDisplaySettings>) => {
    const newSettings = { ...variantDisplaySettings, ...updates };
    setVariantDisplaySettings(newSettings);
    localStorage.setItem(VARIANT_SETTINGS_KEY, JSON.stringify(newSettings));
    
    toast({
      title: isRTL ? 'تم تحديث العرض' : 'Display Updated',
      duration: 1000,
    });
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.design) setDesign(parsedSettings.design);
        if (parsedSettings.printer) setPrinterConfig(parsedSettings.printer);
        if (parsedSettings.barcodeFormat) setBarcodeFormat(parsedSettings.barcodeFormat);
      } catch (e) {
        console.error('Error loading settings:', e);
      }
    }
  }, []);

  const saveSettings = () => {
    const settings: BarcodeSettings = { design, printer: printerConfig, barcodeFormat };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    toast({
      title: isRTL ? 'تم حفظ الإعدادات' : 'Settings Saved',
    });
  };

  const loadSettings = () => {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        setDesign(parsedSettings.design || emptyDesign);
        setPrinterConfig(parsedSettings.printer || emptyPrinterConfig);
        setBarcodeFormat(parsedSettings.barcodeFormat || 'CODE128');
        toast({ title: isRTL ? 'تم تحميل الإعدادات' : 'Settings Loaded' });
      } catch (e) {
        toast({ title: isRTL ? 'خطأ' : 'Error', variant: 'destructive' });
      }
    }
  };

  const clearAllSettings = () => {
    localStorage.removeItem(SETTINGS_STORAGE_KEY);
    setDesign(emptyDesign);
    setPrinterConfig(emptyPrinterConfig);
    setBarcodeFormat('CODE128');
    toast({ title: isRTL ? 'تم مسح الإعدادات' : 'Settings Cleared' });
  };

  const resetAllSettings = () => {
    setDesign(emptyDesign);
    setPrinterConfig(emptyPrinterConfig);
    setBarcodeFormat('CODE128');
    toast({ title: isRTL ? 'تم إعادة التعيين' : 'Reset Complete' });
  };

  const applyPreset = (preset: keyof typeof printerPresets) => {
    setPrinterConfig(printerPresets[preset]);
    toast({ title: isRTL ? 'تم تطبيق الإعداد' : 'Preset Applied' });
  };

  const resetDesign = () => {
    setDesign(emptyDesign);
    toast({ title: isRTL ? 'تم إعادة التصميم' : 'Design Reset' });
  };

  // Fetch products
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['barcode-products'],
    queryFn: async () => {
      try {
        const response = await api.post('/product/index', { paginate: false });
        if (response.data.result === 'Success') {
          return response.data.data as APIProduct[];
        } else {
          throw new Error(response.data.message || 'Failed to fetch products');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({ title: language === 'ar' ? 'خطأ في جلب المنتجات' : 'Error fetching products', variant: 'destructive' });
        return [];
      }
    }
  });

  const filteredProducts = products.filter(p => {
    if (!p) return false;
    const searchLower = searchQuery.toLowerCase();
    const includesSearch = (value: string | null | undefined): boolean => {
      return value ? value.toLowerCase().includes(searchLower) : false;
    };
    return (
      includesSearch(p.name) ||
      includesSearch(p.name_ar) ||
      includesSearch(p.sku) ||
      includesSearch(p.barcode)
    );
  });

  const handleAddProduct = (product: APIProduct, variant?: ProductUnit, color?: ProductColor) => {
    const variantId = variant ? `${product.id}-${variant.id}` : String(product.id);
    const existing = selectedProducts.find(p => p.id === variantId);
    const price = variant ? Number(variant.sell_price) : Number(product.price);

    let variantInfo = '';
    let variantInfoAr = '';
    if (variant) {
      variantInfo = variant.unit_name;
      variantInfoAr = variant.unit_name;
      if (color) {
        variantInfo += ` - ${color.color}`;
        variantInfoAr += ` - ${color.color}`;
      }
    }

    const barcodeValue = variant?.barcode || variant?.sku || product.barcode || product.sku || 'NO_BARCODE';

    if (existing) {
      setSelectedProducts(prev =>
        prev.map(p => p.id === variantId ? { ...p, quantity: p.quantity + 1 } : p)
      );
    } else {
      setSelectedProducts(prev => [...prev, {
        id: variantId,
        name: product.name,
        nameAr: product.name_ar || product.name,
        sku: variant?.sku || product.sku,
        barcode: barcodeValue,
        price: price,
        quantity: 1,
        isVariant: !!variant,
        variantInfo,
        variantInfoAr,
        selectedUnit: variant,
        selectedColor: color
      }]);
    }

    toast({ title: isRTL ? 'تمت الإضافة' : 'Added' });
  };

  const handleOpenVariantModal = (product: APIProduct) => {
    if (product.units && product.units.length > 0) {
      setSelectedProductForVariant(product);
      setVariantModalOpen(true);
    } else {
      handleAddProduct(product);
    }
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

  const getBarcodeOptions = () => {
    const baseOptions = {
      width: design.barcodeWidth || 2,
      height: design.barcodeHeight || 40,
      displayValue: true,
      fontSize: variantDisplaySettings.barcodeTextSize,
      margin: 5,
      textMargin: 2,
    };

    switch (barcodeFormat) {
      case 'CODE128': return { ...baseOptions, format: "CODE128" };
      case 'CODE39': return { ...baseOptions, format: "CODE39" };
      case 'EAN13': return { ...baseOptions, format: "EAN13", flat: true, textMargin: 4 };
      case 'UPC': return { ...baseOptions, format: "UPC", flat: true };
      case 'ITF14': return { ...baseOptions, format: "ITF14" };
      case 'CODABAR': return { ...baseOptions, format: "codabar" };
      default: return { ...baseOptions, format: "CODE128" };
    }
  };

  const handlePrint = () => {
    if (selectedProducts.length === 0) {
      toast({ title: isRTL ? 'لا توجد منتجات' : 'No products selected', variant: 'destructive' });
      return;
    }

    const productsWithoutBarcode = selectedProducts.filter(p => !p.barcode || p.barcode === 'NO_BARCODE');
    if (productsWithoutBarcode.length > 0) {
      toast({ title: isRTL ? 'باركود مفقود' : 'Missing Barcode', variant: 'destructive' });
      return;
    }

    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return;

    const barcodeOptions = getBarcodeOptions();
    const labels: string[] = [];
    
    const scale = variantDisplaySettings.applyToPrint ? variantDisplaySettings.printScale / 100 : 1;
    const scaledFontSize = Math.floor((design.fontSize || 12) * scale);
    const scaledPadding = Math.floor((design.padding || 4) * scale);
    const scaledWidth = Math.floor((design.width || 60) * scale);
    const scaledHeight = Math.floor((design.height || 40) * scale);
    
    selectedProducts.forEach((product, idx) => {
      for (let i = 0; i < product.quantity; i++) {
        const productLabel = product.isVariant
          ? `${isRTL ? product.nameAr : product.name} (${isRTL ? product.variantInfoAr : product.variantInfo})`
          : (isRTL ? product.nameAr : product.name);
        const formattedPrice = formatCurrency(product.price);

        labels.push(`
          <div class="label" style="
            width: ${scaledWidth}mm;
            height: ${scaledHeight}mm;
            padding: ${scaledPadding}mm;
            border: ${design.borderEnabled ? '2px solid #333' : 'none'};
            display: inline-flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            page-break-inside: avoid;
            box-sizing: border-box;
            margin: ${printerConfig.gapY / 2}mm ${printerConfig.gapX / 2}mm;
            background: white;
            border-radius: ${design.borderEnabled ? '4px' : '0'};
          ">
            ${design.showCompanyName && design.companyName ? `<div style="font-size: ${Math.max(8, scaledFontSize - 2)}px; font-weight: 600; margin-bottom: 3px;">${design.companyName}</div>` : ''}
            ${design.showProductName ? `<div style="font-size: ${scaledFontSize}px; font-weight: 700; margin-bottom: 4px;">${productLabel}</div>` : ''}
            ${design.showBarcode ? `<canvas id="bc-${idx}-${i}" style="width: 100%; max-width: ${scaledWidth - 10}mm;"></canvas>` : ''}
            ${design.showPrice ? `<div style="font-size: ${scaledFontSize + 3}px; font-weight: bold; margin-top: 4px; color: #0000;">${formattedPrice}</div>` : ''}
          </div>
        `);
      }
    });

    const labelsHtml = labels.join('');
    const barcodeOptionsStr = JSON.stringify(barcodeOptions);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
        <head>
          <title>${isRTL ? 'طباعة الباركود' : 'Print Barcodes'}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Cairo', Arial, sans-serif; 
              padding: ${printerConfig.marginTop || 5}mm ${printerConfig.marginLeft || 5}mm;
              background: white;
            }
            .labels-container { display: flex; flex-wrap: wrap; justify-content: flex-start; }
            .label { background: white; }
            @media print {
              .no-print { display: none !important; }
              body { padding: ${printerConfig.marginTop || 5}mm ${printerConfig.marginLeft || 5}mm; margin: 0; }
              .label { break-inside: avoid; page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 15px; padding: 12px; background: #f0f9ff; border-radius: 12px; text-align: center;">
            <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
              <button onclick="window.print()" style="padding: 12px 24px; background: #000; color: white; border: none; border-radius: 8px; cursor: pointer;">🖨️ ${isRTL ? 'طباعة' : 'Print'}</button>
              <span style="padding: 8px 16px; background: white; border-radius: 8px;">📊 ${totalLabels} ${isRTL ? 'ملصق' : 'labels'}</span>
              <span style="padding: 8px 16px; background: white; border-radius: 8px;">🔢 ${isRTL ? 'حجم الأرقام:' : 'Text size:'} ${variantDisplaySettings.barcodeTextSize}px</span>
              <span style="padding: 8px 16px; background: white; border-radius: 8px;">🔍 ${isRTL ? 'نوع الباركود:' : 'Type:'} ${barcodeFormat}</span>
            </div>
          </div>
          <div class="labels-container">${labelsHtml}</div>
          <script>
            const barcodeOptions = ${barcodeOptionsStr};
            ${selectedProducts.map((product, idx) =>
              Array.from({ length: product.quantity }, (_, i) => `
                try {
                  const canvas = document.getElementById("bc-${idx}-${i}");
                  if (canvas && "${product.barcode}") {
                    JsBarcode(canvas, "${product.barcode}", barcodeOptions);
                  }
                } catch(e) { console.error(e); }
              `).join('')
            ).join('')}
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    toast({ title: isRTL ? 'تم فتح نافذة الطباعة' : 'Print Window Opened' });
  };

  // Generate preview barcode
  useEffect(() => {
    if (canvasRef.current && selectedProducts.length > 0 && selectedProducts[0].barcode && selectedProducts[0].barcode !== 'NO_BARCODE') {
      try {
        const options = getBarcodeOptions();
        JsBarcode(canvasRef.current, selectedProducts[0].barcode, options);
      } catch (e) {
        console.error('Barcode preview error:', e);
      }
    }
  }, [selectedProducts, design, barcodeFormat, variantDisplaySettings.barcodeTextSize]);

  const t = {
    title: isRTL ? 'مركز طباعة الباركود' : 'Barcode Printing Center',
    products: isRTL ? 'المنتجات' : 'Products',
    design: isRTL ? 'التصميم' : 'Design',
    printer: isRTL ? 'الطابعة' : 'Printer',
    variantDisplay: isRTL ? 'عرض المتغيرات' : 'Variant Display',
    preview: isRTL ? 'معاينة' : 'Preview',
    search: isRTL ? 'بحث عن منتج...' : 'Search products...',
    selectedProducts: isRTL ? 'المنتجات المختارة' : 'Selected Products',
    noProducts: isRTL ? 'لم يتم اختيار منتجات' : 'No products selected',
    totalLabels: isRTL ? 'إجمالي الملصقات' : 'Total Labels',
    print: isRTL ? 'طباعة' : 'Print',
    labelSize: isRTL ? 'حجم الملصق' : 'Label Size',
    width: isRTL ? 'العرض' : 'Width',
    height: isRTL ? 'الارتفاع' : 'Height',
    showName: isRTL ? 'إظهار الاسم' : 'Show Name',
    showPrice: isRTL ? 'إظهار السعر' : 'Show Price',
    showBarcode: isRTL ? 'إظهار الباركود' : 'Show Barcode',
    border: isRTL ? 'إطار' : 'Border',
    fontSize: isRTL ? 'حجم الخط' : 'Font Size',
    barcodeHeight: isRTL ? 'ارتفاع الباركود' : 'Barcode Height',
    padding: isRTL ? 'الهوامش' : 'Padding',
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
    px: isRTL ? 'بكسل' : 'px',
    variants: isRTL ? 'متغيرات' : 'Variants',
    saveSettings: isRTL ? 'حفظ الإعدادات' : 'Save Settings',
    loadSettings: isRTL ? 'تحميل الإعدادات' : 'Load Settings',
    clearSettings: isRTL ? 'مسح الإعدادات' : 'Clear Settings',
    resetAll: isRTL ? 'إعادة الكل' : 'Reset All',
    barcodeType: isRTL ? 'نوع الباركود' : 'Barcode Type',
    unitCardSize: isRTL ? 'حجم البطاقة' : 'Card Size',
    small: isRTL ? 'صغير' : 'Small',
    medium: isRTL ? 'متوسط' : 'Medium',
    large: isRTL ? 'كبير' : 'Large',
    extraLarge: isRTL ? 'كبير جداً' : 'Extra Large',
    showStock: isRTL ? 'إظهار المخزون' : 'Show Stock',
    showPriceInUnits: isRTL ? 'إظهار السعر' : 'Show Price',
    colorButtonSize: isRTL ? 'حجم زر اللون' : 'Color Size',
    gridColumns: isRTL ? 'عدد الأعمدة' : 'Grid Columns',
    compactMode: isRTL ? 'وضع مضغوط' : 'Compact Mode',
    showLivePreview: isRTL ? 'معاينة حية' : 'Live Preview',
    applyToPrint: isRTL ? 'تطبيق على الطباعة' : 'Apply to Print',
    printScale: isRTL ? 'نسبة التكبير' : 'Print Scale',
    barcodeTextSize: isRTL ? 'حجم أرقام الباركود' : 'Barcode Text Size',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <Printer className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t.title}</h2>
            <p className="text-sm text-muted-foreground">{isRTL ? 'إنشاء وطباعة ملصقات الباركود' : 'Create and print barcode labels'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={saveSettings}><Save className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={loadSettings}><Download className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={clearAllSettings}><Trash2 className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={resetAllSettings}><RefreshCw className="h-4 w-4" /></Button>
          </div>
          <Badge variant="outline" className="px-3 py-1.5">
            <Tag className="h-4 w-4 me-2" />
            {t.totalLabels}: <span className="font-bold ms-1">{totalLabels}</span>
          </Badge>
          <Button onClick={handlePrint} disabled={selectedProducts.length === 0}>
            <Printer className="h-4 w-4 me-2" />
            {t.print}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="products"><Package className="h-4 w-4 me-2" />{t.products}</TabsTrigger>
              <TabsTrigger value="design"><Settings2 className="h-4 w-4 me-2" />{t.design}</TabsTrigger>
              <TabsTrigger value="printer"><Printer className="h-4 w-4 me-2" />{t.printer}</TabsTrigger>
              <TabsTrigger value="variantDisplay"><Maximize2 className="h-4 w-4 me-2" />{t.variantDisplay}</TabsTrigger>
            </TabsList>

            {/* Products Tab */}
            <TabsContent value="products" className="mt-4 space-y-4">
              <div className="relative">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="ps-10" />
              </div>
              <Card>
                <CardContent className="p-0">
                  <ScrollArea className="h-[350px]">
                    <div className="divide-y">
                      {filteredProducts.map(product => {
                        const hasVariants = product.units && product.units.length > 0;
                        return (
                          <div key={product.id} className="p-3 hover:bg-muted/50 flex justify-between items-center">
                            <div>
                              <p className="font-medium">{isRTL ? (product.name_ar || product.name) : product.name}</p>
                              <div className="flex gap-3 text-sm text-muted-foreground">
                                <span className="font-mono">{product.sku}</span>
                                <span>{formatCurrency(Number(product.price))}</span>
                              </div>
                            </div>
                            <Button size="sm" variant="outline" onClick={() => handleOpenVariantModal(product)}>
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">{t.selectedProducts} ({selectedProducts.length})</CardTitle></CardHeader>
                <CardContent>
                  {selectedProducts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>{t.noProducts}</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {selectedProducts.map(product => (
                          <div key={product.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium">{isRTL ? product.nameAr : product.name}</p>
                              <p className="text-sm font-mono">{product.sku}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleQuantityChange(product.id, -1)}><Minus className="h-3 w-3" /></Button>
                              <Input type="number" min={1} value={product.quantity} onChange={(e) => handleQuantityInput(product.id, e.target.value)} className="w-16 h-8 text-center" />
                              <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => handleQuantityChange(product.id, 1)}><Plus className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRemoveProduct(product.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Design Tab - فيها اختيار نوع الباركود */}
            <TabsContent value="design" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">{t.labelSize}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>{t.width} ({t.mm})</Label><Input type="number" value={design.width} onChange={(e) => setDesign(d => ({ ...d, width: Number(e.target.value) }))} /></div>
                    <div><Label>{t.height} ({t.mm})</Label><Input type="number" value={design.height} onChange={(e) => setDesign(d => ({ ...d, height: Number(e.target.value) }))} /></div>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex justify-between"><Label>{t.showName}</Label><Switch checked={design.showProductName} onCheckedChange={(v) => setDesign(d => ({ ...d, showProductName: v }))} /></div>
                    <div className="flex justify-between"><Label>{t.showPrice}</Label><Switch checked={design.showPrice} onCheckedChange={(v) => setDesign(d => ({ ...d, showPrice: v }))} /></div>
                    <div className="flex justify-between"><Label>{t.showBarcode}</Label><Switch checked={design.showBarcode} onCheckedChange={(v) => setDesign(d => ({ ...d, showBarcode: v }))} /></div>
                    <div className="flex justify-between"><Label>{t.border}</Label><Switch checked={design.borderEnabled} onCheckedChange={(v) => setDesign(d => ({ ...d, borderEnabled: v }))} /></div>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <div><Label>{t.fontSize}</Label><Slider value={[design.fontSize]} onValueChange={([v]) => setDesign(d => ({ ...d, fontSize: v }))} min={8} max={24} step={1} /></div>
                    <div><Label>{t.barcodeHeight}</Label><Slider value={[design.barcodeHeight]} onValueChange={([v]) => setDesign(d => ({ ...d, barcodeHeight: v }))} min={30} max={80} step={5} /></div>
                    <div><Label>{t.padding}</Label><Slider value={[design.padding]} onValueChange={([v]) => setDesign(d => ({ ...d, padding: v }))} min={2} max={10} step={1} /></div>
                  </div>
                  <Separator />
                  {/* ✅ اختيار نوع الباركود */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2"><Barcode size={14} />{t.barcodeType}</Label>
                    <Select value={barcodeFormat} onValueChange={(value) => setBarcodeFormat(value as BarcodeFormat)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {barcodeFormats.map((format) => (
                          <SelectItem key={format.value} value={format.value}>
                            <div>
                              <span className="font-medium">{language === 'ar' ? format.labelAr : format.label}</span>
                              <p className="text-xs text-muted-foreground">{format.description}</p>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex justify-between"><Label>{t.showCompany}</Label><Switch checked={design.showCompanyName} onCheckedChange={(v) => setDesign(d => ({ ...d, showCompanyName: v }))} /></div>
                    {design.showCompanyName && <Input placeholder={t.companyName} value={design.companyName} onChange={(e) => setDesign(d => ({ ...d, companyName: e.target.value }))} className="mt-2" />}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Printer Tab */}
            <TabsContent value="printer" className="mt-4 space-y-4">
              <Card><CardHeader><CardTitle className="text-base">{t.presets}</CardTitle></CardHeader><CardContent><div className="grid grid-cols-3 gap-2">{Object.keys(printerPresets).map(key => (<Button key={key} variant="outline" size="sm" onClick={() => applyPreset(key as keyof typeof printerPresets)}>{key.replace('_', ' ')}</Button>))}</div></CardContent></Card>
              <Card><CardHeader><CardTitle className="text-base">{t.printerType}</CardTitle></CardHeader><CardContent className="space-y-4">
                <Select value={printerConfig.type} onValueChange={(v) => setPrinterConfig(c => ({ ...c, type: v as PrinterConfig['type'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="thermal">{t.thermal}</SelectItem><SelectItem value="inkjet">{t.inkjet}</SelectItem><SelectItem value="laser">{t.laser}</SelectItem></SelectContent></Select>
                <div className="grid grid-cols-2 gap-4"><div><Label>{t.paperSize} ({t.width})</Label><Input type="number" value={printerConfig.paperWidth} onChange={(e) => setPrinterConfig(c => ({ ...c, paperWidth: Number(e.target.value) }))} /></div><div><Label>{t.paperSize} ({t.height})</Label><Input type="number" value={printerConfig.paperHeight} onChange={(e) => setPrinterConfig(c => ({ ...c, paperHeight: Number(e.target.value) }))} /></div></div>
                <div className="grid grid-cols-2 gap-4"><div><Label>{t.labelsPerRow}</Label><Input type="number" min={1} max={4} value={printerConfig.labelsPerRow} onChange={(e) => setPrinterConfig(c => ({ ...c, labelsPerRow: Number(e.target.value) }))} /></div><div><Label>DPI</Label><Select value={String(printerConfig.dpi)} onValueChange={(v) => setPrinterConfig(c => ({ ...c, dpi: Number(v) }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="203">203</SelectItem><SelectItem value="300">300</SelectItem></SelectContent></Select></div></div>
                <div className="grid grid-cols-2 gap-4"><div><Label>{t.margins}</Label><div className="flex gap-2"><Input placeholder="Top" value={printerConfig.marginTop} onChange={(e) => setPrinterConfig(c => ({ ...c, marginTop: Number(e.target.value) }))} /><Input placeholder="Left" value={printerConfig.marginLeft} onChange={(e) => setPrinterConfig(c => ({ ...c, marginLeft: Number(e.target.value) }))} /></div></div><div><Label>{t.gaps}</Label><div className="flex gap-2"><Input placeholder="X" value={printerConfig.gapX} onChange={(e) => setPrinterConfig(c => ({ ...c, gapX: Number(e.target.value) }))} /><Input placeholder="Y" value={printerConfig.gapY} onChange={(e) => setPrinterConfig(c => ({ ...c, gapY: Number(e.target.value) }))} /></div></div></div>
              </CardContent></Card>
            </TabsContent>

            {/* Variant Display Tab - فيها تكبير أرقام الباركود */}
            <TabsContent value="variantDisplay" className="mt-4 space-y-4">
              <Card>
                <CardHeader><CardTitle className="text-base">{t.variantDisplay}</CardTitle></CardHeader>
                <CardContent className="space-y-6">
                  {/* Unit Card Size */}
                  <div><Label>{t.unitCardSize}</Label><div className="grid grid-cols-4 gap-2 mt-2">{['sm','md','lg','xl'].map(size => (<Button key={size} variant={variantDisplaySettings.unitCardSize === size ? 'default' : 'outline'} size="sm" onClick={() => updateVariantSettings({ unitCardSize: size as any })}>{t[size as keyof typeof t] || size}</Button>))}</div></div>
                  <Separator />
                  {/* Color Button Size */}
                  <div><Label>{t.colorButtonSize}</Label><div className="grid grid-cols-3 gap-2 mt-2">{['sm','md','lg'].map(size => (<Button key={size} variant={variantDisplaySettings.colorButtonSize === size ? 'default' : 'outline'} size="sm" onClick={() => updateVariantSettings({ colorButtonSize: size as any })}>{t[size as keyof typeof t] || size}</Button>))}</div></div>
                  <Separator />
                  {/* Grid Columns */}
                  <div><Label>{t.gridColumns}</Label><div className="grid grid-cols-4 gap-2 mt-2">{['1','2','3','4'].map(cols => (<Button key={cols} variant={variantDisplaySettings.gridColumns === Number(cols) ? 'default' : 'outline'} size="sm" onClick={() => updateVariantSettings({ gridColumns: Number(cols) as 1|2|3|4 })}>{cols}</Button>))}</div></div>
                  <Separator />
                  {/* ✅ حجم أرقام الباركود (المتغير 0001) */}
                  <div className="space-y-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2 font-semibold">
                        <Hash className="h-5 w-5 text-primary" />
                        {t.barcodeTextSize}
                      </Label>
                      <Badge variant="default" className="font-mono text-lg px-3 py-1">
                        {variantDisplaySettings.barcodeTextSize} px
                      </Badge>
                    </div>
                    <Slider 
                      value={[variantDisplaySettings.barcodeTextSize]} 
                      onValueChange={([v]) => updateVariantSettings({ barcodeTextSize: v })} 
                      min={8} 
                      max={30} 
                      step={1} 
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>🔢 8px {isRTL ? 'صغير' : 'Small'}</span>
                      <span>🔢 14px {isRTL ? 'عادي' : 'Normal'}</span>
                      <span>🔢 30px {isRTL ? 'كبير جداً' : 'Extra Large'}</span>
                    </div>
                    <p className="text-xs text-center text-primary/70">
                      {isRTL ? '✨ يتحكم في حجم الأرقام الظاهرة أسفل شريط الباركود (مثل: 0001)' : '✨ Controls the size of numbers below the barcode (e.g., 0001)'}
                    </p>
                  </div>
                  <Separator />
                  {/* Switches */}
                  <div className="space-y-3">
                    <div className="flex justify-between"><Label>{t.showStock}</Label><Switch checked={variantDisplaySettings.showStock} onCheckedChange={(v) => updateVariantSettings({ showStock: v })} /></div>
                    <div className="flex justify-between"><Label>{t.showPriceInUnits}</Label><Switch checked={variantDisplaySettings.showPriceInUnits} onCheckedChange={(v) => updateVariantSettings({ showPriceInUnits: v })} /></div>
                    <div className="flex justify-between"><Label>{t.compactMode}</Label><Switch checked={variantDisplaySettings.compactMode} onCheckedChange={(v) => updateVariantSettings({ compactMode: v })} /></div>
                    <div className="flex justify-between"><Label>{t.showLivePreview}</Label><Switch checked={variantDisplaySettings.showLivePreview} onCheckedChange={(v) => updateVariantSettings({ showLivePreview: v })} /></div>
                  </div>
                  <Separator />
                  {/* Print Settings */}
                  <div className="space-y-4">
                    <div className="flex justify-between"><Label>{t.applyToPrint}</Label><Switch checked={variantDisplaySettings.applyToPrint} onCheckedChange={(v) => updateVariantSettings({ applyToPrint: v })} /></div>
                    {variantDisplaySettings.applyToPrint && (<div className="space-y-3"><div className="flex justify-between"><Label>{t.printScale}</Label><span className="font-bold text-primary">{variantDisplaySettings.printScale}%</span></div><Slider value={[variantDisplaySettings.printScale]} onValueChange={([v]) => updateVariantSettings({ printScale: v })} min={50} max={200} step={5} /></div>)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Panel Preview */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader><CardTitle className="text-base">{t.preview}</CardTitle></CardHeader>
            <CardContent>
              <div className="bg-white border-2 border-dashed rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                {selectedProducts.length > 0 && design.width > 0 ? (
                  <div className="text-center" style={{ width: `${design.width * 3}px`, padding: `${design.padding * 3}px`, border: design.borderEnabled ? '1px solid #333' : 'none' }}>
                    {design.showProductName && <p style={{ fontSize: `${design.fontSize}px`, fontWeight: 600 }}>{isRTL ? selectedProducts[0].nameAr : selectedProducts[0].name}</p>}
                    {design.showBarcode && (selectedProducts[0].barcode !== 'NO_BARCODE' ? <canvas ref={canvasRef} className="mx-auto" /> : <div className="text-red-500 text-xs">No barcode</div>)}
                    {design.showPrice && <p style={{ fontSize: `${design.fontSize + 2}px`, fontWeight: 700, marginTop: '4px', color: '#000' }}>{formatCurrency(selectedProducts[0].price)}</p>}
                  </div>
                ) : (<div className="text-center text-muted-foreground"><Barcode className="h-16 w-16 mx-auto mb-3 opacity-20" /><p>{isRTL ? 'اختر منتج للمعاينة' : 'Select a product'}</p></div>)}
              </div>
              <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                <div className="flex justify-between"><span>{t.barcodeTextSize}:</span><span className="font-mono">{variantDisplaySettings.barcodeTextSize}px</span></div>
                <div className="flex justify-between"><span>{t.barcodeType}:</span><span className="font-mono">{barcodeFormat}</span></div>
                <div className="flex justify-between"><span>{t.labelSize}:</span><span>{design.width}×{design.height}{t.mm}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Variant Selector Modal */}
      <VariantSelectorModal
        isOpen={variantModalOpen}
        onClose={() => { setVariantModalOpen(false); setSelectedProductForVariant(null); }}
        product={selectedProductForVariant!}
        onSelect={handleAddProduct}
        displaySettings={variantDisplaySettings}
        barcodeFormat={barcodeFormat}
      />
    </div>
  );
};

export default BarcodePrintingCenter;