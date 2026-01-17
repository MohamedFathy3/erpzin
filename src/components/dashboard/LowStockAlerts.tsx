import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { AlertTriangle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

const LowStockAlerts: React.FC = () => {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const { data: lowStockItems, isLoading } = useQuery({
    queryKey: ['low-stock-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, name_ar, sku, stock, min_stock')
        .not('min_stock', 'is', null)
        .order('stock', { ascending: true })
        .limit(5);
      
      if (error) throw error;
      
      // Filter products where stock is below min_stock
      return data?.filter(p => (p.stock || 0) <= (p.min_stock || 0)) || [];
    },
  });

  const getStockLevel = (current: number, reorder: number) => {
    if (reorder === 0) return 'low';
    const ratio = current / reorder;
    if (ratio <= 0.3) return 'critical';
    if (ratio <= 0.5) return 'warning';
    return 'low';
  };

  if (isLoading) {
    return (
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-16" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-1" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-warning" size={18} />
          <h3 className="text-lg font-semibold text-foreground">
            {t('dashboard.lowStock')}
          </h3>
        </div>
        <Badge variant="outline" className="text-warning border-warning">
          {lowStockItems?.length || 0} {t('dashboard.items')}
        </Badge>
      </div>

      <div className="space-y-3">
        {lowStockItems && lowStockItems.length > 0 ? (
          lowStockItems.map((item: any) => {
            const level = getStockLevel(item.stock || 0, item.min_stock || 10);
            const productName = language === 'ar' && item.name_ar ? item.name_ar : item.name;
            
            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50 cursor-pointer',
                  level === 'critical' && 'border-destructive/30 bg-destructive/5',
                  level === 'warning' && 'border-warning/30 bg-warning/5',
                  level === 'low' && 'border-border'
                )}
                onClick={() => navigate('/inventory')}
              >
                <div className={cn(
                  'p-2 rounded-lg',
                  level === 'critical' && 'bg-destructive/10 text-destructive',
                  level === 'warning' && 'bg-warning/10 text-warning',
                  level === 'low' && 'bg-muted text-muted-foreground'
                )}>
                  <Package size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{productName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{item.sku}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    'text-sm font-bold',
                    level === 'critical' && 'text-destructive',
                    level === 'warning' && 'text-warning',
                    level === 'low' && 'text-foreground'
                  )}>
                    {item.stock || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    / {item.min_stock || 0}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="mx-auto mb-2 text-success" size={32} />
            <p>{language === 'ar' ? 'المخزون بحالة جيدة' : 'Stock levels are healthy'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LowStockAlerts;