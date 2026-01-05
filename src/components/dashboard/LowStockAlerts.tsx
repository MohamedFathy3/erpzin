import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { AlertTriangle, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StockItem {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  reorderLevel: number;
  branch: string;
}

const LowStockAlerts: React.FC = () => {
  const { t } = useLanguage();

  const lowStockItems: StockItem[] = [
    { id: '1', name: 'Boys Denim Jeans - Blue/32', sku: 'BDJ-BL-32', currentStock: 3, reorderLevel: 10, branch: 'Abra' },
    { id: '2', name: 'Girls Summer Dress - Pink/M', sku: 'GSD-PK-M', currentStock: 5, reorderLevel: 15, branch: 'Primark' },
    { id: '3', name: 'Women Formal Blazer - Navy/L', sku: 'WFB-NV-L', currentStock: 2, reorderLevel: 8, branch: 'Fashion Kings' },
    { id: '4', name: 'Kids T-Shirt Pack - Multi/S', sku: 'KTS-MT-S', currentStock: 4, reorderLevel: 20, branch: 'Ahyan' },
  ];

  const getStockLevel = (current: number, reorder: number) => {
    const ratio = current / reorder;
    if (ratio <= 0.3) return 'critical';
    if (ratio <= 0.5) return 'warning';
    return 'low';
  };

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
          {lowStockItems.length} items
        </Badge>
      </div>

      <div className="space-y-3">
        {lowStockItems.map((item) => {
          const level = getStockLevel(item.currentStock, item.reorderLevel);
          return (
            <div
              key={item.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-muted/50',
                level === 'critical' && 'border-destructive/30 bg-destructive/5',
                level === 'warning' && 'border-warning/30 bg-warning/5',
                level === 'low' && 'border-border'
              )}
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
                <p className="text-sm font-medium truncate">{item.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{item.sku}</span>
                  <span>•</span>
                  <span>{item.branch}</span>
                </div>
              </div>
              <div className="text-right">
                <p className={cn(
                  'text-sm font-bold',
                  level === 'critical' && 'text-destructive',
                  level === 'warning' && 'text-warning',
                  level === 'low' && 'text-foreground'
                )}>
                  {item.currentStock}
                </p>
                <p className="text-xs text-muted-foreground">
                  / {item.reorderLevel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LowStockAlerts;
