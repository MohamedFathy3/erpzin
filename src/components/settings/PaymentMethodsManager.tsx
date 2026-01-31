import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Wallet, 
  CreditCard, 
  Banknote, 
  Building2, 
  FileText,
  Smartphone,
  GripVertical
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: string;
  is_active: boolean;
  sort_order: number;
  icon: string | null;
}

const PaymentMethodsManager = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    type: 'cash',
    icon: 'Banknote',
    sort_order: 0
  });

  const t = {
    en: {
      title: 'POS Payment Methods',
      description: 'Configure payment methods available at point of sale',
      addMethod: 'Add Method',
      editMethod: 'Edit Method',
      code: 'Code',
      nameEn: 'Name (English)',
      nameAr: 'Name (Arabic)',
      type: 'Type',
      icon: 'Icon',
      sortOrder: 'Order',
      active: 'Active',
      inactive: 'Inactive',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      confirmDelete: 'Are you sure you want to delete this payment method?',
      deleteWarning: 'This action cannot be undone.',
      types: {
        cash: 'Cash',
        card: 'Card / Mada',
        wallet: 'E-Wallet',
        bank: 'Bank Transfer',
        credit: 'On Credit (Deferred)'
      },
      noMethods: 'No payment methods configured',
      defaultMethods: 'Default POS Methods',
      quickSetup: 'Quick Setup',
      setupDefaults: 'Setup Default Methods'
    },
    ar: {
      title: 'طرق الدفع - نقطة البيع',
      description: 'تهيئة طرق الدفع المتاحة في نقطة البيع',
      addMethod: 'إضافة طريقة',
      editMethod: 'تعديل الطريقة',
      code: 'الكود',
      nameEn: 'الاسم (إنجليزي)',
      nameAr: 'الاسم (عربي)',
      type: 'النوع',
      icon: 'الأيقونة',
      sortOrder: 'الترتيب',
      active: 'مفعّل',
      inactive: 'معطّل',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      confirmDelete: 'هل أنت متأكد من حذف طريقة الدفع هذه؟',
      deleteWarning: 'لا يمكن التراجع عن هذا الإجراء.',
      types: {
        cash: 'نقدي',
        card: 'بطاقة / مدى',
        wallet: 'محفظة إلكترونية',
        bank: 'تحويل بنكي',
        credit: 'آجل (لاحقاً)'
      },
      noMethods: 'لا توجد طرق دفع',
      defaultMethods: 'الطرق الافتراضية',
      quickSetup: 'إعداد سريع',
      setupDefaults: 'إضافة الطرق الافتراضية'
    }
  }[language];

  // Fetch payment methods
  const { data: paymentMethods = [], isLoading } = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as PaymentMethod[];
    }
  });

  // Setup default methods mutation
  const setupDefaultsMutation = useMutation({
    mutationFn: async () => {
      const defaults = [
        { code: 'cash', name: 'Cash', name_ar: 'نقدي', type: 'cash', icon: 'Banknote', sort_order: 1, is_active: true },
        { code: 'card', name: 'Card / Mada', name_ar: 'بطاقة / مدى', type: 'card', icon: 'CreditCard', sort_order: 2, is_active: true },
        { code: 'wallet', name: 'E-Wallet', name_ar: 'محفظة إلكترونية', type: 'wallet', icon: 'Smartphone', sort_order: 3, is_active: true },
        { code: 'bank', name: 'Bank Transfer', name_ar: 'تحويل بنكي', type: 'bank', icon: 'Building2', sort_order: 4, is_active: true },
        { code: 'credit', name: 'On Credit', name_ar: 'آجل', type: 'credit', icon: 'FileText', sort_order: 5, is_active: true },
      ];

      for (const method of defaults) {
        // Check if exists
        const { data: existing } = await supabase
          .from('payment_methods')
          .select('id')
          .eq('code', method.code)
          .maybeSingle();

        if (!existing) {
          await supabase.from('payment_methods').insert(method);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({ title: language === 'ar' ? 'تم إضافة الطرق الافتراضية' : 'Default methods added' });
    }
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        code: data.code.toLowerCase().replace(/\s+/g, '_'),
        name: data.name,
        name_ar: data.name_ar,
        type: data.type,
        icon: data.icon,
        sort_order: data.sort_order,
        requires_reference: false,
        supported_currencies: ['YER']
      };

      if (data.id) {
        const { error } = await supabase
          .from('payment_methods')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({ title: language === 'ar' ? 'تم الحفظ بنجاح' : 'Saved successfully' });
      resetForm();
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'حدث خطأ' : 'An error occurred', variant: 'destructive' });
    }
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      toast({ title: language === 'ar' ? 'تم الحذف بنجاح' : 'Deleted successfully' });
    }
  });

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      name_ar: '',
      type: 'cash',
      icon: 'Banknote',
      sort_order: paymentMethods.length + 1
    });
    setEditingMethod(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (method: PaymentMethod) => {
    setEditingMethod(method);
    setFormData({
      code: method.code,
      name: method.name,
      name_ar: method.name_ar,
      type: method.type,
      icon: method.icon || 'Banknote',
      sort_order: method.sort_order
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.code || !formData.name || !formData.name_ar) {
      toast({ 
        title: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields', 
        variant: 'destructive' 
      });
      return;
    }
    saveMutation.mutate({
      ...formData,
      id: editingMethod?.id
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Banknote size={20} className="text-success" />;
      case 'card': return <CreditCard size={20} className="text-blue-500" />;
      case 'wallet': return <Smartphone size={20} className="text-purple-500" />;
      case 'bank': return <Building2 size={20} className="text-amber-500" />;
      case 'credit': return <FileText size={20} className="text-muted-foreground" />;
      default: return <Wallet size={20} />;
    }
  };

  const getTypeLabel = (type: string) => {
    return t.types[type as keyof typeof t.types] || type;
  };

  return (
    <Card className="card-elevated">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard size={20} />
              {t.title}
            </CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {paymentMethods.length === 0 && (
              <Button 
                variant="outline" 
                onClick={() => setupDefaultsMutation.mutate()}
                disabled={setupDefaultsMutation.isPending}
              >
                {t.setupDefaults}
              </Button>
            )}
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (!open) resetForm();
              setIsDialogOpen(open);
            }}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <Plus size={16} className="me-2" />
                  {t.addMethod}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingMethod ? t.editMethod : t.addMethod}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {/* Type Selection - Visual Cards */}
                  <div className="space-y-2">
                    <Label>{t.type}</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(t.types).map(([key, label]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: key })}
                          className={`p-3 rounded-lg border-2 flex flex-col items-center gap-1.5 transition-all ${
                            formData.type === key 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          {getTypeIcon(key)}
                          <span className="text-xs font-medium text-center leading-tight">{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.nameAr} *</Label>
                      <Input
                        value={formData.name_ar}
                        onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                        placeholder="نقدي"
                        dir="rtl"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.nameEn} *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Cash"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.code} *</Label>
                      <Input
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder="cash"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.sortOrder}</Label>
                      <Input
                        type="number"
                        value={formData.sort_order}
                        onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                        min={0}
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">{t.cancel}</Button>
                  </DialogClose>
                  <Button className="gradient-primary" onClick={handleSave} disabled={saveMutation.isPending}>
                    {t.save}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
          </div>
        ) : paymentMethods.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
              <CreditCard size={32} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{t.noMethods}</p>
            <Button 
              variant="outline" 
              onClick={() => setupDefaultsMutation.mutate()}
              disabled={setupDefaultsMutation.isPending}
            >
              {t.setupDefaults}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {paymentMethods.map((method) => (
              <div 
                key={method.id} 
                className={`flex items-center gap-4 p-4 rounded-lg border transition-all ${
                  method.is_active 
                    ? 'bg-card border-border' 
                    : 'bg-muted/50 border-border/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-1 text-muted-foreground">
                  <GripVertical size={16} />
                  <span className="text-xs font-mono w-4">{method.sort_order}</span>
                </div>
                
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                  {getTypeIcon(method.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">
                      {language === 'ar' ? method.name_ar : method.name}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {method.code}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {getTypeLabel(method.type)}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <Switch
                    checked={method.is_active}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: method.id, is_active: checked })}
                  />
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleEdit(method)}
                  >
                    <Edit size={16} />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                        <Trash2 size={16} />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.delete}</AlertDialogTitle>
                        <AlertDialogDescription>{t.deleteWarning}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate(method.id)}
                        >
                          {t.delete}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentMethodsManager;
