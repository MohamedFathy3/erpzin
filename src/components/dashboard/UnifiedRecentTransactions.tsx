// components/dashboard/UnifiedRecentTransactions.tsx
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNavigate } from 'react-router-dom';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { RecentTransaction } from '@/hooks/useDashboardData';

interface UnifiedRecentTransactionsProps {
  transactions: RecentTransaction[];
  isLoading?: boolean;
}

const UnifiedRecentTransactions: React.FC<UnifiedRecentTransactionsProps> = ({ 
  transactions, 
  isLoading = false 
}) => {
  const { t, language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const navigate = useNavigate();

  const getPaymentBadge = (method: string | null | undefined) => {
    const methodLower = method?.toLowerCase() || 'cash';
    switch (methodLower) {
      case 'cash':
        return <Badge variant="outline" className="text-success border-success/50 bg-success/5">{t('dashboard.cash')}</Badge>;
      case 'card':
        return <Badge variant="outline" className="text-info border-info/50 bg-info/5">{t('dashboard.card')}</Badge>;
      case 'wallet':
        return <Badge variant="outline" className="text-warning border-warning/50 bg-warning/5">{t('dashboard.wallet')}</Badge>;
      case 'bank_transfer':
        return <Badge variant="outline" className="text-primary border-primary/50 bg-primary/5">{t('dashboard.bankTransfer')}</Badge>;
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  const getTransactionTypeBadge = (type: 'sale' | 'purchase') => {
    if (type === 'sale') {
      return <Badge variant="outline" className="text-success border-success/50 bg-success/5">{t('dashboard.sale')}</Badge>;
    } else {
      return <Badge variant="outline" className="text-info border-info/50 bg-info/5">{t('dashboard.purchase')}</Badge>;
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDisplayName = (transaction: RecentTransaction): string => {
    if (transaction.type === 'sale') {
      return transaction.customer || (language === 'ar' ? 'عميل نقدي' : 'Walk-in Customer');
    } else {
      return transaction.supplier || (language === 'ar' ? 'مورد' : 'Supplier');
    }
  };

  if (isLoading) {
    return (
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          <div className="h-4 w-16 bg-muted animate-pulse rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-muted animate-pulse mb-1" />
                <div className="h-3 w-32 bg-muted animate-pulse" />
              </div>
              <div className="h-4 w-20 bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {t('dashboard.recentTransactions')}
        </h3>
        <button 
          onClick={() => navigate('/sales')}
          className="text-sm text-primary cursor-pointer hover:underline"
        >
          {t('dashboard.viewAll')}
        </button>
      </div>

      <div className="space-y-3">
        {transactions.length > 0 ? (
          transactions.map((tx) => {
            const displayName = getDisplayName(tx);
            
            return (
              <div
                key={tx.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => navigate(tx.type === 'sale' ? '/sales' : '/purchasing')}
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{displayName}</p>
                    {getTransactionTypeBadge(tx.type)}
                    {tx.type === 'sale' && tx.payment_method && getPaymentBadge(tx.payment_method)}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{tx.reference}</span>
                    <span>•</span>
                    <span>{formatTime(tx.date)}</span>
                    <span>•</span>
                    <span>{tx.branch}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(tx.amount)}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' ? 'لا توجد معاملات حديثة' : 'No recent transactions'}
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedRecentTransactions;