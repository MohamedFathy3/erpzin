/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { useQuery } from '@tanstack/react-query';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import PrintableInvoice from '@/components/ui/PrintableInvoice';
import { useReactToPrint } from 'react-to-print';

import { 
  Search, 
  Receipt, 
  RotateCcw, 
  DollarSign, 
  User, 
  Building2, 
  Filter,
  Eye,
  Printer,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Loader2,
  CreditCard,
  Wallet,
  Banknote,
  PieChart,
  Tag
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

// ========== أنواع البيانات المحدثة ==========

interface Customer {
  id: number;
  name: string;
  name_ar?: string;
  phone?: string;
  email?: string;
  address?: string;
  point?: number;
  last_paid_amount?: number;
}

interface SaleItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: string;
  total: string;
  color?: string | null;
  size?: string | null;
}

interface Payment {
  method: 'cash' | 'card' | 'wallet' | 'credit';
  amount: string;
}

interface Amounts {
  total: string;
  paid: string;
  remaining: string;
}

interface Sale {
  id: number;
  invoice_number: string;
  status: 'paid' | 'pending' | 'cancelled' | 'partial';
  customer: Customer | null;
  salesRepresentative: { id: number; name: string, name_ar:string } | null;
  amounts: Amounts;
  items: SaleItem[];
  payments: Payment[];
  created_at: string;
  cashier: string;
  discount_percentage?: number;
  discount_amount?: number;
}

// ✅ تحديث واجهة ReturnItem
interface ReturnItem {
  id: number;
  product_id: number;
  product?: {
    id: number;
    name: string;
  };
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  color?: string | null;   // ✅ اللون
  size?: string | null;    // ✅ المقاس
  price?: number;          // ✅ بديل unit_price
  total?: number;          // ✅ بديل total_price
  name?: string;           // ✅ اسم المنتج
}

// ✅ تحديث واجهة ReturnInvoice
interface ReturnInvoice {
  id: number;
  return_number: string;
  return_date: string;
  total_amount: number;
  refunded_amount: number;
  reason: string | null;
  status: 'completed' | 'pending' | 'cancelled';
  customer_id: number | null;
  customer?: Customer;
  invoice?: {
    id: number;
    invoice_number: string;
    customer: Customer;
    items?: any[];  // ✅ الفاتورة الأصلية فيها اللون والمقاس
  };
  items?: ReturnItem[];
  refund_method: 'cash' | 'card' | 'wallet' | 'credit';
  created_at: string;
  updated_at: string;
}

interface Branch {
  id: string;
  name: string;
  name_ar: string | null;
  is_active: boolean;
}

interface Cashier {
  id: string;
  full_name: string;
  full_name_ar: string | null;
  role: string;
}

interface POSTransactionsListProps {
  onClose?: () => void;
}

const POSTransactionsList: React.FC<POSTransactionsListProps> = ({ onClose }) => {
  const { language } = useLanguage();

  // ========== State ==========
  const [activeTab, setActiveTab] = useState<'sales' | 'returns'>('sales');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<ReturnInvoice | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  
  // ========== Print State ==========
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [printType, setPrintType] = useState<'sale' | 'return'>('sale');
  const [printData, setPrintData] = useState<any>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // ========== Print Handler ==========
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: (printType === 'sale' 
      ? `Invoice-${printData?.invoice_number}` 
      : `Return-${printData?.return_number}`) || 'invoice',
    onAfterPrint: () => {
      setShowPrintDialog(false);
      setPrintData(null);
    },
  });

  const onPrintClick = (type: 'sale' | 'return', data: any) => {
    setPrintType(type);
    setPrintData(data);
    setShowPrintDialog(true);
    
    setTimeout(() => {
      if (printRef.current) {
        handlePrint();
      } else {
        console.error('Print ref is not available');
      }
    }, 200);
  };
  
  // ========== Translations ==========
  const t = {
    title: language === 'ar' ? 'فواتير نقطة البيع' : 'POS Invoices',
    sales: language === 'ar' ? 'المبيعات' : 'Sales',
    returns: language === 'ar' ? 'المرتجعات' : 'Returns',
    search: language === 'ar' ? 'بحث برقم الفاتورة أو العميل...' : 'Search by invoice or customer...',
    dateFrom: language === 'ar' ? 'من تاريخ' : 'From Date',
    dateTo: language === 'ar' ? 'إلى تاريخ' : 'To Date',
    branch: language === 'ar' ? 'الفرع' : 'Branch',
    allBranches: language === 'ar' ? 'جميع الفروع' : 'All Branches',
    paymentMethod: language === 'ar' ? 'طريقة الدفع' : 'Payment Method',
    allMethods: language === 'ar' ? 'الكل' : 'All Methods',
    status: language === 'ar' ? 'الحالة' : 'Status',
    allStatuses: language === 'ar' ? 'الكل' : 'All',
    user: language === 'ar' ? 'المستخدم' : 'User',
    allUsers: language === 'ar' ? 'جميع المستخدمين' : 'All Users',
    invoiceNumber: language === 'ar' ? 'رقم الفاتورة' : 'Invoice #',
    returnNumber: language === 'ar' ? 'رقم المرتجع' : 'Return #',
    date: language === 'ar' ? 'التاريخ' : 'Date',
    salesRepresentative: language === 'ar' ? 'المندوب' : 'Sales Representative',
    customer: language === 'ar' ? 'العميل' : 'Customer',
    cashier: language === 'ar' ? 'الكاشير' : 'Cashier',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    paid: language === 'ar' ? 'المدفوع' : 'Paid',
    remaining: language === 'ar' ? 'المتبقي' : 'Remaining',
    actions: language === 'ar' ? 'إجراءات' : 'Actions',
    noData: language === 'ar' ? 'لا توجد بيانات' : 'No data found',
    totalSales: language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales',
    totalReturns: language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns',
    viewDetails: language === 'ar' ? 'عرض التفاصيل' : 'View Details',
    print: language === 'ar' ? 'طباعة' : 'Print',
    paid_status: language === 'ar' ? 'مدفوع' : 'Paid',
    pending: language === 'ar' ? 'معلق' : 'Pending',
    cancelled: language === 'ar' ? 'ملغي' : 'Cancelled',
    partial: language === 'ar' ? 'مدفوع جزئياً' : 'Partially Paid',
    cash: language === 'ar' ? 'نقدي' : 'Cash',
    card: language === 'ar' ? 'بطاقة' : 'Card',
    wallet: language === 'ar' ? 'محفظة' : 'Wallet',
    credit: language === 'ar' ? 'رصيد' : 'Credit',
    invoiceDetails: language === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice Details',
    returnDetails: language === 'ar' ? 'تفاصيل المرتجع' : 'Return Details',
    items: language === 'ar' ? 'الأصناف' : 'Items',
    quantity: language === 'ar' ? 'الكمية' : 'Qty',
    price: language === 'ar' ? 'السعر' : 'Price',
    subtotal: language === 'ar' ? 'المجموع الفرعي' : 'Subtotal',
    tax: language === 'ar' ? 'الضريبة' : 'Tax',
    discount: language === 'ar' ? 'الخصم' : 'Discount',
    netTotal: language === 'ar' ? 'الإجمالي الصافي' : 'Net Total',
    reason: language === 'ar' ? 'السبب' : 'Reason',
    refundMethod: language === 'ar' ? 'طريقة الاسترداد' : 'Refund Method',
    clearFilters: language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters',
    showFilters: language === 'ar' ? 'إظهار الفلاتر' : 'Show Filters',
    hideFilters: language === 'ar' ? 'إخفاء الفلاتر' : 'Hide Filters',
    refresh: language === 'ar' ? 'تحديث' : 'Refresh',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...',
    paymentBreakdown: language === 'ar' ? 'توزيع المدفوعات' : 'Payment Breakdown',
    totalAmount: language === 'ar' ? 'إجمالي الفاتورة' : 'Total Amount',
    paidAmount: language === 'ar' ? 'المبلغ المدفوع' : 'Paid Amount',
    remainingAmount: language === 'ar' ? 'المبلغ المتبقي' : 'Remaining Amount',
    overpaid: language === 'ar' ? 'مدفوع زيادة' : 'Overpaid',
    color: language === 'ar' ? 'اللون' : 'Color',
    size: language === 'ar' ? 'المقاس' : 'Size',
  };

  // ========== Queries ==========

  // ✅ جلب الفواتير
  const { data: sales = [], isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ['pos-sales', activeTab],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 100,
          paginate: false,
        };

        const response = await api.post('/invoices/index', payload);

        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching POS sales:', error);
        return [];
      }
    }
  });

  // ✅ جلب المرتجعات
  const { data: returns = [], isLoading: returnsLoading, refetch: refetchReturns } = useQuery({
    queryKey: ['pos-returns', activeTab],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 100,
          paginate: false,
          with: ['customer', 'return_items', 'invoice.customer', 'invoice.items']  // ✅ أضفنا invoice.items
        };

        const response = await api.post('/return-invoices/index', payload);

        if (response.data.result === 'Success') {
          // ✅ معالجة البيانات لإضافة اللون والمقاس من الفاتورة الأصلية
          const returnData = response.data.data || [];
          
          const enrichedReturns = returnData.map((ret: ReturnInvoice) => {
            // إذا كان فيه فاتورة أصلية وعندها items
            if (ret.invoice && ret.invoice.items && ret.items) {
              // إنشاء map للعناصر في الفاتورة الأصلية
              const invoiceItemsMap = new Map();
              ret.invoice.items.forEach((invItem: any) => {
                invoiceItemsMap.set(invItem.product_id, invItem);
              });
              
              // إضافة اللون والمقاس من الفاتورة الأصلية
              const enrichedItems = ret.items.map((item: ReturnItem) => {
                const invoiceItem = invoiceItemsMap.get(item.product_id);
                return {
                  ...item,
                  color: invoiceItem?.color || item.color || null,
                  size: invoiceItem?.size || item.size || null,
                  // تأكد من وجود price و total
                  price: item.price || item.unit_price || 0,
                  total: item.total || item.total_price || 0,
                  name: item.product?.name || item.product_name || item.name || 'غير معروف',
                };
              });
              
              return {
                ...ret,
                items: enrichedItems,
              };
            }
            
            // إذا مافيش فاتورة أصلية، نرجع البيانات زي ما هي
            const formattedItems = ret.items?.map((item: ReturnItem) => ({
              ...item,
              price: item.price || item.unit_price || 0,
              total: item.total || item.total_price || 0,
              name: item.product?.name || item.product_name || item.name || 'غير معروف',
            })) || [];
            
            return {
              ...ret,
              items: formattedItems,
            };
          });
          
          return enrichedReturns;
        }
        return [];
      } catch (error) {
        console.error('Error fetching POS returns:', error);
        return [];
      }
    }
  });

  // ========== Filter Functions ==========

  const filterSales = (sale: Sale) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesInvoice = sale.invoice_number?.toLowerCase().includes(searchLower);
      const matchesCustomer = sale.customer?.name?.toLowerCase().includes(searchLower) ||
                            sale.customer?.name_ar?.toLowerCase().includes(searchLower);
      if (!matchesInvoice && !matchesCustomer) return false;
    }

    if (dateFrom || dateTo) {
      const saleDate = sale.created_at;
      if (!saleDate) return false;
      const dateTime = new Date(saleDate);
      
      if (dateFrom) {
        const fromDateTime = new Date(dateFrom);
        fromDateTime.setHours(0, 0, 0);
        if (dateTime < fromDateTime) return false;
      }
      if (dateTo) {
        const toDateTime = new Date(dateTo);
        toDateTime.setHours(23, 59, 59);
        if (dateTime > toDateTime) return false;
      }
    }

    if (selectedPaymentMethod !== 'all') {
      const hasPaymentMethod = sale.payments?.some(p => p.method === selectedPaymentMethod);
      if (!hasPaymentMethod) return false;
    }

    if (selectedStatus !== 'all') {
      const saleStatus = getSaleStatus(sale);
      if (saleStatus !== selectedStatus) return false;
    }

    return true;
  };

  const filterReturns = (ret: ReturnInvoice) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesInvoice = ret.return_number?.toLowerCase().includes(searchLower);
      const customerName = ret.invoice?.customer?.name || ret.customer?.name || '';
      const matchesCustomer = customerName.toLowerCase().includes(searchLower);
      if (!matchesInvoice && !matchesCustomer) return false;
    }

    if (dateFrom || dateTo) {
      const returnDate = ret.return_date || ret.created_at;
      if (!returnDate) return false;
      const dateTime = new Date(returnDate);
      
      if (dateFrom) {
        const fromDateTime = new Date(dateFrom);
        fromDateTime.setHours(0, 0, 0);
        if (dateTime < fromDateTime) return false;
      }
      if (dateTo) {
        const toDateTime = new Date(dateTo);
        toDateTime.setHours(23, 59, 59);
        if (dateTime > toDateTime) return false;
      }
    }

    if (selectedStatus !== 'all' && ret.status !== selectedStatus) return false;

    return true;
  };

  const getSaleStatus = (sale: Sale): string => {
    if (sale.status === 'cancelled') return 'cancelled';
    const total = parseFloat(sale.amounts?.total || '0');
    const paid = parseFloat(sale.amounts?.paid || '0');
    if (paid >= total) return 'paid';
    if (paid > 0 && paid < total) return 'partial';
    if (paid === 0) return 'pending';
    return sale.status || 'pending';
  };

  const filteredSales = useMemo(() => {
    return sales.filter(filterSales);
  }, [sales, searchTerm, dateFrom, dateTo, selectedPaymentMethod, selectedStatus]);

  const filteredReturns = useMemo(() => {
    return returns.filter(filterReturns);
  }, [returns, searchTerm, dateFrom, dateTo, selectedStatus]);

  const totalSalesAmount = useMemo(() => {
    return filteredSales.reduce((sum: number, s: Sale) => sum + (parseFloat(s.amounts?.total || '0')), 0);
  }, [filteredSales]);

  const totalReturnsAmount = useMemo(() => {
    return filteredReturns.reduce((sum: number, r: ReturnInvoice) => sum + (parseFloat(r.total_amount?.toString() || '0')), 0);
  }, [filteredReturns]);

  // ========== Helper Functions ==========

  const formatNumber = (value: string | number, decimals: number = 2): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0.00';
    return num.toFixed(decimals).toLocaleString();
  };

  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote size={14} />;
      case 'card': return <CreditCard size={14} />;
      case 'wallet': return <Wallet size={14} />;
      default: return <DollarSign size={14} />;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'card': return 'bg-blue-500/10 text-blue-600 border-blue-200';
      case 'wallet': return 'bg-purple-500/10 text-purple-600 border-purple-200';
      case 'credit': return 'bg-orange-500/10 text-orange-600 border-orange-200';
      default: return 'bg-gray-500/10 text-gray-600 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      paid: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', label: t.paid_status },
      partial: { color: 'bg-amber-500/10 text-amber-600 border-amber-200', label: t.partial },
      pending: { color: 'bg-blue-500/10 text-blue-600 border-blue-200', label: t.pending },
      cancelled: { color: 'bg-red-500/10 text-red-600 border-red-200', label: t.cancelled },
      completed: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', label: t.paid_status },
    };
    const { color, label } = config[status] || config.pending;
    return <Badge variant="outline" className={cn(color, 'border-0')}>{label}</Badge>;
  };

  const getPaymentMethodBadge = (method: string) => {
    return (
      <Badge variant="outline" className={cn(getPaymentMethodColor(method), 'border-0 gap-1')}>
        {getPaymentIcon(method)}
        {method === 'cash' ? t.cash : 
         method === 'card' ? t.card : 
         method === 'wallet' ? t.wallet : 
         method === 'credit' ? t.credit : method}
      </Badge>
    );
  };

  const renderPaymentMethods = (payments: Payment[] = []) => {
    if (!payments || payments.length === 0) {
      return getPaymentMethodBadge('cash');
    }
    if (payments.length === 1) {
      return getPaymentMethodBadge(payments[0].method);
    }
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1 flex-wrap">
          {payments.map((payment, index) => (
            <Badge 
              key={index} 
              variant="outline" 
              className={cn(getPaymentMethodColor(payment.method), 'border-0 gap-1 text-xs')}
            >
              {getPaymentIcon(payment.method)}
              {formatNumber(payment.amount)}
            </Badge>
          ))}
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 gap-1 w-fit">
          <PieChart size={12} />
          {payments.length} {language === 'ar' ? 'طرق دفع' : 'methods'}
        </Badge>
      </div>
    );
  };

  const renderAmounts = (amounts: Amounts) => {
    const total = parseFloat(amounts?.total || '0');
    const paid = parseFloat(amounts?.paid || '0');
    const remaining = parseFloat(amounts?.remaining || '0');
    
    return (
      <div className="whitespace-nowrap">
        <div className="flex items-center justify-end gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t.total}</p>
            <p className="text-sm font-semibold">{formatNumber(total)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{t.paid}</p>
            <p className="text-sm font-semibold text-emerald-600">{formatNumber(paid)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">{remaining > 0 ? t.remaining : t.overpaid}</p>
            <p className={cn(
              "text-sm font-semibold",
              remaining > 0 ? "text-amber-600" : remaining < 0 ? "text-blue-600" : "text-muted-foreground"
            )}>
              {formatNumber(Math.abs(remaining))}
            </p>
          </div>
        </div>
      </div>
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setSelectedBranch('all');
    setSelectedPaymentMethod('all');
    setSelectedStatus('all');
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchSales(), refetchReturns()]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const hasActiveFilters = searchTerm || dateFrom || dateTo || selectedPaymentMethod !== 'all' || selectedStatus !== 'all';
  const isLoading = salesLoading || returnsLoading;

  // ========== Render ==========
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">{t.title}</h2>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
            {t.refresh}
          </Button>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X size={20} />
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatNumber(totalSalesAmount)}</p>
                <p className="text-xs text-muted-foreground">{t.totalSales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <DollarSign className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{formatNumber(totalReturnsAmount)}</p>
                <p className="text-xs text-muted-foreground">{t.totalReturns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Receipt className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{filteredSales.length}</p>
                <p className="text-xs text-muted-foreground">{t.sales}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <RotateCcw className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{filteredReturns.length}</p>
                <p className="text-xs text-muted-foreground">{t.returns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter size={16} />
          {showFilters ? t.hideFilters : t.showFilters}
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </Button>
        
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
            <X size={14} />
            {t.clearFilters}
          </Button>
        )}
      </div>

      {/* Filters Section */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute end-2 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={14} />
                </Button>
              )}
            </div>

            {/* Date Filters */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.dateFrom}</Label>
                <DatePicker
                  value={dateFrom}
                  onChange={setDateFrom}
                  placeholder={t.dateFrom}
                  language={language}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.dateTo}</Label>
                <DatePicker
                  value={dateTo}
                  onChange={setDateTo}
                  placeholder={t.dateTo}
                  language={language}
                />
              </div>
            </div>

            {/* Selects */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.paymentMethod}</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.allMethods} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allMethods}</SelectItem>
                    <SelectItem value="cash">{t.cash}</SelectItem>
                    <SelectItem value="card">{t.card}</SelectItem>
                    <SelectItem value="wallet">{t.wallet}</SelectItem>
                    <SelectItem value="credit">{t.credit}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.status}</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.allStatuses} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="paid">{t.paid_status}</SelectItem>
                    <SelectItem value="partial">{t.partial}</SelectItem>
                    <SelectItem value="pending">{t.pending}</SelectItem>
                    <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sales' | 'returns')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="sales" className="gap-2">
            <Receipt size={16} />
            {t.sales}
            <Badge variant="secondary" className="ms-1 text-xs">
              {filteredSales.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="returns" className="gap-2">
            <RotateCcw size={16} />
            {t.returns}
            <Badge variant="secondary" className="ms-1 text-xs">
              {filteredReturns.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Sales Tab */}
        <TabsContent value="sales" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto scroll-smooth">
                <div className="min-w-[1200px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[180px] whitespace-nowrap">{t.invoiceNumber}</TableHead>
                        <TableHead className="w-[250px] whitespace-nowrap">{t.customer}</TableHead>
                        <TableHead className="w-[250px] whitespace-nowrap">{t.salesRepresentative}</TableHead>
                        <TableHead className="w-[250px] whitespace-nowrap">{t.cashier}</TableHead>
                        <TableHead className="w-[250px] whitespace-nowrap">{t.paymentMethod}</TableHead>
                        <TableHead className="w-[300px] whitespace-nowrap text-right">{t.total}</TableHead>
                        <TableHead className="w-[100px] whitespace-nowrap text-center">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salesLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <span className="text-muted-foreground">{t.loading}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredSales.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            <Receipt className="mx-auto h-12 w-12 mb-4 opacity-20" />
                            <p>{t.noData}</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSales.map((sale: Sale) => (
                          <TableRow key={sale.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedSale(sale)}>
                            <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                              {sale.invoice_number || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <User size={14} className="text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[200px]">
                                  {sale.customer 
                                    ? (language === 'ar' ? sale.customer.name_ar || sale.customer.name : sale.customer.name)
                                    : 'N/A'
                                  }
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <User size={14} className="text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[200px]">
                                  {sale.salesRepresentative 
                                    ? (language === 'ar' ? sale.salesRepresentative.name_ar || sale.salesRepresentative.name : sale.salesRepresentative.name)
                                    : 'N/A'
                                  }
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 whitespace-nowrap">
                                <User size={14} className="text-muted-foreground shrink-0" />
                                <span className="truncate max-w-[200px]">
                                  {sale.cashier 
                                    ? (language === 'ar' ? sale.cashier : sale.cashier)
                                    : 'N/A'
                                  }
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {renderPaymentMethods(sale.payments)}
                            </TableCell>
                            <TableCell className="text-right">
                              {renderAmounts(sale.amounts)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSale(sale);
                                  }}
                                >
                                  <Eye size={16} />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onPrintClick('sale', sale);
                                  }}
                                >
                                  <Printer size={16} />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Returns Tab */}
        <TabsContent value="returns" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto scroll-smooth">
                <div className="min-w-[1200px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="w-[180px] whitespace-nowrap">{t.returnNumber}</TableHead>
                        <TableHead className="w-[180px] whitespace-nowrap">{t.date}</TableHead>
                        <TableHead className="w-[250px] whitespace-nowrap">{t.customer}</TableHead>
                        <TableHead className="w-[150px] whitespace-nowrap">{t.refundMethod}</TableHead>
                        <TableHead className="w-[120px] whitespace-nowrap text-right">{t.total}</TableHead>
                        <TableHead className="w-[120px] whitespace-nowrap">{t.status}</TableHead>
                        <TableHead className="w-[100px] whitespace-nowrap text-center">{t.actions}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex items-center justify-center gap-2">
                              <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              <span className="text-muted-foreground">{t.loading}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredReturns.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            <RotateCcw className="mx-auto h-12 w-12 mb-4 opacity-20" />
                            <p>{t.noData}</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredReturns.map((ret: ReturnInvoice) => {
                          const customerName = ret.invoice?.customer 
                            ? (language === 'ar' ? ret.invoice.customer.name_ar || ret.invoice.customer.name : ret.invoice.customer.name)
                            : ret.customer 
                              ? (language === 'ar' ? ret.customer.name_ar || ret.customer.name : ret.customer.name)
                              : '-';
                          
                          return (
                            <TableRow key={ret.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedReturn(ret)}>
                              <TableCell className="font-mono text-sm font-medium whitespace-nowrap">
                                {ret.return_number || '-'}
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                {ret.return_date || ret.created_at ? 
                                  format(new Date(ret.return_date || ret.created_at), 'yyyy-MM-dd HH:mm') : '-'
                                }
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <User size={14} className="text-muted-foreground shrink-0" />
                                  <span className="truncate max-w-[200px]">{customerName}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {getPaymentMethodBadge(ret.refund_method || 'cash')}
                              </TableCell>
                              <TableCell className="font-semibold text-right text-red-600 whitespace-nowrap">
                                -{formatNumber(ret.refunded_amount || 0)}
                              </TableCell>
                              <TableCell>{getStatusBadge(ret.status || 'completed')}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedReturn(ret);
                                    }}
                                  >
                                    <Eye size={16} />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onPrintClick('return', ret);
                                    }}
                                  >
                                    <Printer size={16} />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Sale Details Modal */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Receipt size={20} className="text-primary" />
              {t.invoiceDetails} - <span className="font-mono">{selectedSale?.invoice_number}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Invoice Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                    <p className="text-sm font-medium">
                      {selectedSale.created_at ? format(new Date(selectedSale.created_at), 'yyyy-MM-dd HH:mm') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.customer}</p>
                    <p className="text-sm font-medium">
                      {selectedSale.customer 
                        ? (language === 'ar' ? selectedSale.customer.name_ar || selectedSale.customer.name : selectedSale.customer.name)
                        : '-'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.salesRepresentative}</p>
                    <p className="text-sm font-medium">
                      {selectedSale.salesRepresentative?.name || '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.status}</p>
                    <div className="mt-1">{getStatusBadge(getSaleStatus(selectedSale))}</div>
                  </div>
                </div>

                {/* Amounts Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t.totalAmount}</p>
                    <p className="text-lg font-bold text-primary">{formatNumber(selectedSale.amounts?.total || '0')}</p>
                  </div>
                  <div className="p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t.paidAmount}</p>
                    <p className="text-lg font-bold text-emerald-600">{formatNumber(selectedSale.amounts?.paid || '0')}</p>
                  </div>
                  <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">
                      {parseFloat(selectedSale.amounts?.remaining || '0') > 0 ? t.remaining : t.overpaid}
                    </p>
                    <p className={cn(
                      "text-lg font-bold",
                      parseFloat(selectedSale.amounts?.remaining || '0') > 0 ? "text-amber-600" : 
                      parseFloat(selectedSale.amounts?.remaining || '0') < 0 ? "text-blue-600" : "text-muted-foreground"
                    )}>
                      {formatNumber(Math.abs(parseFloat(selectedSale.amounts?.remaining || '0')))}
                    </p>
                  </div>
                </div>

                {/* Payment Breakdown */}
                {selectedSale.payments && selectedSale.payments.length > 1 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <PieChart size={16} className="text-primary" />
                      {t.paymentBreakdown}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {selectedSale.payments.map((payment, idx) => (
                        <div key={idx} className={cn(
                          "p-2 rounded-lg border text-center",
                          getPaymentMethodColor(payment.method)
                        )}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            {getPaymentIcon(payment.method)}
                            <span className="text-xs font-medium">
                              {payment.method === 'cash' ? t.cash : 
                               payment.method === 'card' ? t.card : 
                               payment.method === 'wallet' ? t.wallet : 
                               payment.method === 'credit' ? t.credit : payment.method}
                            </span>
                          </div>
                          <p className="text-sm font-bold">{formatNumber(payment.amount)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Items Table with Color & Size */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Receipt size={16} className="text-primary" />
                    {t.items}
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[250px]">{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                            <TableHead className="min-w-[80px] text-center">{t.color}</TableHead>
                            <TableHead className="min-w-[70px] text-center">{t.size}</TableHead>
                            <TableHead className="min-w-[60px] text-center">{t.quantity}</TableHead>
                            <TableHead className="min-w-[120px] text-right">{t.price}</TableHead>
                            <TableHead className="min-w-[120px] text-right">{t.total}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedSale.items?.map((item: SaleItem, index: number) => (
                            <TableRow key={index}>
                              <TableCell>
                                <span className="font-medium">{item.product_name || '-'}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                {item.color ? (
                                  <Badge variant="outline" className="bg-primary/5 border-primary/20">
                                    <span 
                                      className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" 
                                      style={{ backgroundColor: item.color }}
                                    />
                                    {item.color}
                                  </Badge>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="text-center">
                                {item.size ? (
                                  <Badge variant="outline" className="bg-secondary/5 border-secondary/20">
                                    {item.size}
                                  </Badge>
                                ) : '-'}
                              </TableCell>
                              <TableCell className="text-center">{item.quantity || 0}</TableCell>
                              <TableCell className="text-right">{formatNumber(item.price || '0')}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatNumber(item.total || '0')}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== Return Details Modal (المعدل) ========== */}
      <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw size={20} className="text-primary" />
              {t.returnDetails} - <span className="font-mono">{selectedReturn?.return_number}</span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              {language === 'ar' 
                ? `تفاصيل مرتجع رقم ${selectedReturn?.return_number}` 
                : `Return details for ${selectedReturn?.return_number}`}
            </DialogDescription>
          </DialogHeader>
          {selectedReturn && (
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {/* Return Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">{t.date}</p>
                    <p className="text-sm font-medium">
                      {selectedReturn.return_date ? format(new Date(selectedReturn.return_date), 'yyyy-MM-dd HH:mm') : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.customer}</p>
                    <p className="text-sm font-medium">
                      {selectedReturn.invoice?.customer 
                        ? (language === 'ar' 
                            ? selectedReturn.invoice.customer.name_ar || selectedReturn.invoice.customer.name 
                            : selectedReturn.invoice.customer.name)
                        : selectedReturn.customer
                          ? (language === 'ar' 
                              ? selectedReturn.customer.name_ar || selectedReturn.customer.name 
                              : selectedReturn.customer.name)
                          : '-'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.refundMethod}</p>
                    <div className="mt-1">{getPaymentMethodBadge(selectedReturn.refund_method || 'cash')}</div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t.status}</p>
                    <div className="mt-1">{getStatusBadge(selectedReturn.status || 'completed')}</div>
                  </div>
                </div>

                {/* Return Amount */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-red-500/5 rounded-lg border border-red-500/20 text-center">
                    <p className="text-xs text-muted-foreground mb-1">{t.total}</p>
                    <p className="text-2xl font-bold text-red-600">
                      -{formatNumber(selectedReturn.refunded_amount || selectedReturn.total_amount || 0)}
                    </p>
                  </div>
                  {selectedReturn.reason && (
                    <div className="p-4 bg-amber-500/5 rounded-lg border border-amber-500/20">
                      <p className="text-xs text-muted-foreground mb-1">{t.reason}</p>
                      <p className="text-sm font-medium">{selectedReturn.reason}</p>
                    </div>
                  )}
                </div>

                {/* Items Table with Color & Size for Returns */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Receipt size={16} className="text-primary" />
                    {t.items}
                  </h3>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[200px]">{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                            <TableHead className="min-w-[80px] text-center">{t.color}</TableHead>
                            <TableHead className="min-w-[70px] text-center">{t.size}</TableHead>
                            <TableHead className="min-w-[60px] text-center">{t.quantity}</TableHead>
                            <TableHead className="min-w-[120px] text-right">{t.price}</TableHead>
                            <TableHead className="min-w-[120px] text-right">{t.total}</TableHead>
                            <TableHead className="min-w-[120px]">{t.reason}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedReturn.items?.map((item: any, index: number) => {
                            const price = item.price || item.unit_price || 0;
                            const quantity = item.quantity || 0;
                            const total = item.total || item.total_price || 0;
                            const name = item.product?.name || item.name || item.product_name || 'غير معروف';
                            
                            return (
                              <TableRow key={index}>
                                <TableCell>
                                  <span className="font-medium">{name}</span>
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.color ? (
                                    <Badge variant="outline" className="bg-primary/5 border-primary/20">
                                      <span 
                                        className="inline-block w-2.5 h-2.5 rounded-full mr-1.5" 
                                        style={{ backgroundColor: item.color }}
                                      />
                                      {item.color}
                                    </Badge>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.size ? (
                                    <Badge variant="outline" className="bg-secondary/5 border-secondary/20">
                                      {item.size}
                                    </Badge>
                                  ) : '-'}
                                </TableCell>
                                <TableCell className="text-center font-medium">{quantity}</TableCell>
                                <TableCell className="text-right">{formatNumber(price)}</TableCell>
                                <TableCell className="text-right font-bold text-red-600">
                                  -{formatNumber(total)}
                                </TableCell>
                                <TableCell>
                                  <span className="text-sm text-muted-foreground">
                                    {item.reason || '-'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>

                {/* Invoice Reference */}
                {selectedReturn.invoice && (
                  <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {language === 'ar' ? 'مرتجع عن فاتورة' : 'Return for Invoice'}:
                      </span>
                      <span className="font-mono font-semibold">
                        {selectedReturn.invoice.invoice_number}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={showPrintDialog} onOpenChange={() => {
        setShowPrintDialog(false);
        setPrintData(null);
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer size={20} className="text-primary" />
              {printType === 'return' 
                ? `${t.returnDetails} - ${printData?.return_number}`
                : `${t.invoiceDetails} - ${printData?.invoice_number}`
              }
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-auto max-h-[70vh]">
            {printData && (
              <PrintableInvoice
                ref={printRef}
                data={printData}
                type={printType}
                language={language}
              />
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => {
              setShowPrintDialog(false);
              setPrintData(null);
            }}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={() => handlePrint()} className="gap-2">
              <Printer size={16} />
              {language === 'ar' ? 'طباعة' : 'Print'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSTransactionsList;