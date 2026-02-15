import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Receipt, RotateCcw, ArrowLeftRight, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import SalesInvoiceForm from "./SalesInvoiceForm";
import InvoiceDetails from "./InvoiceDetails";
import InvoiceReturnForm from "./InvoiceReturnForm";
import AdvancedFilter, { FilterField, FilterValues } from "@/components/ui/advanced-filter";
import api from "@/lib/api";
import { toast } from "sonner";

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

interface SalesRepresentative {
  id: number;
  name: string;
  name_ar?: string;
  phone?: string;
  email?: string;
  commission_rate?: number;
}

interface Branch {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  phone?: string;
  address?: string;
  is_active?: boolean;
}

interface Warehouse {
  id: number;
  name: string;
  name_ar?: string;
  code?: string;
  phone?: string;
  address?: string;
  is_active?: boolean;
}

interface Currency {
  id: number;
  name: string;
  code: string;
  symbol: string;
  exchange_rate: number;
  is_default?: boolean;
}

interface Tax {
  id: number;
  name: string;
  name_ar?: string;
  rate: number;
  is_default?: boolean;
}

interface SalesInvoiceItem {
  product_id: number;
  product_name?: string;
  quantity: number;
  price: number;
  total?: number;
}

interface SalesInvoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer?: Customer;
  sales_representative_id?: number;
  sales_representative?: SalesRepresentative;
  branch_id?: number;
  branch?: Branch;
  warehouse_id?: number;
  warehouse?: Warehouse;
  currency_id?: number;
  currency?: string;
  tax_id?: number;
  tax?: Tax;
  payment_method: 'cash' | 'card' | 'wallet' | 'credit';
  invoice_date: string;
  due_date?: string;
  note?: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  remaining_amount: number;
  payment_status: 'paid' | 'pending' | 'partial' | 'cancelled';
  invoice_type: 'cash' | 'credit';
  items: SalesInvoiceItem[];
  created_at: string;
  updated_at: string;
}

const SalesInvoiceList = () => {
  const { language } = useLanguage();
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<any>(null);
  
  // ========== Client-side Filter State ==========
  const [filters, setFilters] = useState({
    search: '',
    payment_status: 'all',
    invoice_type: 'all',
    branch_id: 'all',
    salesman_id: 'all',
    customer_id: 'all',
    warehouse_id: 'all',
    currency_id: 'all',
    tax_id: 'all',
    date_from: '',
    date_to: '',
    amount_min: '',
    amount_max: ''
  });

  // ========== Queries ==========

  // ✅ جلب الفروع
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-invoice-list'],
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
        toast.error(language === 'ar' ? 'خطأ في جلب الفروع' : 'Error fetching branches');
        return [];
      }
    },
  });

  // ✅ جلب العملات
  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies-invoice-list'],
    queryFn: async () => {
      try {
        const response = await api.post('/currency/index', {
          filters: { },
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
        console.error('Error fetching currencies:', error);
        return [];
      }
    },
  });

  // ✅ جلب الضرائب
  const { data: taxes = [] } = useQuery({
    queryKey: ['taxes-invoice-list'],
    queryFn: async () => {
      try {
        const response = await api.post('/tax/index', {
          filters: {  },
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
        console.error('Error fetching taxes:', error);
        return [];
      }
    },
  });

  // ✅ جلب العملاء
  const { data: customers = [] } = useQuery({
    queryKey: ['customers-invoice-list'],
    queryFn: async () => {
      try {
        const response = await api.post('/customer/index', {
          filters: {},
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
        console.error('Error fetching customers:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب العملاء' : 'Error fetching customers');
        return [];
      }
    },
  });

  // ✅ جلب المندوبين
  const { data: salesmen = [] } = useQuery({
    queryKey: ['salesmen-invoice-list'],
    queryFn: async () => {
      try {
        const response = await api.post('/sales-representative/index', {
          filters: {},
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
        console.error('Error fetching sales representatives:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب المندوبين' : 'Error fetching sales representatives');
        return [];
      }
    },
  });

  // ✅ جلب المخازن
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-invoice-list'],
    queryFn: async () => {
      try {
        const response = await api.post('/warehouse/index', {
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
        console.error('Error fetching warehouses:', error);
        return [];
      }
    },
  });

  // ✅ جلب فواتير المبيعات - POST /sales-invoices/index (مرة واحدة فقط)
  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['sales-invoices'],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 1000, // جلب عدد كبير مرة واحدة
          paginate: false,
          with: ['customer', 'sales_representative', 'branch', 'warehouse', 'currency', 'tax']
        };

        console.log('📦 Fetching all sales invoices...');

        const response = await api.post('/sales-invoices/index', payload);

        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching sales invoices:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب الفواتير' : 'Error fetching invoices');
        return [];
      }
    }
  });

  // ✅ جلب فاتورة محددة للمرتجع - GET /sales-invoices/{id}
  const fetchInvoiceForReturn = async (invoiceId: number) => {
    try {
      console.log(`📦 Fetching invoice #${invoiceId} for return...`);
      
      const response = await api.get(`/sales-invoices/${invoiceId}`);
      
      if (response.data.result === 'Success') {
        setSelectedInvoiceForReturn(response.data.data);
        setShowReturnForm(true);
        toast.success(language === 'ar' ? 'تم جلب الفاتورة بنجاح' : 'Invoice fetched successfully');
      } else {
        toast.error(language === 'ar' ? 'خطأ في جلب الفاتورة' : 'Error fetching invoice');
      }
    } catch (error) {
      console.error('Error fetching invoice for return:', error);
      toast.error(language === 'ar' ? 'خطأ في جلب الفاتورة' : 'Error fetching invoice');
    }
  };

  // ========== Client-side Filter Function ==========
  const filteredInvoices = useMemo(() => {
    return invoices.filter((invoice: SalesInvoice) => {
      
      // 1. فلتر البحث النصي
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const invoiceNumber = (invoice.invoice_number || '').toLowerCase();
        const customerName = (invoice.customer?.name || '').toLowerCase();
        const customerNameAr = (invoice.customer?.name_ar || '').toLowerCase();
        const customerPhone = (invoice.customer?.phone || '').toLowerCase();
        
        const matchesSearch = 
          invoiceNumber.includes(searchLower) ||
          customerName.includes(searchLower) ||
          customerNameAr.includes(searchLower) ||
          customerPhone.includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      // 2. فلتر حالة الدفع
      if (filters.payment_status !== 'all' && invoice.payment_status !== filters.payment_status) {
        return false;
      }
      
      // 3. فلتر نوع الفاتورة
      if (filters.invoice_type !== 'all' && invoice.invoice_type !== filters.invoice_type) {
        return false;
      }
      
      // 4. فلتر الفرع
      if (filters.branch_id !== 'all' && invoice.branch_id !== Number(filters.branch_id)) {
        return false;
      }
      
      // 5. فلتر المندوب
      if (filters.salesman_id !== 'all' && invoice.sales_representative_id !== Number(filters.salesman_id)) {
        return false;
      }
      
      // 6. فلتر العميل
      if (filters.customer_id !== 'all' && invoice.customer_id !== Number(filters.customer_id)) {
        return false;
      }
      
      // 7. فلتر المخزن
      if (filters.warehouse_id !== 'all' && invoice.warehouse_id !== Number(filters.warehouse_id)) {
        return false;
      }
      
      // 8. فلتر العملة
      if (filters.currency_id !== 'all' && invoice.currency_id !== Number(filters.currency_id)) {
        return false;
      }
      
      // 9. فلتر الضريبة
      if (filters.tax_id !== 'all' && invoice.tax_id !== Number(filters.tax_id)) {
        return false;
      }
      
      // 10. فلتر التاريخ (من)
      if (filters.date_from) {
        const invoiceDate = new Date(invoice.invoice_date).setHours(0,0,0,0);
        const fromDate = new Date(filters.date_from).setHours(0,0,0,0);
        if (invoiceDate < fromDate) return false;
      }
      
      // 11. فلتر التاريخ (إلى)
      if (filters.date_to) {
        const invoiceDate = new Date(invoice.invoice_date).setHours(0,0,0,0);
        const toDate = new Date(filters.date_to).setHours(0,0,0,0);
        if (invoiceDate > toDate) return false;
      }
      
      // 12. فلتر المبلغ (من)
      if (filters.amount_min && invoice.total_amount < Number(filters.amount_min)) {
        return false;
      }
      
      // 13. فلتر المبلغ (إلى)
      if (filters.amount_max && invoice.total_amount > Number(filters.amount_max)) {
        return false;
      }
      
      return true;
    });
  }, [invoices, filters]);

  // ========== Filter Handlers ==========
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      payment_status: 'all',
      invoice_type: 'all',
      branch_id: 'all',
      salesman_id: 'all',
      customer_id: 'all',
      warehouse_id: 'all',
      currency_id: 'all',
      tax_id: 'all',
      date_from: '',
      date_to: '',
      amount_min: '',
      amount_max: ''
    });
  };

  const handleRefresh = () => {
    refetch();
    toast.success(language === 'ar' ? 'تم تحديث البيانات' : 'Data refreshed');
  };

  // ========== Helper Functions ==========

  // ✅ دالة عرض طريقة الدفع
  const getPaymentMethodBadge = (method: string) => {
    const methodConfig: Record<string, { label: string; className: string; icon: JSX.Element }> = {
      cash: { 
        label: language === 'ar' ? 'نقدي' : 'Cash', 
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400',
        icon: (
          <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      },
      card: { 
        label: language === 'ar' ? 'بطاقة' : 'Card', 
        className: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400',
        icon: (
          <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )
      },
      wallet: { 
        label: language === 'ar' ? 'محفظة' : 'Wallet', 
        className: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400',
        icon: (
          <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        )
      },
      credit: { 
        label: language === 'ar' ? 'آجل' : 'Credit', 
        className: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400',
        icon: (
          <svg className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )
      }
    };
    const config = methodConfig[method] || methodConfig.cash;
    return (
      <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  // ✅ دالة عرض حالة الدفع
  const getPaymentStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      paid: { 
        label: language === 'ar' ? 'مدفوع' : 'Paid', 
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
      },
      pending: { 
        label: language === 'ar' ? 'معلق' : 'Pending', 
        className: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
      },
      partial: { 
        label: language === 'ar' ? 'جزئي' : 'Partial', 
        className: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400'
      },
      cancelled: { 
        label: language === 'ar' ? 'ملغي' : 'Cancelled', 
        className: 'bg-red-500/10 text-red-600 border-red-200 dark:bg-red-950/30 dark:text-red-400'
      }
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  // ========== Render ==========
  return (
    <>
      <div className="space-y-4">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Receipt className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {language === 'ar' ? 'فواتير المبيعات' : 'Sales Invoices'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? `عرض ${filteredInvoices.length} من أصل ${invoices.length} فاتورة` 
                  : `Showing ${filteredInvoices.length} of ${invoices.length} invoices`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <svg
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 2v6h-6" />
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                <path d="M3 22v-6h6" />
                <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
              </svg>
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            
            <Button 
              onClick={() => setShowForm(true)} 
              className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            >
              <Plus className="h-4 w-4" />
              {language === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}
            </Button>
          </div>
        </div>

        {/* Stats Cards - إحصائيات سريعة مع الفلاتر */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices'}
                </p>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                  {filteredInvoices.length}
                </p>
              </div>
              <div className="p-2 bg-emerald-200/50 dark:bg-emerald-800/30 rounded-lg">
                <Receipt className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  {language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}
                </p>
                <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                  {filteredInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-blue-200/50 dark:bg-blue-800/30 rounded-lg">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                  {language === 'ar' ? 'المدفوع' : 'Paid'}
                </p>
                <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                  {filteredInvoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-amber-200/50 dark:bg-amber-800/30 rounded-lg">
                <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/30 dark:to-red-900/20 border-red-200/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  {language === 'ar' ? 'المتبقي' : 'Remaining'}
                </p>
                <p className="text-2xl font-bold text-red-800 dark:text-red-300">
                  {filteredInvoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-red-200/50 dark:bg-red-800/30 rounded-lg">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar - Manual Filters بالـ JS */}
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="w-1 h-5 bg-primary rounded-full" />
                {language === 'ar' ? 'بحث وتصفية' : 'Search & Filter'}
              </CardTitle>
              
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Search Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'بحث' : 'Search'}
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder={language === 'ar' ? 'رقم الفاتورة، اسم العميل، رقم الهاتف...' : 'Invoice #, customer name, phone...'}
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>

              {/* Payment Status Filter */}
              {/* <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'حالة الدفع' : 'Payment Status'}
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={filters.payment_status}
                  onChange={(e) => handleFilterChange('payment_status', e.target.value)}
                >
                  <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</option>
                  <option value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</option>
                  <option value="partial">{language === 'ar' ? 'جزئي' : 'Partial'}</option>
                  <option value="cancelled">{language === 'ar' ? 'ملغي' : 'Cancelled'}</option>
                </select>
              </div> */}

              {/* Invoice Type Filter */}
              {/* <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'نوع الفاتورة' : 'Invoice Type'}
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={filters.invoice_type}
                  onChange={(e) => handleFilterChange('invoice_type', e.target.value)}
                >
                  <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
                  <option value="cash">{language === 'ar' ? 'نقدي' : 'Cash'}</option>
                  <option value="credit">{language === 'ar' ? 'آجل' : 'Credit'}</option>
                </select>
              </div> */}

              {/* Customer Filter */}
              {/* <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'العميل' : 'Customer'}
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={filters.customer_id}
                  onChange={(e) => handleFilterChange('customer_id', e.target.value)}
                >
                  <option value="all">{language === 'ar' ? 'كل العملاء' : 'All Customers'}</option>
                  {customers.slice(0, 50).map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `- ${c.phone}` : ''}
                    </option>
                  ))}
                </select>
              </div> */}

              {/* Branch Filter */}
              {/* <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'الفرع' : 'Branch'}
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={filters.branch_id}
                  onChange={(e) => handleFilterChange('branch_id', e.target.value)}
                >
                  <option value="all">{language === 'ar' ? 'كل الفروع' : 'All Branches'}</option>
                  {branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div> */}

              {/* Salesman Filter */}
              {/* <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'المندوب' : 'Salesman'}
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={filters.salesman_id}
                  onChange={(e) => handleFilterChange('salesman_id', e.target.value)}
                >
                  <option value="all">{language === 'ar' ? 'كل المندوبين' : 'All Salesmen'}</option>
                  {salesmen.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div> */}

              {/* Date Range */}
              {/* <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'من تاريخ' : 'From Date'}
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                />
              </div> */}

              {/* <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'إلى تاريخ' : 'To Date'}
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                />
              </div> */}

              {/* Amount Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'أقل مبلغ' : 'Min Amount'}
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="0"
                  value={filters.amount_min}
                  onChange={(e) => handleFilterChange('amount_min', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {language === 'ar' ? 'أكبر مبلغ' : 'Max Amount'}
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-md bg-background"
                  placeholder="1000000"
                  value={filters.amount_max}
                  onChange={(e) => handleFilterChange('amount_max', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[150px] font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {language === 'ar' ? 'رقم الفاتورة' : 'INVOICE #'}
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[150px] font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {language === 'ar' ? 'العميل' : 'CUSTOMER'}
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[120px] font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {language === 'ar' ? 'التاريخ' : 'DATE'}
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[100px] text-right font-bold">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {language === 'ar' ? 'الإجمالي' : 'TOTAL'}
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[100px] text-right font-bold">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {language === 'ar' ? 'المدفوع' : 'PAID'}
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[120px] font-bold">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {language === 'ar' ? 'طريقة الدفع' : 'PAYMENT'}
                        </span>
                      </div>
                    </TableHead>
                    <TableHead className="min-w-[150px] text-center font-bold">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {language === 'ar' ? 'الإجراءات' : 'ACTIONS'}
                        </span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    // Skeleton loading
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-5 bg-muted rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-[400px] text-center">
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="p-4 bg-muted/30 rounded-full mb-4">
                            <Receipt className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">
                            {language === 'ar' ? 'لا توجد نتائج' : 'No results found'}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 max-w-md">
                            {language === 'ar' 
                              ? 'لم يتم العثور على فواتير تطابق معايير البحث. حاول تغيير الفلاتر.'
                              : 'No invoices match your search criteria. Try adjusting the filters.'}
                          </p>
                          <Button 
                            variant="outline"
                            onClick={handleResetFilters}
                            className="gap-2"
                          >
                            <X className="h-4 w-4" />
                            {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice: SalesInvoice, index: number) => (
                      <TableRow 
                        key={invoice.id} 
                        className={`
                          group cursor-pointer transition-all duration-200
                          hover:bg-primary/5 hover:shadow-md
                          ${index % 2 === 0 ? 'bg-white dark:bg-gray-950/50' : 'bg-muted/20 dark:bg-gray-900/30'}
                        `}
                        onClick={() => setSelectedInvoice(invoice)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-8 bg-primary/30 rounded-full group-hover:bg-primary transition-colors" />
                            <div>
                              <span className="font-mono font-semibold text-sm">
                                {invoice.invoice_number || '-'}
                              </span>
                              <div className="text-xs text-muted-foreground">
                                ID: #{invoice.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">
                                {invoice.customer?.name?.charAt(0) || 'C'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-sm">
                                {language === 'ar' 
                                  ? invoice.customer?.name_ar || invoice.customer?.name 
                                  : invoice.customer?.name}
                              </div>
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {invoice.customer?.phone || '---'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">
                              {formatDate(invoice.due_date)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(invoice.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col">
                            <span className="font-bold text-primary">
                              {invoice.total_amount?.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {invoice.currency || 'YER'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col">
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {invoice.paid_amount?.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {invoice.currency || 'YER'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {getPaymentMethodBadge(invoice.payment_method)}
                            <div className="ml-1">
                              {getPaymentStatusBadge(invoice.payment_status)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedInvoice(invoice);
                              }}
                              title={language === 'ar' ? 'عرض التفاصيل' : 'View details'}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-600 transition-all"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await fetchInvoiceForReturn(invoice.id);
                              }}
                              title={language === 'ar' ? 'إنشاء مرتجع' : 'Create return'}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <SalesInvoiceForm 
        isOpen={showForm} 
        onClose={() => setShowForm(false)} 
      />

      {selectedInvoice && (
        <InvoiceDetails
          invoice={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      <InvoiceReturnForm
        isOpen={showReturnForm}
        onClose={() => {
          setShowReturnForm(false);
          setSelectedInvoiceForReturn(null);
        }}
        invoiceData={selectedInvoiceForReturn}
      />
    </>
  );
};

export default SalesInvoiceList;