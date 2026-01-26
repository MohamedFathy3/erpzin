import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useSizes, useColors } from '@/hooks/useVariantData';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronDown, Check, X, Plus, Barcode } from 'lucide-react';
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

interface SizePricing {
  sizeId: string;
  cost: number;
  price: number;
  barcode: string;
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
  const [sizePricing, setSizePricing] = useState<SizePricing[]>([]);

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

  // Get or create size pricing
  const getSizePricing = (sizeId: string): SizePricing => {
    const existing = sizePricing.find(sp => sp.sizeId === sizeId);
    if (existing) return existing;
    return { sizeId, cost: baseCost, price: basePrice, barcode: generateBarcode() };
  };

  // Update size pricing and apply to all variants of that size
  const updateSizePricing = (sizeId: string, field: 'cost' | 'price' | 'barcode', value: number | string) => {
    const existingIndex = sizePricing.findIndex(sp => sp.sizeId === sizeId);
    const newPricing = [...sizePricing];
    
    if (existingIndex >= 0) {
      newPricing[existingIndex] = { ...newPricing[existingIndex], [field]: value };
    } else {
      const defaultPricing: SizePricing = { 
        sizeId, 
        cost: field === 'cost' ? value as number : baseCost, 
        price: field === 'price' ? value as number : basePrice,
        barcode: field === 'barcode' ? value as string : generateBarcode()
      };
      newPricing.push(defaultPricing);
    }
    
    setSizePricing(newPricing);
    
    // Update all variants of this size (for cost and price)
    if (field !== 'barcode') {
      onVariantChange(variants.map(v => 
        v.sizeId === sizeId
          ? { ...v, [field]: value }
          : v
      ));
    }
  };

  // Regenerate barcode for size
  const regenerateSizeBarcode = (sizeId: string) => {
    updateSizePricing(sizeId, 'barcode', generateBarcode());
  };

  // Add color for current size
  const addColorForSize = (colorId: string) => {
    if (!activeSizeId) return;
    
    // Add color to selected if not already
    if (!selectedColors.includes(colorId) && onColorSelectionChange) {
      onColorSelectionChange([...selectedColors, colorId]);
    }
    
    const pricing = getSizePricing(activeSizeId);
    
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
        barcode: pricing.barcode,
        customBarcode: false,
        stock: 0,
        cost: pricing.cost,
        price: pricing.price,
        enabled: true
      };
      
      onVariantChange([...variants, newVariant]);
    } else if (!existing.enabled) {
      onVariantChange(variants.map(v => 
        v.colorId === colorId && v.sizeId === activeSizeId
          ? { ...v, enabled: true, cost: pricing.cost, price: pricing.price }
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

  // Toggle all colors for a size
  const toggleAllColorsForSize = (sizeId: string, enable: boolean) => {
    const pricing = getSizePricing(sizeId);
    
    if (enable) {
      // Add all colors for this size
      const newVariants = [...variants];
      colors.forEach(color => {
        const existing = getVariant(color.id, sizeId);
        if (!existing) {
          const size = sizes.find(s => s.id === sizeId);
          newVariants.push({
            id: `${color.id}-${sizeId}`,
            colorId: color.id,
            sizeId,
            sku: generateSKU(baseSku, color.value, size?.value || ''),
            barcode: pricing.barcode,
            customBarcode: false,
            stock: 0,
            cost: pricing.cost,
            price: pricing.price,
            enabled: true
          });
        }
      });
      onVariantChange(newVariants.map(v => 
        v.sizeId === sizeId ? { ...v, enabled: true } : v
      ));
      if (onColorSelectionChange) {
        onColorSelectionChange([...new Set([...selectedColors, ...colors.map(c => c.id)])]);
      }
    } else {
      // Disable all colors for this size
      onVariantChange(variants.map(v => 
        v.sizeId === sizeId ? { ...v, enabled: false } : v
      ));
    }
  };

  // Initialize size pricing from base values
  useEffect(() => {
    if (sizePricing.length === 0 && selectedSizes.length > 0) {
      setSizePricing(selectedSizes.map(sizeId => ({
        sizeId,
        cost: baseCost,
        price: basePrice,
        barcode: generateBarcode()
      })));
    }
  }, [selectedSizes, baseCost, basePrice]);

  const toggleSize = (sizeId: string) => {
    if (!onSizeSelectionChange) return;
    if (selectedSizes.includes(sizeId)) {
      onSizeSelectionChange(selectedSizes.filter(id => id !== sizeId));
      if (activeSizeId === sizeId) {
        setActiveSizeId(null);
      }
    } else {
      onSizeSelectionChange([...selectedSizes, sizeId]);
      // Initialize pricing for new size
      setSizePricing(prev => [...prev, { sizeId, cost: baseCost, price: basePrice, barcode: generateBarcode() }]);
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
    <div className="space-y-4">
      {/* Size Selection - Compact Grid */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {language === 'ar' ? 'المقاسات' : 'Sizes'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {language === 'ar' ? 'اضغط لإضافة الألوان والأسعار' : 'Click to add colors & prices'}
          </span>
        </div>
        
        {/* Compact Size Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
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
                  setActiveSizeId(isActive ? null : size.id);
                }}
                className={cn(
                  'relative p-2 rounded-lg border transition-all text-center',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground shadow-md'
                    : isSelected
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border bg-muted/30 hover:border-primary/30'
                )}
              >
                <span className={cn(
                  'font-semibold text-sm block',
                  isActive ? 'text-primary-foreground' : isSelected ? 'text-primary' : 'text-foreground'
                )}>
                  {size.value}
                </span>
                {isSelected && colorsCount > 0 && (
                  <span className={cn(
                    'text-[9px] block mt-0.5',
                    isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}>
                    {colorsCount} {language === 'ar' ? 'لون' : 'clr'}
                  </span>
                )}
                {isActive && (
                  <ChevronDown size={10} className="absolute bottom-0.5 left-1/2 -translate-x-1/2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Size Details Panel */}
      {activeSizeId && (
        <div className="p-3 bg-muted/30 rounded-lg border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                {sizes.find(s => s.id === activeSizeId)?.value}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {language === 'ar' ? 'إعدادات المقاس' : 'Size Settings'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveSizeId(null)}
              className="p-1 hover:bg-muted rounded"
            >
              <X size={14} className="text-muted-foreground" />
            </button>
          </div>
          
          {/* Pricing & Barcode - Compact Row */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">
                {language === 'ar' ? 'التكلفة' : 'Cost'}
              </label>
              <Input
                type="number"
                value={getSizePricing(activeSizeId).cost}
                onChange={(e) => updateSizePricing(activeSizeId, 'cost', parseFloat(e.target.value) || 0)}
                className="h-8 text-center text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">
                {language === 'ar' ? 'السعر' : 'Price'}
              </label>
              <Input
                type="number"
                value={getSizePricing(activeSizeId).price}
                onChange={(e) => updateSizePricing(activeSizeId, 'price', parseFloat(e.target.value) || 0)}
                className="h-8 text-center text-sm"
                min={0}
              />
            </div>
            <div>
              <label className="text-[10px] font-medium text-muted-foreground block mb-0.5">
                {language === 'ar' ? 'الباركود' : 'Barcode'}
              </label>
              <div className="flex gap-1">
                <Input
                  type="text"
                  value={getSizePricing(activeSizeId).barcode}
                  onChange={(e) => updateSizePricing(activeSizeId, 'barcode', e.target.value)}
                  className="h-8 text-center text-xs font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => regenerateSizeBarcode(activeSizeId)}
                >
                  <RefreshCw size={12} />
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleAllColorsForSize(activeSizeId, true)}
              className="flex-1 h-7 text-xs"
            >
              <Plus size={12} className="me-1" />
              {language === 'ar' ? 'كل الألوان' : 'All Colors'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toggleAllColorsForSize(activeSizeId, false)}
              className="text-destructive hover:text-destructive h-7 text-xs"
            >
              <X size={12} className="me-1" />
              {language === 'ar' ? 'إزالة' : 'Clear'}
            </Button>
          </div>

          {/* Color Selection - Compact Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-1">
            {colors.map((color) => {
              const isEnabled = enabledColorsForActiveSize.includes(color.id);
              
              return (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => isEnabled ? removeColorForSize(color.id) : addColorForSize(color.id)}
                  className={cn(
                    'flex flex-col items-center gap-0.5 p-1 rounded border transition-all',
                    isEnabled
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent bg-background hover:border-border'
                  )}
                  title={language === 'ar' ? color.valueAr : color.value}
                >
                  <div
                    className={cn(
                      'w-5 h-5 rounded-full border flex items-center justify-center',
                      isEnabled ? 'border-primary border-2' : 'border-border'
                    )}
                    style={{ backgroundColor: color.hexCode || '#888' }}
                  >
                    {isEnabled && (
                      <Check size={10} className="text-white drop-shadow-md" />
                    )}
                  </div>
                  <span className={cn(
                    'text-[8px] truncate w-full text-center leading-none',
                    isEnabled ? 'text-primary font-medium' : 'text-muted-foreground'
                  )}>
                    {(language === 'ar' ? color.valueAr : color.value).slice(0, 4)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      {enabledCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between p-2 bg-success/10 rounded-lg border border-success/20">
            <span className="text-xs font-medium text-foreground">
              {language === 'ar' ? 'المتغيرات' : 'Variants'}
            </span>
            <Badge variant="default" className="bg-success text-success-foreground text-xs">
              {enabledCount}
            </Badge>
          </div>

          {/* Compact Summary Table */}
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-2 text-start font-medium text-muted-foreground border-b border-border">
                    {language === 'ar' ? 'المقاس' : 'Size'}
                  </th>
                  <th className="p-2 text-start font-medium text-muted-foreground border-b border-border">
                    {language === 'ar' ? 'الألوان' : 'Colors'}
                  </th>
                  <th className="p-2 text-center font-medium text-muted-foreground border-b border-border">
                    <Barcode size={12} className="inline me-1" />
                    {language === 'ar' ? 'الباركود' : 'Barcode'}
                  </th>
                  <th className="p-2 text-center font-medium text-muted-foreground border-b border-border">
                    {language === 'ar' ? 'التكلفة' : 'Cost'}
                  </th>
                  <th className="p-2 text-center font-medium text-muted-foreground border-b border-border">
                    {language === 'ar' ? 'السعر' : 'Price'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeSizes.map((size, idx) => {
                  const sizeVariants = variants.filter(v => v.sizeId === size.id && v.enabled);
                  if (sizeVariants.length === 0) return null;
                  
                  const pricing = getSizePricing(size.id);
                  const sizeColors = sizeVariants.map(v => {
                    const color = colors.find(c => c.id === v.colorId);
                    return color;
                  }).filter(Boolean);

                  return (
                    <tr key={size.id} className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                      <td className="p-2 font-medium text-foreground">
                        <Badge variant="secondary" className="text-xs">{size.value}</Badge>
                      </td>
                      <td className="p-2">
                        <div className="flex flex-wrap gap-0.5">
                          {sizeColors.map((color) => color && (
                            <div
                              key={color.id}
                              className="w-4 h-4 rounded-full border border-border"
                              style={{ backgroundColor: color.hexCode || '#888' }}
                              title={language === 'ar' ? color.valueAr : color.value}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="p-2 text-center font-mono text-[10px] text-muted-foreground">
                        {pricing.barcode}
                      </td>
                      <td className="p-2 text-center font-medium">
                        {pricing.cost.toLocaleString()}
                      </td>
                      <td className="p-2 text-center font-medium text-primary">
                        {pricing.price.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {enabledCount === 0 && (
        <div className="text-center py-4 text-muted-foreground border border-dashed border-border rounded-lg text-xs">
          {language === 'ar' ? 'اضغط على مقاس لتحديد الألوان' : 'Click a size to select colors'}
        </div>
      )}
    </div>
  );
};

export default VariantMatrix;
