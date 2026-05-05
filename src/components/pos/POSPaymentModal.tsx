/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import InvoiceTemplate from './InvoiceTemplate';
import { Banknote, Check, CreditCard, Crown, Split, Star, Wallet, WifiOff, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { saveOrderOffline } from '@/lib/offlineDB';
import { toast } from '@/hooks/use-toast';
import { getPaymentShortcuts, usePOSKeyboardShortcuts } from '@/hooks/usePOSKeyboardShortcuts';
import { Input } from '../ui/input';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useCurrencyTax } from '@/hooks/useCurrencyTax';

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
  { id: 'cash', icon: <Banknote size={20} />, label: 'Cash', labelAr: 'نقدي', color: 'bg-success', shortcut: 'ctrl+1' },
  { id: 'card', icon: <CreditCard size={20} />, label: 'Card', labelAr: 'شبكة', color: 'bg-blue-500', shortcut: 'ctrl+2' },
  { id: 'wallet', icon: <Wallet size={20} />, label: 'Wallet', labelAr: 'محفظة', color: 'bg-purple-500', shortcut: 'ctrl+3' },
    { id: 'split', icon: <Split size={20} />, label: 'Split', labelAr: 'تقسيم', color: 'bg-indigo-500', shortcut: 'ctrl+4' },

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
  discount_percentage?: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  tax: number;
  cartItems: CartItem[];
  onComplete: (payments: { method: string; amount: number }[]) => void;
  customer?: { id: string; name: string; name_ar?: string; phone?: string; loyalty_points?: number | null } | null;
  deliveryPerson?: { id: string; name: string; phone?: string } | null;
  shiftId?: string | null;
  branchId?: string | null;
  salesRepresentative?: { id: string | number; name: string; commission_rate?: string } | null;
  branchName?: string | null;
  branchNameAr?: string | null;
  branchPhone?: string | null;
  branchAddress?: string | null;
  branchAddressAr?: string | null;
  invoiceDiscountPercentage?: number;
  invoiceDiscountAmount?: number;
  companyInfo: {
    name: string;
    nameAr?: string;
    logo?: string;
    address?: string | null;
    addressAr?: string | null;
    phone?: string | null;
    email?: string;
    tax_id?: string | null;
    commercial_register?: string | null;
    website?: string | null;
    currency?: string | null;
  };
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
  branchId,
  salesRepresentative,
  branchName,
  branchNameAr,
  branchPhone,
  branchAddress,
  branchAddressAr,
  invoiceDiscountPercentage = 0,
  invoiceDiscountAmount = 0,
  companyInfo,
}) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [cashAmount, setCashAmount] = useState<string>(total.toString());
  const [splitAmounts, setSplitAmounts] = useState<Record<string, string>>({
    cash: '',
    card: '',
    wallet: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [completedInvoice, setCompletedInvoice] = useState<any>(null);
  const { formatCurrency } = useRegionalSettings();

  const invoiceRef = useRef<HTMLDivElement>(null);

  const { activeTaxRates } = useCurrencyTax();
  const defaultTax = activeTaxRates?.find(t => t.default === true) || activeTaxRates?.[0];

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `فاتورة-${Date.now()}`,
    onAfterPrint: () => {
      setShowPrintOptions(false);
      setCompletedInvoice(null);
      onComplete(completedInvoice?.payments || []);
    },
  });

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const paymentMethods: PaymentMethod[] = defaultPaymentMethods;
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
    return true;
  };

  const calculateTotalDiscountPercentage = (): number => {
    if (!cartItems.length) return 0;
    
    const originalTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const afterItemDiscount = cartItems.reduce((sum, item) => {
      const itemOriginal = item.price * item.quantity;
      const itemDiscountPercent = (item.discount_percentage || 0) / 100;
      return sum + (itemOriginal * (1 - itemDiscountPercent));
    }, 0);
    
    const finalTotal = afterItemDiscount * (1 - (invoiceDiscountPercentage / 100));
    
    const totalDiscountAmount = originalTotal - finalTotal;
    const totalDiscountPercentage = originalTotal > 0 ? (totalDiscountAmount / originalTotal) * 100 : 0;
    
    return Math.round(totalDiscountPercentage * 100) / 100;
  };

  const getOriginalTotal = (): number => {
    return cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSaveAndPrint = async (type: 'save' | 'print' | 'both') => {
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

    payments = payments.filter(payment => payment.amount > 0);

    const totalDiscountPercentage = calculateTotalDiscountPercentage();
    const originalTotal = getOriginalTotal();
    const totalDiscountAmount = originalTotal - total;

    setIsProcessing(true);
    try {
      const invoiceData = {
        customer_id: parseInt(String(customer?.id)) || 1,
        sales_representative_id: salesRepresentative ? parseInt(String(salesRepresentative.id)) : null,
        items: cartItems.map(item => ({
          product_id: parseInt(item.id),
          quantity: item.quantity,
          price: item.price,
          color: item.colorName || null,
          size: item.sizeName || null,
          discount_amount: totalDiscountAmount  // قيمة الخصم الإجمالية (اختياري)
        })),
        discount_percentage: totalDiscountPercentage,  // ✅ نسبة الخصم الكلية (خارج items)
        payments: payments,
        subtotal: subtotal,
        tax: tax,
        total: total,
        shift_id: shiftId,
        branch_id: branchId,
        delivery_id: parseInt(String(deliveryPerson?.id)) || null,
      };

      let invoiceId = '';
      let success = false;

      if (isOffline) {
        const offlineId = await saveOrderOffline({
          items: cartItems,
          subtotal,
          tax,
          total,
          customer_id: customer?.id,
          delivery_id: deliveryPerson?.id,
          payment_method: paymentMethod,
          payments
        });

        if (offlineId) {
          invoiceId = offlineId;
          success = true;
          toast({
            title: language === 'ar' ? 'نجاح' : 'Success',
            description: language === 'ar'
              ? 'تم حفظ الفاتورة محلياً. سيتم مزامنتها لاحقاً'
              : 'Invoice saved locally. Will sync later',
          });
        } else {
          throw new Error('Failed to save offline');
        }
      } else {
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
        invoiceId = result.data?.id || `INV-${Date.now()}`;
        success = true;
        toast({
          title: language === 'ar' ? 'نجاح' : 'Success',
          description: language === 'ar' ? 'تم حفظ الفاتورة بنجاح' : 'Invoice saved successfully',
        });
      }

      if (success) {
        const printData = {
          id: String(invoiceId),
          date: new Date().toISOString(),
          cashierName: user?.name,
          branchName: branchName || companyInfo?.name,
          branchPhone: branchPhone || companyInfo?.phone,
          branchAddress: isRTL
            ? branchAddressAr || branchAddress || companyInfo?.addressAr || companyInfo?.address
            : branchAddress || companyInfo?.address,
          customer: customer ? {
            name: customer.name,
            nameAr: customer.name_ar || customer.name,
            phone: customer.phone
          } : null,
          salesRep: salesRepresentative ? {
            name: salesRepresentative.name,
            nameAr: salesRepresentative.name,
            commission_rate: salesRepresentative.commission_rate
          } : null,
          deliveryPerson: deliveryPerson ? {
            name: deliveryPerson.name,
            nameAr: deliveryPerson.name,
            phone: deliveryPerson.phone
          } : null,
          items: cartItems.map(item => ({
            name: item.name,
            nameAr: item.nameAr || item.name,
            quantity: item.quantity,
            price: item.price,
            sizeName: item.sizeName,
            sizeNameAr: item.sizeName,
            colorName: item.colorName,
            colorNameAr: item.colorName,
            // لا نضع discount_percentage هنا لأنه شامل
          })),
          subtotal: subtotal,
          tax: tax,
          taxRate: defaultTax?.rate || 0,
          total: total,
          payments: payments,
          change: calculateChange(),
          totalDiscountPercentage: totalDiscountPercentage,   // ✅ نسبة الخصم الكلية
          totalDiscountAmount: totalDiscountAmount,          // ✅ قيمة الخصم الكلية
          invoiceDiscountPercentage: invoiceDiscountPercentage,
        };

        setCompletedInvoice({ payments, printData });

        if (type === 'save') {
          onComplete(payments);
        } else if (type === 'print') {
          handlePrint();
        } else if (type === 'both') {
          setShowPrintOptions(true);
          setTimeout(() => {
            handlePrint();
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في حفظ الفاتورة' : 'Failed to save invoice',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = () => handleSaveAndPrint('save');
  const handleSaveAndPrintNow = () => handleSaveAndPrint('both');

  const paymentShortcuts = getPaymentShortcuts({
    onConfirm: () => canComplete() && !isProcessing && handleComplete(),
    onCancel: onClose,
    onSaveOnly: () => canComplete() && !isProcessing && handleComplete(),
    onSaveAndPrint: () => canComplete() && !isProcessing && handleSaveAndPrintNow(),
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
          <div className={cn(
            "p-3 rounded-lg text-center",
            getSplitRemaining() > 0 ? "bg-warning/10 text-warning" : "bg-success/10 text-success"
          )}>
            <p className="text-sm mb-1">
              {language === 'ar' ? 'المتبقي للتقسيم' : 'Remaining to split'}
            </p>
            <p className="text-xl font-bold">{formatCurrency(getSplitRemaining())}</p>
          </div>

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
        </div>
      );
    }

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
          {formatCurrency(total)}
        </p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl mx-4 bg-card rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground">
              {language === 'ar' ? 'الدفع' : 'Payment'}
            </h2>
            {isOffline && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-xs">
                <WifiOff size={12} />
                <span>{language === 'ar' ? 'بدون نت' : 'Offline'}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
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

          {isOffline && (
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-amber-600" />
              <p className="text-sm text-amber-600">
                {language === 'ar'
                  ? 'أنت في وضع عدم الاتصال. سيتم حفظ الفاتورة محلياً ومزامنتها لاحقاً.'
                  : 'You are offline. The invoice will be saved locally and synced later.'}
              </p>
            </div>
          )}

          <div className="text-center mb-6">
            <p className="text-muted-foreground text-sm mb-1">
              {language === 'ar' ? 'المبلغ المطلوب' : 'Amount Due'}
            </p>
            <p className="text-4xl font-bold text-primary">
              {total.toLocaleString()} <span className="text-lg"></span>
            </p>
          </div>

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

          {renderPaymentContent()}

          {(paymentMethod === 'cash' || paymentMethod === 'split') && calculateChange() > 0 && (
            <div className="mt-6 p-4 bg-success/10 rounded-xl text-center">
              <p className="text-sm text-success mb-1">
                {language === 'ar' ? 'الباقي' : 'Change'}
              </p>
              <p className="text-2xl font-bold text-success">
                {formatCurrency(calculateChange())}
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-muted/30 space-y-2">
          <Button
            onClick={handleSaveAndPrintNow}
            disabled={!canComplete() || isProcessing}
            className={cn(
              'w-full h-14 text-lg font-bold relative overflow-hidden',
              'bg-gradient-to-r from-primary to-primary-light hover:opacity-90',
              'text-white transition-all duration-300'
            )}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {language === 'ar' ? 'جاري المعالجة...' : 'Processing...'}
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <span>📄</span>
                {language === 'ar' ? 'حفظ وطباعة الفاتورة' : 'Save & Print Invoice'}
                <kbd className="ms-2 px-2 py-0.5 bg-white/20 rounded text-xs font-mono">Ctrl+Z</kbd>
              </span>
            )}
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={handleComplete}
              disabled={!canComplete() || isProcessing}
              variant="outline"
              className={cn(
                'flex-1 h-12 relative',
                isOffline ? 'bg-amber-600 hover:bg-amber-700 text-white' : ''
              )}
            >
              {isOffline ? <WifiOff size={18} className="me-2" /> : <Check size={18} className="me-2" />}
              {isOffline
                ? (language === 'ar' ? 'حفظ محلياً' : 'Save Locally')
                : (language === 'ar' ? 'حفظ فقط' : 'Save Only')
              }
              <kbd className="absolute -top-1 -end-1 text-[9px] px-1 bg-background border border-border rounded text-muted-foreground font-mono">
                Ctrl+S
              </kbd>
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              className="h-12 px-6"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      </div>

      {showPrintOptions && completedInvoice && (
        <div style={{ display: 'none' }}>
          <InvoiceTemplate
            ref={invoiceRef}
            invoiceData={completedInvoice.printData}
            companyInfo={{
              name: companyInfo?.name || 'متجرك',
              nameAr: companyInfo?.nameAr,
              logo: companyInfo?.logo,
              address: companyInfo?.address,
              addressAr: companyInfo?.addressAr,
              phone: companyInfo?.phone,
              email: companyInfo?.email,
              tax_id: companyInfo?.tax_id,
              commercial_register: companyInfo?.commercial_register,
              website: companyInfo?.website,
              currency: companyInfo?.currency || 'YER'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default POSPaymentModal;