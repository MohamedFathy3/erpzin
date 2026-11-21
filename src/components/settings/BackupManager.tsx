import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { 
  Database, 
  Download, 
  Upload, 
  Clock, 
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  HardDrive,
  AlertTriangle,
  FileJson,
  RefreshCw,
  Settings,
  Play,
  History
} from 'lucide-react';
import { format } from 'date-fns';

const BackupManager = () => {
  const { language, direction } = useLanguage();
  const queryClient = useQueryClient();
  const [isExporting, setIsExporting] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const t = {
    title: language === 'ar' ? 'النسخ الاحتياطي' : 'Backup Management',
    subtitle: language === 'ar' ? 'إدارة النسخ الاحتياطية للنظام' : 'Manage system backups',
    scheduledBackup: language === 'ar' ? 'النسخ الاحتياطي المجدول' : 'Scheduled Backup',
    enableSchedule: language === 'ar' ? 'تفعيل النسخ التلقائي' : 'Enable Auto Backup',
    frequency: language === 'ar' ? 'التكرار' : 'Frequency',
    daily: language === 'ar' ? 'يومياً' : 'Daily',
    weekly: language === 'ar' ? 'أسبوعياً' : 'Weekly',
    monthly: language === 'ar' ? 'شهرياً' : 'Monthly',
    backupTime: language === 'ar' ? 'وقت النسخ' : 'Backup Time',
    retentionDays: language === 'ar' ? 'مدة الاحتفاظ (أيام)' : 'Retention Days',
    emailNotification: language === 'ar' ? 'إشعارات البريد' : 'Email Notifications',
    notificationEmail: language === 'ar' ? 'البريد الإلكتروني' : 'Notification Email',
    manualBackup: language === 'ar' ? 'النسخ الاحتياطي اليدوي' : 'Manual Backup',
    exportNow: language === 'ar' ? 'تصدير الآن' : 'Export Now',
    exportDescription: language === 'ar' ? 'تصدير جميع بيانات النظام كملف JSON' : 'Export all system data as JSON file',
    importBackup: language === 'ar' ? 'استيراد نسخة' : 'Import Backup',
    importDescription: language === 'ar' ? 'استيراد بيانات من ملف نسخة احتياطية' : 'Import data from a backup file',
    backupHistory: language === 'ar' ? 'سجل النسخ الاحتياطية' : 'Backup History',
    date: language === 'ar' ? 'التاريخ' : 'Date',
    type: language === 'ar' ? 'النوع' : 'Type',
    status: language === 'ar' ? 'الحالة' : 'Status',
    size: language === 'ar' ? 'الحجم' : 'Size',
    actions: language === 'ar' ? 'الإجراءات' : 'Actions',
    completed: language === 'ar' ? 'مكتمل' : 'Completed',
    failed: language === 'ar' ? 'فشل' : 'Failed',
    inProgress: language === 'ar' ? 'جاري' : 'In Progress',
    manual: language === 'ar' ? 'يدوي' : 'Manual',
    scheduled: language === 'ar' ? 'مجدول' : 'Scheduled',
    save: language === 'ar' ? 'حفظ' : 'Save',
    saving: language === 'ar' ? 'جاري الحفظ...' : 'Saving...',
    exporting: language === 'ar' ? 'جاري التصدير...' : 'Exporting...',
    importing: language === 'ar' ? 'جاري الاستيراد...' : 'Importing...',
    selectFile: language === 'ar' ? 'اختر ملف النسخة' : 'Select backup file',
    cancel: language === 'ar' ? 'إلغاء' : 'Cancel',
    import: language === 'ar' ? 'استيراد' : 'Import',
    importWarning: language === 'ar' ? 'تحذير: سيتم استبدال البيانات الحالية بالبيانات المستوردة!' : 'Warning: Current data will be replaced with imported data!',
    lastBackup: language === 'ar' ? 'آخر نسخة' : 'Last Backup',
    nextBackup: language === 'ar' ? 'النسخة القادمة' : 'Next Backup',
    noBackups: language === 'ar' ? 'لا توجد نسخ احتياطية' : 'No backups yet',
    runNow: language === 'ar' ? 'تشغيل الآن' : 'Run Now',
  };

  // Export backup
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // The Laravel API resolves the authenticated tenant and streams every
      // tenant-owned backend table. The browser only receives the final file.
      const response = await api.get('/backup/export', { responseType: 'blob' });
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const disposition = response.headers['content-disposition'] as string | undefined;
      const filename = disposition?.match(/filename="?([^";]+)"?/i)?.[1];
      a.download = filename || `erp-backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: language === 'ar' ? 'تم تصدير النسخة بنجاح' : 'Backup exported successfully' });
    } catch (error) {
      console.error('Export error:', error);
      toast({ title: language === 'ar' ? 'خطأ في التصدير' : 'Export error', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  // Import backup
  const handleImport = async () => {
    if (!importFile) return;
    
    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('backup', importFile);
      await api.post('/backup/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast({ title: language === 'ar' ? 'تم استيراد النسخة بنجاح' : 'Backup imported successfully' });
      setIsImportDialogOpen(false);
      setImportFile(null);
      
      // Refresh all data
      queryClient.invalidateQueries();
    } catch (error: any) {
      console.error('Import error:', error);
      toast({ 
        title: language === 'ar' ? 'خطأ في الاستيراد' : 'Import error', 
        description: error.message,
        variant: 'destructive' 
      });
    } finally {
      setIsImporting(false);
    }
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-accent/10 text-accent border-accent/30"><CheckCircle2 size={12} className="me-1" />{t.completed}</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle size={12} className="me-1" />{t.failed}</Badge>;
      case 'in_progress':
        return <Badge className="bg-primary/10 text-primary border-primary/30"><Loader2 size={12} className="me-1 animate-spin" />{t.inProgress}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6" dir={direction}>
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-xl bg-primary/10">
          <Database className="text-primary" size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database size={20} />
              {language === 'ar' ? 'نسخة قاعدة الباك إند' : 'Backend Database Backup'}
            </CardTitle>
            <CardDescription>{language === 'ar' ? 'التصدير والاستيراد يتمان من Laravel والـ tenant الحالي' : 'Export and import use Laravel and the current tenant'}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {language === 'ar' ? 'لم تعد هذه الشاشة تستخدم Supabase. يتم تحديد الـ tenant من تسجيل الدخول، وتُحفظ النسخة على جهازك.' : 'This screen no longer uses Supabase. The tenant is resolved from the login and the backup is downloaded to your device.'}
            </p>
          </CardContent>
        </Card>

        {/* Manual Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HardDrive size={20} />
              {t.manualBackup}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'تصدير واستيراد النسخ الاحتياطية يدوياً' : 'Export and import backups manually'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Export */}
            <div className="p-4 rounded-lg border bg-muted/10 space-y-3">
              <div className="flex items-start gap-3">
                <Download size={24} className="text-primary mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium">{t.exportNow}</h4>
                  <p className="text-sm text-muted-foreground">{t.exportDescription}</p>
                </div>
              </div>
              <Button 
                onClick={handleExport} 
                disabled={isExporting}
                className="w-full"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={16} className="me-2 animate-spin" />
                    {t.exporting}
                  </>
                ) : (
                  <>
                    <Download size={16} className="me-2" />
                    {t.exportNow}
                  </>
                )}
              </Button>
            </div>

            {/* Import */}
            <div className="p-4 rounded-lg border bg-muted/10 space-y-3">
              <div className="flex items-start gap-3">
                <Upload size={24} className="text-accent mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium">{t.importBackup}</h4>
                  <p className="text-sm text-muted-foreground">{t.importDescription}</p>
                </div>
              </div>
              <Button 
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
                className="w-full"
              >
                <Upload size={16} className="me-2" />
                {t.importBackup}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload size={20} />
              {t.importBackup}
            </DialogTitle>
            <DialogDescription>{t.importDescription}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{t.importWarning}</AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label>{t.selectFile}</Label>
              <Input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
              />
              {importFile && (
                <p className="text-sm text-muted-foreground">
                  {importFile.name} ({formatFileSize(importFile.size)})
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} disabled={isImporting}>
              {t.cancel}
            </Button>
            <Button 
              onClick={handleImport}
              disabled={!importFile || isImporting}
              className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
              {isImporting ? (
                <>
                  <Loader2 size={14} className="me-2 animate-spin" />
                  {t.importing}
                </>
              ) : (
                <>
                  <Upload size={14} className="me-2" />
                  {t.import}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BackupManager;
