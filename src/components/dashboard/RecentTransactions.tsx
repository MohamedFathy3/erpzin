// components/dashboard/RecentTransactions.tsx
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

// واجهة موحدة للمعاملات (مبيعات ومشتريات)
interface Transaction {
  id: number;
  invoice_number: string;
  party_name: string; // اسم العميل أو المورد
  branch_name: string;
  payment_method: string;
  total_amount: number;
  created_at: string;
  type: 'sale' | 'purchase';
}

interface RecentTransactionsProps {
  transactions?: Transaction[];
  isLoading?: boolean;
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ 
  transactions = [], 
  isLoading = false 
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const navigate = useNavigate();

  // دالة الترجمة المحلية
  const t = (key: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        'dashboard.recentTransactions': 'Recent Transactions',
        'dashboard.viewAll': 'View All',
        'dashboard.sale': 'Sale',
        'dashboard.purchase': 'Purchase',
        'dashboard.cash': 'Cash',
        'dashboard.card': 'Card',
        'dashboard.wallet': 'Wallet',
        'dashboard.bankTransfer': 'Bank Transfer',
      },
      ar: {
        'dashboard.recentTransactions': 'أحدث المعاملات',
        'dashboard.viewAll': 'عرض الكل',
        'dashboard.sale': 'بيع',
        'dashboard.purchase': 'شراء',
        'dashboard.cash': 'كاش',
        'dashboard.card': 'بطاقة',
        'dashboard.wallet': 'محفظة',
        'dashboard.bankTransfer': 'تحويل بنكي',
      },
    };

    return translations[language]?.[key] || key;
  };

  const getPaymentBadge = (method: string | null) => {
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

  const getTypeBadge = (type: 'sale' | 'purchase') => {
    if (type === 'sale') {
      return (
        <Badge variant="outline" className="text-success border-success/50 bg-success/5">
          {t('dashboard.sale')}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-info border-info/50 bg-info/5">
        {t('dashboard.purchase')}
      </Badge>
    );
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return language === 'ar' ? 'عميل' : 'CU';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (isLoading) {
    return (
      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-4 w-20" />
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
          transactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
            >
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                  {getInitials(tx.party_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium truncate">{tx.party_name}</p>
                  {getTypeBadge(tx.type)}
                  {getPaymentBadge(tx.payment_method)}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{tx.invoice_number}</span>
                  <span>•</span>
                  <span>{formatDate(tx.created_at)}</span>
                  <span>•</span>
                  <span>{formatTime(tx.created_at)}</span>
                  <span>•</span>
                  <span>{tx.branch_name}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">
                  {formatCurrency(tx.total_amount)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' ? 'لا توجد معاملات حديثة' : 'No recent transactions'}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentTransactions;