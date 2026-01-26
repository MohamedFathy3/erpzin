import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
import { Plus, Search, Edit, Trash2, Calendar as CalendarIcon, Filter, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { formatDate, cn } from '@/lib/utils';

interface RevenueManagerProps {
  language: string;
}

const RevenueManager: React.FC<RevenueManagerProps> = ({ language }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    description: '',
    revenue_date: new Date(),
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
    { value: 'card', label: language === 'ar' ? 'بطاقة' : 'Card' }
  ];

  const { data: revenues = [], isLoading } = useQuery({
    queryKey: ['revenues', categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('revenues')
        .select('*')
        .order('revenue_date', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('revenues').insert({
        category: data.category,
        amount: parseFloat(data.amount),
        description: data.description || null,
        revenue_date: format(data.revenue_date, 'yyyy-MM-dd'),
        payment_method: data.payment_method,
        reference_number: data.reference_number || null
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      toast.success(language === 'ar' ? 'تم إضافة الإيراد بنجاح' : 'Revenue added successfully');
      handleCloseForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('revenues')
        .update({
          category: data.category,
          amount: parseFloat(data.amount),
          description: data.description || null,
          revenue_date: format(data.revenue_date, 'yyyy-MM-dd'),
          payment_method: data.payment_method,
          reference_number: data.reference_number || null
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      toast.success(language === 'ar' ? 'تم تحديث الإيراد بنجاح' : 'Revenue updated successfully');
      handleCloseForm();
    },
    onError: (error: any) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('revenues').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['revenues'] });
      toast.success(language === 'ar' ? 'تم حذف الإيراد بنجاح' : 'Revenue deleted successfully');
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRevenue(null);
    setFormData({
      category: '',
      amount: '',
      description: '',
      revenue_date: new Date(),
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
      revenue_date: new Date(revenue.revenue_date),
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

  const filteredRevenues = revenues.filter(rev =>
    rev.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rev.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rev.reference_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalAmount = filteredRevenues.reduce((sum, rev) => sum + Number(rev.amount), 0);

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
          {language === 'ar' ? 'إيراد جديد' : 'New Revenue'}
        </Button>
      </div>

      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-200 dark:border-green-800">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">
                  {language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue'}
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {totalAmount.toLocaleString()} <span className="text-sm">ر.ي</span>
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {filteredRevenues.length} {language === 'ar' ? 'إيراد' : 'revenues'}
            </Badge>
          </div>
        </CardContent>
      </Card>

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
                ) : filteredRevenues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {language === 'ar' ? 'لا توجد إيرادات' : 'No revenues found'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRevenues.map((revenue) => (
                    <TableRow key={revenue.id}>
                      <TableCell>{getCategoryBadge(revenue.category)}</TableCell>
                      <TableCell className="max-w-48 truncate">
                        {revenue.description || '-'}
                      </TableCell>
                      <TableCell className="font-bold text-green-600">
                        {Number(revenue.amount).toLocaleString()} ر.ي
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {paymentMethods.find(p => p.value === revenue.payment_method)?.label || revenue.payment_method}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(revenue.revenue_date)}
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
                            onClick={() => deleteMutation.mutate(revenue.id)}
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
                      {format(formData.revenue_date, 'yyyy/MM/dd')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.revenue_date}
                      onSelect={(date) => date && setFormData(prev => ({ ...prev, revenue_date: date }))}
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
