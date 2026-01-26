import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useSizes, useColors } from '@/hooks/useVariantData';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronRight, Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface VariantOption {
  id: string;
  value: string;
  valueAr: string;
  hexCode?: string;
}

export interface ProductVariant {
  id: string;
  colorId: string;
  sizeId: string;
  sku: string;
  barcode: string;
  customBarcode: boolean;
  stock: number;
  cost: number;
  price: number;
  enabled: boolean;
}

interface VariantMatrixProps {
  variants: ProductVariant[];
  baseSku: string;
  basePrice: number;
  baseCost: number;
  onVariantChange: (variants: ProductVariant[]) => void;
  selectedSizes?: string[];
  selectedColors?: string[];
  onSizeSelectionChange?: (sizes: string[]) => void;
  onColorSelectionChange?: (colors: string[]) => void;
}

const generateSKU = (baseSku: string, colorCode: string, sizeCode: string): string => {
  return `${baseSku}-${colorCode.substring(0, 3).toUpperCase()}-${sizeCode.toUpperCase()}`;
};

const generateBarcode = (): string => {
  return Math.floor(Math.random() * 9000000000000 + 1000000000000).toString();
};

const VariantMatrix: React.FC<VariantMatrixProps> = ({
  variants,
  baseSku,
  basePrice,
  baseCost,
  onVariantChange,
  selectedSizes = [],
  selectedColors = [],
  onSizeSelectionChange,
  onColorSelectionChange
}) => {
  const { language } = useLanguage();
  const { data: dbSizes = [], isLoading: sizesLoading } = useSizes();
  const { data: dbColors = [], isLoading: colorsLoading } = useColors();
  const [activeSizeId, setActiveSizeId] = useState<string | null>(null);

  // Convert DB data to VariantOption format
  const sizes: VariantOption[] = dbSizes.map(s => ({
    id: s.id,
    value: s.code,
    valueAr: s.name_ar || s.code
  }));

  const colors: VariantOption[] = dbColors.map(c => ({
    id: c.id,
    value: c.name,
    valueAr: c.name_ar || c.name,
    hexCode: c.hex_code || undefined
  }));

  // Filter to only selected sizes and colors for the matrix
  const activeSizes = sizes.filter(s => selectedSizes.includes(s.id));
  const activeColors = colors.filter(c => selectedColors.includes(c.id));

  const getVariant = (colorId: string, sizeId: string): ProductVariant | undefined => {
    return variants.find(v => v.colorId === colorId && v.sizeId === sizeId);
  };

  const toggleVariant = (colorId: string, sizeId: string) => {
    const existing = getVariant(colorId, sizeId);
    
    if (existing) {
      onVariantChange(variants.map(v => 
        v.colorId === colorId && v.sizeId === sizeId
          ? { ...v, enabled: !v.enabled }
          : v
      ));
    } else {
      const color = colors.find(c => c.id === colorId);
      const size = sizes.find(s => s.id === sizeId);
      
      const newVariant: ProductVariant = {
        id: `${colorId}-${sizeId}`,
        colorId,
        sizeId,
        sku: generateSKU(baseSku, color?.value || '', size?.value || ''),
        barcode: generateBarcode(),
        customBarcode: false,
        stock: 0,
        cost: baseCost,
        price: basePrice,
        enabled: true
      };
      
      onVariantChange([...variants, newVariant]);
    }
  };

  // Add color for current size
  const addColorForSize = (colorId: string) => {
    if (!activeSizeId) return;
    
    // Add color to selected if not already
    if (!selectedColors.includes(colorId) && onColorSelectionChange) {
      onColorSelectionChange([...selectedColors, colorId]);
    }
    
    // Create the variant
    const existing = getVariant(colorId, activeSizeId);
    if (!existing) {
      const color = colors.find(c => c.id === colorId);
      const size = sizes.find(s => s.id === activeSizeId);
      
      const newVariant: ProductVariant = {
        id: `${colorId}-${activeSizeId}`,
        colorId,
        sizeId: activeSizeId,
        sku: generateSKU(baseSku, color?.value || '', size?.value || ''),
        barcode: generateBarcode(),
        customBarcode: false,
        stock: 0,
        cost: baseCost,
        price: basePrice,
        enabled: true
      };
      
      onVariantChange([...variants, newVariant]);
    } else if (!existing.enabled) {
      onVariantChange(variants.map(v => 
        v.colorId === colorId && v.sizeId === activeSizeId
          ? { ...v, enabled: true }
          : v
      ));
    }
  };

  // Remove color for current size
  const removeColorForSize = (colorId: string) => {
    if (!activeSizeId) return;
    onVariantChange(variants.map(v => 
      v.colorId === colorId && v.sizeId === activeSizeId
        ? { ...v, enabled: false }
        : v
    ));
  };

  // Update all variants when base price/cost changes
  useEffect(() => {
    if (variants.length > 0) {
      const updatedVariants = variants.map(v => ({
        ...v,
        cost: v.cost === 0 ? baseCost : v.cost,
        price: v.price === 0 ? basePrice : v.price
      }));
      const hasChanges = variants.some((v, i) => 
        v.cost !== updatedVariants[i].cost || v.price !== updatedVariants[i].price
      );
      if (hasChanges) {
        onVariantChange(updatedVariants);
      }
    }
  }, [baseCost, basePrice]);

  const updateVariantPrice = (colorId: string, sizeId: string, price: number) => {
    onVariantChange(variants.map(v =>
      v.colorId === colorId && v.sizeId === sizeId
        ? { ...v, price }
        : v
    ));
  };

  const updateVariantCost = (colorId: string, sizeId: string, cost: number) => {
    onVariantChange(variants.map(v =>
      v.colorId === colorId && v.sizeId === sizeId
        ? { ...v, cost }
        : v
    ));
  };

  const updateVariantBarcode = (colorId: string, sizeId: string, barcode: string, customBarcode: boolean) => {
    onVariantChange(variants.map(v =>
      v.colorId === colorId && v.sizeId === sizeId
        ? { ...v, barcode, customBarcode }
        : v
    ));
  };

  const regenerateVariantBarcode = (colorId: string, sizeId: string) => {
    onVariantChange(variants.map(v =>
      v.colorId === colorId && v.sizeId === sizeId
        ? { ...v, barcode: generateBarcode(), customBarcode: false }
        : v
    ));
  };

  const toggleSize = (sizeId: string) => {
    if (!onSizeSelectionChange) return;
    if (selectedSizes.includes(sizeId)) {
      onSizeSelectionChange(selectedSizes.filter(id => id !== sizeId));
      if (activeSizeId === sizeId) {
        setActiveSizeId(null);
      }
    } else {
      onSizeSelectionChange([...selectedSizes, sizeId]);
    }
  };

  // Get colors count for a specific size
  const getColorsCountForSize = (sizeId: string) => {
    return variants.filter(v => v.sizeId === sizeId && v.enabled).length;
  };

  // Get enabled colors for active size
  const getEnabledColorsForActiveSize = () => {
    if (!activeSizeId) return [];
    return variants.filter(v => v.sizeId === activeSizeId && v.enabled).map(v => v.colorId);
  };

  const enabledColorsForActiveSize = getEnabledColorsForActiveSize();
  const enabledCount = variants.filter(v => v.enabled).length;

  if (sizesLoading || colorsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Size Selection */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {language === 'ar' ? 'الخطوة 1' : 'Step 1'}
          </Badge>
          <h4 className="font-semibold text-foreground">
            {language === 'ar' ? 'اختر المقاسات المتاحة' : 'Select Available Sizes'}
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => {
            const isSelected = selectedSizes.includes(size.id);
            const isActive = activeSizeId === size.id;
            const colorsCount = getColorsCountForSize(size.id);
            
            return (
              <button
                key={size.id}
                type="button"
                onClick={() => {
                  if (!isSelected) {
                    toggleSize(size.id);
                  }
                  setActiveSizeId(size.id);
                }}
                className={cn(
                  'relative px-4 py-3 rounded-xl border-2 transition-all font-medium min-w-[70px]',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-lg scale-105'
                    : isSelected
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
                )}
              >
                <span className="block text-lg">{size.value}</span>
                {isSelected && (
                  <span className={cn(
                    'text-xs mt-1 block',
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}>
                    {colorsCount} {language === 'ar' ? 'لون' : 'colors'}
                  </span>
                )}
                {isSelected && !isActive && (
                  <Check size={14} className="absolute top-1 end-1 text-primary" />
                )}
                {isActive && (
                  <ChevronRight size={16} className="absolute top-1/2 -translate-y-1/2 end-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Color Selection for Active Size */}
      {activeSizeId && (
        <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {language === 'ar' ? 'الخطوة 2' : 'Step 2'}
              </Badge>
              <h4 className="font-semibold text-foreground">
                {language === 'ar' ? 'اختر الألوان للمقاس' : 'Select Colors for Size'}
                <Badge variant="default" className="ms-2">
                  {sizes.find(s => s.id === activeSizeId)?.value}
                </Badge>
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setActiveSizeId(null)}
              className="text-xs text-destructive hover:underline flex items-center gap-1"
            >
              <X size={14} />
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {colors.map((color) => {
              const isEnabled = enabledColorsForActiveSize.includes(color.id);
              const variant = getVariant(color.id, activeSizeId);
              
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => isEnabled ? removeColorForSize(color.id) : addColorForSize(color.id)}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-start',
                    isEnabled
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-background hover:border-primary/50'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg border-2 flex-shrink-0 flex items-center justify-center',
                      isEnabled ? 'border-primary' : 'border-border'
                    )}
                    style={{ backgroundColor: color.hexCode || '#888' }}
                  >
                    {isEnabled && (
                      <Check size={16} className="text-white drop-shadow-md" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      'font-medium truncate',
                      isEnabled ? 'text-primary' : 'text-foreground'
                    )}>
                      {language === 'ar' ? color.valueAr : color.value}
                    </p>
                    {isEnabled && variant && (
                      <p className="text-xs text-muted-foreground truncate">
                        {variant.sku}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary & Matrix */}
      {enabledCount > 0 && (
        <>
          <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
            <span className="text-sm font-medium text-foreground">
              {language === 'ar' ? 'إجمالي المتغيرات النشطة' : 'Total Active Variants'}
            </span>
            <Badge variant="default" className="bg-success text-success-foreground">
              {enabledCount}
            </Badge>
          </div>

          {/* Compact Matrix View */}
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-3 text-start font-medium text-muted-foreground border-b border-border">
                    {language === 'ar' ? 'اللون / المقاس' : 'Color / Size'}
                  </th>
                  {activeSizes.map((size) => (
                    <th 
                      key={size.id} 
                      className="p-3 text-center font-medium text-muted-foreground border-b border-border min-w-[100px]"
                    >
                      {language === 'ar' ? size.valueAr : size.value}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeColors.map((color, colorIdx) => {
                  // Only show colors that have at least one enabled variant
                  const hasEnabledVariants = activeSizes.some(size => {
                    const v = getVariant(color.id, size.id);
                    return v?.enabled;
                  });
                  
                  if (!hasEnabledVariants) return null;
                  
                  return (
                    <tr key={color.id} className={colorIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-3 font-medium text-foreground border-e border-border">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: color.hexCode || '#888' }}
                          />
                          {language === 'ar' ? color.valueAr : color.value}
                        </div>
                      </td>
                      {activeSizes.map((size) => {
                        const variant = getVariant(color.id, size.id);
                        const isEnabled = variant?.enabled ?? false;

                        return (
                          <td key={size.id} className="p-2 border-e border-border last:border-e-0">
                            {isEnabled && variant ? (
                              <div className="p-2 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={true}
                                    onCheckedChange={() => toggleVariant(color.id, size.id)}
                                  />
                                  <span className="text-xs text-muted-foreground truncate">
                                    {variant.sku}
                                  </span>
                                </div>
                                
                                {/* Barcode */}
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    {language === 'ar' ? 'الباركود' : 'Barcode'}
                                  </label>
                                  <div className="flex gap-1">
                                    <Input
                                      type="text"
                                      value={variant.barcode}
                                      onChange={(e) => updateVariantBarcode(color.id, size.id, e.target.value, true)}
                                      className="h-8 text-center font-mono text-xs"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 shrink-0"
                                      onClick={() => regenerateVariantBarcode(color.id, size.id)}
                                      title={language === 'ar' ? 'توليد باركود جديد' : 'Generate new barcode'}
                                    >
                                      <RefreshCw size={12} />
                                    </Button>
                                  </div>
                                </div>
                                {/* Cost */}
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    {language === 'ar' ? 'التكلفة' : 'Cost'}
                                  </label>
                                  <Input
                                    type="number"
                                    value={variant.cost}
                                    onChange={(e) => updateVariantCost(color.id, size.id, parseFloat(e.target.value) || 0)}
                                    className="h-8 text-center"
                                    min={0}
                                    placeholder={baseCost.toString()}
                                  />
                                </div>
                                {/* Price */}
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    {language === 'ar' ? 'سعر البيع' : 'Selling Price'}
                                  </label>
                                  <Input
                                    type="number"
                                    value={variant.price}
                                    onChange={(e) => updateVariantPrice(color.id, size.id, parseFloat(e.target.value) || 0)}
                                    className="h-8 text-center"
                                    min={0}
                                    placeholder={basePrice.toString()}
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30 text-center">
                                <span className="text-xs text-muted-foreground">-</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {enabledCount === 0 && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          {language === 'ar' 
            ? 'اختر مقاساً ثم حدد الألوان المتاحة له'
            : 'Select a size then choose available colors for it'
          }
        </div>
      )}
    </div>
  );
};

export default VariantMatrix;
