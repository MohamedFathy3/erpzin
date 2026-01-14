import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  Copy,
  Search,
  Calendar,
  Percent,
  DollarSign,
  Users,
  Package,
  CheckCircle,
  XCircle,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Coupon {
  id: string;
  code: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_purchase_amount: number | null;
  max_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  usage_per_customer: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  applicable_products: string[] | null;
  applicable_categories: string[] | null;
  applicable_customers: string[] | null;
  branch_id: string | null;
  created_at: string;
}

const CouponsManager: React.FC = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    description: '',
    discount_type: 'percentage',
    discount_value: 0,
    min_purchase_amount: 0,
    max_discount_amount: 0,
    usage_limit: 0,
    usage_per_customer: 1,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    is_active: true
  });

  // Fetch coupons
  const { data: coupons = [], isLoading } = useQuery({
    queryKey: ['coupons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Coupon[];
    }
  });

  // Create coupon mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('coupons').insert({
        code: data.code.toUpperCase(),
        name: data.name,
        name_ar: data.name_ar || null,
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_purchase_amount: data.min_purchase_amount || null,
        max_discount_amount: data.max_discount_amount || null,
        usage_limit: data.usage_limit || null,
        usage_per_customer: data.usage_per_customer,
        start_date: new Date(data.start_date).toISOString(),
        end_date: new Date(data.end_date).toISOString(),
        is_active: data.is_active
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setShowCreateDialog(false);
      resetForm();
      toast({ title: language === 'ar' ? 'تم إنشاء الكوبون بنجاح' : 'Coupon created successfully' });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في إنشاء الكوبون' : 'Error creating coupon', variant: 'destructive' });
    }
  });

  // Update coupon mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase
        .from('coupons')
        .update({
          code: data.code.toUpperCase(),
          name: data.name,
          name_ar: data.name_ar || null,
          description: data.description || null,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          min_purchase_amount: data.min_purchase_amount || null,
          max_discount_amount: data.max_discount_amount || null,
          usage_limit: data.usage_limit || null,
          usage_per_customer: data.usage_per_customer,
          start_date: new Date(data.start_date).toISOString(),
          end_date: new Date(data.end_date).toISOString(),
          is_active: data.is_active
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      setEditingCoupon(null);
      resetForm();
      toast({ title: language === 'ar' ? 'تم تحديث الكوبون بنجاح' : 'Coupon updated successfully' });
    }
  });

  // Delete coupon mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('coupons').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
      toast({ title: language === 'ar' ? 'تم حذف الكوبون' : 'Coupon deleted' });
    }
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('coupons')
        .update({ is_active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] });
    }
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      min_purchase_amount: 0,
      max_discount_amount: 0,
      usage_limit: 0,
      usage_per_customer: 1,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      is_active: true
    });
  };

  const handleEdit = (coupon: Coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      name_ar: coupon.name_ar || '',
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: coupon.discount_value,
      min_purchase_amount: coupon.min_purchase_amount || 0,
      max_discount_amount: coupon.max_discount_amount || 0,
      usage_limit: coupon.usage_limit || 0,
      usage_per_customer: coupon.usage_per_customer,
      start_date: format(new Date(coupon.start_date), 'yyyy-MM-dd'),
      end_date: format(new Date(coupon.end_date), 'yyyy-MM-dd'),
      is_active: coupon.is_active
    });
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, code }));
  };

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast({ title: language === 'ar' ? 'تم نسخ الكود' : 'Code copied' });
  };

  const getCouponStatus = (coupon: Coupon) => {
    const now = new Date();
    const start = new Date(coupon.start_date);
    const end = new Date(coupon.end_date);

    if (!coupon.is_active) return { label: language === 'ar' ? 'معطل' : 'Disabled', color: 'secondary' };
    if (now < start) return { label: language === 'ar' ? 'قادم' : 'Upcoming', color: 'warning' };
    if (now > end) return { label: language === 'ar' ? 'منتهي' : 'Expired', color: 'destructive' };
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return { label: language === 'ar' ? 'نفذ' : 'Used up', color: 'destructive' };
    }
    return { label: language === 'ar' ? 'نشط' : 'Active', color: 'success' };
  };

  const filteredCoupons = coupons.filter(coupon => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      coupon.code.toLowerCase().includes(search) ||
      coupon.name.toLowerCase().includes(search) ||
      coupon.name_ar?.toLowerCase().includes(search)
    );
  });

  const t = {
    title: language === 'ar' ? 'إدارة الكوبونات' : 'Coupons Manager',
    description: language === 'ar' ? 'إنشاء وإدارة كوبونات الخصم' : 'Create and manage discount coupons',
    search: language === 'ar' ? 'بحث عن كوبون...' : 'Search coupons...',
    addCoupon: language === 'ar' ? 'إضافة كوبون' : 'Add Coupon',
    editCoupon: language === 'ar' ? 'تعديل كوبون' : 'Edit Coupon',
    code: language === 'ar' ? 'الكود' : 'Code',
    name: language === 'ar' ? 'الاسم' : 'Name',
    nameAr: language === 'ar' ? 'الاسم بالعربية' : 'Arabic Name',
    couponDescription: language === 'ar' ? 'الوصف' : 'Description',
    discountType: language === 'ar' ? 'نوع الخصم' : 'Discount Type',
    percentage: language === 'ar' ? 'نسبة مئوية' : 'Percentage',
    fixed: language === 'ar' ? 'مبلغ ثابت' : 'Fixed Amount',
    discountValue: language === 'ar' ? 'قيمة الخصم' : 'Discount Value',
    minPurchase: language === 'ar' ? 'الحد الأدنى للشراء' : 'Min Purchase',
    maxDiscount: language === 'ar' ? 'الحد الأقصى للخصم' : 'Max Discount',
    usageLimit: language === 'ar' ? 'حد الاستخدام' : 'Usage Limit',
    usagePerCustomer: language === 'ar' ? 'لكل عميل' : 'Per Customer',
    startDate: language === 'ar' ? 'تاريخ البداية' : 'Start Date',
    endDate: language === 'ar' ? 'تاريخ النهاية' : 'End Date',
    active: language === 'ar' ? 'نشط' : 'Active',
    status: language === 'ar' ? 'الحالة' : 'Status',
    usage: language === 'ar' ? 'الاستخدام' : 'Usage',
    generate: language === 'ar' ? 'توليد' : 'Generate',
    save: language === 'ar' ? 'حفظ' : 'Save',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    delete: language === 'ar' ? 'حذف' : 'Delete',
    noCoupons: language === 'ar' ? 'لا توجد كوبونات' : 'No coupons found',
  };

  const CouponForm = () => (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.code}</Label>
          <div className="flex gap-2">
            <Input
              value={formData.code}
              onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
              placeholder="SAVE20"
              className="font-mono"
            />
            <Button type="button" variant="outline" onClick={generateCode}>
              {t.generate}
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t.discountType}</Label>
          <Select 
            value={formData.discount_type} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, discount_type: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">{t.percentage}</SelectItem>
              <SelectItem value="fixed">{t.fixed}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.name}</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Summer Sale"
          />
        </div>
        <div className="space-y-2">
          <Label>{t.nameAr}</Label>
          <Input
            value={formData.name_ar}
            onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
            placeholder="تخفيضات الصيف"
            dir="rtl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t.couponDescription}</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder={language === 'ar' ? 'وصف الكوبون...' : 'Coupon description...'}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>{t.discountValue}</Label>
          <div className="relative">
            <Input
              type="number"
              value={formData.discount_value}
              onChange={(e) => setFormData(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
              className="pe-8"
            />
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {formData.discount_type === 'percentage' ? '%' : ''}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <Label>{t.minPurchase}</Label>
          <Input
            type="number"
            value={formData.min_purchase_amount}
            onChange={(e) => setFormData(prev => ({ ...prev, min_purchase_amount: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t.maxDiscount}</Label>
          <Input
            type="number"
            value={formData.max_discount_amount}
            onChange={(e) => setFormData(prev => ({ ...prev, max_discount_amount: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.usageLimit}</Label>
          <Input
            type="number"
            value={formData.usage_limit}
            onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: Number(e.target.value) }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t.usagePerCustomer}</Label>
          <Input
            type="number"
            value={formData.usage_per_customer}
            onChange={(e) => setFormData(prev => ({ ...prev, usage_per_customer: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t.startDate}</Label>
          <Input
            type="date"
            value={formData.start_date}
            onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t.endDate}</Label>
          <Input
            type="date"
            value={formData.end_date}
            onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
        />
        <Label>{t.active}</Label>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Ticket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </div>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus size={16} />
                {t.addCoupon}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t.addCoupon}</DialogTitle>
              </DialogHeader>
              <CouponForm />
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  {t.cancel}
                </Button>
                <Button onClick={() => createMutation.mutate(formData)}>
                  {t.save}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t.search}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9"
          />
        </div>

        {/* Coupons Table */}
        <ScrollArea className="h-[500px] border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead>{t.code}</TableHead>
                <TableHead>{t.name}</TableHead>
                <TableHead className="text-center">{t.discountValue}</TableHead>
                <TableHead className="text-center">{t.usage}</TableHead>
                <TableHead className="text-center">{t.status}</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {t.noCoupons}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCoupons.map((coupon) => {
                  const status = getCouponStatus(coupon);
                  return (
                    <TableRow key={coupon.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                            {coupon.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={() => copyCode(coupon.code)}
                          >
                            <Copy size={12} />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {language === 'ar' && coupon.name_ar ? coupon.name_ar : coupon.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(coupon.start_date), 'MMM d')} - {format(new Date(coupon.end_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="gap-1">
                          {coupon.discount_type === 'percentage' ? (
                            <>
                              <Percent size={12} />
                              {coupon.discount_value}%
                            </>
                          ) : (
                            <>
                              <DollarSign size={12} />
                              {coupon.discount_value}
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <BarChart3 size={14} className="text-muted-foreground" />
                          <span>{coupon.usage_count}</span>
                          {coupon.usage_limit && (
                            <span className="text-muted-foreground">/ {coupon.usage_limit}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={status.color as any}>
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Switch
                            checked={coupon.is_active}
                            onCheckedChange={(checked) => 
                              toggleActiveMutation.mutate({ id: coupon.id, is_active: checked })
                            }
                          />
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEdit(coupon)}
                              >
                                <Edit size={14} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>{t.editCoupon}</DialogTitle>
                              </DialogHeader>
                              <CouponForm />
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setEditingCoupon(null)}>
                                  {t.cancel}
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  onClick={() => {
                                    deleteMutation.mutate(coupon.id);
                                    setEditingCoupon(null);
                                  }}
                                >
                                  {t.delete}
                                </Button>
                                <Button onClick={() => updateMutation.mutate({ id: coupon.id, data: formData })}>
                                  {t.save}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CouponsManager;
