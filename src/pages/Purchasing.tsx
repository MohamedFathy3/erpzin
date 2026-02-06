import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import SupplierForm from '@/components/purchasing/SupplierForm';
import SupplierDetails from '@/components/purchasing/SupplierDetails';
import PurchaseInvoiceForm from '@/components/purchasing/PurchaseInvoiceForm';
import SupplierPaymentForm from '@/components/purchasing/SupplierPaymentForm';
import PurchaseOrderList from '@/components/purchasing/PurchaseOrderList';
import PurchaseReturnsList from '@/components/purchasing/PurchaseReturnsList';
import AdvancedFilter, { FilterField, FilterValues } from '@/components/ui/advanced-filter';
import { cn, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

import {
  Plus, FileText, Building2, Phone,
  Wallet, Receipt, ShoppingCart, RotateCcw
} from 'lucide-react';

// Interfaces for API response
interface Customer {
  id: number;
  name: string;
}

interface Amounts {
  total: string;
  paid: string;
  remaining: string;
}

interface Item {
  product_id: number;
  product_name: string;
  color: string | null;
  size: string | null;
  quantity: number;
  price: string;
  total: string;
}

interface Payment {
  method: string;
  amount: string;
}

interface Invoice {
  id: number;
  invoice_number: string | null;
  status: string;
  customer: Customer;
  amounts: Amounts;
  items: Item[];
  payments: Payment[];
  created_at: string;
}

interface Links {
  first: string;
  last: string;
  prev: string | null;
  next: string | null;
}

interface Meta {
  current_page: number;
  from: number;
  last_page: number;
  path: string;
  per_page: number;
  to: number;
  total: number;
}

interface InvoicesIndexResponse {
  data: Invoice[];
  links: Links;
  meta: Meta;
  result: string;
  message: string;
  status: number;
}

interface InvoiceTableRow {
  id: number;
  invoice_number: string | null;
  supplier: string;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  invoice_date: string;
}

interface Supplier {
  id: string;
  name: string;
  name_ar: string;
  phone: string;
  balance: number;
  created_at: string;
  updated_at: string;
  address: string;
  contact_person: string;
  credit_limit: number;
  email: string;
  is_active: boolean;
  payment_terms: number;
  tax_number: string;
};

interface PurchaseInvoice {
  id: string;
  invoice_number: string | null;
  total_amount: number;
  paid_amount: number;
  payment_status: string;
  invoice_date: string;
  suppliers?: {
    name: string;
    name_ar?: string;
  };
}

interface InvoiceFilters {
  search?: string;
  payment_status?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
}

type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overpaid';

const paymentStatusLabel = (status: PaymentStatus) => {
  switch (status) {
    case 'paid':
      return 'مدفوع';
    case 'partial':
      return 'مدفوع جزئيًا';
    case 'unpaid':
      return 'غير مدفوع';
    case 'overpaid':
      return 'مدفوع بزيادة';
  }
};

const getPaymentStatus = (remaining: number): PaymentStatus => {
  if (remaining === 0) {
    return 'paid';
  }

  if (remaining > 0) {
    return 'partial'; // لسه في فلوس
  }

  return 'overpaid'; // remaining < 0
};

// Mapping function
const mapInvoiceToTableRow = (invoice: Invoice): InvoiceTableRow => {
  const remaining = parseFloat(invoice.amounts.remaining);
  const payment_status = getPaymentStatus(remaining);

  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    supplier: invoice.customer.name,
    total_amount: parseFloat(invoice.amounts.total),
    paid_amount: parseFloat(invoice.amounts.paid),
    payment_status,
    invoice_date: invoice.created_at,
  };
};


const Purchasing = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoiceFilters, setInvoiceFilters] = useState<FilterValues>({});
  const [supplierFilters, setSupplierFilters] = useState<FilterValues>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllInvoices, setShowAllInvoices] = useState(false);

  // Modals
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);


  const { data: invoicesResponse, isLoading: invoicesLoading } = useQuery<InvoicesIndexResponse>({
    queryKey: ['invoices', currentPage, invoiceFilters, showAllInvoices],
    queryFn: async () => {
      try {
        // Build request body for filtering and pagination
        const requestBody: Partial<InvoiceFilters & { page: number; per_page?: number }> = {};

        if (!showAllInvoices) {
          requestBody.page = currentPage;
          requestBody.per_page = 10; // Default page size
        } else {
          // When showing all, request a large number of items
          requestBody.per_page = 10000; // Large number to get all items
        }

        if (invoiceFilters.search) {
          requestBody.search = invoiceFilters.search;
        }
        if (invoiceFilters.payment_status && invoiceFilters.payment_status !== 'all') {
          requestBody.payment_status = invoiceFilters.payment_status;
        }
        if (invoiceFilters.date_from) {
          requestBody.date_from = invoiceFilters.date_from.split('T')[0];
        }
        if (invoiceFilters.date_to) {
          requestBody.date_to = invoiceFilters.date_to.split('T')[0];
        }
        if (invoiceFilters.amount_min) {
          requestBody.amount_min = invoiceFilters.amount_min;
        }
        if (invoiceFilters.amount_max) {
          requestBody.amount_max = invoiceFilters.amount_max;
        }

        const response = await api.post<InvoicesIndexResponse>('/invoices/index', requestBody);

        if (response.data.result === 'Success') {
          return response.data;
        }

        throw new Error(response.data.message || 'Failed to fetch invoices');
      } catch (error) {
        console.error('Error fetching invoices:', error);

        toast({
          title:
            language === 'ar'
              ? 'خطأ في جلب الفواتير'
              : 'Error fetching invoices',
          variant: 'destructive',
        });

        throw error;
      }
    },
  });

  const rawInvoicesList = invoicesResponse?.data || [];
  const paginationMeta = invoicesResponse?.meta;

  // Apply client-side filtering
  const invoicesList: InvoiceTableRow[] = rawInvoicesList
    .filter((invoice) => {
      // Search filter - search through all invoice data
      if (invoiceFilters.search) {
        const searchTerm = invoiceFilters.search.toLowerCase();
        const searchableText = [
          invoice.invoice_number?.toString() || '',
          invoice.customer.name,
          invoice.status,
          invoice.amounts.total,
          invoice.amounts.paid,
          invoice.amounts.remaining,
          ...invoice.items.flatMap(item => [
            item.product_name,
            item.color || '',
            item.size || '',
            item.quantity.toString(),
            item.price,
            item.total
          ]),
          ...invoice.payments.flatMap(payment => [
            payment.method,
            payment.amount
          ]),
          invoice.created_at
        ].join(' ').toLowerCase();

        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }

      // Payment status filter
      if (invoiceFilters.payment_status && invoiceFilters.payment_status !== 'all') {
        const remaining = parseFloat(invoice.amounts.remaining);
        let currentStatus: PaymentStatus = 'unpaid';
        if (remaining === 0) {
          currentStatus = 'paid';
        } else if (remaining > 0) {
          currentStatus = 'partial';
        } else {
          currentStatus = 'overpaid';
        }

        if (currentStatus !== invoiceFilters.payment_status) {
          return false;
        }
      }

      // Date range filter
      if (invoiceFilters.date_from || invoiceFilters.date_to) {
        const invoiceDate = new Date(invoice.created_at.split(' ')[0]);

        if (invoiceFilters.date_from) {
          const fromDate = new Date(invoiceFilters.date_from.split('T')[0]);
          if (invoiceDate < fromDate) {
            return false;
          }
        }

        if (invoiceFilters.date_to) {
          const toDate = new Date(invoiceFilters.date_to.split('T')[0]);
          if (invoiceDate > toDate) {
            return false;
          }
        }
      }

      // Amount range filter
      if (invoiceFilters.amount_min || invoiceFilters.amount_max) {
        const totalAmount = parseFloat(invoice.amounts.total);

        if (invoiceFilters.amount_min) {
          const minAmount = parseFloat(invoiceFilters.amount_min);
          if (totalAmount < minAmount) {
            return false;
          }
        }

        if (invoiceFilters.amount_max) {
          const maxAmount = parseFloat(invoiceFilters.amount_max);
          if (totalAmount > maxAmount) {
            return false;
          }
        }
      }

      return true;
    })
    .map(mapInvoiceToTableRow);

  // Fetch suppliers
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Invoice filter fields
  const invoiceFilterFields: FilterField[] = [
    { key: 'search', label: 'Invoice/Supplier', labelAr: 'الفاتورة/المورد', type: 'text', placeholder: 'Search...', placeholderAr: 'بحث...' },
    {
      key: 'payment_status', label: 'Payment Status', labelAr: 'حالة الدفع', type: 'select', options: [
        { value: 'paid', label: 'Paid', labelAr: 'مدفوع' },
        { value: 'partial', label: 'Partial', labelAr: 'مدفوع جزئيًا' },
        { value: 'unpaid', label: 'Unpaid', labelAr: 'غير مدفوع' },
        { value: 'overpaid', label: 'Overpaid', labelAr: 'مدفوع بزيادة' },
      ]
    },
    { key: 'date', label: 'Date', labelAr: 'التاريخ', type: 'dateRange' },
    { key: 'amount', label: 'Amount', labelAr: 'المبلغ', type: 'numberRange' },
  ];

  // Supplier filter fields
  const supplierFilterFields: FilterField[] = [
    { key: 'search', label: 'Name/Phone', labelAr: 'الاسم/الهاتف', type: 'text', placeholder: 'Search...', placeholderAr: 'بحث...' },
    { key: 'balance', label: 'Balance', labelAr: 'الرصيد', type: 'numberRange' },
  ];

  // Fetch purchase invoices
  const { data: invoices = [] } = useQuery<PurchaseInvoice[]>({
    queryKey: ['purchase_invoices', invoiceFilters],
    queryFn: async () => {
      let query = supabase
        .from('purchase_invoices')
        .select('*, suppliers(name, name_ar)')
        .order('created_at', { ascending: false });

      if (invoiceFilters.search) {
        query = query.or(`invoice_number.ilike.%${invoiceFilters.search}%`);
      }
      if (invoiceFilters.payment_status && invoiceFilters.payment_status !== 'all') {
        query = query.eq('payment_status', invoiceFilters.payment_status);
      }
      if (invoiceFilters.date_from) {
        query = query.gte('invoice_date', invoiceFilters.date_from.split('T')[0]);
      }
      if (invoiceFilters.date_to) {
        query = query.lte('invoice_date', invoiceFilters.date_to.split('T')[0]);
      }
      if (invoiceFilters.amount_min) {
        query = query.gte('total_amount', Number(invoiceFilters.amount_min));
      }
      if (invoiceFilters.amount_max) {
        query = query.lte('total_amount', Number(invoiceFilters.amount_max));
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    }
  });

  // Fetch purchase orders
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchase_orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*, suppliers(name, name_ar)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Fetch purchase returns
  const { data: purchaseReturnsResponse } = useQuery({
    queryKey: ['purchase-returns'],
    queryFn: async () => {
      try {
        const response = await api.post('/return-invoices/index', {});
        if (response.data.result === 'Success') {
          return response.data.data;
        }
        throw new Error(response.data.message || 'Failed to fetch returns');
      } catch (error) {
        console.error('Error fetching returns:', error);
        return [];
      }
    }
  });

  const purchaseReturns = purchaseReturnsResponse || [];

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['purchase_invoices'] });
    queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const totalReturns = purchaseReturns.reduce((sum, ret) => sum + Number(ret.total_amount || 0), 0);

  const totalBalance = suppliers.reduce((sum, s) => sum + Number(s.balance || 0), 0);
  const totalPurchaseValue = invoicesList.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

  const stats = [
    { label: language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices', value: paginationMeta?.total || 0, icon: <FileText className="text-primary" size={24} />, color: 'bg-primary/10' },
    { label: language === 'ar' ? 'قيمة المشتريات' : 'Purchase Value', value: `${totalPurchaseValue.toLocaleString()} YER`, icon: <Receipt className="text-chart-2" size={24} />, color: 'bg-chart-2/10' },
    { label: language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns', value: purchaseReturns.length, icon: <RotateCcw className="text-warning" size={24} />, color: 'bg-warning/10' },
    { label: language === 'ar' ? 'أوامر الشراء' : 'Orders', value: purchaseOrders.length, icon: <ShoppingCart className="text-chart-3" size={24} />, color: 'bg-chart-3/10' },
    { label: language === 'ar' ? 'المستحق للموردين' : 'Payables', value: `${totalBalance.toLocaleString()} YER`, icon: <Wallet className="text-destructive" size={24} />, color: 'bg-destructive/10' },
  ];

  return (
    <MainLayout activeItem="purchasing">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{language === 'ar' ? 'إدارة المشتريات والموردين' : 'Purchasing & Suppliers'}</h1>
            <p className="text-muted-foreground">{language === 'ar' ? 'إدارة فواتير الشراء والموردين والمدفوعات' : 'Manage purchase invoices, suppliers and payments'}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => setShowPaymentForm(true)}>
              <Wallet size={16} className="me-2" />
              {language === 'ar' ? 'تسجيل دفعة' : 'Record Payment'}
            </Button>
            <Button onClick={() => setShowInvoiceForm(true)} className="bg-primary">
              <Plus size={16} className="me-2" />
              {language === 'ar' ? 'فاتورة شراء' : 'Purchase Invoice'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${stat.color}`}>{stat.icon}</div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="invoices" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText size={16} className="me-2" />
              {language === 'ar' ? 'فواتير الشراء' : 'Invoices'}
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-emerald-100 data-[state=active]:text-emerald-800 dark:data-[state=active]:bg-emerald-900 dark:data-[state=active]:text-emerald-100">
              <ShoppingCart size={16} className="me-2" />
              {language === 'ar' ? 'أوامر الشراء' : 'Orders'}
            </TabsTrigger>
            <TabsTrigger value="returns" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800 dark:data-[state=active]:bg-orange-900 dark:data-[state=active]:text-orange-100">
              <RotateCcw size={16} className="me-2" />
              {language === 'ar' ? 'المرتجعات' : 'Returns'}
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-800 dark:data-[state=active]:bg-violet-900 dark:data-[state=active]:text-violet-100">
              <Building2 size={16} className="me-2" />
              {language === 'ar' ? 'الموردين' : 'Suppliers'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <AdvancedFilter
                  fields={invoiceFilterFields}
                  values={invoiceFilters}
                  onChange={setInvoiceFilters}
                  onReset={() => setInvoiceFilters({})}
                  language={language}
                />
              </CardHeader>
              <CardContent>
                {/* invoices List  */}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                      <TableHead>{language === 'ar' ? 'المدفوع' : 'Paid'}</TableHead>
                      <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                      <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoicesList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          {language === 'ar' ? 'لا توجد فواتير' : 'No invoices yet'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoicesList.map((inv: InvoiceTableRow, index: number) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-muted-foreground">{index + 1}</TableCell>
                          <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                          <TableCell>{inv.supplier}</TableCell>
                          <TableCell>{Number(inv.total_amount).toLocaleString()} YER</TableCell>
                          <TableCell>{Number(inv.paid_amount).toLocaleString()} YER</TableCell>
                          <TableCell>
                            <Badge variant={
                              inv.payment_status === 'paid' ? 'default' :
                                inv.payment_status === 'partial' ? 'secondary' :
                                  inv.payment_status === 'overpaid' ? 'outline' : 'destructive'
                            }>
                              {language === 'ar' ? paymentStatusLabel(inv.payment_status as PaymentStatus) :
                                inv.payment_status.charAt(0).toUpperCase() + inv.payment_status.slice(1)
                              }
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {(paginationMeta && paginationMeta.last_page > 1) || showAllInvoices ? (
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {showAllInvoices ? (
                          language === 'ar'
                            ? `عرض جميع الفواتير (${paginationMeta?.total || 0})`
                            : `Showing all invoices (${paginationMeta?.total || 0})`
                        ) : (
                          language === 'ar'
                            ? `عرض ${paginationMeta?.from} إلى ${paginationMeta?.to} من ${paginationMeta?.total} فاتورة`
                            : `Showing ${paginationMeta?.from} to ${paginationMeta?.to} of ${paginationMeta?.total} invoices`
                        )}
                      </div>
                      {!showAllInvoices && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAllInvoices(true);
                            setCurrentPage(1);
                          }}
                          disabled={invoicesLoading}
                        >
                          {language === 'ar' ? 'عرض الكل' : 'Show All'}
                        </Button>
                      )}
                      {showAllInvoices && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowAllInvoices(false);
                            setCurrentPage(1);
                          }}
                          disabled={invoicesLoading}
                        >
                          {language === 'ar' ? 'عرض بالصفحات' : 'Paginate'}
                        </Button>
                      )}
                    </div>
                    {!showAllInvoices && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1 || invoicesLoading}
                        >
                          {language === 'ar' ? 'السابق' : 'Previous'}
                        </Button>

                        {/* Page numbers */}
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, paginationMeta?.last_page || 1) }, (_, i) => {
                            const pageNum = Math.max(1, Math.min((paginationMeta?.last_page || 1) - 4, currentPage - 2)) + i;
                            if (pageNum > (paginationMeta?.last_page || 1)) return null;
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                disabled={invoicesLoading}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(paginationMeta?.last_page || 1, prev + 1))}
                          disabled={currentPage === (paginationMeta?.last_page || 1) || invoicesLoading}
                        >
                          {language === 'ar' ? 'التالي' : 'Next'}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suppliers" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <AdvancedFilter
                      fields={supplierFilterFields}
                      values={supplierFilters}
                      onChange={setSupplierFilters}
                      onReset={() => setSupplierFilters({})}
                      language={language}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={() => { setSelectedSupplier(null); setShowSupplierForm(true); }}>
                      <Plus size={18} className="me-2" />
                      {language === 'ar' ? 'مورد جديد' : 'New Supplier'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {suppliers.filter((s: Supplier) => {
                    if (supplierFilters.search) {
                      const search = supplierFilters.search.toLowerCase();
                      if (!s.name?.toLowerCase().includes(search) && !s.name_ar?.includes(search) && !s.phone?.includes(search)) return false;
                    }
                    if (supplierFilters.balance_min && Number(s.balance || 0) < Number(supplierFilters.balance_min)) return false;
                    if (supplierFilters.balance_max && Number(s.balance || 0) > Number(supplierFilters.balance_max)) return false;
                    return true;
                  }).map((supplier: Supplier) => (
                    <Card key={supplier.id} className="border hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedSupplier(supplier); setShowSupplierDetails(true); }}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg bg-primary/10"><Building2 className="text-primary" size={20} /></div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-foreground truncate">{language === 'ar' ? supplier.name_ar || supplier.name : supplier.name}</h3>
                            {supplier.phone && <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground"><Phone size={14} /><span dir="ltr">{supplier.phone}</span></div>}
                            <div className="flex items-center justify-between mt-2 pt-2 border-t">
                              <span className="text-xs text-muted-foreground">{language === 'ar' ? 'الرصيد' : 'Balance'}</span>
                              <span className={cn("font-semibold", Number(supplier.balance) > 0 ? "text-destructive" : "text-success")}>{Number(supplier.balance || 0).toLocaleString()} YER</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <Card className="shadow-md border-border">
              <CardContent className="p-4">
                <PurchaseOrderList />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="returns" className="mt-4">
            <PurchaseReturnsList />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <SupplierForm isOpen={showSupplierForm} onClose={() => setShowSupplierForm(false)} onSave={refetchAll} editSupplier={selectedSupplier} />
      <SupplierDetails isOpen={showSupplierDetails} onClose={() => setShowSupplierDetails(false)} supplier={selectedSupplier} onEdit={() => { setShowSupplierDetails(false); setShowSupplierForm(true); }} />
      <PurchaseInvoiceForm isOpen={showInvoiceForm} onClose={() => setShowInvoiceForm(false)} onSave={refetchAll} />
      <SupplierPaymentForm isOpen={showPaymentForm} onClose={() => setShowPaymentForm(false)} onSave={refetchAll} />
    </MainLayout>
  );
};

export default Purchasing;
