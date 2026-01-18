import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  Trash2, 
  AlertTriangle,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Database
} from 'lucide-react';

const DataManagement = () => {
  const { language, direction } = useLanguage();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string; errors?: string[] } | null>(null);

  const t = {
    title: language === 'ar' ? 'إدارة البيانات' : 'Data Management',
    subtitle: language === 'ar' ? 'حذف جميع بيانات النظام (مدير النظام فقط)' : 'Delete all system data (Admin only)',
    warning: language === 'ar' ? 'تحذير: هذا الإجراء غير قابل للتراجع!' : 'Warning: This action cannot be undone!',
    deleteAllData: language === 'ar' ? 'حذف جميع البيانات' : 'Delete All Data',
    description: language === 'ar' 
      ? 'سيتم حذف جميع البيانات (الأصناف، المبيعات، المشتريات، العملاء، الموردين) ما عدا المستخدمين وإعدادات الشركة'
      : 'This will delete all data (products, sales, purchases, customers, suppliers) except users and company settings',
    confirmDelete: language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    enterPassword: language === 'ar' ? 'أدخل كلمة المرور للتأكيد:' : 'Enter your password to confirm:',
    password: language === 'ar' ? 'كلمة المرور' : 'Password',
    deleting: language === 'ar' ? 'جاري الحذف...' : 'Deleting...',
    deleteSuccess: language === 'ar' ? 'تم حذف البيانات بنجاح' : 'Data deleted successfully',
    deleteError: language === 'ar' ? 'خطأ في حذف البيانات' : 'Error deleting data',
    adminOnly: language === 'ar' ? 'مدير النظام فقط' : 'Admin Only',
    close: language === 'ar' ? 'إغلاق' : 'Close',
  };

  const openDeleteDialog = () => {
    setConfirmationInput('');
    setDeleteResult(null);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error(language === 'ar' ? 'لم يتم العثور على المستخدم' : 'User not found');
      }

      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: confirmationInput
      });

      if (authError) {
        throw new Error(language === 'ar' ? 'كلمة المرور غير صحيحة' : 'Invalid password');
      }

      const { data, error } = await supabase.functions.invoke('delete-system-data', {
        body: { 
          deleteType: 'all_data', 
          confirmationCode: 'DELETE-ALL_DATA' 
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
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-destructive/10">
          <Trash2 className="text-destructive" size={28} />
        </div>
        <div>
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

      {/* Delete All Data Card */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Database size={20} />
            {t.deleteAllData}
          </CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t.warning}</AlertDescription>
          </Alert>
          
          <Button 
            variant="destructive" 
            size="lg"
            className="w-full"
            onClick={openDeleteDialog}
          >
            <Trash2 size={18} className="me-2" />
            {t.deleteAllData}
          </Button>
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
            <DialogDescription>{t.description}</DialogDescription>
          </DialogHeader>

          {!deleteResult ? (
            <div className="space-y-4 py-4">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{t.warning}</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>{t.enterPassword}</Label>
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
                {deleteResult.success ? <CheckCircle2 size={48} /> : <XCircle size={48} />}
                <p className="font-semibold text-lg">{deleteResult.message}</p>
                {deleteResult.errors && deleteResult.errors.length > 0 && (
                  <div className="w-full mt-2 max-h-32 overflow-y-auto text-xs bg-muted p-2 rounded">
                    {deleteResult.errors.map((err, i) => (
                      <div key={i} className="text-destructive">{err}</div>
                    ))}
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
              <Button onClick={() => setIsDeleteDialogOpen(false)}>{t.close}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DataManagement;
