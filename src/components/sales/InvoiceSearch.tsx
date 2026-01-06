import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Eye, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import InvoiceDetails from "./InvoiceDetails";

const InvoiceSearch = () => {
  const { language } = useLanguage();
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  // Search filters
  const [filters, setFilters] = useState({
    invoiceNumber: "",
    customerName: "",
    customerPhone: "",
    employeeName: "",
    branchId: "",
    warehouseId: "",
    invoiceType: "",
    paymentStatus: "",
    dateFrom: "",
    timeFrom: "",
    dateTo: "",
    timeTo: ""
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

  // Search invoices
  const { data: searchResults, isLoading, refetch } = useQuery({
    queryKey: ['invoice-search', filters],
    queryFn: async () => {
      // Search in standard invoices
      let standardQuery = supabase
        .from('sales_invoices')
        .select(`
          *,
          customer:customers(id, name, name_ar, phone),
          salesman:salesmen(id, name, name_ar),
          branch:branches(id, name, name_ar)
        `)
        .order('created_at', { ascending: false });

      // Apply filters
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

      // Date range filter
      if (filters.dateFrom) {
        const fromDateTime = filters.timeFrom 
          ? `${filters.dateFrom}T${filters.timeFrom}:00`
          : `${filters.dateFrom}T00:00:00`;
        standardQuery = standardQuery.gte('invoice_date', fromDateTime);
      }
      if (filters.dateTo) {
        const toDateTime = filters.timeTo 
          ? `${filters.dateTo}T${filters.timeTo}:59`
          : `${filters.dateTo}T23:59:59`;
        standardQuery = standardQuery.lte('invoice_date', toDateTime);
      }

      const { data: standardInvoices, error: err1 } = await standardQuery.limit(100);

      // Search in POS sales
      let posQuery = supabase
        .from('sales')
        .select(`
          *,
          customer:customers(id, name, name_ar, phone)
        `)
        .order('created_at', { ascending: false });

      if (filters.invoiceNumber) {
        posQuery = posQuery.ilike('invoice_number', `%${filters.invoiceNumber}%`);
      }
      if (filters.paymentStatus === 'paid') {
        posQuery = posQuery.eq('status', 'completed');
      } else if (filters.paymentStatus === 'cancelled') {
        posQuery = posQuery.eq('status', 'cancelled');
      }

      // Date range filter for POS
      if (filters.dateFrom) {
        const fromDateTime = filters.timeFrom 
          ? `${filters.dateFrom}T${filters.timeFrom}:00`
          : `${filters.dateFrom}T00:00:00`;
        posQuery = posQuery.gte('sale_date', fromDateTime);
      }
      if (filters.dateTo) {
        const toDateTime = filters.timeTo 
          ? `${filters.dateTo}T${filters.timeTo}:59`
          : `${filters.dateTo}T23:59:59`;
        posQuery = posQuery.lte('sale_date', toDateTime);
      }

      const { data: posInvoices, error: err2 } = await posQuery.limit(100);

      // Combine results based on filter
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

      // Filter by customer name or phone
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

      // Sort by date
      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return combined.slice(0, 100);
    },
    enabled: false
  });

  const getStatusBadge = (invoice: any) => {
    const status = invoice.payment_status || invoice.status || 'completed';
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      paid: { label: language === 'ar' ? 'مدفوع' : 'Paid', variant: 'default' },
      completed: { label: language === 'ar' ? 'مدفوع' : 'Paid', variant: 'default' },
      pending: { label: language === 'ar' ? 'معلق' : 'Pending', variant: 'secondary' },
      partial: { label: language === 'ar' ? 'جزئي' : 'Partial', variant: 'outline' },
      cancelled: { label: language === 'ar' ? 'ملغي' : 'Cancelled', variant: 'destructive' },
      returned: { label: language === 'ar' ? 'مرتجع' : 'Returned', variant: 'destructive' }
    };
    const config = statusConfig[status] || statusConfig.completed;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const clearFilters = () => {
    setFilters({
      invoiceNumber: "",
      customerName: "",
      customerPhone: "",
      employeeName: "",
      branchId: "",
      warehouseId: "",
      invoiceType: "",
      paymentStatus: "",
      dateFrom: "",
      timeFrom: "",
      dateTo: "",
      timeTo: ""
    });
  };

  return (
    <>
      <div className="space-y-6">
        {/* Search Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {language === 'ar' ? 'فلاتر البحث المتقدم' : 'Advanced Search Filters'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Invoice Number */}
              <div>
                <Label>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}</Label>
                <Input
                  value={filters.invoiceNumber}
                  onChange={(e) => setFilters({ ...filters, invoiceNumber: e.target.value })}
                  placeholder={language === 'ar' ? 'ابحث برقم الفاتورة' : 'Search by invoice #'}
                />
              </div>

              {/* Customer Name */}
              <div>
                <Label>{language === 'ar' ? 'اسم العميل' : 'Customer Name'}</Label>
                <Input
                  value={filters.customerName}
                  onChange={(e) => setFilters({ ...filters, customerName: e.target.value })}
                  placeholder={language === 'ar' ? 'ابحث باسم العميل' : 'Search by customer name'}
                />
              </div>

              {/* Customer Phone */}
              <div>
                <Label>{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</Label>
                <Input
                  value={filters.customerPhone}
                  onChange={(e) => setFilters({ ...filters, customerPhone: e.target.value })}
                  placeholder={language === 'ar' ? 'ابحث برقم الهاتف' : 'Search by phone'}
                />
              </div>

              {/* Employee Name */}
              <div>
                <Label>{language === 'ar' ? 'اسم الموظف' : 'Employee Name'}</Label>
                <Input
                  value={filters.employeeName}
                  onChange={(e) => setFilters({ ...filters, employeeName: e.target.value })}
                  placeholder={language === 'ar' ? 'ابحث باسم الموظف' : 'Search by employee'}
                />
              </div>

              {/* Branch */}
              <div>
                <Label>{language === 'ar' ? 'الفرع' : 'Branch'}</Label>
                <Select 
                  value={filters.branchId} 
                  onValueChange={(value) => setFilters({ ...filters, branchId: value })}
                >
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

              {/* Warehouse */}
              <div>
                <Label>{language === 'ar' ? 'المخزن' : 'Warehouse'}</Label>
                <Select 
                  value={filters.warehouseId} 
                  onValueChange={(value) => setFilters({ ...filters, warehouseId: value })}
                >
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

              {/* Invoice Type */}
              <div>
                <Label>{language === 'ar' ? 'نوع الفاتورة' : 'Invoice Type'}</Label>
                <Select 
                  value={filters.invoiceType} 
                  onValueChange={(value) => setFilters({ ...filters, invoiceType: value })}
                >
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

              {/* Payment Status */}
              <div>
                <Label>{language === 'ar' ? 'حالة الدفع' : 'Payment Status'}</Label>
                <Select 
                  value={filters.paymentStatus} 
                  onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'جميع الحالات' : 'All Statuses'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">{language === 'ar' ? 'جميع الحالات' : 'All Statuses'}</SelectItem>
                    <SelectItem value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</SelectItem>
                    <SelectItem value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</SelectItem>
                    <SelectItem value="partial">{language === 'ar' ? 'جزئي' : 'Partial'}</SelectItem>
                    <SelectItem value="cancelled">{language === 'ar' ? 'ملغي' : 'Cancelled'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div>
                <Label>{language === 'ar' ? 'من تاريخ' : 'From Date'}</Label>
                <Input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                />
              </div>

              {/* Time From */}
              <div>
                <Label>{language === 'ar' ? 'من وقت' : 'From Time'}</Label>
                <Input
                  type="time"
                  value={filters.timeFrom}
                  onChange={(e) => setFilters({ ...filters, timeFrom: e.target.value })}
                />
              </div>

              {/* Date To */}
              <div>
                <Label>{language === 'ar' ? 'إلى تاريخ' : 'To Date'}</Label>
                <Input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                />
              </div>

              {/* Time To */}
              <div>
                <Label>{language === 'ar' ? 'إلى وقت' : 'To Time'}</Label>
                <Input
                  type="time"
                  value={filters.timeTo}
                  onChange={(e) => setFilters({ ...filters, timeTo: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={() => refetch()}>
                <Search className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'بحث' : 'Search'}
              </Button>
              <Button variant="outline" onClick={clearFilters}>
                {language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Search Results */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>
              {language === 'ar' ? 'نتائج البحث' : 'Search Results'}
              {searchResults && ` (${searchResults.length})`}
            </CardTitle>
            {searchResults && searchResults.length > 0 && (
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {language === 'ar' ? 'تصدير' : 'Export'}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}</TableHead>
                    <TableHead>{language === 'ar' ? 'النوع' : 'Type'}</TableHead>
                    <TableHead>{language === 'ar' ? 'العميل' : 'Customer'}</TableHead>
                    <TableHead>{language === 'ar' ? 'التاريخ والوقت' : 'Date & Time'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الحالة' : 'Status'}</TableHead>
                    <TableHead>{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        {language === 'ar' ? 'جاري البحث...' : 'Searching...'}
                      </TableCell>
                    </TableRow>
                  ) : !searchResults || searchResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {language === 'ar' 
                          ? 'استخدم الفلاتر أعلاه للبحث عن الفواتير' 
                          : 'Use the filters above to search for invoices'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    searchResults.map((invoice: any) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant={invoice.invoice_type === 'pos' ? 'secondary' : 'outline'}>
                            {invoice.invoice_type === 'pos' ? 'POS' : 'Standard'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            {language === 'ar' 
                              ? invoice.customer?.name_ar || invoice.customer?.name || '-'
                              : invoice.customer?.name || '-'}
                          </div>
                          {invoice.customer?.phone && (
                            <div className="text-xs text-muted-foreground">
                              {invoice.customer.phone}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(invoice.date), 'yyyy/MM/dd HH:mm', {
                            locale: language === 'ar' ? ar : undefined
                          })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {invoice.total_amount?.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(invoice)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Eye className="h-4 w-4" />
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

      {selectedInvoice && selectedInvoice.invoice_type === 'standard' && (
        <InvoiceDetails
          invoice={selectedInvoice}
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </>
  );
};

export default InvoiceSearch;
