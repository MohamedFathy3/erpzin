import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Package, Layers, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface ProductVariant {
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

interface ProductVariantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    nameAr: string;
    price: number;
    cost: number;
    sku: string;
    stock: number;
    image?: string;
  } | null;
  onEditProduct?: () => void;
}

const ProductVariantsModal: React.FC<ProductVariantsModalProps> = ({
  isOpen,
  onClose,
  product,
  onEditProduct
}) => {
  const { language } = useLanguage();

  const { data: variants = [], isLoading } = useQuery({
    queryKey: ['product-variants-inventory', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          id,
          sku,
          barcode,
          stock,
          price_adjustment,
          cost_adjustment,
          is_active,
          size:sizes(id, name, name_ar, code),
          color:colors(id, name, name_ar, hex_code)
        `)
        .eq('product_id', product.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: isOpen && !!product?.id
  });

  const variantsStock = variants.reduce((sum, v) => sum + v.stock, 0);
  const baseStock = product?.stock || 0;
  const totalStock = baseStock + variantsStock;
  const activeVariants = variants.filter(v => v.is_active);

  if (!product) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Layers className="text-primary" size={22} />
              {language === 'ar' ? 'متغيرات المنتج' : 'Product Variants'}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {/* Product Info */}
          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
            <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
              {product.image ? (
                <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <Package size={28} className="text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {language === 'ar' ? product.nameAr : product.name}
              </h3>
              <p className="text-sm text-muted-foreground">{product.sku}</p>
              <p className="text-primary font-semibold">{product.price.toLocaleString()} YER</p>
            </div>
          </div>

          {/* Stock Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 text-center">
              <div className="text-2xl font-bold text-primary">{baseStock}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'مخزون الصنف الأساسي' : 'Base Product Stock'}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-foreground">{variantsStock}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'مخزون المتغيرات' : 'Variants Stock'}
              </div>
            </div>
            <div className="bg-success/10 rounded-lg p-4 text-center border border-success/20">
              <div className="text-2xl font-bold text-success">{totalStock}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'إجمالي المخزون' : 'Total Stock'}
              </div>
            </div>
          </div>

          {/* Variants Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-foreground">{variants.length}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'إجمالي المتغيرات' : 'Total Variants'}
              </div>
            </div>
            <div className="bg-primary/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-primary">{activeVariants.length}</div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'متغيرات نشطة' : 'Active Variants'}
              </div>
            </div>
            <div className="bg-warning/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-warning">
                {variants.filter(v => v.stock <= 5 && v.stock > 0).length}
              </div>
              <div className="text-xs text-muted-foreground">
                {language === 'ar' ? 'مخزون منخفض' : 'Low Stock'}
              </div>
            </div>
          </div>

          {/* Variants List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Package size={48} className="mb-3 opacity-30" />
              <p className="text-sm">
                {language === 'ar' ? 'لا توجد متغيرات لهذا المنتج' : 'No variants for this product'}
              </p>
              {onEditProduct && (
                <Button variant="outline" size="sm" className="mt-3" onClick={onEditProduct}>
                  <Edit2 size={14} className="me-2" />
                  {language === 'ar' ? 'إضافة متغيرات' : 'Add Variants'}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground px-1 mb-2">
                {language === 'ar' ? 'قائمة المتغيرات' : 'Variants List'}
              </div>
              {variants.map((variant, idx) => (
                <div
                  key={variant.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm",
                    variant.is_active 
                      ? "bg-card border-border hover:border-primary/30" 
                      : "bg-muted/30 border-muted opacity-60",
                    idx % 2 === 0 ? "bg-card" : "bg-muted/20"
                  )}
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {/* Color indicator */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {variant.color?.hex_code && (
                      <span 
                        className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                        style={{ backgroundColor: variant.color.hex_code }}
                      />
                    )}
                  </div>

                  {/* Variant info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {variant.size && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-xs">
                          {language === 'ar' ? variant.size.name_ar || variant.size.name : variant.size.name}
                        </Badge>
                      )}
                      {variant.color && (
                        <Badge variant="outline" className="bg-secondary/50 text-secondary-foreground border-secondary/30 text-xs">
                          {language === 'ar' ? variant.color.name_ar || variant.color.name : variant.color.name}
                        </Badge>
                      )}
                      {!variant.is_active && (
                        <Badge variant="secondary" className="text-xs">
                          {language === 'ar' ? 'غير نشط' : 'Inactive'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">
                      SKU: {variant.sku}
                      {variant.barcode && ` • ${variant.barcode}`}
                    </p>
                  </div>

                  {/* Price adjustment */}
                  {variant.price_adjustment !== 0 && variant.price_adjustment !== null && (
                    <div className="text-sm text-end">
                      <span className={cn(
                        "font-medium",
                        variant.price_adjustment > 0 ? "text-success" : "text-destructive"
                      )}>
                        {variant.price_adjustment > 0 ? '+' : ''}{variant.price_adjustment.toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        {language === 'ar' ? 'تعديل السعر' : 'Price adj.'}
                      </span>
                    </div>
                  )}

                  {/* Stock */}
                  <div className="text-end min-w-16">
                    <span className={cn(
                      "text-lg font-bold",
                      variant.stock === 0 ? "text-destructive" : 
                      variant.stock <= 5 ? "text-warning" : "text-success"
                    )}>
                      {variant.stock}
                    </span>
                    <span className="text-xs text-muted-foreground block">
                      {language === 'ar' ? 'متوفر' : 'in stock'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? `${variants.length} متغير • ${totalStock} وحدة`
              : `${variants.length} variants • ${totalStock} units`
            }
          </div>
          <div className="flex gap-2">
            {onEditProduct && (
              <Button variant="outline" onClick={onEditProduct}>
                <Edit2 size={16} className="me-2" />
                {language === 'ar' ? 'تعديل المنتج' : 'Edit Product'}
              </Button>
            )}
            <Button variant="default" onClick={onClose}>
              {language === 'ar' ? 'إغلاق' : 'Close'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductVariantsModal;
