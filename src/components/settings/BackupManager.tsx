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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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

  // Fetch backup settings
  const { data: backupSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['backup-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    }
  });

  // Fetch backup logs
  const { data: backupLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['backup-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    }
  });

  // Update backup settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updates: Partial<typeof backupSettings>) => {
      if (!backupSettings?.id) return;
      const { error } = await supabase
        .from('backup_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', backupSettings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backup-settings'] });
      toast({ title: language === 'ar' ? 'تم حفظ الإعدادات' : 'Settings saved' });
    },
    onError: () => {
      toast({ title: language === 'ar' ? 'خطأ في الحفظ' : 'Error saving', variant: 'destructive' });
    }
  });

  // Export backup
  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Tables to export
      const tables = [
        'products', 'product_variants', 'categories', 'customers', 'suppliers',
        'sales', 'sale_items', 'purchase_invoices', 'purchase_invoice_items',
        'inventory_movements', 'expenses', 'employees', 'banks', 'bank_transactions',
        'promotions', 'branches', 'warehouses', 'colors', 'sizes'
      ];

      const backupData: Record<string, any[]> = {};
      
      for (const tableName of tables) {
        const { data, error } = await supabase.from(tableName as any).select('*');
        if (!error && data) {
          backupData[tableName] = data;
        }
      }

      // Create backup metadata
      const backup = {
        version: '1.0',
        createdAt: new Date().toISOString(),
        tables: Object.keys(backupData),
        recordCounts: Object.fromEntries(
          Object.entries(backupData).map(([table, records]) => [table, records.length])
        ),
        data: backupData
      };

      // Download as JSON
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log the backup
      await supabase.from('backup_logs').insert({
        backup_type: 'manual',
        status: 'completed',
        file_name: a.download,
        file_size: blob.size,
        tables_backed_up: tables,
        completed_at: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
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
      const content = await importFile.text();
      const backup = JSON.parse(content);

      if (!backup.version || !backup.data) {
        throw new Error(language === 'ar' ? 'ملف غير صالح' : 'Invalid backup file');
      }

      // Import data table by table
      for (const [tableName, records] of Object.entries(backup.data)) {
        if (Array.isArray(records) && records.length > 0) {
          // Delete existing data using raw RPC or handle carefully
          const { error: deleteError } = await supabase
            .from(tableName as any)
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
          
          if (deleteError) {
            console.warn(`Could not delete from ${tableName}:`, deleteError.message);
          }
          
          // Insert new data in batches
          const batchSize = 100;
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            await supabase.from(tableName as any).insert(batch);
          }
        }
      }

      // Log the restore
      await supabase.from('backup_logs').insert({
        backup_type: 'restore',
        status: 'completed',
        file_name: importFile.name,
        file_size: importFile.size,
        tables_backed_up: Object.keys(backup.data),
        completed_at: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
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

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

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
        {/* Scheduled Backup Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={20} />
              {t.scheduledBackup}
            </CardTitle>
            <CardDescription>
              {language === 'ar' ? 'ضبط النسخ الاحتياطي التلقائي' : 'Configure automatic backups'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <Settings size={20} className="text-primary" />
                <div>
                  <p className="font-medium">{t.enableSchedule}</p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'ar' ? 'تفعيل النسخ التلقائي' : 'Enable automatic backup'}
                  </p>
                </div>
              </div>
              <Switch
                checked={backupSettings?.is_enabled || false}
                onCheckedChange={(checked) => updateSettingsMutation.mutate({ is_enabled: checked })}
              />
            </div>

            {/* Frequency */}
            <div className="space-y-2">
              <Label>{t.frequency}</Label>
              <Select
                value={backupSettings?.frequency || 'daily'}
                onValueChange={(value) => updateSettingsMutation.mutate({ frequency: value })}
                disabled={!backupSettings?.is_enabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t.daily}</SelectItem>
                  <SelectItem value="weekly">{t.weekly}</SelectItem>
                  <SelectItem value="monthly">{t.monthly}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Backup Time */}
            <div className="space-y-2">
              <Label>{t.backupTime}</Label>
              <Input
                type="time"
                value={backupSettings?.backup_time?.substring(0, 5) || '03:00'}
                onChange={(e) => updateSettingsMutation.mutate({ backup_time: e.target.value + ':00' })}
                disabled={!backupSettings?.is_enabled}
                dir="ltr"
              />
            </div>

            {/* Retention Days */}
            <div className="space-y-2">
              <Label>{t.retentionDays}</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={backupSettings?.retention_days || 30}
                onChange={(e) => updateSettingsMutation.mutate({ retention_days: parseInt(e.target.value) })}
                disabled={!backupSettings?.is_enabled}
                dir="ltr"
              />
            </div>

            {/* Email Notification */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={backupSettings?.email_notifications || false}
                  onCheckedChange={(checked) => updateSettingsMutation.mutate({ email_notifications: checked })}
                  disabled={!backupSettings?.is_enabled}
                />
                <Label>{t.emailNotification}</Label>
              </div>
              {backupSettings?.email_notifications && (
                <Input
                  type="email"
                  placeholder={t.notificationEmail}
                  value={backupSettings?.notification_email || ''}
                  onChange={(e) => updateSettingsMutation.mutate({ notification_email: e.target.value })}
                  disabled={!backupSettings?.is_enabled}
                  dir="ltr"
                />
              )}
            </div>

            {/* Status Info */}
            {backupSettings?.is_enabled && (
              <div className="p-3 rounded-lg bg-accent/10 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.lastBackup}:</span>
                  <span className="font-medium">
                    {backupSettings.last_backup_at 
                      ? format(new Date(backupSettings.last_backup_at), 'dd/MM/yyyy HH:mm')
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t.nextBackup}:</span>
                  <span className="font-medium">
                    {backupSettings.next_backup_at 
                      ? format(new Date(backupSettings.next_backup_at), 'dd/MM/yyyy HH:mm')
                      : '-'}
                  </span>
                </div>
              </div>
            )}
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

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History size={20} />
            {t.backupHistory}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="animate-spin" size={24} />
            </div>
          ) : backupLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileJson size={48} className="mx-auto mb-3 opacity-50" />
              <p>{t.noBackups}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.date}</TableHead>
                  <TableHead>{t.type}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.size}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backupLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {format(new Date(log.started_at), 'dd/MM/yyyy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.backup_type === 'manual' ? t.manual : 
                         log.backup_type === 'restore' ? (language === 'ar' ? 'استعادة' : 'Restore') : t.scheduled}
                      </Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell>{formatFileSize(log.file_size)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

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
