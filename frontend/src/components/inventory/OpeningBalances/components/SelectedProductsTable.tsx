// components/SelectedProductsTable.tsx
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Ruler, Palette } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { SelectedProduct } from '../types';

interface SelectedProductsTableProps {
  products: SelectedProduct[];
  onUpdateQuantity: (index: number, quantity: number) => void;
  onUpdateCost: (index: number, cost: number) => void;
  onRemove: (index: number) => void;
}

export const SelectedProductsTable: React.FC<SelectedProductsTableProps> = ({
  products,
  onUpdateQuantity,
  onUpdateCost,
  onRemove
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();

  if (products.length === 0) return null;

  const t = {
    product: language === 'ar' ? 'المنتج' : 'Product',
    size: language === 'ar' ? 'المقاس' : 'Size',
    color: language === 'ar' ? 'اللون' : 'Color',
    quantity: language === 'ar' ? 'الكمية' : 'Quantity',
    costPrice: language === 'ar' ? 'سعر التكلفة' : 'Cost Price',
    total: language === 'ar' ? 'الإجمالي' : 'Total'
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30">
            <TableHead className="w-8 py-2 text-xs">#</TableHead>
            <TableHead className="py-2 text-xs">{t.product}</TableHead>
            <TableHead className="py-2 text-xs">{t.size}</TableHead>
            <TableHead className="py-2 text-xs">{t.color}</TableHead>
            <TableHead className="w-24 py-2 text-xs text-center">{t.quantity}</TableHead>
            <TableHead className="w-28 py-2 text-xs text-center">{t.costPrice}</TableHead>
            <TableHead className="w-24 py-2 text-xs text-end">{t.total}</TableHead>
            <TableHead className="w-8 py-2"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((item, index) => (
            <TableRow key={index}>
              <TableCell className="py-2 text-xs text-center">{index + 1}</TableCell>
              <TableCell className="py-2">
                <div>
                  <p className="font-medium text-xs">
                    {language === 'ar' ? (item.product.name_ar || item.product.name) : item.product.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{item.product.sku}</p>
                </div>
              </TableCell>
              <TableCell className="py-2 text-xs">
                {item.unitName ? (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Ruler size={10} />
                    {item.unitName}
                  </Badge>
                ) : '-'}
              </TableCell>
              <TableCell className="py-2 text-xs">
                {item.colorName ? (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Palette size={10} />
                    {item.colorName}
                  </Badge>
                ) : '-'}
              </TableCell>
              <TableCell className="py-2 text-center">
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => onUpdateQuantity(index, Number(e.target.value))}
                  className="w-20 h-7 text-xs text-center mx-auto"
                />
              </TableCell>
              <TableCell className="py-2 text-center">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.cost}
                  onChange={(e) => onUpdateCost(index, Number(e.target.value))}
                  className="w-24 h-7 text-xs text-center mx-auto"
                />
              </TableCell>
              <TableCell className="py-2 text-end font-semibold text-xs text-emerald-600">
                {formatCurrency(item.quantity * item.cost)}
              </TableCell>
              <TableCell className="py-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => onRemove(index)}
                >
                  <Trash2 size={12} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};