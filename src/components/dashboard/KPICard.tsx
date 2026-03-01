import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  currency?: string;
 variant?: 'default' | 'success' | 'primary' | 'warning' | 'danger'; // إضافة المزيد
  precision?: number; // عدد الأرقام العشرية
  compact?: boolean; // نسخة مصغرة
  subtitle?: string; // نص فرعي تحت القيمة الرئيسية
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeLabel = 'vs last period',
  icon,
  currency,
  subtitle,
  variant = 'default',
}) => {
  const isPositive = change !== undefined && change > 0;
  const isNegative = change !== undefined && change < 0;
  const isNeutral = change === 0;

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;

  return (
    <div className={cn(
      'kpi-card group',
      variant === 'success' && 'border-success/20 hover:border-success/40',
      variant === 'primary' && 'border-primary/20 hover:border-primary/40'
    )}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {icon && (
          <div className={cn(
            'p-2 rounded-lg transition-colors',
            variant === 'success' && 'bg-success/10 text-success group-hover:bg-success/20',
            variant === 'primary' && 'bg-primary/10 text-primary group-hover:bg-primary/20',
            variant === 'default' && 'bg-muted text-muted-foreground group-hover:bg-muted/80'
          )}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        {currency && <span className="text-sm text-muted-foreground">{currency}</span>}
        <span className={cn(
          'text-2xl font-bold',
          variant === 'success' && 'text-gradient-success',
          variant === 'primary' && 'text-primary',
          variant === 'default' && 'text-foreground'
        )}>
          {typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : value}
        </span>
      </div>
      {subtitle && (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      )}

      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          <div className={cn(
            'flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
            isPositive && 'bg-success/10 text-success',
            isNegative && 'bg-destructive/10 text-destructive',
            isNeutral && 'bg-muted text-muted-foreground'
          )}>
            <TrendIcon size={12} />
            <span>{isPositive && '+'}{change}%</span>
          </div>
          <span className="text-xs text-muted-foreground">{changeLabel}</span>
        </div>
      )}
    </div>
  );
};

export default KPICard;
