import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Eye, Printer, Receipt } from "lucide-react";
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
  currency?: Currency;
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
          filters: { is_active: true },
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
          filters: { is_active: true },
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
          filters: { is_active: true },
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
        { value: 'all', label: 'All', labelAr: 'الكل' },
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

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; className: string }> = {
      paid: { 
        label: language === 'ar' ? 'مدفوع' : 'Paid', 
        variant: 'default',
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
      },
      pending: { 
        label: language === 'ar' ? 'معلق' : 'Pending', 
        variant: 'secondary',
        className: 'bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
      },
      partial: { 
        label: language === 'ar' ? 'جزئي' : 'Partial', 
        variant: 'outline',
        className: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400'
      },
      cancelled: { 
        label: language === 'ar' ? 'ملغي' : 'Cancelled', 
        variant: 'destructive',
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

  const getInvoiceTypeBadge = (type: string) => {
    const typeConfig: Record<string, { label: string; className: string }> = {
      cash: { 
        label: language === 'ar' ? 'نقدي' : 'Cash', 
        className: 'bg-green-500/10 text-green-600 border-green-200'
      },
      credit: { 
        label: language === 'ar' ? 'آجل' : 'Credit', 
        className: 'bg-purple-500/10 text-purple-600 border-purple-200'
      }
    };
    const config = typeConfig[type] || typeConfig.cash;
    return (
      <Badge variant="outline" className={config.className}>
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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <CardTitle>{language === 'ar' ? 'فواتير المبيعات' : 'Sales Invoices'}</CardTitle>
          </div>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {language === 'ar' ? 'فاتورة جديدة' : 'New Invoice'}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Advanced Filter */}
          <div className="mb-4">
            <AdvancedFilter
              fields={filterFields}
              values={filterValues}
              onChange={setFilterValues}
              onReset={handleResetFilters}
              language={language}
            />
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                  <TableHead className="min-w-[150px]">{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                  <TableHead className="min-w-[120px]">{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead className="min-w-[100px] text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                  <TableHead className="min-w-[100px] text-right">{language === 'ar' ? 'المدفوع' : 'Paid'}</TableHead>
                  <TableHead className="min-w-[100px] text-right">{language === 'ar' ? 'المتبقي' : 'Remaining'}</TableHead>
                  <TableHead className="min-w-[100px]">{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                  <TableHead className="min-w-[120px]">{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                  <TableHead className="min-w-[100px] text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      <Receipt className="mx-auto h-12 w-12 mb-4 opacity-20" />
                      <p>{language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((invoice: SalesInvoice) => (
                    <TableRow key={invoice.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedInvoice(invoice)}>
                      <TableCell className="font-mono font-medium">
                        {invoice.invoice_number || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {language === 'ar' 
                            ? invoice.customer?.name_ar || invoice.customer?.name 
                            : invoice.customer?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {invoice.customer?.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatDate(invoice.invoice_date)}
                      </TableCell>
                      <TableCell className="font-medium text-right">
                        {invoice.total_amount?.toLocaleString()} 
                        {invoice.currency?.code ? ` ${invoice.currency.code}` : ''}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.paid_amount?.toLocaleString()}
                        {invoice.currency?.code ? ` ${invoice.currency.code}` : ''}
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.remaining_amount?.toLocaleString()}
                        {invoice.currency?.code ? ` ${invoice.currency.code}` : ''}
                      </TableCell>
                      <TableCell>
                        {getInvoiceTypeBadge(invoice.invoice_type)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(invoice.payment_status)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoice(invoice);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Printer className="h-4 w-4" />
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