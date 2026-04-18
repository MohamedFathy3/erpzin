// components/VariantSelectionModal.tsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Layers, Ruler, Palette, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Product, Unit, Color } from '../types';

interface VariantSelectionModalProps {
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product, unit?: Unit, color?: Color, quantity?: number) => void;
}

export const VariantSelectionModal: React.FC<VariantSelectionModalProps> = ({
  product,
  onClose,
  onAdd
}) => {
  const { language } = useLanguage();
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedColor, setSelectedColor] = useState<Color | null>(null);
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const t = {
    variantDetails: language === 'ar' ? 'تفاصيل المتغيرات' : 'Variant Details',
    size: language === 'ar' ? 'المقاس' : 'Size',
    color: language === 'ar' ? 'اللون' : 'Color',
    quantity: language === 'ar' ? 'الكمية' : 'Quantity',
    selectSize: language === 'ar' ? 'اختر المقاس' : 'Select size',
    selectColor: language === 'ar' ? 'اختر اللون' : 'Select color',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    addToList: language === 'ar' ? 'إضافة إلى القائمة' : 'Add to List'
  };

  const hasUnits = product.units && product.units.length > 0;
  const hasColors = selectedUnit && selectedUnit.colors && selectedUnit.colors.length > 0;

  const handleAdd = () => {
    onAdd(product, selectedUnit || undefined, selectedColor || undefined, quantity);
    onClose();
  };

  const isValid = () => {
    if (hasUnits && !selectedUnit) return false;
    if (hasColors && !selectedColor) return false;
    return true;
  };

  return (
    <Dialog open={!!product} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers size={18} className="text-emerald-600" />
            {t.variantDetails} - {language === 'ar' ? product.name_ar : product.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Select Size/Unit */}
          {hasUnits && (
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Ruler size={14} />
                {t.size}
              </Label>
              <Select 
                value={selectedUnit?.unit_id?.toString()} 
                onValueChange={(val) => {
                  const unit = product.units?.find(u => u.unit_id.toString() === val);
                  setSelectedUnit(unit || null);
                  setSelectedColor(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectSize} />
                </SelectTrigger>
                <SelectContent>
                  {product.units?.map((unit) => (
                    <SelectItem key={unit.unit_id} value={unit.unit_id.toString()}>
                      <div className="flex justify-between w-full">
                        <span>{unit.unit_name}</span>
                        <span className="text-muted-foreground text-xs ml-4">
                          {unit.cost_price} / {unit.sell_price}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Select Color */}
          {hasColors && (
            <div>
              <Label className="flex items-center gap-2 mb-1.5">
                <Palette size={14} />
                {t.color}
              </Label>
              <Select 
                value={selectedColor?.color_id?.toString()} 
                onValueChange={(val) => {
                  const color = selectedUnit.colors.find(c => c.color_id.toString() === val);
                  setSelectedColor(color || null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.selectColor} />
                </SelectTrigger>
                <SelectContent>
                  {selectedUnit.colors.map((color) => (
                    <SelectItem key={color.color_id} value={color.color_id.toString()}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border" 
                          style={{ backgroundColor: color.hex_code || '#000000' }}
                        />
                        <span>{color.color}</span>
                        {color.stock > 0 && (
                          <span className="text-xs text-muted-foreground ml-2">
                            (Stock: {color.stock})
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Quantity */}
          <div>
            <Label className="mb-1.5 block">{t.quantity}</Label>
            <Input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button 
            onClick={handleAdd}
            disabled={!isValid()}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            <Plus size={14} />
            {t.addToList}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};