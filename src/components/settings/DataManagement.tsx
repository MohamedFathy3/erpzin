import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import Cookies from 'js-cookie';
import { 
  Trash2, 
  AlertTriangle,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  Lock,
  Key
} from 'lucide-react';

// ========== باسورد ثابت في الكود ==========
const ADMIN_DELETE_PASSWORD = "D3l@t3_@ll_D@t@_2026!@#";

const DataManagement = () => {
  const { language, direction } = useLanguage();
  
  // ========== الترجمات لازم تكون في الأول قبل أي استخدام ==========
  const t = {
    title: language === 'ar' ? 'إدارة البيانات' : 'Data Management',
    subtitle: language === 'ar' ? 'حذف جميع بيانات النظام' : 'Delete all system data',
    warning: language === 'ar' ? 'تحذير: هذا الإجراء غير قابل للتراجع!' : 'Warning: This action cannot be undone!',
    deleteAllData: language === 'ar' ? 'حذف جميع البيانات' : 'Delete All Data',
    description: language === 'ar' 
      ? 'سيتم حذف جميع البيانات (الأصناف، المبيعات، المشتريات، العملاء، الموردين)'
      : 'This will delete all data (products, sales, purchases, customers, suppliers)',
    confirmDelete: language === 'ar' ? 'تأكيد الحذف' : 'Confirm Delete',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    enterPassword: language === 'ar' ? 'أدخل كلمة المرور للتأكيد:' : 'Enter password to confirm:',
    password: language === 'ar' ? 'كلمة المرور' : 'Password',
    deleting: language === 'ar' ? 'جاري الحذف...' : 'Deleting...',
    deleteSuccess: language === 'ar' ? 'تم حذف البيانات بنجاح' : 'Data deleted successfully',
    deleteError: language === 'ar' ? 'خطأ في حذف البيانات' : 'Error deleting data',
    adminOnly: language === 'ar' ? 'صلاحية مدير النظام' : 'Admin Only',
    close: language === 'ar' ? 'إغلاق' : 'Close',
    rememberPassword: language === 'ar' ? 'تذكر كلمة المرور' : 'Remember password',
    clearSaved: language === 'ar' ? 'مسح المحفوظ' : 'Clear saved',
    passwordSaved: language === 'ar' ? 'كلمة المرور محفوظة' : 'Password saved',
    enterNewPassword: language === 'ar' ? 'أدخل كلمة مرور جديدة' : 'Enter new password',
    passwordCorrect: language === 'ar' ? '✓ كلمة المرور صحيحة' : '✓ Password correct',
    passwordIncorrect: language === 'ar' ? '✗ كلمة المرور غير صحيحة' : '✗ Incorrect password',
    apisToCall: language === 'ar' ? 'APIs سيتم استدعاء' : 'APIs to call',
    clearAll: '/clear-all',
    delete: '/delete',
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<{ success: boolean; message: string; errors?: string[] } | null>(null);
  
  // ========== حالات حفظ كلمة المرور ==========
  const [savedPassword, setSavedPassword] = useState('');
  const [rememberPassword, setRememberPassword] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(true);

  // ========== تحميل كلمة المرور المحفوظة عند بدء التشغيل ==========
  useEffect(() => {
    const saved = Cookies.get('admin_delete_password');
    if (saved) {
      setSavedPassword(saved);
      setRememberPassword(true);
      setShowPasswordInput(false);
      // التحقق من صحة كلمة المرور المحفوظة
      setIsPasswordValid(saved === ADMIN_DELETE_PASSWORD);
    }
  }, []);

  // ========== التحقق من كلمة المرور عند الكتابة ==========
  useEffect(() => {
    if (confirmationInput) {
      setIsPasswordValid(confirmationInput === ADMIN_DELETE_PASSWORD);
    } else {
      setIsPasswordValid(false);
    }
  }, [confirmationInput]);

  // ========== حفظ كلمة المرور في Cookies ==========
  const savePasswordToCookies = (password: string) => {
    Cookies.set('admin_delete_password', password, { 
      expires: 30,
      secure: true,
      sameSite: 'strict'
    });
  };

  // ========== مسح كلمة المرور من Cookies ==========
  const clearSavedPassword = () => {
    Cookies.remove('admin_delete_password');
    setSavedPassword('');
    setRememberPassword(false);
    setShowPasswordInput(true);
    setConfirmationInput('');
    setIsPasswordValid(false);
    toast({ 
      title: language === 'ar' ? 'تم مسح كلمة المرور المحفوظة' : 'Saved password cleared' 
    });
  };

  const openDeleteDialog = () => {
    setConfirmationInput('');
    setIsPasswordValid(false);
    setDeleteResult(null);
    setIsDeleteDialogOpen(true);
  };

  // ========== التحقق من كلمة المرور (مقارنة بالباسورد الثابت) ==========
  const verifyPassword = (password: string): boolean => {
    return password === ADMIN_DELETE_PASSWORD;
  };

  // ========== دوال APIs ==========
  const deleteAllData = async () => {
    try {
      const response = await api.delete('/clear-all', {
       
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

 

  const handleDelete = async () => {
    // نستخدم savedPassword لو موجودة ومش ظاهرة، وإلا نستخدم confirmationInput
    const passwordToUse = savedPassword || confirmationInput;
    
    if (!passwordToUse.trim()) {
      toast({ 
        title: language === 'ar' ? 'يرجى إدخال كلمة المرور' : 'Please enter your password', 
        variant: 'destructive' 
      });
      return;
    }

    // التحقق من كلمة المرور
    if (!verifyPassword(passwordToUse)) {
      toast({ 
        title: language === 'ar' ? 'كلمة المرور غير صحيحة' : 'Invalid password', 
        variant: 'destructive' 
      });
      setConfirmationInput('');
      setIsPasswordValid(false);
      return;
    }

    setIsDeleting(true);
    setDeleteResult(null);

    try {
      // حفظ كلمة المرور إذا اختار المستخدم ذلك
      if (rememberPassword && !savedPassword) {
        savePasswordToCookies(passwordToUse);
        setSavedPassword(passwordToUse);
      }

      // استدعاء API clear-all
      await deleteAllData();
      

      setDeleteResult({
        success: true,
        message: t.deleteSuccess
      });

      toast({ title: t.deleteSuccess });
      
      // إغلاق الدايلوج بعد 2 ثانية
      setTimeout(() => {
        setIsDeleteDialogOpen(false);
      }, 2000);
      
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
            <Badge className="bg-destructive/10 text-destructive border-destructive/30">
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

              

              {showPasswordInput ? (
                <div className="space-y-2">
                  <Label>{t.enterPassword}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                    <Input
                      type="password"
                      value={confirmationInput}
                      onChange={(e) => setConfirmationInput(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10"
                      dir="ltr"
                    />
                  </div>
                  
                  {/* مؤشر صحة كلمة المرور */}
                  {confirmationInput && (
                    <div className={`text-sm flex items-center gap-2 mt-1 ${
                      isPasswordValid ? 'text-accent' : 'text-destructive'
                    }`}>
                      {isPasswordValid ? (
                        <>
                          <CheckCircle2 size={14} />
                          <span>{t.passwordCorrect}</span>
                        </>
                      ) : (
                        <>
                          <XCircle size={14} />
                          <span>{t.passwordIncorrect}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-accent/10 rounded-lg">
                    <CheckCircle2 className="text-accent" size={20} />
                    <span className="text-sm">{t.passwordSaved}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={clearSavedPassword}
                    className="w-full"
                  >
                    <Trash2 size={14} className="me-2" />
                    {t.clearSaved}
                  </Button>
                </div>
              )}

              {/* تذكر كلمة المرور */}
              {showPasswordInput && isPasswordValid && (
                <></>
              )}
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
                  disabled={!isPasswordValid || isDeleting}
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