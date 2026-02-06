import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Banknote, CreditCard, Check, Wallet, Crown, Star, Split } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePOSKeyboardShortcuts, getPaymentShortcuts } from '@/hooks/usePOSKeyboardShortcuts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
type PaymentMethodType = 'cash' | 'card' | 'wallet' | 'split';

interface PaymentMethod {
  id: PaymentMethodType;
  icon: React.ReactNode;
  label: string;
  labelAr: string;
  color: string;
  shortcut: string;
}

const defaultPaymentMethods: PaymentMethod[] = [
  { id: 'cash', icon: <Banknote size={20} />, label: 'Cash', labelAr: 'نقدي', color: 'bg-success', shortcut: 'F1' },
  { id: 'card', icon: <CreditCard size={20} />, label: 'Card', labelAr: 'شبكة', color: 'bg-blue-500', shortcut: 'F2' },
  { id: 'wallet', icon: <Wallet size={20} />, label: 'Wallet', labelAr: 'محفظة', color: 'bg-purple-500', shortcut: 'F3' },
  { id: 'split', icon: <Split size={20} />, label: 'Split', labelAr: 'تقسيم', color: 'bg-primary', shortcut: 'F4' },
];

interface CartItem {
  id: string;
  variantId?: string;
  name: string;
  nameAr: string;
  price: number;
  quantity: number;
  sku: string;
  sizeName?: string;
  colorName?: string;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  tax: number;
  cartItems: CartItem[];
  onComplete: (payments: { method: string; amount: number }[]) => void;
  customer?: { id: string; name: string; loyalty_points?: number | null } | null;
  deliveryPerson?: { id: string; name: string } | null;
  shiftId?: string | null;
  branchId?: string | null;
}

const POSPaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  subtotal,
  tax,
  cartItems,
  onComplete,
  customer,
  deliveryPerson,
  shiftId,
  branchId
}) => {
  const { language } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [cashAmount, setCashAmount] = useState<string>(total.toString());
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({
    cash: '',
    card: '',
    wallet: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch payment methods from settings
  const { data: dbPaymentMethods = [] } = useQuery({
    queryKey: ['payment-methods-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return data;
    }
  });

  // Map database payment methods to component format - only cash, card, wallet
  const paymentMethods: PaymentMethod[] = React.useMemo(() => {
    const methods: PaymentMethod[] = [];

    // Find cash method
    const cashMethod = dbPaymentMethods.find(m => m.code === 'cash' || m.type === 'cash');
    if (cashMethod) {
      methods.push({
        id: 'cash',
        icon: <Banknote size={20} />,
        label: cashMethod.name,
        labelAr: cashMethod.name_ar,
        color: 'bg-success',
        shortcut: 'F1'
      });
    } else {
      methods.push(defaultPaymentMethods[0]);
    }

    // Find card method
    const cardMethod = dbPaymentMethods.find(m => m.code === 'card' || m.type === 'card');
    if (cardMethod) {
      methods.push({
        id: 'card',
        icon: <CreditCard size={20} />,
        label: cardMethod.name,
        labelAr: cardMethod.name_ar,
        color: 'bg-blue-500',
        shortcut: 'F2'
      });
    } else {
      methods.push(defaultPaymentMethods[1]);
    }

    // Find wallet method
    const walletMethod = dbPaymentMethods.find(m => m.code === 'wallet' || m.type === 'wallet' || m.code === 'mobile_wallet');
    if (walletMethod) {
      methods.push({
        id: 'wallet',
        icon: <Wallet size={20} />,
        label: walletMethod.name,
        labelAr: walletMethod.name_ar,
        color: 'bg-purple-500',
        shortcut: 'F3'
      });
    } else {
      methods.push(defaultPaymentMethods[2]);
    }

    // Add split option
    methods.push({
      id: 'split',
      icon: <Split size={20} />,
      label: 'Split',
      labelAr: 'تقسيم',
      color: 'bg-primary',
      shortcut: 'F4'
    });

    return methods;
  }, [dbPaymentMethods]);

  const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

  useEffect(() => {
    setCashAmount(total.toString());
    setSplitAmounts({ cash: '', card: '', wallet: '' });
  }, [total, isOpen]);

  const handleQuickAmount = (amount: number) => {
    if (paymentMethod === 'split') {
      setSplitAmounts(prev => ({
        ...prev,
        cash: amount.toString()
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

  const handleComplete = async () => {
    // Check if customer is selected
    if (!customer?.id) {
      toast.error(language === 'ar' ? 'يجب اختيار عميل قبل إتمام الدفع' : 'Customer must be selected before completing payment');
      return;
    }

    setIsProcessing(true);
    try {
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

      // Filter out payments with zero amounts
      payments = payments.filter(payment => payment.amount > 0);

      // Prepare invoice data according to the required format
      const invoiceData = {
        customer_id: parseInt(customer.id),
        items: cartItems.map(item => ({
          product_id: parseInt(item.id),
          quantity: item.quantity,
          price: item.price,
          color: item.colorName || null,
          size: item.sizeName || null
        })),
        payments: payments
      };

      // Send invoice to API
      const response = await fetch('/api/invoice/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create invoice');
      }

      const result = await response.json();

      toast.success(language === 'ar' ? 'تم حفظ الفاتورة بنجاح' : 'Invoice saved successfully');
      onComplete(payments);
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error(language === 'ar' ? 'فشل في حفظ الفاتورة' : 'Failed to save invoice');
    } finally {
      setIsProcessing(false);
    }
  };

  // Payment modal keyboard shortcuts
  const paymentShortcuts = getPaymentShortcuts({
    onConfirm: () => canComplete() && !isProcessing && handleComplete(),
    onCancel: onClose,
    onSelectCash: () => setPaymentMethod('cash'),
    onSelectCard: () => setPaymentMethod('card'),
    onSelectKuraimi: () => setPaymentMethod('wallet'),
    onSelectFloosak: () => { },
    onSelectJawal: () => { },
    onSelectBank: () => { },
    onSelectSplit: () => setPaymentMethod('split'),
    onQuickAmount1: () => handleQuickAmount(quickAmounts[0]),
    onQuickAmount2: () => handleQuickAmount(quickAmounts[1]),
    onQuickAmount3: () => handleQuickAmount(quickAmounts[2]),
    onQuickAmount4: () => handleQuickAmount(quickAmounts[3]),
    onQuickAmount5: () => handleQuickAmount(quickAmounts[4]),
    onQuickAmount6: () => handleQuickAmount(quickAmounts[5]),
  });

  usePOSKeyboardShortcuts(paymentShortcuts, isOpen);

  if (!isOpen) return null;

  const getSplitRemaining = () => {
    const totalPaid = Object.values(splitAmounts).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
    return Math.max(0, total - totalPaid);
  };

  const handleSplitInputChange = (method: string, value: string) => {
    setSplitAmounts(prev => ({
      ...prev,
      [method]: value
    }));
  };

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
          {/* Split remaining indicator */}
          <div className={cn(
            "p-3 rounded-lg text-center",
            getSplitRemaining() > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
          )}>
            <p className="text-sm mb-1">
              {language === 'ar' ? 'المتبقي للتقسيم' : 'Remaining to split'}
            </p>
            <p className="text-xl font-bold">{getSplitRemaining().toLocaleString()} YER</p>
          </div>

          {/* Split inputs for all 3 methods */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <Banknote size={16} className="text-success" />
                {language === 'ar' ? 'نقدي' : 'Cash'}
              </label>
              <Input
                type="number"
                value={splitAmounts.cash}
                onChange={(e) => handleSplitInputChange('cash', e.target.value)}
                placeholder="0"
                className="text-lg font-bold h-12 text-center"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <CreditCard size={16} className="text-blue-500" />
                {language === 'ar' ? 'شبكة' : 'Card'}
              </label>
              <Input
                type="number"
                value={splitAmounts.card}
                onChange={(e) => handleSplitInputChange('card', e.target.value)}
                placeholder="0"
                className="text-lg font-bold h-12 text-center"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <Wallet size={16} className="text-purple-500" />
                {language === 'ar' ? 'محفظة' : 'Wallet'}
              </label>
              <Input
                type="number"
                value={splitAmounts.wallet}
                onChange={(e) => handleSplitInputChange('wallet', e.target.value)}
                placeholder="0"
                className="text-lg font-bold h-12 text-center"
              />
            </div>
          </div>

          {/* Quick fill buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSplitAmounts({ cash: total.toString(), card: '', wallet: '' })}
            >
              {language === 'ar' ? 'كل نقدي' : 'All Cash'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSplitAmounts({ cash: '', card: total.toString(), wallet: '' })}
            >
              {language === 'ar' ? 'كل شبكة' : 'All Card'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSplitAmounts({ cash: '', card: '', wallet: total.toString() })}
            >
              {language === 'ar' ? 'كل محفظة' : 'All Wallet'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSplitAmounts({
                cash: Math.floor(total / 2).toString(),
                card: (total - Math.floor(total / 2)).toString(),
                wallet: ''
              })}
            >
              {language === 'ar' ? 'نصفين' : '50/50'}
            </Button>
          </div>
        </div>
      );
    }

    // Electronic payment methods (card or wallet)
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

          {/* Payment Method Tabs - Only 3 methods + split */}
          <div className="flex gap-2 mb-6 justify-center">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                title={method.shortcut}
                className={cn(
                  'flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-medium transition-all text-sm relative flex-1 max-w-[140px]',
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
          {(paymentMethod === 'cash' || paymentMethod === 'split') && calculateChange() > 0 && (
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
