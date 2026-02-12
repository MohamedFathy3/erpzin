import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRegionalSettings } from "@/contexts/RegionalSettingsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Receipt, RotateCcw, Eye, Search, Loader2, Calendar, Filter, X } from "lucide-react";
import { formatDate } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// ========== أنواع البيانات ==========

interface SalesReturn {
  id: number;
  return_number: string;
  sales_invoice_id: number;
  sales_invoice_number?: string;
  customer?: {
    id: number;
    name: string;
    name_ar?: string;
  };
  return_method: string; // 'نقدي' | 'بطاقة' | 'رصيد'
  note?: string;
  total_amount: number;
  created_at: string;
  items?: any[];
}

interface ReturnsResponse {
  data: SalesReturn[];
  result: string;
  message: string;
  status: number;
}

const SalesReturns = () => {
  const { language } = useLanguage();
  const { formatCurrency } = useRegionalSettings();
  
  // ========== State ==========
  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // ========== Queries ==========
  const { data: returns = [], isLoading, refetch } = useQuery({
    queryKey: ['sales-returns'],
    queryFn: async () => {
      try {
        // ✅ هنا بنادي على API المرتجعات مش فواتير المبيعات
        const response = await api.post('/sales-return/index', {
          orderBy: 'id',
          orderByDirection: 'desc',
          with: ['customer', 'sales_invoice'],
          paginate: false
        });
        
        console.log('📦 Returns response:', response.data);
        
        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching sales returns:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب المرتجعات' : 'Error fetching returns');
        return [];
      }
    }
  });

  // ========== Filter Functions ==========
  const filterBySearch = (item: SalesReturn) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.return_number?.toLowerCase().includes(term) ||
      item.sales_invoice_number?.toLowerCase().includes(term) ||
      item.customer?.name?.toLowerCase().includes(term) ||
      item.customer?.name_ar?.includes(term)
    );
  };

  const filterByMethod = (item: SalesReturn) => {
    if (methodFilter === "all") return true;
    return item.return_method === methodFilter;
  };

  const filterByDate = (item: SalesReturn) => {
    if (dateFilter === "all") return true;
    
    const today = new Date();
    const itemDate = new Date(item.created_at);
    
    switch (dateFilter) {
      case "today":
        return itemDate.toDateString() === today.toDateString();
      case "week":
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return itemDate >= weekAgo;
      case "month":
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return itemDate >= monthAgo;
      default:
        return true;
    }
  };

  // ✅ تطبيق الفلاتر
  const filteredReturns = returns
    .filter(filterBySearch)
    .filter(filterByMethod)
    .filter(filterByDate);

  // ========== Stats Calculations ==========
  const totalReturns = filteredReturns.length;
  const totalRefunded = filteredReturns.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);
  const cashReturns = filteredReturns.filter(r => r.return_method === 'نقدي').length;
  const cardReturns = filteredReturns.filter(r => r.return_method === 'بطاقة').length;
  const creditReturns = filteredReturns.filter(r => r.return_method === 'رصيد').length;

  // ========== Helper Functions ==========
  const getMethodBadge = (method: string) => {
    const methodConfig: Record<string, { label: string; className: string }> = {
      نقدي: { 
        label: language === 'ar' ? 'نقدي' : 'Cash', 
        className: 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
      },
      بطاقة: { 
        label: language === 'ar' ? 'بطاقة' : 'Card', 
        className: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400'
      },
      رصيد: { 
        label: language === 'ar' ? 'رصيد' : 'Store Credit', 
        className: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400'
      }
    };
    const config = methodConfig[method] || methodConfig.نقدي;
    return (
      <Badge variant="outline" className={`${config.className} flex items-center gap-1`}>
        {config.label}
      </Badge>
    );
  };

  // ✅ جلب تفاصيل المرتجع
  const fetchReturnDetails = async (returnId: number) => {
    try {
      const response = await api.get(`/sales-invoices/${returnId}`);
      
      if (response.data.result === 'Success') {
        setSelectedReturn(response.data.data);
        setShowDetails(true);
      }
    } catch (error) {
      console.error('Error fetching return details:', error);
      toast.error(language === 'ar' ? 'خطأ في جلب تفاصيل المرتجع' : 'Error fetching return details');
    }
  };

  const handleRefresh = () => {
    refetch();
    toast.success(language === 'ar' ? 'تم تحديث البيانات' : 'Data refreshed');
  };

  // ========== Render ==========
  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <RotateCcw className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {language === 'ar' ? 'مرتجعات المبيعات' : 'Sales Returns'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? `عرض ${filteredReturns.length} مرتجع` 
                : `Showing ${filteredReturns.length} returns`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <svg
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 2v6h-6" />
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
              <path d="M3 22v-6h6" />
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {language === 'ar' ? 'فلتر' : 'Filter'}
          </Button>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <Card className="border-amber-200/50">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'بحث برقم المرتجع أو الفاتورة...' : 'Search by return or invoice number...'}
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'طريقة الإرجاع' : 'Return method'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'جميع الطرق' : 'All methods'}</SelectItem>
                  <SelectItem value="نقدي">{language === 'ar' ? 'نقدي' : 'Cash'}</SelectItem>
                  <SelectItem value="بطاقة">{language === 'ar' ? 'بطاقة' : 'Card'}</SelectItem>
                  <SelectItem value="رصيد">{language === 'ar' ? 'رصيد' : 'Store Credit'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <Calendar className="h-4 w-4 ml-2" />
                  <SelectValue placeholder={language === 'ar' ? 'التاريخ' : 'Date'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{language === 'ar' ? 'كل الأوقات' : 'All time'}</SelectItem>
                  <SelectItem value="today">{language === 'ar' ? 'اليوم' : 'Today'}</SelectItem>
                  <SelectItem value="week">{language === 'ar' ? 'آخر 7 أيام' : 'Last 7 days'}</SelectItem>
                  <SelectItem value="month">{language === 'ar' ? 'آخر 30 يوم' : 'Last 30 days'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 border-amber-200/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {language === 'ar' ? 'إجمالي المرتجعات' : 'Total Returns'}
              </p>
              <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">
                {totalReturns}
              </p>
            </div>
            <div className="p-2 bg-amber-200/50 dark:bg-amber-800/30 rounded-lg">
              <RotateCcw className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-blue-200/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {language === 'ar' ? 'إجمالي المسترد' : 'Total Refunded'}
              </p>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-300">
                {formatCurrency(totalRefunded)}
              </p>
            </div>
            <div className="p-2 bg-blue-200/50 dark:bg-blue-800/30 rounded-lg">
              <Receipt className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border-emerald-200/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {language === 'ar' ? 'مرتجعات نقدي' : 'Cash Returns'}
              </p>
              <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-300">
                {cashReturns}
              </p>
            </div>
            <div className="p-2 bg-emerald-200/50 dark:bg-emerald-800/30 rounded-lg">
              <svg className="h-6 w-6 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/30 dark:to-purple-900/20 border-purple-200/50">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                {language === 'ar' ? 'مرتجعات بطاقة' : 'Card Returns'}
              </p>
              <p className="text-2xl font-bold text-purple-800 dark:text-purple-300">
                {cardReturns}
              </p>
            </div>
            <div className="p-2 bg-purple-200/50 dark:bg-purple-800/30 rounded-lg">
              <svg className="h-6 w-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table Card */}
      <Card className="border-0 shadow-lg">
        <CardContent className="p-0">
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-[150px] font-bold">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === 'ar' ? 'رقم المرتجع' : 'RETURN #'}
                    </span>
                  </TableHead>
                  <TableHead className="min-w-[150px] font-bold">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === 'ar' ? 'رقم الفاتورة' : 'INVOICE #'}
                    </span>
                  </TableHead>
                  <TableHead className="min-w-[150px] font-bold">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === 'ar' ? 'العميل' : 'CUSTOMER'}
                    </span>
                  </TableHead>
                  <TableHead className="min-w-[120px] font-bold">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === 'ar' ? 'التاريخ' : 'DATE'}
                    </span>
                  </TableHead>
                  <TableHead className="min-w-[120px] font-bold">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === 'ar' ? 'طريقة الإرجاع' : 'METHOD'}
                    </span>
                  </TableHead>
                  <TableHead className="min-w-[100px] text-right font-bold">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === 'ar' ? 'المبلغ' : 'AMOUNT'}
                    </span>
                  </TableHead>
                  <TableHead className="min-w-[100px] text-center font-bold">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {language === 'ar' ? 'الإجراءات' : 'ACTIONS'}
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-[400px] text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="text-muted-foreground">
                          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-[400px] text-center">
                      <div className="flex flex-col items-center justify-center h-full">
                        <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4">
                          <RotateCcw className="h-12 w-12 text-amber-600/50 dark:text-amber-400/50" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">
                          {language === 'ar' ? 'لا توجد مرتجعات' : 'No returns found'}
                        </h3>
                        <p className="text-sm text-muted-foreground max-w-md">
                          {language === 'ar' 
                            ? 'لم يتم إنشاء أي مرتجعات مبيعات بعد.'
                            : 'No sales returns have been created yet.'}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturns.map((returnItem: SalesReturn, index: number) => (
                    <TableRow 
                      key={returnItem.id} 
                      className={`
                        group transition-all duration-200 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 cursor-pointer
                        ${index % 2 === 0 ? 'bg-white dark:bg-gray-950/50' : 'bg-muted/20 dark:bg-gray-900/30'}
                      `}
                      onClick={() => fetchReturnDetails(returnItem.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-8 bg-amber-400/30 rounded-full group-hover:bg-amber-500 transition-colors" />
                          <span className="font-mono font-semibold text-sm">
                            {returnItem.return_number || `RET-${returnItem.id}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {returnItem.sales_invoice_number || `SI-${returnItem.sales_invoice_id}`}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                            <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                              {returnItem.customer?.name?.charAt(0) || 'C'}
                            </span>
                          </div>
                          <span className="font-medium text-sm">
                            {language === 'ar' 
                              ? returnItem.customer?.name_ar || returnItem.customer?.name 
                              : returnItem.customer?.name || '---'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {formatDate(returnItem.created_at)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(returnItem.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getMethodBadge(returnItem.return_method)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(Number(returnItem.total_amount) || 0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-amber-500/10 hover:text-amber-600"
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchReturnDetails(returnItem.id);
                            }}
                          >
                            <Eye className="h-4 w-4" />
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

      {/* Return Details Modal */}
      {showDetails && selectedReturn && (
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-amber-600" />
                {language === 'ar' ? 'تفاصيل المرتجع' : 'Return Details'} - {selectedReturn.return_number}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}
                  </p>
                  <p className="font-medium font-mono">
                    {selectedReturn.sales_invoice_number || `SI-${selectedReturn.sales_invoice_id}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'طريقة الإرجاع' : 'Return Method'}
                  </p>
                  <p>{getMethodBadge(selectedReturn.return_method)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'التاريخ' : 'Date'}
                  </p>
                  <p>{formatDate(selectedReturn.created_at, true)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'المبلغ' : 'Amount'}
                  </p>
                  <p className="text-xl font-bold text-amber-600">
                    {formatCurrency(Number(selectedReturn.total_amount) || 0)}
                  </p>
                </div>
              </div>

              {selectedReturn.note && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    {language === 'ar' ? 'ملاحظات' : 'Notes'}
                  </p>
                  <p className="p-3 bg-muted/30 rounded-lg text-sm">
                    {selectedReturn.note}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default SalesReturns;