import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

export interface VariantOption {
  id: string;
  value: string;
  valueAr: string;
}

export interface ProductVariant {
  id: string;
  colorId: string;
  sizeId: string;
  sku: string;
  barcode: string;
  stock: number;
  price: number;
  enabled: boolean;
}

interface VariantMatrixProps {
  colors: VariantOption[];
  sizes: VariantOption[];
  variants: ProductVariant[];
  baseSku: string;
  basePrice: number;
  onVariantChange: (variants: ProductVariant[]) => void;
}

const generateSKU = (baseSku: string, colorCode: string, sizeCode: string): string => {
  return `${baseSku}-${colorCode.substring(0, 2).toUpperCase()}-${sizeCode.toUpperCase()}`;
};

const generateBarcode = (): string => {
  return Math.floor(Math.random() * 9000000000000 + 1000000000000).toString();
};

const VariantMatrix: React.FC<VariantMatrixProps> = ({
  colors,
  sizes,
  variants,
  baseSku,
  basePrice,
  onVariantChange
}) => {
  const { language } = useLanguage();

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
        stock: 0,
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

  const enabledCount = variants.filter(v => v.enabled).length;
  const totalStock = variants.filter(v => v.enabled).reduce((sum, v) => sum + v.stock, 0);

  return (
    <div className="space-y-4">
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

      {/* Matrix Table */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="p-3 text-start font-medium text-muted-foreground border-b border-border">
                {language === 'ar' ? 'اللون / المقاس' : 'Color / Size'}
              </th>
              {sizes.map((size) => (
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
            {colors.map((color, colorIdx) => (
              <tr key={color.id} className={colorIdx % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                <td className="p-3 font-medium text-foreground border-e border-border">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: color.value.toLowerCase() }}
                    />
                    {language === 'ar' ? color.valueAr : color.value}
                  </div>
                </td>
                {sizes.map((size) => {
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
                            <div>
                              <label className="text-xs text-muted-foreground">
                                {language === 'ar' ? 'السعر' : 'Price'}
                              </label>
                              <Input
                                type="number"
                                value={variant.price}
                                onChange={(e) => updateVariantPrice(color.id, size.id, parseFloat(e.target.value) || 0)}
                                className="h-8 text-center"
                                min={0}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground text-center">
                              {variant.barcode}
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
    </div>
  );
};

export default VariantMatrix;
