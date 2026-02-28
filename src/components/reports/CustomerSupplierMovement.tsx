import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Users,
  Truck,
  DollarSign,
  TrendingUp,
  Calendar,
  Download,
  Search,
  Eye,
  FileText,
  Wallet,
  Phone,
  Star,
  Filter,
  ChevronDown,
  ChevronUp,
  ArrowUpDown
} from 'lucide-react';
import { format, subMonths, subDays } from 'date-fns';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';

// ==================== Types ====================
interface Customer {
  id: number;
  name: string;
  address: string;
  email: string | null;
  phone: string;
  point: number | null;
  last_paid_amount: number | null;
}

interface CustomerResponse {
  data: Customer[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  address: string;
  tax_number: string;
  note: string | null;
  credit_limit: string;
  payment_terms: number;
  active: number;
  created_at: string;
  updated_at: string;
}

interface SupplierResponse {
  data: Supplier[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface SalesInvoice {
  id: number;
  invoice_number: string;
  customer: {
    id: number;
    name: string;
  };
  sales_representative: {
    id: number | null;
    name: string | null;
  };
  branch: string;
  warehouse: string;
  currency: string | null;
  tax: string | null;
  payment_method: string;
  due_date: string | null;
  note: string | null;
  total_amount: string;
  items: any[];
  created_at: string;
}

interface SalesInvoiceResponse {
  data: SalesInvoice[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier: {
    id: number | null;
    name: string | null;
  };
  branch: string;
  warehouse: string;
  currency: string | null;
  tax: string | null;
  invoice_date: string;
  due_date: string | null;
  payment_method: string;
  note: string | null;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total_amount: string;
  items: any[];
  created_at: string;
}

interface PurchaseInvoiceResponse {
  data: PurchaseInvoice[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface EnrichedCustomer extends Customer {
  totalAmount: number;
  orderCount: number;
  avgOrderValue: number;
  lastPurchaseDate: string | null;
  totalPaid: number;
}

interface EnrichedSupplier extends Supplier {
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  invoiceCount: number;
  lastPurchaseDate: string | null;
}

interface SalesTransaction {
  id: number;
  invoice_number: string;
  total_amount: string;
  created_at: string;
  payment_method: string;
  branch: string;
  currency: string | null;
}

interface PurchaseTransaction {
  id: number;
  invoice_number: string;
  total_amount: string;
  invoice_date: string;
  payment_method: string;
  branch: string;
  currency: string | null;
}

const CustomerSupplierMovement: React.FC = () => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const [activeTab, setActiveTab] = useState('customers');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState('month');
  const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedEntity, setSelectedEntity] = useState<EnrichedCustomer | EnrichedSupplier | null>(null);
  const [sortField, setSortField] = useState<'total' | 'orders' | 'name'>('total');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Get date range based on selection
  const dateRangeObj = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case 'week': 
        return { 
          start: format(subDays(now, 7), 'yyyy-MM-dd'), 
          end: format(now, 'yyyy-MM-dd')
        };
      case 'month': 
        return { 
          start: format(subMonths(now, 1), 'yyyy-MM-dd'), 
          end: format(now, 'yyyy-MM-dd')
        };
      case 'quarter': 
        return { 
          start: format(subMonths(now, 3), 'yyyy-MM-dd'), 
          end: format(now, 'yyyy-MM-dd')
        };
      case 'year': 
        return { 
          start: format(subMonths(now, 12), 'yyyy-MM-dd'), 
          end: format(now, 'yyyy-MM-dd')
        };
      case 'custom': 
        return { 
          start: startDate, 
          end: endDate 
        };
      default: 
        return { 
          start: format(subMonths(now, 1), 'yyyy-MM-dd'), 
          end: format(now, 'yyyy-MM-dd')
        };
    }
  }, [dateRange, startDate, endDate]);

  // ==================== Fetch Customers ====================
  const { data: customers = [], isLoading: loadingCustomers } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      try {
        const response = await api.post<CustomerResponse>('/customer/index');
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error(language === 'ar' ? 'حدث خطأ في جلب العملاء' : 'Error fetching customers');
        return [];
      }
    }
  });

  // ==================== Fetch Suppliers ====================
  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery<Supplier[]>({
    queryKey: ['suppliers'],
    queryFn: async () => {
      try {
        const response = await api.post<SupplierResponse>('/suppliers/index');
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        toast.error(language === 'ar' ? 'حدث خطأ في جلب الموردين' : 'Error fetching suppliers');
        return [];
      }
    }
  });

  // ==================== Fetch Sales Invoices ====================
  const { data: salesInvoices = [] } = useQuery<SalesInvoice[]>({
    queryKey: ['sales-invoices', dateRangeObj.start, dateRangeObj.end],
    queryFn: async () => {
      try {
        const response = await api.post<SalesInvoiceResponse>('/sales-invoices/index', {
          date_from: `${dateRangeObj.start} 00:00:00`,
          date_to: `${dateRangeObj.end} 23:59:59`,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching sales invoices:', error);
        return [];
      }
    }
  });

  // ==================== Fetch Purchase Invoices ====================
  const { data: purchaseInvoices = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ['purchase-invoices', dateRangeObj.start, dateRangeObj.end],
    queryFn: async () => {
      try {
        const response = await api.post<PurchaseInvoiceResponse>('/purchases-invoices/index', {
          date_from: `${dateRangeObj.start} 00:00:00`,
          date_to: `${dateRangeObj.end} 23:59:59`,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching purchase invoices:', error);
        return [];
      }
    }
  });

  // ==================== Enrich Customers with Sales Data ====================
  const enrichedCustomers = useMemo<EnrichedCustomer[]>(() => {
    // Group sales by customer
    const salesByCustomer = salesInvoices.reduce((acc, invoice) => {
      const customerId = invoice.customer.id;
      if (!acc[customerId]) {
        acc[customerId] = {
          totalAmount: 0,
          orderCount: 0,
          totalPaid: 0,
          lastDate: null
        };
      }
      
      const amount = Number(invoice.total_amount) || 0;
      acc[customerId].totalAmount += amount;
      acc[customerId].orderCount += 1;
      
      // Assuming paid amount is total for now (API doesn't have paid_amount)
      acc[customerId].totalPaid += amount;
      
      const invoiceDate = new Date(invoice.created_at);
      if (!acc[customerId].lastDate || invoiceDate > new Date(acc[customerId].lastDate)) {
        acc[customerId].lastDate = invoice.created_at;
      }
      
      return acc;
    }, {} as Record<number, { totalAmount: number; orderCount: number; totalPaid: number; lastDate: string | null }>);

    // Enrich customers with sales data
    return customers.map(customer => {
      const salesData = salesByCustomer[customer.id] || {
        totalAmount: 0,
        orderCount: 0,
        totalPaid: 0,
        lastDate: null
      };
      
      return {
        ...customer,
        totalAmount: salesData.totalAmount,
        orderCount: salesData.orderCount,
        totalPaid: salesData.totalPaid,
        lastPurchaseDate: salesData.lastDate,
        avgOrderValue: salesData.orderCount > 0 ? salesData.totalAmount / salesData.orderCount : 0
      };
    }).sort((a, b) => {
      if (sortField === 'total') return sortDirection === 'desc' ? b.totalAmount - a.totalAmount : a.totalAmount - b.totalAmount;
      if (sortField === 'orders') return sortDirection === 'desc' ? b.orderCount - a.orderCount : a.orderCount - b.orderCount;
      return sortDirection === 'desc' 
        ? (b.name.localeCompare(a.name))
        : (a.name.localeCompare(b.name));
    });
  }, [customers, salesInvoices, sortField, sortDirection]);

  // ==================== Enrich Suppliers with Purchase Data ====================
  const enrichedSuppliers = useMemo<EnrichedSupplier[]>(() => {
    // Group purchases by supplier
    const purchasesBySupplier = purchaseInvoices.reduce((acc, invoice) => {
      const supplierId = invoice.supplier.id;
      if (!supplierId) return acc;
      
      if (!acc[supplierId]) {
        acc[supplierId] = {
          totalAmount: 0,
          invoiceCount: 0,
          paidAmount: 0,
          remainingAmount: 0,
          lastDate: null
        };
      }
      
      const amount = Number(invoice.total_amount) || 0;
      acc[supplierId].totalAmount += amount;
      acc[supplierId].invoiceCount += 1;
      
      // Since API doesn't have paid/remaining, we'll use total for now
      acc[supplierId].paidAmount += amount;
      acc[supplierId].remainingAmount += 0;
      
      const invoiceDate = new Date(invoice.invoice_date);
      if (!acc[supplierId].lastDate || invoiceDate > new Date(acc[supplierId].lastDate!)) {
        acc[supplierId].lastDate = invoice.invoice_date;
      }
      
      return acc;
    }, {} as Record<number, { totalAmount: number; invoiceCount: number; paidAmount: number; remainingAmount: number; lastDate: string | null }>);

    // Enrich suppliers with purchase data
    return suppliers.map(supplier => {
      const purchaseData = purchasesBySupplier[supplier.id] || {
        totalAmount: 0,
        invoiceCount: 0,
        paidAmount: 0,
        remainingAmount: 0,
        lastDate: null
      };
      
      return {
        ...supplier,
        totalAmount: purchaseData.totalAmount,
        invoiceCount: purchaseData.invoiceCount,
        paidAmount: purchaseData.paidAmount,
        remainingAmount: purchaseData.remainingAmount,
        lastPurchaseDate: purchaseData.lastDate
      };
    }).sort((a, b) => {
      if (sortField === 'total') return sortDirection === 'desc' ? b.totalAmount - a.totalAmount : a.totalAmount - b.totalAmount;
      if (sortField === 'orders') return sortDirection === 'desc' ? b.invoiceCount - a.invoiceCount : a.invoiceCount - b.invoiceCount;
      return sortDirection === 'desc' 
        ? (b.name.localeCompare(a.name))
        : (a.name.localeCompare(b.name));
    });
  }, [suppliers, purchaseInvoices, sortField, sortDirection]);

  // ==================== Fetch Customer Transactions ====================
  const { data: customerTransactions = [] } = useQuery<SalesInvoice[]>({
    queryKey: ['customer-transactions', selectedEntity?.id],
    queryFn: async () => {
      if (!selectedEntity || activeTab !== 'customers') return [];
      
      try {
        const response = await api.post<SalesInvoiceResponse>('/sales-invoices/index', {
          customer_id: selectedEntity.id,
          date_from: `${dateRangeObj.start} 00:00:00`,
          date_to: `${dateRangeObj.end} 23:59:59`,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching customer transactions:', error);
        return [];
      }
    },
    enabled: !!selectedEntity && activeTab === 'customers'
  });

  // ==================== Fetch Supplier Transactions ====================
  const { data: supplierTransactions = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ['supplier-transactions', selectedEntity?.id],
    queryFn: async () => {
      if (!selectedEntity || activeTab !== 'suppliers') return [];
      
      try {
        const response = await api.post<PurchaseInvoiceResponse>('/purchases-invoices/index', {
          supplier_id: selectedEntity.id,
          date_from: `${dateRangeObj.start} 00:00:00`,
          date_to: `${dateRangeObj.end} 23:59:59`,
          paginate: false
        });
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching supplier transactions:', error);
        return [];
      }
    },
    enabled: !!selectedEntity && activeTab === 'suppliers'
  });

  // ==================== Filter Functions ====================
  const filteredCustomers = useMemo(() => {
    return enrichedCustomers.filter(c => 
      !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [enrichedCustomers, searchQuery]);

  const filteredSuppliers = useMemo(() => {
    return enrichedSuppliers.filter(s =>
      !searchQuery ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone?.includes(searchQuery) ||
      s.contact_person?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [enrichedSuppliers, searchQuery]);

  // ==================== Stats ====================
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const activeCustomers = enrichedCustomers.filter(c => c.orderCount > 0).length;
    const totalCustomerSales = enrichedCustomers.reduce((sum, c) => sum + c.totalAmount, 0);
    const totalCustomerOrders = enrichedCustomers.reduce((sum, c) => sum + c.orderCount, 0);

    const totalSuppliers = suppliers.length;
    const activeSuppliers = enrichedSuppliers.filter(s => s.invoiceCount > 0).length;
    const totalSupplierPurchases = enrichedSuppliers.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalSupplierInvoices = enrichedSuppliers.reduce((sum, s) => sum + s.invoiceCount, 0);
    const totalRemaining = enrichedSuppliers.reduce((sum, s) => sum + s.remainingAmount, 0);

    return {
      customers: { total: totalCustomers, active: activeCustomers, sales: totalCustomerSales, orders: totalCustomerOrders },
      suppliers: { total: totalSuppliers, active: activeSuppliers, purchases: totalSupplierPurchases, invoices: totalSupplierInvoices, remaining: totalRemaining }
    };
  }, [customers, suppliers, enrichedCustomers, enrichedSuppliers]);

  // ==================== Export Functions ====================
  const handleExport = () => {
    try {
      const data = activeTab === 'customers' ? filteredCustomers : filteredSuppliers;
      const headers = activeTab === 'customers'
        ? ['الاسم', 'الهاتف', 'البريد', 'عدد الطلبات', 'إجمالي المشتريات', 'متوسط الطلب', 'آخر شراء']
        : ['الاسم', 'جهة الاتصال', 'الهاتف', 'عدد الفواتير', 'إجمالي المشتريات', 'المدفوع', 'المتبقي', 'آخر شراء'];

      const rows = data.map(item => {
        if (activeTab === 'customers') {
          const c = item as EnrichedCustomer;
          return [
            c.name,
            c.phone || '-',
            c.email || '-',
            c.orderCount,
            c.totalAmount,
            c.avgOrderValue.toFixed(2),
            c.lastPurchaseDate ? format(new Date(c.lastPurchaseDate), 'yyyy-MM-dd') : '-'
          ];
        } else {
          const s = item as EnrichedSupplier;
          return [
            s.name,
            s.contact_person || '-',
            s.phone || '-',
            s.invoiceCount,
            s.totalAmount,
            s.paidAmount,
            s.remainingAmount,
            s.lastPurchaseDate ? format(new Date(s.lastPurchaseDate), 'yyyy-MM-dd') : '-'
          ];
        }
      });

      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `${activeTab}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      
      toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
    } catch (error) {
      toast.error(language === 'ar' ? 'حدث خطأ في التصدير' : 'Export failed');
    }
  };

  // ==================== Toggle Sort ====================
  const handleSort = (field: 'total' | 'orders' | 'name') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // ==================== Translations ====================
  const t = {
    title: language === 'ar' ? 'حركة العملاء والموردين' : 'Customer & Supplier Movement',
    description: language === 'ar' ? 'تحليل تفصيلي للعلاقات التجارية' : 'Detailed analysis of business relationships',
    customers: language === 'ar' ? 'العملاء' : 'Customers',
    suppliers: language === 'ar' ? 'الموردين' : 'Suppliers',
    search: language === 'ar' ? 'بحث...' : 'Search...',
    week: language === 'ar' ? 'أسبوع' : 'Week',
    month: language === 'ar' ? 'شهر' : 'Month',
    quarter: language === 'ar' ? 'ربع سنة' : 'Quarter',
    year: language === 'ar' ? 'سنة' : 'Year',
    custom: language === 'ar' ? 'مخصص' : 'Custom',
    name: language === 'ar' ? 'الاسم' : 'Name',
    phone: language === 'ar' ? 'الهاتف' : 'Phone',
    email: language === 'ar' ? 'البريد' : 'Email',
    totalAmount: language === 'ar' ? 'إجمالي المبلغ' : 'Total Amount',
    orders: language === 'ar' ? 'الطلبات' : 'Orders',
    invoices: language === 'ar' ? 'الفواتير' : 'Invoices',
    paid: language === 'ar' ? 'المدفوع' : 'Paid',
    remaining: language === 'ar' ? 'المتبقي' : 'Remaining',
    avgOrder: language === 'ar' ? 'متوسط الطلب' : 'Avg Order',
    viewDetails: language === 'ar' ? 'عرض التفاصيل' : 'View Details',
    transactions: language === 'ar' ? 'الحركات' : 'Transactions',
    date: language === 'ar' ? 'التاريخ' : 'Date',
    amount: language === 'ar' ? 'المبلغ' : 'Amount',
    status: language === 'ar' ? 'الحالة' : 'Status',
    export: language === 'ar' ? 'تصدير' : 'Export',
    totalCustomers: language === 'ar' ? 'إجمالي العملاء' : 'Total Customers',
    totalSuppliers: language === 'ar' ? 'إجمالي الموردين' : 'Total Suppliers',
    activeCustomers: language === 'ar' ? 'عملاء نشطين' : 'Active Customers',
    activeSuppliers: language === 'ar' ? 'موردين نشطين' : 'Active Suppliers',
    totalSales: language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales',
    totalPurchases: language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases',
    balance: language === 'ar' ? 'الرصيد' : 'Balance',
    points: language === 'ar' ? 'نقاط' : 'Points',
    contactPerson: language === 'ar' ? 'جهة الاتصال' : 'Contact Person',
    lastPurchase: language === 'ar' ? 'آخر شراء' : 'Last Purchase',
    invoiceNo: language === 'ar' ? 'رقم الفاتورة' : 'Invoice #',
    branch: language === 'ar' ? 'الفرع' : 'Branch',
    paymentMethod: language === 'ar' ? 'طريقة الدفع' : 'Payment Method',
    filter: language === 'ar' ? 'تصفية' : 'Filter',
    sortBy: language === 'ar' ? 'ترتيب حسب' : 'Sort By',
    sortTotal: language === 'ar' ? 'الإجمالي' : 'Total',
    sortOrders: language === 'ar' ? 'عدد الطلبات' : 'Orders',
    sortName: language === 'ar' ? 'الاسم' : 'Name',
    loading: language === 'ar' ? 'جاري التحميل...' : 'Loading...',
  };

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return <ArrowUpDown size={14} className="opacity-50" />;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  if (loadingCustomers || loadingSuppliers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t.title}</h2>
          <p className="text-muted-foreground">{t.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar size={16} className="me-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">{t.week}</SelectItem>
              <SelectItem value="month">{t.month}</SelectItem>
              <SelectItem value="quarter">{t.quarter}</SelectItem>
              <SelectItem value="year">{t.year}</SelectItem>
              <SelectItem value="custom">{t.custom}</SelectItem>
            </SelectContent>
          </Select>
          
          {dateRange === 'custom' && (
            <>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[140px]"
              />
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[140px]"
              />
            </>
          )}

          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={16} className="me-2" />
            {t.export}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={16} className="me-2" />
            {t.filter}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <p className="text-sm font-medium mb-2">{t.sortBy}</p>
                <div className="flex gap-2">
                  <Button
                    variant={sortField === 'total' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSort('total')}
                    className="gap-1"
                  >
                    {t.sortTotal}
                    <SortIcon field="total" />
                  </Button>
                  <Button
                    variant={sortField === 'orders' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSort('orders')}
                    className="gap-1"
                  >
                    {t.sortOrders}
                    <SortIcon field="orders" />
                  </Button>
                  <Button
                    variant={sortField === 'name' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSort('name')}
                    className="gap-1"
                  >
                    {t.sortName}
                    <SortIcon field="name" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="customers" className="gap-2">
            <Users size={16} />
            {t.customers}
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="gap-2">
            <Truck size={16} />
            {t.suppliers}
          </TabsTrigger>
        </TabsList>

        {/* ==================== Customers Tab ==================== */}
        <TabsContent value="customers" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalCustomers}</p>
                    <p className="text-2xl font-bold">{stats.customers.total}</p>
                  </div>
                  <Users className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.activeCustomers}</p>
                    <p className="text-2xl font-bold">{stats.customers.active}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalSales}</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.customers.sales)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-accent opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.orders}</p>
                    <p className="text-2xl font-bold">{stats.customers.orders}</p>
                  </div>
                  <FileText className="h-8 w-8 text-warning opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>

          {/* Customers Table */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>{t.name}</TableHead>
                      <TableHead>{t.phone}</TableHead>
                      <TableHead className="text-center">{t.orders}</TableHead>
                      <TableHead className="text-end">{t.totalAmount}</TableHead>
                      <TableHead className="text-end">{t.avgOrder}</TableHead>
                      <TableHead>{t.lastPurchase}</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-full">
                              <Users size={14} className="text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{customer.name}</p>
                              {customer.point ? (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  <Star size={10} className="me-1" />
                                  {customer.point} {t.points}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={customer.orderCount > 0 ? 'default' : 'secondary'}>
                            {customer.orderCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end font-mono font-medium">
                          {formatCurrency(customer.totalAmount)}
                        </TableCell>
                        <TableCell className="text-end text-muted-foreground">
                          {formatCurrency(customer.avgOrderValue)}
                        </TableCell>
                        <TableCell>
                          {customer.lastPurchaseDate ? (
                            <span className="text-sm">
                              {format(new Date(customer.lastPurchaseDate), 'yyyy-MM-dd')}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedEntity(customer)}
                              >
                                <Eye size={14} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Users size={18} />
                                  {customer.name}
                                </DialogTitle>
                              </DialogHeader>
                              
                              <div className="space-y-4">
                                {/* Customer Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-xs text-muted-foreground">{t.phone}</p>
                                      <p className="font-medium">{customer.phone || '-'}</p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-xs text-muted-foreground">{t.email}</p>
                                      <p className="font-medium">{customer.email || '-'}</p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-xs text-muted-foreground">{t.points}</p>
                                      <p className="font-medium">{customer.point || 0}</p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-xs text-muted-foreground">{t.lastPurchase}</p>
                                      <p className="font-medium">
                                        {customer.lastPurchaseDate 
                                          ? format(new Date(customer.lastPurchaseDate), 'yyyy-MM-dd')
                                          : '-'
                                        }
                                      </p>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid grid-cols-3 gap-4">
                                  <Card className="bg-primary/5">
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.totalAmount}</p>
                                      <p className="text-xl font-bold text-primary">
                                        {formatCurrency(customer.totalAmount)}
                                      </p>
                                    </CardContent>
                                  </Card>
                                  <Card className="bg-success/5">
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.orders}</p>
                                      <p className="text-xl font-bold text-success">
                                        {customer.orderCount}
                                      </p>
                                    </CardContent>
                                  </Card>
                                  <Card className="bg-accent/5">
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.avgOrder}</p>
                                      <p className="text-xl font-bold text-accent">
                                        {formatCurrency(customer.avgOrderValue)}
                                      </p>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Transactions Table */}
                                <div>
                                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <FileText size={16} />
                                    {t.transactions}
                                  </h3>
                                  <ScrollArea className="h-[300px] border rounded-lg">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>{t.date}</TableHead>
                                          <TableHead>{t.invoiceNo}</TableHead>
                                          <TableHead>{t.branch}</TableHead>
                                          <TableHead>{t.paymentMethod}</TableHead>
                                          <TableHead className="text-end">{t.amount}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {customerTransactions.map((tx) => (
                                          <TableRow key={tx.id}>
                                            <TableCell>
                                              {format(new Date(tx.created_at), 'yyyy-MM-dd HH:mm')}
                                            </TableCell>
                                            <TableCell className="font-mono">{tx.invoice_number}</TableCell>
                                            <TableCell>{tx.branch}</TableCell>
                                            <TableCell>
                                              <Badge variant="outline">
                                                {tx.payment_method === 'cash' ? (language === 'ar' ? 'نقدي' : 'Cash') :
                                                 tx.payment_method === 'card' ? (language === 'ar' ? 'بطاقة' : 'Card') :
                                                 tx.payment_method === 'wallet' ? (language === 'ar' ? 'محفظة' : 'Wallet') :
                                                 tx.payment_method}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-end font-mono">
                                              {formatCurrency(Number(tx.total_amount))}
                                              {tx.currency && (
                                                <span className="text-xs text-muted-foreground ms-1">
                                                  {tx.currency}
                                                </span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                        {customerTransactions.length === 0 && (
                                          <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                              {t.noData}
                                            </TableCell>
                                          </TableRow>
                                        )}
                                      </TableBody>
                                    </Table>
                                  </ScrollArea>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== Suppliers Tab ==================== */}
        <TabsContent value="suppliers" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalSuppliers}</p>
                    <p className="text-2xl font-bold">{stats.suppliers.total}</p>
                  </div>
                  <Truck className="h-8 w-8 text-primary opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.activeSuppliers}</p>
                    <p className="text-2xl font-bold">{stats.suppliers.active}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-success opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalPurchases}</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats.suppliers.purchases)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-accent opacity-50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.remaining}</p>
                    <p className="text-2xl font-bold text-destructive">
                      {formatCurrency(stats.suppliers.remaining)}
                    </p>
                  </div>
                  <Wallet className="h-8 w-8 text-destructive opacity-50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>

          {/* Suppliers Table */}
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-card z-10">
                    <TableRow>
                      <TableHead>{t.name}</TableHead>
                      <TableHead>{t.contactPerson}</TableHead>
                      <TableHead>{t.phone}</TableHead>
                      <TableHead className="text-center">{t.invoices}</TableHead>
                      <TableHead className="text-end">{t.totalAmount}</TableHead>
                      <TableHead className="text-end text-success">{t.paid}</TableHead>
                      <TableHead className="text-end text-destructive">{t.remaining}</TableHead>
                      <TableHead>{t.lastPurchase}</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSuppliers.map((supplier) => (
                      <TableRow key={supplier.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-accent/10 rounded-full">
                              <Truck size={14} className="text-accent" />
                            </div>
                            <p className="font-medium">{supplier.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>{supplier.contact_person || '-'}</TableCell>
                        <TableCell>{supplier.phone || '-'}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={supplier.invoiceCount > 0 ? 'default' : 'secondary'}>
                            {supplier.invoiceCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-end font-mono font-medium">
                          {formatCurrency(supplier.totalAmount)}
                        </TableCell>
                        <TableCell className="text-end font-mono text-success">
                          {formatCurrency(supplier.paidAmount)}
                        </TableCell>
                        <TableCell className="text-end font-mono text-destructive">
                          {formatCurrency(supplier.remainingAmount)}
                        </TableCell>
                        <TableCell>
                          {supplier.lastPurchaseDate ? (
                            <span className="text-sm">
                              {format(new Date(supplier.lastPurchaseDate), 'yyyy-MM-dd')}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setSelectedEntity(supplier)}
                              >
                                <Eye size={14} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <Truck size={18} />
                                  {supplier.name}
                                </DialogTitle>
                              </DialogHeader>

                              <div className="space-y-4">
                                {/* Supplier Info */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-xs text-muted-foreground">{t.contactPerson}</p>
                                      <p className="font-medium">{supplier.contact_person || '-'}</p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-xs text-muted-foreground">{t.phone}</p>
                                      <p className="font-medium">{supplier.phone || '-'}</p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-xs text-muted-foreground">{t.remaining}</p>
                                      <p className="font-medium text-destructive">
                                        {formatCurrency(supplier.remainingAmount)}
                                      </p>
                                    </CardContent>
                                  </Card>
                                  <Card>
                                    <CardContent className="pt-4">
                                      <p className="text-xs text-muted-foreground">الحد الائتماني</p>
                                      <p className="font-medium">{formatCurrency(Number(supplier.credit_limit))}</p>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Stats Cards */}
                                <div className="grid grid-cols-3 gap-4">
                                  <Card className="bg-primary/5">
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.totalAmount}</p>
                                      <p className="text-xl font-bold text-primary">
                                        {formatCurrency(supplier.totalAmount)}
                                      </p>
                                    </CardContent>
                                  </Card>
                                  <Card className="bg-success/5">
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.paid}</p>
                                      <p className="text-xl font-bold text-success">
                                        {formatCurrency(supplier.paidAmount)}
                                      </p>
                                    </CardContent>
                                  </Card>
                                  <Card className="bg-destructive/5">
                                    <CardContent className="pt-4">
                                      <p className="text-sm text-muted-foreground">{t.remaining}</p>
                                      <p className="text-xl font-bold text-destructive">
                                        {formatCurrency(supplier.remainingAmount)}
                                      </p>
                                    </CardContent>
                                  </Card>
                                </div>

                                {/* Transactions Table */}
                                <div>
                                  <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                                    <FileText size={16} />
                                    {t.transactions}
                                  </h3>
                                  <ScrollArea className="h-[300px] border rounded-lg">
                                    <Table>
                                      <TableHeader>
                                        <TableRow>
                                          <TableHead>{t.date}</TableHead>
                                          <TableHead>{t.invoiceNo}</TableHead>
                                          <TableHead>{t.branch}</TableHead>
                                          <TableHead>{t.paymentMethod}</TableHead>
                                          <TableHead className="text-end">{t.amount}</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {supplierTransactions.map((tx) => (
                                          <TableRow key={tx.id}>
                                            <TableCell>
                                              {format(new Date(tx.invoice_date), 'yyyy-MM-dd')}
                                            </TableCell>
                                            <TableCell className="font-mono">{tx.invoice_number}</TableCell>
                                            <TableCell>{tx.branch}</TableCell>
                                            <TableCell>
                                              <Badge variant="outline">
                                                {tx.payment_method === 'cash' ? (language === 'ar' ? 'نقدي' : 'Cash') :
                                                 tx.payment_method === 'card' ? (language === 'ar' ? 'بطاقة' : 'Card') :
                                                 tx.payment_method === 'bank_transfer' ? (language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer') :
                                                 tx.payment_method === 'credit' ? (language === 'ar' ? 'آجل' : 'Credit') :
                                                 tx.payment_method}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-end font-mono">
                                              {formatCurrency(Number(tx.total_amount))}
                                              {tx.currency && (
                                                <span className="text-xs text-muted-foreground ms-1">
                                                  {tx.currency}
                                                </span>
                                              )}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                        {supplierTransactions.length === 0 && (
                                          <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                                              {t.noData}
                                            </TableCell>
                                          </TableRow>
                                        )}
                                      </TableBody>
                                    </Table>
                                  </ScrollArea>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerSupplierMovement;