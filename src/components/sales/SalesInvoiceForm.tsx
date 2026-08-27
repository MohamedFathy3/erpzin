/* eslint-disable @typescript-eslint/no-explicit-any */
// components/sales/InvoiceReturnForm.tsx
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
import { Trash2, Save, Loader2, RotateCcw, ArrowLeftRight, X, Building2 } from "lucide-react";
import api from "@/lib/api";

interface ReturnItem {
  id: string;
  product_id: number;
  product_name: string;
  sku: string;
  quantity: number;
  price: number;
  reason: string;
}

interface Treasury {
  id: number;
  name: string;
  balance: number;
  currency: string;
  branch_id?: number;
}

interface InvoiceReturnFormProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceData?: any;
}

const InvoiceReturnForm = ({ isOpen, onClose, invoiceData }: InvoiceReturnFormProps) => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { formatCurrency } = useRegionalSettings();
  
  // ========== State ==========
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [formData, setFormData] = useState({
    sales_invoice_id: "",
    return_method: "cash",
    note: "",
    treasury_id: "",
    branch_id: ""
  });
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

  // ========== Load Invoice Data ==========
  useEffect(() => {
    if (isOpen && invoiceData) {
      // ✅ حط رقم الفاتورة و treasury_id و branch_id من الفاتورة
      setFormData(prev => ({
        ...prev,
        sales_invoice_id: invoiceData.id,
        treasury_id: invoiceData.treasury_id || "",
        branch_id: invoiceData.branch_id || invoiceData.branch?.id || "" // ✅ جيب الـ branch_id
      }));
      
      setSelectedInvoice(invoiceData);
      
      if (invoiceData.items?.length > 0) {
        const returnItems = invoiceData.items.map((item: any) => ({
          id: crypto.randomUUID(),
          product_id: item.product_id,
          product_name: item.product_name,
          sku: item.sku || '',
          quantity: 1,
          price: Number(item.price) || 0,
          reason: ""
        }));
        setItems(returnItems);
      }
    }
  }, [isOpen, invoiceData]);

  // ========== جلب الخزائن ==========
  const { data: treasuries = [], isLoading: loadingTreasuries } = useQuery({
    queryKey: ['treasuries-form', formData.branch_id],
    queryFn: async () => {
      try {
        const filters: any = {};
        if (formData.branch_id) filters.branch_id = Number(formData.branch_id);
        
        const response = await api.post('/treasury/index', {
          filters,
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
        console.error('Error fetching treasuries:', error);
        return [];
      }
    },
    enabled: isOpen // ✅ يشتغل دايماً لما الفورم مفتوح
  });

  // ========== Calculations ==========
  const totals = {
    totalAmount: items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
  };

  // ========== Handlers ==========

  const updateItem = (id: string, field: string, value: number | string) => {
    const updated = items.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    });
    setItems(updated);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    toast.success(language === 'ar' ? 'تم حذف المنتج' : 'Product removed');
  };

  const resetForm = () => {
    setItems([]);
    setSelectedInvoice(null);
    setFormData({
      sales_invoice_id: "",
      return_method: "cash",
      note: "",
      treasury_id: "",
      branch_id: ""
    });
  };

  // ========== إنشاء مرتجع فاتورة ==========
  const createReturnMutation = useMutation({
    mutationFn: async () => {
      if (!formData.sales_invoice_id) {
        throw new Error(language === 'ar' ? 'رقم الفاتورة مطلوب' : 'Invoice number is required');
      }
      if (!formData.treasury_id) {
        throw new Error(language === 'ar' ? 'يجب اختيار الخزينة' : 'Treasury is required');
      }
      if (items.length === 0) {
        throw new Error(language === 'ar' ? 'يجب إضافة أصناف' : 'Items are required');
      }

      const invalidItems = items.filter(item => !item.reason || item.reason.trim() === '');
      if (invalidItems.length > 0) {
        throw new Error(language === 'ar' ? 'يجب كتابة سبب الإرجاع لجميع الأصناف' : 'Reason is required for all items');
      }

      const payload = {
        sales_invoice_id: Number(formData.sales_invoice_id),
        return_method: formData.return_method,
        note: formData.note || null,
        treasury_id: Number(formData.treasury_id),
        items: items.map(item => ({
          product_id: Number(item.product_id),
          quantity: Number(item.quantity),
          price: Number(item.price),
          reason: item.reason
        }))
      };

      console.log('📦 Sending payload:', JSON.stringify(payload, null, 2));

      const response = await api.post('/sales-invoice-return/store', payload);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(language === 'ar' ? '✅ تم إنشاء مرتجع الفاتورة بنجاح' : '✅ Invoice return created successfully');
      
      queryClient.invalidateQueries({ queryKey: ['invoice-returns'] });
      queryClient.invalidateQueries({ queryKey: ['sales-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['treasuries-form'] });
      
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      console.error('❌ Error:', error.response?.data || error);
      
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
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
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
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6">
          <div className="space-y-6">
            {/* Invoice Info */}
            {selectedInvoice && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-1 h-5 bg-green-500 rounded-full" />
                    {language === 'ar' ? 'الفاتورة الأصلية' : 'Original Invoice'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}
                      </p>
                      <p className="font-bold text-green-700 dark:text-green-400 font-mono">
                        {selectedInvoice.invoice_number}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'العميل' : 'Customer'}
                      </p>
                      <p className="font-medium">
                        {language === 'ar' 
                          ? selectedInvoice.customer?.name_ar || selectedInvoice.customer?.name 
                          : selectedInvoice.customer?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ar' ? 'التاريخ' : 'Date'}
                      </p>
                      <p className="font-medium">{selectedInvoice.invoice_date}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Return Method & Treasury */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</SelectItem>
                      <SelectItem value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</SelectItem>
                      <SelectItem value="wallet">{language === 'ar' ? 'محفظة' : 'Wallet'}</SelectItem>
                      <SelectItem value="bank">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Treasury Selection */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="w-1 h-5 bg-blue-500 rounded-full" />
                    <Building2 className="h-4 w-4 text-blue-500" />
                    {language === 'ar' ? 'الخزينة' : 'Treasury'}
                    <span className="text-destructive ml-1">*</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={formData.treasury_id}
                    onValueChange={(value) => setFormData({ ...formData, treasury_id: value })}
                    disabled={loadingTreasuries}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={
                        loadingTreasuries 
                          ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...')
                          : (language === 'ar' ? 'اختر الخزينة' : 'Select Treasury')
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {treasuries.length === 0 && !loadingTreasuries ? (
                        <SelectItem value="" disabled>
                          {language === 'ar' ? 'لا توجد خزائن' : 'No treasuries found'}
                        </SelectItem>
                      ) : (
                        treasuries.map((treasury: Treasury) => (
                          <SelectItem key={treasury.id} value={String(treasury.id)}>
                            <div className="flex items-center justify-between w-full">
                              <span>{treasury.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {formatCurrency(treasury.balance)}
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {treasuries.length === 0 && !loadingTreasuries && (
                    <p className="text-xs text-destructive mt-2">
                      {language === 'ar' ? 'لا توجد خزائن متاحة' : 'No treasuries available'}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

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
                                  ? 'لا توجد أصناف في الفاتورة' 
                                  : 'No items in this invoice'}
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
                      !formData.treasury_id
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