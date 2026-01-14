import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Trash2, 
  AlertTriangle,
  Package,
  ShoppingCart,
  ShoppingBag,
  Users,
  Truck,
  ArrowRightLeft,
  Receipt,
  Database,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface DeleteOption {
  id: string;
  icon: React.ElementType;
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  severity: 'warning' | 'danger' | 'critical';
  tables: string[];
}

const DataManagement = () => {
  const { language, direction } = useLanguage();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<DeleteOption | null>(null);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string; errors?: string[] } | null>(null);

  const deleteOptions: DeleteOption[] = [
    {
      id: 'products',
      icon: Package,
      label: 'Products & Variants',
      labelAr: 'الأصناف والمتغيرات',
      description: 'Delete all products, variants, and related data',
      descriptionAr: 'حذف جميع الأصناف والمتغيرات والبيانات المرتبطة',
      severity: 'danger',
      tables: ['products', 'product_variants', 'promotion_products']
    },
    {
      id: 'sales',
      icon: ShoppingCart,
      label: 'Sales Data',
      labelAr: 'بيانات المبيعات',
      description: 'Delete all sales, invoices, and returns',
      descriptionAr: 'حذف جميع المبيعات والفواتير والمرتجعات',
      severity: 'danger',
      tables: ['sales', 'sale_items', 'sales_invoices', 'sales_invoice_items', 'sales_returns', 'pos_returns']
    },
    {
      id: 'purchases',
      icon: ShoppingBag,
      label: 'Purchases Data',
      labelAr: 'بيانات المشتريات',
      description: 'Delete all purchases, orders, and returns',
      descriptionAr: 'حذف جميع المشتريات والطلبات والمرتجعات',
      severity: 'danger',
      tables: ['purchase_invoices', 'purchase_orders', 'purchase_returns']
    },
    {
      id: 'customers',
      icon: Users,
      label: 'Customers',
      labelAr: 'العملاء',
      description: 'Delete all customer records',
      descriptionAr: 'حذف جميع سجلات العملاء',
      severity: 'warning',
      tables: ['customers']
    },
    {
      id: 'suppliers',
      icon: Truck,
      label: 'Suppliers',
      labelAr: 'الموردين',
      description: 'Delete all supplier records',
      descriptionAr: 'حذف جميع سجلات الموردين',
      severity: 'warning',
      tables: ['suppliers']
    },
    {
      id: 'inventory_movements',
      icon: ArrowRightLeft,
      label: 'Inventory Movements',
      labelAr: 'حركات المخزون',
      description: 'Delete all inventory movements and opening balances',
      descriptionAr: 'حذف جميع حركات المخزون والأرصدة الافتتاحية',
      severity: 'danger',
      tables: ['inventory_movements', 'opening_balances', 'low_stock_alerts']
    },
    {
      id: 'all_transactions',
      icon: Receipt,
      label: 'All Transactions',
      labelAr: 'جميع العمليات',
      description: 'Delete all sales, purchases, movements, and financial transactions',
      descriptionAr: 'حذف جميع المبيعات والمشتريات والحركات والعمليات المالية',
      severity: 'critical',
      tables: ['All transaction tables']
    },
    {
      id: 'all_data',
      icon: Database,
      label: 'All Data',
      labelAr: 'جميع البيانات',
      description: 'Delete ALL data except users, roles, and company settings',
      descriptionAr: 'حذف جميع البيانات ما عدا المستخدمين والأدوار وإعدادات الشركة',
      severity: 'critical',
      tables: ['All tables except users and settings']
    }
  ];

  const translations = {
    en: {
      title: 'Data Management',
      subtitle: 'Manage and delete system data (Admin only)',
      warning: 'Warning',
      warningText: 'These actions are irreversible. Please make sure you have a backup before proceeding.',
      deleteData: 'Delete Data',
      confirmDelete: 'Confirm Delete',
      cancel: 'Cancel',
      enterPassword: 'Enter your password to confirm:',
      password: 'Password',
      deleting: 'Deleting...',
      deleteSuccess: 'Data deleted successfully',
      deleteError: 'Error deleting data',
      adminOnly: 'Admin Only',
      affectedTables: 'Affected Tables',
      dangerZone: 'Danger Zone',
      permanentAction: 'This action is permanent and cannot be undone!',
      passwordRequired: 'Your admin password is required',
      deleteComplete: 'Delete Complete',
      someErrors: 'Some errors occurred'
    },
    ar: {
      title: 'إدارة البيانات',
      subtitle: 'إدارة وحذف بيانات النظام (مدير النظام فقط)',
      warning: 'تحذير',
      warningText: 'هذه العمليات غير قابلة للتراجع. تأكد من وجود نسخة احتياطية قبل المتابعة.',
      deleteData: 'حذف البيانات',
      confirmDelete: 'تأكيد الحذف',
      cancel: 'إلغاء',
      enterPassword: 'أدخل كلمة المرور للتأكيد:',
      password: 'كلمة المرور',
      deleting: 'جاري الحذف...',
      deleteSuccess: 'تم حذف البيانات بنجاح',
      deleteError: 'خطأ في حذف البيانات',
      adminOnly: 'مدير النظام فقط',
      affectedTables: 'الجداول المتأثرة',
      dangerZone: 'منطقة الخطر',
      permanentAction: 'هذا الإجراء دائم ولا يمكن التراجع عنه!',
      passwordRequired: 'كلمة مرور المدير مطلوبة',
      deleteComplete: 'اكتمل الحذف',
      someErrors: 'حدثت بعض الأخطاء'
    }
  };

  const t = translations[language];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'warning': return 'bg-warning/10 text-warning border-warning/30';
      case 'danger': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'warning': return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">{language === 'ar' ? 'تحذير' : 'Warning'}</Badge>;
      case 'danger': return <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/30">{language === 'ar' ? 'خطر' : 'Danger'}</Badge>;
      case 'critical': return <Badge variant="destructive">{language === 'ar' ? 'حرج' : 'Critical'}</Badge>;
      default: return null;
    }
  };

  const openDeleteDialog = (option: DeleteOption) => {
    setSelectedOption(option);
    setConfirmationInput('');
    setDeleteResult(null);
    setIsDeleteDialogOpen(true);
  };

  const getExpectedCode = () => {
    if (!selectedOption) return '';
    return `DELETE-${selectedOption.id.toUpperCase()}`;
  };

  const handleDelete = async () => {
    if (!selectedOption) return;
    
    // Validate password is entered
    if (!confirmationInput.trim()) {
      toast({ 
        title: language === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter your password', 
        variant: 'destructive' 
      });
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      // First verify the admin's password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error(language === 'ar' ? 'لم يتم العثور على المستخدم' : 'User not found');
      }

      // Re-authenticate with password to verify it's correct
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: confirmationInput
      });

      if (authError) {
        throw new Error(language === 'ar' ? 'كلمة المرور غير صحيحة' : 'Invalid password');
      }

      // Password verified, proceed with deletion
      const expectedCode = getExpectedCode();
      const { data, error } = await supabase.functions.invoke('delete-system-data', {
        body: { 
          deleteType: selectedOption.id, 
          confirmationCode: expectedCode 
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDeleteResult({
        success: true,
        message: t.deleteSuccess,
        errors: data?.errors
      });

      toast({ title: t.deleteSuccess });
    } catch (error: any) {
      console.error('Delete error:', error);
      setDeleteResult({
        success: false,
        message: error.message || t.deleteError
      });
      toast({ title: error.message || t.deleteError, variant: 'destructive' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <Card className="card-elevated border-0 bg-gradient-to-br from-destructive/5 to-destructive/0">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-destructive/10">
              <Trash2 className="text-destructive" size={28} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{t.title}</h1>
                <Badge className="bg-primary/10 text-primary border-primary/30">
                  <Shield size={12} className="me-1" />
                  {t.adminOnly}
                </Badge>
              </div>
              <p className="text-muted-foreground">{t.subtitle}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      <Alert variant="destructive" className="border-destructive/50 bg-destructive/5">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{t.warning}</AlertTitle>
        <AlertDescription>
          {t.warningText}
        </AlertDescription>
      </Alert>

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <AlertTriangle size={20} />
            {t.dangerZone}
          </CardTitle>
          <CardDescription>{t.permanentAction}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {deleteOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Card key={option.id} className={`border ${getSeverityColor(option.severity)} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${getSeverityColor(option.severity)}`}>
                        <Icon size={20} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold">{language === 'ar' ? option.labelAr : option.label}</h3>
                          {getSeverityBadge(option.severity)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {language === 'ar' ? option.descriptionAr : option.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {option.tables.slice(0, 3).map((table, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {table}
                            </Badge>
                          ))}
                          {option.tables.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{option.tables.length - 3}
                            </Badge>
                          )}
                        </div>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full"
                          onClick={() => openDeleteDialog(option)}
                        >
                          <Trash2 size={14} className="me-2" />
                          {t.deleteData}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle size={20} />
              {t.confirmDelete}
            </DialogTitle>
            <DialogDescription>
              {selectedOption && (language === 'ar' ? selectedOption.descriptionAr : selectedOption.description)}
            </DialogDescription>
          </DialogHeader>

          {!deleteResult ? (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {t.permanentAction}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>{t.enterPassword}</Label>
                <p className="text-sm text-muted-foreground">{t.passwordRequired}</p>
              </div>

              <div className="space-y-2">
                <Label>{t.password}</Label>
                <Input
                  type="password"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder="••••••••"
                  dir="ltr"
                />
              </div>
            </div>
          ) : (
            <div className="py-6">
              <div className={`flex flex-col items-center gap-4 ${deleteResult.success ? 'text-accent' : 'text-destructive'}`}>
                {deleteResult.success ? (
                  <CheckCircle2 size={48} />
                ) : (
                  <XCircle size={48} />
                )}
                <p className="font-semibold text-lg">{deleteResult.success ? t.deleteComplete : t.deleteError}</p>
                <p className="text-sm text-muted-foreground text-center">{deleteResult.message}</p>
                {deleteResult.errors && deleteResult.errors.length > 0 && (
                  <div className="w-full mt-2">
                    <p className="text-sm font-medium mb-2">{t.someErrors}:</p>
                    <div className="max-h-32 overflow-y-auto text-xs bg-muted p-2 rounded">
                      {deleteResult.errors.map((err, i) => (
                        <div key={i} className="text-destructive">{err}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {!deleteResult ? (
              <>
                <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
                  {t.cancel}
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDelete}
                  disabled={!confirmationInput.trim() || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 size={14} className="me-2 animate-spin" />
                      {t.deleting}
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} className="me-2" />
                      {t.confirmDelete}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsDeleteDialogOpen(false)}>
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataManagement;