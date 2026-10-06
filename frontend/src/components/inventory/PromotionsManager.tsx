import React, { useState, useEffect } from 'react';
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
import { toast } from '@/hooks/use-toast';
import { format, isAfter, isBefore, parseISO } from 'date-fns';
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
  Warehouse,
  Filter,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

interface PromotionProduct {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  price: number | string;
  image_url?: string | null;
  image?: any;
  active?: boolean;
}

interface Promotion {
  id: number;
  name: string;
  name_ar: string | null;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: string | number;
  min_quantity: number;
  min_usage: number | null; // ✅ في API اسمه min_usage مش max_uses
  start_date: string;
  start_time: string;
  end_date: string;
  end_time: string;
  active: boolean | null; // ✅ ممكن يكون null
  products: PromotionProduct[]; // ✅ المنتجات جوا products مش product_ids
  created_at: string;
  updated_at: string;
}

interface APIProduct {
  id: number;
  name: string;
  name_ar?: string;
  sku: string;
  price: number | string;
  sell_price?: number | string;
  cost_price?: number | string;
  stock?: number;
  image_url?: string | null;
  image?: any;
  active?: boolean;
}

const PromotionsManager = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'scheduled' | 'expired' | 'inactive'>('all');

  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: 0,
    start_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '00:00',
    end_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end_time: '23:59',
    active: true,
    min_quantity: 1,
    min_usage: null as number | null, // ✅ تغيير الاسم
  });

  // ✅ ترجمة النصوص
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
    filterByStatus: language === 'ar' ? 'تصفية حسب الحالة' : 'Filter by Status',
    clearFilters: language === 'ar' ? 'مسح الفلاتر' : 'Clear Filters',
  };

  // ✅ جلب العروض من API مع الفلاتر
  const { data: promotions = [], isLoading, refetch } = useQuery({
    queryKey: ['promotions', filterStatus],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 1000,
          paginate: false
        };

        // ✅ إضافة فلترة حسب الحالة
        if (filterStatus !== 'all') {
          if (!payload.filters) payload.filters = {};
          
          const now = new Date();
          const today = format(now, 'yyyy-MM-dd');
          const currentTime = format(now, 'HH:mm:ss');

          switch (filterStatus) {
            case 'active':
              payload.filters.active = true;
              break;
            case 'inactive':
              payload.filters.active = false;
              break;
            case 'scheduled':
              payload.filters.start_date = { $gt: today };
              break;
            case 'expired':
              payload.filters.end_date = { $lt: today };
              break;
          }
        }

        console.log('📦 Fetching promotions with payload:', payload);

        const response = await api.post('/offer/index', payload);
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching promotions:', error);
        toast({
          title: language === 'ar' ? 'خطأ في جلب العروض' : 'Error fetching promotions',
          variant: 'destructive'
        });
        return [];
      }
    }
  });

  // ✅ جلب المنتجات
  const { data: products = [] } = useQuery({
    queryKey: ['products-for-promotions'],
    queryFn: async () => {
      try {
        const response = await api.post('/product/index', {
          filters: { active: true },
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 1000,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching products:', error);
        return [];
      }
    }
  });

  // ✅ تحويل المنتجات لصيغة بسيطة
  const simpleProducts = React.useMemo(() => {
    return products.map((p: APIProduct) => ({
      id: p.id,
      name: p.name,
      name_ar: p.name_ar || p.name,
      sku: p.sku,
      price: Number(p.sell_price || p.price || 0),
      image_url: p.image_url || p.image?.fullUrl || null,
      active: p.active
    })).filter(p => p.active !== false);
  }, [products]);

  // ✅ إنشاء عرض جديد
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData & { products: number[] }) => {
      const requestData = {
        name: data.name,
        name_ar: data.name_ar || null,
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_quantity: data.min_quantity,
        min_usage: data.min_usage, // ✅ استخدام min_usage
        start_date: data.start_date,
        start_time: data.start_time,
        end_date: data.end_date,
        end_time: data.end_time,
        active: data.active,
        product_ids: data.products,
      };

      console.log('📤 Creating promotion:', requestData);

      const response = await api.post('/offer', requestData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({ 
        title: language === 'ar' ? 'تم إنشاء العرض بنجاح' : 'Promotion created successfully',
        variant: 'default'
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Error creating promotion:', error);
      toast({ 
        title: language === 'ar' ? 'خطأ في إنشاء العرض' : 'Error creating promotion', 
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive' 
      });
    }
  });

  // ✅ تحديث عرض
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: number; products: number[] }) => {
      const requestData = {
        name: data.name,
        name_ar: data.name_ar || null,
        description: data.description || null,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        min_quantity: data.min_quantity,
        min_usage: data.min_usage,
        start_date: data.start_date,
        start_time: data.start_time,
        end_date: data.end_date,
        end_time: data.end_time,
        active: data.active,
        product_ids: data.products,
      };

      console.log('📤 Updating promotion:', data.id, requestData);

      const response = await api.put(`/offer/${data.id}`, requestData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({ 
        title: language === 'ar' ? 'تم تحديث العرض بنجاح' : 'Promotion updated successfully',
        variant: 'default'
      });
      resetForm();
      setIsDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Error updating promotion:', error);
      toast({ 
        title: language === 'ar' ? 'خطأ في تحديث العرض' : 'Error updating promotion',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive' 
      });
    }
  });

  // ✅ حذف عرض
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await api.delete(`/offer/delete`, { data: { items: [id] } });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promotions'] });
      toast({ 
        title: language === 'ar' ? 'تم حذف العرض' : 'Promotion deleted',
        variant: 'default'
      });
    },
    onError: (error: any) => {
      console.error('Error deleting promotion:', error);
      toast({ 
        title: language === 'ar' ? 'خطأ في حذف العرض' : 'Error deleting promotion',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive' 
      });
    }
  });

  // ✅ إعادة ضبط النموذج
  const resetForm = () => {
    setFormData({
      name: '',
      name_ar: '',
      description: '',
      discount_type: 'percentage',
      discount_value: 0,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '00:00',
      end_date: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      end_time: '23:59',
      active: true,
      min_quantity: 1,
      min_usage: null,
    });
    setSelectedProducts([]);
    setEditingPromotion(null);
  };

  // ✅ تعديل عرض - المنتجات المختارة بتظهر صح دلوقتي
  const handleEdit = (promotion: Promotion) => {
    // ✅ استخراج معرّفات المنتجات من `promotion.products`
    const productIds = promotion.products?.map(p => p.id) || [];
    
    // ✅ تجهيز التواريخ
    const startDateTime = `${promotion.start_date} ${promotion.start_time}`;
    const endDateTime = `${promotion.end_date} ${promotion.end_time}`;
    const startDate = parseISO(startDateTime);
    const endDate = parseISO(endDateTime);
    
    setEditingPromotion(promotion);
    setFormData({
      name: promotion.name,
      name_ar: promotion.name_ar || '',
      description: promotion.description || '',
      discount_type: promotion.discount_type,
      discount_value: Number(promotion.discount_value),
      start_date: promotion.start_date,
      start_time: promotion.start_time.slice(0, 5), // "00:00:00" -> "00:00"
      end_date: promotion.end_date,
      end_time: promotion.end_time.slice(0, 5),
      active: promotion.active ?? false, // ✅ null -> false
      min_quantity: promotion.min_quantity,
      min_usage: promotion.min_usage,
    });
    
    // ✅ تعيين المنتجات المختارة
    setSelectedProducts(productIds);
    setIsDialogOpen(true);
  };

  // ✅ حفظ العرض
  const handleSubmit = () => {
    if (!formData.name || !formData.start_date || !formData.end_date || !formData.discount_value) {
      toast({ 
        title: language === 'ar' ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields', 
        variant: 'destructive' 
      });
      return;
    }

    if (selectedProducts.length === 0) {
      toast({ 
        title: language === 'ar' ? 'يرجى اختيار منتج واحد على الأقل' : 'Please select at least one product', 
        variant: 'destructive' 
      });
      return;
    }

    if (editingPromotion) {
      updateMutation.mutate({ ...formData, id: editingPromotion.id, products: selectedProducts });
    } else {
      createMutation.mutate({ ...formData, products: selectedProducts });
    }
  };

  // ✅ إضافة/إزالة منتج
  const toggleProduct = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // ✅ تحديد/إلغاء تحديد الكل
  const toggleAllProducts = () => {
    if (selectedProducts.length === filteredSimpleProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredSimpleProducts.map(p => p.id));
    }
  };

  // ✅ حالة العرض
  const getPromotionStatus = (promotion: Promotion): 'active' | 'scheduled' | 'expired' | 'inactive' => {
    // ✅ إذا كان active = false أو null
    if (promotion.active === false || promotion.active === null) {
      return 'inactive';
    }
    
    const now = new Date();
    const start = parseISO(`${promotion.start_date} ${promotion.start_time}`);
    const end = parseISO(`${promotion.end_date} ${promotion.end_time}`);

    if (isBefore(now, start)) return 'scheduled';
    if (isAfter(now, end)) return 'expired';
    return 'active';
  };

  // ✅ Badge الحالة
  const getStatusBadge = (status: string) => {
    const config = {
      active: { color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200', icon: CheckCircle2, label: t.active },
      scheduled: { color: 'bg-blue-500/10 text-blue-600 border-blue-200', icon: Clock, label: t.scheduled },
      expired: { color: 'bg-gray-500/10 text-gray-600 border-gray-200', icon: XCircle, label: t.expired },
      inactive: { color: 'bg-amber-500/10 text-amber-600 border-amber-200', icon: AlertCircle, label: t.inactive },
    };
    const { color, icon: Icon, label } = config[status as keyof typeof config] || config.inactive;
    return (
      <Badge variant="outline" className={cn("gap-1", color)}>
        <Icon size={12} />
        {label}
      </Badge>
    );
  };

  // ✅ فلترة العروض محلياً
  const filteredPromotions = promotions.filter((promo: Promotion) => {
    const matchesSearch = searchTerm === '' ||
      promo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (promo.name_ar && promo.name_ar.includes(searchTerm));
    
    return matchesSearch;
  });

  // ✅ فلترة المنتجات
  const filteredSimpleProducts = simpleProducts.filter(p => 
    productSearchTerm === '' ||
    p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
    (p.name_ar && p.name_ar.includes(productSearchTerm)) ||
    p.sku.toLowerCase().includes(productSearchTerm.toLowerCase())
  );

  // ✅ الإحصائيات
  const stats = {
    total: promotions.length,
    active: promotions.filter((p: Promotion) => getPromotionStatus(p) === 'active').length,
    scheduled: promotions.filter((p: Promotion) => getPromotionStatus(p) === 'scheduled').length,
    expired: promotions.filter((p: Promotion) => getPromotionStatus(p) === 'expired').length,
    inactive: promotions.filter((p: Promotion) => getPromotionStatus(p) === 'inactive').length,
  };

  // ✅ عدد المنتجات في العرض
  const getProductCount = (promotion: Promotion) => {
    return promotion.products?.length || 0;
  };

  // ✅ سعر المنتج
  const getProductPrice = (product: PromotionProduct): number => {
    return Number(product.sell_price || product.price || 0);
  };

  return (
    <div className="space-y-6">
      {/* ✅ Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactive}</p>
                <p className="text-xs text-muted-foreground">{t.inactive}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ Filters & Actions */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {t.title}
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={(open) => { 
              setIsDialogOpen(open); 
              if (!open) resetForm(); 
            }}>
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
                  {/* ✅ Basic Info */}
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

                  {/* ✅ Discount Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>{t.discountType} *</Label>
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
                          min="0"
                          step={formData.discount_type === 'percentage' ? "0.01" : "1"}
                        />
                        <span className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {formData.discount_type === 'percentage' ? '%' : '﷼'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>{t.minQuantity} *</Label>
                      <Input 
                        type="number"
                        min={1}
                        value={formData.min_quantity} 
                        onChange={(e) => setFormData({ ...formData, min_quantity: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* ✅ Date & Time */}
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
                      <Label>{t.startTime} *</Label>
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
                      <Label>{t.endTime} *</Label>
                      <Input 
                        type="time"
                        value={formData.end_time} 
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* ✅ Options */}
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={formData.active}
                        onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                      />
                      <Label>{t.isActive}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label>{t.maxUses}:</Label>
                      <Input 
                        type="number"
                        className="w-24"
                        placeholder={t.unlimited}
                        value={formData.min_usage || ''} 
                        onChange={(e) => setFormData({ ...formData, min_usage: e.target.value ? Number(e.target.value) : null })}
                        min="0"
                      />
                    </div>
                  </div>

                  {/* ✅ Product Selection - مع أزرار تحديد الكل */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Package size={16} />
                        {t.selectProducts} *
                        <Badge variant="secondary">{selectedProducts.length} {t.product}</Badge>
                      </Label>
                      {filteredSimpleProducts.length > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={toggleAllProducts}
                          className="text-xs"
                        >
                          {selectedProducts.length === filteredSimpleProducts.length 
                            ? (language === 'ar' ? 'إلغاء الكل' : 'Deselect All')
                            : (language === 'ar' ? 'تحديد الكل' : 'Select All')
                          }
                        </Button>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        placeholder={t.searchProducts}
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="ps-10"
                      />
                    </div>
                    <ScrollArea className="h-[250px] border rounded-lg p-2">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {filteredSimpleProducts.map(product => (
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
                              <img 
                                src={product.image_url} 
                                alt="" 
                                className="w-10 h-10 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {language === 'ar' ? product.name_ar || product.name : product.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {product.sku} - {product.price.toLocaleString()} ﷼
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* ✅ Actions */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => { setIsDialogOpen(false); resetForm(); }}>
                      {t.cancel}
                    </Button>
                    <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
                      {createMutation.isPending || updateMutation.isPending 
                        ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...')
                        : t.save}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* ✅ Filters Bar */}
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
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-muted-foreground" />
              <Select value={filterStatus} onValueChange={(val: any) => setFilterStatus(val)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t.filterByStatus} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t.all}</SelectItem>
                  <SelectItem value="active">{t.active}</SelectItem>
                  <SelectItem value="inactive">{t.inactive}</SelectItem>
                  <SelectItem value="scheduled">{t.scheduled}</SelectItem>
                  <SelectItem value="expired">{t.expired}</SelectItem>
                </SelectContent>
              </Select>
              {filterStatus !== 'all' && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setFilterStatus('all')}
                  className="h-9 w-9"
                >
                  <X size={16} />
                </Button>
              )}
            </div>
          </div>

          {/* ✅ Promotions Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
            </div>
          ) : filteredPromotions.length === 0 ? (
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
                  {filteredPromotions.map((promo: Promotion) => {
                    const productCount = getProductCount(promo);
                    const status = getPromotionStatus(promo);
                    
                    return (
                      <TableRow key={promo.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {language === 'ar' ? promo.name_ar || promo.name : promo.name}
                            </p>
                            {promo.description && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {promo.description}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {promo.discount_type === 'percentage' ? <Percent size={12} /> : <DollarSign size={12} />}
                            {Number(promo.discount_value).toLocaleString()}
                            {promo.discount_type === 'percentage' ? '%' : ' ﷼'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{format(parseISO(`${promo.start_date} ${promo.start_time}`), 'dd/MM/yyyy HH:mm')}</p>
                            <p className="text-muted-foreground">
                              {format(parseISO(`${promo.end_date} ${promo.end_time}`), 'dd/MM/yyyy HH:mm')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {productCount} {productCount === 1 ? t.product : t.products}
                          </Badge>
                          {productCount > 0 && (
                            <div className="mt-1 space-y-1">
                              {promo.products?.slice(0, 2).map((p, idx) => (
                                <div key={p.id} className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                                  • {language === 'ar' ? p.name_ar || p.name : p.name}
                                </div>
                              ))}
                              {productCount > 2 && (
                                <div className="text-[10px] text-muted-foreground">
                                  +{productCount - 2} {t.products}
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {promo.min_usage 
                            ? `${promo.current_uses || 0}/${promo.min_usage}`
                            : promo.current_uses || 0
                          }
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => handleEdit(promo)}
                              disabled={deleteMutation.isPending}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive"
                              onClick={() => deleteMutation.mutate(promo.id)}
                              disabled={deleteMutation.isPending}
                            >
                              {deleteMutation.isPending ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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