/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import InvoiceTemplate from './InvoiceTemplate';
import { Banknote, Check, CreditCard, Crown, Split, Star, Wallet, WifiOff, X, RotateCcw, Clock, Loader2 } from 'lucide-react';
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
import api from '@/lib/api';
import { useQuery } from '@tanstack/react-query'; // ✅ إضافة useQuery

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
  reason?: 'defective' | 'wrong_item' | 'damaged' | 'customer_change' | 'other';
  unit_id?: number;
  color_id?: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  tax: number;
  cartItems: CartItem[];
  onComplete: (payments: { method: string; amount: number }[], invoiceNumber: string) => void;
  customer?: { id: string; name: string; name_ar?: string; phone?: string; loyalty_points?: number | null } | null;
  deliveryPerson?: { id: string; name: string; phone?: string } | null;
  salesRepresentative?: { id: string | number; name: string; commission_rate?: string } | null;
  supplier?: { id: number; name: string; name_ar?: string } | null;
  mode?: 'sale' | 'return';
  shiftId?: string | null;
  branchId?: string | null;
  branchName?: string | null;
  branchNameAr?: string | null;
  branchPhone?: string | null;
  branchAddress?: string | null;
  branchAddressAr?: string | null;
  invoiceDiscountPercentage?: number;
  invoiceDiscountAmount?: number;
  itemDiscountsTotal?: number;
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
  salesRepresentative,
  supplier,
  mode = 'return',
  shiftId: shiftIdFromProps, // ✅ إعادة تسمية shiftId من props
  branchId: branchIdFromProps,
  branchName,
  branchNameAr,
  branchPhone,
  branchAddress,
  branchAddressAr,
  invoiceDiscountPercentage = 0,
  invoiceDiscountAmount = 0,
  itemDiscountsTotal = 0,
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

  // ✅ جلب الوردية الحالية من الـ API
  const { 
    data: currentShiftFromAPI,
    isLoading: shiftLoading,
    refetch: refetchShift
  } = useQuery({
    queryKey: ['current-shift-modal'],
    queryFn: async () => {
      try {
        console.log('🔄 Fetching current shift from API (inside modal)...');
        const response = await api.get('/shifts/current');
        console.log('📥 Shift API response (modal):', response.data);
        
        if (response.data.status && response.data.data) {
          console.log('✅ Shift found in modal:', response.data.data.id);
          return response.data.data;
        }
        console.log('⚠️ No active shift found in modal');
        return null;
      } catch (error) {
        console.error('❌ Error fetching current shift (modal):', error);
        return null;
      }
    },
    // ✅ يجيب الـ shift فور فتح المودال
    enabled: isOpen, // فقط لما المودال مفتوح
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 10000,
  });

  // ✅ استخدم shiftId من الـ API أو من الـ props
  const actualShiftId = currentShiftFromAPI?.id || shiftIdFromProps;
  const actualBranchId = branchIdFromProps || user?.branch_id || null;

  useEffect(() => {
    if (currentShiftFromAPI) {
      console.log('🔄 Shift loaded in modal from API:', currentShiftFromAPI);
      console.log('🆔 Shift ID in modal:', currentShiftFromAPI.id);
    }
  }, [currentShiftFromAPI]);

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `فاتورة-${Date.now()}`,
    onAfterPrint: () => {
      setShowPrintOptions(false);
      setCompletedInvoice(null);
      onComplete(completedInvoice?.payments || [], completedInvoice?.invoice_number || '');
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
      let invoiceId = '';
      let invoiceNumberFromServer = '';
      let success = false;

      // ✅ استخدام الـ shiftId من الـ API
      const shiftIdValue = actualShiftId ? parseInt(String(actualShiftId)) : null;
      const branchIdValue = actualBranchId ? parseInt(String(actualBranchId)) : null;

      console.log('🔑 Shift ID from API:', currentShiftFromAPI);
      console.log('🔑 Shift ID from props:', shiftIdFromProps);
      console.log('🔑 Final Shift ID:', actualShiftId);
      console.log('🔑 Shift ID parsed:', shiftIdValue);
      console.log('🏢 Branch ID:', actualBranchId);
      console.log('🏢 Branch ID parsed:', branchIdValue);
      console.log('📋 Mode:', mode);

      // ==================== RETURN MODE (الافتراضي) ====================
      if (mode === 'return') {
        const customerIdValue = customer?.id ? parseInt(customer.id) : null;

        const returnPayload = {
          sales_invoice_id: customerIdValue,
          return_method: paymentMethod,
          note: language === 'ar' ? 'مرتجع منتجات' : 'Products return',
          items: cartItems.map(item => ({
            product_id: parseInt(item.id),
            quantity: item.quantity,
            price: item.price,
            reason: item.reason || 'defective'
          })),
          branch_id: branchIdValue,
          shift_id: shiftIdValue,
        };

        console.log('📦 Return Payload:', JSON.stringify(returnPayload, null, 2));

        // ✅ استخدم api بدلاً من fetch
        const response = await api.post('/invoice-return/direct/store', returnPayload);
        const result = response.data;

        console.log('📦 Return response:', result);

        invoiceId = result.data?.id || `RET-${Date.now()}`;
        invoiceNumberFromServer = result.data?.return_number || result.data?.invoice_number || `RET-${Date.now()}`;
        success = true;

        toast({
          title: language === 'ar' ? 'تم تسجيل المرتجع بنجاح' : 'Return recorded successfully',
          description: language === 'ar' 
            ? `رقم المرتجع: ${invoiceNumberFromServer}`
            : `Return #: ${invoiceNumberFromServer}`
        });

      } else {
        // ==================== SALE MODE ====================
        const invoiceData = {
          customer_id: parseInt(String(customer?.id)) || 1,
          sales_representative_id: salesRepresentative ? parseInt(String(salesRepresentative.id)) : null,
          items: cartItems.map(item => ({
            product_id: parseInt(item.id),
            quantity: item.quantity,
            price: item.price,
            color: item.colorName || null,
            size: item.sizeName || null,
            discount_amount: totalDiscountAmount
          })),
          discount_percentage: totalDiscountPercentage,
          payments: payments,
          subtotal: subtotal,
          tax: tax,
          total: total,
          shift_id: shiftIdValue,
          branch_id: branchIdValue,
          delivery_id: deliveryPerson ? parseInt(String(deliveryPerson.id)) : null,
        };

        let response;
        
        if (isOffline) {
          const offlineInvoiceNumber = `INV-OFFLINE-${Date.now()}`;
          const offlineId = await saveOrderOffline({
            items: cartItems,
            subtotal,
            tax,
            total,
            customer_id: customer?.id,
            delivery_id: deliveryPerson?.id,
            payment_method: paymentMethod,
            payments,
            invoice_number: offlineInvoiceNumber
          });

          if (offlineId) {
            invoiceId = offlineId;
            invoiceNumberFromServer = offlineInvoiceNumber;
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
          response = await api.post('/invoice/store', invoiceData);

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to create invoice');
          }

          const result = response.data;
          console.log('📦 Server response:', result);
          
          invoiceId = result.data?.id || `INV-${Date.now()}`;
          invoiceNumberFromServer = result.data?.invoice_number || result.data?.invoiceNumber || `INV-${Date.now()}`;
          success = true;

          toast({
            title: language === 'ar' ? 'نجاح' : 'Success',
            description: language === 'ar' ? 'تم حفظ الفاتورة بنجاح' : 'Invoice saved successfully',
          });
        }
      }

      if (success) {
        const printData = {
          id: String(invoiceId),
          invoice_number: invoiceNumberFromServer,
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
          supplier: supplier ? {
            name: supplier.name,
            nameAr: supplier.name_ar || supplier.name,
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
            reason: item.reason || null,
          })),
          subtotal: subtotal,
          tax: tax,
          taxRate: defaultTax?.rate || 0,
          total: total,
          payments: payments,
          change: calculateChange(),
          totalDiscountPercentage: totalDiscountPercentage,
          totalDiscountAmount: totalDiscountAmount,
          invoiceDiscountPercentage: invoiceDiscountPercentage,
          mode: mode,
          itemDiscountsTotal: itemDiscountsTotal,
        };

        console.log('📄 Print data:', printData);

        setCompletedInvoice({ payments, printData });

        if (type === 'save') {
          onComplete(payments, invoiceNumberFromServer);
        } else if (type === 'print') {
          handlePrint();
        } else if (type === 'both') {
          setShowPrintOptions(true);
          setTimeout(() => {
            handlePrint();
          }, 100);
        }
      }
    } catch (error: any) {
      console.error('❌ Error in handleSaveAndPrint:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: error.response?.data?.message || error.message || (language === 'ar' ? 'فشل في الحفظ' : 'Failed to save'),
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
              {mode === 'return' 
                ? (language === 'ar' ? 'مرتجع' : 'Return')
                : (language === 'ar' ? 'الدفع' : 'Payment')
              }
            </h2>
            {mode === 'return' && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 text-rose-600 rounded-full text-xs">
                <RotateCcw size={12} />
                <span>{language === 'ar' ? 'مرتجع' : 'Return'}</span>
              </div>
            )}
            {isOffline && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-xs">
                <WifiOff size={12} />
                <span>{language === 'ar' ? 'بدون نت' : 'Offline'}</span>
              </div>
            )}
            {/* ✅ عرض الـ shift ID في الـ header */}
            {actualShiftId && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded-full text-xs">
                <Clock size={12} />
                <span>{language === 'ar' ? 'وردية' : 'Shift'} #{actualShiftId}</span>
              </div>
            )}
            {shiftLoading && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded-full text-xs">
                <Loader2 size={12} className="animate-spin" />
                <span>{language === 'ar' ? 'جاري...' : 'Loading...'}</span>
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
          {/* ... باقي الكود كما هو ... */}
          {/* Customer/Supplier Info */}
          {(customer || supplier || deliveryPerson) && (
            <div className="flex gap-4 mb-4 p-3 bg-muted/50 rounded-lg">
              {customer && mode === 'sale' && (
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

              {(supplier || customer) && mode === 'return' && (
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground">
                    {supplier ? (language === 'ar' ? 'المورد' : 'Supplier') : (language === 'ar' ? 'العميل' : 'Customer')}
                  </p>
                  <p className="font-medium text-foreground">
                    {supplier 
                      ? (language === 'ar' ? supplier.name_ar || supplier.name : supplier.name)
                      : customer?.name
                    }
                  </p>
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

          {isOffline && mode === 'sale' && (
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
              {mode === 'return' 
                ? (language === 'ar' ? 'مبلغ المرتجع' : 'Return Amount')
                : (language === 'ar' ? 'المبلغ المطلوب' : 'Amount Due')
              }
            </p>
            <p className={cn(
              "text-4xl font-bold",
              mode === 'return' ? "text-rose-600" : "text-primary"
            )}>
              {formatCurrency(total)}
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
            disabled={!canComplete() || isProcessing || shiftLoading}
            className={cn(
              'w-full h-14 text-lg font-bold relative overflow-hidden',
              mode === 'return'
                ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:opacity-90'
                : 'bg-gradient-to-r from-primary to-primary-light hover:opacity-90',
              'text-white transition-all duration-300'
            )}
          >
            {isProcessing || shiftLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {shiftLoading 
                  ? (language === 'ar' ? 'جلب الوردية...' : 'Fetching shift...')
                  : (language === 'ar' ? 'جاري المعالجة...' : 'Processing...')
                }
              </span>
            ) : (
              <span className="flex items-center justify-center gap-3">
                <span>📄</span>
                {mode === 'return'
                  ? (language === 'ar' ? 'حفظ وطباعة المرتجع' : 'Save & Print Return')
                  : (language === 'ar' ? 'حفظ وطباعة الفاتورة' : 'Save & Print Invoice')
                }
                <kbd className="ms-2 px-2 py-0.5 bg-white/20 rounded text-xs font-mono">Ctrl+Z</kbd>
              </span>
            )}
          </Button>

          <div className="flex gap-2">
            <Button
              onClick={handleComplete}
              disabled={!canComplete() || isProcessing || shiftLoading}
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

            <Button              onClick={onClose}
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