import React, { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import * as XLSX from 'xlsx';
import {
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  UserX,
  Timer
} from 'lucide-react';
import api from '@/lib/api';

interface AttendanceRow {
  employee_code: string;
  date: string;
  check_in?: string;
  check_out?: string;
  status: string;
  notes?: string;
}

interface AttendanceManagerProps {
  employees: any[];
  attendance: any[];
}

const AttendanceManager: React.FC<AttendanceManagerProps> = ({ employees, attendance }) => {
  const { language, direction } = useLanguage();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState('list');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  
  // Import state
  const [importData, setImportData] = useState<AttendanceRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Form state
  const [newAttendance, setNewAttendance] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    check_in: '',
    check_out: '',
    status: 'present',
    notes: ''
  });

  const translations = {
    en: {
      title: 'Attendance Management',
      addAttendance: 'Add Attendance',
      importFromExcel: 'Import from Excel',
      list: 'Attendance List',
      import: 'Excel Import',
      employee: 'Employee',
      date: 'Date',
      checkIn: 'Check In',
      checkOut: 'Check Out',
      status: 'Status',
      notes: 'Notes',
      present: 'Present',
      absent: 'Absent',
      late: 'Late',
      leave: 'On Leave',
      add: 'Add',
      cancel: 'Cancel',
      search: 'Search...',
      today: 'Today',
      noRecords: 'No attendance records',
      selectEmployee: 'Select Employee',
      downloadTemplate: 'Download Template',
      startImport: 'Start Import',
      preview: 'Preview',
      rowsToImport: 'Rows to Import',
      importSuccess: 'Attendance imported successfully',
      importError: 'Error importing attendance',
      invalidFile: 'Invalid file format',
      dragDrop: 'Drag & drop Excel file here, or click to browse',
      supportedFormats: 'Supported: .xlsx, .xls',
      errors: 'Errors',
      addSuccess: 'Attendance added successfully',
      addError: 'Error adding attendance',
      employeeCode: 'Employee Code',
      instructions: 'Import Instructions',
      instruction1: 'Employee code must match existing employees',
      instruction2: 'Date format: YYYY-MM-DD',
      instruction3: 'Time format: HH:MM (24-hour)',
      instruction4: 'Status: present, absent, late, leave'
    },
    ar: {
      title: 'إدارة الحضور',
      addAttendance: 'إضافة حضور',
      importFromExcel: 'استيراد من Excel',
      list: 'سجل الحضور',
      import: 'استيراد Excel',
      employee: 'الموظف',
      date: 'التاريخ',
      checkIn: 'الحضور',
      checkOut: 'الانصراف',
      status: 'الحالة',
      notes: 'ملاحظات',
      present: 'حاضر',
      absent: 'غائب',
      late: 'متأخر',
      leave: 'إجازة',
      add: 'إضافة',
      cancel: 'إلغاء',
      search: 'بحث...',
      today: 'اليوم',
      noRecords: 'لا توجد سجلات حضور',
      selectEmployee: 'اختر الموظف',
      downloadTemplate: 'تحميل النموذج',
      startImport: 'بدء الاستيراد',
      preview: 'معاينة',
      rowsToImport: 'صفوف للاستيراد',
      importSuccess: 'تم استيراد الحضور بنجاح',
      importError: 'خطأ في استيراد الحضور',
      invalidFile: 'صيغة الملف غير صالحة',
      dragDrop: 'اسحب وأفلت ملف Excel هنا، أو انقر للاستعراض',
      supportedFormats: 'مدعوم: .xlsx, .xls',
      errors: 'الأخطاء',
      addSuccess: 'تم إضافة الحضور بنجاح',
      addError: 'خطأ في إضافة الحضور',
      employeeCode: 'كود الموظف',
      instructions: 'تعليمات الاستيراد',
      instruction1: 'كود الموظف يجب أن يتطابق مع الموظفين الحاليين',
      instruction2: 'صيغة التاريخ: YYYY-MM-DD',
      instruction3: 'صيغة الوقت: HH:MM (24 ساعة)',
      instruction4: 'الحالة: present, absent, late, leave'
    }
  };

  const t = translations[language];

  const statusOptions = [
    { value: 'present', label: t.present, icon: UserCheck, color: 'bg-accent text-accent-foreground' },
    { value: 'absent', label: t.absent, icon: UserX, color: 'bg-destructive text-destructive-foreground' },
    { value: 'late', label: t.late, icon: Timer, color: 'bg-warning text-warning-foreground' },
    { value: 'leave', label: t.leave, icon: Calendar, color: 'bg-secondary text-secondary-foreground' }
  ];

  const getStatusBadge = (status: string) => {
    const config = statusOptions.find(s => s.value === status) || statusOptions[0];
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  // Filter attendance by date and search
  const filteredAttendance = attendance.filter(record => {
    const matchesDate = record.date === dateFilter;
    const matchesSearch = !searchQuery || 
      record.employees?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.employees?.name_ar?.includes(searchQuery) ||
      record.employees?.employee_code?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDate && matchesSearch;
  });

  // Add attendance mutation
  const addAttendanceMutation = useMutation({
    mutationFn: async (data: typeof newAttendance) => {
      await api.post('/attendance', {
        employee_id: data.employee_id,
        date: data.date,
        check_in: data.check_in || null,
          check_out: data.check_out || null,
          status: data.status,
          notes: data.notes || null
        });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      setShowAddDialog(false);
      setNewAttendance({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        check_in: '',
        check_out: '',
        status: 'present',
        notes: ''
      });
      toast({ title: t.addSuccess });
    },
    onError: () => {
      toast({ title: t.addError, variant: 'destructive' });
    }
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async () => {
      setIsProcessing(true);
      setProgress(0);

      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < importData.length; i++) {
        const row = importData[i];
        try {
          // Find employee by code
          const employee = employees.find(e => e.employee_code === row.employee_code);
          if (!employee) {
            failCount++;
            errors.push(`Row ${i + 1}: Employee code "${row.employee_code}" not found`);
            continue;
          }

          const { error } = await supabase
            .from('attendance')
            .insert({
              employee_id: employee.id,
              date: row.date,
              check_in: row.check_in || null,
              check_out: row.check_out || null,
              status: row.status || 'present',
              notes: row.notes || null
            });

          if (error) {
            failCount++;
            errors.push(`Row ${i + 1}: ${error.message}`);
          } else {
            successCount++;
          }
        } catch (err: any) {
          failCount++;
          errors.push(`Row ${i + 1}: ${err.message}`);
        }

        setProgress(Math.round(((i + 1) / importData.length) * 100));
      }

      return { successCount, failCount, errors };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast({
        title: t.importSuccess,
        description: `${result.successCount} ${language === 'ar' ? 'ناجح' : 'successful'}, ${result.failCount} ${language === 'ar' ? 'فاشل' : 'failed'}`
      });
      setImportData([]);
      setImportErrors(result.errors);
      setIsProcessing(false);
    },
    onError: () => {
      toast({ title: t.importError, variant: 'destructive' });
      setIsProcessing(false);
    }
  });

  const handleAddAttendance = () => {
    if (!newAttendance.employee_id || !newAttendance.date) {
      toast({
        title: language === 'ar' ? 'الموظف والتاريخ مطلوبان' : 'Employee and date are required',
        variant: 'destructive'
      });
      return;
    }
    addAttendanceMutation.mutate(newAttendance);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<AttendanceRow>(worksheet);

        const validData: AttendanceRow[] = [];
        const errors: string[] = [];

        jsonData.forEach((row, index) => {
          if (!row.employee_code || !row.date) {
            errors.push(`Row ${index + 2}: Missing required fields (employee_code, date)`);
          } else {
            validData.push({
              employee_code: String(row.employee_code),
              date: String(row.date),
              check_in: row.check_in ? String(row.check_in) : undefined,
              check_out: row.check_out ? String(row.check_out) : undefined,
              status: row.status ? String(row.status) : 'present',
              notes: row.notes ? String(row.notes) : undefined
            });
          }
        });

        setImportData(validData);
        setImportErrors(errors);

        if (errors.length > 0) {
          toast({
            title: language === 'ar' ? 'تم العثور على أخطاء' : 'Errors found',
            description: `${errors.length} ${language === 'ar' ? 'صف به مشاكل' : 'rows with issues'}`,
            variant: 'destructive'
          });
        }
      } catch (err) {
        toast({ title: t.invalidFile, variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        employee_code: 'EMP001',
        date: new Date().toISOString().split('T')[0],
        check_in: '08:00',
        check_out: '17:00',
        status: 'present',
        notes: 'Notes here'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, 'attendance_template.xlsx');
  };

  return (
    <div className="space-y-4" dir={direction}>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList>
            <TabsTrigger value="list" className="gap-2">
              <Calendar size={16} />
              {t.list}
            </TabsTrigger>
            <TabsTrigger value="import" className="gap-2">
              <FileSpreadsheet size={16} />
              {t.import}
            </TabsTrigger>
          </TabsList>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gradient-success">
                <Plus size={18} className="me-2" />
                {t.addAttendance}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t.addAttendance}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>{t.employee}</Label>
                  <Select
                    value={newAttendance.employee_id}
                    onValueChange={(value) => setNewAttendance(prev => ({ ...prev, employee_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t.selectEmployee} />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.employee_code} - {language === 'ar' ? emp.name || emp.name : emp.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t.date}</Label>
                  <Input
                    type="date"
                    value={newAttendance.date}
                    onChange={(e) => setNewAttendance(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t.checkIn}</Label>
                    <Input
                      type="time"
                      value={newAttendance.check_in}
                      onChange={(e) => setNewAttendance(prev => ({ ...prev, check_in: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t.checkOut}</Label>
                    <Input
                      type="time"
                      value={newAttendance.check_out}
                      onChange={(e) => setNewAttendance(prev => ({ ...prev, check_out: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t.status}</Label>
                  <Select
                    value={newAttendance.status}
                    onValueChange={(value) => setNewAttendance(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>{t.notes}</Label>
                  <Input
                    value={newAttendance.notes}
                    onChange={(e) => setNewAttendance(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t.notes}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  {t.cancel}
                </Button>
                <Button onClick={handleAddAttendance} disabled={addAttendanceMutation.isPending}>
                  {addAttendanceMutation.isPending ? '...' : t.add}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* List Tab */}
        <TabsContent value="list">
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="relative max-w-sm">
                  <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    placeholder={t.search}
                    className="ps-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-auto"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDateFilter(new Date().toISOString().split('T')[0])}
                  >
                    {t.today}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.employee}</TableHead>
                    <TableHead>{t.date}</TableHead>
                    <TableHead>{t.checkIn}</TableHead>
                    <TableHead>{t.checkOut}</TableHead>
                    <TableHead>{t.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {t.noRecords}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAttendance.map((record) => (
                      <TableRow key={record.id}>
    <TableCell>
      {language === 'ar'
        ? record.name_ar || record.employee?.name_ar || record.employees?.name_ar || record.name || record.employee?.name
        : record.name || record.employee?.name || record.employees?.name}
    </TableCell>
    <TableCell>{formatDate(record.date)}</TableCell>
    <TableCell>{record.check_in || '-'}</TableCell>
    <TableCell>{record.check_out || '-'}</TableCell>
    <TableCell>{getStatusBadge(record.status)}</TableCell>
  </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import">
          <div className="space-y-4">
            {/* Instructions */}
            <Card className="card-elevated border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle size={16} className="text-warning" />
                  {t.instructions}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• {t.instruction1}</li>
                  <li>• {t.instruction2}</li>
                  <li>• {t.instruction3}</li>
                  <li>• {t.instruction4}</li>
                </ul>
              </CardContent>
            </Card>

            {/* Upload Area */}
            <Card className="card-elevated">
              <CardContent className="p-6">
                <div className="flex justify-end mb-4">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download size={16} className="me-2" />
                    {t.downloadTemplate}
                  </Button>
                </div>
                <div
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto text-muted-foreground mb-4" size={48} />
                  <p className="text-lg font-medium mb-2">{t.dragDrop}</p>
                  <p className="text-sm text-muted-foreground">{t.supportedFormats}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            {importData.length > 0 && (
              <Card className="card-elevated">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle>{t.preview}</CardTitle>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="text-lg px-3 py-1">
                        {t.rowsToImport}: {importData.length}
                      </Badge>
                      <Button
                        onClick={() => importMutation.mutate()}
                        disabled={isProcessing}
                      >
                        {isProcessing ? (
                          <RefreshCw className="animate-spin me-2" size={16} />
                        ) : (
                          <Upload size={16} className="me-2" />
                        )}
                        {t.startImport}
                      </Button>
                    </div>
                  </div>
                  {isProcessing && <Progress value={progress} className="mt-4" />}
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px] w-full">
                    <div className="min-w-[800px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead>{t.employeeCode}</TableHead>
                            <TableHead>{t.date}</TableHead>
                            <TableHead>{t.checkIn}</TableHead>
                            <TableHead>{t.checkOut}</TableHead>
                            <TableHead>{t.status}</TableHead>
                            <TableHead>{t.notes}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importData.slice(0, 50).map((row, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono">{row.employee_code}</TableCell>
                              <TableCell>{row.date}</TableCell>
                              <TableCell>{row.check_in || '-'}</TableCell>
                              <TableCell>{row.check_out || '-'}</TableCell>
                              <TableCell>{row.status}</TableCell>
                              <TableCell className="max-w-[150px] truncate">{row.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            {/* Errors */}
            {importErrors.length > 0 && (
              <Card className="card-elevated border-amber-500/50">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-amber-500">
                    <AlertTriangle size={18} />
                    {t.errors} ({importErrors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[150px]">
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {importErrors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AttendanceManager;
