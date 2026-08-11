/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRegionalSettings } from '@/contexts/RegionalSettingsContext';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  ChevronLeft,
  ChevronRight,
  X,
  Landmark,
  DollarSign,
  Building2
} from 'lucide-react';
import { format } from 'date-fns';
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
  treasury_id?: number | null;
  currency_id?: number | null;
  branch_id?: number | null;
  treasury?: {
    id: number;
    name: string;
    name_ar: string | null;
    balance: string;
  };
  currency?: {
    id: number;
    code: string;
    name: string;
    name_ar: string | null;
    symbol: string;
  };
  branch?: {
    id: number;
    name: string;
    name_ar: string | null;
  };
  created_at: string;
  updated_at: string;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ language }) => {
  const queryClient = useQueryClient();
  const { formatCurrency } = useRegionalSettings();
  const { userBranch, currentBranch } = useApp();
  
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // ✅ القيمة الافتراضية all بدلاً من ''
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // ✅ جلب الخزائن
  const { data: treasuriesData } = useQuery({
    queryKey: ['treasuries-for-expense'],
    queryFn: async () => {
      const response = await api.post('/treasury/index');
      return response.data;
    }
  });
  const treasuries = treasuriesData?.data || [];

  // ✅ جلب العملات
  const { data: currenciesData } = useQuery({
    queryKey: ['currencies-for-expense'],
    queryFn: async () => {
      const response = await api.post('/currency/index');
      return response.data;
    }
  });
  const currencies = currenciesData?.data || [];

  // Form state
  const [formData, setFormData] = useState({
    category: 'all', // ✅ القيمة الافتراضية all
    amount: '',
    description: '',
    date: new Date(),
    payment_method: 'cash',
    reference_number: '',
    treasury_id: 'none',
    currency_id: 'none',
    branch_id: ''
  });

  // ✅ تعيين الفرع الحالي تلقائياً
  useEffect(() => {
    const branchId = userBranch?.id || currentBranch?.id;
    if (branchId) {
      setFormData(prev => ({ ...prev, branch_id: branchId.toString() }));
    }
  }, [userBranch, currentBranch]);

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

  const buildFilters = () => {
    const filters: any = {};
    // ✅ لا نرسل الفئة إذا كانت 'all'
    if (categoryFilter && categoryFilter !== 'all') filters.category = categoryFilter;
    if (searchQuery) filters.description = searchQuery;
    if (dateFrom) filters.date_from = format(dateFrom, 'yyyy-MM-dd');
    if (dateTo) filters.date_to = format(dateTo, 'yyyy-MM-dd');
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
        category: data.category === 'all' ? '' : data.category, // ✅ تحويل all إلى فارغ للسيرفر
        amount: parseFloat(data.amount),
        description: data.description,
        date: format(data.date, 'yyyy-MM-dd'),
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        treasury_id: data.treasury_id && data.treasury_id !== 'none' ? parseInt(data.treasury_id) : null,
        currency_id: data.currency_id && data.currency_id !== 'none' ? parseInt(data.currency_id) : null,
        branch_id: data.branch_id ? parseInt(data.branch_id) : null
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
        category: data.category === 'all' ? '' : data.category, // ✅ تحويل all إلى فارغ للسيرفر
        amount: parseFloat(data.amount),
        description: data.description,
        date: format(data.date, 'yyyy-MM-dd'),
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        treasury_id: data.treasury_id && data.treasury_id !== 'none' ? parseInt(data.treasury_id) : null,
        currency_id: data.currency_id && data.currency_id !== 'none' ? parseInt(data.currency_id) : null,
        branch_id: data.branch_id ? parseInt(data.branch_id) : null
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
      category: 'all',
      amount: '',
      description: '',
      date: new Date(),
      payment_method: 'cash',
      reference_number: '',
      treasury_id: 'none',
      currency_id: 'none',
      branch_id: userBranch?.id?.toString() || currentBranch?.id?.toString() || ''
    });
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category || 'all',
      amount: expense.amount.toString(),
      description: expense.description || '',
      date: new Date(expense.date),
      payment_method: expense.payment_method || 'cash',
      reference_number: expense.reference_number || '',
      treasury_id: expense.treasury_id?.toString() || 'none',
      currency_id: expense.currency_id?.toString() || 'none',
      branch_id: expense.branch_id?.toString() || userBranch?.id?.toString() || currentBranch?.id?.toString() || ''
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    if (!formData.category || formData.category === 'all' || !formData.amount) {
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
    setCategoryFilter('all');
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

  const totalAmount = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0);

  return (
    <div className="space-y-4">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">
            {language === 'ar' ? 'المصروفات' : 'Expenses'}
          </h2>
          {selectedItems.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {selectedItems.length} {language === 'ar' ? 'محدد' : 'selected'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selectedItems.length > 0 && (
            <Button variant="destructive" size="sm" onClick={handleDeleteSelected}>
              <Trash2 className="h-4 w-4 mr-2" />
              {language === 'ar' ? 'حذف المحدد' : 'Delete Selected'}
            </Button>
          )}
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {language === 'ar' ? 'إضافة مصروف' : 'Add Expense'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            {/* ✅ تم إصلاح الـ Select هنا لاستخدام 'all' بدلاً من '' */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder={language === 'ar' ? 'الفئة' : 'Category'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[150px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'yyyy/MM/dd') : (language === 'ar' ? 'من' : 'From')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full sm:w-[150px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'yyyy/MM/dd') : (language === 'ar' ? 'إلى' : 'To')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <input 
                      type="checkbox" 
                      checked={selectedItems.length === expenses.length && expenses.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </TableHead>
                  <TableHead>{language === 'ar' ? 'الفئة' : 'Category'}</TableHead>
                  <TableHead>{language === 'ar' ? 'المبلغ' : 'Amount'}</TableHead>
                  <TableHead>{language === 'ar' ? 'الوصف' : 'Description'}</TableHead>
                  <TableHead>{language === 'ar' ? 'التاريخ' : 'Date'}</TableHead>
                  <TableHead>{language === 'ar' ? 'طريقة الدفع' : 'Payment'}</TableHead>
                  <TableHead className="text-right">{language === 'ar' ? 'الإجراءات' : 'Actions'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </TableCell>
                  </TableRow>
                ) : expenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد مصروفات' : 'No expenses found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  expenses.map((expense: any) => (
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
                      <TableCell className="font-medium text-red-600">
                        {formatCurrency(Number(expense.amount))}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {expense.description || '-'}
                      </TableCell>
                      <TableCell>{expense.date_formatted}</TableCell>
                      <TableCell>
                        {language === 'ar' ? expense.payment_method_arabic : expense.payment_method}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(expense)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-600" onClick={() => handleDelete(expense.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination & Summary Footer */}
          <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {language === 'ar' ? 'الإجمالي' : 'Total'}: <span className="font-bold text-red-600">{formatCurrency(totalAmount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {currentPage} / {meta.last_page || 1}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                disabled={currentPage === (meta.last_page || 1)}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Form */}
      <Dialog open={showForm} onOpenChange={handleCloseForm}>
        <DialogContent className="sm:max-w-2xl">
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
                {/* ✅ تم إصلاح الـ Select هنا أيضاً لاستخدام 'all' بدلاً من '' */}
                <Select 
                  value={formData.category || 'all'} 
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

            {/* ✅ حقل الخزينة */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Landmark size={14} />
                {language === 'ar' ? 'الخزينة' : 'Treasury'}
              </Label>
              <Select
                value={formData.treasury_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, treasury_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر الخزينة' : 'Select treasury'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'بدون خزينة' : 'No treasury'}</SelectItem>
                  {treasuries.map((treasury: any) => (
                    <SelectItem key={treasury.id} value={treasury.id.toString()}>
                      <div className="flex items-center gap-2">
                        <Landmark size={14} className="text-muted-foreground" />
                        {language === 'ar' ? (treasury.name_ar || treasury.name) : treasury.name}
                        <span className="text-xs text-muted-foreground">
                          ({formatCurrency(Number(treasury.balance))})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ✅ حقل العملة */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <DollarSign size={14} />
                {language === 'ar' ? 'العملة' : 'Currency'}
              </Label>
              <Select
                value={formData.currency_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, currency_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={language === 'ar' ? 'اختر العملة' : 'Select currency'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{language === 'ar' ? 'العملة الافتراضية' : 'Default currency'}</SelectItem>
                  {currencies.map((currency: any) => (
                    <SelectItem key={currency.id} value={currency.id.toString()}>
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-muted-foreground" />
                        {currency.code} - {language === 'ar' ? (currency.name_ar || currency.name) : currency.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ✅ حقل الفرع */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Building2 size={14} />
                {language === 'ar' ? 'الفرع' : 'Branch'}
              </Label>
              <Input
                value={userBranch?.name || currentBranch?.name || (language === 'ar' ? 'الفرع الرئيسي' : 'Main Branch')}
                disabled
                className="bg-muted/50"
              />
              <input type="hidden" value={formData.branch_id} />
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