import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import SupplierForm from '@/components/purchasing/SupplierForm';
import SupplierDetails from '@/components/purchasing/SupplierDetails';
import PurchaseInvoiceForm from '@/components/purchasing/PurchaseInvoiceForm';
import PurchaseReturnsList from '@/components/purchasing/PurchaseReturnsList';
import PurchaseReturnForm from '@/components/purchasing/PurchaseReturnForm';
import AdvancedFilter, { FilterField, FilterValues } from '@/components/ui/advanced-filter';
import { cn, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useReactToPrint } from 'react-to-print';
import PurchaseInvoiceTemplate from '@/components/purchasing/PurchaseInvoiceTemplate';

import {
  Plus, FileText, Building2, Phone,
  Wallet, Receipt, RotateCcw,
  Eye, Calendar, DollarSign, Package, Trash2, Printer, Edit2, Landmark
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ========== أنواع البيانات من API (موحدة) ==========

interface Supplier {
  id: number;
  name: string;
  name_ar?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_number?: string;
  credit_limit?: number;
  payment_terms?: number;
  active?: number;
  note?: string;
  balance?: number;
  created_at?: string;
  updated_at?: string;
}

// ✅ نوع موحد للفاتورة (نفس الـ Resource)
interface PurchaseInvoice {
  id: number;
  invoice_number: string;
  supplier: {
    id: number;
    name: string;
    name_ar?: string;
  };
  branch: {
    id: number;
    name: string;
    name_ar?: string;
  };
  warehouse: {
    id: number;
    name: string;
    name_ar?: string;
  };
  treasury: {
    id: number;
    name: string;
    name_ar?: string;
    is_main?: boolean;
  } | null;
  currency: {
    id: number;
    name: string;
    code: string;
    symbol: string;
  };
  tax: {
    id: number;
    name: string;
    rate: string;
  } | null;
  invoice_date: string;
  due_date: string;
  payment_method: string;
  note: string | null;
  subtotal: number;
  paid_amount: number;
  discount_total: number;
  tax_total: number;
  total_amount: number;
  remaining_amount: number;
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    product_name_ar?: string;
    product_sku: string;
    product_variant_id?: number;
    variant_details?: {
      size?: string;
      color?: string;
    } | null;
    quantity: number;
    price: number;
    discount: number;
    tax: number;
    total: number;
  }>;
  created_at: string;
  updated_at: string;
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

interface PurchaseInvoiceDetailsResponse {
  data: PurchaseInvoice;
  result: string;
  message: string;
  status: number;
}

interface InvoiceTableRow {
  id: number;
  invoice_number: string;
  supplier_name: string;
  treasury_name: string;
  total_amount: number;
  payment_method: string;
  invoice_date: string;
  due_date: string;
  items_count: number;
  paid_amount: number;
  remaining_amount: number;
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

const Purchasing = () => {
  const { language } = useLanguage();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoiceFilters, setInvoiceFilters] = useState<FilterValues>({});
  const [supplierFilters, setSupplierFilters] = useState<FilterValues>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const invoicePrintRef = useRef<HTMLDivElement>(null);
  const [showPrint, setShowPrint] = useState(false);

  // Modals
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [showSupplierDetails, setShowSupplierDetails] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showInvoiceDetails, setShowInvoiceDetails] = useState(false);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [showEditInvoiceForm, setShowEditInvoiceForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<PurchaseInvoice | null>(null);

  // دالة الطباعة
  const handlePrint = useReactToPrint({
    contentRef: invoicePrintRef,
    documentTitle: `فاتورة-شراء-${selectedInvoiceId}`,
    onAfterPrint: () => {
      setShowPrint(false);
    },
  });

  // ========== جلب الفواتير ==========
  const {
    data: invoicesResponse,
    isLoading: invoicesLoading,
    refetch: refetchInvoices
  } = useQuery<PurchaseInvoicesResponse>({
    queryKey: ['purchase-invoices', currentPage, invoiceFilters, showAllInvoices],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: showAllInvoices ? 10000 : 10,
          paginate: !showAllInvoices,
          page: showAllInvoices ? 1 : currentPage,
        };

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

  // ✅ تحويل البيانات إلى الشكل المطلوب للجدول (مباشرة من الـ API)
  const invoicesList: InvoiceTableRow[] = (invoicesResponse?.data || []).map((invoice: PurchaseInvoice) => ({
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    supplier_name: language === 'ar' 
      ? invoice.supplier.name_ar || invoice.supplier.name 
      : invoice.supplier.name,
    treasury_name: invoice.treasury 
      ? (language === 'ar' ? invoice.treasury.name_ar || invoice.treasury.name : invoice.treasury.name)
      : '-',
    total_amount: invoice.total_amount,
    payment_method: invoice.payment_method,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    items_count: invoice.items?.length || 0,
    paid_amount: invoice.paid_amount,
    remaining_amount: invoice.remaining_amount,
  }));

  const paginationMeta = invoicesResponse?.meta;

  // ========== جلب تفاصيل الفاتورة عند الضغط عليها ==========
  const { data: invoiceDetails, isLoading: invoiceDetailsLoading } = useQuery<PurchaseInvoiceDetailsResponse>({
    queryKey: ['purchase-invoice-details', selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) throw new Error('No invoice selected');

      try {
        const response = await api.get(`/purchases-invoices/${selectedInvoiceId}`);

        if (response.data.result === 'Success') {
          return response.data;
        }

        throw new Error(response.data.message || 'Failed to fetch invoice details');
      } catch (error) {
        console.error('Error fetching invoice details:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب تفاصيل الفاتورة' : 'Error fetching invoice details',
          variant: 'destructive',
        });
        throw error;
      }
    },
    enabled: !!selectedInvoiceId && showInvoiceDetails,
  });

  // ========== حذف الفاتورة ==========


  // ========== حذف المورد ==========
  const deleteSupplierMutation = useMutation({
    mutationFn: async (supplierId: number) => {
      const response = await api.delete('/suppliers/delete', {
        data: { items: [supplierId] }
      });

      return response.data;
    },
    onSuccess: (data) => {
      if (data.result === 'Success') {
        toast({
          title: language === 'ar' ? 'تم حذف المورد بنجاح' : 'Supplier deleted successfully',
          variant: 'default',
        });
        refetchSuppliers();
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      } else {
        toast({
          title: language === 'ar' ? 'فشل في حذف المورد' : 'Failed to delete supplier',
          description: data.message,
          variant: 'destructive',
        });
      }
    },
    onError: (error: any) => {
      console.error('Error deleting supplier:', error);
      toast({
        title: language === 'ar' ? 'خطأ في حذف المورد' : 'Error deleting supplier',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  // ========== تحويل بيانات الفاتورة لتناسب قالب الطباعة ==========
  const getPrintData = () => {
    if (!invoiceDetails?.data) return null;

    const data = invoiceDetails.data;
    
    return {
      id: data.id.toString(),
      invoice_number: data.invoice_number,
      date: data.invoice_date,
      supplier: {
        name: data.supplier.name,
        nameAr: data.supplier.name_ar || data.supplier.name,
        phone: '',
        tax_number: '',
      },
      cashierName: user?.name || 'المدير',
      branchName: data.branch.name,
      branchPhone: '',
      branchAddress: '',
      taxRate: data.tax ? parseFloat(data.tax.rate) : 0,
      items: data.items.map(item => ({
        name: item.product_name,
        nameAr: item.product_name_ar || item.product_name,
        quantity: item.quantity,
        price: item.price,
        sizeName: item.variant_details?.size || '',
        sizeNameAr: item.variant_details?.size || '',
        colorName: item.variant_details?.color || '',
        colorNameAr: item.variant_details?.color || '',
        discount_percent: item.discount,
        tax_percent: item.tax,
      })),
      subtotal: data.subtotal,
      tax: data.tax_total,
      discount_total: data.discount_total,
      total: data.total_amount,
      paid_amount: data.paid_amount,
      remaining_amount: data.remaining_amount,
      payment_method: data.payment_method,
      notes: data.note || '',
    };
  };

  // معالج الطباعة
  const handlePrintClick = () => {
    if (!invoiceDetails?.data) return;
    
    setShowPrint(true);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

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
          filters.name = supplierFilters.search;
        }

        if (supplierFilters.balance_min || supplierFilters.balance_max) {
          if (supplierFilters.balance_min) {
            filters.credit_limit = Number(supplierFilters.balance_min);
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

  const purchaseOrdersCount = purchaseOrdersResponse?.meta?.total || purchaseOrdersResponse?.data?.length || 0;

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

  const purchaseReturnsCount = purchaseReturnsResponse?.meta?.total || purchaseReturnsResponse?.data?.length || 0;

  // ========== حساب الإحصائيات ==========
  const totalBalance = suppliers.reduce((sum: number, s: Supplier) => sum + Number(s.credit_limit || 0), 0);
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
      label: 'Invoice/Supplier',
      labelAr: 'الفاتورة/المورد',
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

  // ========== دالة ترجمة طريقة الدفع ==========
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

  // ========== دالة تنسيق الأرقام ==========
  const formatAmount = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return isNaN(num) ? '0' : num.toLocaleString();
  };

  // معالج التعديل
  const handleEditInvoice = (invoice: PurchaseInvoice) => {
    setEditingInvoice(invoice);
    setShowEditInvoiceForm(true);
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
            <Button
              onClick={() => setShowInvoiceForm(true)}
              className="bg-primary"
            >
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
                        <TableHead>{language === 'ar' ? 'الخزينة' : 'Treasury'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المدفوع' : 'Paid'}</TableHead>
                        <TableHead>{language === 'ar' ? 'المتبقي' : 'Remaining'}</TableHead>
                        <TableHead>{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الأصناف' : 'Items'}</TableHead>
                        <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                        <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoicesLoading ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : invoicesList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
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
                            <TableCell>{inv.supplier_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Landmark size={14} className="text-muted-foreground" />
                                <span className="text-sm">{inv.treasury_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{inv.total_amount.toLocaleString()} YER</TableCell>
                            <TableCell className="text-success font-medium">{inv.paid_amount.toLocaleString()} YER</TableCell>
                            <TableCell className={inv.remaining_amount > 0 ? 'text-warning font-medium' : 'text-muted-foreground'}>
                              {inv.remaining_amount > 0 ? inv.remaining_amount.toLocaleString() : '-'} YER
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {getPaymentMethodLabel(inv.payment_method)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">{inv.items_count}</TableCell>
                            <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedInvoiceId(inv.id);
                                    setShowInvoiceDetails(true);
                                  }}
                                  className="h-8 w-8 p-0"
                                  title={language === 'ar' ? 'عرض' : 'View'}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const fullInvoice = invoicesResponse?.data.find(i => i.id === inv.id);
                                    if (fullInvoice) {
                                      handleEditInvoice(fullInvoice);
                                    }
                                  }}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  title={language === 'ar' ? 'تعديل' : 'Edit'}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedInvoiceId(inv.id);
                                    setShowReturnForm(true);
                                  }}
                                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  title={language === 'ar' ? 'إنشاء مرتجع' : 'Create Return'}
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

                {/* Pagination */}
                {paginationMeta && paginationMeta.last_page > 1 && (
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
                          disabled={currentPage === 1}
                        >
                          {language === 'ar' ? 'السابق' : 'Previous'}
                        </Button>

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

                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(pageNum)}
                                className="w-8 h-8 p-0"
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(paginationMeta.last_page, prev + 1))}
                          disabled={currentPage === paginationMeta.last_page}
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
                    {suppliers.map((supplier: Supplier) => (
                      <Card
                        key={supplier.id}
                        className="border hover:shadow-md transition-shadow cursor-pointer relative"
                        onClick={() => {
                          setSelectedSupplier(supplier);
                          setShowSupplierDetails(true);
                        }}
                      >
                        <CardContent className="p-4">
                          {/* Delete Button */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المورد؟' : 'Are you sure you want to delete this supplier?')) {
                                deleteSupplierMutation.mutate(Number(supplier.id));
                              }
                            }}
                            className="absolute top-2 right-2 h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deleteSupplierMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>

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
                                  {language === 'ar' ? 'الرصيد' : 'Credit Limit'}
                                </span>
                                <span className={cn(
                                  "font-semibold",
                                  Number(supplier.credit_limit) > 0 ? "text-destructive" : "text-success"
                                )}>
                                  {Number(supplier.credit_limit || 0).toLocaleString()} YER
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

      {/* ========== Modal عرض تفاصيل الفاتورة ========== */}
      <Dialog open={showInvoiceDetails} onOpenChange={setShowInvoiceDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {language === 'ar' ? 'تفاصيل فاتورة الشراء' : 'Purchase Invoice Details'}
                <span className="font-mono text-muted-foreground">
                  #{invoiceDetails?.data?.invoice_number || selectedInvoiceId}
                </span>
              </DialogTitle>
              {invoiceDetails?.data && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintClick}
                  className="gap-2"
                >
                  <Printer size={16} />
                  {language === 'ar' ? 'طباعة' : 'Print'}
                </Button>
              )}
            </div>
          </DialogHeader>

          {invoiceDetailsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : invoiceDetails?.data ? (
            <div className="space-y-4">
              {/* Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {language === 'ar' ? 'المورد' : 'Supplier'}
                    </div>
                    <div className="font-medium">
                      {language === 'ar' 
                        ? invoiceDetails.data.supplier.name_ar || invoiceDetails.data.supplier.name
                        : invoiceDetails.data.supplier.name}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {language === 'ar' ? 'الإجمالي' : 'Total'}
                    </div>
                    <div className="font-bold text-lg text-primary">
                      {formatAmount(invoiceDetails.data.total_amount)} YER
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {language === 'ar' ? 'عدد الأصناف' : 'Items'}
                    </div>
                    <div className="font-medium text-lg">
                      {invoiceDetails.data.items.length}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {language === 'ar' ? 'التاريخ' : 'Date'}
                    </div>
                    <div className="font-medium">
                      {formatDate(invoiceDetails.data.invoice_date)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'الفرع' : 'Branch'}
                  </p>
                  <p className="font-medium">
                    {language === 'ar' 
                      ? invoiceDetails.data.branch.name_ar || invoiceDetails.data.branch.name
                      : invoiceDetails.data.branch.name}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'المستودع' : 'Warehouse'}
                  </p>
                  <p className="font-medium">
                    {language === 'ar' 
                      ? invoiceDetails.data.warehouse.name_ar || invoiceDetails.data.warehouse.name
                      : invoiceDetails.data.warehouse.name}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'الخزينة' : 'Treasury'}
                  </p>
                  <p className="font-medium flex items-center gap-1">
                    <Landmark size={14} className="text-primary" />
                    {invoiceDetails.data.treasury 
                      ? (language === 'ar' 
                        ? invoiceDetails.data.treasury.name_ar || invoiceDetails.data.treasury.name 
                        : invoiceDetails.data.treasury.name)
                      : '-'
                    }
                    {invoiceDetails.data.treasury?.is_main && (
                      <Badge variant="outline" className="text-[10px] bg-primary/10">
                        {language === 'ar' ? 'رئيسية' : 'Main'}
                      </Badge>
                    )}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'العملة' : 'Currency'}
                  </p>
                  <p className="font-medium">{invoiceDetails.data.currency.code} - {invoiceDetails.data.currency.symbol}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'الضريبة' : 'Tax'}
                  </p>
                  <p className="font-medium">
                    {invoiceDetails.data.tax 
                      ? `${invoiceDetails.data.tax.name} (${invoiceDetails.data.tax.rate}%)`
                      : '-'
                    }
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'طريقة الدفع' : 'Payment'}
                  </p>
                  <p className="font-medium">{getPaymentMethodLabel(invoiceDetails.data.payment_method)}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
                  </p>
                  <p className="font-medium">{invoiceDetails.data.due_date ? formatDate(invoiceDetails.data.due_date) : '-'}</p>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-success/10 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'المدفوع' : 'Paid'}
                  </p>
                  <p className="font-bold text-success">{formatAmount(invoiceDetails.data.paid_amount)} YER</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'المتبقي' : 'Remaining'}
                  </p>
                  <p className="font-bold text-warning">{formatAmount(invoiceDetails.data.remaining_amount)} YER</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}
                  </p>
                  <p className="font-bold">{invoiceDetails.data.due_date ? formatDate(invoiceDetails.data.due_date) : '-'}</p>
                </div>
              </div>

              {/* Note */}
              {invoiceDetails.data.note && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'ar' ? 'ملاحظات' : 'Notes'}
                  </p>
                  <p className="text-sm">{invoiceDetails.data.note}</p>
                </div>
              )}

              {/* Items Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {language === 'ar' ? 'الأصناف' : 'Items'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-16">#</TableHead>
                          <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                          <TableHead>{language === 'ar' ? 'المواصفات' : 'Specs'}</TableHead>
                          <TableHead className="text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                          <TableHead className="text-right">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                          <TableHead className="text-right">{language === 'ar' ? 'الخصم' : 'Disc'}</TableHead>
                          <TableHead className="text-right">{language === 'ar' ? 'الضريبة' : 'Tax'}</TableHead>
                          <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoiceDetails.data.items.map((item, idx) => (
                          <TableRow key={item.id}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium">
                              {language === 'ar' ? item.product_name_ar || item.product_name : item.product_name}
                              <div className="text-xs text-muted-foreground">{item.product_sku}</div>
                            </TableCell>
                            <TableCell>
                              {item.variant_details && (
                                <div className="text-xs">
                                  {item.variant_details.size && <span>📏 {item.variant_details.size}</span>}
                                  {item.variant_details.color && <span> 🎨 {item.variant_details.color}</span>}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatAmount(item.price)}</TableCell>
                            <TableCell className="text-right text-destructive">{item.discount > 0 ? `${item.discount}%` : '-'}</TableCell>
                            <TableCell className="text-right">{item.tax > 0 ? `${item.tax}%` : '-'}</TableCell>
                            <TableCell className="text-right font-semibold">{formatAmount(item.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totals Summary */}
                  <div className="flex justify-end mt-4">
                    <div className="w-64 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'ar' ? 'المجموع الفرعي' : 'Subtotal'}</span>
                        <span>{formatAmount(invoiceDetails.data.subtotal)} YER</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'ar' ? 'إجمالي الخصم' : 'Total Discount'}</span>
                        <span className="text-destructive">-{formatAmount(invoiceDetails.data.discount_total)} YER</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'ar' ? 'إجمالي الضريبة' : 'Total Tax'}</span>
                        <span>+{formatAmount(invoiceDetails.data.tax_total)} YER</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                        <span className="text-primary">{formatAmount(invoiceDetails.data.total_amount)} YER</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowInvoiceDetails(false)}>
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (invoiceDetails?.data) {
                      handleEditInvoice(invoiceDetails.data);
                      setShowInvoiceDetails(false);
                    }
                  }}
                  className="border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Edit2 size={16} className="me-2" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
                <Button
                  onClick={() => {
                    setShowInvoiceDetails(false);
                    setShowReturnForm(true);
                  }}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <RotateCcw size={16} className="me-2" />
                  {language === 'ar' ? 'إنشاء مرتجع' : 'Create Return'}
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ========== Modal إنشاء مرتجع ========== */}
      {selectedInvoiceId && (
        <PurchaseReturnForm
          isOpen={showReturnForm}
          onClose={() => {
            setShowReturnForm(false);
            setSelectedInvoiceId(null);
          }}
          onSave={() => {
            refetchAll();
            setShowReturnForm(false);
            setSelectedInvoiceId(null);
          }}
          invoiceId={selectedInvoiceId}
        />
      )}

      {/* ========== Modal تعديل الفاتورة ========== */}
      {editingInvoice && (
        <PurchaseInvoiceForm
          isOpen={showEditInvoiceForm}
          onClose={() => {
            setShowEditInvoiceForm(false);
            setEditingInvoice(null);
          }}
          onSave={() => {
            refetchAll();
            setShowEditInvoiceForm(false);
            setEditingInvoice(null);
          }}
          onSaveAndNew={() => {
            refetchAll();
          }}
          invoiceToEdit={editingInvoice}
        />
      )}

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
        onSave={() => {
          refetchAll();
          setShowInvoiceForm(false);
        }}
        onSaveAndNew={() => {
          refetchAll(); 
        }}
      />

      {/* قالب الطباعة المخفي */}
      {showPrint && invoiceDetails?.data && (
        <div style={{ display: 'none' }}>
          <PurchaseInvoiceTemplate
            ref={invoicePrintRef}
            invoiceData={getPrintData()!}
          />
        </div>
      )}
    </MainLayout>
  );
};

export default Purchasing;