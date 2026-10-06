// components/purchase/PurchaseVariantSelector.tsx
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Ruler, Palette, DollarSign } from 'lucide-react';
import { Product, ProductUnit, ProductColor } from '@/types/purchaseform';
import { cn } from '@/lib/utils';

interface PurchaseVariantSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onSelectVariant: (variant: {
    product_id: string;
    variant_id: string;
    product_name: string;
    product_sku: string;
    unit_cost: number;
    size_name?: string;
    color_name?: string;
    product_unit_id?: number;
    color_id?: number;
    stock?: number;
  }) => void;
}

const PurchaseVariantSelector: React.FC<PurchaseVariantSelectorProps> = ({
  isOpen,
  onClose,
  product,
  onSelectVariant
}) => {
  const { language } = useLanguage();
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);

  const handleUnitSelect = (unit: ProductUnit) => {
    setSelectedUnit(unit);
    setSelectedColor(null);
  };

  const handleColorSelect = (color: ProductColor) => {
    setSelectedColor(color);
  };

 const handleConfirm = () => {
  if (selectedUnit) {
    onSelectVariant({
      product_id: product.id.toString(),
      variant_id: selectedUnit.id.toString(),  // id من الجدول (5)
      product_name: language === 'ar' ? product.name_ar || product.name : product.name,
      product_sku: product.sku,
      unit_cost: Number(selectedUnit.cost_price),
      size_name: selectedUnit.unit_name,
      color_name: selectedColor?.color,
      product_unit_id: selectedUnit.unit_id,  // ✅ unit_id الحقيقي (1)
      color_id: selectedColor?.color_id,      // ✅ color_id الحقيقي (1)
      stock: selectedColor?.stock || 0
    });
  }
  onClose();
};

  const productName = language === 'ar' ? product.name_ar || product.name : product.name;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package size={18} />
            {language === 'ar' ? 'اختر الوحدة واللون' : 'Select Unit & Color'} - {productName}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Units Section */}
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Ruler size={14} />
              {language === 'ar' ? 'الوحدات المتاحة' : 'Available Units'}
            </h4>
            <ScrollArea className="h-32 border rounded-md p-2">
              <div className="space-y-1">
                {product.units?.map((unit) => (
                  <button
                    key={unit.id}
                    onClick={() => handleUnitSelect(unit)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md text-sm transition-colors",
                      selectedUnit?.id === unit.id
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    )}
                  >
                    <div className="flex justify-between items-center">
                      <span>{unit.unit_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {Number(unit.cost_price).toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          {/* Colors Section */}
          {selectedUnit?.colors && selectedUnit.colors.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Palette size={14} />
                {language === 'ar' ? 'الألوان المتاحة' : 'Available Colors'}
              </h4>
              <ScrollArea className="h-32 border rounded-md p-2">
                <div className="flex flex-wrap gap-2">
                  {selectedUnit.colors.map((color) => {
                    const isLowStock = color.stock <= 5;
                    const isOutOfStock = color.stock === 0;
                    
                    return (
                      <button
                        key={color.id}
                        onClick={() => handleColorSelect(color)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-sm transition-all flex items-center gap-1",
                          selectedColor?.id === color.id
                            ? "bg-primary text-white"
                            : "border border-border hover:bg-muted/80",
                        )}
                        title={isOutOfStock ? (language === 'ar' ? 'نفد المخزون' : 'Out of stock') : `${language === 'ar' ? 'المخزون' : 'Stock'}: ${color.stock}`}
                      >
                        <span>{color.color}</span>
                        <span className={cn(
                          "text-xs font-mono",
                          isLowStock && !isOutOfStock ? "text-destructive" : ""
                        )}>
                          ({color.stock})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
          
          {/* Price Summary */}
          {selectedUnit && (
            <div className="bg-primary/5 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium flex items-center gap-1">
                  <DollarSign size={14} />
                  {language === 'ar' ? 'سعر الشراء' : 'Purchase Price'}:
                </span>
                <span className="text-lg font-bold text-primary">
                  {Number(selectedUnit.cost_price).toLocaleString()} {language === 'ar' ? 'ر.س' : 'SAR'}
                </span>
              </div>
              {selectedColor && (
                <div className="text-xs mt-1 space-y-0.5">
                  <div className="text-muted-foreground">
                    {language === 'ar' ? 'اللون:' : 'Color:'} {selectedColor.color}
                  </div>
                  <div className={cn(
                    "text-xs font-mono",
                    selectedColor.stock <= 5 && selectedColor.stock > 0 ? "text-destructive font-bold" : "text-muted-foreground"
                  )}>
                    {language === 'ar' ? `المخزون: ${selectedColor.stock}` : `Stock: ${selectedColor.stock}`}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={onClose} size="sm">
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!selectedUnit}
              size="sm"
            >
              {language === 'ar' ? 'تأكيد' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseVariantSelector;