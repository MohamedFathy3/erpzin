/* eslint-disable @typescript-eslint/no-explicit-any */
import { purchaseReturnService } from '@/services/purchaseReturnService';
import type { Supplier, SupplierDto } from '@/types/supplier';
import { supplierService } from '@/services/supplierservice';
import React, { useState, useRef, useEffect } from 'react';
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
import { useApp } from '@/contexts/AppContext';

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
import { purchaseInvoiceService } from '@/services/PurchaseInvoiceService';
import type { PurchaseInvoicesResponse, PurchaseInvoice, PaymentPayload, PaymentResponse } from '@/types/PurchaseInvoice';

// ========== أنواع البيانات من API (موحدة) ==========
interface InvoiceTableRow {
  id: number;
  invoice_number: string;
  supplier_name: string;
  treasury_name: string;
  total_amount: number;
  payment_method: string;
  discount_total: string;
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
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);
  const { currentBranch } = useApp(); // ← أضف هذا السطر

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
  } = useQuery({
    queryKey: ['purchase-invoices', currentPage, invoiceFilters, showAllInvoices, currentBranch?.id],
    queryFn: async () => {
      console.log('🔍 Current branch in Purchasing:', currentBranch);
      console.log('🔍 Branch ID (string):', currentBranch?.id);

      const apiFilters: any = { ...invoiceFilters };

      if (currentBranch?.id) {
        apiFilters.branch_id = currentBranch.id;
      }

      console.log('📦 Final filters to API:', apiFilters);

      return purchaseInvoiceService.getInvoices({
        page: currentPage,
        showAll: showAllInvoices,
        filters: apiFilters,
      });
    },
  });

  // ✅ تحويل البيانات إلى الشكل المطلوب للجدول (بما يتوافق مع API المسطح)
  const invoicesList: InvoiceTableRow[] = (invoicesResponse?.data || []).map((invoice: any) => ({
    id: invoice.id,
    invoice_number: invoice.invoice_number,
    supplier_name: (() => {
      // API يرسل supplier_name مباشرة
      return language === 'ar'
        ? (invoice.supplier_name_ar || invoice.supplier_name)
        : invoice.supplier_name;
    })(),
    treasury_name: (() => {
      // API يرسل treasury_name مباشرة
      return invoice.treasury_name || '-';
    })(),
    total_amount: invoice.total_amount,
    discount_total: (Number(invoice.subtotal) * Number(invoice.discount_total)) / 100,
    payment_method: invoice.payment_method,
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    items_count: invoice.items?.length || 0,
    paid_amount: invoice.paid_amount,
    remaining_amount: invoice.remaining_amount,
  }));

  const paginationMeta = invoicesResponse?.meta;

  // ========== جلب تفاصيل الفاتورة عند الضغط عليها ==========
  const { data: invoiceDetails, isLoading: invoiceDetailsLoading } = useQuery({
    queryKey: ['purchase-invoice-details', selectedInvoiceId],
    queryFn: async () => {
      if (!selectedInvoiceId) throw new Error('No invoice selected');
      const response = await api.get(`/purchases-invoices/${selectedInvoiceId}`);
      return response.data; // API يرسل { data, result, message, status }
    },
    enabled: !!selectedInvoiceId && showInvoiceDetails,
  });

  // ========== حذف المورد ==========
  const deleteSupplierMutation = useMutation({
    mutationFn: (id: number) => supplierService.deleteSupplier(id),
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
    onError: (error: Error | any) => {
      toast({
        title: language === 'ar' ? 'خطأ في حذف المورد' : 'Error deleting supplier',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  // ========== تحويل بيانات الفاتورة لتناسب قالب الطباعة ==========
  const getPrintData = () => {
    const data = invoiceDetails?.data;
    if (!data) return null;

    return {
      id: data.id.toString(),
      invoice_number: data.invoice_number,
      date: data.invoice_date,
      supplier: {
        name: data.supplier_name,
        nameAr: data.supplier_name_ar || data.supplier_name,
        phone: '',
        tax_number: '',
      },
      cashierName: user?.name || 'المدير',
      branchName: data.branch_name || '-',
      branchPhone: '',
      branchAddress: '',
      taxRate: data.tax_rate ? parseFloat(data.tax_rate) : 0,
      items: (data.items || []).map((item: any) => ({
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
  } = useQuery({
    queryKey: ['suppliers', supplierFilters],
    queryFn: () => supplierService.getSuppliers(supplierFilters),
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

  // ========== جلب مرتجعات الشراء ==========
  const { data: purchaseReturnsResponse } = useQuery({
    queryKey: ['purchase-returns'],
    queryFn: async () => {
      try {
        const response = await purchaseReturnService.getPurchaseReturns();
        return response;
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
    queryClient.invalidateQueries({ queryKey: ['purchase-invoices'] });

  };

  useEffect(() => {
    if (activeTab === 'invoices') {
      refetchInvoices();
    }
  }, [currentBranch?.id, activeTab]);
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
  const handleEditInvoice = (invoice: any) => {
    setEditingInvoice(invoice);
    setShowEditInvoiceForm(true);
  };

  const invoiceData = invoiceDetails?.data;

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
            <TabsTrigger value="returns" className="data-[state=active]:bg-orange-100 data-[state=active]:text-orange-800">
              <RotateCcw size={16} className="me-2" />
              {language === 'ar' ? 'المرتجعات' : 'Returns'}
            </TabsTrigger>
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-violet-100 data-[state=active]:text-violet-800">
              <Building2 size={16} className="me-2" />
              {language === 'ar' ? 'الموردين' : 'Suppliers'}
            </TabsTrigger>
          </TabsList>

          {/* ========== فواتير الشراء ========== */}
          <TabsContent value="invoices" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
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
                        <TableHead>{language === 'ar' ? 'الخصم' : 'Discount'}</TableHead>
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
                            <TableCell>{paginationMeta?.from ? paginationMeta.from + index : index + 1}</TableCell>
                            <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                            <TableCell>{inv.supplier_name}</TableCell>
                            <TableCell>{inv.treasury_name}</TableCell>
                            <TableCell>{inv.total_amount.toLocaleString()} YER</TableCell>
                            <TableCell className="text-green-600">{inv.paid_amount.toLocaleString()} YER</TableCell>
                            <TableCell className="text-red-500 font-medium">
                              -{inv.discount_total?.toLocaleString() || 0} YER
                            </TableCell>
                            <TableCell className={inv.remaining_amount > 0 ? 'text-orange-500' : ''}>
                              {inv.remaining_amount > 0 ? inv.remaining_amount.toLocaleString() : '-'} YER
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getPaymentMethodLabel(inv.payment_method)}</Badge>
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
                                    const fullInvoice = invoicesResponse?.data.find((i: any) => i.id === inv.id);
                                    if (fullInvoice) handleEditInvoice(fullInvoice);
                                  }}
                                  className="h-8 w-8 p-0 text-blue-600"
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
                                  className="h-8 w-8 p-0 text-orange-600"
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
                    <div className="text-sm text-muted-foreground">
                      {showAllInvoices
                        ? language === 'ar' ? `عرض جميع الفواتير (${paginationMeta.total})` : `Showing all invoices (${paginationMeta.total})`
                        : language === 'ar'
                          ? `عرض ${paginationMeta.from || 0} إلى ${paginationMeta.to || 0} من ${paginationMeta.total} فاتورة`
                          : `Showing ${paginationMeta.from || 0} to ${paginationMeta.to || 0} of ${paginationMeta.total} invoices`
                      }
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        {language === 'ar' ? 'السابق' : 'Previous'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(paginationMeta.last_page, p + 1))}
                        disabled={currentPage === paginationMeta.last_page}
                      >
                        {language === 'ar' ? 'التالي' : 'Next'}
                      </Button>
                    </div>
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
                                {language === 'ar' ? (supplier.name_ar || supplier.name) : supplier.name}
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
                                <span className={cn("font-semibold", Number(supplier.credit_limit) > 0 ? "text-destructive" : "text-success")}>
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
                  #{invoiceData?.invoice_number || selectedInvoiceId}
                </span>
              </DialogTitle>
              {invoiceData && (
                <Button variant="outline" size="sm" onClick={handlePrintClick} className="gap-2">
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
          ) : invoiceData ? (
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
                      {language === 'ar' ? (invoiceData.supplier_name_ar || invoiceData.supplier_name) : invoiceData.supplier_name}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {language === 'ar' ? 'الإجمالي' : 'Total'}
                    </div>
                    <div className="font-bold text-lg text-primary">{formatAmount(invoiceData.total_amount)} YER</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {language === 'ar' ? 'عدد الأصناف' : 'Items'}
                    </div>
                    <div className="font-medium text-lg">{invoiceData.items?.length || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {language === 'ar' ? 'التاريخ' : 'Date'}
                    </div>
                    <div className="font-medium">{formatDate(invoiceData.invoice_date)}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Additional Info Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'الفرع' : 'Branch'}</p>
                  <p className="font-medium">{invoiceData.branch_name || '-'}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'المستودع' : 'Warehouse'}</p>
                  <p className="font-medium">{invoiceData.warehouse_name || '-'}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'الخزينة' : 'Treasury'}</p>
                  <p className="font-medium flex items-center gap-1">
                    <Landmark size={14} className="text-primary" />
                    {invoiceData.treasury_name || '-'}
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'العملة' : 'Currency'}</p>
                  <p className="font-medium">{invoiceData.currency_code || '-'}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'الضريبة' : 'Tax'}</p>
                  <p className="font-medium">{invoiceData.tax_rate ? `${invoiceData.tax_rate}%` : '-'}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</p>
                  <p className="font-medium">{getPaymentMethodLabel(invoiceData.payment_method)}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</p>
                  <p className="font-medium">{invoiceData.due_date ? formatDate(invoiceData.due_date) : '-'}</p>
                </div>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'المدفوع' : 'Paid'}</p>
                  <p className="font-bold text-green-600">{formatAmount(invoiceData.paid_amount)} YER</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'المتبقي' : 'Remaining'}</p>
                  <p className="font-bold text-orange-600">{formatAmount(invoiceData.remaining_amount)} YER</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'تاريخ الاستحقاق' : 'Due Date'}</p>
                  <p className="font-bold">{invoiceData.due_date ? formatDate(invoiceData.due_date) : '-'}</p>
                </div>
              </div>

              {/* Note */}
              {invoiceData.note && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">{language === 'ar' ? 'ملاحظات' : 'Notes'}</p>
                  <p className="text-sm">{invoiceData.note}</p>
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
                          <TableHead className="text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                          <TableHead className="text-right">{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</TableHead>
                          <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(invoiceData.items || []).map((item: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{idx + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium">
                                {language === 'ar' ? (item.product_name_ar || item.product_name) : item.product_name}
                              </div>
                              <div className="text-xs text-muted-foreground">{item.product_sku}</div>
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatAmount(item.price)} YER</TableCell>
                            <TableCell className="text-right font-semibold">{formatAmount(item.total)} YER</TableCell>
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
                        <span>{formatAmount(invoiceData.subtotal)} YER</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'ar' ? 'إجمالي الخصم' : 'Total Discount'}</span>
                        <span className="text-red-500">-{formatAmount(invoiceData.discount_total)} YER</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{language === 'ar' ? 'إجمالي الضريبة' : 'Total Tax'}</span>
                        <span>+{formatAmount(invoiceData.tax_total)} YER</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                        <span className="text-primary">{formatAmount(invoiceData.total_amount)} YER</span>
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
                    handleEditInvoice(invoiceData);
                    setShowInvoiceDetails(false);
                  }}
                  className="border-blue-600 text-blue-600"
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
      {/* ========== Modal تعديل الفاتورة ========== */}
      {editingInvoice && (
        <PurchaseInvoiceForm
          key={editingInvoice.id} // مهم جداً لإعادة تحميل المكون
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
      {showPrint && invoiceData && (
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