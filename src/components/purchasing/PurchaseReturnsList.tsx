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

const PurchaseReturnsList = () => {
  const { language } = useLanguage();
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [showForm, setShowForm] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
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
    { key: 'supplier_id', label: 'Supplier', labelAr: 'المورد', type: 'select', options: suppliers.map((s: any) => ({ value: s.id, label: s.name, labelAr: s.name_ar })) },
    { key: 'branch_id', label: 'Branch', labelAr: 'الفرع', type: 'select', options: branches.map((b: any) => ({ value: b.id, label: b.name, labelAr: b.name_ar })) },
    { key: 'warehouse_id', label: 'Warehouse', labelAr: 'المستودع', type: 'select', options: warehouses.map((w: any) => ({ value: w.id, label: w.name, labelAr: w.name_ar })) },
    { key: 'status', label: 'Status', labelAr: 'الحالة', type: 'select', options: [
      { value: 'completed', label: 'Completed', labelAr: 'مكتمل' },
      { value: 'pending', label: 'Pending', labelAr: 'معلق' },
      { value: 'cancelled', label: 'Cancelled', labelAr: 'ملغي' },
    ]},
    { key: 'date', label: 'Date', labelAr: 'التاريخ', type: 'dateRange' },
    { key: 'amount', label: 'Amount', labelAr: 'المبلغ', type: 'numberRange' },
  ];

  // Fetch purchase returns with filters
  const { data: returns = [], isLoading, refetch } = useQuery({
    queryKey: ['purchase-returns', filterValues],
    queryFn: async () => {
      let query = supabase
        .from('purchase_returns')
        .select(`
          *,
          supplier:suppliers(id, name, name_ar),
          branch:branches(id, name, name_ar),
          warehouse:warehouses(id, name, name_ar),
          items:purchase_return_items(
            id,
            product_name,
            quantity,
            unit_cost,
            total_cost,
            reason
          )
        `)
        .order('created_at', { ascending: false });
      
      if (filterValues.search) {
        query = query.or(`return_number.ilike.%${filterValues.search}%,original_invoice_number.ilike.%${filterValues.search}%`);
      }
      if (filterValues.supplier_id && filterValues.supplier_id !== 'all') {
        query = query.eq('supplier_id', filterValues.supplier_id);
      }
      if (filterValues.branch_id && filterValues.branch_id !== 'all') {
        query = query.eq('branch_id', filterValues.branch_id);
      }
      if (filterValues.warehouse_id && filterValues.warehouse_id !== 'all') {
        query = query.eq('warehouse_id', filterValues.warehouse_id);
      }
      if (filterValues.status && filterValues.status !== 'all') {
        query = query.eq('status', filterValues.status);
      }
      if (filterValues.date_from) {
        query = query.gte('return_date', filterValues.date_from.split('T')[0]);
      }
      if (filterValues.date_to) {
        query = query.lte('return_date', filterValues.date_to.split('T')[0]);
      }
      if (filterValues.amount_min) {
        query = query.gte('total_amount', Number(filterValues.amount_min));
      }
      if (filterValues.amount_max) {
        query = query.lte('total_amount', Number(filterValues.amount_max));
      }
      
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    }
  });

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
                <TableHead></TableHead>
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
                returns.map((ret: any) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-mono font-medium">{ret.return_number}</TableCell>
                    <TableCell className="font-mono">{ret.original_invoice_number}</TableCell>
                    <TableCell>
                      {language === 'ar' ? ret.supplier?.name_ar || ret.supplier?.name : ret.supplier?.name}
                    </TableCell>
                    <TableCell className="font-medium">{Number(ret.total_amount).toLocaleString()} YER</TableCell>
                    <TableCell>{getRefundMethodLabel(ret.refund_method)}</TableCell>
                    <TableCell>{getStatusBadge(ret.status)}</TableCell>
                    <TableCell>
                      {format(new Date(ret.return_date), 'yyyy/MM/dd', { locale: language === 'ar' ? ar : undefined })}
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
                    <div className="font-mono font-medium">{selectedReturn.original_invoice_number}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {language === 'ar' ? 'المورد' : 'Supplier'}
                    </div>
                    <div className="font-medium">
                      {language === 'ar' ? selectedReturn.supplier?.name_ar || selectedReturn.supplier?.name : selectedReturn.supplier?.name}
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
                    <div>{getStatusBadge(selectedReturn.status)}</div>
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
                      {selectedReturn.items?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-center">{item.quantity}</TableCell>
                          <TableCell className="text-right">{Number(item.unit_cost).toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">{Number(item.total_cost).toLocaleString()} YER</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Summary */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  {selectedReturn.reason && (
                    <div>
                      <span className="text-muted-foreground">{language === 'ar' ? 'السبب:' : 'Reason:'}</span>
                      <span className="ml-2">{selectedReturn.reason}</span>
                    </div>
                  )}
                  {selectedReturn.notes && (
                    <div>
                      <span className="text-muted-foreground">{language === 'ar' ? 'ملاحظات:' : 'Notes:'}</span>
                      <span className="ml-2">{selectedReturn.notes}</span>
                    </div>
                  )}
                </div>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4 text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                      <span>{Number(selectedReturn.subtotal).toLocaleString()} YER</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{language === 'ar' ? 'الضريبة:' : 'Tax:'}</span>
                      <span>{Number(selectedReturn.tax_amount).toLocaleString()} YER</span>
                    </div>
                    <div className="flex justify-between font-bold pt-2 border-t">
                      <span>{language === 'ar' ? 'الإجمالي:' : 'Total:'}</span>
                      <span className="text-primary">{Number(selectedReturn.total_amount).toLocaleString()} YER</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseReturnsList;
