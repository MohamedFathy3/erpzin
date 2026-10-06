// components/ProductList.tsx
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { Product } from '../types';

interface ProductListProps {
  products: Product[];
  onDelete: (productId: number) => void;
  isDeleting?: boolean;
  deletingId?: number | null;
}

export const ProductList: React.FC<ProductListProps> = ({ 
  products, 
  onDelete,
  isDeleting = false,
  deletingId = null
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();

  const t = {
    product: language === 'ar' ? 'المنتج' : 'Product',
    quantity: language === 'ar' ? 'الكمية' : 'Quantity',
    costPrice: language === 'ar' ? 'سعر التكلفة' : 'Cost Price',
    salePrice: language === 'ar' ? 'سعر البيع' : 'Sale Price',
    total: language === 'ar' ? 'الإجمالي' : 'Total'
  };

  return (
    <div className="rounded-xl border border-border/50 overflow-hidden">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow>
            <TableHead className="font-semibold">{t.product}</TableHead>
            <TableHead className="text-right font-semibold">{t.quantity}</TableHead>
            <TableHead className="text-right font-semibold">{t.costPrice}</TableHead>
            <TableHead className="text-right font-semibold">{t.salePrice}</TableHead>
            <TableHead className="text-right font-semibold">{t.total}</TableHead>
            <TableHead className="text-right w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow 
              key={product.id} 
              className={`hover:bg-muted/20 transition-opacity ${
                deletingId === product.id ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <span>{language === 'ar' && product.name_ar ? product.name_ar : product.name}</span>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{product.sku}</span>
                    {product.barcode && (
                      <span className="text-xs text-muted-foreground">• {product.barcode}</span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right font-mono">{product.stock}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(product.cost)}</TableCell>
              <TableCell className="text-right font-mono">{formatCurrency(product.price || 0)}</TableCell>
              <TableCell className="text-right font-mono font-semibold text-emerald-600">
                {formatCurrency((product.stock || 0) * product.cost)}
              </TableCell>
              <TableCell className="text-right">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onDelete(product.id)}
                  disabled={deletingId === product.id}
                  className="text-muted-foreground hover:text-red-500 hover:bg-red-50"
                >
                  {deletingId === product.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};