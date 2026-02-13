import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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

// ========== أنواع البيانات من API ==========

interface Supplier {
  id: number;
  name: string;
  name_ar?: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  tax_number?: string;
  credit_limit?: string;
  payment_terms?: number;
  active: boolean;
  balance?: number;
  created_at?: string;
  updated_at?: string;
}

interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier: {
    id: number;
    name: string;
  };
  branch: string;
  warehouse: string;
  currency: string;
  tax: string;
  invoice_date: string;
  due_date: string;
  payment_method: string;
  note: string | null;
  subtotal: string;
  discount_total: string;
  tax_total: string;
  total_amount: string;
  items: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
    price: string;
    discount: string;
    tax: string;
    total: string;
  }>;
  created_at: string;
}

interface PurchaseInvoicesResponse {
  data: PurchaseInvoice[];
  links: {
    first: string;
    last: string;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  result: string;
  message: string;
  status: number;
}

interface PurchaseOrdersResponse {
  data: any[];
  meta?: {
    total?: number;
    current_page?: number;
    last_page?: number;
    per_page?: number;
    from?: number;
    to?: number;
  };
}

interface PurchaseReturnsResponse {
  data: any[];
  meta?: {
    total?: number;
    current_page?: number;
    last_page?: number;
    per_page?: number;
    from?: number;
    to?: number;
  };
}

interface InvoiceTableRow {
  id: number;
  invoice_number: string;
  supplier: string;
  total_amount: number;
  payment_method: string;
  invoice_date: string;
  due_date: string;
  items_count: number;
}

type PaymentStatus = 'paid' | 'partial' | 'unpaid' | 'overpaid';

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

  // ========== جلب فواتير الشراء مع Pagination ==========
  const { 
    data: invoicesResponse, 
    isLoading: invoicesLoading,
    refetch: refetchInvoices 
  } = useQuery<PurchaseInvoicesResponse>({
    queryKey: ['purchase-invoices', currentPage, invoiceFilters, showAllInvoices],
    queryFn: async () => {
      try {
        // تجهيز الـ payload مع Pagination
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: showAllInvoices ? 10000 : 10, // لو showAllInvoices نجيب كل الفواتير
          paginate: !showAllInvoices, // Pagination فقط لو مش showAllInvoices
          page: showAllInvoices ? 1 : currentPage, // الصفحة الحالية
        };

        // إضافة الفلاتر
        const filters: any = {};

        if (invoiceFilters.search) {
          filters.invoice_number = invoiceFilters.search;
        }

        if (invoiceFilters.date_from) {
          filters.date_from = invoiceFilters.date_from.split('T')[0];
        }

        if (invoiceFilters.date_to) {
          filters.date_to = invoiceFilters.date_to.split('T')[0];
        }

        if (invoiceFilters.amount_min) {
          filters.amount_min = Number(invoiceFilters.amount_min);
        }

        if (invoiceFilters.amount_max) {
          filters.amount_max = Number(invoiceFilters.amount_max);
        }

        if (Object.keys(filters).length > 0) {
          payload.filters = filters;
        }

        console.log('📦 Fetching purchase invoices with payload:', payload);

        const response = await api.post<PurchaseInvoicesResponse>('/purchases-invoices/index', payload);

        if (response.data.result === 'Success') {
          return response.data;
        }

        throw new Error(response.data.message || 'Failed to fetch invoices');
      } catch (error) {
        console.error('Error fetching invoices:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب الفواتير' : 'Error fetching invoices',
          variant: 'destructive',
        });
        throw error;
      }
    },
  });

  // تحويل البيانات إلى الشكل المطلوب للجدول
  const invoicesList: InvoiceTableRow[] = (invoicesResponse?.data || []).map((invoice: PurchaseInvoice) => ({
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    supplier: invoice.supplier.name,
    total_amount: parseFloat(invoice.total_amount),
    payment_method: invoice.payment_method,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    items_count: invoice.items.length,
  }));

  const paginationMeta = invoicesResponse?.meta;

  // ========== جلب الموردين ==========
  const { 
    data: suppliers = [], 
    isLoading: suppliersLoading,
    refetch: refetchSuppliers 
  } = useQuery<Supplier[]>({
    queryKey: ['suppliers', supplierFilters],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'name',
          orderByDirection: 'asc',
          perPage: 1000,
          paginate: false,
        };

        const filters: any = { active: true };

        if (supplierFilters.search) {
          filters.search = supplierFilters.search;
        }

        if (supplierFilters.balance_min || supplierFilters.balance_max) {
          filters.balance = {};
          if (supplierFilters.balance_min) {
            filters.balance.min = Number(supplierFilters.balance_min);
          }
          if (supplierFilters.balance_max) {
            filters.balance.max = Number(supplierFilters.balance_max);
          }
        }

        if (Object.keys(filters).length > 0) {
          payload.filters = filters;
        }

        const response = await api.post('/suppliers/index', payload);

        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching suppliers:', error);
        return [];
      }
    },
  });

  // ========== جلب أوامر الشراء ==========
  const { data: purchaseOrdersResponse } = useQuery<PurchaseOrdersResponse>({
    queryKey: ['purchase_orders_stats'],
    queryFn: async () => {
      try {
        const response = await api.post('/purchases-orders/index', {
          perPage: 10000,
          paginate: false,
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching purchase orders:', error);
        return { data: [] };
      }
    },
  });

  const purchaseOrders = purchaseOrdersResponse?.data || [];
  const purchaseOrdersCount = purchaseOrdersResponse?.meta?.total || purchaseOrders.length;

  // ========== جلب مرتجعات الشراء ==========
  const { data: purchaseReturnsResponse } = useQuery<PurchaseReturnsResponse>({
    queryKey: ['purchase-returns'],
    queryFn: async () => {
      try {
        const response = await api.post('/return-invoices/index', {
          perPage: 10000,
          paginate: false,
        });
        return response.data;
      } catch (error) {
        console.error('Error fetching returns:', error);
        return { data: [] };
      }
    },
  });

  const purchaseReturns = purchaseReturnsResponse?.data || [];
  const purchaseReturnsCount = purchaseReturnsResponse?.meta?.total || purchaseReturns.length;
  const totalReturns = purchaseReturns.reduce((sum: number, ret: any) => sum + Number(ret.total_amount || 0), 0);

  // ========== حساب الإحصائيات ==========
  const totalBalance = suppliers.reduce((sum: number, s: Supplier) => sum + Number(s.balance || 0), 0);
  const totalPurchaseValue = invoicesList.reduce((sum: number, inv: InvoiceTableRow) => sum + Number(inv.total_amount || 0), 0);

  const stats = [
    { 
      label: language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices', 
      value: paginationMeta?.total || 0, 
      icon: <FileText className="text-primary" size={24} />, 
      color: 'bg-primary/10' 
    },
    { 
      label: language === 'ar' ? 'قيمة المشتريات' : 'Purchase Value', 
      value: `${totalPurchaseValue.toLocaleString()} YER`, 
      icon: <Receipt className="text-chart-2" size={24} />, 
      color: 'bg-chart-2/10' 
    },
    { 
      label: language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns', 
      value: purchaseReturnsCount, 
      icon: <RotateCcw className="text-warning" size={24} />, 
      color: 'bg-warning/10' 
    },
    { 
      label: language === 'ar' ? 'أوامر الشراء' : 'Orders', 
      value: purchaseOrdersCount, 
      icon: <ShoppingCart className="text-chart-3" size={24} />, 
      color: 'bg-chart-3/10' 
    },
    { 
      label: language === 'ar' ? 'المستحق للموردين' : 'Payables', 
      value: `${totalBalance.toLocaleString()} YER`, 
      icon: <Wallet className="text-destructive" size={24} />, 
      color: 'bg-destructive/10' 
    },
  ];

  // ========== دالة تحديث الكل ==========
  const refetchAll = () => {
    refetchInvoices();
    refetchSuppliers();
    queryClient.invalidateQueries({ queryKey: ['purchase_orders_stats'] });
    queryClient.invalidateQueries({ queryKey: ['purchase-returns'] });
  };

  // ========== Invoice filter fields ==========
  const invoiceFilterFields: FilterField[] = [
    { 
      key: 'search', 
      label: 'Supplier', 
      labelAr: 'الفاتورة/', 
      type: 'text', 
      placeholder: 'Search...', 
      placeholderAr: 'بحث...' 
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

  // ========== Supplier filter fields ==========
  const supplierFilterFields: FilterField[] = [
    { 
      key: 'search', 
      label: 'Name/Phone', 
      labelAr: 'الاسم/الهاتف', 
      type: 'text', 
      placeholder: 'Search...', 
      placeholderAr: 'بحث...' 
    },
    { 
      key: 'balance', 
      label: 'Balance', 
      labelAr: 'الرصيد', 
      type: 'numberRange' 
    },
  ];

  // ========== دالة ترجمة حالة الدفع ==========
  const getPaymentMethodLabel = (method: string): string => {
    const methods: Record<string, { en: string; ar: string }> = {
      cash: { en: 'Cash', ar: 'نقداً' },
      credit: { en: 'Credit', ar: 'آجل' },
      card: { en: 'Card', ar: 'بطاقة' },
      bank_transfer: { en: 'Bank Transfer', ar: 'تحويل بنكي' },
    };
    return language === 'ar' 
      ? (methods[method]?.ar || method) 
      : (methods[method]?.en || method);
  };

  return (
    <MainLayout activeItem="purchasing">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {language === 'ar' ? 'إدارة المشتريات والموردين' : 'Purchasing & Suppliers'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' ? 'إدارة فواتير الشراء والموردين والمدفوعات' : 'Manage purchase invoices, suppliers and payments'}
            </p>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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

          {/* ========== فواتير الشراء ========== */}
          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col gap-3">
                  <AdvancedFilter
                    fields={invoiceFilterFields}
                    values={invoiceFilters}
                    onChange={setInvoiceFilters}
                    onReset={() => {
                      setInvoiceFilters({});
                      setCurrentPage(1);
                    }}
                    language={language}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">#</TableHead>
                        <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                        <TableHead>{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</TableHead>
                        <TableHead>{language === 'ar' ? 'عدد الأصناف' : 'Items'}</TableHead>
                        <TableHead>{language === 'ar' ? 'تاريخ الفاتورة' : 'Invoice Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoicesLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : invoicesList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            {language === 'ar' ? 'لا توجد فواتير' : 'No invoices yet'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        invoicesList.map((inv: InvoiceTableRow, index: number) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-mono text-muted-foreground">
                              {paginationMeta?.from ? paginationMeta.from + index : index + 1}
                            </TableCell>
                            <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                            <TableCell>{inv.supplier}</TableCell>
                            <TableCell className="font-semibold">{inv.total_amount.toLocaleString()} YER</TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getPaymentMethodLabel(inv.payment_method)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{inv.items_count}</TableCell>
                            <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                            <TableCell>{inv.due_date ? formatDate(inv.due_date) : '-'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                {paginationMeta && paginationMeta.last_page > 0 && (
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-4">
                      <div className="text-sm text-muted-foreground">
                        {showAllInvoices ? (
                          language === 'ar'
                            ? `عرض جميع الفواتير (${paginationMeta.total})`
                            : `Showing all invoices (${paginationMeta.total})`
                        ) : (
                          language === 'ar'
                            ? `عرض ${paginationMeta.from || 0} إلى ${paginationMeta.to || 0} من ${paginationMeta.total} فاتورة`
                            : `Showing ${paginationMeta.from || 0} to ${paginationMeta.to || 0} of ${paginationMeta.total} invoices`
                        )}
                      </div>
                      {!showAllInvoices && paginationMeta.last_page > 1 && (
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
                      {showAllInvoices && paginationMeta.last_page > 1 && (
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

                    {!showAllInvoices && paginationMeta.last_page > 1 && (
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
                          {Array.from({ length: Math.min(5, paginationMeta.last_page) }, (_, i) => {
                            let pageNum: number;
                            if (paginationMeta.last_page <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= paginationMeta.last_page - 2) {
                              pageNum = paginationMeta.last_page - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            if (pageNum > 0 && pageNum <= paginationMeta.last_page) {
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentPage(pageNum)}
                                  disabled={invoicesLoading}
                                  className="w-8 h-8 p-0"
                                >
                                  {pageNum}
                                </Button>
                              );
                            }
                            return null;
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(paginationMeta.last_page, prev + 1))}
                          disabled={currentPage === paginationMeta.last_page || invoicesLoading}
                        >
                          {language === 'ar' ? 'التالي' : 'Next'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== أوامر الشراء ========== */}
          <TabsContent value="orders" className="mt-4">
            <Card className="shadow-md border-border">
              <CardContent className="p-4">
                <PurchaseOrderList onSave={refetchAll} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ========== المرتجعات ========== */}
          <TabsContent value="returns" className="mt-4">
            <PurchaseReturnsList />
          </TabsContent>

          {/* ========== الموردين ========== */}
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
                {suppliersLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {suppliers
                      .filter((s: Supplier) => {
                        if (supplierFilters.search) {
                          const search = supplierFilters.search.toLowerCase();
                          if (!s.name?.toLowerCase().includes(search) && 
                              !s.name_ar?.includes(search) && 
                              !s.phone?.includes(search)) return false;
                        }
                        if (supplierFilters.balance_min && Number(s.balance || 0) < Number(supplierFilters.balance_min)) return false;
                        if (supplierFilters.balance_max && Number(s.balance || 0) > Number(supplierFilters.balance_max)) return false;
                        return true;
                      })
                      .map((supplier: Supplier) => (
                        <Card 
                          key={supplier.id} 
                          className="border hover:shadow-md transition-shadow cursor-pointer" 
                          onClick={() => { 
                            setSelectedSupplier(supplier); 
                            setShowSupplierDetails(true); 
                          }}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Building2 className="text-primary" size={20} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground truncate">
                                  {language === 'ar' ? supplier.name_ar || supplier.name : supplier.name}
                                </h3>
                                {supplier.phone && (
                                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                    <Phone size={14} />
                                    <span dir="ltr">{supplier.phone}</span>
                                  </div>
                                )}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                                  <span className="text-xs text-muted-foreground">
                                    {language === 'ar' ? 'الرصيد' : 'Balance'}
                                  </span>
                                  <span className={cn(
                                    "font-semibold", 
                                    Number(supplier.balance) > 0 ? "text-destructive" : "text-success"
                                  )}>
                                    {Number(supplier.balance || 0).toLocaleString()} YER
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <SupplierForm 
        isOpen={showSupplierForm} 
        onClose={() => setShowSupplierForm(false)} 
        onSave={refetchAll} 
        editSupplier={selectedSupplier} 
      />
      <SupplierDetails 
        isOpen={showSupplierDetails} 
        onClose={() => setShowSupplierDetails(false)} 
        supplier={selectedSupplier} 
        onEdit={() => { 
          setShowSupplierDetails(false); 
          setShowSupplierForm(true); 
        }} 
      />
      <PurchaseInvoiceForm 
        isOpen={showInvoiceForm} 
        onClose={() => setShowInvoiceForm(false)} 
        onSave={refetchAll} 
      />
      <SupplierPaymentForm 
        isOpen={showPaymentForm} 
        onClose={() => setShowPaymentForm(false)} 
        onSave={refetchAll} 
      />
    </MainLayout>
  );
};

export default Purchasing;