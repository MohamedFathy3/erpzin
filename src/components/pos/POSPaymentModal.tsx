import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Banknote, CreditCard, Check, Smartphone, Building2, Wallet, Crown, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePOSKeyboardShortcuts, getPaymentShortcuts } from '@/hooks/usePOSKeyboardShortcuts';

type PaymentMethodType = 'cash' | 'card' | 'kuraimi' | 'floosak' | 'jawal' | 'bank_transfer' | 'split';

interface PaymentMethod {
  id: PaymentMethodType;
  icon: React.ReactNode;
  label: string;
  labelAr: string;
  color: string;
  shortcut: string;
}

const paymentMethods: PaymentMethod[] = [
  { id: 'cash', icon: <Banknote size={20} />, label: 'Cash', labelAr: 'نقدي', color: 'bg-success', shortcut: 'F1' },
  { id: 'card', icon: <CreditCard size={20} />, label: 'Card', labelAr: 'شبكة', color: 'bg-blue-500', shortcut: 'F2' },
  { id: 'kuraimi', icon: <Smartphone size={20} />, label: 'Kuraimi', labelAr: 'كريمي', color: 'bg-orange-500', shortcut: 'F3' },
  { id: 'floosak', icon: <Wallet size={20} />, label: 'Floosak', labelAr: 'فلوسك', color: 'bg-purple-500', shortcut: 'F4' },
  { id: 'jawal', icon: <Smartphone size={20} />, label: 'Jawal Pay', labelAr: 'جوال باي', color: 'bg-green-600', shortcut: 'F5' },
  { id: 'bank_transfer', icon: <Building2 size={20} />, label: 'Bank Transfer', labelAr: 'تحويل بنكي', color: 'bg-slate-600', shortcut: 'F6' },
  { id: 'split', icon: <span className="text-sm font-bold">½</span>, label: 'Split', labelAr: 'تقسيم', color: 'bg-primary', shortcut: 'F7' },
];

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onComplete: (payments: { method: string; amount: number }[]) => void;
  customer?: { id: string; name: string; loyalty_points?: number | null } | null;
  deliveryPerson?: { id: string; name: string } | null;
}

const POSPaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  onComplete,
  customer,
  deliveryPerson
}) => {
  const { language } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [cashAmount, setCashAmount] = useState<string>(total.toString());
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({
    cash: '',
    card: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

  useEffect(() => {
    setCashAmount(total.toString());
    setSplitAmounts({ cash: '', card: '' });
  }, [total, isOpen]);

  const handleQuickAmount = (amount: number) => {
    if (paymentMethod === 'split') {
      setSplitAmounts(prev => ({
        ...prev,
        cash: amount.toString(),
        card: Math.max(0, total - amount).toString()
      }));
    } else {
      setCashAmount(amount.toString());
    }
  };

  const calculateChange = () => {
    const cash = parseFloat(cashAmount) || 0;
    if (paymentMethod === 'split') {
      const totalPaid = Object.values(splitAmounts).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
      return totalPaid - total;
    }
    return paymentMethod === 'cash' ? cash - total : 0;
  };

  const canComplete = () => {
    const cash = parseFloat(cashAmount) || 0;
    
    if (paymentMethod === 'cash') return cash >= total;
    if (paymentMethod === 'split') {
      const totalPaid = Object.values(splitAmounts).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
      return totalPaid >= total;
    }
    return true; // For electronic payments
  };

  const handleComplete = () => {
    setIsProcessing(true);
    setTimeout(() => {
      let payments: { method: string; amount: number }[] = [];
      
      if (paymentMethod === 'split') {
        Object.entries(splitAmounts).forEach(([method, amount]) => {
          const numAmount = parseFloat(amount) || 0;
          if (numAmount > 0) {
            payments.push({ method, amount: numAmount });
          }
        });
      } else if (paymentMethod === 'cash') {
        payments = [{ method: 'cash', amount: parseFloat(cashAmount) || total }];
      } else {
        payments = [{ method: paymentMethod, amount: total }];
      }
      
      onComplete(payments);
      setIsProcessing(false);
    }, 1000);
  };

  if (!isOpen) return null;

  // Payment modal keyboard shortcuts
  const paymentShortcuts = getPaymentShortcuts({
    onConfirm: () => canComplete() && !isProcessing && handleComplete(),
    onCancel: onClose,
    onSelectCash: () => setPaymentMethod('cash'),
    onSelectCard: () => setPaymentMethod('card'),
    onSelectKuraimi: () => setPaymentMethod('kuraimi'),
    onSelectFloosak: () => setPaymentMethod('floosak'),
    onSelectJawal: () => setPaymentMethod('jawal'),
    onSelectBank: () => setPaymentMethod('bank_transfer'),
    onSelectSplit: () => setPaymentMethod('split'),
    onQuickAmount1: () => handleQuickAmount(quickAmounts[0]),
    onQuickAmount2: () => handleQuickAmount(quickAmounts[1]),
    onQuickAmount3: () => handleQuickAmount(quickAmounts[2]),
    onQuickAmount4: () => handleQuickAmount(quickAmounts[3]),
    onQuickAmount5: () => handleQuickAmount(quickAmounts[4]),
    onQuickAmount6: () => handleQuickAmount(quickAmounts[5]),
  });

  usePOSKeyboardShortcuts(paymentShortcuts, isOpen);

  const renderPaymentContent = () => {
    if (paymentMethod === 'cash') {
      return (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {language === 'ar' ? 'المبلغ المستلم' : 'Amount Received'}
            </label>
            <Input
              type="number"
              value={cashAmount}
              onChange={(e) => setCashAmount(e.target.value)}
              className="text-2xl font-bold h-14 text-center"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.map((amount, index) => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                className="py-3 bg-muted hover:bg-muted/80 rounded-lg font-medium text-foreground transition-colors relative"
              >
                {amount.toLocaleString()}
                <span className="absolute top-1 end-1 text-[9px] text-muted-foreground font-mono">
                  Alt+{index + 1}
                </span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (paymentMethod === 'split') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <Banknote size={16} />
                {language === 'ar' ? 'نقدي' : 'Cash'}
              </label>
              <Input
                type="number"
                value={splitAmounts.cash}
                onChange={(e) => {
                  setSplitAmounts(prev => ({
                    ...prev,
                    cash: e.target.value,
                    card: Math.max(0, total - (parseFloat(e.target.value) || 0)).toString()
                  }));
                }}
                className="text-xl font-bold h-12 text-center"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <CreditCard size={16} />
                {language === 'ar' ? 'شبكة' : 'Card'}
              </label>
              <Input
                type="number"
                value={splitAmounts.card}
                onChange={(e) => {
                  setSplitAmounts(prev => ({
                    ...prev,
                    card: e.target.value,
                    cash: Math.max(0, total - (parseFloat(e.target.value) || 0)).toString()
                  }));
                }}
                className="text-xl font-bold h-12 text-center"
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {quickAmounts.slice(0, 3).map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                className="py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium text-foreground transition-colors"
              >
                {language === 'ar' ? 'نقدي' : 'Cash'}: {amount.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Electronic payment methods
    const method = paymentMethods.find(m => m.id === paymentMethod);
    return (
      <div className="text-center py-8">
        <div className={cn('w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-white', method?.color)}>
          {method?.icon}
        </div>
        <p className="text-lg font-medium text-foreground mb-2">
          {language === 'ar' ? method?.labelAr : method?.label}
        </p>
        <p className="text-muted-foreground">
          {language === 'ar' 
            ? `جاهز لاستلام الدفع عبر ${method?.labelAr}`
            : `Ready to receive ${method?.label} payment`
          }
        </p>
        <p className="text-3xl font-bold text-primary mt-4">
          {total.toLocaleString()} YER
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h2 className="text-xl font-bold text-foreground">
            {language === 'ar' ? 'الدفع' : 'Payment'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {/* Customer & Delivery Info */}
          {(customer || deliveryPerson) && (
            <div className="flex gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
              {customer && (
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'العميل' : 'Customer'}</p>
                  <p className="font-medium text-foreground">{customer.name}</p>
                  {(customer.loyalty_points || 0) > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <Crown size={12} className="text-warning" />
                      <Star size={10} className="text-warning fill-warning" />
                      <span className="text-warning font-semibold text-xs">{customer.loyalty_points}</span>
                      <span className="text-warning/70 text-xs">{language === 'ar' ? 'نقطة' : 'pts'}</span>
                    </div>
                  )}
                  {/* Points to be earned */}
                  <div className="text-xs text-success mt-1">
                    +{Math.floor(total / 1000)} {language === 'ar' ? 'نقطة جديدة' : 'new pts'}
                  </div>
                </div>
              )}
              {deliveryPerson && (
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">{language === 'ar' ? 'مندوب التوصيل' : 'Delivery'}</p>
                  <p className="font-medium text-foreground">{deliveryPerson.name}</p>
                </div>
              )}
            </div>
          )}

          {/* Total Display */}
          <div className="text-center mb-6">
            <p className="text-muted-foreground text-sm mb-1">
              {language === 'ar' ? 'المبلغ المطلوب' : 'Amount Due'}
            </p>
            <p className="text-4xl font-bold text-primary">
              {total.toLocaleString()} <span className="text-lg">YER</span>
            </p>
          </div>

          {/* Payment Method Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                title={method.shortcut}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all text-sm relative',
                  paymentMethod === method.id
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {method.icon}
                {language === 'ar' ? method.labelAr : method.label}
                <span className="absolute -top-1 -end-1 text-[10px] px-1 bg-background border border-border rounded text-muted-foreground font-mono">
                  {method.shortcut}
                </span>
              </button>
            ))}
          </div>

          {/* Payment Content */}
          {renderPaymentContent()}

          {/* Change Display */}
          {paymentMethod === 'cash' && calculateChange() > 0 && (
            <div className="mt-6 p-4 bg-success/10 rounded-xl text-center">
              <p className="text-sm text-success mb-1">
                {language === 'ar' ? 'الباقي' : 'Change'}
              </p>
              <p className="text-2xl font-bold text-success">
                {calculateChange().toLocaleString()} YER
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/30">
          <Button
            onClick={handleComplete}
            disabled={!canComplete() || isProcessing}
            className={cn(
              'w-full h-14 text-lg font-bold',
              'bg-gradient-to-r from-success to-success-light hover:opacity-90 text-white'
            )}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Check size={24} />
                {language === 'ar' ? 'إتمام الدفع' : 'Complete Payment'}
                <kbd className="ms-2 px-2 py-0.5 bg-white/20 rounded text-xs font-mono">Ctrl+Enter</kbd>
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default POSPaymentModal;
