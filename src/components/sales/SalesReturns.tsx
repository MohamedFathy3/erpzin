import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, RotateCcw, Eye, Filter, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ReturnItem {
  id: string;
  product_id: string | null;
  product_variant_id: string | null;
  product_name: string;
  original_quantity: number;
  return_quantity: number;
  unit_price: number;
  total_price: number;
  selected: boolean;
  already_returned: number;
}

const SalesReturns = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [refundMethod, setRefundMethod] = useState("cash");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  // Search filters
  const [filters, setFilters] = useState({
    invoiceNumber: "",
    customerName: "",
    customerPhone: "",
    branchId: "",
    warehouseId: "",
    invoiceType: "",
    paymentStatus: "",
    dateFrom: "",
    dateTo: ""
  });

  // Fetch branches
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, name_ar')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch warehouses
  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, name_ar')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch invoices with filters
  const { data: invoices, isLoading, refetch } = useQuery({
    queryKey: ['sales-invoices-for-return', filters],
    queryFn: async () => {
      // Fetch standard invoices
      let standardQuery = supabase
        .from('sales_invoices')
        .select(`
          *,
          customer:customers(id, name, name_ar, phone),
          branch:branches(id, name, name_ar),
          items:sales_invoice_items(*)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (filters.invoiceNumber) {
        standardQuery = standardQuery.ilike('invoice_number', `%${filters.invoiceNumber}%`);
      }
      if (filters.branchId) {
        standardQuery = standardQuery.eq('branch_id', filters.branchId);
      }
      if (filters.warehouseId) {
        standardQuery = standardQuery.eq('warehouse_id', filters.warehouseId);
      }
      if (filters.paymentStatus) {
        standardQuery = standardQuery.eq('payment_status', filters.paymentStatus);
      }
      if (filters.dateFrom) {
        standardQuery = standardQuery.gte('invoice_date', `${filters.dateFrom}T00:00:00`);
      }
      if (filters.dateTo) {
        standardQuery = standardQuery.lte('invoice_date', `${filters.dateTo}T23:59:59`);
      }

      const { data: standardInvoices } = await standardQuery.limit(100);

      // Fetch POS sales
      let posQuery = supabase
        .from('sales')
        .select(`
          *,
          customer:customers(id, name, name_ar, phone),
          items:sale_items(
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product:products(name, name_ar)
          )
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (filters.invoiceNumber) {
        posQuery = posQuery.ilike('invoice_number', `%${filters.invoiceNumber}%`);
      }
      if (filters.dateFrom) {
        posQuery = posQuery.gte('sale_date', `${filters.dateFrom}T00:00:00`);
      }
      if (filters.dateTo) {
        posQuery = posQuery.lte('sale_date', `${filters.dateTo}T23:59:59`);
      }

      const { data: posInvoices } = await posQuery.limit(100);

      // Combine results
      let combined = [];
      
      if (!filters.invoiceType || filters.invoiceType === 'standard') {
        combined.push(...(standardInvoices || []).map(inv => ({ 
          ...inv, 
          invoice_type: 'standard',
          date: inv.invoice_date 
        })));
      }
      
      if (!filters.invoiceType || filters.invoiceType === 'pos') {
        combined.push(...(posInvoices || []).map(inv => ({ 
          ...inv, 
          invoice_type: 'pos',
          date: inv.sale_date 
        })));
      }

      // Filter by customer
      if (filters.customerName) {
        combined = combined.filter(inv => 
          inv.customer?.name?.toLowerCase().includes(filters.customerName.toLowerCase()) ||
          inv.customer?.name_ar?.includes(filters.customerName)
        );
      }
      if (filters.customerPhone) {
        combined = combined.filter(inv => 
          inv.customer?.phone?.includes(filters.customerPhone)
        );
      }

      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return combined;
    }
  });

  // Fetch existing returns for selected invoice
  const { data: existingReturns } = useQuery({
    queryKey: ['existing-returns', selectedInvoice?.id],
    queryFn: async () => {
      if (!selectedInvoice) return [];
      
      const { data, error } = await supabase
        .from('sales_return_items')
        .select(`
          *,
          return:sales_returns!inner(original_invoice_id, original_invoice_number)
        `)
        .eq('return.original_invoice_number', selectedInvoice.invoice_number);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedInvoice
  });

  // Handle invoice selection for return
  const handleStartReturn = (invoice: any) => {
    setSelectedInvoice(invoice);
    
    const returnedMap = new Map<string, number>();
    existingReturns?.forEach(item => {
      const key = item.product_id || item.product_name;
      returnedMap.set(key, (returnedMap.get(key) || 0) + item.quantity);
    });

    const items: ReturnItem[] = invoice.items?.map((item: any) => {
      const productName = invoice.invoice_type === 'pos' 
        ? (item.product?.name || 'Unknown')
        : item.product_name;
      
      const key = item.product_id || productName;
      const alreadyReturned = returnedMap.get(key) || 0;
      
      return {
        id: item.id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id || null,
        product_name: productName,
        original_quantity: item.quantity,
        return_quantity: 0,
        unit_price: item.unit_price,
        total_price: 0,
        selected: false,
        already_returned: alreadyReturned
      };
    }) || [];
    
    setReturnItems(items);
    setShowReturnDialog(true);
  };

  // Toggle item selection
  const toggleItem = (id: string) => {
    setReturnItems(items => items.map(item => {
      if (item.id === id) {
        const selected = !item.selected;
        return {
          ...item,
          selected,
          return_quantity: selected ? Math.max(0, item.original_quantity - item.already_returned) : 0,
          total_price: selected ? (item.original_quantity - item.already_returned) * item.unit_price : 0
        };
      }
      return item;
    }));
  };

  // Update return quantity
  const updateReturnQuantity = (id: string, quantity: number) => {
    setReturnItems(items => items.map(item => {
      if (item.id === id) {
        const maxQty = item.original_quantity - item.already_returned;
        const validQty = Math.min(Math.max(0, quantity), maxQty);
        return {
          ...item,
          return_quantity: validQty,
          total_price: validQty * item.unit_price
        };
      }
      return item;
    }));
  };

  // Calculate totals
  const calculateTotals = () => {
    const selectedItems = returnItems.filter(item => item.selected && item.return_quantity > 0);
    const subtotal = selectedItems.reduce((sum, item) => sum + item.total_price, 0);
    const taxAmount = (subtotal * (selectedInvoice?.tax_percent || 15)) / 100;
    return { subtotal, taxAmount, totalAmount: subtotal + taxAmount, itemCount: selectedItems.length };
  };

  const totals = calculateTotals();

  // Process return mutation
  const processReturnMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = returnItems.filter(item => item.selected && item.return_quantity > 0);
      
      if (selectedItems.length === 0) {
        throw new Error(language === 'ar' ? 'يجب اختيار أصناف للإرجاع' : 'Select items to return');
      }

      const { data: returnNumber } = await supabase.rpc('generate_sales_return_number');

      const { data: returnRecord, error: returnError } = await supabase
        .from('sales_returns')
        .insert({
          return_number: returnNumber,
          original_invoice_id: selectedInvoice.invoice_type === 'standard' ? selectedInvoice.id : null,
          original_invoice_number: selectedInvoice.invoice_number,
          invoice_type: selectedInvoice.invoice_type,
          customer_id: selectedInvoice.customer_id,
          subtotal: totals.subtotal,
          tax_amount: totals.taxAmount,
          total_amount: totals.totalAmount,
          refund_method: refundMethod,
          reason,
          notes,
          status: 'completed'
        })
        .select()
        .single();

      if (returnError) throw returnError;

      const returnItemsData = selectedItems.map(item => ({
        return_id: returnRecord.id,
        original_item_id: item.id,
        product_id: item.product_id,
        product_variant_id: item.product_variant_id,
        product_name: item.product_name,
        quantity: item.return_quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        reason
      }));

      const { error: itemsError } = await supabase
        .from('sales_return_items')
        .insert(returnItemsData);

      if (itemsError) throw itemsError;

      // Update product stock
      for (const item of selectedItems) {
        if (item.product_id) {
          const { data: product } = await supabase
            .from('products')
            .select('stock')
            .eq('id', item.product_id)
            .single();
          
          if (product) {
            await supabase
              .from('products')
              .update({ stock: product.stock + item.return_quantity })
              .eq('id', item.product_id);
          }
        }
      }

      return returnRecord;
    },
    onSuccess: () => {
      toast.success(language === 'ar' ? 'تم إنشاء المرتجع بنجاح' : 'Return processed successfully');
      queryClient.invalidateQueries({ queryKey: ['sales-invoices-for-return'] });
      setShowReturnDialog(false);
      resetReturnForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const resetReturnForm = () => {
    setSelectedInvoice(null);
    setReturnItems([]);
    setRefundMethod("cash");
    setReason("");
    setNotes("");
  };

  const clearFilters = () => {
    setFilters({
      invoiceNumber: "",
      customerName: "",
      customerPhone: "",
      branchId: "",
      warehouseId: "",
      invoiceType: "",
      paymentStatus: "",
      dateFrom: "",
      dateTo: ""
    });
  };

  const getStatusBadge = (invoice: any) => {
    const status = invoice.payment_status || invoice.status || 'completed';
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      paid: { label: language === 'ar' ? 'مدفوع' : 'Paid', variant: 'default' },
      completed: { label: language === 'ar' ? 'مكتمل' : 'Completed', variant: 'default' },
      pending: { label: language === 'ar' ? 'معلق' : 'Pending', variant: 'secondary' },
      partial: { label: language === 'ar' ? 'جزئي' : 'Partial', variant: 'outline' }
    };
    const config = statusConfig[status] || statusConfig.completed;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <>
      <div className="space-y-4">
        {/* Quick Search & Filters Toggle */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'بحث سريع برقم الفاتورة أو اسم العميل...' : 'Quick search by invoice # or customer name...'}
                  className="pl-10"
                  value={filters.invoiceNumber}
                  onChange={(e) => setFilters({ ...filters, invoiceNumber: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && refetch()}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => refetch()}>
                  <Search className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'بحث' : 'Search'}
                </Button>
                <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="h-4 w-4 mr-2" />
                  {language === 'ar' ? 'فلاتر متقدمة' : 'Advanced Filters'}
                  {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            <Collapsible open={showFilters}>
              <CollapsibleContent className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                  <div>
                    <Label>{language === 'ar' ? 'اسم العميل' : 'Customer Name'}</Label>
                    <Input
                      value={filters.customerName}
                      onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                      placeholder={language === 'ar' ? 'ابحث باسم العميل' : 'Search by name'}
                    />
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'رقم الهاتف' : 'Phone'}</Label>
                    <Input
                      value={filters.customerPhone}
                      onChange={(e) => setFilters({ ...filters, customerPhone: e.target.value })}
                      placeholder={language === 'ar' ? 'رقم الهاتف' : 'Phone number'}
                    />
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
                    <Select value={filters.branchId} onValueChange={(value) => setFilters({ ...filters, branchId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'جميع الفروع' : 'All Branches'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{language === 'ar' ? 'جميع الفروع' : 'All Branches'}</SelectItem>
                        {branches?.map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'المخزن' : 'Warehouse'}</Label>
                    <Select value={filters.warehouseId} onValueChange={(value) => setFilters({ ...filters, warehouseId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'جميع المخازن' : 'All Warehouses'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{language === 'ar' ? 'جميع المخازن' : 'All Warehouses'}</SelectItem>
                        {warehouses?.map((wh) => (
                          <SelectItem key={wh.id} value={wh.id}>
                            {language === 'ar' ? wh.name_ar || wh.name : wh.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'نوع الفاتورة' : 'Invoice Type'}</Label>
                    <Select value={filters.invoiceType} onValueChange={(value) => setFilters({ ...filters, invoiceType: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'جميع الأنواع' : 'All Types'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</SelectItem>
                        <SelectItem value="standard">{language === 'ar' ? 'قياسية' : 'Standard'}</SelectItem>
                        <SelectItem value="pos">{language === 'ar' ? 'نقاط البيع' : 'POS'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'حالة الدفع' : 'Payment Status'}</Label>
                    <Select value={filters.paymentStatus} onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder={language === 'ar' ? 'جميع الحالات' : 'All Statuses'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                        <SelectItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</SelectItem>
                        <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                        <SelectItem value="partial">{language === 'ar' ? 'جزئي' : 'Partial'}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'من تاريخ' : 'From Date'}</Label>
                    <Input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>{language === 'ar' ? 'إلى تاريخ' : 'To Date'}</Label>
                    <Input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button variant="ghost" onClick={clearFilters}>
                    {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {language === 'ar' ? 'فواتير المبيعات' : 'Sales Invoices'}
              {invoices && ` (${invoices.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                    <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                    <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                    <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                      </TableCell>
                    </TableRow>
                  ) : !invoices || invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === 'ar' ? 'لا توجد فواتير' : 'No invoices found'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                        <TableCell>
                          <Badge variant={invoice.invoice_type === 'pos' ? 'secondary' : 'outline'}>
                            {invoice.invoice_type === 'pos' ? 'POS' : (language === 'ar' ? 'قياسية' : 'Standard')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {language === 'ar' 
                            ? invoice.customer?.name_ar || invoice.customer?.name || '-'
                            : invoice.customer?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.date), 'yyyy/MM/dd HH:mm', { locale: language === 'ar' ? ar : undefined })}
                        </TableCell>
                        <TableCell className="font-medium">{invoice.total_amount?.toLocaleString()}</TableCell>
                        <TableCell>{getStatusBadge(invoice)}</TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => handleStartReturn(invoice)}>
                            <RotateCcw className="h-4 w-4 mr-1" />
                            {language === 'ar' ? 'مرتجع' : 'Return'}
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
      </div>

      {/* Return Dialog */}
      <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              {language === 'ar' ? 'إنشاء مرتجع' : 'Create Return'}
              {selectedInvoice && ` - ${selectedInvoice.invoice_number}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'الكمية الأصلية' : 'Orig. Qty'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'مرتجع سابق' : 'Prev. Ret.'}</TableHead>
                    <TableHead className="text-center">{language === 'ar' ? 'كمية الإرجاع' : 'Return Qty'}</TableHead>
                    <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItems.map((item) => {
                    const availableQty = item.original_quantity - item.already_returned;
                    const canReturn = availableQty > 0;
                    
                    return (
                      <TableRow key={item.id} className={!canReturn ? 'opacity-50' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={item.selected}
                            onCheckedChange={() => toggleItem(item.id)}
                            disabled={!canReturn}
                          />
                        </TableCell>
                        <TableCell>{item.product_name}</TableCell>
                        <TableCell className="text-center">{item.original_quantity}</TableCell>
                        <TableCell className="text-center">
                          {item.already_returned > 0 && (
                            <Badge variant="destructive">{item.already_returned}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {canReturn ? (
                            <Input
                              type="number"
                              min="0"
                              max={availableQty}
                              value={item.return_quantity}
                              onChange={(e) => updateReturnQuantity(item.id, parseInt(e.target.value) || 0)}
                              className="w-20 mx-auto"
                              disabled={!item.selected}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.total_price.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Return Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{language === 'ar' ? 'طريقة الاسترداد' : 'Refund Method'}</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{language === 'ar' ? 'نقدي' : 'Cash'}</SelectItem>
                    <SelectItem value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</SelectItem>
                    <SelectItem value="account_deduction">{language === 'ar' ? 'خصم من الحساب' : 'Account Deduction'}</SelectItem>
                    <SelectItem value="exchange">{language === 'ar' ? 'استبدال' : 'Exchange'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{language === 'ar' ? 'سبب الإرجاع' : 'Return Reason'}</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر السبب' : 'Select reason'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="defective">{language === 'ar' ? 'منتج معيب' : 'Defective'}</SelectItem>
                    <SelectItem value="wrong_item">{language === 'ar' ? 'منتج خاطئ' : 'Wrong Item'}</SelectItem>
                    <SelectItem value="not_needed">{language === 'ar' ? 'غير مطلوب' : 'Not Needed'}</SelectItem>
                    <SelectItem value="size_issue">{language === 'ar' ? 'مشكلة في المقاس' : 'Size Issue'}</SelectItem>
                    <SelectItem value="other">{language === 'ar' ? 'أخرى' : 'Other'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>{language === 'ar' ? 'ملاحظات' : 'Notes'}</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={language === 'ar' ? 'ملاحظات إضافية...' : 'Additional notes...'}
                rows={2}
              />
            </div>

            {/* Totals */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span>{language === 'ar' ? 'عدد الأصناف:' : 'Items:'}</span>
                <span className="font-medium">{totals.itemCount}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'ar' ? 'المجموع الفرعي:' : 'Subtotal:'}</span>
                <span>{totals.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>{language === 'ar' ? 'الضريبة:' : 'Tax:'}</span>
                <span>{totals.taxAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>{language === 'ar' ? 'إجمالي الاسترداد:' : 'Total Refund:'}</span>
                <span>{totals.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowReturnDialog(false)}>
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button 
                onClick={() => processReturnMutation.mutate()}
                disabled={processReturnMutation.isPending || totals.itemCount === 0}
              >
                {processReturnMutation.isPending 
                  ? (language === 'ar' ? 'جاري المعالجة...' : 'Processing...') 
                  : (language === 'ar' ? 'تأكيد المرتجع' : 'Confirm Return')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SalesReturns;