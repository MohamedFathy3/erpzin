import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Banknote, CreditCard, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  onComplete: (payments: { cash: number; card: number }) => void;
}

const POSPaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  total,
  onComplete
}) => {
  const { language } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'split'>('cash');
  const [cashAmount, setCashAmount] = useState<string>(total.toString());
  const [cardAmount, setCardAmount] = useState<string>('0');
  const [isProcessing, setIsProcessing] = useState(false);

  const quickAmounts = [1000, 2000, 5000, 10000, 20000, 50000];

  const handleQuickAmount = (amount: number) => {
    if (paymentMethod === 'split') {
      setCashAmount(amount.toString());
      setCardAmount((total - amount).toString());
    } else {
      setCashAmount(amount.toString());
    }
  };

  const calculateChange = () => {
    const cash = parseFloat(cashAmount) || 0;
    const card = parseFloat(cardAmount) || 0;
    if (paymentMethod === 'split') {
      return cash + card - total;
    }
    return paymentMethod === 'cash' ? cash - total : 0;
  };

  const canComplete = () => {
    const cash = parseFloat(cashAmount) || 0;
    const card = parseFloat(cardAmount) || 0;
    
    if (paymentMethod === 'cash') return cash >= total;
    if (paymentMethod === 'card') return true;
    if (paymentMethod === 'split') return cash + card >= total;
    return false;
  };

  const handleComplete = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const cash = paymentMethod === 'card' ? 0 : parseFloat(cashAmount) || 0;
      const card = paymentMethod === 'cash' ? 0 : paymentMethod === 'card' ? total : parseFloat(cardAmount) || 0;
      onComplete({ cash, card });
      setIsProcessing(false);
    }, 1000);
  };

  if (!isOpen) return null;

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
          <div className="flex gap-2 mb-6">
            {[
              { id: 'cash', icon: <Banknote size={20} />, label: language === 'ar' ? 'نقدي' : 'Cash' },
              { id: 'card', icon: <CreditCard size={20} />, label: language === 'ar' ? 'شبكة' : 'Card' },
              { id: 'split', icon: <span className="text-sm font-bold">½</span>, label: language === 'ar' ? 'تقسيم' : 'Split' }
            ].map((method) => (
              <button
                key={method.id}
                onClick={() => setPaymentMethod(method.id as 'cash' | 'card' | 'split')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all',
                  paymentMethod === method.id
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {method.icon}
                {method.label}
              </button>
            ))}
          </div>

          {/* Payment Inputs */}
          {paymentMethod === 'cash' && (
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
                {quickAmounts.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => handleQuickAmount(amount)}
                    className="py-3 bg-muted hover:bg-muted/80 rounded-lg font-medium text-foreground transition-colors"
                  >
                    {amount.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="text-center py-8">
              <CreditCard size={64} className="mx-auto text-primary mb-4" />
              <p className="text-muted-foreground">
                {language === 'ar' ? 'جاهز لاستلام الدفع عبر الشبكة' : 'Ready to receive card payment'}
              </p>
            </div>
          )}

          {paymentMethod === 'split' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Banknote size={16} />
                    {language === 'ar' ? 'نقدي' : 'Cash'}
                  </label>
                  <Input
                    type="number"
                    value={cashAmount}
                    onChange={(e) => {
                      setCashAmount(e.target.value);
                      const remaining = total - (parseFloat(e.target.value) || 0);
                      setCardAmount(Math.max(0, remaining).toString());
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
                    value={cardAmount}
                    onChange={(e) => {
                      setCardAmount(e.target.value);
                      const remaining = total - (parseFloat(e.target.value) || 0);
                      setCashAmount(Math.max(0, remaining).toString());
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
          )}

          {/* Change Display */}
          {paymentMethod !== 'card' && calculateChange() > 0 && (
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
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default POSPaymentModal;
