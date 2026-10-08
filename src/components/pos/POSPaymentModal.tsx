/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect, useRef } from 'react';
import Cookies from 'js-cookie';
import { useReactToPrint } from 'react-to-print';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import InvoiceTemplate from './InvoiceTemplate';
import { Banknote, Check, CreditCard, Crown, Gift, Split, Star, Wallet, WifiOff, X } from 'lucide-react';
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
  itemType?: 'product' | 'service';
  automotive_service_id?: number;
  meter_quantity?: number;
}

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  total: number;
  subtotal: number;
  tax: number;
  cartItems: CartItem[];
  onComplete: (payments: { method: string; amount: number }[], invoiceNumber: string, isComplimentary?: boolean) => void;
  customer?: { id: string; name: string; name_ar?: string; phone?: string; loyalty_points?: number | null } | null;
  onRequestCustomer?: () => void;
  canManageDiscounts?: boolean;
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
  extraCharge?: number;
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
  onRequestCustomer,
  canManageDiscounts = false,
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
  extraCharge = 0,
  companyInfo,
}) => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('cash');
  const [isComplimentary, setIsComplimentary] = useState(false);
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
  const { data: companySettings, isLoading: companySettingsLoading } = useQuery({
    queryKey: ['pos-print-company-settings'],
    queryFn: async () => (await supabase.from('company_settings').select('*').maybeSingle()).data,
    staleTime: 5 * 60 * 1000,
  });
  const effectiveCompanyInfo = {
    ...companyInfo,
    name: companySettings?.name || companyInfo.name,
    nameAr: companySettings?.name_ar || companyInfo.nameAr,
    logo: companySettings?.logo_url || companySettings?.logo_icon_url || companyInfo.logo,
    address: companySettings?.address || companyInfo.address,
    phone: companySettings?.phone || companyInfo.phone,
    tax_id: companySettings?.tax_number || companyInfo.tax_id,
  };
  const defaultTax = activeTaxRates?.find(t => t.default === true) || activeTaxRates?.[0];
  const amountDue = isComplimentary ? 0 : total;

  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `فاتورة-${Date.now()}`,
    onAfterPrint: () => {
      setShowPrintOptions(false);
      setCompletedInvoice(null);
      onComplete(completedInvoice?.payments || [], completedInvoice?.printData?.invoice_number || '', !!completedInvoice?.printData?.isComplimentary);
    },
  });

  useEffect(() => {
    if (!showPrintOptions || !completedInvoice || companySettingsLoading) return;
    const timer = window.setTimeout(() => handlePrint(), 80);
    return () => window.clearTimeout(timer);
  }, [showPrintOptions, completedInvoice, companySettingsLoading, handlePrint]);

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
    setCashAmount(amountDue.toString());
    setSplitAmounts({ cash: '', card: '', wallet: '' });
  }, [amountDue, isOpen]);

  useEffect(() => {
    if (!isOpen) setIsComplimentary(false);
  }, [isOpen]);

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
    if (isComplimentary) return 0;
    const cash = parseFloat(cashAmount) || 0;
    if (paymentMethod === 'split') {
      const totalPaid = Object.values(splitAmounts).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
      return totalPaid - amountDue;
    }
    return paymentMethod === 'cash' ? cash - amountDue : 0;
  };

  const canComplete = () => {
    if (isComplimentary) {
      return !!customer?.id && Number.isSafeInteger(Number(customer.id)) && Number(customer.id) > 0 && !!customer.name?.trim();
    }
    const cash = parseFloat(cashAmount) || 0;

    if (paymentMethod === 'cash') return cash >= amountDue;
    if (paymentMethod === 'split') {
      const totalPaid = Object.values(splitAmounts).reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0);
      return totalPaid >= amountDue;
    }
    return true;
  };

  const calculateTotalDiscountPercentage = (): number => {
    if (!cartItems.length) return 0;
    if (isComplimentary) return 100;
    
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
  if (isComplimentary && (!customer?.id || !Number.isSafeInteger(Number(customer.id)) || !customer.name?.trim())) {
    toast({
      title: language === 'ar' ? 'اختر العميل أولاً' : 'Select a customer first',
      description: language === 'ar' ? 'فاتورة المجاملات تتطلب اختيار عميل مسجل.' : 'A complimentary invoice requires a registered customer.',
      variant: 'destructive',
    });
    onRequestCustomer?.();
    return;
  }
  let payments: { method: string; amount: number }[] = [];

  if (isComplimentary) {
    payments = [];
  } else if (paymentMethod === 'split') {
    Object.entries(splitAmounts).forEach(([method, amount]) => {
      const numAmount = parseFloat(amount) || 0;
      if (numAmount > 0) {
        payments.push({ method, amount: numAmount });
      }
    });
  } else if (paymentMethod === 'cash') {
    payments = [{ method: 'cash', amount: parseFloat(cashAmount) || amountDue }];
  } else {
    payments = [{ method: paymentMethod, amount: amountDue }];
  }

  payments = payments.filter(payment => payment.amount > 0);

  const totalDiscountPercentage = calculateTotalDiscountPercentage();
  const originalTotal = getOriginalTotal();
  const totalDiscountAmount = isComplimentary ? originalTotal : originalTotal - total;
  const invoiceDiscountToSave = isComplimentary ? 100 : invoiceDiscountPercentage;

  setIsProcessing(true);
  try {
    const invoiceData = {
      customer_id: customer ? parseInt(String(customer.id), 10) || null : null,
      sales_representative_id: salesRepresentative ? parseInt(String(salesRepresentative.id)) : null,
      items: cartItems.map(item => ({
        product_id: parseInt(item.id),
        quantity: item.quantity,
        price: item.price,
        meter_quantity: item.meter_quantity || null,
        item_type: item.itemType || 'product',
        discount_percentage: item.discount_percentage || 0,
        discount_amount: Number((item.price * item.quantity * (item.discount_percentage || 0) / 100).toFixed(2))
      })),
      discount_percentage: invoiceDiscountToSave,
      extra_charge: isComplimentary ? 0 : extraCharge,
      is_complimentary: isComplimentary,
      payments: payments,
      subtotal: isComplimentary ? 0 : subtotal,
      tax: isComplimentary ? 0 : tax,
      total: amountDue,
      shift_id: shiftId,
      branch_id: branchId,
      delivery_id: parseInt(String(deliveryPerson?.id)) || null,
    };

    let invoiceId = '';
    let invoiceNumberFromServer = '';  // ✅ متغير لتخزين رقم الفاتورة من السيرفر
    let success = false;

    if (isOffline) {
      // ✅ في حالة عدم الاتصال، نولد رقم مؤقت
      const offlineInvoiceNumber = `INV-OFFLINE-${Date.now()}`;
      const offlineId = await saveOrderOffline({
        items: cartItems,
        subtotal: isComplimentary ? 0 : subtotal,
        tax: isComplimentary ? 0 : tax,
        total: amountDue,
        customer_id: customer?.id,
        delivery_id: deliveryPerson?.id,
        payment_method: paymentMethod,
        payments,
        invoice_number: offlineInvoiceNumber,
        discount_percentage: invoiceDiscountToSave,
        extra_charge: isComplimentary ? 0 : extraCharge,
        is_complimentary: isComplimentary,
        sales_representative_id: salesRepresentative ? Number(salesRepresentative.id) : null
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
      const response = await fetch('/api/invoice/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${Cookies.get('token') || ''}`,
        },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch {
          // Keep a useful fallback when the server returns a non-JSON error.
        }
        throw new Error(errorData?.message || 'Failed to create invoice');
      }

      const result = await response.json();
      console.log('📦 Server response:', result);
      
      // ✅ استخراج رقم الفاتورة من الـ response
      invoiceId = result.data?.id || `INV-${Date.now()}`;
      invoiceNumberFromServer = result.data?.invoice_number || result.data?.invoiceNumber || `INV-${Date.now()}`;
      
      console.log('📄 Invoice number from server:', invoiceNumberFromServer);
      
      success = true;
      toast({
        title: language === 'ar' ? 'نجاح' : 'Success',
        description: language === 'ar' ? 'تم حفظ الفاتورة بنجاح' : 'Invoice saved successfully',
      });
    }

    if (success) {
      const printData = {
        id: String(invoiceId),
        invoice_number: invoiceNumberFromServer,  // ✅ استخدام رقم الفاتورة من السيرفر
        date: new Date().toISOString(),
        cashierName: user?.name,
        branchName: branchName || undefined,
        branchNameAr: branchNameAr || undefined,
        branchPhone: branchPhone || companyInfo?.phone,
        branchAddress: isRTL
          ? branchAddressAr || branchAddress || companyInfo?.addressAr || companyInfo?.address
          : branchAddress || companyInfo?.address,
        customer: customer ? {
          name: customer.name,
          name_ar: customer.name_ar || customer.name,
          nameAr: customer.name_ar || customer.name,
          phone: customer.phone
        } : null,
        salesRep: salesRepresentative ? {
          name: salesRepresentative.name,
          nameAr: salesRepresentative.name,
          commission_rate: salesRepresentative.commission_rate
        } : null,
        extraCharge: isComplimentary ? 0 : extraCharge,
        deliveryPerson: deliveryPerson ? {
          name: deliveryPerson.name,
          nameAr: deliveryPerson.name,
          phone: deliveryPerson.phone
        } : null,
        items: cartItems.map(item => ({
          name: item.name,
          nameAr: item.nameAr || item.name,
          itemType: item.itemType || (item.automotive_service_id ? 'service' : 'product'),
          quantity: item.quantity,
          price: item.price,
          total_price: Number((item.price * item.quantity * (1 - (item.discount_percentage || 0) / 100)).toFixed(2)),
          sizeName: item.sizeName,
          sizeNameAr: item.sizeName,
          colorName: item.colorName,
          colorNameAr: item.colorName,
        })),
        subtotal: isComplimentary ? originalTotal : subtotal,
        tax: isComplimentary ? 0 : tax,
        taxRate: defaultTax?.rate || 0,
        total: amountDue,
        payments: payments,
        change: calculateChange(),
        totalDiscountPercentage: totalDiscountPercentage,
        totalDiscountAmount: totalDiscountAmount,
        invoiceDiscountPercentage: invoiceDiscountToSave,
        discount_percentage: totalDiscountPercentage,
        discount_amount: totalDiscountAmount,
        amounts: {
          total: amountDue,
          paid: payments.reduce((sum, payment) => sum + payment.amount, 0),
          remaining: amountDue - payments.reduce((sum, payment) => sum + payment.amount, 0),
        },
        is_complimentary: isComplimentary,
        isComplimentary,
      };

      console.log('📄 Print data with invoice number:', printData.invoice_number);

      setCompletedInvoice({ payments, printData });

      if (type === 'save') {
        onComplete(payments, invoiceNumberFromServer, isComplimentary);  // إرسال رقم الفاتورة وعلامة المجاملة
      } else if (type === 'print') {
        setShowPrintOptions(true);
      } else if (type === 'both') {
        setShowPrintOptions(true);
      }
    }
  } catch (error) {
    console.error('Error saving invoice:', error);
    const errorMessage = error instanceof Error && error.message
      ? error.message
      : (language === 'ar' ? 'فشل في حفظ الفاتورة' : 'Failed to save invoice');
    toast({
      title: language === 'ar' ? 'خطأ' : 'Error',
      description: errorMessage,
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
    return Math.max(0, amountDue - totalPaid);
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
          {formatCurrency(amountDue)}
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
                    +{Math.floor(amountDue / 1000)} {language === 'ar' ? 'نقطة جديدة' : 'new pts'}
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
              {amountDue.toLocaleString()} <span className="text-lg"></span>
            </p>
          </div>

          {canManageDiscounts && <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <input
              type="checkbox"
              checked={isComplimentary}
              onChange={(event) => {
                const checked = event.target.checked;
                setIsComplimentary(checked);
                if (checked && !customer) onRequestCustomer?.();
              }}
              className="mt-1 h-4 w-4 accent-amber-600"
            />
            <span className="flex-1">
              <span className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
                <Gift size={16} />
                {language === 'ar' ? 'فاتورة مجاملات' : 'Complimentary invoice'}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {language === 'ar' ? 'يُطبّق خصم 100% تلقائياً ولا يُطلب دفع. يجب اختيار عميل مسجل، وسيصل إشعار للإدارة.' : 'Applies a 100% discount automatically; no payment is due. Select a registered customer. Management will be notified.'}
              </span>
              {isComplimentary && !customer && <span className="mt-2 block text-xs font-semibold text-destructive">{language === 'ar' ? 'اختر العميل لإكمال فاتورة المجاملات.' : 'Select a customer to complete this complimentary invoice.'}</span>}
            </span>
          </label>}

          {!isComplimentary && <>
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
          </>}

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
              name: effectiveCompanyInfo?.name || 'متجرك',
              nameAr: effectiveCompanyInfo?.nameAr,
              logo: effectiveCompanyInfo?.logo,
              address: effectiveCompanyInfo?.address,
              addressAr: effectiveCompanyInfo?.addressAr,
              phone: effectiveCompanyInfo?.phone,
              email: effectiveCompanyInfo?.email,
              tax_id: effectiveCompanyInfo?.tax_id,
              commercial_register: effectiveCompanyInfo?.commercial_register,
              website: effectiveCompanyInfo?.website,
              currency: effectiveCompanyInfo?.currency || 'YER'
            }}
          />
        </div>
      )}
    </div>
  );
};

export default POSPaymentModal;
