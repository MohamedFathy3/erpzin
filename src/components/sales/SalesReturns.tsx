import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { cn, formatDate } from '@/lib/utils';
import api from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

import {
  RotateCcw, Search, Eye, Filter, X,
  Calendar, Package, User, Hash, DollarSign,
  FileText, Loader2
} from 'lucide-react';

// ========== أنواع البيانات ==========

interface ReturnItem {
  product: string;
  quantity: number;
  price: string;
  total: string;
  reason: string;
}

interface SalesReturn {
  id: number;
  return_number: string;
  invoice_number: string;
  customer: string;
  return_method: string;
  total_amount: string;
  note: string | null;
  items: ReturnItem[];
  created_at: string;
}

interface ApiResponse<T> {
  data: T[];
  links: any;
  meta: any;
  result: string;
  message: string;
  status: number;
}

interface FilterValues {
  return_number: string;
  invoice_number: string;
  customer: string;
}

const SalesReturns = () => {
  const navigate = useNavigate();
  const { language, isRTL } = useLanguage();
  
  // ========== حالات الفلتر ==========
  const [filters, setFilters] = useState<FilterValues>({
    return_number: '',
    invoice_number: '',
    customer: ''
  });
  
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage] = useState(30);

  // ========== جلب المرتجعات ==========
  const {
    data: returnsResponse,
    isLoading,
    refetch
  } = useQuery<ApiResponse<SalesReturn>>({
    queryKey: ['sales-returns', filters, currentPage],
    queryFn: async () => {
      try {
        // بناء payload الفلتر حسب المطلوب
        const payload: any = {
          filters: {
            return_number: filters.return_number || undefined,
            invoice_number: filters.invoice_number || undefined,
            customer: filters.customer || undefined
          },
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: perPage,
          paginate: true
        };

        // إزالة الحقول الفاضية
        if (!payload.filters.return_number) delete payload.filters.return_number;
        if (!payload.filters.invoice_number) delete payload.filters.invoice_number;
        if (!payload.filters.customer) delete payload.filters.customer;
        
        // لو كل الفلاتر فاضية، نشيل الـ filters كله
        if (Object.keys(payload.filters).length === 0) {
          delete payload.filters;
        }

        console.log('📦 Fetching sales returns with payload:', payload);

        const response = await api.post('/sales-return/index', payload);

        if (response.data.result === 'Success') {
          return response.data;
        }

        throw new Error(response.data.message || 'Failed to fetch returns');
      } catch (error) {
        console.error('Error fetching sales returns:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب المرتجعات' : 'Error fetching returns',
          variant: 'destructive',
        });
        throw error;
      }
    },
  });

  const returns = returnsResponse?.data || [];

  // ========== جلب تفاصيل المرتجع ==========
  const fetchReturnDetails = async (returnId: number) => {
    try {
      const response = await api.get(`/sales-return/${returnId}`);
      
      if (response.data.result === 'Success') {
        setSelectedReturn(response.data.data);
        setShowDetails(true);
      } else {
        toast({
          title: language === 'ar' ? 'خطأ في جلب التفاصيل' : 'Error fetching details',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error fetching return details:', error);
      toast({
        title: language === 'ar' ? 'خطأ في جلب تفاصيل المرتجع' : 'Error fetching return details',
        variant: 'destructive',
      });
    }
  };

  // ========== إعادة تعيين الفلاتر ==========
  const resetFilters = () => {
    setFilters({
      return_number: '',
      invoice_number: '',
      customer: ''
    });
    setCurrentPage(1);
  };

  // ========== ترجمة طريقة المرتجع ==========
  const getReturnMethodLabel = (method: string): string => {
    const methods: Record<string, { en: string; ar: string }> = {
      'نقدي': { en: 'Cash', ar: 'نقدي' },
      'بطاقة': { en: 'Card', ar: 'بطاقة' },
      'تحويل': { en: 'Transfer', ar: 'تحويل' },
    };
    
    // لو method بالعربية
    if (method === 'نقدي' || method === 'بطاقة' || method === 'تحويل') {
      return language === 'ar' ? method : methods[method]?.en || method;
    }
    
    // لو method بالإنجليزية
    return language === 'ar' ? methods[method]?.ar || method : methods[method]?.en || method;
  };

  // ========== تنسيق العملة ==========
  const formatCurrency = (amount: string) => {
    return Number(amount).toLocaleString() + ' YER';
  };

  return (
      <div className="space-y-6 p-4 md:p-6" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* ========== Header ========== */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <RotateCcw className="text-primary" size={28} />
              {language === 'ar' ? 'مرتجعات المبيعات' : 'Sales Returns'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ar' 
                ? 'إدارة وإرجاعات فواتير البيع' 
                : 'Manage sales returns and refunds'}
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter size={16} />
            {language === 'ar' ? 'بحث متقدم' : 'Advanced Search'}
          </Button>
        </div>

        {/* ========== فلتر البحث المتقدم ========== */}
        {showFilters && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Search size={16} />
                  {language === 'ar' ? 'فلتر البحث' : 'Search Filters'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-8 gap-1"
                >
                  <X size={14} />
                  {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* رقم المرتجع */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <Hash size={14} className="text-muted-foreground" />
                    {language === 'ar' ? 'رقم المرتجع' : 'Return Number'}
                  </label>
                  <Input
                    placeholder={language === 'ar' ? 'أدخل رقم المرتجع' : 'Enter return number'}
                    value={filters.return_number}
                    onChange={(e) => setFilters(prev => ({ ...prev, return_number: e.target.value }))}
                  />
                </div>

                {/* رقم الفاتورة */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <FileText size={14} className="text-muted-foreground" />
                    {language === 'ar' ? 'رقم الفاتورة' : 'Invoice Number'}
                  </label>
                  <Input
                    placeholder={language === 'ar' ? 'أدخل رقم الفاتورة' : 'Enter invoice number'}
                    value={filters.invoice_number}
                    onChange={(e) => setFilters(prev => ({ ...prev, invoice_number: e.target.value }))}
                  />
                </div>

                {/* العميل */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1">
                    <User size={14} className="text-muted-foreground" />
                    {language === 'ar' ? 'العميل' : 'Customer'}
                  </label>
                  <Input
                    placeholder={language === 'ar' ? 'أدخل اسم العميل' : 'Enter customer name'}
                    value={filters.customer}
                    onChange={(e) => setFilters(prev => ({ ...prev, customer: e.target.value }))}
                  />
                </div>
              </div>

              {/* أزرار البحث */}
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setFilters({ return_number: '', invoice_number: '', customer: '' });
                    setCurrentPage(1);
                  }}
                >
                  {language === 'ar' ? 'مسح' : 'Clear'}
                </Button>
                <Button onClick={() => {
                  setCurrentPage(1);
                  refetch();
                }}>
                  <Search size={16} className="me-2" />
                  {language === 'ar' ? 'بحث' : 'Search'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ========== جدول المرتجعات ========== */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : returns.length === 0 ? (
              <div className="text-center py-12">
                <RotateCcw className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {language === 'ar' ? 'لا توجد مرتجعات' : 'No returns found'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'ar' 
                    ? 'لم يتم العثور على أي مرتجعات تطابق معايير البحث' 
                    : 'No returns match your search criteria'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Hash size={14} />
                          {language === 'ar' ? 'رقم المرتجع' : 'Return #'}
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <FileText size={14} />
                          {language === 'ar' ? 'رقم الفاتورة' : 'Invoice #'}
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <User size={14} />
                          {language === 'ar' ? 'العميل' : 'Customer'}
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Package size={14} />
                          {language === 'ar' ? 'عدد الأصناف' : 'Items'}
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} />
                          {language === 'ar' ? 'المبلغ' : 'Amount'}
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center gap-1">
                          <Calendar size={14} />
                          {language === 'ar' ? 'التاريخ' : 'Date'}
                        </div>
                      </TableHead>
                      <TableHead className="text-center">
                        {language === 'ar' ? 'الإجراءات' : 'Actions'}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returns.map((ret, index) => (
                      <TableRow key={ret.id} className="hover:bg-muted/50">
                        <TableCell className="font-mono text-muted-foreground">
                          {index + 1}
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {ret.return_number}
                        </TableCell>
                        <TableCell className="font-mono">
                          {ret.invoice_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User size={14} className="text-muted-foreground" />
                            {ret.customer}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="bg-primary/5">
                            {ret.items.length}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(ret.total_amount)}
                        </TableCell>
                        <TableCell>
                          {formatDate(ret.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => fetchReturnDetails(ret.id)}
                              className="h-8 w-8 p-0"
                              title={language === 'ar' ? 'عرض التفاصيل' : 'View details'}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== Modal عرض التفاصيل ========== */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <RotateCcw className="text-primary" size={24} />
                {language === 'ar' ? 'تفاصيل المرتجع' : 'Return Details'}
                <span className="text-sm font-mono text-muted-foreground">
                  #{selectedReturn?.return_number}
                </span>
              </DialogTitle>
            </DialogHeader>

            {selectedReturn && (
              <div className="space-y-4">
                {/* معلومات أساسية */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {language === 'ar' ? 'رقم الفاتورة' : 'Invoice'}
                      </div>
                      <div className="font-medium font-mono">
                        {selectedReturn.invoice_number}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {language === 'ar' ? 'العميل' : 'Customer'}
                      </div>
                      <div className="font-medium">
                        {selectedReturn.customer}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {language === 'ar' ? 'التاريخ' : 'Date'}
                      </div>
                      <div className="font-medium">
                        {formatDate(selectedReturn.created_at)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        {language === 'ar' ? 'طريقة المرتجع' : 'Method'}
                      </div>
                      <div className="font-medium">
                        {getReturnMethodLabel(selectedReturn.return_method)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        {language === 'ar' ? 'الإجمالي' : 'Total'}
                      </div>
                      <div className="font-bold text-lg text-primary">
                        {formatCurrency(selectedReturn.total_amount)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {language === 'ar' ? 'عدد الأصناف' : 'Items'}
                      </div>
                      <div className="font-medium text-lg">
                        {selectedReturn.items.length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* ملاحظات */}
                {selectedReturn.note && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground mb-1">
                        {language === 'ar' ? 'ملاحظات' : 'Notes'}
                      </p>
                      <p className="text-sm">{selectedReturn.note}</p>
                    </CardContent>
                  </Card>
                )}

                {/* جدول الأصناف */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {language === 'ar' ? 'الأصناف المرتجعة' : 'Returned Items'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-16">#</TableHead>
                            <TableHead>{language === 'ar' ? 'المنتج' : 'Product'}</TableHead>
                            <TableHead className="text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</TableHead>
                            <TableHead className="text-right">{language === 'ar' ? 'السعر' : 'Price'}</TableHead>
                            <TableHead className="text-right">{language === 'ar' ? 'الإجمالي' : 'Total'}</TableHead>
                            <TableHead>{language === 'ar' ? 'سبب الإرجاع' : 'Reason'}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedReturn.items.map((item, idx) => (
                            <TableRow key={idx}>
                              <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{item.product}</TableCell>
                              <TableCell className="text-center">{item.quantity}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                              <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                              <TableCell className="max-w-[200px]">
                                <span className="text-sm">{item.reason}</span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>

                {/* زر الإغلاق */}
                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setShowDetails(false)}>
                    {language === 'ar' ? 'إغلاق' : 'Close'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
};

export default SalesReturns;