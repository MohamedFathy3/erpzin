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
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Calendar as CalendarIcon,
  Filter,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import api from '@/lib/api';

interface ExpenseManagerProps {
  language: string;
}

interface Expense {
  id: number;
  category: string;
  amount: string;
  formatted_amount: string;
  description: string | null;
  date: string;
  date_formatted: string;
  payment_method: string;
  payment_method_arabic: string;
  reference_number: string | null;
  created_at: string;
  updated_at: string;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ language }) => {
  const queryClient = useQueryClient();
  const { formatCurrency } = useRegionalSettings();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    date: new Date(),
    payment_method: 'cash',
    reference_number: ''
  });

  const categories = [
    { value: 'rent', label: language === 'ar' ? 'إيجار' : 'Rent', color: 'bg-blue-500' },
    { value: 'utilities', label: language === 'ar' ? 'مرافق' : 'Utilities', color: 'bg-green-500' },
    { value: 'salaries', label: language === 'ar' ? 'رواتب' : 'Salaries', color: 'bg-yellow-500' },
    { value: 'supplies', label: language === 'ar' ? 'مستلزمات' : 'Supplies', color: 'bg-purple-500' },
    { value: 'marketing', label: language === 'ar' ? 'تسويق' : 'Marketing', color: 'bg-pink-500' },
    { value: 'maintenance', label: language === 'ar' ? 'صيانة' : 'Maintenance', color: 'bg-cyan-500' },
    { value: 'transport', label: language === 'ar' ? 'نقل' : 'Transport', color: 'bg-orange-500' },
    { value: 'insurance', label: language === 'ar' ? 'تأمين' : 'Insurance', color: 'bg-indigo-500' },
    { value: 'taxes', label: language === 'ar' ? 'ضرائب' : 'Taxes', color: 'bg-red-500' },
    { value: 'other', label: language === 'ar' ? 'أخرى' : 'Other', color: 'bg-gray-500' }
  ];

  const paymentMethods = [
    { value: 'cash', label: language === 'ar' ? 'نقدي' : 'Cash' },
    { value: 'bank_transfer', label: language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer' },
    { value: 'check', label: language === 'ar' ? 'شيك' : 'Check' },
    { value: 'credit_card', label: language === 'ar' ? 'بطاقة' : 'Credit Card' }
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

  // Fetch expenses
  const { data: expensesData, isLoading } = useQuery({
    queryKey: ['expenses', categoryFilter, searchQuery, dateFrom, dateTo, currentPage, perPage],
    queryFn: async () => {
      const response = await api.post('/finance/index', {
        filters: buildFilters(),
        orderBy: 'id',
        orderByDirection: 'desc',
        perPage: perPage,
        paginate: true
      });
      
      return response.data;
    }
  });

  const expenses = expensesData?.data || [];
  const meta = expensesData?.meta || {};

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/finance', {
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(language === 'ar' ? 'تم إضافة المصروف بنجاح' : 'Expense added successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: typeof formData }) => {
      const response = await api.put(`/finance/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(language === 'ar' ? 'تم تحديث المصروف بنجاح' : 'Expense updated successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const response = await api.delete('/finance/delete', {
        data: { items: ids }
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      setSelectedItems([]);
      toast.success(language === 'ar' ? 'تم حذف المصروفات بنجاح' : 'Expenses deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || error.message);
    }
  });

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingExpense(null);
    setFormData({
      category: '',
      amount: '',
      description: '',
      date: new Date(),
      payment_method: 'cash',
      reference_number: ''
    });
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      amount: expense.amount.toString(),
      description: expense.description || '',
      date: new Date(expense.date),
      payment_method: expense.payment_method || 'cash',
      reference_number: expense.reference_number || ''
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.category || !formData.amount) {
      toast.error(language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    if (editingExpense) {
      updateMutation.mutate({ id: editingExpense.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Are you sure you want to delete this expense?')) {
      deleteMutation.mutate([id]);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) {
      toast.error(language === 'ar' ? 'لم يتم تحديد أي عناصر' : 'No items selected');
      return;
    }

    if (window.confirm(language === 'ar' ? `هل أنت متأكد من حذف ${selectedItems.length} مصروف؟` : `Are you sure you want to delete ${selectedItems.length} expenses?`)) {
      deleteMutation.mutate(selectedItems);
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.length === expenses.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(expenses.map((exp: any) => exp.id));
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

  // حساب إجمالي المصروفات
  const totalAmount = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
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

          {/* Category filter */}
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

          {/* Date from filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-40 justify-start">
                <CalendarIcon className="me-2 h-4 w-4" />
                {dateFrom ? format(dateFrom, 'yyyy/MM/dd') : (language === 'ar' ? 'من تاريخ' : 'From date')}
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

          {/* Date to filter */}
        

          {/* Clear filters button */}
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
            {language === 'ar' ? 'مصروف جديد' : 'New Expense'}
          </Button>
        </div>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-200 dark:border-red-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي المصروفات (الصفحة الحالية)' : 'Total Expenses (Current Page)'}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {meta.total || 0} {language === 'ar' ? 'إجمالي المصروفات' : 'total expenses'}
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

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === expenses.length && expenses.length > 0}
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
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد مصروفات' : 'No expenses found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense: Expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(expense.id)}
                          onChange={() => handleSelectItem(expense.id)}
                          className="rounded border-gray-300"
                        />
                      </TableCell>
                      <TableCell>{getCategoryBadge(expense.category)}</TableCell>
                      <TableCell className="max-w-48 truncate">
                        {expense.description || '-'}
                      </TableCell>
                      <TableCell className="font-bold text-red-600">
                        {expense.formatted_amount || formatCurrency(Number(expense.amount))}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {language === 'ar' 
                            ? (expense.payment_method_arabic || paymentMethods.find(p => p.value === expense.payment_method)?.label || expense.payment_method)
                            : (paymentMethods.find(p => p.value === expense.payment_method)?.label || expense.payment_method)
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {expense.date_formatted || format(new Date(expense.date), 'yyyy/MM/dd', { locale: language === 'ar' ? ar : undefined })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {expense.reference_number || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(expense)}
                          >
                            <Edit size={16} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(expense.id)}
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
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
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
              onClick={() => setCurrentPage(prev => Math.min(meta.last_page, prev + 1))}
              disabled={currentPage === meta.last_page}
            >
              {language === 'ar' ? 'التالي' : 'Next'}
              <ChevronLeft size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingExpense 
                ? (language === 'ar' ? 'تعديل المصروف' : 'Edit Expense')
                : (language === 'ar' ? 'مصروف جديد' : 'New Expense')}
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
                placeholder={language === 'ar' ? 'وصف المصروف...' : 'Expense description...'}
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
                placeholder={language === 'ar' ? 'رقم الإيصال أو المرجع' : 'Receipt or reference number'}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseForm}>
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending)
                ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                : (language === 'ar' ? 'حفظ' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseManager;