import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface Transaction {
  id: string;
  invoiceNo: string;
  customer: string;
  amount: number;
  items: number;
  time: string;
  paymentMethod: 'cash' | 'card' | 'split';
  branch: string;
}

const RecentTransactions: React.FC = () => {
  const { t } = useLanguage();

  const transactions: Transaction[] = [
    { id: '1', invoiceNo: 'INV-2024-1234', customer: 'Ahmed Mohammed', amount: 15500, items: 3, time: '10:45 AM', paymentMethod: 'cash', branch: 'Abra' },
    { id: '2', invoiceNo: 'INV-2024-1235', customer: 'Sara Ali', amount: 8200, items: 2, time: '10:32 AM', paymentMethod: 'card', branch: 'Primark' },
    { id: '3', invoiceNo: 'INV-2024-1236', customer: 'Omar Hassan', amount: 22750, items: 5, time: '10:15 AM', paymentMethod: 'split', branch: 'Fashion Kings' },
    { id: '4', invoiceNo: 'INV-2024-1237', customer: 'Fatima Khalid', amount: 5400, items: 1, time: '09:58 AM', paymentMethod: 'cash', branch: 'Ahyan' },
    { id: '5', invoiceNo: 'INV-2024-1238', customer: 'Yusuf Ibrahim', amount: 18900, items: 4, time: '09:42 AM', paymentMethod: 'card', branch: 'Abra' },
  ];

  const getPaymentBadge = (method: string) => {
    switch (method) {
      case 'cash':
        return <Badge variant="outline" className="text-success border-success/50 bg-success/5">Cash</Badge>;
      case 'card':
        return <Badge variant="outline" className="text-info border-info/50 bg-info/5">Card</Badge>;
      case 'split':
        return <Badge variant="outline" className="text-warning border-warning/50 bg-warning/5">Split</Badge>;
      default:
        return null;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="card-elevated p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">
          {t('dashboard.recentTransactions')}
        </h3>
        <span className="text-sm text-primary cursor-pointer hover:underline">
          View all
        </span>
      </div>

      <div className="space-y-3">
        {transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
          >
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                {getInitials(tx.customer)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{tx.customer}</p>
                {getPaymentBadge(tx.paymentMethod)}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{tx.invoiceNo}</span>
                <span>•</span>
                <span>{tx.items} items</span>
                <span>•</span>
                <span>{tx.branch}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">
                {tx.amount.toLocaleString()} <span className="text-xs text-muted-foreground">YER</span>
              </p>
              <p className="text-xs text-muted-foreground">{tx.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentTransactions;
