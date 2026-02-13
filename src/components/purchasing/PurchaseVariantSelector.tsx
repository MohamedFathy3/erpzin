import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Check, ChevronRight, Package } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import api from '@/lib/api';

interface UnitColor {
  id: number;
  color_id: number;
  color: string;
  stock: number;
}

interface Unit {
  id: number;
  unit_id: number;
  unit_name: string;
  cost_price: string;
  sell_price: string;
  barcode: string;
  colors?: UnitColor[];
}

interface Product {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  cost?: number;
  image_url?: string;
  units: Unit[];
}

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
  }) => void;
}

const PurchaseVariantSelector: React.FC<PurchaseVariantSelectorProps> = ({
  isOpen,
  onClose,
  product,
  onSelectVariant
}) => {
  const { language } = useLanguage();
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

  // استخراج الوحدات من المنتج
  const units = product.units || [];

  // الحصول على الوحدة المحددة
  const selectedUnit = useMemo(() => {
    if (!selectedUnitId) return null;
    return units.find(u => u.id === selectedUnitId);
  }, [selectedUnitId, units]);

  // الحصول على الألوان للوحدة المحددة
  const colorsForSelectedUnit = useMemo(() => {
    if (!selectedUnit || !selectedUnit.colors) return [];
    return selectedUnit.colors;
  }, [selectedUnit]);

  const handleUnitSelect = (unit: Unit) => {
    setSelectedUnitId(unit.id);
  };

  const handleColorSelect = (color: UnitColor) => {
    if (!selectedUnit) return;

    const unitCost = parseFloat(selectedUnit.cost_price) || 0;

    onSelectVariant({
      product_id: product.id.toString(),
      variant_id: color.id.toString(),
      product_name: `${language === 'ar' ? product.name_ar || product.name : product.name} - ${selectedUnit.unit_name} / ${color.color}`,
      product_sku: `${product.sku}-${selectedUnit.id}-${color.id}`,
      unit_cost: unitCost,
      size_name: selectedUnit.unit_name,
      color_name: color.color
    });
    handleClose();
  };

  const handleDefaultSelect = () => {
    if (!selectedUnit) return;

    const unitCost = parseFloat(selectedUnit.cost_price) || 0;

    onSelectVariant({
      product_id: product.id.toString(),
      variant_id: selectedUnit.id.toString(),
      product_name: `${language === 'ar' ? product.name_ar || product.name : product.name} - ${selectedUnit.unit_name}`,
      product_sku: `${product.sku}-${selectedUnit.id}`,
      unit_cost: unitCost,
      size_name: selectedUnit.unit_name
    });
    handleClose();
  };

  const handleClose = () => {
    onClose();
    setSelectedUnitId(null);
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
              <p className="text-xs text-muted-foreground">
                {(product.cost || 0).toLocaleString()} YER
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4">
          {!selectedUnitId ? (
            /* Step 1: Unit Selection */
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">1</Badge>
                <span className="text-xs font-medium text-foreground">
                  {language === 'ar' ? 'اختر الوحدة' : 'Select Unit'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5 max-h-[300px] overflow-y-auto">
                {units.map((unit) => {
                  const hasColors = unit.colors && unit.colors.length > 0;
                  const unitCost = parseFloat(unit.cost_price) || 0;
                  
                  return (
                    <button
                      key={unit.id}
                      onClick={() => handleUnitSelect(unit)}
                      className={cn(
                        'p-3 rounded-lg border transition-all text-start',
                        'bg-background border-border hover:border-primary hover:bg-primary/5'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{unit.unit_name}</span>
                        {hasColors && (
                          <Badge variant="secondary" className="text-[9px] px-1">
                            {unit.colors?.length} {language === 'ar' ? 'لون' : 'colors'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-semibold text-primary mb-1">
                        {unitCost.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {unit.barcode}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Step 2: Color Selection (if available) or Direct Selection */
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">
                    {colorsForSelectedUnit.length > 0 ? '2' : '✓'}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">
                    {colorsForSelectedUnit.length > 0 
                      ? (language === 'ar' ? 'اختر اللون' : 'Select Color')
                      : (language === 'ar' ? 'تأكيد الوحدة' : 'Confirm Unit')
                    }
                  </span>
                </div>
                <button
                  onClick={() => setSelectedUnitId(null)}
                  className="text-[10px] text-primary hover:underline"
                >
                  {language === 'ar' ? 'تغيير' : 'Change'}
                </button>
              </div>

              {/* Selected Unit Badge */}
              {selectedUnit && (
                <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-lg mb-3">
                  <span className="text-[10px] text-muted-foreground">
                    {language === 'ar' ? 'الوحدة:' : 'Unit:'}
                  </span>
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    {selectedUnit.unit_name}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">
                    {parseFloat(selectedUnit.cost_price || '0').toLocaleString()}
                  </span>
                </div>
              )}

              {/* Colors Grid */}
              {colorsForSelectedUnit.length > 0 ? (
                <div className="grid grid-cols-2 gap-1.5 max-h-[200px] overflow-y-auto">
                  {colorsForSelectedUnit.map((color) => (
                    <button
                      key={color.id}
                      onClick={() => handleColorSelect(color)}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border transition-all text-start',
                        'bg-background border-border hover:border-primary hover:bg-primary/5'
                      )}
                    >
                      {/* Color Swatch */}
                      <div 
                        className="w-8 h-8 rounded border border-border flex-shrink-0"
                        style={{ backgroundColor: color.color || '#ccc' }}
                      />
                      
                      {/* Color Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs text-foreground truncate">
                          {color.color}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] px-1 py-0">
                            {color.stock || 0}
                          </Badge>
                        </div>
                      </div>

                      <ChevronRight size={12} className="text-muted-foreground flex-shrink-0" />
                    </button>
                  ))}
                </div>
              ) : (
                /* No colors - Direct selection button */
                <button
                  onClick={handleDefaultSelect}
                  className="w-full p-4 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary transition-all flex items-center justify-center gap-2"
                >
                  <Check size={16} className="text-primary" />
                  <span className="text-sm font-medium text-primary">
                    {language === 'ar' ? 'تأكيد الاختيار' : 'Confirm Selection'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseVariantSelector;