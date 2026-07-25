/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useRef, forwardRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Eye, Receipt, RotateCcw, X, Filter, Search,
  ChevronDown, ChevronUp, Printer, FileSpreadsheet,
  DollarSign, CreditCard, Wallet, Calendar, User,
  Building2, Package, Truck, Hash, Clock, Percent,
  Tag, Info, Download, Share2
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import SalesInvoiceForm from "./SalesInvoiceForm";
import InvoiceDetails from "./InvoiceDetails";
import InvoiceReturnForm from "./InvoiceReturnForm";
import api from "@/lib/api";
import { toast } from "sonner";
import { useDebounce } from "@/hooks/use-debounce";
import { useApp } from '@/contexts/AppContext';
import { useReactToPrint } from "react-to-print";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// ========== مكون الطباعة المتقدم ==========
const AdvancedPrintTemplate = forwardRef<HTMLDivElement, any>(
  ({ invoice, companyInfo, language }, ref) => {
    const isArabic = language === 'ar';

    // حساب الخصم الكلي للمنتجات
    const getItemsTotalDiscount = () => {
      return invoice.items?.reduce((sum: number, item: any) => {
        const itemDiscount = item.discount_amount || 
                            (item.price * item.quantity - item.total) || 0;
        return sum + Number(itemDiscount);
      }, 0) || 0;
    };

    const subtotal = parseFloat(invoice.total_amount) || 0;
    const itemsDiscount = getItemsTotalDiscount();
    const discountAmount = parseFloat(invoice.discount_amount) || 0;
    const discountPercent = parseFloat(invoice.discount_percentage) || 0;
    const totalDiscount = itemsDiscount + discountAmount;
    const taxAmount = invoice.tax_amount || 0;
    const taxRate = invoice.tax_rate || 0;
    const total = parseFloat(invoice.net_total) || 0;
    const paidAmount = invoice.paid_amount || 0;
    const remainingAmount = invoice.remaining_amount || total - paidAmount;

    const getPaymentMethodText = (method: string) => {
      const methods: Record<string, { ar: string; en: string; icon: string }> = {
        cash: { ar: 'نقدي', en: 'Cash', icon: '💵' },
        card: { ar: 'بطاقة ائتمان', en: 'Credit Card', icon: '💳' },
        wallet: { ar: 'محفظة إلكترونية', en: 'Digital Wallet', icon: '📱' },
        credit: { ar: 'آجل', en: 'Credit', icon: '📝' }
      };
      return isArabic ? methods[method]?.ar : methods[method]?.en;
    };

    const getPaymentStatusText = (status: string) => {
      const statuses: Record<string, { ar: string; en: string; color: string }> = {
        paid: { ar: 'مدفوع', en: 'Paid', color: '#10b981' },
        pending: { ar: 'معلق', en: 'Pending', color: '#f59e0b' },
        partial: { ar: 'مدفوع جزئياً', en: 'Partially Paid', color: '#3b82f6' },
        cancelled: { ar: 'ملغي', en: 'Cancelled', color: '#ef4444' }
      };
      return isArabic ? statuses[status]?.ar : statuses[status]?.en;
    };

    return (
      <div ref={ref} className="p-8 bg-white" style={{ direction: isArabic ? 'rtl' : 'ltr', fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="border-b-4 border-primary pb-4 mb-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {companyInfo.logo && (
                <img src={companyInfo.logo} alt="Logo" className="h-16 w-auto mb-3 object-contain" />
              )}
              <h1 className="text-2xl font-bold text-gray-800">
                {isArabic ? companyInfo.nameAr || companyInfo.name : companyInfo.name}
              </h1>
              <div className="text-sm text-gray-600 mt-2 space-y-1">
                {companyInfo.address && <div>📍 {isArabic ? companyInfo.addressAr || companyInfo.address : companyInfo.address}</div>}
                {companyInfo.phone && <div>📞 {companyInfo.phone}</div>}
                {companyInfo.email && <div>✉️ {companyInfo.email}</div>}
                {companyInfo.tax_id && <div>🆔 {isArabic ? 'الرقم الضريبي' : 'Tax ID'}: {companyInfo.tax_id}</div>}
              </div>
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold text-primary mb-2">
                {isArabic ? 'فاتورة ضريبية' : 'TAX INVOICE'}
              </div>
              <div className="text-xl font-mono font-bold text-gray-700">
                #{invoice.invoice_number}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {isArabic ? 'تاريخ الإصدار' : 'Issue Date'}: {formatDate(invoice.created_at)}
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Business Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <User size={18} className="text-primary" />
              <h3 className="font-semibold text-gray-800">{isArabic ? 'بيانات العميل' : 'Customer Information'}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">{isArabic ? 'الاسم' : 'Name'}:</span> {isArabic ? invoice.customer?.name_ar || invoice.customer?.name : invoice.customer?.name}</div>
              {invoice.customer?.phone && <div><span className="font-medium">{isArabic ? 'الهاتف' : 'Phone'}:</span> {invoice.customer.phone}</div>}
              {invoice.customer?.email && <div><span className="font-medium">{isArabic ? 'البريد الإلكتروني' : 'Email'}:</span> {invoice.customer.email}</div>}
              {invoice.customer?.tax_number && <div><span className="font-medium">{isArabic ? 'الرقم الضريبي' : 'Tax Number'}:</span> {invoice.customer.tax_number}</div>}
            </div>
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b">
              <Building2 size={18} className="text-primary" />
              <h3 className="font-semibold text-gray-800">{isArabic ? 'بيانات الفاتورة' : 'Invoice Information'}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{isArabic ? 'الفرع' : 'Branch'}:</span>
                <span>{invoice.branch}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">{isArabic ? 'المخزن' : 'Warehouse'}:</span>
                <span>{invoice.warehouse}</span>
              </div>
              {invoice.sales_representative && (
                <div className="flex justify-between">
                  <span className="font-medium">{isArabic ? 'المندوب' : 'Sales Rep'}:</span>
                  <span>{isArabic ? invoice.sales_representative.name_ar || invoice.sales_representative.name : invoice.sales_representative.name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium">{isArabic ? 'العملة' : 'Currency'}:</span>
                <span>{invoice.currency}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-primary text-white">
                <th className="p-3 text-left border">{isArabic ? '#' : '#'}</th>
                <th className="p-3 text-left border">{isArabic ? 'المنتج' : 'Product'}</th>
                <th className="p-3 text-center border">{isArabic ? 'الكمية' : 'Qty'}</th>
                <th className="p-3 text-right border">{isArabic ? 'السعر' : 'Price'}</th>
                <th className="p-3 text-center border">{isArabic ? 'الخصم' : 'Discount'}</th>
                <th className="p-3 text-right border">{isArabic ? 'الإجمالي' : 'Total'}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item: any, idx: number) => {
                const itemDiscountAmount = item.discount_amount || 
                                          (item.price * item.quantity - item.total) || 0;
                const itemDiscountPercent = item.discount_percentage || 
                                           item.discount_percent || 
                                           (itemDiscountAmount > 0 ? (itemDiscountAmount / (item.price * item.quantity)) * 100 : 0);
                
                return (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-3 border">{idx + 1}</td>
                    <td className="p-3 border">
                      <div className="font-medium">{item.product_name}</div>
                      {item.unit_name && <div className="text-xs text-gray-500">{isArabic ? 'المقاس' : 'Size'}: {item.unit_name}</div>}
                      {item.color && <div className="text-xs text-gray-500">{isArabic ? 'اللون' : 'Color'}: {item.color}</div>}
                    </td>
                    <td className="p-3 text-center border">{item.quantity}</td>
                    <td className="p-3 text-right border">{Number(item.price).toLocaleString()}</td>
                    <td className="p-3 text-center border">
                      {itemDiscountAmount > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className="text-red-600 font-medium">
                            {itemDiscountAmount.toLocaleString()}
                          </span>
                          <span className="text-xs text-red-400">
                            ({Number(itemDiscountPercent).toFixed(1)}%)
                          </span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="p-3 text-right border font-medium">
                      <div className="flex flex-col">
                        {itemDiscountAmount > 0 && (
                          <span className="text-xs text-muted-foreground line-through">
                            {Number(item.price * item.quantity).toLocaleString()}
                          </span>
                        )}
                        <span>{Number(item.total || item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary Section */}
        <div className="flex justify-end mb-6">
          <div className="w-96 space-y-2">
            <div className="flex justify-between py-2 border-b">
              <span>{isArabic ? 'الإجمالي قبل الخصم' : 'Subtotal'}:</span>
              <span>{subtotal.toLocaleString()} {invoice.currency}</span>
            </div>

            {itemsDiscount > 0 && (
              <div className="flex justify-between py-2 border-b text-red-500">
                <span>
                  {isArabic ? 'خصم المنتجات' : 'Items Discount'}:
                </span>
                <span>- {itemsDiscount.toLocaleString()} {invoice.currency}</span>
              </div>
            )}

            {discountAmount > 0 && (
              <div className="flex justify-between py-2 border-b text-red-600">
                <span>
                  {isArabic ? 'خصم الفاتورة' : 'Invoice Discount'} ({discountPercent}%):
                </span>
                <span>- {discountAmount.toLocaleString()} {invoice.currency}</span>
              </div>
            )}

            {totalDiscount > 0 && (
              <div className="flex justify-between py-2 border-b text-red-700 font-medium">
                <span>
                  {isArabic ? 'إجمالي الخصم' : 'Total Discount'}:
                </span>
                <span>- {totalDiscount.toLocaleString()} {invoice.currency}</span>
              </div>
            )}

            {taxAmount > 0 && (
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">{isArabic ? 'الضريبة' : 'Tax'} ({taxRate}%):</span>
                <span>{taxAmount.toLocaleString()} {invoice.currency}</span>
              </div>
            )}

            <div className="flex justify-between py-3 border-t-2 font-bold text-lg">
              <span>{isArabic ? 'الإجمالي النهائي' : 'Net Total'}:</span>
              <span className="text-primary">
                {total.toLocaleString()} {invoice.currency}
              </span>
            </div>

            {paidAmount > 0 && (
              <div className="flex justify-between py-2 text-green-600">
                <span className="font-medium">{isArabic ? 'المدفوع' : 'Paid'}:</span>
                <span>{paidAmount.toLocaleString()} {invoice.currency}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment & Notes Section */}
        <div className="grid grid-cols-2 gap-6 mt-6 pt-4 border-t">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <Wallet size={18} className="text-green-600" />
              <h4 className="font-semibold text-green-800">{isArabic ? 'معلومات الدفع' : 'Payment Information'}</h4>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-green-700">{isArabic ? 'طريقة الدفع' : 'Payment Method'}:</span>
                <span className="font-medium">{getPaymentMethodText(invoice.payment_method)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-700">{isArabic ? 'حالة الدفع' : 'Payment Status'}:</span>
                <span className="font-medium">{getPaymentStatusText(invoice.payment_status)}</span>
              </div>
              {invoice.due_date && (
                <div className="flex justify-between">
                  <span className="text-green-700">{isArabic ? 'تاريخ الاستحقاق' : 'Due Date'}:</span>
                  <span>{formatDate(invoice.due_date)}</span>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Info size={18} className="text-blue-600" />
              <h4 className="font-semibold text-blue-800">{isArabic ? 'ملاحظات' : 'Notes'}</h4>
            </div>
            <p className="text-sm text-gray-700">
              {invoice.note || (isArabic ? 'لا توجد ملاحظات' : 'No notes')}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
          <p>{isArabic ? 'شكراً لتسوقكم معنا' : 'Thank you for shopping with us'}</p>
          <p className="mt-1">
            {isArabic ? 'هذه الفاتورة صادرة إلكترونياً وتعتبر صالحة بدون توقيع' : 'This invoice is electronically generated and valid without signature'}
          </p>
        </div>
      </div>
    );
  }
);

AdvancedPrintTemplate.displayName = 'AdvancedPrintTemplate';

// ========== أنواع البيانات ==========
interface Customer {
  id: number;
  name: string;
  name_ar?: string;
  phone?: string;
  email?: string;
  address?: string;
  point?: number;
  tax_number?: string;
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
  product_name: string;
  quantity: number;
  price: number;
  discount_percent?: number;
  discount_amount?: number;
  discount_percentage?: number;
  total?: number;
  unit_name?: string;
  color?: string;
}

interface SalesInvoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer?: Customer;
  sales_representative_id?: number;
  sales_representative?: SalesRepresentative;
  branch_id?: number;
  branch?: string;
  branch_obj?: Branch;
  warehouse_id?: number;
  warehouse?: string;
  warehouse_obj?: Warehouse;
  currency_id?: number;
  currency?: string;
  currency_obj?: Currency;
  tax_id?: number;
  tax?: Tax;
  tax_rate?: number;
  tax_amount?: number;
  payment_method: 'cash' | 'card' | 'wallet' | 'credit';
  payment_status: 'paid' | 'pending' | 'partial' | 'cancelled';
  invoice_date?: string;
  due_date?: string;
  note?: string;
  subtotal?: number;
  discount_percent?: number;
  discount_amount?: number;
  discount_percentage: string;
  net_total: string;
  total_amount: string;
  paid_amount?: number;
  remaining_amount?: number;
  items: SalesInvoiceItem[];
  created_at: string;
  updated_at: string;
}

interface InvoiceFilters {
  invoice_number?: string;
  customer_id?: number;
  branch_id?: number;
  sales_representative_id?: number;
  warehouse_id?: number;
  tax_id?: number;
  currency_id?: number;
  date_from?: string;
  date_to?: string;
  payment_status?: string;
  payment_method?: string;
  amount_min?: number;
  amount_max?: number;
}

// ========== المكون الرئيسي ==========
const SalesInvoiceList = () => {
  const { language } = useLanguage();
  const { user } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [selectedInvoiceForReturn, setSelectedInvoiceForReturn] = useState<any>(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(true);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState<SalesInvoice | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  // Company Info للطباعة
  const companyInfo = {
    name: user?.company_name || 'Company Name',
    nameAr: user?.company_name_ar || 'اسم الشركة',
    logo: user?.company_logo,
    address: user?.company_address,
    addressAr: user?.company_address_ar,
    phone: user?.company_phone,
    email: user?.company_email,
    tax_id: user?.company_tax_id,
  };

  // ========== Filter State ==========
  const [filters, setFilters] = useState({
    search: '',
    payment_status: 'all',
    payment_method: 'all',
    branch_id: user?.branch_id ? String(user.branch_id) : 'all',
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

  const debouncedSearch = useDebounce(filters.search, 500);

  // ========== Build Filters ==========
  const buildFilters = (): InvoiceFilters => {
    const apiFilters: InvoiceFilters = {};

    if (debouncedSearch) {
      apiFilters.invoice_number = debouncedSearch;
    }
    if (filters.customer_id !== 'all') {
      apiFilters.customer_id = Number(filters.customer_id);
    }
    if (filters.branch_id !== 'all') {
      apiFilters.branch_id = Number(filters.branch_id);
    }
    if (filters.salesman_id !== 'all') {
      apiFilters.sales_representative_id = Number(filters.salesman_id);
    }
    if (filters.warehouse_id !== 'all') {
      apiFilters.warehouse_id = Number(filters.warehouse_id);
    }
    if (filters.tax_id !== 'all') {
      apiFilters.tax_id = Number(filters.tax_id);
    }
    if (filters.currency_id !== 'all') {
      apiFilters.currency_id = Number(filters.currency_id);
    }
    if (filters.payment_status !== 'all') {
      apiFilters.payment_status = filters.payment_status;
    }
    if (filters.payment_method !== 'all') {
      apiFilters.payment_method = filters.payment_method;
    }
    if (filters.date_from) {
      apiFilters.date_from = filters.date_from;
    }
    if (filters.date_to) {
      apiFilters.date_to = filters.date_to;
    }
    if (filters.amount_min) {
      apiFilters.amount_min = Number(filters.amount_min);
    }
    if (filters.amount_max) {
      apiFilters.amount_max = Number(filters.amount_max);
    }

    return apiFilters;
  };

  // ========== Queries ==========
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-invoice-list'],
    queryFn: async () => {
      const response = await api.post('/branch/index', {
        filters: { active: true },
        orderBy: 'id',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: false
      });
      return response.data.result === 'Success' ? response.data.data || [] : [];
    },
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ['currencies-invoice-list'],
    queryFn: async () => {
      const response = await api.post('/currency/index', {
        filters: {},
        orderBy: 'id',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: false
      });
      return response.data.result === 'Success' ? response.data.data || [] : [];
    },
  });

  const { data: taxes = [] } = useQuery({
    queryKey: ['taxes-invoice-list'],
    queryFn: async () => {
      const response = await api.post('/tax/index', {
        filters: {},
        orderBy: 'id',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: false
      });
      return response.data.result === 'Success' ? response.data.data || [] : [];
    },
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['customers-invoice-list'],
    queryFn: async () => {
      const response = await api.post('/customer/index', {
        filters: {},
        orderBy: 'id',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: false
      });
      return response.data.result === 'Success' ? response.data.data || [] : [];
    },
  });

  const { data: salesmen = [] } = useQuery({
    queryKey: ['salesmen-invoice-list'],
    queryFn: async () => {
      const response = await api.post('/sales-representative/index', {
        filters: {},
        orderBy: 'id',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: false
      });
      return response.data.result === 'Success' ? response.data.data || [] : [];
    },
  });

  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-invoice-list'],
    queryFn: async () => {
      const response = await api.post('/warehouse/index', {
        filters: { active: true },
        orderBy: 'id',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: false
      });
      return response.data.result === 'Success' ? response.data.data || [] : [];
    },
  });

  const { data: responseData, isLoading, refetch } = useQuery({
    queryKey: ['sales-invoices', buildFilters()],
    queryFn: async () => {
      const apiFilters = buildFilters();
      const payload: any = {
        filters: apiFilters,
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: 50,
        paginate: true,
        with: ['customer', 'sales_representative', 'branch', 'warehouse', 'currency', 'tax']
      };
      const response = await api.post('/sales-invoices/index', payload);
      return response.data.result === 'Success' ? response.data : { data: [], meta: { total: 0 } };
    }
  });

  const invoices = responseData?.data || [];
  const totalInvoices = responseData?.meta?.total || 0;

  // ========== جلب تفاصيل الفاتورة للطباعة ==========
  const fetchInvoiceDetails = async (invoiceId: number) => {
    try {
      toast.loading(language === 'ar' ? 'جاري تحميل الفاتورة...' : 'Loading invoice...');
      const response = await api.get(`/sales-invoices/${invoiceId}`);

      if (response.data.result === 'Success') {
        setInvoiceToPrint(response.data.data);
        setShowPrintDialog(true);
        toast.dismiss();
      } else {
        toast.error(language === 'ar' ? 'خطأ في تحميل الفاتورة' : 'Error loading invoice');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      toast.error(language === 'ar' ? 'خطأ في تحميل الفاتورة' : 'Error loading invoice');
    } finally {
      toast.dismiss();
    }
  };

  // ========== طباعة الفاتورة ==========
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `invoice-${invoiceToPrint?.invoice_number || 'print'}`,
    onAfterPrint: () => {
      setShowPrintDialog(false);
      setInvoiceToPrint(null);
      toast.success(language === 'ar' ? 'تمت الطباعة بنجاح' : 'Print completed successfully');
    },
  });

  // ========== تصدير إلى Excel ==========
  const exportToExcel = () => {
    if (invoices.length === 0) {
      toast.error(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    const excelData = invoices.map((invoice: SalesInvoice, index: number) => ({
      '#': index + 1,
      [language === 'ar' ? 'رقم الفاتورة' : 'Invoice #']: invoice.invoice_number,
      [language === 'ar' ? 'العميل' : 'Customer']: language === 'ar' ? invoice.customer?.name_ar || invoice.customer?.name : invoice.customer?.name,
      [language === 'ar' ? 'تاريخ الفاتورة' : 'Date']: formatDate(invoice.created_at),
      [language === 'ar' ? 'طريقة الدفع' : 'Payment Method']: invoice.payment_method,
      [language === 'ar' ? 'حالة الدفع' : 'Payment Status']: invoice.payment_status,
      [language === 'ar' ? 'الفرع' : 'Branch']: invoice.branch,
      [language === 'ar' ? 'المخزن' : 'Warehouse']: invoice.warehouse,
      [language === 'ar' ? 'المندوب' : 'Sales Rep']: invoice.sales_representative?.name,
      [language === 'ar' ? 'الإجمالي' : 'Total']: Number(invoice.total_amount),
      [language === 'ar' ? 'خصم الفاتورة' : 'Invoice Discount']: Number(invoice.discount_amount || 0),
      [language === 'ar' ? 'الصافي' : 'Net Total']: Number(invoice.net_total),
      [language === 'ar' ? 'الملاحظات' : 'Notes']: invoice.note || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Invoices');

    const fileName = `sales-invoices-${new Date().toISOString().split('T')[0]}.xlsx`;
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([excelBuffer], { type: 'application/octet-stream' }), fileName);

    toast.success(language === 'ar' ? 'تم التصدير بنجاح' : 'Exported successfully');
  };

  // ========== جلب فاتورة للمرتجع ==========
  const fetchInvoiceForReturn = async (invoiceId: number) => {
    try {
      const response = await api.get(`/sales-invoices/${invoiceId}`);
      if (response.data.result === 'Success') {
        setSelectedInvoiceForReturn(response.data.data);
        setShowReturnForm(true);
      } else {
        toast.error(language === 'ar' ? 'خطأ في جلب الفاتورة' : 'Error fetching invoice');
      }
    } catch (error) {
      console.error('Error fetching invoice for return:', error);
      toast.error(language === 'ar' ? 'خطأ في جلب الفاتورة' : 'Error fetching invoice');
    }
  };

  // ========== Filter Handlers ==========
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      payment_status: 'all',
      payment_method: 'all',
      branch_id: user?.branch_id ? String(user.branch_id) : 'all',
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

  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'search') return value !== '';
    return value !== 'all' && value !== '';
  }).length;

  // ========== Helper Functions ==========
  const getPaymentMethodBadge = (method: string) => {
    const config: Record<string, { label: string; className: string; icon: JSX.Element }> = {
      cash: {
        label: language === 'ar' ? 'نقدي' : 'Cash',
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200',
        icon: <DollarSign size={12} />
      },
      card: {
        label: language === 'ar' ? 'بطاقة' : 'Card',
        className: 'bg-blue-500/10 text-blue-600 border-blue-200',
        icon: <CreditCard size={12} />
      },
      wallet: {
        label: language === 'ar' ? 'محفظة' : 'Wallet',
        className: 'bg-purple-500/10 text-purple-600 border-purple-200',
        icon: <Wallet size={12} />
      },
      credit: {
        label: language === 'ar' ? 'آجل' : 'Credit',
        className: 'bg-amber-500/10 text-amber-600 border-amber-200',
        icon: <Clock size={12} />
      }
    };
    const c = config[method] || config.cash;
    return (
      <Badge variant="outline" className={`${c.className} flex items-center gap-1`}>
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      paid: { label: language === 'ar' ? 'مدفوع' : 'Paid', className: 'bg-emerald-500/10 text-emerald-600' },
      pending: { label: language === 'ar' ? 'معلق' : 'Pending', className: 'bg-amber-500/10 text-amber-600' },
      partial: { label: language === 'ar' ? 'جزئي' : 'Partial', className: 'bg-blue-500/10 text-blue-600' },
      cancelled: { label: language === 'ar' ? 'ملغي' : 'Cancelled', className: 'bg-red-500/10 text-red-600' }
    };
    const c = config[status] || config.pending;
    return <Badge className={c.className}>{c.label}</Badge>;
  };

  // حساب خصم الفاتورة
  const getInvoiceDiscount = (invoice: SalesInvoice) => {
    return Number(invoice.discount_amount || 0);
  };

  // حساب خصم المنتجات
  const getItemsDiscount = (invoice: SalesInvoice) => {
    return invoice.items?.reduce((sum, item: any) => {
      const itemDiscount = item.discount_amount || 
                          (item.price * item.quantity - item.total) || 0;
      return sum + Number(itemDiscount);
    }, 0) || 0;
  };

  // حساب إجمالي الخصم
  const getTotalDiscount = (invoice: SalesInvoice) => {
    return getInvoiceDiscount(invoice) + getItemsDiscount(invoice);
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
                  ? `عرض ${invoices.length} من أصل ${totalInvoices} فاتورة`
                  : `Showing ${invoices.length} of ${totalInvoices} invoices`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet size={16} />
              {language === 'ar' ? 'Excel' : 'Excel'}
            </Button>
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading} className="gap-2">
              <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {language === 'ar' ? 'تحديث' : 'Refresh'}
            </Button>
            <Button onClick={() => setShowForm(true)} className="gap-2 bg-gradient-to-r from-primary to-primary/80">
              <Plus size={16} />
              {language === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">{language === 'ar' ? 'إجمالي الفواتير' : 'Total Invoices'}</p>
                <p className="text-2xl font-bold text-emerald-800">{totalInvoices}</p>
              </div>
              <div className="p-2 bg-emerald-200/50 rounded-lg"><Receipt className="h-6 w-6 text-emerald-600" /></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">{language === 'ar' ? 'إجمالي المبيعات' : 'Total Sales'}</p>
                <p className="text-2xl font-bold text-blue-800">
                  {invoices.reduce((sum: number, inv: SalesInvoice) => sum + (Number(inv.total_amount) || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-blue-200/50 rounded-lg"><DollarSign className="h-6 w-6 text-blue-600" /></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">{language === 'ar' ? 'المدفوع' : 'Paid'}</p>
                <p className="text-2xl font-bold text-amber-800">
                  {invoices.reduce((sum: number, inv: SalesInvoice) => sum + (Number(inv.paid_amount) || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-amber-200/50 rounded-lg"><Wallet className="h-6 w-6 text-amber-600" /></div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-red-50 to-red-100/50">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">{language === 'ar' ? 'المتبقي' : 'Remaining'}</p>
                <p className="text-2xl font-bold text-red-800">
                  {invoices.reduce((sum: number, inv: SalesInvoice) => sum + (Number(inv.remaining_amount) || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="p-2 bg-red-200/50 rounded-lg"><Clock className="h-6 w-6 text-red-600" /></div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setFiltersCollapsed(!filtersCollapsed)}>
                <div className="w-1 h-5 bg-primary rounded-full" />
                <Filter size={16} />
                <CardTitle className="text-lg">{language === 'ar' ? 'بحث وتصفية' : 'Search & Filter'}</CardTitle>
                {activeFiltersCount > 0 && <Badge variant="secondary">{activeFiltersCount}</Badge>}
                {filtersCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setFiltersCollapsed(!filtersCollapsed)} className="h-8 px-2 text-xs">
                  {filtersCollapsed ? (language === 'ar' ? 'فتح الفلاتر' : 'Expand') : (language === 'ar' ? 'طي الفلاتر' : 'Collapse')}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-8 px-2 text-xs">
                  <X size={12} className="ml-1" />
                  {language === 'ar' ? 'مسح الكل' : 'Clear'}
                </Button>
              </div>
            </div>
          </CardHeader>

          {!filtersCollapsed && (
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1"><Search size={12} />{language === 'ar' ? 'بحث' : 'Search'}</label>
                  <input type="text" className="w-full px-3 py-2 border rounded-md bg-background" placeholder={language === 'ar' ? 'رقم الفاتورة...' : 'Invoice number...'} value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium"><User size={12} className="inline ml-1" />{language === 'ar' ? 'العميل' : 'Customer'}</label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background" value={filters.customer_id} onChange={(e) => handleFilterChange('customer_id', e.target.value)}>
                    <option value="all">{language === 'ar' ? 'كل العملاء' : 'All Customers'}</option>
                    {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium"><Building2 size={12} className="inline ml-1" />{language === 'ar' ? 'الفرع' : 'Branch'}</label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background" value={filters.branch_id} onChange={(e) => handleFilterChange('branch_id', e.target.value)}>
                    <option value="all">{language === 'ar' ? 'كل الفروع' : 'All Branches'}</option>
                    {branches.map((b: any) => (<option key={b.id} value={b.id}>{b.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium"><Truck size={12} className="inline ml-1" />{language === 'ar' ? 'المندوب' : 'Salesman'}</label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background" value={filters.salesman_id} onChange={(e) => handleFilterChange('salesman_id', e.target.value)}>
                    <option value="all">{language === 'ar' ? 'كل المندوبين' : 'All Salesmen'}</option>
                    {salesmen.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium"><Package size={12} className="inline ml-1" />{language === 'ar' ? 'المخزن' : 'Warehouse'}</label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background" value={filters.warehouse_id} onChange={(e) => handleFilterChange('warehouse_id', e.target.value)}>
                    <option value="all">{language === 'ar' ? 'كل المخازن' : 'All Warehouses'}</option>
                    {warehouses.map((w: any) => (<option key={w.id} value={w.id}>{w.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium"><DollarSign size={12} className="inline ml-1" />{language === 'ar' ? 'العملة' : 'Currency'}</label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background" value={filters.currency_id} onChange={(e) => handleFilterChange('currency_id', e.target.value)}>
                    <option value="all">{language === 'ar' ? 'كل العملات' : 'All Currencies'}</option>
                    {currencies.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium"><Percent size={12} className="inline ml-1" />{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background" value={filters.payment_method} onChange={(e) => handleFilterChange('payment_method', e.target.value)}>
                    <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
                    <option value="cash">{language === 'ar' ? 'نقدي' : 'Cash'}</option>
                    <option value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</option>
                    <option value="wallet">{language === 'ar' ? 'محفظة' : 'Wallet'}</option>
                    <option value="credit">{language === 'ar' ? 'آجل' : 'Credit'}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium"><Tag size={12} className="inline ml-1" />{language === 'ar' ? 'حالة الدفع' : 'Payment Status'}</label>
                  <select className="w-full px-3 py-2 border rounded-md bg-background" value={filters.payment_status} onChange={(e) => handleFilterChange('payment_status', e.target.value)}>
                    <option value="all">{language === 'ar' ? 'الكل' : 'All'}</option>
                    <option value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</option>
                    <option value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</option>
                    <option value="partial">{language === 'ar' ? 'جزئي' : 'Partial'}</option>
                    <option value="cancelled">{language === 'ar' ? 'ملغي' : 'Cancelled'}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium"><Calendar size={12} className="inline ml-1" />{language === 'ar' ? 'من تاريخ' : 'From Date'}</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-md bg-background" value={filters.date_from} onChange={(e) => handleFilterChange('date_from', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium"><Calendar size={12} className="inline ml-1" />{language === 'ar' ? 'إلى تاريخ' : 'To Date'}</label>
                  <input type="date" className="w-full px-3 py-2 border rounded-md bg-background" value={filters.date_to} onChange={(e) => handleFilterChange('date_to', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{language === 'ar' ? 'أقل مبلغ' : 'Min Amount'}</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-md bg-background" placeholder="0" value={filters.amount_min} onChange={(e) => handleFilterChange('amount_min', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{language === 'ar' ? 'أكبر مبلغ' : 'Max Amount'}</label>
                  <input type="number" className="w-full px-3 py-2 border rounded-md bg-background" placeholder="1000000" value={filters.amount_max} onChange={(e) => handleFilterChange('amount_max', e.target.value)} />
                </div>
              </div>
            </CardContent>
          )}

          {filtersCollapsed && activeFiltersCount > 0 && (
            <div className="px-6 pb-3 pt-0">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium">{language === 'ar' ? 'الفلاتر النشطة:' : 'Active filters:'}</span>
                {filters.search && <Badge variant="secondary">🔍 {filters.search}</Badge>}
                {filters.customer_id !== 'all' && <Badge variant="secondary">👤 {customers.find((c: any) => c.id === Number(filters.customer_id))?.name}</Badge>}
                {filters.branch_id !== 'all' && <Badge variant="secondary">🏢 {branches.find((b: any) => b.id === Number(filters.branch_id))?.name}</Badge>}
              </div>
            </div>
          )}
        </Card>

        {/* Table Card */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-0">
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                    <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                    <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                    <TableHead className="text-right">
                      {language === 'ar' ? 'الخصم' : 'Discount'}
                    </TableHead>
                    <TableHead>{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (<TableCell key={j}><div className="h-5 bg-muted rounded animate-pulse" /></TableCell>))}
                      </TableRow>
                    ))
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-[400px] text-center">
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="p-4 bg-muted/30 rounded-full mb-4"><Receipt className="h-12 w-12 text-muted-foreground/50" /></div>
                          <h3 className="text-lg font-semibold mb-2">{language === 'ar' ? 'لا توجد نتائج' : 'No results found'}</h3>
                          <Button variant="outline" onClick={handleResetFilters} className="gap-2"><X size={16} />{language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice: SalesInvoice) => (
                      <TableRow key={invoice.id} className="group cursor-pointer hover:bg-primary/5 transition-all" onClick={() => setSelectedInvoice(invoice)}>
                        {/* رقم الفاتورة */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-1 h-8 bg-primary/30 rounded-full group-hover:bg-primary transition-colors" />
                            <div>
                              <span className="font-mono font-semibold text-sm">{invoice.invoice_number}</span>
                              <div className="text-xs text-muted-foreground">#{invoice.id}</div>
                            </div>
                          </div>
                        </TableCell>

                        {/* العميل */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">{invoice.customer?.name?.charAt(0) || 'C'}</span>
                            </div>
                            <div>
                              <div className="font-medium text-sm">{language === 'ar' ? invoice.customer?.name_ar || invoice.customer?.name : invoice.customer?.name}</div>
                              {invoice.customer?.phone && <div className="text-xs text-muted-foreground">{invoice.customer.phone}</div>}
                            </div>
                          </div>
                        </TableCell>

                        {/* التاريخ */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{formatDate(invoice.created_at)}</span>
                            <span className="text-xs text-muted-foreground">{new Date(invoice.created_at).toLocaleTimeString()}</span>
                          </div>
                        </TableCell>

                        {/* الإجمالي */}
                        <TableCell className="text-right">
                          <div className="flex flex-col gap-1">
                            {/* السعر الأصلي */}
                            <span className="text-sm text-muted-foreground line-through">
                              {Number(invoice.total_amount).toLocaleString()}
                            </span>

                            {/* خصم المنتجات */}
                            {getItemsDiscount(invoice) > 0 && (
                              <span className="text-xs text-red-500">
                                {language === 'ar' ? 'خصم منتجات:' : 'Items:'} 
                                - {getItemsDiscount(invoice).toLocaleString()}
                              </span>
                            )}

                            {/* خصم الفاتورة */}
                            {Number(invoice.discount_amount) > 0 && (
                              <span className="text-xs text-red-600">
                                {language === 'ar' ? 'خصم فاتورة:' : 'Invoice:'} 
                                - {Number(invoice.discount_amount).toLocaleString()}
                                {invoice.discount_percentage && 
                                  ` (${invoice.discount_percentage}%)`
                                }
                              </span>
                            )}

                            {/* الصافي */}
                            <span className="font-bold text-primary">
                              {Number(invoice.net_total || invoice.total_amount).toLocaleString()}
                            </span>

                            <span className="text-xs text-muted-foreground">
                              {invoice.currency || 'YER'}
                            </span>
                          </div>
                        </TableCell>

                        {/* الخصم */}
                        <TableCell className="text-right">
                          <div className="flex flex-col gap-1">
                            {/* إجمالي الخصم */}
                            <span className="text-red-600 font-semibold">
                              {getTotalDiscount(invoice).toLocaleString()}
                            </span>
                            
                            {/* خصم الفاتورة */}
                            <span className="text-xs text-muted-foreground">
                              {language === 'ar' ? 'خصم الفاتورة:' : 'Invoice:'} 
                              {Number(invoice.discount_amount || 0).toLocaleString()}
                              {invoice.discount_percentage && 
                                ` (${invoice.discount_percentage}%)`
                              }
                            </span>
                            
                            {/* خصم المنتجات */}
                            <span className="text-xs text-muted-foreground">
                              {language === 'ar' ? 'خصم المنتجات:' : 'Items:'} 
                              {getItemsDiscount(invoice).toLocaleString()}
                            </span>

                            {/* تفاصيل خصم كل منتج */}
                            {invoice.items?.map((item: any, idx: number) => {
                              const itemDiscount = item.discount_amount || 
                                                  (item.price * item.quantity - item.total) || 0;
                              if (itemDiscount > 0) {
                                return (
                                  <span key={idx} className="text-xs text-muted-foreground/70">
                                    • {item.product_name}: {itemDiscount.toLocaleString()}
                                    {item.discount_percentage && 
                                      ` (${item.discount_percentage}%)`
                                    }
                                  </span>
                                );
                              }
                              return null;
                            })}
                          </div>
                        </TableCell>

                        {/* طريقة الدفع */}
                        <TableCell>
                          {getPaymentMethodBadge(invoice.payment_method)}
                        </TableCell>

                        {/* الإجراءات */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-primary/10" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                setSelectedInvoice(invoice); 
                              }} 
                              title={language === 'ar' ? 'عرض' : 'View'}
                            >
                              <Eye size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-blue-500/10" 
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                fetchInvoiceDetails(invoice.id); 
                              }} 
                              title={language === 'ar' ? 'طباعة' : 'Print'}
                            >
                              <Printer size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 hover:bg-amber-500/10" 
                              onClick={async (e) => { 
                                e.stopPropagation(); 
                                await fetchInvoiceForReturn(invoice.id); 
                              }} 
                              title={language === 'ar' ? 'مرتجع' : 'Return'}
                            >
                              <RotateCcw size={16} />
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

      {/* Modals */}
      <SalesInvoiceForm isOpen={showForm} onClose={() => setShowForm(false)} />

      {selectedInvoice && (
        <InvoiceDetails invoice={selectedInvoice} isOpen={!!selectedInvoice} onClose={() => setSelectedInvoice(null)} />
      )}

      <InvoiceReturnForm isOpen={showReturnForm} onClose={() => { setShowReturnForm(false); setSelectedInvoiceForReturn(null); }} invoiceData={selectedInvoiceForReturn} />

      {/* Print Dialog Modal */}
      {showPrintDialog && invoiceToPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Printer size={20} />
                {language === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowPrintDialog(false); setInvoiceToPrint(null); }}>
                <X size={20} />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <AdvancedPrintTemplate
                ref={printRef}
                invoice={invoiceToPrint}
                companyInfo={companyInfo}
                language={language}
              />
            </div>
            <div className="flex items-center justify-end gap-2 p-4 border-t">
              <Button variant="outline" onClick={() => { setShowPrintDialog(false); setInvoiceToPrint(null); }}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
              <Button onClick={handlePrint} className="gap-2 bg-primary">
                <Printer size={16} />
                {language === 'ar' ? 'طباعة' : 'Print'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SalesInvoiceList;