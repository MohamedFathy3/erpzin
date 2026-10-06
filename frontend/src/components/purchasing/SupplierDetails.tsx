import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Building2, Phone, Mail, MapPin, FileText,
  TrendingUp, Wallet, Calendar, Edit2, CreditCard, ChevronDown, ChevronUp
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn, formatDate } from '@/lib/utils';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { toast } from '@/components/ui/use-toast';
import type { PurchaseInvoice, PurchaseInvoicesResponse, PaymentPayload } from '@/types/PurchaseInvoice';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supplierService } from '@/services/supplierservice';
import { purchaseInvoiceService } from '@/services/PurchaseInvoiceService';
import { purchaseOrderService } from '@/services/PurchaseOrderService';
import { treasuryService } from '@/services/TreasuryService';
// ==================== Types ====================

export interface Supplier {
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
  email?: string;
  financial_summary?: {
    total_purchases: number;
    total_paid: number;
    remaining: number;
  };
  created_at: string;
  updated_at: string;
}

interface SupplierResponse {
  result: string;
  data: Supplier;
  message: string;
  status: number;
}

// export interface PurchaseInvoice {
//   id: number;
//   invoice_number: string;
//   supplier: {
//     id: number;
//     name: string;
//   };
//   branch: string;
//   warehouse: string;
//   currency: string | null;
//   tax: string | null;
//   invoice_date: string;
//   due_date: string | null;
//   payment_method: string;
//   note: string | null;
//   subtotal: string;
//   discount_total: string;
//   tax_total: string;
//   total_amount: string;
//   paid_amount?: string;
//   remaining_amount?: string;
//   payment_status?: string;
//   items: any[];
//   created_at: string;
// }

// interface PurchaseInvoicesResponse {
//   data: PurchaseInvoice[];
//   links: any;
//   meta: {
//     current_page: number;
//     from: number;
//     last_page: number;
//     per_page: number;
//     to: number;
//     total: number;
//   };
//   result: string;
//   message: string;
//   status: number;
// }

// interface PurchaseOrder {
//   id: number;
//   order_number: string;
//   supplier: {
//     id: number;
//     name: string;
//   } | null;
//   expected_delivery: string | null;
//   total_amount: string;
//   notes: string | null;
//   items: Array<{
//     product_id: number;
//     product_name: string;
//     quantity: number;
//     unit_cost: string;
//     total: string;
//   }>;
//   created_at: string;
//   status?: string;
// }

// interface PurchaseOrdersResponse {
//   data: PurchaseOrder[];
//   links: any;
//   meta: any;
//   result: string;
//   message: string;
//   status: number;
// }

// interface PaymentPayload {
//   amount: number;
//   payment_method?: string;
//   reference_number?: string;
//   notes?: string;
//   payment_date?: string;
// }

// interface PaymentResponse {
//   result: string;
//   data: any;
//   message: string;
//   status: number;
// }

interface SupplierDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier | null;
  onEdit: () => void;
}

const SupplierDetails: React.FC<SupplierDetailsProps> = ({
  isOpen,
  onClose,
  supplier,
  onEdit
}) => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  const queryClient = useQueryClient();
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<PurchaseInvoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [expandedPaymentsInvoiceId, setExpandedPaymentsInvoiceId] = useState<number | null>(null);
  const [paymentData, setPaymentData] = useState<PaymentPayload>({
    amount: 0,
    treasury_id: undefined,
    payment_method: 'cash',
    reference_number: '',
    notes: '',
    payment_date: new Date().toISOString().split('T')[0]
  });

  // ==================== Fetch Supplier Details from API ====================
  // const { data: supplierDetails, isLoading: supplierLoading } = useQuery<SupplierResponse>({
  //   queryKey: ['supplier-details', supplier?.id],
  //   queryFn: async () => {
  //     if (!supplier?.id) throw new Error('No supplier ID');

  //     const response = await api.get(`/suppliers/${supplier.id}`);
  //     return response.data;
  //   },
  //   enabled: isOpen && !!supplier?.id,
  // });
  const { data: supplierDetails, isLoading: supplierLoading } = useQuery({
    queryKey: ['supplier-details', supplier?.id],
    queryFn: () => supplierService.getSupplierDetails(supplier!.id),
    enabled: isOpen && !!supplier?.id,
  });
  // ==================== Fetch Purchase Invoices ====================
  // const { data: invoicesResponse, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery<PurchaseInvoicesResponse>({
  //   queryKey: ['supplier-invoices', supplier?.id],
  //   queryFn: async () => {
  //     if (!supplier?.id) return {
  //       data: [],
  //       links: {},
  //       meta: { current_page: 1, from: 0, last_page: 1, per_page: 50, to: 0, total: 0 },
  //       result: 'success',
  //       message: '',
  //       status: 200
  //     };

  //     const response = await api.post<PurchaseInvoicesResponse>('/purchases-invoices/index', {
  //       filters: {
  //         supplier_id: supplier.id
  //       },
  //       orderBy: 'id',
  //       orderByDirection: 'desc',
  //       perPage: 50,
  //       paginate: false
  //     });

  //     return response.data;
  //   },
  //   enabled: isOpen && !!supplier?.id,
  // });
  const { data: invoicesResponse, isLoading: invoicesLoading, refetch: refetchInvoices } = useQuery({
    queryKey: ['supplier-invoices', supplier?.id],
    queryFn: () => purchaseInvoiceService.getBySupplierId(supplier!.id),
    enabled: isOpen && !!supplier?.id,
  });

  // ==================== Fetch Purchase Orders ====================
  // const { data: ordersResponse, isLoading: ordersLoading } = useQuery<PurchaseOrdersResponse>({
  //   queryKey: ['supplier-orders', supplier?.id],
  //   queryFn: async () => {
  //     if (!supplier?.id) return {
  //       data: [],
  //       links: {},
  //       meta: {},
  //       result: 'success',
  //       message: '',
  //       status: 200
  //     };

  //     const response = await api.post<PurchaseOrdersResponse>('/purchases-orders/index', {
  //       filters: {
  //         supplier_id: supplier.id
  //       },
  //       orderBy: 'id',
  //       orderByDirection: 'desc',
  //       perPage: 50,
  //       paginate: false
  //     });

  //     return response.data;
  //   },
  //   enabled: isOpen && !!supplier?.id,
  // });
  const { data: ordersResponse, isLoading: ordersLoading } = useQuery({
    queryKey: ['supplier-orders', supplier?.id],
    queryFn: () => purchaseOrderService.getBySupplierId(supplier!.id),
    enabled: isOpen && !!supplier?.id,
  });

  const { data: treasuriesResponse, isLoading: treasuriesLoading } = useQuery({
    queryKey: ['purchase-payment-treasuries'],
    queryFn: () => treasuryService.getTreasuries({ active: 1 }),
    enabled: isOpen,
  });
  const paymentTreasuries = (treasuriesResponse?.data ?? []).filter((treasury: any) => treasury.active !== 0);

  // ==================== Payment Mutation ====================
  // ==================== Payment Mutation ====================
  // const payInvoiceMutation = useMutation({
  //   mutationFn: async ({ invoiceId, data }: { invoiceId: number; data: PaymentPayload }) => {
  //     const response = await api.patch<PaymentResponse>(`/purchase-invoices/${invoiceId}/pay`, data);
  //     return response.data;
  //   },
  //   onSuccess: (data) => {
  //     if (data.result === 'Success' || data.message === 'Payment updated successfully') {
  //       toast({
  //         title: language === 'ar' ? 'تم تسجيل الدفعة بنجاح' : 'Payment recorded successfully',
  //         variant: 'default',
  //       });
  //       refetchInvoices();
  //       queryClient.invalidateQueries({ queryKey: ['supplier-details', supplier?.id] });
  //       setShowPaymentModal(false);
  //       setSelectedInvoiceForPayment(null);
  //       setPaymentData({
  //         amount: 0,
  //         payment_method: 'cash',
  //         reference_number: '',
  //         notes: '',
  //         payment_date: new Date().toISOString().split('T')[0]
  //       });
  //     } else {
  //       toast({
  //         title: language === 'ar' ? 'فشل في تسجيل الدفعة' : 'Failed to record payment',
  //         description: data.message,
  //         variant: 'destructive',
  //       });
  //     }
  //   },
  //   onError: (error: unknown) => {
  //     console.error('Error recording payment:', error);
  //     toast({
  //       title: language === 'ar' ? 'خطأ في تسجيل الدفعة' : 'Error recording payment',
  //       description: error.response?.data?.message || error.message,
  //       variant: 'destructive',
  //     });
  //   },
  // });

  const payInvoiceMutation = useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: number; data: PaymentPayload }) =>
      purchaseInvoiceService.payInvoice(invoiceId, data),

    onSuccess: (data) => {
      if (data.result === 'Success' || data.message === 'Payment updated successfully') {
        toast({
          title: language === 'ar' ? 'تم تسجيل الدفعة بنجاح' : 'Payment recorded successfully',
          variant: 'default',
        });
        if (data.invoice?.id) setExpandedPaymentsInvoiceId(Number(data.invoice.id));

        refetchInvoices();
        queryClient.invalidateQueries({ queryKey: ['supplier-details', supplier?.id] });

        setShowPaymentModal(false);
        setSelectedInvoiceForPayment(null);
        setPaymentData({
          amount: 0,
          treasury_id: undefined,
          payment_method: 'cash',
          reference_number: '',
          notes: '',
          payment_date: new Date().toISOString().split('T')[0]
        });
      } else {
        toast({
          title: language === 'ar' ? 'فشل في تسجيل الدفعة' : 'Failed to record payment',
          description: data.message,
          variant: 'destructive',
        });
      }
    },

    onError: (error: unknown) => {
      toast({
        title: language === 'ar' ? 'خطأ في تسجيل الدفعة' : 'Error recording payment',
        description: (error as { response?: { data?: { message?: string } } }).response?.data?.message || (error as { message?: string }).message,
        variant: 'destructive',
      });
    },
  });
  const invoices = invoicesResponse?.data || [];
  const orders = ordersResponse?.data || [];

  // Use financial_summary from API if available, otherwise calculate
  const financialSummary = supplierDetails?.data?.financial_summary || {
    total_purchases: invoices.reduce((sum, inv) => sum + Number(inv.total_amount), 0),
    total_paid: invoices.reduce((sum, inv) => sum + Number(inv.paid_amount || 0), 0),
    remaining: invoices.reduce((sum, inv) => {
      const total = Number(inv.total_amount);
      const paid = Number(inv.paid_amount || 0);
      return sum + (total - paid);
    }, 0)
  };

  const currentSupplier = supplierDetails?.data || supplier;

  const handlePayClick = (invoice: PurchaseInvoice) => {
    const total = Number(invoice.total_amount);
    const paid = Number(invoice.paid_amount || 0);
    const remaining = total - paid;

    setSelectedInvoiceForPayment(invoice);
    setPaymentData({
      amount: remaining,
      treasury_id: invoice.treasury_id ? Number(invoice.treasury_id) : undefined,
      payment_method: 'cash',
      reference_number: '',
      notes: '',
      payment_date: new Date().toISOString().split('T')[0]
    });
    setShowPaymentModal(true);
  };

  const handlePaySubmit = () => {
    if (!selectedInvoiceForPayment) return;

    if (!paymentData.treasury_id) {
      toast({
        title: language === 'ar' ? 'اختر الخزينة أولاً' : 'Select a treasury first',
        variant: 'destructive',
      });
      return;
    }

    if (paymentData.amount <= 0) {
      toast({
        title: language === 'ar' ? 'المبلغ يجب أن يكون أكبر من صفر' : 'Amount must be greater than zero',
        variant: 'destructive',
      });
      return;
    }

    if (!paymentData.payment_date) {
      toast({
        title: language === 'ar' ? 'اختر تاريخ السداد' : 'Select a payment date',
        variant: 'destructive',
      });
      return;
    }

    payInvoiceMutation.mutate({
      invoiceId: selectedInvoiceForPayment.id,
      data: paymentData
    });
  };

  if (!supplier && !supplierDetails?.data) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Building2 className="text-primary" size={24} />
                {currentSupplier?.name}
              </DialogTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit2 size={16} className="me-1" />
                  {language === 'ar' ? 'تعديل' : 'Edit'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {supplierLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Supplier Info Card */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Contact Info */}
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {language === 'ar' ? 'معلومات الاتصال' : 'Contact Info'}
                      </h4>
                      {currentSupplier?.contact_person && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 size={14} className="text-muted-foreground" />
                          <span>{currentSupplier.contact_person}</span>
                        </div>
                      )}
                      {currentSupplier?.phone && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone size={14} className="text-muted-foreground" />
                          <span dir="ltr">{currentSupplier.phone}</span>
                        </div>
                      )}
                      {currentSupplier?.email && (
                        <div className="flex items-center gap-2 text-sm">
                          <Mail size={14} className="text-muted-foreground" />
                          <span>{currentSupplier.email}</span>
                        </div>
                      )}
                      {currentSupplier?.address && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin size={14} className="text-muted-foreground" />
                          <span>{currentSupplier.address}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Financial Summary */}
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {language === 'ar' ? 'ملخص مالي' : 'Financial Summary'}
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{language === 'ar' ? 'إجمالي المشتريات' : 'Total Purchases'}</span>
                        <span className="font-semibold">{formatCurrency(financialSummary.total_purchases)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{language === 'ar' ? 'المدفوع' : 'Paid'}</span>
                        <span className="font-semibold text-success">{formatCurrency(financialSummary.total_paid)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="text-sm font-medium">{language === 'ar' ? 'الرصيد المستحق' : 'Balance Due'}</span>
                        <span className={cn(
                          "font-bold text-lg",
                          financialSummary.remaining > 0 ? "text-destructive" : "text-success"
                        )}>
                          {formatCurrency(financialSummary.remaining)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Credit Info */}
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <h4 className="font-medium text-sm text-muted-foreground">
                        {language === 'ar' ? 'معلومات الائتمان' : 'Credit Info'}
                      </h4>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{language === 'ar' ? 'حد الائتمان' : 'Credit Limit'}</span>
                        <span className="font-semibold">{formatCurrency(Number(currentSupplier?.credit_limit || 0))}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{language === 'ar' ? 'شروط الدفع' : 'Payment Terms'}</span>
                        <span className="font-semibold">{currentSupplier?.payment_terms || 30} {language === 'ar' ? 'يوم' : 'days'}</span>
                      </div>
                      {currentSupplier?.tax_number && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">{language === 'ar' ? 'الرقم الضريبي' : 'Tax Number'}</span>
                          <span className="font-mono text-sm">{currentSupplier.tax_number}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs for History */}
                <Tabs defaultValue="invoices" className="w-full">
                  <TabsList className="grid w-full grid-cols-1">
                    <TabsTrigger value="invoices">
                      <FileText size={16} className="me-2" />
                      {language === 'ar' ? 'الفواتير' : 'Invoices'}
                    </TabsTrigger>

                  </TabsList>

                  <TabsContent value="invoices" className="mt-4">
                    {invoicesLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                              <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                              <TableHead>{language === 'ar' ? 'موعد الاستحقاق' : 'Due date'}</TableHead>
                              <TableHead className="text-end">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                              <TableHead className="text-end">{language === 'ar' ? 'المدفوع' : 'Paid'}</TableHead>
                              <TableHead className="text-end">{language === 'ar' ? 'المتبقي' : 'Remaining'}</TableHead>
                              <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                              <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {invoices.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                  {language === 'ar' ? 'لا توجد فواتير' : 'No invoices'}
                                </TableCell>
                              </TableRow>
                            ) : (
                              invoices.map((inv: PurchaseInvoice) => {
                                const total = Number(inv.total_amount);
                                const paid = Number(inv.paid_amount || 0);
                                const remaining = total - paid;
                                const paymentStatus = inv.payment_status ||
                                  (remaining <= 0 ? 'paid' : remaining < total ? 'partial' : 'unpaid');

                                return (
                                  <React.Fragment key={inv.id}>
                                  <TableRow>
                                    <TableCell className="font-mono">{inv.invoice_number}</TableCell>
                                    <TableCell>{formatDate(inv.invoice_date)}</TableCell>
                                    <TableCell>{formatDate(inv.due_date)}</TableCell>
                                    <TableCell className="text-end font-medium">{formatCurrency(total)}</TableCell>
                                    <TableCell className="text-end">{formatCurrency(paid)}</TableCell>
                                    <TableCell className="text-end font-medium text-destructive">{formatCurrency(remaining)}</TableCell>
                                    <TableCell>
                                      <Badge variant={
                                        paymentStatus === 'paid' ? 'default' :
                                          paymentStatus === 'partial' ? 'secondary' : 'destructive'
                                      }>
                                        {paymentStatus === 'paid'
                                          ? (language === 'ar' ? 'مدفوعة' : 'Paid')
                                          : paymentStatus === 'partial'
                                            ? (language === 'ar' ? 'جزئي' : 'Partial')
                                            : (language === 'ar' ? 'غير مدفوعة' : 'Unpaid')
                                        }
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setExpandedPaymentsInvoiceId(expandedPaymentsInvoiceId === inv.id ? null : inv.id)}
                                          className="h-8 px-2"
                                          title={language === 'ar' ? 'عرض سجل الدفعات' : 'Show payment history'}
                                        >
                                          {expandedPaymentsInvoiceId === inv.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                          <span className="ms-1 text-xs">{language === 'ar' ? `الدفعات (${inv.payments?.length || 0})` : `Payments (${inv.payments?.length || 0})`}</span>
                                        </Button>
                                        {remaining > 0 && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handlePayClick(inv)}
                                          className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10"
                                          title={language === 'ar' ? 'تسديد دفعة' : 'Make payment'}
                                        >
                                          <CreditCard className="h-4 w-4" />
                                        </Button>
                                      )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                  {expandedPaymentsInvoiceId === inv.id && (
                                    <TableRow>
                                      <TableCell colSpan={8} className="bg-muted/30 p-3">
                                        {!inv.payments?.length ? (
                                          <p className="py-3 text-center text-sm text-muted-foreground">
                                            {language === 'ar' ? 'لا توجد دفعات مسجلة على هذه الفاتورة.' : 'No payments recorded for this invoice.'}
                                          </p>
                                        ) : (
                                          <Table>
                                            <TableHeader>
                                              <TableRow>
                                                <TableHead>{language === 'ar' ? 'تاريخ السداد' : 'Payment date'}</TableHead>
                                                <TableHead className="text-end">{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                                                <TableHead>{language === 'ar' ? 'طريقة الدفع' : 'Method'}</TableHead>
                                                <TableHead>{language === 'ar' ? 'الخزينة' : 'Treasury'}</TableHead>
                                                <TableHead>{language === 'ar' ? 'رقم المرجع' : 'Reference'}</TableHead>
                                                <TableHead>{language === 'ar' ? 'القيد' : 'Journal'}</TableHead>
                                                <TableHead>{language === 'ar' ? 'ملاحظات' : 'Notes'}</TableHead>
                                              </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                              {inv.payments.map((payment) => (
                                                <TableRow key={payment.id}>
                                                  <TableCell>{formatDate(payment.payment_date)}</TableCell>
                                                  <TableCell className="text-end font-medium">{formatCurrency(Number(payment.amount))}</TableCell>
                                                  <TableCell>{payment.payment_method || '-'}</TableCell>
                                                  <TableCell>{payment.treasury_name || (payment.treasury_id ? `#${payment.treasury_id}` : '-')}</TableCell>
                                                  <TableCell>{payment.reference_number || '-'}</TableCell>
                                                  <TableCell>{payment.journal_entry_id ? `#${payment.journal_entry_id}` : '-'}</TableCell>
                                                  <TableCell>{payment.notes || '-'}</TableCell>
                                                </TableRow>
                                              ))}
                                            </TableBody>
                                          </Table>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  )}
                                  </React.Fragment>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </TabsContent>


                </Tabs>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ========== Modal تسديد دفعة ========== */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              {language === 'ar' ? 'تسديد دفعة للفاتورة' : 'Make Payment'}
              {selectedInvoiceForPayment && (
                <span className="font-mono text-muted-foreground text-sm">
                  #{selectedInvoiceForPayment.invoice_number}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'المبلغ' : 'Amount'}</Label>
              <Input
                type="number"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({ ...paymentData, amount: Number(e.target.value) })}
                placeholder="0.00"
                min="0.01"
                step="0.01"
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'تاريخ السداد' : 'Payment date'}</Label>
              <Input
                type="date"
                value={paymentData.payment_date}
                onChange={(e) => setPaymentData({ ...paymentData, payment_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الخزينة التي سيتم الخصم منها' : 'Treasury to debit'}</Label>
              <select
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                value={paymentData.treasury_id ?? ''}
                onChange={(event) => setPaymentData({ ...paymentData, treasury_id: event.target.value ? Number(event.target.value) : undefined })}
                disabled={treasuriesLoading}
              >
                <option value="">
                  {treasuriesLoading
                    ? (language === 'ar' ? 'جاري تحميل الخزائن...' : 'Loading treasuries...')
                    : (language === 'ar' ? '-- اختر الخزينة --' : '-- Select treasury --')}
                </option>
                {paymentTreasuries.map((treasury: any) => (
                  <option key={treasury.id} value={treasury.id}>
                    {language === 'ar' ? (treasury.name_ar || treasury.name) : treasury.name}
                    {treasury.balance != null ? ` — الرصيد: ${Number(treasury.balance).toLocaleString()}` : ''}
                  </option>
                ))}
              </select>
              {!treasuriesLoading && paymentTreasuries.length === 0 && (
                <p className="text-xs text-destructive">
                  {language === 'ar' ? 'لا توجد خزائن متاحة للدفع.' : 'No treasuries are available for payment.'}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم المرجع (اختياري)' : 'Reference number (optional)'}</Label>
              <Input
                value={paymentData.reference_number || ''}
                onChange={(e) => setPaymentData({ ...paymentData, reference_number: e.target.value })}
                placeholder={language === 'ar' ? 'رقم إيصال أو تحويل' : 'Receipt or transfer reference'}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'ar' ? 'ملاحظات (اختياري)' : 'Notes (optional)'}</Label>
              <Input
                value={paymentData.notes || ''}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder={language === 'ar' ? 'ملاحظات على الدفعة' : 'Payment notes'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handlePaySubmit} disabled={payInvoiceMutation.isPending}>
              {payInvoiceMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent me-2" />
                  {language === 'ar' ? 'جاري التسجيل...' : 'Processing...'}
                </>
              ) : (
                language === 'ar' ? 'تسديد' : 'Pay'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SupplierDetails;
