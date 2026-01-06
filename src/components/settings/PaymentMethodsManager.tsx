import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
  DollarSign,
  Check
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  type: string;
  supported_currencies: string[];
  requires_reference: boolean;
  reference_label: string | null;
  reference_label_ar: string | null;
  is_active: boolean;
  sort_order: number;
  icon: string | null;
}

const PaymentMethodsManager = () => {
  const { language, direction } = useLanguage();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    name_ar: '',
    type: 'cash',
    supported_currencies: ['YER'],
    requires_reference: false,
    reference_label: '',
    reference_label_ar: '',
    icon: 'Banknote',
    sort_order: 0
  });

  const translations = {
    en: {
      title: 'Payment Methods',
      description: 'Manage available payment methods in the system',
      addMethod: 'Add Payment Method',
      editMethod: 'Edit Payment Method',
      code: 'Code',
      nameEn: 'Name (English)',
      nameAr: 'Name (Arabic)',
      type: 'Type',
      currencies: 'Supported Currencies',
      requiresRef: 'Requires Reference',
      refLabel: 'Reference Label',
      refLabelAr: 'Reference Label (Arabic)',
      icon: 'Icon',
      sortOrder: 'Sort Order',
      active: 'Active',
      inactive: 'Inactive',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      actions: 'Actions',
      types: {
        cash: 'Cash',
        'e-wallet': 'E-Wallet',
        'bank-card': 'Bank Card',
        bank: 'Bank Transfer',
        credit: 'Credit'
      },
      noMethods: 'No payment methods configured'
    },
    ar: {
      title: 'طرق الدفع',
      description: 'إدارة طرق الدفع المتاحة في النظام',
      addMethod: 'إضافة طريقة دفع',
      editMethod: 'تعديل طريقة الدفع',
      code: 'الكود',
      nameEn: 'الاسم (بالإنجليزية)',
      nameAr: 'الاسم (بالعربية)',
      type: 'النوع',
      currencies: 'العملات المدعومة',
      requiresRef: 'يتطلب رقم مرجعي',
      refLabel: 'تسمية المرجع',
      refLabelAr: 'تسمية المرجع (بالعربية)',
      icon: 'الأيقونة',
      sortOrder: 'الترتيب',
      active: 'مفعل',
      inactive: 'غير مفعل',
      save: 'حفظ',
      cancel: 'إلغاء',
      delete: 'حذف',
      actions: 'الإجراءات',
      types: {
        cash: 'نقدي',
        'e-wallet': 'محفظة إلكترونية',
        'bank-card': 'بطاقة بنكية',
        bank: 'تحويل بنكي',
        credit: 'آجل'
      },
      noMethods: 'لا توجد طرق دفع مهيأة'
    }
  };

  const t = translations[language];

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

  // Add/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from('payment_methods')
          .update({
            code: data.code,
            name: data.name,
            name_ar: data.name_ar,
            type: data.type,
            supported_currencies: data.supported_currencies,
            requires_reference: data.requires_reference,
            reference_label: data.reference_label || null,
            reference_label_ar: data.reference_label_ar || null,
            icon: data.icon,
            sort_order: data.sort_order
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('payment_methods')
          .insert({
            code: data.code,
            name: data.name,
            name_ar: data.name_ar,
            type: data.type,
            supported_currencies: data.supported_currencies,
            requires_reference: data.requires_reference,
            reference_label: data.reference_label || null,
            reference_label_ar: data.reference_label_ar || null,
            icon: data.icon,
            sort_order: data.sort_order
          });
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
      supported_currencies: ['YER'],
      requires_reference: false,
      reference_label: '',
      reference_label_ar: '',
      icon: 'Banknote',
      sort_order: 0
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
      supported_currencies: method.supported_currencies || ['YER'],
      requires_reference: method.requires_reference,
      reference_label: method.reference_label || '',
      reference_label_ar: method.reference_label_ar || '',
      icon: method.icon || 'Banknote',
      sort_order: method.sort_order
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      ...formData,
      id: editingMethod?.id
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cash': return <Banknote size={16} className="text-success" />;
      case 'e-wallet': return <Wallet size={16} className="text-primary" />;
      case 'bank-card': return <CreditCard size={16} className="text-warning" />;
      case 'bank': return <Building2 size={16} className="text-info" />;
      case 'credit': return <FileText size={16} className="text-muted-foreground" />;
      default: return <DollarSign size={16} />;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'cash': return 'default';
      case 'e-wallet': return 'secondary';
      case 'bank-card': return 'outline';
      case 'bank': return 'default';
      case 'credit': return 'secondary';
      default: return 'default';
    }
  };

  const currencies = ['YER', 'USD', 'SAR', 'EUR', 'AED'];

  const toggleCurrency = (currency: string) => {
    setFormData(prev => ({
      ...prev,
      supported_currencies: prev.supported_currencies.includes(currency)
        ? prev.supported_currencies.filter(c => c !== currency)
        : [...prev.supported_currencies, currency]
    }));
  };

  return (
    <Card className="card-elevated">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CreditCard size={20} />
              {t.title}
            </CardTitle>
            <CardDescription>{t.description}</CardDescription>
          </div>
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
            <DialogContent className="max-w-lg" dir={direction}>
              <DialogHeader>
                <DialogTitle>
                  {editingMethod ? t.editMethod : t.addMethod}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.code}</Label>
                    <Input
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="CASH_YER"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.type}</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{t.types.cash}</SelectItem>
                        <SelectItem value="e-wallet">{t.types['e-wallet']}</SelectItem>
                        <SelectItem value="bank-card">{t.types['bank-card']}</SelectItem>
                        <SelectItem value="bank">{t.types.bank}</SelectItem>
                        <SelectItem value="credit">{t.types.credit}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.nameEn}</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Cash (YER)"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.nameAr}</Label>
                    <Input
                      value={formData.name_ar}
                      onChange={(e) => setFormData({ ...formData, name_ar: e.target.value })}
                      placeholder="نقدًا - ريال يمني"
                      dir="rtl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t.currencies}</Label>
                  <div className="flex flex-wrap gap-2">
                    {currencies.map(currency => (
                      <Badge
                        key={currency}
                        variant={formData.supported_currencies.includes(currency) ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => toggleCurrency(currency)}
                      >
                        {formData.supported_currencies.includes(currency) && <Check size={12} className="me-1" />}
                        {currency}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <Label>{t.requiresRef}</Label>
                  <Switch
                    checked={formData.requires_reference}
                    onCheckedChange={(checked) => setFormData({ ...formData, requires_reference: checked })}
                  />
                </div>

                {formData.requires_reference && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t.refLabel}</Label>
                      <Input
                        value={formData.reference_label}
                        onChange={(e) => setFormData({ ...formData, reference_label: e.target.value })}
                        placeholder="Transaction Number"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t.refLabelAr}</Label>
                      <Input
                        value={formData.reference_label_ar}
                        onChange={(e) => setFormData({ ...formData, reference_label_ar: e.target.value })}
                        placeholder="رقم العملية"
                        dir="rtl"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.icon}</Label>
                    <Select
                      value={formData.icon}
                      onValueChange={(value) => setFormData({ ...formData, icon: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Banknote">💵 Banknote</SelectItem>
                        <SelectItem value="DollarSign">💲 DollarSign</SelectItem>
                        <SelectItem value="Wallet">👛 Wallet</SelectItem>
                        <SelectItem value="CreditCard">💳 CreditCard</SelectItem>
                        <SelectItem value="Building2">🏦 Building</SelectItem>
                        <SelectItem value="Smartphone">📱 Smartphone</SelectItem>
                        <SelectItem value="FileText">📄 FileText</SelectItem>
                      </SelectContent>
                    </Select>
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

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={resetForm}>
                    {t.cancel}
                  </Button>
                  <Button className="gradient-primary" onClick={handleSave} disabled={saveMutation.isPending}>
                    {t.save}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.code}</TableHead>
                <TableHead>{language === 'ar' ? t.nameAr : t.nameEn}</TableHead>
                <TableHead>{t.type}</TableHead>
                <TableHead>{t.currencies}</TableHead>
                <TableHead>{t.requiresRef}</TableHead>
                <TableHead className="text-center">{t.active}</TableHead>
                <TableHead className="text-center">{t.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                  </TableCell>
                </TableRow>
              ) : paymentMethods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    {t.noMethods}
                  </TableCell>
                </TableRow>
              ) : (
                paymentMethods.map((method) => (
                  <TableRow key={method.id}>
                    <TableCell className="font-mono text-sm">{method.code}</TableCell>
                    <TableCell className="font-medium">
                      {language === 'ar' ? method.name_ar : method.name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadgeVariant(method.type)} className="flex items-center gap-1 w-fit">
                        {getTypeIcon(method.type)}
                        {t.types[method.type as keyof typeof t.types] || method.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {method.supported_currencies?.map(currency => (
                          <Badge key={currency} variant="outline" className="text-xs">
                            {currency}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {method.requires_reference ? (
                        <Badge variant="secondary" className="text-xs">
                          {language === 'ar' ? method.reference_label_ar : method.reference_label}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={method.is_active}
                        onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: method.id, is_active: checked })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(method)}>
                          <Edit size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(method.id)}
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
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentMethodsManager;
