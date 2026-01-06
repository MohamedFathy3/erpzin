import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Download,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ExpenseManagerProps {
  language: string;
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  payment_method: string | null;
  reference_number: string | null;
  created_at: string;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ language }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);

  // Form state
  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    expense_date: new Date(),
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
    { value: 'card', label: language === 'ar' ? 'بطاقة' : 'Card' }
  ];

  // Fetch expenses
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', categoryFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (dateFilter) {
        query = query.eq('expense_date', format(dateFilter, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Expense[];
    }
  });

  // Create expense mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('expenses').insert({
        category: data.category,
        amount: parseFloat(data.amount),
        description: data.description || null,
        expense_date: format(data.expense_date, 'yyyy-MM-dd'),
        payment_method: data.payment_method,
        reference_number: data.reference_number || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(language === 'ar' ? 'تم إضافة المصروف بنجاح' : 'Expense added successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Update expense mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('expenses')
        .update({
          category: data.category,
          amount: parseFloat(data.amount),
          description: data.description || null,
          expense_date: format(data.expense_date, 'yyyy-MM-dd'),
          payment_method: data.payment_method,
          reference_number: data.reference_number || null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(language === 'ar' ? 'تم تحديث المصروف بنجاح' : 'Expense updated successfully');
      handleCloseForm();
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  // Delete expense mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(language === 'ar' ? 'تم حذف المصروف بنجاح' : 'Expense deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingExpense(null);
    setFormData({
      category: '',
      amount: '',
      description: '',
      expense_date: new Date(),
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
      expense_date: new Date(expense.expense_date),
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

  const filteredExpenses = expenses.filter(exp => 
    exp.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    exp.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  const getCategoryBadge = (category: string) => {
    const cat = categories.find(c => c.value === category);
    return (
      <Badge variant="outline" className="gap-1">
        <span className={`w-2 h-2 rounded-full ${cat?.color || 'bg-gray-500'}`} />
        {cat?.label || category}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder={language === 'ar' ? 'بحث...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-10 w-64"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <Filter size={16} className="me-2" />
              <SelectValue placeholder={language === 'ar' ? 'الفئة' : 'Category'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{language === 'ar' ? 'الكل' : 'All'}</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus size={18} />
          {language === 'ar' ? 'مصروف جديد' : 'New Expense'}
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-200 dark:border-red-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي المصروفات' : 'Total Expenses'}
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {totalAmount.toLocaleString()} <span className="text-sm">ر.ي</span>
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {filteredExpenses.length} {language === 'ar' ? 'مصروف' : 'expenses'}
            </Badge>
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
                    <TableCell colSpan={7} className="text-center py-8">
                      {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                    </TableCell>
                  </TableRow>
                ) : filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد مصروفات' : 'No expenses found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{getCategoryBadge(expense.category)}</TableCell>
                      <TableCell className="max-w-48 truncate">
                        {expense.description || '-'}
                      </TableCell>
                      <TableCell className="font-bold text-red-600">
                        {Number(expense.amount).toLocaleString()} ر.ي
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {paymentMethods.find(p => p.value === expense.payment_method)?.label || expense.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(expense.expense_date), 'yyyy/MM/dd', { locale: language === 'ar' ? ar : undefined })}
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
                            onClick={() => deleteMutation.mutate(expense.id)}
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
                      {format(formData.expense_date, 'yyyy/MM/dd')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.expense_date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, expense_date: date }))}
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
