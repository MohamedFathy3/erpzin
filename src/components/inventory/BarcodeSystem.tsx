// BarcodeLabelPrinter.tsx - النسخة المعدلة المتزامنة مع BarcodePrintingCenter
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  ScanBarcode,
  Printer,
  Search,
  Package,
  X,
  Check,
  AlertCircle,
  Save,
  Download,
  RefreshCw
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface Product {
  id: string;
  name: string;
  name_ar?: string;
  sku: string;
  barcode?: string;
  price: number;
  stock: number;
}

// ==================== BarcodeScanner Component ====================
interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (product: Product) => void;
  products: Product[];
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  isOpen,
  onClose,
  onProductFound,
  products
}) => {
  const { language } = useLanguage();
  const [barcode, setBarcode] = useState('');
  const [foundProduct, setFoundProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleSearch = useCallback(() => {
    if (!barcode.trim()) return;

    const product = products.find(
      p => p.barcode === barcode || p.sku?.toLowerCase() === barcode.toLowerCase()
    );

    if (product) {
      setFoundProduct(product);
      setError('');
    } else {
      setFoundProduct(null);
      setError(language === 'ar' ? 'المنتج غير موجود' : 'Product not found');
    }
  }, [barcode, products, language]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleSelect = () => {
    if (foundProduct) {
      onProductFound(foundProduct);
      setBarcode('');
      setFoundProduct(null);
      onClose();
    }
  };

  const translations = {
    en: {
      title: 'Barcode Scanner',
      scanPrompt: 'Scan barcode or enter manually',
      search: 'Search',
      select: 'Select Product',
      productFound: 'Product Found',
      notFound: 'Product not found',
      sku: 'SKU',
      price: 'Price',
      stock: 'Stock'
    },
    ar: {
      title: 'قارئ الباركود',
      scanPrompt: 'امسح الباركود أو أدخله يدوياً',
      search: 'بحث',
      select: 'اختر المنتج',
      productFound: 'تم العثور على المنتج',
      notFound: 'المنتج غير موجود',
      sku: 'رمز المنتج',
      price: 'السعر',
      stock: 'المخزون'
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode size={20} />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>{t.scanPrompt}</Label>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="0000000000000"
                className="font-mono"
                dir="ltr"
              />
              <Button onClick={handleSearch}>
                <Search size={18} />
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {foundProduct && (
            <Card className="border-accent">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check size={18} className="text-accent" />
                  <span className="text-sm font-medium text-accent">{t.productFound}</span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">
                    {language === 'ar' ? (foundProduct.name_ar || foundProduct.name) : foundProduct.name}
                  </h3>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t.sku}: </span>
                      <span className="font-mono">{foundProduct.sku}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.price}: </span>
                      <span className="font-semibold">{foundProduct.price.toLocaleString()} YER</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t.stock}: </span>
                      <Badge variant={foundProduct.stock > 0 ? 'default' : 'destructive'}>
                        {foundProduct.stock}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white" onClick={handleSelect}>
                  {t.select}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== BarcodeLabelPrinter Component ====================
interface BarcodeLabelPrinterProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedProduct?: Product | null;
}

// نفس الـ Key المستخدم في BarcodePrintingCenter
const BARCODE_PRINTING_STORAGE_KEY = 'barcode_printing_settings';

// إعدادات الطباعة الافتراضية (متوافقة مع BarcodePrintingCenter)
interface BarcodePrintingSettings {
  design: {
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
  };
  printer: {
    type: 'thermal' | 'inkjet' | 'laser';
    paperWidth: number;
    paperHeight: number;
    dpi: number;
    labelsPerRow: number;
    marginTop: number;
    marginLeft: number;
    gapX: number;
    gapY: number;
  };
}

// إعدادات مبسطة لـ BarcodeLabelPrinter
interface SimplePrinterSettings {
  labelSize: 'small' | 'medium' | 'large';
  showPrice: boolean;
  quantity: number;
}

const defaultSimpleSettings: SimplePrinterSettings = {
  labelSize: 'medium',
  showPrice: true,
  quantity: 1
};

export const BarcodeLabelPrinter: React.FC<BarcodeLabelPrinterProps> = ({
  isOpen,
  onClose,
  products,
  selectedProduct
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [settings, setSettings] = useState<SimplePrinterSettings>(defaultSimpleSettings);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentProduct = selectedProduct || products.find(p => p.id === selectedProductId);

  // تحميل الإعدادات من localStorage (نفس الـ Key بتاع BarcodePrintingCenter)
  useEffect(() => {
    const savedSettings = localStorage.getItem(BARCODE_PRINTING_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as BarcodePrintingSettings;
        // استخراج الإعدادات من الكائن المحفوظ
        const design = parsed.design;
        if (design) {
          // تحويل إعدادات التصميم إلى إعدادات مبسطة
          const labelSize = design.width <= 50 ? 'small' : design.width <= 70 ? 'medium' : 'large';
          setSettings({
            labelSize,
            showPrice: design.showPrice,
            quantity: settings.quantity // الحفاظ على الكمية الحالية
          });
        }
      } catch (e) {
        console.error('Error loading printer settings:', e);
      }
    }
  }, []);

  // حفظ الإعدادات في localStorage (نفس الـ Key)
  const saveSettingsToMain = () => {
    // نقرأ الإعدادات الحالية من localStorage
    const savedSettings = localStorage.getItem(BARCODE_PRINTING_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as BarcodePrintingSettings;
        // تحديث إعدادات إظهار السعر وحجم الملصق
        if (parsed.design) {
          // تحديث حجم الملصق بناءً على الاختيار
          let newWidth = parsed.design.width;
          let newHeight = parsed.design.height;
          
          switch (settings.labelSize) {
            case 'small':
              newWidth = 50;
              newHeight = 30;
              break;
            case 'medium':
              newWidth = 70;
              newHeight = 40;
              break;
            case 'large':
              newWidth = 100;
              newHeight = 60;
              break;
          }
          
          parsed.design.width = newWidth;
          parsed.design.height = newHeight;
          parsed.design.showPrice = settings.showPrice;
          
          localStorage.setItem(BARCODE_PRINTING_STORAGE_KEY, JSON.stringify(parsed));
          
          toast({
            title: language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings Saved',
            description: language === 'ar' ? 'تم تحديث إعدادات مركز الطباعة' : 'Printing center settings updated',
          });
        }
      } catch (e) {
        console.error('Error saving settings:', e);
      }
    } else {
      // لو مفيش إعدادات، ننشئ واحدة جديدة
      const newSettings: BarcodePrintingSettings = {
        design: {
          width: settings.labelSize === 'small' ? 50 : settings.labelSize === 'medium' ? 70 : 100,
          height: settings.labelSize === 'small' ? 30 : settings.labelSize === 'medium' ? 40 : 60,
          showProductName: true,
          showPrice: settings.showPrice,
          showSku: true,
          showBarcode: true,
          fontSize: 10,
          barcodeHeight: 40,
          barcodeWidth: 1.5,
          padding: 4,
          borderEnabled: false,
          companyName: '',
          showCompanyName: false
        },
        printer: {
          type: 'thermal',
          paperWidth: 100,
          paperHeight: 150,
          dpi: 203,
          labelsPerRow: 2,
          marginTop: 5,
          marginLeft: 5,
          gapX: 3,
          gapY: 3
        }
      };
      localStorage.setItem(BARCODE_PRINTING_STORAGE_KEY, JSON.stringify(newSettings));
      toast({
        title: language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings Saved',
        description: language === 'ar' ? 'تم حفظ إعدادات الطباعة' : 'Printing settings saved',
      });
    }
  };

  // تحميل الإعدادات من localStorage
  const loadSettingsFromMain = () => {
    const savedSettings = localStorage.getItem(BARCODE_PRINTING_STORAGE_KEY);
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings) as BarcodePrintingSettings;
        const design = parsed.design;
        if (design) {
          const labelSize = design.width <= 50 ? 'small' : design.width <= 70 ? 'medium' : 'large';
          setSettings({
            labelSize,
            showPrice: design.showPrice,
            quantity: settings.quantity
          });
          toast({
            title: language === 'ar' ? 'تم تحميل الإعدادات' : 'Settings Loaded',
            description: language === 'ar' ? 'تم تحميل إعدادات مركز الطباعة' : 'Printing center settings loaded',
          });
        }
      } catch (e) {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'فشل تحميل الإعدادات' : 'Failed to load settings',
          variant: 'destructive'
        });
      }
    } else {
      toast({
        title: language === 'ar' ? 'تنبيه' : 'Info',
        description: language === 'ar' ? 'لا توجد إعدادات محفوظة' : 'No saved settings found',
      });
    }
  };

  // إعادة تعيين الإعدادات
  const resetSettings = () => {
    setSettings(defaultSimpleSettings);
    toast({
      title: language === 'ar' ? 'تم إعادة التعيين' : 'Reset Complete',
      description: language === 'ar' ? 'تم إعادة الإعدادات للوضع الافتراضي' : 'Settings reset to default',
    });
  };

  useEffect(() => {
    if (selectedProduct) {
      setSelectedProductId(selectedProduct.id);
    }
  }, [selectedProduct]);

  // تحديث الباركود في المعاينة
  useEffect(() => {
    if (currentProduct?.barcode && canvasRef.current) {
      try {
        const barcodeValue = currentProduct.barcode || currentProduct.sku;
        if (barcodeValue) {
          const barcodeWidth = settings.labelSize === 'small' ? 1 : settings.labelSize === 'medium' ? 2 : 3;
          const barcodeHeight = settings.labelSize === 'small' ? 40 : settings.labelSize === 'medium' ? 60 : 80;
          const fontSize = settings.labelSize === 'small' ? 10 : settings.labelSize === 'medium' ? 14 : 18;
          
          JsBarcode(canvasRef.current, barcodeValue, {
            format: 'CODE128',
            width: barcodeWidth,
            height: barcodeHeight,
            displayValue: true,
            fontSize: fontSize,
            margin: 10
          });
        }
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [currentProduct, settings.labelSize]);

  const handlePrint = () => {
    if (!currentProduct) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'الرجاء اختيار منتج' : 'Please select a product',
        variant: 'destructive'
      });
      return;
    }

    const barcodeValue = currentProduct.barcode || currentProduct.sku;
    if (!barcodeValue) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'المنتج لا يحتوي على باركود' : 'Product has no barcode',
        variant: 'destructive'
      });
      return;
    }

    const printWindow = window.open('', '', 'height=800,width=1000');
    if (!printWindow) return;

    const labelWidth = settings.labelSize === 'small' ? '50mm' : settings.labelSize === 'medium' ? '70mm' : '100mm';
    const labelHeight = settings.labelSize === 'small' ? '30mm' : settings.labelSize === 'medium' ? '40mm' : '60mm';
    const fontSize = settings.labelSize === 'small' ? 8 : settings.labelSize === 'medium' ? 10 : 12;
    const barcodeWidth = settings.labelSize === 'small' ? 1 : settings.labelSize === 'medium' ? 2 : 3;
    const barcodeHeight = settings.labelSize === 'small' ? 30 : settings.labelSize === 'medium' ? 45 : 60;

    let labelsHtml = '';
    for (let i = 0; i < settings.quantity; i++) {
      labelsHtml += `
        <div class="label" style="
          width: ${labelWidth}; 
          height: ${labelHeight}; 
          border: 1px dashed #ccc; 
          padding: 5px; 
          margin: 5px; 
          display: inline-block; 
          text-align: center; 
          page-break-inside: avoid;
          box-sizing: border-box;
        ">
          <div style="font-size: ${fontSize}px; font-weight: bold; margin-bottom: 3px;">
            ${language === 'ar' ? (currentProduct.name_ar || currentProduct.name) : currentProduct.name}
          </div>
          <canvas id="barcode-${i}"></canvas>
          ${settings.showPrice ? `<div style="font-size: ${fontSize + 2}px; font-weight: bold; margin-top: 3px;">${formatCurrency(currentProduct.price)}</div>` : ''}
        </div>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
        <head>
          <title>${language === 'ar' ? 'ملصقات الباركود' : 'Barcode Labels'}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
            .labels-container {
              display: flex;
              flex-wrap: wrap;
              justify-content: flex-start;
            }
            @media print {
              .label { border: none !important; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 15px; padding: 10px; background: #f0f0f0; border-radius: 8px; text-align: center;">
            <button onclick="window.print()" style="padding: 12px 24px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: 600;">
              🖨️ ${language === 'ar' ? 'طباعة الملصقات' : 'Print Labels'}
            </button>
            <span style="margin: 0 15px; color: #666;">${language === 'ar' ? `الكمية: ${settings.quantity}` : `Quantity: ${settings.quantity}`}</span>
          </div>
          <div class="labels-container">
            ${labelsHtml}
          </div>
          <script>
            ${Array.from({ length: settings.quantity }, (_, i) => `
              try {
                JsBarcode("#barcode-${i}", "${barcodeValue}", {
                  format: "CODE128",
                  width: ${barcodeWidth},
                  height: ${barcodeHeight},
                  displayValue: true,
                  fontSize: ${fontSize},
                  margin: 5
                });
              } catch(e) { console.error(e); }
            `).join('')}
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();

    toast({
      title: language === 'ar' ? 'جاري الطباعة' : 'Printing',
      description: language === 'ar' ? `طباعة ${settings.quantity} ملصق` : `Printing ${settings.quantity} labels`
    });
  };

  const translations = {
    en: {
      title: 'Print Barcode Labels',
      selectProduct: 'Select Product',
      quantity: 'Quantity',
      labelSize: 'Label Size',
      small: 'Small (50x30mm)',
      medium: 'Medium (70x40mm)',
      large: 'Large (100x60mm)',
      showPrice: 'Show Price',
      preview: 'Preview',
      print: 'Print Labels',
      saveSettings: 'Save Settings',
      loadSettings: 'Load Settings',
      resetSettings: 'Reset',
    },
    ar: {
      title: 'طباعة ملصقات الباركود',
      selectProduct: 'اختر المنتج',
      quantity: 'الكمية',
      labelSize: 'حجم الملصق',
      small: 'صغير (50x30 مم)',
      medium: 'متوسط (70x40 مم)',
      large: 'كبير (100x60 مم)',
      showPrice: 'إظهار السعر',
      preview: 'معاينة',
      print: 'طباعة الملصقات',
      saveSettings: 'حفظ الإعدادات',
      loadSettings: 'تحميل الإعدادات',
      resetSettings: 'إعادة تعيين',
    }
  };

  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer size={20} />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* أزرار حفظ وتحميل الإعدادات */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={saveSettingsToMain} title={t.saveSettings}>
              <Save className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={loadSettingsFromMain} title={t.loadSettings}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={resetSettings} title={t.resetSettings}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {!selectedProduct && (
            <div className="space-y-2">
              <Label>{t.selectProduct}</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.selectProduct} />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id}>
                      {language === 'ar' ? (product.name_ar || product.name) : product.name} - {product.sku}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.quantity}</Label>
              <Input
                type="number"
                min={1}
                max={100}
                value={settings.quantity}
                onChange={(e) => setSettings({ ...settings, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.labelSize}</Label>
              <Select 
                value={settings.labelSize} 
                onValueChange={(v) => setSettings({ ...settings, labelSize: v as 'small' | 'medium' | 'large' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">{t.small}</SelectItem>
                  <SelectItem value="medium">{t.medium}</SelectItem>
                  <SelectItem value="large">{t.large}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showPrice"
              checked={settings.showPrice}
              onChange={(e) => setSettings({ ...settings, showPrice: e.target.checked })}
              className="rounded border-input"
            />
            <Label htmlFor="showPrice">{t.showPrice}</Label>
          </div>

          <Separator />

          {currentProduct && (
            <div className="space-y-2">
              <Label>{t.preview}</Label>
              <Card className="p-4 text-center bg-white">
                <p className="text-sm font-semibold mb-2">
                  {language === 'ar' ? (currentProduct.name_ar || currentProduct.name) : currentProduct.name}
                </p>
                {currentProduct.barcode ? (
                  <canvas ref={canvasRef} className="mx-auto" />
                ) : (
                  <div className="text-red-500 text-sm py-4">
                    {language === 'ar' ? 'لا يوجد باركود' : 'No barcode'}
                  </div>
                )}
                {settings.showPrice && (
                  <p className="text-sm font-bold mt-2">{formatCurrency(currentProduct.price)}</p>
                )}
              </Card>
            </div>
          )}

          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handlePrint}
            disabled={!currentProduct}
          >
            <Printer size={18} className="me-2" />
            {t.print} ({settings.quantity})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};