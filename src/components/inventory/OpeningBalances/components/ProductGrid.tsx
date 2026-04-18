// components/ProductGrid.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { Product } from '../types';

interface ProductGridProps {
  products: Product[];
  onDelete: (productId: number) => void;
  isDeleting?: boolean;
  deletingId?: number | null;
}

export const ProductGrid: React.FC<ProductGridProps> = ({ 
  products, 
  onDelete,
  isDeleting = false,
  deletingId = null
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();

  const t = {
    quantity: language === 'ar' ? 'الكمية' : 'Quantity',
    costPrice: language === 'ar' ? 'سعر التكلفة' : 'Cost Price',
    salePrice: language === 'ar' ? 'سعر البيع' : 'Sale Price',
    total: language === 'ar' ? 'الإجمالي' : 'Total'
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <Card 
          key={product.id} 
          className={`hover:shadow-md transition-all ${
            deletingId === product.id ? 'opacity-50 pointer-events-none' : ''
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold">{language === 'ar' && product.name_ar ? product.name_ar : product.name}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{product.sku}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => onDelete(product.id)}
                disabled={deletingId === product.id}
                className="text-muted-foreground hover:text-red-500 h-8 w-8 p-0"
              >
                {deletingId === product.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">{t.quantity}</p>
                <p className="font-mono font-medium">{product.stock}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t.costPrice}</p>
                <p className="font-mono">{formatCurrency(product.cost)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t.salePrice}</p>
                <p className="font-mono">{formatCurrency(product.price || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">{t.total}</p>
                <p className="font-mono font-semibold text-emerald-600">{formatCurrency((product.stock || 0) * product.cost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};