import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Check, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

interface ProductVariant {
  id: string;
  sku: string;
  barcode: string | null;
  stock: number;
  price_adjustment: number | null;
  cost_adjustment: number | null;
  size: { id: string; name: string; name_ar: string | null; code: string } | null;
  color: { id: string; name: string; name_ar: string | null; hex_code: string | null } | null;
}

interface POSVariantSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    nameAr: string;
    price: number;
    sku: string;
    image?: string;
  };
  onSelectVariant: (variant: {
    id: string;
    variantId: string;
    name: string;
    nameAr: string;
    price: number;
    sku: string;
    sizeName?: string;
    colorName?: string;
  }) => void;
}

const POSVariantSelector: React.FC<POSVariantSelectorProps> = ({
  isOpen,
  onClose,
  product,
  onSelectVariant
}) => {
  const { language } = useLanguage();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const { data: variants, isLoading } = useQuery({
    queryKey: ['product-variants-pos', product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id,
          sku,
          barcode,
          stock,
          price_adjustment,
          cost_adjustment,
          size:sizes(id, name, name_ar, code),
          color:colors(id, name, name_ar, hex_code)
        `)
        .eq('product_id', product.id)
        .eq('is_active', true);

      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: isOpen
  });

  // Extract unique sizes
  const sizes = useMemo(() => {
    if (!variants) return [];
    const sizeMap = new Map();
    variants.forEach(v => {
      if (v.size && !sizeMap.has(v.size.id)) {
        // Count available colors for this size
        const colorsForSize = variants.filter(
          variant => variant.size?.id === v.size?.id && variant.stock > 0
        ).length;
        const totalColorsForSize = variants.filter(
          variant => variant.size?.id === v.size?.id
        ).length;
        sizeMap.set(v.size.id, { 
          ...v.size, 
          availableColors: colorsForSize,
          totalColors: totalColorsForSize
        });
      }
    });
    return Array.from(sizeMap.values());
  }, [variants]);

  // Get colors available for selected size
  const colorsForSelectedSize = useMemo(() => {
    if (!variants || !selectedSize) return [];
    return variants
      .filter(v => v.size?.id === selectedSize && v.color)
      .map(v => ({
        variant: v,
        color: v.color!,
        stock: v.stock,
        price: product.price + (v.price_adjustment || 0)
      }));
  }, [variants, selectedSize, product.price]);

  const handleColorSelect = (variant: ProductVariant) => {
    if (variant.stock === 0) return;

    const sizeName = variant.size 
      ? (language === 'ar' ? variant.size.name_ar || variant.size.name : variant.size.name)
      : undefined;
    const colorName = variant.color
      ? (language === 'ar' ? variant.color.name_ar || variant.color.name : variant.color.name)
      : undefined;

    const variantPrice = product.price + (variant.price_adjustment || 0);

    onSelectVariant({
      id: product.id,
      variantId: variant.id,
      name: product.name,
      nameAr: product.nameAr,
      price: variantPrice,
      sku: variant.sku,
      sizeName,
      colorName
    });
    onClose();
    setSelectedSize(null);
  };

  const handleClose = () => {
    onClose();
    setSelectedSize(null);
  };

  if (!isOpen) return null;

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'bg-destructive/10 text-destructive', label: language === 'ar' ? 'نفد' : 'Out' };
    if (stock <= 5) return { color: 'bg-warning/10 text-warning', label: stock.toString() };
    return { color: 'bg-success/10 text-success', label: stock.toString() };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      <div className="relative w-full max-w-lg mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">👕</span>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                {language === 'ar' ? product.nameAr : product.name}
              </h2>
              <p className="text-sm text-muted-foreground">{product.price.toLocaleString()} YER</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !selectedSize ? (
            /* Step 1: Size Selection */
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="secondary" className="text-xs">
                  {language === 'ar' ? 'الخطوة 1' : 'Step 1'}
                </Badge>
                <span className="text-sm font-medium text-foreground">
                  {language === 'ar' ? 'اختر المقاس' : 'Select Size'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                {sizes.map((size: any) => {
                  const hasStock = size.availableColors > 0;
                  return (
                    <button
                      key={size.id}
                      onClick={() => hasStock && setSelectedSize(size.id)}
                      disabled={!hasStock}
                      className={cn(
                        'relative p-4 rounded-xl border-2 font-bold text-lg transition-all',
                        hasStock
                          ? 'bg-background border-border hover:border-primary hover:bg-primary/5 cursor-pointer'
                          : 'bg-muted/50 border-muted text-muted-foreground cursor-not-allowed opacity-50'
                      )}
                    >
                      <span>{language === 'ar' ? size.name_ar || size.name : size.name}</span>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <span className={cn(
                          'text-xs',
                          hasStock ? 'text-success' : 'text-destructive'
                        )}>
                          {size.availableColors}/{size.totalColors}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {language === 'ar' ? 'لون' : 'colors'}
                        </span>
                      </div>
                      {hasStock && (
                        <ChevronRight 
                          size={16} 
                          className="absolute top-1/2 -translate-y-1/2 end-2 text-muted-foreground" 
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Step 2: Color Selection */
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {language === 'ar' ? 'الخطوة 2' : 'Step 2'}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">
                    {language === 'ar' ? 'اختر اللون' : 'Select Color'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSize(null)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {language === 'ar' ? 'تغيير المقاس' : 'Change Size'}
                </button>
              </div>

              {/* Selected Size Badge */}
              <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg mb-4">
                <span className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'المقاس:' : 'Size:'}
                </span>
                <Badge variant="default" className="font-bold">
                  {(() => {
                    const size = sizes.find((s: any) => s.id === selectedSize);
                    return size ? (language === 'ar' ? size.name_ar || size.name : size.name) : '';
                  })()}
                </Badge>
              </div>

              {/* Colors Grid */}
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
                {colorsForSelectedSize.map(({ variant, color, stock, price }) => {
                  const stockStatus = getStockStatus(stock);
                  const isOutOfStock = stock === 0;
                  
                  return (
                    <button
                      key={variant.id}
                      onClick={() => handleColorSelect(variant)}
                      disabled={isOutOfStock}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-start',
                        isOutOfStock
                          ? 'bg-muted/50 border-muted cursor-not-allowed opacity-60'
                          : 'bg-background border-border hover:border-primary hover:bg-primary/5'
                      )}
                    >
                      {/* Color Swatch */}
                      <div 
                        className="w-10 h-10 rounded-lg border-2 border-border flex-shrink-0"
                        style={{ backgroundColor: color.hex_code || '#ccc' }}
                      />
                      
                      {/* Color Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {language === 'ar' ? color.name_ar || color.name : color.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={cn('text-xs', stockStatus.color)}>
                            {stockStatus.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {price.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {!isOutOfStock && (
                        <Check size={18} className="text-success flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="p-3 border-t border-border bg-muted/20 text-center">
          <p className="text-xs text-muted-foreground">
            {!selectedSize 
              ? (language === 'ar' ? 'اضغط على المقاس لعرض الألوان المتاحة' : 'Tap a size to see available colors')
              : (language === 'ar' ? 'اضغط على اللون لإضافته للسلة' : 'Tap a color to add to cart')
            }
          </p>
        </div>
      </div>
    </div>
  );
};

export default POSVariantSelector;
