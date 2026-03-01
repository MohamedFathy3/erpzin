  import React from 'react';
  import { useLanguage } from '@/contexts/LanguageContext';
  import { useQuery } from '@tanstack/react-query';
  import api from '@/lib/api';
  import { Badge } from '@/components/ui/badge';
  import { Avatar, AvatarFallback } from '@/components/ui/avatar';
  import { Skeleton } from '@/components/ui/skeleton';
  import { useNavigate } from 'react-router-dom';
  import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

  interface SalesInvoice {
    id: number;
    invoice_number: string;
    customer: {
      id: number;
      name: string;
    };
    total_amount: string;
    payment_method: string;
    created_at: string;
    branch: string;
  }

  interface SalesInvoiceResponse {
    data: SalesInvoice[];
  }

  const RecentTransactions: React.FC = () => {
    const { t, language } = useLanguage();
    const { formatCurrency } = useRegionalSettings();
    const navigate = useNavigate();

    const { data: transactions, isLoading } = useQuery({
      queryKey: ['recent-transactions'],
      queryFn: async () => {
        const response = await api.post<SalesInvoiceResponse>('/sales-invoices/index', {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 5,
          paginate: false
        });
        
        return response.data.data || [];
      },
    });

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
          {transactions && transactions.length > 0 ? (
            transactions.map((tx: SalesInvoice) => {
              const customerName = tx.customer?.name || (language === 'ar' ? 'عميل نقدي' : 'Walk-in Customer');
              
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                      {getInitials(customerName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{customerName}</p>
                      {getPaymentBadge(tx.payment_method)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{tx.invoice_number}</span>
                      <span>•</span>
                      <span>{formatTime(tx.created_at)}</span>
                      <span>•</span>
                      <span>{tx.branch}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">
                      {formatCurrency(Number(tx.total_amount))}
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

  export default RecentTransactions;