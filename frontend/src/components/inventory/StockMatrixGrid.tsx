import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

interface VariantData {
  id: string;
  sku: string;
  barcode: string | null;
  stock: number;
  price_adjustment: number | null;
  cost_adjustment: number | null;
  is_active: boolean | null;
  size: { id: string; name: string; name_ar: string | null; code: string } | null;
  color: { id: string; name: string; name_ar: string | null; hex_code: string | null } | null;
}

interface StockMatrixGridProps {
  variants: VariantData[];
  basePrice: number;
  baseCost: number;
  mode: 'stock' | 'price' | 'barcode';
}

const StockMatrixGrid: React.FC<StockMatrixGridProps> = ({
  variants,
  basePrice,
  baseCost,
  mode
}) => {
  const { language } = useLanguage();

  // Extract unique colors and sizes
  const uniqueColors = React.useMemo(() => {
    const colors = new Map<string, VariantData['color']>();
    variants.forEach(v => {
      if (v.color && !colors.has(v.color.id)) {
        colors.set(v.color.id, v.color);
      }
    });
    return Array.from(colors.values());
  }, [variants]);

  const uniqueSizes = React.useMemo(() => {
    const sizes = new Map<string, VariantData['size']>();
    variants.forEach(v => {
      if (v.size && !sizes.has(v.size.id)) {
        sizes.set(v.size.id, v.size);
      }
    });
    return Array.from(sizes.values());
  }, [variants]);

  // Build matrix lookup
  const matrixLookup = React.useMemo(() => {
    const lookup = new Map<string, VariantData>();
    variants.forEach(v => {
      const key = `${v.color?.id || 'no-color'}-${v.size?.id || 'no-size'}`;
      lookup.set(key, v);
    });
    return lookup;
  }, [variants]);

  const getVariant = (colorId: string | undefined, sizeId: string | undefined): VariantData | undefined => {
    const key = `${colorId || 'no-color'}-${sizeId || 'no-size'}`;
    return matrixLookup.get(key);
  };

  const getStockColor = (stock: number, isActive: boolean | null) => {
    if (!isActive) return 'bg-muted text-muted-foreground';
    if (stock === 0) return 'bg-destructive/20 text-destructive';
    if (stock <= 10) return 'bg-warning/20 text-warning';
    return 'bg-success/20 text-success';
  };

  const getCellContent = (variant: VariantData | undefined) => {
    if (!variant) return { content: '-', className: 'bg-muted/30 text-muted-foreground' };

    switch (mode) {
      case 'stock':
        return {
          content: variant.stock.toString(),
          className: getStockColor(variant.stock, variant.is_active)
        };
      case 'price':
        const priceAdj = variant.price_adjustment || 0;
        return {
          content: priceAdj === 0 ? '-' : `${priceAdj > 0 ? '+' : ''}${priceAdj.toLocaleString()}`,
          className: priceAdj > 0 ? 'bg-success/10 text-success' : priceAdj < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted/30 text-muted-foreground'
        };
      case 'barcode':
        return {
          content: variant.barcode || variant.sku.slice(-6),
          className: 'bg-muted/30 text-foreground font-mono text-xs'
        };
      default:
        return { content: '-', className: '' };
    }
  };

  const renderTooltipContent = (variant: VariantData) => {
    const finalPrice = basePrice + (variant.price_adjustment || 0);
    const finalCost = baseCost + (variant.cost_adjustment || 0);

    return (
      <div className="space-y-2 text-sm min-w-48">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          {variant.color?.hex_code && (
            <span 
              className="w-4 h-4 rounded-full border border-border"
              style={{ backgroundColor: variant.color.hex_code }}
            />
          )}
          <span className="font-medium">
            {variant.color && (language === 'ar' ? variant.color.name_ar || variant.color.name : variant.color.name)}
            {variant.color && variant.size && ' - '}
            {variant.size && (language === 'ar' ? variant.size.name_ar || variant.size.name : variant.size.name)}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span className="text-muted-foreground">{language === 'ar' ? 'SKU:' : 'SKU:'}</span>
          <span className="font-mono text-xs">{variant.sku}</span>
          
          {variant.barcode && (
            <>
              <span className="text-muted-foreground">{language === 'ar' ? 'الباركود:' : 'Barcode:'}</span>
              <span className="font-mono text-xs">{variant.barcode}</span>
            </>
          )}
          
          <span className="text-muted-foreground">{language === 'ar' ? 'المخزون:' : 'Stock:'}</span>
          <span className={cn(
            "font-bold",
            variant.stock === 0 ? "text-destructive" : variant.stock <= 10 ? "text-warning" : "text-success"
          )}>
            {variant.stock}
          </span>
          
          <span className="text-muted-foreground">{language === 'ar' ? 'السعر:' : 'Price:'}</span>
          <span className="text-primary font-medium">{finalPrice.toLocaleString()}</span>
          
          <span className="text-muted-foreground">{language === 'ar' ? 'التكلفة:' : 'Cost:'}</span>
          <span>{finalCost.toLocaleString()}</span>
          
          <span className="text-muted-foreground">{language === 'ar' ? 'الحالة:' : 'Status:'}</span>
          <span className={variant.is_active ? "text-success" : "text-muted-foreground"}>
            {variant.is_active 
              ? (language === 'ar' ? 'نشط' : 'Active')
              : (language === 'ar' ? 'غير نشط' : 'Inactive')
            }
          </span>
        </div>
      </div>
    );
  };

  // Handle case where there are no colors or sizes
  const hasColors = uniqueColors.length > 0;
  const hasSizes = uniqueSizes.length > 0;

  if (!hasColors && !hasSizes) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {language === 'ar' ? 'لا توجد متغيرات' : 'No variants'}
      </div>
    );
  }

  // If only colors (no sizes)
  if (hasColors && !hasSizes) {
    return (
      <TooltipProvider>
        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {uniqueColors.map(color => {
              const variant = getVariant(color?.id, undefined);
              const { content, className } = getCellContent(variant);
              
              return (
                <Tooltip key={color?.id}>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 p-2 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-default">
                      {color?.hex_code && (
                        <span 
                          className="w-6 h-6 rounded-full border-2 border-background shadow-sm flex-shrink-0"
                          style={{ backgroundColor: color.hex_code }}
                        />
                      )}
                      <span className="flex-1 font-medium">
                        {language === 'ar' ? color?.name_ar || color?.name : color?.name}
                      </span>
                      <span className={cn("px-3 py-1 rounded-lg font-bold min-w-16 text-center", className)}>
                        {content}
                      </span>
                    </div>
                  </TooltipTrigger>
                  {variant && (
                    <TooltipContent side="left" className="p-3">
                      {renderTooltipContent(variant)}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </ScrollArea>
      </TooltipProvider>
    );
  }

  // If only sizes (no colors)
  if (!hasColors && hasSizes) {
    return (
      <TooltipProvider>
        <ScrollArea className="max-h-64">
          <div className="flex flex-wrap gap-2">
            {uniqueSizes.map(size => {
              const variant = getVariant(undefined, size?.id);
              const { content, className } = getCellContent(variant);
              
              return (
                <Tooltip key={size?.id}>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "flex flex-col items-center p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-default min-w-16",
                      className
                    )}>
                      <span className="text-xs text-muted-foreground mb-1">
                        {language === 'ar' ? size?.name_ar || size?.name : size?.name}
                      </span>
                      <span className="font-bold">{content}</span>
                    </div>
                  </TooltipTrigger>
                  {variant && (
                    <TooltipContent side="bottom" className="p-3">
                      {renderTooltipContent(variant)}
                    </TooltipContent>
                  )}
                </Tooltip>
              );
            })}
          </div>
        </ScrollArea>
      </TooltipProvider>
    );
  }

  // Full matrix (colors × sizes)
  return (
    <TooltipProvider>
      <ScrollArea className="max-h-80">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-2 text-start text-sm font-medium text-muted-foreground border-b border-border sticky start-0 bg-background z-10">
                  {language === 'ar' ? 'اللون / المقاس' : 'Color / Size'}
                </th>
                {uniqueSizes.map(size => (
                  <th 
                    key={size?.id} 
                    className="p-2 text-center text-sm font-medium text-muted-foreground border-b border-border min-w-16"
                  >
                    {language === 'ar' ? size?.name_ar || size?.name : size?.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniqueColors.map(color => (
                <tr key={color?.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-2 border-b border-border sticky start-0 bg-background z-10">
                    <div className="flex items-center gap-2">
                      {color?.hex_code && (
                        <span 
                          className="w-5 h-5 rounded-full border border-border flex-shrink-0"
                          style={{ backgroundColor: color.hex_code }}
                        />
                      )}
                      <span className="text-sm font-medium whitespace-nowrap">
                        {language === 'ar' ? color?.name_ar || color?.name : color?.name}
                      </span>
                    </div>
                  </td>
                  {uniqueSizes.map(size => {
                    const variant = getVariant(color?.id, size?.id);
                    const { content, className } = getCellContent(variant);
                    
                    return (
                      <td key={size?.id} className="p-1 border-b border-border text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className={cn(
                              "px-2 py-2 rounded-md font-semibold text-sm cursor-default transition-all hover:ring-2 hover:ring-primary/30",
                              className
                            )}>
                              {content}
                            </div>
                          </TooltipTrigger>
                          {variant && (
                            <TooltipContent side="top" className="p-3">
                              {renderTooltipContent(variant)}
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
};

export default StockMatrixGrid;
