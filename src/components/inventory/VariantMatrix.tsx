import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, ChevronDown, Check, X, Plus, Barcode, Package, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export interface VariantOption {
  id: string;
  value: string;
  valueAr: string;
  hexCode?: string;
}

export interface ProductVariant {
  id: string;
  colorId: string;
  unitId: string;
  sku: string;
  barcode: string;
  customBarcode: boolean;
  stock: number;
  cost: number;
  price: number;
  enabled: boolean;
  isSimpleVariant?: boolean; // للتمييز
  noColor?: boolean; // ✅ وحدة بدون لون
}
interface UnitPricing {
  unitId: string;
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

const generateSKU = (baseSku: string, colorCode: string, unitCode: string): string => {
  return `${baseSku}-${colorCode.substring(0, 3).toUpperCase()}-${unitCode.toUpperCase()}`;
};

const generateSKUWithoutColor = (baseSku: string, unitCode: string): string => {
  return `${baseSku}-${unitCode.toUpperCase()}`;
};

const generateBarcode = (): string => {
  return Math.floor(Math.random() * 9000000000000 + 1000000000000).toString();
};

// Custom hooks for fetching units and colors
const useUnits = () => {
  return useQuery({
    queryKey: ['units-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/unit/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        const units = response.data.data || [];
        return units.map((unit: any) => ({
          id: unit.id.toString(),
          value: unit.code,
          valueAr: unit.name || unit.code,
          name: unit.name,
          code: unit.code
        }));
      } catch (error) {
        console.error('Error fetching units:', error);
        return [];
      }
    }
  });
};

const useColors = () => {
  return useQuery({
    queryKey: ['colors-form'],
    queryFn: async () => {
      try {
        const response = await api.post('/color/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        const colors = response.data.data || [];
        return colors.map((color: any) => ({
          id: color.id.toString(),
          value: color.name,
          valueAr: color.name,
          name: color.name,
          hexCode: color.hex_code || undefined
        }));
      } catch (error) {
        return [];
      }
    }
  });
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
  const { data: unitsData = [], isLoading: unitsLoading } = useUnits();
  const { data: colorsData = [], isLoading: colorsLoading } = useColors();
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);
  const [unitPricing, setUnitPricing] = useState<UnitPricing[]>([]);

  // Convert to VariantOption format
  const sizes: VariantOption[] = unitsData.map((unit: any) => ({
    id: unit.id,
    value: unit.code,
    valueAr: unit.name
  }));

  const colors: VariantOption[] = colorsData.map((color: any) => ({
    id: color.id,
    value: color.name,
    valueAr: color.name,
    hexCode: color.hexCode
  }));

  // Filter to only selected sizes and colors for the matrix
  const activeSizes = sizes.filter(s => selectedSizes.includes(s.id));
  const activeColors = colors.filter(c => selectedColors.includes(c.id));

  const getVariant = (colorId: string, unitId: string): ProductVariant | undefined => {
    return variants.find(v => v.colorId === colorId && v.unitId === unitId);
  };

  // ✅ دالة للبحث عن وحدة بدون لون
  const getUnitWithoutColor = (unitId: string): ProductVariant | undefined => {
    return variants.find(v => v.unitId === unitId && v.noColor === true);
  };

  // Get or create unit pricing
  const getUnitPricing = (unitId: string): UnitPricing => {
    const existing = unitPricing.find(up => up.unitId === unitId);
    if (existing) return existing;
    return { unitId, cost: baseCost, price: basePrice, barcode: generateBarcode() };
  };

  // Update unit pricing and apply to all variants of that unit
  const updateUnitPricing = (unitId: string, field: 'cost' | 'price' | 'barcode', value: number | string) => {
    const existingIndex = unitPricing.findIndex(up => up.unitId === unitId);
    const newPricing = [...unitPricing];
    
    if (existingIndex >= 0) {
      newPricing[existingIndex] = { ...newPricing[existingIndex], [field]: value };
    } else {
      const defaultPricing: UnitPricing = { 
        unitId, 
        cost: field === 'cost' ? value as number : baseCost, 
        price: field === 'price' ? value as number : basePrice,
        barcode: field === 'barcode' ? value as string : generateBarcode()
      };
      newPricing.push(defaultPricing);
    }
    
    setUnitPricing(newPricing);
    
    // Update all variants of this unit (for cost and price)
    if (field !== 'barcode') {
      onVariantChange(variants.map(v => 
        v.unitId === unitId
          ? { ...v, [field]: value }
          : v
      ));
    }
  };

  // Regenerate barcode for unit
  const regenerateUnitBarcode = (unitId: string) => {
    updateUnitPricing(unitId, 'barcode', generateBarcode());
  };

  // ✅ إضافة وحدة بدون لون
  const addUnitWithoutColor = () => {
    if (!activeUnitId) return;
    
    const pricing = getUnitPricing(activeUnitId);
    const unit = sizes.find(s => s.id === activeUnitId);
    
    // شوف إذا كانت الوحدة موجودة بالفعل بدون لون
    const existing = getUnitWithoutColor(activeUnitId);
    
    if (!existing) {
      const newVariant: ProductVariant = {
        id: `${activeUnitId}-nocolor`,
        colorId: '',
        unitId: activeUnitId,
        sku: generateSKUWithoutColor(baseSku, unit?.value || ''),
        barcode: pricing.barcode,
        customBarcode: false,
        stock: 0,
        cost: pricing.cost,
        price: pricing.price,
        enabled: true,
        noColor: true
      };
      
      onVariantChange([...variants, newVariant]);
      
      toast({
        title: language === 'ar' ? 'تمت الإضافة' : 'Added',
        description: language === 'ar' ? 'تم إضافة الوحدة بدون لون' : 'Unit added without color',
      });
    } else if (!existing.enabled) {
      onVariantChange(variants.map(v => 
        v.unitId === activeUnitId && v.noColor
          ? { ...v, enabled: true, cost: pricing.cost, price: pricing.price }
          : v
      ));
    }
  };

  // ✅ إزالة وحدة بدون لون
  const removeUnitWithoutColor = () => {
    if (!activeUnitId) return;
    
    onVariantChange(variants.map(v => 
      v.unitId === activeUnitId && v.noColor
        ? { ...v, enabled: false }
        : v
    ));
  };

  // Add color for current unit
  const addColorForUnit = (colorId: string) => {
    if (!activeUnitId) return;
    
    // Add color to selected if not already
    if (!selectedColors.includes(colorId) && onColorSelectionChange) {
      onColorSelectionChange([...selectedColors, colorId]);
    }
    
    const pricing = getUnitPricing(activeUnitId);
    
    // Create the variant
    const existing = getVariant(colorId, activeUnitId);
    if (!existing) {
      const color = colors.find(c => c.id === colorId);
      const unit = sizes.find(s => s.id === activeUnitId);
      
      const newVariant: ProductVariant = {
        id: `${colorId}-${activeUnitId}`,
        colorId,
        unitId: activeUnitId,
        sku: generateSKU(baseSku, color?.value || '', unit?.value || ''),
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
        v.colorId === colorId && v.unitId === activeUnitId
          ? { ...v, enabled: true, cost: pricing.cost, price: pricing.price }
          : v
      ));
    }
  };

  // Remove color for current unit
  const removeColorForUnit = (colorId: string) => {
    if (!activeUnitId) return;
    onVariantChange(variants.map(v => 
      v.colorId === colorId && v.unitId === activeUnitId
        ? { ...v, enabled: false }
        : v
    ));
  };

  // Toggle all colors for a unit
  const toggleAllColorsForUnit = (unitId: string, enable: boolean) => {
    const pricing = getUnitPricing(unitId);
    
    if (enable) {
      // Add all colors for this unit
      const newVariants = [...variants];
      colors.forEach(color => {
        const existing = getVariant(color.id, unitId);
        if (!existing) {
          const unit = sizes.find(s => s.id === unitId);
          newVariants.push({
            id: `${color.id}-${unitId}`,
            colorId: color.id,
            unitId,
            sku: generateSKU(baseSku, color.value, unit?.value || ''),
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
        v.unitId === unitId ? { ...v, enabled: true } : v
      ));
      if (onColorSelectionChange) {
        onColorSelectionChange([...new Set([...selectedColors, ...colors.map(c => c.id)])]);
      }
    } else {
      // Disable all colors for this unit
      onVariantChange(variants.map(v => 
        v.unitId === unitId ? { ...v, enabled: false } : v
      ));
    }
  };

  // Initialize unit pricing from base values
  useEffect(() => {
    if (unitPricing.length === 0 && selectedSizes.length > 0) {
      setUnitPricing(selectedSizes.map(unitId => ({
        unitId,
        cost: baseCost,
        price: basePrice,
        barcode: generateBarcode()
      })));
    }
  }, [selectedSizes, baseCost, basePrice]);

  const toggleUnit = (unitId: string) => {
    if (!onSizeSelectionChange) return;
    if (selectedSizes.includes(unitId)) {
      onSizeSelectionChange(selectedSizes.filter(id => id !== unitId));
      if (activeUnitId === unitId) {
        setActiveUnitId(null);
      }
    } else {
      onSizeSelectionChange([...selectedSizes, unitId]);
      // Initialize pricing for new unit
      setUnitPricing(prev => [...prev, { unitId, cost: baseCost, price: basePrice, barcode: generateBarcode() }]);
    }
  };

  // Get colors count for a specific unit
  const getColorsCountForUnit = (unitId: string) => {
    return variants.filter(v => v.unitId === unitId && v.enabled && !v.noColor).length;
  };

  // ✅ هل الوحدة عندها نسخة بدون لون؟
  const hasUnitWithoutColor = (unitId: string) => {
    return variants.some(v => v.unitId === unitId && v.noColor && v.enabled);
  };

  // Get enabled colors for active unit
  const getEnabledColorsForActiveUnit = () => {
    if (!activeUnitId) return [];
    return variants.filter(v => v.unitId === activeUnitId && v.enabled && !v.noColor).map(v => v.colorId);
  };

  const enabledColorsForActiveUnit = getEnabledColorsForActiveUnit();
  const enabledCount = variants.filter(v => v.enabled).length;

  if (unitsLoading || colorsLoading) {
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
            {language === 'ar' ? 'الوحدات' : 'Units'}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {language === 'ar' ? 'اضغط لإضافة الألوان والأسعار' : 'Click to add colors & prices'}
          </span>
        </div>
        
        {/* Compact Unit Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-1.5">
          {sizes.map((size) => {
            const isSelected = selectedSizes.includes(size.id);
            const isActive = activeUnitId === size.id;
            const colorsCount = getColorsCountForUnit(size.id);
            const hasNoColor = hasUnitWithoutColor(size.id);
            
            return (
              <button
                key={size.id}
                type="button"
                onClick={() => {
                  if (!isSelected) {
                    toggleUnit(size.id);
                  }
                  setActiveUnitId(isActive ? null : size.id);
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
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {colorsCount > 0 && (
                    <span className={cn(
                      'text-[9px]',
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}>
                      {colorsCount} {language === 'ar' ? 'لون' : 'clr'}
                    </span>
                  )}
                  {hasNoColor && (
                    <Circle size={8} className={cn(
                      'fill-current',
                      isActive ? 'text-primary-foreground' : 'text-primary'
                    )} />
                  )}
                </div>
                {isActive && (
                  <ChevronDown size={10} className="absolute bottom-0.5 left-1/2 -translate-x-1/2" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Unit Details Panel */}
      {activeUnitId && (
        <div className="p-3 bg-muted/30 rounded-lg border border-primary/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                {sizes.find(s => s.id === activeUnitId)?.value}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {language === 'ar' ? 'إعدادات الوحدة' : 'Unit Settings'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveUnitId(null)}
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
                value={getUnitPricing(activeUnitId).cost}
                onChange={(e) => updateUnitPricing(activeUnitId, 'cost', parseFloat(e.target.value) || 0)}
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
                value={getUnitPricing(activeUnitId).price}
                onChange={(e) => updateUnitPricing(activeUnitId, 'price', parseFloat(e.target.value) || 0)}
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
                  value={getUnitPricing(activeUnitId).barcode}
                  onChange={(e) => updateUnitPricing(activeUnitId, 'barcode', e.target.value)}
                  className="h-8 text-center text-xs font-mono flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => regenerateUnitBarcode(activeUnitId)}
                >
                  <RefreshCw size={12} />
                </Button>
              </div>
            </div>
          </div>

          {/* ✅ Quick Actions - مع خيار إضافة بدون لون */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => toggleAllColorsForUnit(activeUnitId, true)}
              className="flex-1 h-7 text-xs"
            >
              <Plus size={12} className="me-1" />
              {language === 'ar' ? 'كل الألوان' : 'All Colors'}
            </Button>
            
            {/* ✅ زر إضافة وحدة بدون لون */}
            <Button
              type="button"
              variant={hasUnitWithoutColor(activeUnitId) ? "secondary" : "outline"}
              size="sm"
              onClick={hasUnitWithoutColor(activeUnitId) ? removeUnitWithoutColor : addUnitWithoutColor}
              className={cn(
                "flex-1 h-7 text-xs",
                hasUnitWithoutColor(activeUnitId) && "bg-primary/10 border-primary text-primary"
              )}
            >
              <Circle size={12} className={cn(
                "me-1",
                hasUnitWithoutColor(activeUnitId) && "fill-primary"
              )} />
              {language === 'ar' ? 'بدون لون' : 'No Color'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => toggleAllColorsForUnit(activeUnitId, false)}
              className="text-destructive hover:text-destructive h-7 text-xs"
            >
              <X size={12} className="me-1" />
              {language === 'ar' ? 'إزالة' : 'Clear'}
            </Button>
          </div>

          {/* Color Selection - يظهر فقط لو الوحدة مش بدون لون */}
          {!hasUnitWithoutColor(activeUnitId) && (
            <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-1">
              {colors.map((color) => {
                const isEnabled = enabledColorsForActiveUnit.includes(color.id);
                
                return (
                  <button
                    key={color.id}
                    type="button"
                    onClick={() => isEnabled ? removeColorForUnit(color.id) : addColorForUnit(color.id)}
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
          )}
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
                    {language === 'ar' ? 'الوحدة' : 'Unit'}
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
                  // ✅ عرض الوحدة بدون لون
                  const noColorVariant = variants.find(v => v.unitId === size.id && v.noColor && v.enabled);
                  
                  // ✅ عرض المتغيرات بالألوان
                  const colorVariants = variants.filter(v => v.unitId === size.id && v.enabled && !v.noColor);
                  
                  if (!noColorVariant && colorVariants.length === 0) return null;
                  
                  const pricing = getUnitPricing(size.id);
                  
                  return (
                    <React.Fragment key={size.id}>
                      {/* ✅ صف الوحدة بدون لون */}
                      {noColorVariant && (
                        <tr className={idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                          <td className="p-2 font-medium text-foreground">
                            <Badge variant="secondary" className="text-xs">{size.value}</Badge>
                          </td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <Circle size={14} className="fill-primary text-primary" />
                              <span className="text-xs text-muted-foreground">
                                {language === 'ar' ? 'بدون لون' : 'No Color'}
                              </span>
                            </div>
                          </td>
                          <td className="p-2 text-center font-mono text-[10px] text-muted-foreground">
                            {noColorVariant.barcode || pricing.barcode}
                          </td>
                          <td className="p-2 text-center font-medium">
                            {noColorVariant.cost.toLocaleString()}
                          </td>
                          <td className="p-2 text-center font-medium text-primary">
                            {noColorVariant.price.toLocaleString()}
                          </td>
                        </tr>
                      )}

                      {/* ✅ صف الألوان */}
                      {colorVariants.map((variant, vIdx) => {
                        const color = colors.find(c => c.id === variant.colorId);
                        return (
                          <tr key={variant.id} className={vIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                            <td className="p-2 font-medium text-foreground">
                              <Badge variant="secondary" className="text-xs">{size.value}</Badge>
                            </td>
                            <td className="p-2">
                              <div className="flex items-center gap-1">
                                <div
                                  className="w-4 h-4 rounded-full border border-border"
                                  style={{ backgroundColor: color?.hexCode || '#888' }}
                                />
                                <span className="text-xs">{color?.value}</span>
                              </div>
                            </td>
                            <td className="p-2 text-center font-mono text-[10px] text-muted-foreground">
                              {variant.barcode}
                            </td>
                            <td className="p-2 text-center font-medium">
                              {variant.cost.toLocaleString()}
                            </td>
                            <td className="p-2 text-center font-medium text-primary">
                              {variant.price.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {enabledCount === 0 && (
        <div className="text-center py-4 text-muted-foreground border border-dashed border-border rounded-lg text-xs">
          {language === 'ar' ? 'اضغط على وحدة لإضافة ألوان أو إضافة بدون لون' : 'Click a unit to add colors or add without color'}
        </div>
      )}
    </div>
  );
};

export default VariantMatrix;