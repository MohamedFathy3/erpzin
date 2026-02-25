import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Calendar as CalendarIcon, Filter, TrendingUp, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';
import { formatDate, cn } from '@/lib/utils';
import api from '@/lib/api';

interface RevenueManagerProps {
  language: string;
}

const RevenueManager: React.FC<RevenueManagerProps> = ({ language }) => {
  const queryClient = useQueryClient();
  const { formatCurrency } = useRegionalSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date(),
    payment_method: 'cash',
    reference_number: ''
  });

  const categories = [
    { value: 'sales', label: language === 'ar' ? 'مبيعات' : 'Sales', color: 'bg-green-500' },
    { value: 'services', label: language === 'ar' ? 'خدمات' : 'Services', color: 'bg-blue-500' },
    { value: 'rentals', label: language === 'ar' ? 'إيجارات' : 'Rentals', color: 'bg-purple-500' },
    { value: 'commissions', label: language === 'ar' ? 'عمولات' : 'Commissions', color: 'bg-yellow-500' },
    { value: 'interest', label: language === 'ar' ? 'فوائد' : 'Interest', color: 'bg-cyan-500' },
    { value: 'refunds', label: language === 'ar' ? 'استردادات' : 'Refunds', color: 'bg-orange-500' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other', color: 'bg-gray-500' }
  ];

  const paymentMethods = [
    { value: 'cash', label: language === 'ar' ? 'نقدي' : 'Cash' },
    { value: 'bank_transfer', label: language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer' },
    { value: 'check', label: language === 'ar' ? 'شيك' : 'Check' },
    { value: 'credit_card', label: language === 'ar' ? 'بطاقة' : 'Card' }
  ];

  // بناء الفلاتر للبحث
  const buildFilters = () => {
    const filters: any = {};
    
    if (categoryFilter) {
      filters.category = categoryFilter;
    }
    
    if (searchQuery) {
      filters.description = searchQuery;
      
    }

    if (dateFrom) {
      filters.date = format(dateFrom, 'yyyy-MM-dd');
    }

    
    return filters;
  };

  const { data: revenueData, isLoading } = useQuery({
    queryKey: ['revenues', categoryFilter, searchQuery, dateFrom, dateTo, currentPage, perPage],
    queryFn: async () => {
      const response = await api.post('/revenue/index', {
        filters: buildFilters(),
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: perPage,
        paginate: true
      });
      
      return response.data;
    }
  });

  const revenues = revenueData?.data || [];
  const meta = revenueData?.meta || {};

  // create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/revenue', {
        category: data.category,
        amount: parseFloat(data.amount),
        description: data.description,
        date: format(data.date, 'yyyy-MM-dd'),
        payment_method: data.payment_method,
        reference_number: data.reference_number
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      toast.success(language === 'ar' ? 'تم إضافة الإيراد بنجاح' : 'Revenue added successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const response = await api.put(`/revenue/${id}`, {
        id: id,
        category: data.category,
        amount: parseFloat(data.amount),
        description: data.description,
        date: format(data.date, 'yyyy-MM-dd'),
        payment_method: data.payment_method,
        reference_number: data.reference_number
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      toast.success(language === 'ar' ? 'تم تحديث الإيراد بنجاح' : 'Revenue updated successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const response = await api.delete('/revenue/delete', {

        data: { items: ids }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      setSelectedItems([]);
      toast.success(language === 'ar' ? 'تم حذف الإيرادات بنجاح' : 'Revenues deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRevenue(null);
    setFormData({
      category: '',
      amount: '',
      description: '',
      date: new Date(),
      payment_method: 'cash',
      reference_number: ''
    });
  };

  const handleEdit = (revenue: any) => {
    setEditingRevenue(revenue);
    setFormData({
      category: revenue.category,
      amount: revenue.amount.toString(),
      description: revenue.description || '',
      date: new Date(revenue.date),
      payment_method: revenue.payment_method || 'cash',
      reference_number: revenue.reference_number || ''
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.category || !formData.amount) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    if (editingRevenue) {
      updateMutation.mutate({ id: editingRevenue.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الإيراد؟' : 'Are you sure you want to delete this revenue?')) {
      deleteMutation.mutate([id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) {
      toast.error(language === 'ar' ? 'لم يتم تحديد أي عناصر' : 'No items selected');
      return;
    }

    if (window.confirm(language === 'ar' ? `هل أنت متأكد من حذف ${selectedItems.length} عنصر؟` : `Are you sure you want to delete ${selectedItems.length} items?`)) {
      deleteMutation.mutate(selectedItems);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === revenues.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(revenues.map((r: any) => r.id));
    }
  };

  const handleSelectItem = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(itemId => itemId !== id)
        : [...prev, id]
    );
  };

  const clearFilters = () => {
    setCategoryFilter('');
    setSearchQuery('');
    setDateFrom(undefined);
    setDateTo(undefined);
    setCurrentPage(1);
  };

  const getCategoryBadge = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return (
      <Badge variant="outline" className="gap-1">
        <span className={`w-2 h-2 rounded-full ${cat?.color || 'bg-gray-500'}`} />
        {cat?.label || category}
      </Badge>
    );
  };

  // حساب إجمالي الإيرادات
  const totalAmount = revenues.reduce((sum: number, rev: any) => sum + Number(rev.amount), 0);

  function handlePageChange(arg0: number): void {
    throw new Error('Function not implemented.');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* بحث */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder={language === 'ar' ? 'بحث في الوصف...' : 'Search description...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="ps-10 w-64"
            />
          </div>

          {/* فلتر الفئة */}
          <Select 
            value={categoryFilter} 
            onValueChange={(value) => {
              setCategoryFilter(value);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-40">
              <Filter size={16} className="me-2" />
              <SelectValue placeholder={language === 'ar' ? 'الفئة' : 'Category'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all_categories">🔍 {language === 'ar' ? 'كل الفئات' : 'All Categories'}</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                    {cat.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* فلتر التاريخ من */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-40 justify-start">
                <CalendarIcon className="me-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'yyyy/MM/dd') : (language === 'ar' ? ' تاريخ' : ' date')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={(date) => {
                  setDateFrom(date);
                  setCurrentPage(1);
                }}
              />
            </PopoverContent>
          </Popover>

          {/* فلتر التاريخ إلى */}
         

          {/* زر مسح الفلاتر */}
          {(searchQuery || categoryFilter || dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
              <X size={16} />
              {language === 'ar' ? 'مسح الكل' : 'Clear all'}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {selectedItems.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected} className="gap-2">
              <Trash2 size={16} />
              {language === 'ar' ? `حذف (${selectedItems.length})` : `Delete (${selectedItems.length})`}
            </Button>
          )}
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus size={18} />
            {language === 'ar' ? 'إيراد جديد' : 'New Revenue'}
          </Button>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الإيرادات (الصفحة الحالية)' : 'Total Revenue (Current Page)'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {meta.total || 0} {language === 'ar' ? 'إجمالي الإيرادات' : 'total revenues'}
              </Badge>
              <Select value={perPage.toString()} onValueChange={(value) => {
                setPerPage(parseInt(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === revenues.length && revenues.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>{language === 'ar' ? 'الفئة' : 'Category'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead>{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المرجع' : 'Reference'}</TableHead>
                  <TableHead className="w-24"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </TableCell>
                  </TableRow>
                ) : revenues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد إيرادات' : 'No revenues found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  revenues.map((revenue: any) => (
                    <TableRow key={revenue.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(revenue.id)}
                          onChange={() => handleSelectItem(revenue.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>{getCategoryBadge(revenue.category)}</TableCell>
                      <TableCell className="max-w-48 truncate">
                        {revenue.description || '-'}
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        {revenue.formatted_amount || formatCurrency(Number(revenue.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {paymentMethods.find(p => p.value === revenue.payment_method)?.label || revenue.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(revenue.date)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {revenue.reference_number || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(revenue)}>
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(revenue.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {language === 'ar' 
              ? `عرض ${meta.from || 0} إلى ${meta.to || 0} من ${meta.total || 0} نتيجة`
              : `Showing ${meta.from || 0} to ${meta.to || 0} of ${meta.total || 0} results`
            }
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronRight size={16} />
              {language === 'ar' ? 'السابق' : 'Previous'}
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, meta.last_page) }, (_, i) => {
                let pageNum = currentPage;
                if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= meta.last_page - 2) {
                  pageNum = meta.last_page - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                if (pageNum > 0 && pageNum <= meta.last_page) {
                  function handlePageChange(pageNum: number): void {
                    throw new Error('Function not implemented.');
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="w-10"
                    >
                      {pageNum}
                    </Button>
                  );
                }
                return null;
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === meta.last_page}
            >
              {language === 'ar' ? 'التالي' : 'Next'}
              <ChevronLeft size={16} />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingRevenue
                ? (language === 'ar' ? 'تعديل الإيراد' : 'Edit Revenue')
                : (language === 'ar' ? 'إيراد جديد' : 'New Revenue')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'الفئة' : 'Category'} *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={language === 'ar' ? 'اختر الفئة' : 'Select category'} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'المبلغ' : 'Amount'} *</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'الوصف' : 'Description'}</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder={language === 'ar' ? 'وصف الإيراد...' : 'Revenue description...'}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'ar' ? 'التاريخ' : 'Date'}</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="me-2 h-4 w-4" />
                      {format(formData.date, 'yyyy/MM/dd')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, date }))}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, payment_method: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map(method => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{language === 'ar' ? 'رقم المرجع' : 'Reference Number'}</Label>
              <Input
                value={formData.reference_number}
                onChange={(e) => setFormData(prev => ({ ...prev, reference_number: e.target.value }))}
                placeholder={language === 'ar' ? 'رقم الفاتورة أو المرجع' : 'Invoice or reference number'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingRevenue
                ? (language === 'ar' ? 'تحديث' : 'Update')
                : (language === 'ar' ? 'إضافة' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RevenueManager;