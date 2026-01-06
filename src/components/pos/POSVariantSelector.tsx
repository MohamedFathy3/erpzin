import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

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

  const sizes = React.useMemo(() => {
    if (!variants) return [];
    const sizeMap = new Map();
    variants.forEach(v => {
      if (v.size && !sizeMap.has(v.size.id)) {
        sizeMap.set(v.size.id, v.size);
      }
    });
    return Array.from(sizeMap.values());
  }, [variants]);

  const colors = React.useMemo(() => {
    if (!variants) return [];
    const colorMap = new Map();
    variants.forEach(v => {
      if (v.color && !colorMap.has(v.color.id)) {
        colorMap.set(v.color.id, v.color);
      }
    });
    return Array.from(colorMap.values());
  }, [variants]);

  const selectedVariant = React.useMemo(() => {
    if (!variants) return null;
    return variants.find(v => 
      (!selectedSize || v.size?.id === selectedSize) &&
      (!selectedColor || v.color?.id === selectedColor)
    );
  }, [variants, selectedSize, selectedColor]);

  const handleConfirm = () => {
    if (!selectedVariant) return;

    const sizeName = selectedVariant.size 
      ? (language === 'ar' ? selectedVariant.size.name_ar || selectedVariant.size.name : selectedVariant.size.name)
      : undefined;
    const colorName = selectedVariant.color
      ? (language === 'ar' ? selectedVariant.color.name_ar || selectedVariant.color.name : selectedVariant.color.name)
      : undefined;

    const variantPrice = product.price + (selectedVariant.price_adjustment || 0);

    onSelectVariant({
      id: product.id,
      variantId: selectedVariant.id,
      name: product.name,
      nameAr: product.nameAr,
      price: variantPrice,
      sku: selectedVariant.sku,
      sizeName,
      colorName
    });
    onClose();
    setSelectedSize(null);
    setSelectedColor(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h2 className="text-lg font-bold text-foreground">
            {language === 'ar' ? 'اختر المتغير' : 'Select Variant'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Product Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl">👕</span>
              )}
            </div>
            <div>
              <p className="font-medium text-foreground">
                {language === 'ar' ? product.nameAr : product.name}
              </p>
              <p className="text-sm text-muted-foreground">{product.sku}</p>
              <p className="text-primary font-semibold">{product.price.toLocaleString()} YER</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Sizes */}
              {sizes.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {language === 'ar' ? 'المقاس' : 'Size'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sizes.map((size: any) => (
                      <button
                        key={size.id}
                        onClick={() => setSelectedSize(size.id === selectedSize ? null : size.id)}
                        className={cn(
                          'px-4 py-2 rounded-lg border font-medium transition-all',
                          selectedSize === size.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:border-primary'
                        )}
                      >
                        {language === 'ar' ? size.name_ar || size.name : size.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Colors */}
              {colors.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    {language === 'ar' ? 'اللون' : 'Color'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((color: any) => (
                      <button
                        key={color.id}
                        onClick={() => setSelectedColor(color.id === selectedColor ? null : color.id)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 rounded-lg border font-medium transition-all',
                          selectedColor === color.id
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-background border-border hover:border-primary'
                        )}
                      >
                        {color.hex_code && (
                          <span 
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: color.hex_code }}
                          />
                        )}
                        {language === 'ar' ? color.name_ar || color.name : color.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Selected Variant Info */}
              {selectedVariant && (
                <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'المتغير المحدد' : 'Selected Variant'}
                      </p>
                      <p className="font-medium text-foreground">{selectedVariant.sku}</p>
                    </div>
                    <div className="text-end">
                      <p className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'المخزون' : 'Stock'}
                      </p>
                      <p className={cn(
                        'font-medium',
                        selectedVariant.stock > 0 ? 'text-success' : 'text-destructive'
                      )}>
                        {selectedVariant.stock}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <Button
            onClick={handleConfirm}
            disabled={!selectedVariant || selectedVariant.stock === 0}
            className="w-full h-12 text-lg font-bold bg-gradient-to-r from-success to-success-light hover:opacity-90 text-white"
          >
            <Check size={20} className="me-2" />
            {language === 'ar' ? 'إضافة للسلة' : 'Add to Cart'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default POSVariantSelector;
