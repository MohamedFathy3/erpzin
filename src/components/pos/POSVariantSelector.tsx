import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { cn } from '@/lib/utils';
import { X, Check, ShoppingCart, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getProductColors, getProductSizes, getAvailableVariants } from '@/hooks/usePOSData';

// تعريف الـ Product من usePOSData
interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  price: number;
  sku: string;
  image_url?: string | null;
  imageUrl?: string | null;
  image?: {
    fullUrl?: string;
    previewUrl?: string;
  };
  units?: Array<{
    id: number;
    unit_id: number;
    unit_name: string;
    sell_price: string;
    barcode: string;
    colors: Array<{
      id: number;
      color_id: number;
      color: string;
      stock: number;
    }>;
  }>;
}

interface SelectedVariant {
  unitId: number;
  colorId: number;
  sizeName: string;
  colorName: string;
  price: number;
  stock: number;
  sku: string;
  quantity: number;
}

interface POSVariantSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSelectVariant: (variant: {
    productId: string;
    unitId: number;
    colorId: number;
    size: string;
    color: string;
    price: number;
    sku: string;
    stock: number;
  }) => void;
}

const POSVariantSelector: React.FC<POSVariantSelectorProps> = ({
  isOpen,
  onClose,
  product,
  onSelectVariant
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([]);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  // استخراج المقاسات والألوان المتاحة
  const availableSizes = useMemo(() => {
    if (!product.units) return [];
    return product.units.map(unit => ({
      id: unit.unit_id,
      name: unit.unit_name,
      label: unit.unit_name
    }));
  }, [product.units]);

  const availableColors = useMemo(() => {
    if (!product.units || !selectedSize) return [];
    
    const unit = product.units.find(u => u.unit_name === selectedSize);
    if (!unit) return [];
    
    return unit.colors.map(color => ({
      id: color.color_id,
      name: color.color,
      stock: color.stock,
      hexCode: getColorHex(color.color)
    }));
  }, [product.units, selectedSize]);

  // ✅ الحصول على تفاصيل الـ variant المحدد (مع أو بدون لون)
  const selectedVariantDetails = useMemo(() => {
    if (!selectedSize || !product.units) return null;
    
    const unit = product.units.find(u => u.unit_name === selectedSize);
    if (!unit) return null;
    
    // ✅ لو مختارش لون، نستخدم أول لون (أو نستخدم بيانات بدون لون)
    if (!selectedColor) {
      return {
        unitId: unit.unit_id,
        colorId: unit.colors[0]?.color_id || 0,
        price: parseFloat(unit.sell_price || '0'),
        stock: unit.colors.reduce((sum, color) => sum + color.stock, 0), // مجموع المخزون لكل الألوان
        sku: unit.barcode || product.sku
      };
    }
    
    // ✅ لو مختار لون محدد
    const color = unit.colors.find(c => c.color === selectedColor);
    if (!color) return null;
    
    return {
      unitId: unit.unit_id,
      colorId: color.color_id,
      price: parseFloat(unit.sell_price || '0'),
      stock: color.stock,
      sku: unit.barcode || product.sku
    };
  }, [product, selectedSize, selectedColor]);

  const handleAddToCart = () => {
    if (selectedVariantDetails) {
      onSelectVariant({
        productId: product.id,
        unitId: selectedVariantDetails.unitId,
        colorId: selectedVariantDetails.colorId,
        size: selectedSize,
        color: selectedColor || '', // ✅ لو مفيش لون، نرسل string فاضي
        price: selectedVariantDetails.price,
        sku: selectedVariantDetails.sku,
        stock: selectedVariantDetails.stock
      });
    }
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setSelectedSize('');
    setSelectedColor('');
    setSelectedVariants([]);
  };

  if (!isOpen) return null;

  const t = {
    en: {
      selectVariants: 'Select Variants',
      size: 'Size',
      colors: 'Colors (Optional)',
      addToCart: 'Add to Cart',
      items: 'items',
      total: 'Total',
      selectedItems: 'Selected Items',
      noSelection: 'Select size',
      tapToSelect: 'Choose size',
      noVariants: 'No variants available',
      noVariantsDesc: 'This product has no configured variants.',
      outOfStock: 'Out of Stock',
      optional: 'Optional'
    },
    ar: {
      selectVariants: 'اختر المتغيرات',
      size: 'المقاس',
      colors: 'الألوان (اختياري)',
      addToCart: 'إضافة للسلة',
      items: 'عناصر',
      total: 'المجموع',
      selectedItems: 'العناصر المحددة',
      noSelection: 'اختر المقاس',
      tapToSelect: 'اختر المقاس',
      noVariants: 'لا توجد متغيرات متاحة',
      noVariantsDesc: 'هذا المنتج ليس له متغيرات',
      outOfStock: 'غير متوفر',
      optional: 'اختياري'
    }
  }[language];

  // إذا مافيش units
  if (!product.units || product.units.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
        <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📦</span>
          </div>
          <h3 className="text-lg font-semibold mb-2">{t.noVariants}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t.noVariantsDesc}</p>
          <Button onClick={handleClose} className="w-full">
            {language === 'ar' ? 'حسناً' : 'OK'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      <div className="relative w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {product.image?.fullUrl || product.imageUrl || product.image_url ? (
                <img 
                  src={product.image?.fullUrl || product.imageUrl || product.image_url || ''} 
                  alt={product.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  }}
                />
              ) : (
                <span className="text-xl">👕</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {language === 'ar' ? product.name_ar || product.name : product.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(product.price)}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1 p-4">
          {/* Size Selection - إجباري */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-primary rounded-full" />
              {t.size} <span className="text-xs text-destructive">*</span>
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSizes.map((size) => (
                <button
                  key={size.id}
                  onClick={() => {
                    setSelectedSize(size.name);
                    setSelectedColor(''); // ✅ مسح اللون المحدد عند تغيير المقاس
                  }}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all text-center',
                    selectedSize === size.name
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className="font-medium text-sm">
                    {size.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection - اختياري - يظهر فقط لو اختار مقاس */}
          {selectedSize && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <span className="w-1.5 h-5 bg-primary rounded-full" />
                {t.colors} <span className="text-xs text-muted-foreground">({t.optional})</span>
              </h3>
              
              {/* خيار "بدون لون" */}
              <div className="mb-3">
                <button
                  onClick={() => setSelectedColor('')}
                  className={cn(
                    'p-2 rounded-lg border-2 transition-all text-center w-full',
                    selectedColor === ''
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span className="font-medium text-sm">
                    {language === 'ar' ? 'بدون لون' : 'No Color'}
                  </span>
                </button>
              </div>

              {/* ألوان المنتج */}
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {availableColors.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.name)}
                    // disabled={color.stock === 0}
                    className={cn(
                      'relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all',
                      selectedColor === color.name
                        ? 'ring-2 ring-primary ring-offset-2'
                        : 'hover:ring-1 hover:ring-primary/50',
                      color.stock === 0 && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div 
                      className={cn(
                        "w-10 h-10 rounded-full border-2 flex items-center justify-center",
                        selectedColor === color.name ? 'border-primary' : 'border-border'
                      )}
                      style={{ backgroundColor: color.hexCode || '#ccc' }}
                    >
                      {selectedColor === color.name && (
                        <Check size={16} className="text-white drop-shadow-md" />
                      )}
                    </div>
                    <span className="text-xs font-medium truncate w-full text-center">
                      {color.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Variant Summary */}
          {selectedVariantDetails && selectedSize && (
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  {language === 'ar' ? 'التفاصيل' : 'Details'}
                </span>
                <Badge variant="outline" className="bg-background">
                  {selectedSize} {selectedColor && `- ${selectedColor}`}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">
                    SKU: {selectedVariantDetails.sku}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'المخزون' : 'Stock'}: {selectedVariantDetails.stock}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'السعر' : 'Price'}
                  </p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(selectedVariantDetails.price)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background flex-shrink-0">
          {selectedSize ? (
            <Button 
              onClick={handleAddToCart}
              // disabled={selectedVariantDetails?.stock === 0}
              className="w-full h-12 text-base gap-2"
            >
              <ShoppingCart size={20} />
              {t.addToCart}
              {selectedVariantDetails && selectedVariantDetails.price > 0 && (
                <span className="ms-2 opacity-90">
                  {formatCurrency(selectedVariantDetails.price)}
                </span>
              )}
            </Button>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {t.tapToSelect}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// دالة مساعدة للحصول على هيكس كود اللون
function getColorHex(colorName: string): string {
  const colorMap: Record<string, string> = {
    'أسود': '#000000',
    'أبيض': '#FFFFFF',
    'أحمر': '#FF0000',
    'أخضر': '#00FF00',
    'أزرق': '#0000FF',
    'أصفر': '#FFFF00',
    'بنفسجي': '#800080',
    'وردي': '#FFC0CB',
    'رمادي': '#808080',
    'بني': '#8B4513',
    'برتقالي': '#FFA500',
    'name': '#666666'
  };
  
  return colorMap[colorName] || '#CCCCCC';
}

export default POSVariantSelector;