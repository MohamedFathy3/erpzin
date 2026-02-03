import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
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
  AlertCircle
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
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSearch = useCallback(() => {
    if (!barcode.trim()) return;

    const product = products.find(
      p => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
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

  const t = translations[language];

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
                    {language === 'ar' ? foundProduct.name_ar || foundProduct.name : foundProduct.name}
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
                <Button className="w-full mt-4 gradient-success" onClick={handleSelect}>
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

interface BarcodeLabelPrinterProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  selectedProduct?: Product | null;
}

export const BarcodeLabelPrinter: React.FC<BarcodeLabelPrinterProps> = ({
  isOpen,
  onClose,
  products,
  selectedProduct
}) => {
  const { language } = useLanguage();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [labelSize, setLabelSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [showPrice, setShowPrice] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentProduct = selectedProduct || products.find(p => p.id === selectedProductId);

  useEffect(() => {
    if (selectedProduct) {
      setSelectedProductId(selectedProduct.id);
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (currentProduct && canvasRef.current) {
      try {
        JsBarcode(canvasRef.current, currentProduct.barcode || currentProduct.sku, {
          format: 'CODE128',
          width: labelSize === 'small' ? 1 : labelSize === 'medium' ? 2 : 3,
          height: labelSize === 'small' ? 40 : labelSize === 'medium' ? 60 : 80,
          displayValue: true,
          fontSize: labelSize === 'small' ? 10 : labelSize === 'medium' ? 14 : 18,
          margin: 10
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }, [currentProduct, labelSize]);

  const handlePrint = () => {
    if (!currentProduct) return;

    const printWindow = window.open('', '', 'height=400,width=600');
    if (!printWindow) return;

    const labelWidth = labelSize === 'small' ? '50mm' : labelSize === 'medium' ? '70mm' : '100mm';
    const labelHeight = labelSize === 'small' ? '30mm' : labelSize === 'medium' ? '40mm' : '60mm';

    let labelsHtml = '';
    for (let i = 0; i < quantity; i++) {
      labelsHtml += `
        <div class="label" style="width: ${labelWidth}; height: ${labelHeight}; border: 1px dashed #ccc; padding: 5px; margin: 5px; display: inline-block; text-align: center; page-break-inside: avoid;">
          <div style="font-size: ${labelSize === 'small' ? '8px' : labelSize === 'medium' ? '10px' : '12px'}; font-weight: bold; margin-bottom: 3px;">
            ${language === 'ar' ? currentProduct.name_ar || currentProduct.name : currentProduct.name}
          </div>
          <canvas id="barcode-${i}"></canvas>
          ${showPrice ? `<div style="font-size: ${labelSize === 'small' ? '10px' : labelSize === 'medium' ? '12px' : '14px'}; font-weight: bold; margin-top: 3px;">${currentProduct.price.toLocaleString()} YER</div>` : ''}
        </div>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode Labels</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
            @media print {
              .label { border: none !important; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 10px;">
            <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Print Labels</button>
          </div>
          ${labelsHtml}
          <script>
            document.querySelectorAll('canvas[id^="barcode-"]').forEach(canvas => {
              JsBarcode(canvas, "${currentProduct.barcode || currentProduct.sku}", {
                format: "CODE128",
                width: ${labelSize === 'small' ? 1 : labelSize === 'medium' ? 2 : 3},
                height: ${labelSize === 'small' ? 30 : labelSize === 'medium' ? 45 : 60},
                displayValue: true,
                fontSize: ${labelSize === 'small' ? 8 : labelSize === 'medium' ? 10 : 12},
                margin: 5
              });
            });
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    toast({
      title: language === 'ar' ? 'جاري الطباعة' : 'Printing',
      description: language === 'ar' ? `طباعة ${quantity} ملصق` : `Printing ${quantity} labels`
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
      print: 'Print Labels'
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
      print: 'طباعة الملصقات'
    }
  };

  const t = translations[language];

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
                      {language === 'ar' ? product.name_ar || product.name : product.name} - {product.sku}
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
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t.labelSize}</Label>
              <Select value={labelSize} onValueChange={(v) => setLabelSize(v as 'small' | 'medium' | 'large')}>
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
              checked={showPrice}
              onChange={(e) => setShowPrice(e.target.checked)}
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
                  {language === 'ar' ? currentProduct.name_ar || currentProduct.name : currentProduct.name}
                </p>
                <canvas ref={canvasRef} className="mx-auto" />
                {showPrice && (
                  <p className="text-sm font-bold mt-2">{currentProduct.price.toLocaleString()} YER</p>
                )}
              </Card>
            </div>
          )}

          <Button
            className="w-full gradient-success"
            onClick={handlePrint}
            disabled={!currentProduct}
          >
            <Printer size={18} className="me-2" />
            {t.print} ({quantity})
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
