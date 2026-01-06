import React, { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useSizes, useColors, Size, Color } from '@/hooks/useVariantData';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Barcode } from 'lucide-react';

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

  const updateVariantStock = (colorId: string, sizeId: string, stock: number) => {
    onVariantChange(variants.map(v =>
      v.colorId === colorId && v.sizeId === sizeId
        ? { ...v, stock }
        : v
    ));
  };

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
    } else {
      onSizeSelectionChange([...selectedSizes, sizeId]);
    }
  };

  const toggleColor = (colorId: string) => {
    if (!onColorSelectionChange) return;
    if (selectedColors.includes(colorId)) {
      onColorSelectionChange(selectedColors.filter(id => id !== colorId));
    } else {
      onColorSelectionChange([...selectedColors, colorId]);
    }
  };

  const enabledCount = variants.filter(v => v.enabled).length;
  const totalStock = variants.filter(v => v.enabled).reduce((sum, v) => sum + v.stock, 0);

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
      {/* Size Selection */}
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground">
          {language === 'ar' ? 'اختر المقاسات المتاحة' : 'Select Available Sizes'}
        </h4>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size.id}
              type="button"
              onClick={() => toggleSize(size.id)}
              className={cn(
                'px-4 py-2 rounded-lg border-2 transition-all font-medium',
                selectedSizes.includes(size.id)
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/50'
              )}
            >
              {size.value}
            </button>
          ))}
        </div>
      </div>

      {/* Color Selection */}
      <div className="space-y-3">
        <h4 className="font-semibold text-foreground">
          {language === 'ar' ? 'اختر الألوان المتاحة' : 'Select Available Colors'}
        </h4>
        <div className="flex flex-wrap gap-2">
          {colors.map((color) => (
            <button
              key={color.id}
              type="button"
              onClick={() => toggleColor(color.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all',
                selectedColors.includes(color.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-muted/30 hover:border-primary/50'
              )}
            >
              <div
                className="w-5 h-5 rounded-full border border-border"
                style={{ backgroundColor: color.hexCode || '#888' }}
              />
              <span className={cn(
                'font-medium',
                selectedColors.includes(color.id) ? 'text-primary' : 'text-muted-foreground'
              )}>
                {language === 'ar' ? color.valueAr : color.value}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Matrix Table */}
      {activeSizes.length > 0 && activeColors.length > 0 && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-foreground">
              {language === 'ar' ? 'مصفوفة المتغيرات' : 'Variant Matrix'}
            </h4>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {language === 'ar' ? 'المتغيرات النشطة:' : 'Active Variants:'}{' '}
                <span className="font-semibold text-foreground">{enabledCount}</span>
              </span>
              <span>
                {language === 'ar' ? 'إجمالي المخزون:' : 'Total Stock:'}{' '}
                <span className="font-semibold text-foreground">{totalStock}</span>
              </span>
            </div>
          </div>

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
                {activeColors.map((color, colorIdx) => (
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
                          <div className={cn(
                            'p-2 rounded-lg border transition-all',
                            isEnabled 
                              ? 'border-primary/30 bg-primary/5' 
                              : 'border-dashed border-border bg-muted/30'
                          )}>
                            <div className="flex items-center gap-2 mb-2">
                              <Checkbox
                                checked={isEnabled}
                                onCheckedChange={() => toggleVariant(color.id, size.id)}
                              />
                              <span className="text-xs text-muted-foreground truncate">
                                {variant?.sku || generateSKU(baseSku, color.value, size.value)}
                              </span>
                            </div>
                            
                            {isEnabled && variant && (
                              <div className="space-y-2">
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
                                  />
                                </div>
                                {/* Stock */}
                                <div>
                                  <label className="text-xs text-muted-foreground">
                                    {language === 'ar' ? 'المخزون' : 'Stock'}
                                  </label>
                                  <Input
                                    type="number"
                                    value={variant.stock}
                                    onChange={(e) => updateVariantStock(color.id, size.id, parseInt(e.target.value) || 0)}
                                    className="h-8 text-center"
                                    min={0}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {(activeSizes.length === 0 || activeColors.length === 0) && (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          {language === 'ar' 
            ? 'اختر المقاسات والألوان لإنشاء مصفوفة المتغيرات'
            : 'Select sizes and colors to create the variant matrix'
          }
        </div>
      )}
    </div>
  );
};

export default VariantMatrix;
