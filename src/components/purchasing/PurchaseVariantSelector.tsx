import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Check, ChevronRight, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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

interface PurchaseVariantSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    name_ar: string | null;
    cost: number;
    sku: string;
    image_url?: string;
  };
  onSelectVariant: (variant: {
    product_id: string;
    variant_id: string;
    product_name: string;
    product_sku: string;
    unit_cost: number;
    size_name?: string;
    color_name?: string;
  }) => void;
}

const PurchaseVariantSelector: React.FC<PurchaseVariantSelectorProps> = ({
  isOpen,
  onClose,
  product,
  onSelectVariant
}) => {
  const { language } = useLanguage();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  const { data: variants, isLoading } = useQuery({
    queryKey: ['product-variants-purchase', product.id],
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

  // Extract unique sizes with their variants (colors are optional)
  const sizes = useMemo(() => {
    if (!variants) return [];
    const sizeMap = new Map();
    variants.forEach(v => {
      if (v.size && !sizeMap.has(v.size.id)) {
        const variantsForSize = variants.filter(
          variant => variant.size?.id === v.size?.id
        );
        const hasColors = variantsForSize.some(variant => variant.color);
        sizeMap.set(v.size.id, { 
          ...v.size, 
          variantCount: variantsForSize.length,
          hasColors
        });
      }
    });
    return Array.from(sizeMap.values());
  }, [variants]);

  // Get variants available for selected size (with or without colors)
  const variantsForSelectedSize = useMemo(() => {
    if (!variants || !selectedSize) return [];
    return variants
      .filter(v => v.size?.id === selectedSize)
      .map(v => ({
        variant: v,
        color: v.color,
        stock: v.stock,
        cost: (product.cost || 0) + (v.cost_adjustment || 0)
      }));
  }, [variants, selectedSize, product.cost]);

  const handleVariantSelect = (variant: ProductVariant) => {
    const sizeName = variant.size 
      ? (language === 'ar' ? variant.size.name_ar || variant.size.name : variant.size.name)
      : undefined;
    const colorName = variant.color
      ? (language === 'ar' ? variant.color.name_ar || variant.color.name : variant.color.name)
      : undefined;

    const variantCost = (product.cost || 0) + (variant.cost_adjustment || 0);

    onSelectVariant({
      product_id: product.id,
      variant_id: variant.id,
      product_name: `${language === 'ar' ? product.name_ar || product.name : product.name}${sizeName ? ` - ${sizeName}` : ''}${colorName ? ` / ${colorName}` : ''}`,
      product_sku: variant.sku,
      unit_cost: variantCost,
      size_name: sizeName,
      color_name: colorName
    });
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setSelectedSize(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md p-0">
        <DialogHeader className="p-4 pb-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package size={20} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base font-bold truncate">
                {language === 'ar' ? product.name_ar || product.name : product.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">{(product.cost || 0).toLocaleString()} YER</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !selectedSize ? (
            /* Step 1: Size Selection */
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">1</Badge>
                <span className="text-xs font-medium text-foreground">
                  {language === 'ar' ? 'اختر المقاس' : 'Select Size'}
                </span>
              </div>
              
              <div className="grid grid-cols-4 gap-1.5">
                {sizes.map((size: any) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size.id)}
                    className={cn(
                      'relative p-2 rounded-lg border font-semibold text-sm transition-all',
                      'bg-background border-border hover:border-primary hover:bg-primary/5'
                    )}
                  >
                    <span>{language === 'ar' ? size.name_ar || size.name : size.name}</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      {size.variantCount} {language === 'ar' ? (size.hasColors ? 'لون' : 'متغير') : (size.hasColors ? 'colors' : 'variant')}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Step 2: Variant Selection */
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">2</Badge>
                  <span className="text-xs font-medium text-foreground">
                    {language === 'ar' ? 'اختر المتغير' : 'Select Variant'}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedSize(null)}
                  className="text-[10px] text-primary hover:underline"
                >
                  {language === 'ar' ? 'تغيير' : 'Change'}
                </button>
              </div>

              {/* Selected Size Badge */}
              <div className="flex items-center gap-2 p-1.5 bg-primary/10 rounded-lg mb-3">
                <span className="text-[10px] text-muted-foreground">
                  {language === 'ar' ? 'المقاس:' : 'Size:'}
                </span>
                <Badge variant="default" className="text-[10px] px-1.5 py-0">
                  {(() => {
                    const size = sizes.find((s: any) => s.id === selectedSize);
                    return size ? (language === 'ar' ? size.name_ar || size.name : size.name) : '';
                  })()}
                </Badge>
              </div>

              {/* Variants Grid */}
              <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto">
                {variantsForSelectedSize.map(({ variant, color, stock, cost }) => (
                  <button
                    key={variant.id}
                    onClick={() => handleVariantSelect(variant)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded-lg border transition-all text-start',
                      'bg-background border-border hover:border-primary hover:bg-primary/5'
                    )}
                  >
                    {/* Color Swatch (if color exists) */}
                    {color ? (
                      <div 
                        className="w-6 h-6 rounded border border-border flex-shrink-0"
                        style={{ backgroundColor: color.hex_code || '#ccc' }}
                      />
                    ) : (
                      <div className="w-6 h-6 rounded border border-border flex-shrink-0 bg-muted flex items-center justify-center">
                        <Package size={12} className="text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Variant Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs text-foreground truncate">
                        {color 
                          ? (language === 'ar' ? color.name_ar || color.name : color.name)
                          : (language === 'ar' ? 'افتراضي' : 'Default')
                        }
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {cost.toLocaleString()}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {stock}
                        </Badge>
                      </div>
                    </div>

                    <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseVariantSelector;
