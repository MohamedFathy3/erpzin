import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { cn } from '@/lib/utils';
import { X, Check, ShoppingCart, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface SelectedVariant {
  variantId: string;
  sizeId: string;
  colorId: string;
  sizeName: string;
  colorName: string;
  price: number;
  stock: number;
  sku: string;
  hexCode: string | null;
  quantity: number;
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
  const { formatCurrency } = useRegionalSettings();
  const [selectedVariants, setSelectedVariants] = useState<SelectedVariant[]>([]);

  // Fetch POS settings to check allowNegativeStock
  const { data: posSettings } = useQuery({
    queryKey: ['pos-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('module_settings')
        .select('settings')
        .eq('module_name', 'pos')
        .single();
      
      if (error) return { allowNegativeStock: false };
      return data?.settings as { allowNegativeStock?: boolean } || { allowNegativeStock: false };
    },
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  const allowNegativeStock = posSettings?.allowNegativeStock || false;

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

  // Group variants by size with their available colors (colors are optional)
  const sizeColorMatrix = useMemo(() => {
    if (!variants) return [];
    
    const sizeMap = new Map<string, {
      size: ProductVariant['size'];
      variants: Array<{
        variant: ProductVariant;
        color: ProductVariant['color'];
        stock: number;
        price: number;
      }>;
      hasColors: boolean;
    }>();

    variants.forEach(v => {
      // Size is required, color is optional
      if (v.size) {
        if (!sizeMap.has(v.size.id)) {
          sizeMap.set(v.size.id, {
            size: v.size,
            variants: [],
            hasColors: false
          });
        }
        const sizeEntry = sizeMap.get(v.size.id)!;
        sizeEntry.variants.push({
          variant: v,
          color: v.color,
          stock: v.stock,
          price: product.price + (v.price_adjustment || 0)
        });
        if (v.color) {
          sizeEntry.hasColors = true;
        }
      }
    });

    return Array.from(sizeMap.values());
  }, [variants, product.price]);

  const isVariantSelected = (variantId: string) => {
    return selectedVariants.some(v => v.variantId === variantId);
  };

  const getSelectedVariant = (variantId: string) => {
    return selectedVariants.find(v => v.variantId === variantId);
  };

  const toggleVariant = (variant: ProductVariant, price: number) => {
    // Only block if stock is 0 AND negative stock is not allowed
    if (variant.stock === 0 && !allowNegativeStock) return;

    const sizeName = variant.size 
      ? (language === 'ar' ? variant.size.name_ar || variant.size.name : variant.size.name)
      : '';
    const colorName = variant.color
      ? (language === 'ar' ? variant.color.name_ar || variant.color.name : variant.color.name)
      : '';

    if (isVariantSelected(variant.id)) {
      setSelectedVariants(prev => prev.filter(v => v.variantId !== variant.id));
    } else {
      setSelectedVariants(prev => [...prev, {
        variantId: variant.id,
        sizeId: variant.size?.id || '',
        colorId: variant.color?.id || '',
        sizeName,
        colorName,
        price,
        stock: variant.stock,
        sku: variant.sku,
        hexCode: variant.color?.hex_code || null,
        quantity: 1
      }]);
    }
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setSelectedVariants(prev => prev.map(v => {
      if (v.variantId === variantId) {
        const newQty = Math.max(1, Math.min(v.stock, v.quantity + delta));
        return { ...v, quantity: newQty };
      }
      return v;
    }));
  };

  const handleAddToCart = () => {
    selectedVariants.forEach(sv => {
      for (let i = 0; i < sv.quantity; i++) {
        onSelectVariant({
          id: product.id,
          variantId: sv.variantId,
          name: product.name,
          nameAr: product.nameAr,
          price: sv.price,
          sku: sv.sku,
          sizeName: sv.sizeName,
          colorName: sv.colorName
        });
      }
    });
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setSelectedVariants([]);
  };

  const totalItems = selectedVariants.reduce((sum, v) => sum + v.quantity, 0);
  const totalPrice = selectedVariants.reduce((sum, v) => sum + (v.price * v.quantity), 0);

  if (!isOpen) return null;

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { color: 'bg-destructive/10 text-destructive', label: language === 'ar' ? 'نفد' : 'Out' };
    if (stock <= 5) return { color: 'bg-warning/10 text-warning', label: stock.toString() };
    return { color: 'bg-success/10 text-success', label: stock.toString() };
  };

  const t = {
    en: {
      selectVariants: 'Select Variants',
      size: 'Size',
      colors: 'Colors',
      addToCart: 'Add to Cart',
      items: 'items',
      total: 'Total',
      selectedItems: 'Selected Items',
      noSelection: 'Select size and color combinations',
      tapToSelect: 'Tap to select variants',
      noVariants: 'No variants available',
      noVariantsDesc: 'This product has no configured variants. Please add variants from the inventory page.',
      noColor: 'Default',
      select: 'Select'
    },
    ar: {
      selectVariants: 'اختر المتغيرات',
      size: 'المقاس',
      colors: 'الألوان',
      addToCart: 'إضافة للسلة',
      items: 'عناصر',
      total: 'المجموع',
      selectedItems: 'العناصر المحددة',
      noSelection: 'اختر تركيبات المقاس واللون',
      tapToSelect: 'اضغط للاختيار',
      noVariants: 'لا توجد متغيرات متاحة',
      noVariantsDesc: 'هذا المنتج ليس له متغيرات مُعدّة. يرجى إضافة المتغيرات من صفحة المخزون.',
      noColor: 'افتراضي',
      select: 'اختر'
    }
  }[language];

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
              <p className="text-sm text-muted-foreground">{formatCurrency(product.price)}</p>
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
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sizeColorMatrix.length === 0 ? (
            /* No variants available */
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                <span className="text-3xl">📦</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{t.noVariants}</h3>
              <p className="text-sm text-muted-foreground max-w-xs">{t.noVariantsDesc}</p>
            </div>
          ) : (
            <>
              {/* Size-Color Matrix */}
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-2">
                  {sizeColorMatrix.map(({ size, variants: sizeVariants, hasColors }) => {
                    const availableCount = sizeVariants.filter(v => v.stock > 0).length;
                    
                    return (
                      <div key={size?.id} className="border border-border rounded-lg overflow-hidden">
                        {/* Size Header - Inline with colors */}
                        <div className="flex items-center gap-2 p-2 bg-muted/30 flex-wrap">
                          {/* Size Badge */}
                          <Badge variant="outline" className="font-semibold text-sm px-3 py-1.5 shrink-0">
                            {language === 'ar' ? size?.name_ar || size?.name : size?.name}
                            {hasColors && (
                              <span className="text-muted-foreground font-normal ms-1">
                                ({availableCount}/{sizeVariants.length})
                              </span>
                            )}
                          </Badge>
                          
                          {/* Color swatches inline */}
                          <div className="flex items-center gap-2 flex-wrap flex-1">
                            {sizeVariants.map(({ variant, color, stock, price }) => {
                              const isSelected = isVariantSelected(variant.id);
                              const selectedData = getSelectedVariant(variant.id);
                              const stockStatus = getStockStatus(stock);
                              const isOutOfStock = stock === 0;
                              const isDisabled = isOutOfStock && !allowNegativeStock;
                              
                              // If no color, show a simple chip
                              if (!color) {
                                return (
                                  <button
                                    key={variant.id}
                                    onClick={() => toggleVariant(variant, price)}
                                    disabled={isDisabled}
                                    className={cn(
                                      'relative flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition-all min-h-[40px]',
                                      isDisabled
                                        ? 'bg-muted/50 text-muted-foreground cursor-not-allowed opacity-50'
                                        : isSelected
                                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                                        : 'bg-background border border-border hover:border-primary/50'
                                    )}
                                  >
                                    {t.noColor}
                                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded', stockStatus.color)}>
                                      {stockStatus.label}
                                    </span>
                                    {isSelected && selectedData && (
                                      <span className="font-bold">×{selectedData.quantity}</span>
                                    )}
                                  </button>
                                );
                              }
                              
                              // With color - compact swatch
                              return (
                                <button
                                  key={variant.id}
                                  onClick={() => toggleVariant(variant, price)}
                                  disabled={isDisabled}
                                  title={`${language === 'ar' ? color.name_ar || color.name : color.name} (${stockStatus.label})`}
                                  className={cn(
                                    'relative flex items-center gap-1.5 px-2 py-1.5 rounded-full transition-all min-h-[44px]',
                                    isDisabled
                                      ? 'opacity-40 cursor-not-allowed'
                                      : isSelected
                                      ? 'ring-2 ring-primary ring-offset-1'
                                      : 'hover:ring-1 hover:ring-primary/50'
                                  )}
                                >
                                  {/* Color Circle with stock indicator */}
                                  <div 
                                    className={cn(
                                      "w-9 h-9 rounded-full border-2 flex items-center justify-center relative",
                                      isOutOfStock ? "border-destructive/50" : 
                                      stock <= 5 ? "border-warning/50" : "border-transparent",
                                      isSelected && "border-primary"
                                    )}
                                    style={{ backgroundColor: color.hex_code || '#ccc' }}
                                  >
                                    {isSelected && (
                                      <Check size={16} className="text-white drop-shadow-md" />
                                    )}
                                    {/* Stock indicator dot */}
                                    <span 
                                      className={cn(
                                        "absolute -bottom-0.5 -end-0.5 w-4 h-4 rounded-full border-2 border-background text-[8px] flex items-center justify-center font-bold",
                                        isOutOfStock ? "bg-destructive text-destructive-foreground" :
                                        stock <= 5 ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground"
                                      )}
                                    >
                                      {!isOutOfStock && stock <= 9 ? stock : ''}
                                    </span>
                                  </div>
                                  
                                  {/* Quantity badge when selected */}
                                  {isSelected && selectedData && (
                                    <div className="flex items-center bg-primary/10 rounded-full px-1.5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateQuantity(variant.id, -1);
                                        }}
                                        className="w-6 h-6 flex items-center justify-center hover:bg-primary/20 rounded-full"
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <span className="text-sm font-bold min-w-[20px] text-center">
                                        {selectedData.quantity}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateQuantity(variant.id, 1);
                                        }}
                                        className="w-6 h-6 flex items-center justify-center hover:bg-primary/20 rounded-full"
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>

              {/* Selected Items Summary */}
              {selectedVariants.length > 0 && (
                <div className="border-t border-border bg-muted/30 p-3 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{t.selectedItems}</span>
                    <span className="text-sm text-muted-foreground">
                      {totalItems} {t.items}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                    {selectedVariants.map(sv => (
                      <Badge 
                        key={sv.variantId} 
                        variant="secondary"
                        className="flex items-center gap-1.5 py-1"
                      >
                        {sv.hexCode && (
                          <span 
                            className="w-3 h-3 rounded-full border border-border"
                            style={{ backgroundColor: sv.hexCode }}
                          />
                        )}
                        <span>{sv.sizeName}{sv.colorName ? ` - ${sv.colorName}` : ''}</span>
                        <span className="text-muted-foreground">×{sv.quantity}</span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-background flex-shrink-0">
          {selectedVariants.length > 0 ? (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t.total}</p>
                <p className="text-xl font-bold text-foreground">{totalPrice.toLocaleString()} YER</p>
              </div>
              <Button 
                onClick={handleAddToCart}
                className="flex-1 h-12 text-base gap-2"
              >
                <ShoppingCart size={20} />
                {t.addToCart} ({totalItems})
              </Button>
            </div>
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

export default POSVariantSelector;
