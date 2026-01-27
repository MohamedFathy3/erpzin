import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format, isAfter, isBefore, isWithinInterval, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Tag, 
  Calendar,
  Percent,
  DollarSign,
  Search,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Gift,
  Building2,
  Warehouse
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Promotion {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  min_quantity: number;
  max_uses: number | null;
  current_uses: number;
  branch_id: string | null;
  created_at: string;
}

interface PromotionProduct {
  id: string;
  promotion_id: string;
  product_id: string;
  product_variant_id: string | null;
  special_discount_value: number | null;
  products?: {
    id: string;
    name: string;
    name_ar: string | null;
    sku: string;
    price: number;
  };
}

const PromotionsManager = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'scheduled' | 'expired'>('all');

  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    start_date: '',
    start_time: '00:00',
    end_date: '',
    end_time: '23:59',
    is_active: true,
    min_quantity: 1,
    max_uses: null as number | null,
    branch_id: '' as string,
    warehouse_ids: [] as string[],
  });

  const t = {
    title: language === 'ar' ? 'إدارة العروض' : 'Promotions Manager',
    addPromotion: language === 'ar' ? 'إضافة عرض جديد' : 'Add New Promotion',
    editPromotion: language === 'ar' ? 'تعديل العرض' : 'Edit Promotion',
    promotionName: language === 'ar' ? 'اسم العرض' : 'Promotion Name',
    promotionNameAr: language === 'ar' ? 'اسم العرض (بالعربية)' : 'Promotion Name (Arabic)',
    description: language === 'ar' ? 'الوصف' : 'Description',
    discountType: language === 'ar' ? 'نوع الخصم' : 'Discount Type',
    percentage: language === 'ar' ? 'نسبة مئوية' : 'Percentage',
    fixed: language === 'ar' ? 'مبلغ ثابت' : 'Fixed Amount',
    discountValue: language === 'ar' ? 'قيمة الخصم' : 'Discount Value',
    startDate: language === 'ar' ? 'تاريخ البداية' : 'Start Date',
    endDate: language === 'ar' ? 'تاريخ النهاية' : 'End Date',
    startTime: language === 'ar' ? 'وقت البداية' : 'Start Time',
    endTime: language === 'ar' ? 'وقت النهاية' : 'End Time',
    isActive: language === 'ar' ? 'نشط' : 'Active',
    minQuantity: language === 'ar' ? 'الحد الأدنى للكمية' : 'Min Quantity',
    maxUses: language === 'ar' ? 'الحد الأقصى للاستخدام' : 'Max Uses',
    unlimited: language === 'ar' ? 'غير محدود' : 'Unlimited',
    selectProducts: language === 'ar' ? 'اختيار المنتجات' : 'Select Products',
    selectedProducts: language === 'ar' ? 'المنتجات المختارة' : 'Selected Products',
    searchProducts: language === 'ar' ? 'بحث عن منتج...' : 'Search products...',
    save: language === 'ar' ? 'حفظ' : 'Save',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    delete: language === 'ar' ? 'حذف' : 'Delete',
    status: language === 'ar' ? 'الحالة' : 'Status',
    active: language === 'ar' ? 'نشط' : 'Active',
    scheduled: language === 'ar' ? 'مجدول' : 'Scheduled',
    expired: language === 'ar' ? 'منتهي' : 'Expired',
    inactive: language === 'ar' ? 'غير نشط' : 'Inactive',
    products: language === 'ar' ? 'المنتجات' : 'Products',
    uses: language === 'ar' ? 'الاستخدامات' : 'Uses',
    duration: language === 'ar' ? 'المدة' : 'Duration',
    discount: language === 'ar' ? 'الخصم' : 'Discount',
    noPromotions: language === 'ar' ? 'لا توجد عروض' : 'No promotions found',
    all: language === 'ar' ? 'الكل' : 'All',
    searchPromotions: language === 'ar' ? 'بحث في العروض...' : 'Search promotions...',
    totalPromotions: language === 'ar' ? 'إجمالي العروض' : 'Total Promotions',
    activePromotions: language === 'ar' ? 'العروض النشطة' : 'Active Promotions',
    scheduledPromotions: language === 'ar' ? 'العروض المجدولة' : 'Scheduled',
    expiredPromotions: language === 'ar' ? 'العروض المنتهية' : 'Expired',
    product: language === 'ar' ? 'منتج' : 'product',
  };

  // Fetch promotions
  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Promotion[];
    }
  });

  // Fetch promotion products
  const { data: promotionProducts = [] } = useQuery({
    queryKey: ['promotion-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotion_products')
        .select('*, products(id, name, name_ar, sku, price)');
      if (error) throw error;
      return data as PromotionProduct[];
    }
  });

  // Fetch products for selection
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, name_ar, sku, price, image_url')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch branches for selection
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-for-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, name_ar')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch warehouses for selection
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses-for-promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('id, name, name_ar')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data;
    }
  });

  // Create promotion mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { products: string[] }) => {
      const startDateTime = `${data.start_date}T${data.start_time}:00`;
      const endDateTime = `${data.end_date}T${data.end_time}:00`;

      const { data: promotion, error: promotionError } = await supabase
        .from('promotions')
        .insert({
          name: data.name,
          name_ar: data.name_ar || null,
          description: data.description || null,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          start_date: startDateTime,
          end_date: endDateTime,
          is_active: data.is_active,
          min_quantity: data.min_quantity,
          max_uses: data.max_uses,
        })
        .select()
        .single();

      if (promotionError) throw promotionError;

      // Add products to promotion
      if (data.products.length > 0) {
        const productInserts = data.products.map(productId => ({
          promotion_id: promotion.id,
          product_id: productId,
        }));

        const { error: productsError } = await supabase
          .from('promotion_products')
          .insert(productInserts);

        if (productsError) throw productsError;
      }

      return promotion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotion-products'] });
      toast({ title: language === 'ar' ? 'تم إنشاء العرض بنجاح' : 'Promotion created successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في إنشاء العرض' : 'Error creating promotion', variant: 'destructive' });
    }
  });

  // Update promotion mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string; products: string[] }) => {
      const startDateTime = `${data.start_date}T${data.start_time}:00`;
      const endDateTime = `${data.end_date}T${data.end_time}:00`;

      const { error: promotionError } = await supabase
        .from('promotions')
        .update({
          name: data.name,
          name_ar: data.name_ar || null,
          description: data.description || null,
          discount_type: data.discount_type,
          discount_value: data.discount_value,
          start_date: startDateTime,
          end_date: endDateTime,
          is_active: data.is_active,
          min_quantity: data.min_quantity,
          max_uses: data.max_uses,
        })
        .eq('id', data.id);

      if (promotionError) throw promotionError;

      // Delete existing products and add new ones
      await supabase.from('promotion_products').delete().eq('promotion_id', data.id);

      if (data.products.length > 0) {
        const productInserts = data.products.map(productId => ({
          promotion_id: data.id,
          product_id: productId,
        }));

        const { error: productsError } = await supabase
          .from('promotion_products')
          .insert(productInserts);

        if (productsError) throw productsError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotion-products'] });
      toast({ title: language === 'ar' ? 'تم تحديث العرض بنجاح' : 'Promotion updated successfully' });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في تحديث العرض' : 'Error updating promotion', variant: 'destructive' });
    }
  });

  // Delete promotion mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('promotions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      queryClient.invalidateQueries({ queryKey: ['promotion-products'] });
      toast({ title: language === 'ar' ? 'تم حذف العرض' : 'Promotion deleted' });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في حذف العرض' : 'Error deleting promotion', variant: 'destructive' });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      name_ar: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      start_date: '',
      start_time: '00:00',
      end_date: '',
      end_time: '23:59',
      is_active: true,
      min_quantity: 1,
      max_uses: null,
      branch_id: '',
      warehouse_ids: [],
    });
    setSelectedProducts([]);
    setEditingPromotion(null);
  };

  const handleEdit = (promotion: Promotion) => {
    const startDate = new Date(promotion.start_date);
    const endDate = new Date(promotion.end_date);
    
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      name_ar: promotion.name_ar || '',
      description: promotion.description || '',
      discount_type: promotion.discount_type,
      discount_value: promotion.discount_value,
      start_date: format(startDate, 'yyyy-MM-dd'),
      start_time: format(startDate, 'HH:mm'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      end_time: format(endDate, 'HH:mm'),
      is_active: promotion.is_active,
      min_quantity: promotion.min_quantity,
      max_uses: promotion.max_uses,
      branch_id: promotion.branch_id || '',
      warehouse_ids: [],
    });
    
    // Get selected products for this promotion
    const promoProducts = promotionProducts
      .filter(pp => pp.promotion_id === promotion.id)
      .map(pp => pp.product_id);
    setSelectedProducts(promoProducts);
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast({ title: language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', variant: 'destructive' });
      return;
    }

    if (editingPromotion) {
      updateMutation.mutate({ ...formData, id: editingPromotion.id, products: selectedProducts });
    } else {
      createMutation.mutate({ ...formData, products: selectedProducts });
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const getPromotionStatus = (promotion: Promotion): 'active' | 'scheduled' | 'expired' | 'inactive' => {
    if (!promotion.is_active) return 'inactive';
    
    const now = new Date();
    const start = new Date(promotion.start_date);
    const end = new Date(promotion.end_date);

    if (isBefore(now, start)) return 'scheduled';
    if (isAfter(now, end)) return 'expired';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: CheckCircle2 },
      scheduled: { color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: Clock },
      expired: { color: 'bg-gray-500/10 text-gray-600 border-gray-200', icon: XCircle },
      inactive: { color: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: AlertCircle },
    };
    const { color, icon: Icon } = config[status as keyof typeof config] || config.inactive;
    return (
      <Badge variant="outline" className={cn("gap-1", color)}>
        <Icon size={12} />
        {t[status as keyof typeof t] || status}
      </Badge>
    );
  };

  const filteredPromotions = promotions.filter(promo => {
    const matchesSearch = promo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (promo.name_ar && promo.name_ar.includes(searchTerm));
    
    if (filterStatus === 'all') return matchesSearch;
    return matchesSearch && getPromotionStatus(promo) === filterStatus;
  });

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (p.name_ar && p.name_ar.includes(productSearchTerm)) ||
    p.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  const stats = {
    total: promotions.length,
    active: promotions.filter(p => getPromotionStatus(p) === 'active').length,
    scheduled: promotions.filter(p => getPromotionStatus(p) === 'scheduled').length,
    expired: promotions.filter(p => getPromotionStatus(p) === 'expired').length,
  };

  const getProductCount = (promotionId: string) => {
    return promotionProducts.filter(pp => pp.promotion_id === promotionId).length;
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Gift className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">{t.totalPromotions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">{t.activePromotions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
                <p className="text-xs text-muted-foreground">{t.scheduledPromotions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-gray-500/10 to-gray-500/5 border-gray-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-500/20">
                <XCircle className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-xs text-muted-foreground">{t.expiredPromotions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {t.title}
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus size={16} />
                  {t.addPromotion}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPromotion ? t.editPromotion : t.addPromotion}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.promotionName} *</Label>
                      <Input 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder={language === 'ar' ? 'عرض الصيف' : 'Summer Sale'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.promotionNameAr}</Label>
                      <Input 
                        value={formData.name_ar} 
                        onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                        dir="rtl"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>{t.description}</Label>
                    <Textarea 
                      value={formData.description} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                    />
                  </div>

                  {/* Discount Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{t.discountType}</Label>
                      <Select 
                        value={formData.discount_type} 
                        onValueChange={(val: 'percentage' | 'fixed') => setFormData({ ...formData, discount_type: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">
                            <span className="flex items-center gap-2">
                              <Percent size={14} />
                              {t.percentage}
                            </span>
                          </SelectItem>
                          <SelectItem value="fixed">
                            <span className="flex items-center gap-2">
                              <DollarSign size={14} />
                              {t.fixed}
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.discountValue} *</Label>
                      <div className="relative">
                        <Input 
                          type="number"
                          value={formData.discount_value} 
                          onChange={(e) => setFormData({ ...formData, discount_value: Number(e.target.value) })}
                          className="pe-8"
                        />
                        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {formData.discount_type === 'percentage' ? '%' : '﷼'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.minQuantity}</Label>
                      <Input 
                        type="number"
                        min={1}
                        value={formData.min_quantity} 
                        onChange={(e) => setFormData({ ...formData, min_quantity: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Date & Time */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label>{t.startDate} *</Label>
                      <Input 
                        type="date"
                        value={formData.start_date} 
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.startTime}</Label>
                      <Input 
                        type="time"
                        value={formData.start_time} 
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.endDate} *</Label>
                      <Input 
                        type="date"
                        value={formData.end_date} 
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.endTime}</Label>
                      <Input 
                        type="time"
                        value={formData.end_time} 
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Branch & Warehouse Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg border border-border">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Building2 size={16} className="text-primary" />
                        {language === 'ar' ? 'الفرع' : 'Branch'}
                      </Label>
                      <Select 
                        value={formData.branch_id || 'all'} 
                        onValueChange={(val) => setFormData({ ...formData, branch_id: val === 'all' ? '' : val })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={language === 'ar' ? 'جميع الفروع' : 'All Branches'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">
                            {language === 'ar' ? 'جميع الفروع' : 'All Branches'}
                          </SelectItem>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {language === 'ar' ? branch.name_ar || branch.name : branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Warehouse size={16} className="text-primary" />
                        {language === 'ar' ? 'المخازن' : 'Warehouses'}
                      </Label>
                      <div className="space-y-2 max-h-28 overflow-y-auto p-2 bg-background rounded-md border">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="all-warehouses-promo"
                            checked={formData.warehouse_ids.length === 0}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData({ ...formData, warehouse_ids: [] });
                              }
                            }}
                          />
                          <label htmlFor="all-warehouses-promo" className="text-sm cursor-pointer">
                            {language === 'ar' ? 'جميع المخازن' : 'All Warehouses'}
                          </label>
                        </div>
                        {warehouses.map((warehouse) => (
                          <div key={warehouse.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`warehouse-promo-${warehouse.id}`}
                              checked={formData.warehouse_ids.includes(warehouse.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormData({ ...formData, warehouse_ids: [...formData.warehouse_ids, warehouse.id] });
                                } else {
                                  setFormData({ ...formData, warehouse_ids: formData.warehouse_ids.filter(id => id !== warehouse.id) });
                                }
                              }}
                            />
                            <label htmlFor={`warehouse-promo-${warehouse.id}`} className="text-sm cursor-pointer">
                              {language === 'ar' ? warehouse.name_ar || warehouse.name : warehouse.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label>{t.isActive}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>{t.maxUses}:</Label>
                      <Input 
                        type="number"
                        className="w-24"
                        placeholder={t.unlimited}
                        value={formData.max_uses || ''} 
                        onChange={(e) => setFormData({ ...formData, max_uses: e.target.value ? Number(e.target.value) : null })}
                      />
                    </div>
                  </div>

                  {/* Product Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Package size={16} />
                      {t.selectProducts}
                      <Badge variant="secondary">{selectedProducts.length} {t.product}</Badge>
                    </Label>
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder={t.searchProducts}
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="ps-10"
                      />
                    </div>
                    <ScrollArea className="h-[200px] border rounded-lg p-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {filteredProducts.map(product => (
                          <div 
                            key={product.id}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50",
                              selectedProducts.includes(product.id) && "bg-primary/10 border-primary"
                            )}
                            onClick={() => toggleProduct(product.id)}
                          >
                            <Checkbox 
                              checked={selectedProducts.includes(product.id)}
                              onCheckedChange={() => toggleProduct(product.id)}
                            />
                            {product.image_url && (
                              <img src={product.image_url} alt="" className="w-10 h-10 object-cover rounded" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{language === 'ar' ? product.name_ar || product.name : product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.sku} - {product.price} ﷼</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                      {t.cancel}
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                      {t.save}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={t.searchPromotions}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.all}</SelectItem>
                <SelectItem value="active">{t.active}</SelectItem>
                <SelectItem value="scheduled">{t.scheduled}</SelectItem>
                <SelectItem value="expired">{t.expired}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Promotions Table */}
          {filteredPromotions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="mx-auto h-12 w-12 mb-4 opacity-20" />
              <p>{t.noPromotions}</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.promotionName}</TableHead>
                    <TableHead>{t.discount}</TableHead>
                    <TableHead>{t.duration}</TableHead>
                    <TableHead>{t.products}</TableHead>
                    <TableHead>{t.uses}</TableHead>
                    <TableHead>{t.status}</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPromotions.map(promo => (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{language === 'ar' ? promo.name_ar || promo.name : promo.name}</p>
                          {promo.description && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{promo.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {promo.discount_type === 'percentage' ? <Percent size={12} /> : <DollarSign size={12} />}
                          {promo.discount_value}{promo.discount_type === 'percentage' ? '%' : ' ﷼'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(promo.start_date), 'dd/MM/yyyy HH:mm')}</p>
                          <p className="text-muted-foreground">{format(new Date(promo.end_date), 'dd/MM/yyyy HH:mm')}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{getProductCount(promo.id)} {t.product}</Badge>
                      </TableCell>
                      <TableCell>
                        {promo.max_uses ? `${promo.current_uses}/${promo.max_uses}` : promo.current_uses}
                      </TableCell>
                      <TableCell>{getStatusBadge(getPromotionStatus(promo))}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(promo)}>
                            <Edit size={16} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => deleteMutation.mutate(promo.id)}
                          >
                            <Trash2 size={16} />
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
    </div>
  );
};

export default PromotionsManager;
