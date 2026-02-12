import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Receipt } from "lucide-react";
import { formatDate } from "@/lib/utils";
import SalesInvoiceForm from "./SalesInvoiceForm";
import InvoiceDetails from "./InvoiceDetails";
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
  const [filterValues, setFilterValues] = useState<FilterValues>({});

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

  // ✅ جلب فواتير المبيعات - POST /sales-invoices/index
  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['sales-invoices', filterValues],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 100,
          paginate: false,
          with: ['customer', 'sales_representative', 'branch', 'warehouse', 'currency', 'tax']
        };

        // إضافة الفلاتر
        const filters: any = {};

        if (filterValues.search) {
          filters.search = filterValues.search;
        }

        if (filterValues.payment_status && filterValues.payment_status !== 'all') {
          filters.payment_status = filterValues.payment_status;
        }

        if (filterValues.invoice_type && filterValues.invoice_type !== 'all') {
          filters.invoice_type = filterValues.invoice_type;
        }

        if (filterValues.branch_id && filterValues.branch_id !== 'all') {
          filters.branch_id = Number(filterValues.branch_id);
        }

        if (filterValues.salesman_id && filterValues.salesman_id !== 'all') {
          filters.sales_representative_id = Number(filterValues.salesman_id);
        }

        if (filterValues.customer_id && filterValues.customer_id !== 'all') {
          filters.customer_id = Number(filterValues.customer_id);
        }

        if (filterValues.warehouse_id && filterValues.warehouse_id !== 'all') {
          filters.warehouse_id = Number(filterValues.warehouse_id);
        }

        if (filterValues.currency_id && filterValues.currency_id !== 'all') {
          filters.currency_id = Number(filterValues.currency_id);
        }

        if (filterValues.tax_id && filterValues.tax_id !== 'all') {
          filters.tax_id = Number(filterValues.tax_id);
        }

        if (filterValues.date_from) {
          filters.date_from = filterValues.date_from.split('T')[0];
        }

        if (filterValues.date_to) {
          filters.date_to = filterValues.date_to.split('T')[0];
        }

        if (filterValues.amount_min) {
          filters.amount_min = Number(filterValues.amount_min);
        }

        if (filterValues.amount_max) {
          filters.amount_max = Number(filterValues.amount_max);
        }

        if (Object.keys(filters).length > 0) {
          payload.filters = filters;
        }

        console.log('📦 Fetching sales invoices with payload:', payload);

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

  // ========== Filter Fields ==========

  const filterFields: FilterField[] = [
    { 
      key: 'search', 
      label: 'Invoice/Customer', 
      labelAr: 'الفاتورة/العميل', 
      type: 'text', 
      placeholder: 'Search...', 
      placeholderAr: 'بحث...' 
    },
    { 
      key: 'payment_status', 
      label: 'Payment Status', 
      labelAr: 'حالة الدفع', 
      type: 'select', 
      options: [
        { value: 'all', label: 'All', labelAr: ' الكل ' },
        { value: 'paid', label: 'Paid', labelAr: 'مدفوع' },
        { value: 'pending', label: 'Pending', labelAr: 'معلق' },
        { value: 'partial', label: 'Partial', labelAr: 'جزئي' },
        { value: 'cancelled', label: 'Cancelled', labelAr: 'ملغي' },
      ]
    },
    { 
      key: 'invoice_type', 
      label: 'Invoice Type', 
      labelAr: 'نوع الفاتورة', 
      type: 'select', 
      options: [
        { value: 'all', label: 'All', labelAr: 'الكل' },
        { value: 'cash', label: 'Cash', labelAr: 'نقدي' },
        { value: 'credit', label: 'Credit', labelAr: 'آجل' },
      ]
    },
    { 
      key: 'branch_id', 
      label: 'Branch', 
      labelAr: 'الفرع', 
      type: 'select', 
      options: [
        { value: 'all', label: 'All Branches', labelAr: 'جميع الفروع' },
        ...branches.map((b: any) => ({ 
          value: b.id.toString(), 
          label: b.name, 
          labelAr: b.name_ar || b.name 
        }))
      ]
    },
    { 
      key: 'salesman_id', 
      label: 'Salesman', 
      labelAr: 'المندوب', 
      type: 'select', 
      options: [
        { value: 'all', label: 'All Salesmen', labelAr: 'جميع المندوبين' },
        ...salesmen.map((s: any) => ({ 
          value: s.id.toString(), 
          label: s.name, 
          labelAr: s.name_ar || s.name 
        }))
      ]
    },
    { 
      key: 'customer_id', 
      label: 'Customer', 
      labelAr: 'العميل', 
      type: 'select', 
      options: [
        { value: 'all', label: 'All Customers', labelAr: 'جميع العملاء' },
        ...customers.slice(0, 50).map((c: any) => ({ 
          value: c.id.toString(), 
          label: c.name, 
          labelAr: c.name_ar || c.name 
        }))
      ]
    },
    { 
      key: 'warehouse_id', 
      label: 'Warehouse', 
      labelAr: 'المخزن', 
      type: 'select', 
      options: [
        { value: 'all', label: 'All Warehouses', labelAr: 'جميع المخازن' },
        ...warehouses.map((w: any) => ({ 
          value: w.id.toString(), 
          label: w.name, 
          labelAr: w.name_ar || w.name 
        }))
      ]
    },
    { 
      key: 'currency_id', 
      label: 'Currency', 
      labelAr: 'العملة', 
      type: 'select', 
      options: [
        { value: 'all', label: 'All Currencies', labelAr: 'جميع العملات' },
        ...currencies.map((c: any) => ({ 
          value: c.id.toString(), 
          label: `${c.name} (${c.code})`, 
          labelAr: `${c.name} (${c.code})` 
        }))
      ]
    },
    { 
      key: 'tax_id', 
      label: 'Tax', 
      labelAr: 'الضريبة', 
      type: 'select', 
      options: [
        { value: 'all', label: 'All Taxes', labelAr: 'جميع الضرائب' },
        ...taxes.map((t: any) => ({ 
          value: t.id.toString(), 
          label: `${t.name} (${t.rate}%)`, 
          labelAr: `${t.name_ar || t.name} (${t.rate}%)` 
        }))
      ]
    },
    { 
      key: 'date', 
      label: 'Date', 
      labelAr: 'التاريخ', 
      type: 'dateRange' 
    },
    { 
      key: 'amount', 
      label: 'Amount', 
      labelAr: 'المبلغ', 
      type: 'numberRange' 
    },
  ];

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

  const handleResetFilters = () => {
    setFilterValues({});
  };

  const handleRefresh = () => {
    refetch();
    toast.success(language === 'ar' ? 'تم تحديث البيانات' : 'Data refreshed');
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
                  ? `عرض ${invoices.length} فاتورة` 
                  : `Showing ${invoices.length} invoices`}
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

        {/* Stats Cards - إحصائيات سريعة */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  {language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices'}
                </p>
                <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                  {invoices.length}
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
                  {invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0).toLocaleString()}
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
                  {invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0).toLocaleString()}
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
                  {invoices.reduce((sum, inv) => sum + (inv.remaining_amount || 0), 0).toLocaleString()}
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

        {/* Advanced Filter */}
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-1 h-5 bg-primary rounded-full" />
              {language === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdvancedFilter
              fields={filterFields}
              values={filterValues}
              onChange={setFilterValues}
              onReset={handleResetFilters}
              language={language}
            />
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
                  
                 
                    <TableHead className="min-w-[100px] text-center font-bold">
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
                        {Array.from({ length: 8 }).map((_, j) => (
                          <TableCell key={j}>
                            <div className="h-5 bg-muted rounded animate-pulse" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-[400px] text-center">
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="p-4 bg-muted/30 rounded-full mb-4">
                            <Receipt className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                          <h3 className="text-lg font-semibold mb-2">
                            {language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 max-w-md">
                            {language === 'ar' 
                              ? 'لم يتم إنشاء أي فواتير مبيعات بعد. ابدأ بإنشاء أول فاتورة الآن.'
                              : 'No sales invoices have been created yet. Start by creating your first invoice.'}
                          </p>
                          <Button 
                            onClick={() => setShowForm(true)}
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            {language === 'ar' ? 'إنشاء فاتورة' : 'Create Invoice'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice: SalesInvoice, index: number) => (
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
                            <span className={`font-medium ${
                              invoice.remaining_amount > 0 
                                ? 'text-red-600 dark:text-red-400' 
                                : 'text-green-600 dark:text-green-400'
                            }`}>
                              {invoice.total_amount?.toLocaleString()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {invoice?.currency || 'YER'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getPaymentMethodBadge(invoice.payment_method)}
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
                            >
                              <Eye className="h-4 w-4" />
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
    </>
  );
};

export default SalesInvoiceList;