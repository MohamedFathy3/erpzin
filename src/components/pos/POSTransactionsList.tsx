import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { useQuery } from '@tanstack/react-query';
import { format, isWithinInterval, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
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
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

// ========== أنواع البيانات ==========

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
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  color?: string | null;
  size?: string | null;
}

interface Sale {
  id: number;
  invoice_number: string;
  sale_date: string;
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  payment_method: string;
  status: 'completed' | 'pending' | 'cancelled';
  customer_id: number | null;
  customer?: Customer;
  sale_items: SaleItem[];
  payments?: {
    method: string;
    amount: number;
  }[];
  created_at: string;
  updated_at: string;
}

interface ReturnItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  color?: string | null;
  size?: string | null;
}

interface ReturnInvoice {
  id: number;
  return_number: string;
  return_date: string;
  total_amount: number;
  reason: string | null;
  status: 'completed' | 'pending' | 'cancelled';
  customer_id: number | null;
  customer?: Customer;
  return_items: ReturnItem[];
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
  const [timeFrom, setTimeFrom] = useState<string>('');
  const [timeTo, setTimeTo] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<ReturnInvoice | null>(null);
  const [showFilters, setShowFilters] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // ========== Translations ==========
  const t = {
    title: language === 'ar' ? 'فواتير نقطة البيع' : 'POS Invoices',
    sales: language === 'ar' ? 'المبيعات' : 'Sales',
    returns: language === 'ar' ? 'المرتجعات' : 'Returns',
    search: language === 'ar' ? 'بحث برقم الفاتورة أو العميل...' : 'Search by invoice or customer...',
    dateFrom: language === 'ar' ? 'من تاريخ' : 'From Date',
    dateTo: language === 'ar' ? 'إلى تاريخ' : 'To Date',
    timeFrom: language === 'ar' ? 'من وقت' : 'From Time',
    timeTo: language === 'ar' ? 'إلى وقت' : 'To Time',
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
    customer: language === 'ar' ? 'العميل' : 'Customer',
    total: language === 'ar' ? 'الإجمالي' : 'Total',
    actions: language === 'ar' ? 'إجراءات' : 'Actions',
    noData: language === 'ar' ? 'لا توجد بيانات' : 'No data found',
    totalSales: language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales',
    totalReturns: language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns',
    viewDetails: language === 'ar' ? 'عرض التفاصيل' : 'View Details',
    print: language === 'ar' ? 'طباعة' : 'Print',
    completed: language === 'ar' ? 'مكتمل' : 'Completed',
    pending: language === 'ar' ? 'معلق' : 'Pending',
    cancelled: language === 'ar' ? 'ملغي' : 'Cancelled',
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
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...'
  };

  // ========== Queries ==========

  // ✅ جلب الفروع - POST /branch/index
  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ['branches-pos-list'],
    queryFn: async () => {
      try {
        const response = await api.post('/branch/index', {
          filters: { active: true },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });

        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching branches:', error);
        return [];
      }
    }
  });

  // ✅ جلب الكاشيرز - POST /employee/index (مع فلتر role=cashier)
  const { data: cashiers = [], isLoading: cashiersLoading } = useQuery({
    queryKey: ['cashiers-pos-list'],
    queryFn: async () => {
      try {
        const response = await api.post('/employee/index', {
          filters: { 
            position: 'cashier',
            is_active: true 
          },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });

        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching cashiers:', error);
        return [];
      }
    }
  });

  // ✅ جلب فواتير المبيعات - POST /invoices/index
  const { data: sales = [], isLoading: salesLoading, refetch: refetchSales } = useQuery({
    queryKey: ['pos-sales', activeTab],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 100,
          paginate: false,
          with: ['customer', 'sale_items']
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

  // ✅ جلب فواتير المرتجعات - POST /return-invoices/index
  const { data: returns = [], isLoading: returnsLoading, refetch: refetchReturns } = useQuery({
    queryKey: ['pos-returns', activeTab],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 100,
          paginate: false,
          with: ['customer', 'return_items']
        };

        const response = await api.post('/return-invoices/index', payload);

        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching POS returns:', error);
        return [];
      }
    }
  });

  // ========== Filter Functions ==========

  // ✅ دالة فلترة المبيعات
  const filterSales = (sale: any) => {
    // 1. فلترة البحث
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesInvoice = sale.invoice_number?.toLowerCase().includes(searchLower);
      const matchesCustomer = sale.customer?.name?.toLowerCase().includes(searchLower) ||
                            sale.customer?.name_ar?.toLowerCase().includes(searchLower) ||
                            sale.customer?.phone?.toLowerCase().includes(searchLower);
      if (!matchesInvoice && !matchesCustomer) return false;
    }

    // 2. فلترة التاريخ والوقت
    if (dateFrom || timeFrom || dateTo || timeTo) {
      const saleDate = sale.sale_date || sale.created_at;
      if (!saleDate) return false;

      const dateTime = new Date(saleDate);
      
      if (dateFrom) {
        const fromDateTime = new Date(dateFrom);
        if (timeFrom) {
          const [hours, minutes] = timeFrom.split(':').map(Number);
          fromDateTime.setHours(hours, minutes, 0);
        } else {
          fromDateTime.setHours(0, 0, 0);
        }
        if (dateTime < fromDateTime) return false;
      }

      if (dateTo) {
        const toDateTime = new Date(dateTo);
        if (timeTo) {
          const [hours, minutes] = timeTo.split(':').map(Number);
          toDateTime.setHours(hours, minutes, 59);
        } else {
          toDateTime.setHours(23, 59, 59);
        }
        if (dateTime > toDateTime) return false;
      }
    }

    // 3. فلترة طريقة الدفع
    if (selectedPaymentMethod !== 'all') {
      const paymentMethod = sale.payment_method || sale.payments?.[0]?.method;
      if (paymentMethod !== selectedPaymentMethod) return false;
    }

    // 4. فلترة الحالة
    if (selectedStatus !== 'all' && sale.status !== selectedStatus) return false;

    // 5. فلترة المستخدم (الكاشير)
    if (selectedUser !== 'all' && sale.cashier_id?.toString() !== selectedUser) return false;

    return true;
  };

  // ✅ دالة فلترة المرتجعات
  const filterReturns = (ret: any) => {
    // 1. فلترة البحث
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesInvoice = ret.return_number?.toLowerCase().includes(searchLower);
      const matchesCustomer = ret.customer?.name?.toLowerCase().includes(searchLower) ||
                            ret.customer?.name_ar?.toLowerCase().includes(searchLower) ||
                            ret.customer?.phone?.toLowerCase().includes(searchLower);
      if (!matchesInvoice && !matchesCustomer) return false;
    }

    // 2. فلترة التاريخ والوقت
    if (dateFrom || timeFrom || dateTo || timeTo) {
      const returnDate = ret.return_date || ret.created_at;
      if (!returnDate) return false;

      const dateTime = new Date(returnDate);
      
      if (dateFrom) {
        const fromDateTime = new Date(dateFrom);
        if (timeFrom) {
          const [hours, minutes] = timeFrom.split(':').map(Number);
          fromDateTime.setHours(hours, minutes, 0);
        } else {
          fromDateTime.setHours(0, 0, 0);
        }
        if (dateTime < fromDateTime) return false;
      }

      if (dateTo) {
        const toDateTime = new Date(dateTo);
        if (timeTo) {
          const [hours, minutes] = timeTo.split(':').map(Number);
          toDateTime.setHours(hours, minutes, 59);
        } else {
          toDateTime.setHours(23, 59, 59);
        }
        if (dateTime > toDateTime) return false;
      }
    }

    // 3. فلترة الحالة
    if (selectedStatus !== 'all' && ret.status !== selectedStatus) return false;

    return true;
  };

  // ✅ فلترة المبيعات
  const filteredSales = useMemo(() => {
    return sales.filter(filterSales);
  }, [sales, searchTerm, dateFrom, dateTo, timeFrom, timeTo, selectedPaymentMethod, selectedStatus, selectedUser]);

  // ✅ فلترة المرتجعات
  const filteredReturns = useMemo(() => {
    return returns.filter(filterReturns);
  }, [returns, searchTerm, dateFrom, dateTo, timeFrom, timeTo, selectedStatus]);

  // ✅ حساب الإحصائيات
  const totalSalesAmount = useMemo(() => {
    return filteredSales.reduce((sum: number, s: any) => sum + (parseFloat(s.total_amount) || 0), 0);
  }, [filteredSales]);

  const totalReturnsAmount = useMemo(() => {
    return filteredReturns.reduce((sum: number, r: any) => sum + (parseFloat(r.total_amount) || 0), 0);
  }, [filteredReturns]);

  // ========== Helper Functions ==========

  const getStatusBadge = (status: string) => {
    const config: Record<string, { color: string; label: string }> = {
      completed: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400', label: t.completed },
      pending: { color: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400', label: t.pending },
      cancelled: { color: 'bg-red-500/10 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400', label: t.cancelled },
    };
    const { color, label } = config[status] || config.pending;
    return <Badge variant="outline" className={cn(color)}>{label}</Badge>;
  };

  const getPaymentMethodBadge = (method: string) => {
    const config: Record<string, { color: string; label: string }> = {
      cash: { color: 'bg-green-500/10 text-green-600 border-green-200 dark:bg-green-950/30 dark:text-green-400', label: t.cash },
      card: { color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400', label: t.card },
      wallet: { color: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400', label: t.wallet },
      credit: { color: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400', label: t.credit },
    };
    const { color, label } = config[method] || config.cash;
    return <Badge variant="outline" className={cn(color)}>{label}</Badge>;
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setTimeFrom('');
    setTimeTo('');
    setSelectedBranch('all');
    setSelectedPaymentMethod('all');
    setSelectedStatus('all');
    setSelectedUser('all');
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        refetchSales(),
        refetchReturns()
      ]);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const hasActiveFilters = searchTerm || dateFrom || dateTo || timeFrom || timeTo || 
    selectedBranch !== 'all' || selectedPaymentMethod !== 'all' || 
    selectedStatus !== 'all' || selectedUser !== 'all';

  const isLoading = salesLoading || returnsLoading || branchesLoading || cashiersLoading;

  // ========== Render ==========
  return (
    <div className="space-y-4">
      {/* ========== Header ========== */}
      <div className="flex items-center justify-between">
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

      {/* ========== Stats Cards ========== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold">{totalSalesAmount.toLocaleString()}</p>
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
                <p className="text-xl font-bold">{totalReturnsAmount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">{t.totalReturns}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <User className="h-5 w-5 text-blue-600" />
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

      {/* ========== Filters Toggle ========== */}
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

      {/* ========== Filters Section ========== */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Row 1: Search */}
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

            {/* Row 2: Date & Time Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <Label className="text-xs font-medium text-muted-foreground">{t.timeFrom}</Label>
                <TimePicker
                  value={timeFrom}
                  onChange={setTimeFrom}
                  placeholder={t.timeFrom}
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
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.timeTo}</Label>
                <TimePicker
                  value={timeTo}
                  onChange={setTimeTo}
                  placeholder={t.timeTo}
                  language={language}
                />
              </div>
            </div>

            {/* Row 3: Selects */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.branch}</Label>
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.allBranches} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allBranches}</SelectItem>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id.toString()}>
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-muted-foreground" />
                          {language === 'ar' ? b.name_ar || b.name : b.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.user}</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.allUsers} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allUsers}</SelectItem>
                    {cashiers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id.toString()}>
                        {language === 'ar' ? c.name_ar || c.name : c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div> */}
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
              {/* <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.status}</Label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.allStatuses} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.allStatuses}</SelectItem>
                    <SelectItem value="completed">{t.completed}</SelectItem>
                    <SelectItem value="pending">{t.pending}</SelectItem>
                    <SelectItem value="cancelled">{t.cancelled}</SelectItem>
                  </SelectContent>
                </Select>
              </div> */}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ========== Tabs ========== */}
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

        {/* ========== Sales Tab ========== */}
        <TabsContent value="sales">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="min-w-[150px]">{t.invoiceNumber}</TableHead>
                        <TableHead className="min-w-[150px]">{t.date}</TableHead>
                        <TableHead className="min-w-[200px]">{t.customer}</TableHead>
                        <TableHead className="min-w-[120px]">{t.paymentMethod}</TableHead>
                        <TableHead className="min-w-[120px] text-right">{t.total}</TableHead>
                        <TableHead className="min-w-[120px]">{t.status}</TableHead>
                        <TableHead className="min-w-[100px] text-center">{t.actions}</TableHead>
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
                        filteredSales.map((sale: any) => (
                          <TableRow key={sale.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedSale(sale)}>
                            <TableCell className="font-mono text-sm font-medium">
                              {sale.invoice_number || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {sale.sale_date || sale.created_at ? 
                                format(new Date(sale.sale_date || sale.created_at), 'yyyy-MM-dd HH:mm', { 
                                  locale: language === 'ar' ? ar : undefined 
                                }) : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User size={14} className="text-muted-foreground" />
                                <span>
                                  {sale.customer 
                                    ? (language === 'ar' ? sale.customer.name_ar || sale.customer.name : sale.customer.name)
                                    : t.customer
                                  }
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getPaymentMethodBadge(sale.payment_method || sale.payments?.[0]?.method || 'cash')}
                            </TableCell>
                            <TableCell className="font-semibold text-right">
                              {parseFloat(sale.total_amount || 0).toLocaleString()} YER
                            </TableCell>
                            <TableCell>{getStatusBadge(sale.status || 'completed')}</TableCell>
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
                                <Button variant="ghost" size="icon" className="h-8 w-8">
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
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== Returns Tab ========== */}
        <TabsContent value="returns">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="min-w-[150px]">{t.returnNumber}</TableHead>
                        <TableHead className="min-w-[150px]">{t.date}</TableHead>
                        <TableHead className="min-w-[200px]">{t.customer}</TableHead>
                        <TableHead className="min-w-[120px]">{t.refundMethod}</TableHead>
                        <TableHead className="min-w-[120px] text-right">{t.total}</TableHead>
                        <TableHead className="min-w-[120px]">{t.status}</TableHead>
                        <TableHead className="min-w-[100px] text-center">{t.actions}</TableHead>
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
                        filteredReturns.map((ret: any) => (
                          <TableRow key={ret.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedReturn(ret)}>
                            <TableCell className="font-mono text-sm font-medium">
                              {ret.return_number || '-'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {ret.return_date || ret.created_at ? 
                                format(new Date(ret.return_date || ret.created_at), 'yyyy-MM-dd HH:mm', { 
                                  locale: language === 'ar' ? ar : undefined 
                                }) : '-'
                              }
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User size={14} className="text-muted-foreground" />
                                <span>
                                  {ret.customer 
                                    ? (language === 'ar' ? ret.customer.name_ar || ret.customer.name : ret.customer.name)
                                    : t.customer
                                  }
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getPaymentMethodBadge(ret.refund_method || 'cash')}
                            </TableCell>
                            <TableCell className="font-semibold text-right text-red-600">
                              -{parseFloat(ret.total_amount || 0).toLocaleString()} YER
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
                                <Button variant="ghost" size="icon" className="h-8 w-8">
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
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========== Sale Details Modal ========== */}
      <Dialog open={!!selectedSale} onOpenChange={() => setSelectedSale(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Receipt size={20} className="text-primary" />
              {t.invoiceDetails} - <span className="font-mono">{selectedSale?.invoice_number}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedSale && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                  <p className="text-sm font-medium">
                    {selectedSale.sale_date || selectedSale.created_at
                      ? format(new Date(selectedSale.sale_date || selectedSale.created_at), 'yyyy-MM-dd HH:mm')
                      : '-'
                    }
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
                  <p className="text-xs text-muted-foreground">{t.paymentMethod}</p>
                  <div className="mt-1">
                    {getPaymentMethodBadge(selectedSale.payment_method || selectedSale.payments?.[0]?.method || 'cash')}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.status}</p>
                  <div className="mt-1">{getStatusBadge(selectedSale.status || 'completed')}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Receipt size={16} className="text-primary" />
                  {t.items}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                        <TableHead className="min-w-[80px] text-center">{t.quantity}</TableHead>
                        <TableHead className="min-w-[100px] text-right">{t.price}</TableHead>
                        <TableHead className="min-w-[100px] text-right">{t.total}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedSale.sale_items?.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {item.product_name || '-'}
                            {(item.color || item.size) && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                {item.color && <span>🎨 {item.color}</span>}
                                {item.size && <span>📏 {item.size}</span>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{item.quantity || 0}</TableCell>
                          <TableCell className="text-right">{parseFloat(item.unit_price || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">
                            {parseFloat(item.total_price || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 border rounded-lg p-4 bg-muted/20">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t.subtotal}:</span>
                    <span>{parseFloat(selectedSale.subtotal || selectedSale.total_amount || 0).toLocaleString()} YER</span>
                  </div>
                  {parseFloat(selectedSale.tax_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t.tax}:</span>
                      <span>{parseFloat(selectedSale.tax_amount || 0).toLocaleString()} YER</span>
                    </div>
                  )}
                  {parseFloat(selectedSale.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>{t.discount}:</span>
                      <span>-{parseFloat(selectedSale.discount_amount || 0).toLocaleString()} YER</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>{t.netTotal}:</span>
                    <span>{parseFloat(selectedSale.total_amount || 0).toLocaleString()} YER</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========== Return Details Modal ========== */}
      <Dialog open={!!selectedReturn} onOpenChange={() => setSelectedReturn(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw size={20} className="text-primary" />
              {t.returnDetails} - <span className="font-mono">{selectedReturn?.return_number}</span>
            </DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Return Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">{t.date}</p>
                  <p className="text-sm font-medium">
                    {selectedReturn.return_date || selectedReturn.created_at
                      ? format(new Date(selectedReturn.return_date || selectedReturn.created_at), 'yyyy-MM-dd HH:mm')
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.customer}</p>
                  <p className="text-sm font-medium">
                    {selectedReturn.customer 
                      ? (language === 'ar' ? selectedReturn.customer.name_ar || selectedReturn.customer.name : selectedReturn.customer.name)
                      : '-'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.reason}</p>
                  <p className="text-sm font-medium">{selectedReturn.reason || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t.status}</p>
                  <div className="mt-1">{getStatusBadge(selectedReturn.status || 'completed')}</div>
                </div>
              </div>

              {/* Refund Method */}
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-xs text-muted-foreground mb-1">{t.refundMethod}</p>
                <div>{getPaymentMethodBadge(selectedReturn.refund_method || 'cash')}</div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Receipt size={16} className="text-primary" />
                  {t.items}
                </h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                        <TableHead className="min-w-[80px] text-center">{t.quantity}</TableHead>
                        <TableHead className="min-w-[100px] text-right">{t.price}</TableHead>
                        <TableHead className="min-w-[100px] text-right">{t.total}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.return_items?.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {item.product_name || '-'}
                            {(item.color || item.size) && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                                {item.color && <span>🎨 {item.color}</span>}
                                {item.size && <span>📏 {item.size}</span>}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{item.quantity || 0}</TableCell>
                          <TableCell className="text-right">{parseFloat(item.unit_price || 0).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium text-red-600">
                            -{parseFloat(item.total_price || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-end">
                <div className="w-64 border rounded-lg p-4 bg-red-500/5 border-red-200">
                  <div className="flex justify-between font-bold text-lg text-red-600">
                    <span>{t.netTotal}:</span>
                    <span>-{parseFloat(selectedReturn.total_amount || 0).toLocaleString()} YER</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default POSTransactionsList;