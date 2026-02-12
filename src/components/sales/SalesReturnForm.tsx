import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalSettings } from "@/contexts/RegionalSettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Save, Search, Loader2, RotateCcw, ArrowLeftRight, FileText } from "lucide-react";
import api from "@/lib/api";
import { debounce } from "@/lib/utils";

interface ReturnItem {
  id: string;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  price: number;
  reason: string;
}

interface InvoiceReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const InvoiceReturnForm = ({ isOpen, onClose }: InvoiceReturnFormProps) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { formatCurrency } = useRegionalSettings();
  
  // ========== State ==========
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [formData, setFormData] = useState({
    sales_invoice_id: "",
    return_method: "نقدي",
    note: ""
  });
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [returnNumber, setReturnNumber] = useState<string>("");
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // ========== Generate Return Number ==========
  useEffect(() => {
    if (isOpen) {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const random = Math.floor(Math.random() * 9000 + 1000);
      setReturnNumber(`RET-${year}${month}${day}-${random}`);
    }
  }, [isOpen]);

  // ========== البحث عن الفواتير ==========
  const { data: invoiceResults = [], isLoading: searchingInvoices } = useQuery({
    queryKey: ['invoice-search', invoiceSearch],
    queryFn: async () => {
      if (!invoiceSearch || invoiceSearch.length < 2) return [];
      
      try {
        const response = await api.post('/sales-invoices/index', {
          filters: {
            search: invoiceSearch,
            payment_status: ['paid', 'partial'] // فواتير مدفوعة أو جزئية فقط
          },
          with: ['customer'],
          perPage: 10,
          paginate: false
        });
        
        return response.data.result === 'Success' ? response.data.data || [] : [];
      } catch (error) {
        console.error('Error searching invoices:', error);
        return [];
      }
    },
    enabled: invoiceSearch.length >= 2
  });

  // ========== جلب الفاتورة المحددة ==========
  const loadInvoice = async (invoiceId: number, invoiceNumber: string) => {
    try {
      const response = await api.post('/sales-invoices/index', {
        filters: { 
          id: invoiceId
        },
        with: ['items', 'customer'],
        paginate: false
      });
      
      if (response.data.result === 'Success') {
        const invoice = response.data.data?.[0];
        
        if (invoice) {
          setSelectedInvoice(invoice);
          setFormData(prev => ({ 
            ...prev, 
            sales_invoice_id: invoice.invoice_number // هنا بنحط رقم الفاتورة مش الـ ID
          }));
          
          // تحويل items الفاتورة إلى items مرتجع
          if (invoice.items?.length > 0) {
            const returnItems = invoice.items.map((item: any) => ({
              id: crypto.randomUUID(),
              product_id: item.product_id,
              product_name: item.product_name,
              sku: item.sku || '',
              quantity: 1,
              price: Number(item.price) || 0,
              reason: ""
            }));
            
            setItems(returnItems);
            toast.success(language === 'ar' ? 'تم جلب أصناف الفاتورة' : 'Invoice items loaded');
          }
          
          setShowSearchResults(false);
          setInvoiceSearch("");
        }
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error(language === 'ar' ? 'خطأ في جلب الفاتورة' : 'Error loading invoice');
    }
  };

  // ========== Calculations ==========
  const totals = {
    totalAmount: items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  };

  // ========== Handlers ==========

  // ✅ تحديث منتج
  const updateItem = (id: string, field: string, value: number | string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(updated);
  };

  // ✅ حذف منتج
  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast.success(language === 'ar' ? 'تم حذف المنتج' : 'Product removed');
  };

  // ✅ إعادة تعيين النموذج
  const resetForm = () => {
    setItems([]);
    setFormData({
      sales_invoice_id: "",
      return_method: "نقدي",
      note: ""
    });
    setInvoiceSearch("");
    setShowSearchResults(false);
    setSelectedInvoice(null);
  };

  // ✅ إنشاء مرتجع فاتورة - POST /invoice-return/store
  const createReturnMutation = useMutation({
    mutationFn: async () => {
      // التحقق من البيانات المطلوبة
      if (!formData.sales_invoice_id) {
        throw new Error(language === 'ar' ? 'يجب اختيار الفاتورة' : 'Invoice is required');
      }
      if (items.length === 0) {
        throw new Error(language === 'ar' ? 'يجب إضافة أصناف' : 'Items are required');
      }

      // ✅ التأكد إن كل item عنده سبب
      const invalidItems = items.filter(item => !item.reason || item.reason.trim() === '');
      if (invalidItems.length > 0) {
        throw new Error(language === 'ar' ? 'يجب كتابة سبب الإرجاع لجميع الأصناف' : 'Reason is required for all items');
      }

      // ✅ نجيب ID الفاتورة من الـ selectedInvoice
      const invoiceId = selectedInvoice?.id;
      
      if (!invoiceId) {
        throw new Error(language === 'ar' ? 'الفاتورة غير صالحة' : 'Invalid invoice');
      }

      // ✅ تجهيز payload بالضبط زي الـ API
      const payload = {
        sales_invoice_id: Number(invoiceId), // هنا بنبعت ID مش رقم الفاتورة
        return_method: formData.return_method,
        note: formData.note || null,
        items: items.map(item => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          price: Number(item.price),
          reason: item.reason
        }))
      };

      console.log('📦 Sending payload to /invoice-return/store:', JSON.stringify(payload, null, 2));

      const response = await api.post('/invoice-return/store', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(language === 'ar' ? '✅ تم إنشاء مرتجع الفاتورة بنجاح' : '✅ Invoice return created successfully');
      
      // تحديث البيانات
      queryClient.invalidateQueries({ queryKey: ['invoice-returns'] });
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      
      // إغلاق النموذج وإعادة تعيينه
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      console.error('❌ Error creating invoice return:', error.response?.data || error);
      
      const errorData = error.response?.data;
      let errorMessage = errorData?.message || error.message;
      
      toast.error(
        language === 'ar' 
          ? `❌ خطأ: ${errorMessage}`
          : `❌ Error: ${errorMessage}`
      );
    }
  });

  // ========== Render ==========
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!open) {
          resetForm();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="sticky top-0 bg-background z-10 border-b px-6 py-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <RotateCcw className="h-5 w-5 text-amber-600" />
              </div>
              <span className="text-xl">
                {language === 'ar' ? 'مرتجع فاتورة مبيعات' : 'Sales Invoice Return'}
              </span>
              {returnNumber && (
                <span className="text-sm font-mono bg-amber-100 text-amber-700 px-3 py-1 rounded-full">
                  {returnNumber}
                </span>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="space-y-6">
            {/* Invoice Search */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-1 h-5 bg-amber-500 rounded-full" />
                  {language === 'ar' ? 'البحث عن الفاتورة' : 'Search Invoice'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={language === 'ar' ? 'ابحث برقم الفاتورة أو اسم العميل...' : 'Search by invoice number or customer name...'}
                      className="pl-10"
                      value={invoiceSearch}
                      onChange={(e) => {
                        setInvoiceSearch(e.target.value);
                        setShowSearchResults(true);
                      }}
                      onFocus={() => setShowSearchResults(true)}
                    />
                    {searchingInvoices && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Search Results */}
                  {showSearchResults && invoiceResults.length > 0 && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-muted/50">
                          <TableRow>
                            <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                            <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                            <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                            <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {invoiceResults.map((invoice: any) => (
                            <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                              <TableCell className="font-mono font-medium">
                                {invoice.invoice_number}
                              </TableCell>
                              <TableCell>
                                {language === 'ar' 
                                  ? invoice.customer?.name_ar || invoice.customer?.name 
                                  : invoice.customer?.name}
                              </TableCell>
                              <TableCell>{invoice.invoice_date}</TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(invoice.total_amount)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadInvoice(invoice.id, invoice.invoice_number)}
                                >
                                  <FileText className="h-4 w-4 ml-2" />
                                  {language === 'ar' ? 'اختيار' : 'Select'}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {showSearchResults && invoiceSearch.length >= 2 && invoiceResults.length === 0 && !searchingInvoices && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="mx-auto h-12 w-12 mb-2 opacity-20" />
                      <p>{language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Invoice Info */}
            {selectedInvoice && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-1 h-5 bg-green-500 rounded-full" />
                    {language === 'ar' ? 'الفاتورة المحددة' : 'Selected Invoice'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}
                        </p>
                        <p className="text-lg font-bold text-green-700 dark:text-green-400">
                          {selectedInvoice.invoice_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {language === 'ar' ? 'العميل' : 'Customer'}
                        </p>
                        <p className="font-medium">
                          {language === 'ar' 
                            ? selectedInvoice.customer?.name_ar || selectedInvoice.customer?.name 
                            : selectedInvoice.customer?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Return Method */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-1 h-5 bg-amber-500 rounded-full" />
                  {language === 'ar' ? 'طريقة الإرجاع' : 'Return Method'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.return_method}
                  onValueChange={(value) => setFormData({ ...formData, return_method: value })}
                >
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="نقدي">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                    <SelectItem value="بطاقة">{language === 'ar' ? 'بطاقة' : 'Card'}</SelectItem>
                    <SelectItem value="رصيد">{language === 'ar' ? 'رصيد' : 'Store Credit'}</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Return Items */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <div className="w-1 h-5 bg-amber-500 rounded-full" />
                  {language === 'ar' ? 'الأصناف المرتجعة' : 'Return Items'}
                  {items.length > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      ({items.length} {language === 'ar' ? 'صنف' : 'items'})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Items Table */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="min-w-[180px]">
                          {language === 'ar' ? 'المنتج' : 'Product'}
                        </TableHead>
                        <TableHead className="w-20 text-center">
                          {language === 'ar' ? 'الكمية' : 'Qty'}
                        </TableHead>
                        <TableHead className="w-24 text-right">
                          {language === 'ar' ? 'السعر' : 'Price'}
                        </TableHead>
                        <TableHead className="min-w-[200px]">
                          {language === 'ar' ? 'سبب الإرجاع' : 'Reason'} 
                          <span className="text-destructive ml-1">*</span>
                        </TableHead>
                        <TableHead className="w-28 text-right">
                          {language === 'ar' ? 'الإجمالي' : 'Total'}
                        </TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            <div className="flex flex-col items-center gap-3">
                              <ArrowLeftRight size={32} className="opacity-30" />
                              <span className="text-sm">
                                {language === 'ar' 
                                  ? 'ابحث عن الفاتورة وأخترها لجلب الأصناف' 
                                  : 'Search and select an invoice to load items'}
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        items.map((item) => (
                          <TableRow key={item.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="font-medium">{item.product_name}</div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {item.sku}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                max={selectedInvoice?.items?.find((i: any) => i.product_id === item.product_id)?.quantity || 99}
                                value={item.quantity}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-16 text-center mx-auto"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={item.price}
                                onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                className="w-24 text-right"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder={language === 'ar' ? 'سبب الإرجاع' : 'Return reason'}
                                value={item.reason}
                                onChange={(e) => updateItem(item.id, 'reason', e.target.value)}
                                className="w-full"
                              />
                            </TableCell>
                            <TableCell className="font-medium text-right">
                              {formatCurrency(item.quantity * item.price)}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() => removeItem(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardContent className="pt-4">
                <Label className="mb-2 block">
                  {language === 'ar' ? 'ملاحظات' : 'Notes'}
                </Label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  rows={2}
                  placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Summary & Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row justify-between items-end gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'عدد الأصناف' : 'Items Count'}
                    </p>
                    <p className="text-2xl font-bold">{items.length}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      {language === 'ar' ? 'إجمالي المبلغ المسترد' : 'Total Refund Amount'}
                    </p>
                    <p className="text-3xl font-bold text-amber-600">
                      {formatCurrency(totals.totalAmount)}
                    </p>
                  </div>
                  <Button
                    onClick={() => createReturnMutation.mutate()}
                    disabled={
                      createReturnMutation.isPending || 
                      items.length === 0 || 
                      !selectedInvoice
                    }
                    className="w-full md:w-auto gap-2 h-11 px-6 bg-amber-600 hover:bg-amber-700"
                    size="lg"
                  >
                    {createReturnMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {language === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        {language === 'ar' ? 'حفظ المرتجع' : 'Save Return'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceReturnForm;