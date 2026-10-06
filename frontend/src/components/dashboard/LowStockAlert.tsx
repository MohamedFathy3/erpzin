// components/dashboard/LowStockAlert.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Product } from '@/hooks/useDashboardData';

interface LowStockAlertProps {
  lowStockProducts: Product[];
}

const LowStockAlert: React.FC<LowStockAlertProps> = ({ lowStockProducts }) => {
  const { language, t } = useLanguage();

  if (lowStockProducts.length === 0) return null;

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="h-12 w-12 rounded-full bg-warning/20 flex items-center justify-center">
          <AlertTriangle className="text-warning" size={24} />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">
            {t('dashboard.lowStock')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {lowStockProducts.length} {language === 'ar' ? 'منتج يحتاج إعادة طلب' : 'products need reordering'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default LowStockAlert;