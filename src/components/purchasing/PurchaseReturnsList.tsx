import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RotateCcw, Eye, Plus, FileText, Package, Building2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import PurchaseReturnForm from "./PurchaseReturnForm";
import AdvancedFilter, { FilterField, FilterValues } from "@/components/ui/advanced-filter";
import api from "@/lib/api";
import { toast } from "@/components/ui/use-toast";

// Interfaces for API response
interface Product {
  id: number;
  name: string;
}

interface ReturnItem {
  id: number;
  product: Product;
  color: string | null;
  size: string | null;
  quantity: number;
  price: number;
  total: number;
  created_at: string;
}

interface Customer {
  id: number;
  name: string;
}

interface Amounts {
  total: string;
  paid: string;
  remaining: string;
}

interface InvoiceItem {
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
  items: InvoiceItem[];
  payments: Payment[];
  created_at: string;
}

interface ReturnInvoice {
  id: number;
  return_number: string;
  invoice_id: number;
  total_amount: number;
  refunded_amount: number;
  refund_method: string;
  reason: string;
  created_at: string;
  items: ReturnItem[];
  invoice: Invoice;
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

interface ReturnInvoicesIndexResponse {
  data: ReturnInvoice[];
  links: Links;
  meta: Meta;
  result: string;
  message: string;
  status: number;
}

interface SupplierOption {
  id: string;
  name: string;
  name_ar: string;
}

interface BranchOption {
  id: string;
  name: string;
  name_ar: string;
}

interface WarehouseOption {
  id: string;
  name: string;
  name_ar: string;
}

interface ReturnFilters {
  search?: string;
  supplier_id?: string;
  branch_id?: string;
  warehouse_id?: string;
  status?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
}

const PurchaseReturnsList = () => {
  const { language } = useLanguage();
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [showForm, setShowForm] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnInvoice | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch branches for filter
  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data } = await supabase.from('branches').select('id, name, name_ar').eq('is_active', true);
      return data || [];
    }
  });

  // Fetch warehouses for filter
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data } = await supabase.from('warehouses').select('id, name, name_ar').eq('is_active', true);
      return data || [];
    }
  });

  // Fetch suppliers for filter
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data } = await supabase.from('suppliers').select('id, name, name_ar').eq('is_active', true);
      return data || [];
    }
  });

  const filterFields: FilterField[] = [
    { key: 'search', label: 'Return/Invoice', labelAr: 'المرتجع/الفاتورة', type: 'text', placeholder: 'Search...', placeholderAr: 'بحث...' },
    { key: 'supplier_id', label: 'Supplier', labelAr: 'المورد', type: 'select', options: suppliers.map((s: SupplierOption) => ({ value: s.id, label: s.name, labelAr: s.name_ar })) },
    { key: 'branch_id', label: 'Branch', labelAr: 'الفرع', type: 'select', options: branches.map((b: BranchOption) => ({ value: b.id, label: b.name, labelAr: b.name_ar })) },
    { key: 'warehouse_id', label: 'Warehouse', labelAr: 'المستودع', type: 'select', options: warehouses.map((w: WarehouseOption) => ({ value: w.id, label: w.name, labelAr: w.name_ar })) },
    {
      key: 'status', label: 'Status', labelAr: 'الحالة', type: 'select', options: [
        { value: 'completed', label: 'Completed', labelAr: 'مكتمل' },
        { value: 'pending', label: 'Pending', labelAr: 'معلق' },
        { value: 'cancelled', label: 'Cancelled', labelAr: 'ملغي' },
      ]
    },
    { key: 'date', label: 'Date', labelAr: 'التاريخ', type: 'dateRange' },
    { key: 'amount', label: 'Amount', labelAr: 'المبلغ', type: 'numberRange' },
  ];

  // Fetch purchase returns with filters
  const { data: returnsResponse, isLoading, refetch } = useQuery<ReturnInvoicesIndexResponse>({
    queryKey: ['purchase-returns', filterValues],
    queryFn: async () => {
      try {
        // Build request body for filtering
        const requestBody: Partial<ReturnFilters> = {};

        if (filterValues.search) {
          requestBody.search = filterValues.search;
        }
        if (filterValues.supplier_id && filterValues.supplier_id !== 'all') {
          requestBody.supplier_id = filterValues.supplier_id;
        }
        if (filterValues.branch_id && filterValues.branch_id !== 'all') {
          requestBody.branch_id = filterValues.branch_id;
        }
        if (filterValues.warehouse_id && filterValues.warehouse_id !== 'all') {
          requestBody.warehouse_id = filterValues.warehouse_id;
        }
        if (filterValues.status && filterValues.status !== 'all') {
          requestBody.status = filterValues.status;
        }
        if (filterValues.date_from) {
          requestBody.date_from = filterValues.date_from.split('T')[0];
        }
        if (filterValues.date_to) {
          requestBody.date_to = filterValues.date_to.split('T')[0];
        }
        if (filterValues.amount_min) {
          requestBody.amount_min = filterValues.amount_min;
        }
        if (filterValues.amount_max) {
          requestBody.amount_max = filterValues.amount_max;
        }

        const response = await api.post<ReturnInvoicesIndexResponse>('/return-invoices/index', requestBody);

        if (response.data.result === 'Success') {
          return response.data;
        }

        throw new Error(response.data.message || 'Failed to fetch returns');
      } catch (error) {
        console.error('Error fetching returns:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب المرتجعات' : 'Error fetching returns',
          variant: 'destructive',
        });
        throw error;
      }
    }
  });

  const returns = returnsResponse?.data || [];

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      completed: { label: language === 'ar' ? 'مكتمل' : 'Completed', variant: 'default' },
      pending: { label: language === 'ar' ? 'معلق' : 'Pending', variant: 'secondary' },
      cancelled: { label: language === 'ar' ? 'ملغي' : 'Cancelled', variant: 'destructive' }
    };
    const { label, variant } = config[status] || config.pending;
    return <Badge variant={variant}>{label}</Badge>;
  };

  const getRefundMethodLabel = (method: string) => {
    const methods: Record<string, { ar: string; en: string }> = {
      credit: { ar: 'خصم من الرصيد', en: 'Credit' },
      cash: { ar: 'نقداً', en: 'Cash' },
      bank: { ar: 'تحويل بنكي', en: 'Bank Transfer' }
    };
    return language === 'ar' ? methods[method]?.ar || method : methods[method]?.en || method;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex-1 w-full">
          <AdvancedFilter
            fields={filterFields}
            values={filterValues}
            onChange={setFilterValues}
            onReset={() => setFilterValues({})}
            language={language as 'ar' | 'en'}
          />
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus size={16} className="me-2" />
          {language === 'ar' ? 'مرتجع جديد' : 'New Return'}
        </Button>
      </div>

      {/* Returns Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {language === 'ar' ? 'مرتجعات المشتريات' : 'Purchase Returns'}
            <Badge variant="secondary">{returns.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{language === 'ar' ? 'رقم المرتجع' : 'Return #'}</TableHead>
                <TableHead>{language === 'ar' ? 'فاتورة الشراء' : 'Purchase Invoice'}</TableHead>
                <TableHead>{language === 'ar' ? 'المورد' : 'Supplier'}</TableHead>
                <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                <TableHead>{language === 'ar' ? 'طريقة الاسترداد' : 'Refund Method'}</TableHead>
                <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                <TableHead>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
                      {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    {language === 'ar' ? 'لا توجد مرتجعات' : 'No returns found'}
                  </TableCell>
                </TableRow>
              ) : (
                returns.map((ret: ReturnInvoice) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-mono font-medium">{ret.return_number}</TableCell>
                    <TableCell className="font-mono">{ret.invoice.invoice_number}</TableCell>
                    <TableCell>
                      {language === 'ar' ? ret.invoice.customer.name : ret.invoice.customer.name}
                    </TableCell>
                    <TableCell className="font-medium">{Number(ret.total_amount).toLocaleString()} YER</TableCell>
                    <TableCell>{getRefundMethodLabel(ret.refund_method)}</TableCell>
                    <TableCell>{getStatusBadge('completed')}</TableCell>
                    <TableCell>
                      {format(new Date(ret.created_at), 'yyyy/MM/dd', { locale: language === 'ar' ? ar : undefined })}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { setSelectedReturn(ret); setShowDetails(true); }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Return Form */}
      <PurchaseReturnForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={() => refetch()}
      />

      {/* Return Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {language === 'ar' ? 'تفاصيل المرتجع' : 'Return Details'}
              <span className="font-mono text-muted-foreground">#{selectedReturn?.return_number}</span>
            </DialogTitle>
          </DialogHeader>

          {selectedReturn && (
            <div className="space-y-4">
              {/* Info Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">{language === 'ar' ? 'فاتورة الشراء' : 'Purchase Invoice'}</div>
                    <div className="font-mono font-medium">{selectedReturn.invoice.invoice_number}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {language === 'ar' ? 'المورد' : 'Supplier'}
                    </div>
                    <div className="font-medium">
                      {language === 'ar' ? selectedReturn.invoice.customer.name : selectedReturn.invoice.customer.name}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">{language === 'ar' ? 'الإجمالي' : 'Total'}</div>
                    <div className="font-bold text-primary">{Number(selectedReturn.total_amount).toLocaleString()} YER</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground">{language === 'ar' ? 'الحالة' : 'Status'}</div>
                    <div>{getStatusBadge('completed')}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Items Table */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    {language === 'ar' ? 'الأصناف المرتجعة' : 'Returned Items'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                        <TableHead className="text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                        <TableHead className="text-right">{language === 'ar' ? 'سعر الوحدة' : 'Unit Cost'}</TableHead>
                        <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedReturn.items?.map((item: ReturnItem) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product.name}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{Number(item.price).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">{Number(item.total).toLocaleString()} YER</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Summary */}
              <div className="space-y-2 text-sm">
                {selectedReturn.reason && (
                  <div>
                    <span className="text-muted-foreground">{language === 'ar' ? 'السبب:' : 'Reason:'}</span>
                    <span className="ml-2">{selectedReturn.reason}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold pt-2 border-t">
                  <span>{language === 'ar' ? 'الإجمالي:' : 'Total:'}</span>
                  <span className="text-primary">{Number(selectedReturn.total_amount).toLocaleString()} YER</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseReturnsList;
