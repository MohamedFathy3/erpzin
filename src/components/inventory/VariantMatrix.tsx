import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { useSizes, useColors } from '@/hooks/useVariantData';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronRight, Check, X, Plus } from 'lucide-react';
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
    return { sizeId, cost: baseCost, price: basePrice };
  };

  // Update size pricing and apply to all variants of that size
  const updateSizePricing = (sizeId: string, field: 'cost' | 'price', value: number) => {
    const existingIndex = sizePricing.findIndex(sp => sp.sizeId === sizeId);
    const newPricing = [...sizePricing];
    
    if (existingIndex >= 0) {
      newPricing[existingIndex] = { ...newPricing[existingIndex], [field]: value };
    } else {
      newPricing.push({ sizeId, cost: field === 'cost' ? value : baseCost, price: field === 'price' ? value : basePrice });
    }
    
    setSizePricing(newPricing);
    
    // Update all variants of this size
    onVariantChange(variants.map(v => 
      v.sizeId === sizeId
        ? { ...v, [field]: value }
        : v
    ));
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
        barcode: generateBarcode(),
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
            barcode: generateBarcode(),
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
        price: basePrice
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
      setSizePricing(prev => [...prev, { sizeId, cost: baseCost, price: basePrice }]);
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
            {language === 'ar' ? 'اختر المقاسات وحدد الأسعار' : 'Select Sizes & Set Prices'}
          </h4>
        </div>
        
        <div className="grid gap-3">
          {sizes.map((size) => {
            const isSelected = selectedSizes.includes(size.id);
            const isActive = activeSizeId === size.id;
            const colorsCount = getColorsCountForSize(size.id);
            const pricing = getSizePricing(size.id);
            
            return (
              <div
                key={size.id}
                className={cn(
                  'rounded-xl border-2 transition-all overflow-hidden',
                  isActive
                    ? 'border-primary shadow-lg'
                    : isSelected
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border bg-muted/20'
                )}
              >
                {/* Size Header */}
                <div 
                  className={cn(
                    'flex items-center gap-2 p-2 cursor-pointer',
                    isActive ? 'bg-primary text-primary-foreground' : ''
                  )}
                  onClick={() => {
                    if (!isSelected) {
                      toggleSize(size.id);
                    }
                    setActiveSizeId(isActive ? null : size.id);
                  }}
                >
                  <div className={cn(
                    'w-8 h-8 rounded-md flex items-center justify-center font-semibold text-sm',
                    isActive 
                      ? 'bg-primary-foreground/20' 
                      : isSelected
                      ? 'bg-primary/20 text-primary' 
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {size.value}
                  </div>
                  
                  <div className="flex-1">
                    <p className={cn(
                      'font-medium',
                      isActive ? 'text-primary-foreground' : 'text-foreground'
                    )}>
                      {language === 'ar' ? size.valueAr : size.value}
                    </p>
                    {isSelected && (
                      <p className={cn(
                        'text-sm',
                        isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}>
                        {colorsCount} {language === 'ar' ? 'لون متاح' : 'colors selected'}
                      </p>
                    )}
                  </div>

                  {isSelected && (
                    <Badge className={cn(
                      isActive ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-success/10 text-success'
                    )}>
                      <Check size={12} className="me-1" />
                      {language === 'ar' ? 'مفعّل' : 'Active'}
                    </Badge>
                  )}
                  
                  <ChevronRight 
                    size={20} 
                    className={cn(
                      'transition-transform',
                      isActive ? 'rotate-90' : ''
                    )} 
                  />
                </div>

                {/* Size Details (when active) */}
                {isActive && (
                  <div className="p-4 border-t border-primary/20 bg-background space-y-4">
                    {/* Pricing for this size */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          {language === 'ar' ? 'تكلفة المقاس' : 'Size Cost'}
                        </label>
                        <Input
                          type="number"
                          value={pricing.cost}
                          onChange={(e) => updateSizePricing(size.id, 'cost', parseFloat(e.target.value) || 0)}
                          className="h-10 text-center font-medium"
                          min={0}
                          placeholder={baseCost.toString()}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">
                          {language === 'ar' ? 'سعر البيع' : 'Selling Price'}
                        </label>
                        <Input
                          type="number"
                          value={pricing.price}
                          onChange={(e) => updateSizePricing(size.id, 'price', parseFloat(e.target.value) || 0)}
                          className="h-10 text-center font-medium"
                          min={0}
                          placeholder={basePrice.toString()}
                        />
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => toggleAllColorsForSize(size.id, true)}
                        className="flex-1"
                      >
                        <Plus size={14} className="me-1" />
                        {language === 'ar' ? 'إضافة كل الألوان' : 'Add All Colors'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleAllColorsForSize(size.id, false)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X size={14} className="me-1" />
                        {language === 'ar' ? 'إزالة الكل' : 'Remove All'}
                      </Button>
                    </div>

                    {/* Color Selection */}
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">
                        {language === 'ar' ? 'اختر الألوان المتاحة:' : 'Select Available Colors:'}
                      </p>
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-1.5">
                        {colors.map((color) => {
                          const isEnabled = enabledColorsForActiveSize.includes(color.id);
                          
                          return (
                            <button
                              key={color.id}
                              type="button"
                              onClick={() => isEnabled ? removeColorForSize(color.id) : addColorForSize(color.id)}
                              className={cn(
                                'flex flex-col items-center gap-0.5 p-1.5 rounded-md border transition-all',
                                isEnabled
                                  ? 'border-primary bg-primary/10'
                                  : 'border-border bg-background hover:border-primary/50'
                              )}
                            >
                              <div
                                className={cn(
                                  'w-5 h-5 rounded-full border flex items-center justify-center',
                                  isEnabled ? 'border-primary' : 'border-border'
                                )}
                                style={{ backgroundColor: color.hexCode || '#888' }}
                              >
                                {isEnabled && (
                                  <Check size={10} className="text-white drop-shadow-md" />
                                )}
                              </div>
                              <span className={cn(
                                'text-[10px] truncate w-full text-center leading-tight',
                                isEnabled ? 'text-primary font-medium' : 'text-muted-foreground'
                              )}>
                                {language === 'ar' ? color.valueAr : color.value}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      {enabledCount > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/20">
            <span className="text-sm font-medium text-foreground">
              {language === 'ar' ? 'إجمالي المتغيرات' : 'Total Variants'}
            </span>
            <Badge variant="default" className="bg-success text-success-foreground">
              {enabledCount}
            </Badge>
          </div>

          {/* Compact Summary Table */}
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="p-3 text-start font-medium text-muted-foreground border-b border-border">
                    {language === 'ar' ? 'المقاس' : 'Size'}
                  </th>
                  <th className="p-3 text-start font-medium text-muted-foreground border-b border-border">
                    {language === 'ar' ? 'الألوان' : 'Colors'}
                  </th>
                  <th className="p-3 text-center font-medium text-muted-foreground border-b border-border">
                    {language === 'ar' ? 'التكلفة' : 'Cost'}
                  </th>
                  <th className="p-3 text-center font-medium text-muted-foreground border-b border-border">
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
                      <td className="p-3 font-medium text-foreground">
                        <Badge variant="secondary">{size.value}</Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {sizeColors.map((color) => color && (
                            <div
                              key={color.id}
                              className="w-6 h-6 rounded-full border border-border"
                              style={{ backgroundColor: color.hexCode || '#888' }}
                              title={language === 'ar' ? color.valueAr : color.value}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="p-3 text-center font-medium">
                        {pricing.cost.toLocaleString()}
                      </td>
                      <td className="p-3 text-center font-medium text-primary">
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
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <p>{language === 'ar' ? 'اضغط على مقاس لتحديد الألوان والأسعار' : 'Click on a size to set colors and prices'}</p>
        </div>
      )}
    </div>
  );
};

export default VariantMatrix;
