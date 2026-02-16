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
import { toast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import AdvancedFilter, { FilterField, FilterValues } from '@/components/ui/advanced-filter';
import {
  Plus,
  Upload,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Calendar,
  AlertTriangle,
  RefreshCw,
  UserCheck,
  UserX,
  Timer,
  FileUp,
} from 'lucide-react';
import api from '@/lib/api';

// ========== تحديث أنواع البيانات حسب Response الباك ==========
interface AttendanceRecord {
  id: number;
  employee: {
    name: string | null;
    employee_code: number | null;
  };
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  created_at: string;
}

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
  attendance: AttendanceRecord[]; // هتستقبل الـ data مباشرة من الـ API
}

const AttendanceManager: React.FC<AttendanceManagerProps> = ({ employees, attendance }) => {
  const { language, direction } = useLanguage();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [attendanceFilters, setAttendanceFilters] = useState<FilterValues>({});
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  // Import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<AttendanceRow[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importResult, setImportResult] = useState<{success: number, failed: number} | null>(null);
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
      import: 'Import',
      employee: 'Employee',
      employeeCode: 'Employee Code',
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
      dragDrop: 'Drag & drop Excel or  file here, or click to browse',
      supportedFormats: 'Supported: .xlsx, .xls, ',
      errors: 'Errors',
      addSuccess: 'Attendance added successfully',
      addError: 'Error adding attendance',
      instructions: 'Import Instructions',
      instruction1: 'Employee code must match existing employees',
      instruction2: 'Date format: YYYY-MM-DD',
      instruction3: 'Time format: HH:MM (24-hour)',
      instruction4: 'Status: present, absent, late, leave',
      uploadFile: 'Upload File',
      processing: 'Processing...',
      successCount: 'Success',
      failedCount: 'Failed',
      clearResults: 'Clear Results',
      clearFilters: 'Clear Filters',
      totalRecords: 'Total Records',
      filter: 'Filter',
    },
    ar: {
      title: 'إدارة الحضور',
      addAttendance: 'إضافة حضور',
      importFromExcel: 'استيراد من Excel',
      list: 'سجل الحضور',
      import: 'استيراد',
      employee: 'الموظف',
      employeeCode: 'كود الموظف',
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
      dragDrop: 'اسحب وأفلت ملف Excel أو  هنا، أو انقر للاستعراض',
      supportedFormats: 'مدعوم: .xlsx, .xls, ',
      errors: 'الأخطاء',
      addSuccess: 'تم إضافة الحضور بنجاح',
      addError: 'خطأ في إضافة الحضور',
      instructions: 'تعليمات الاستيراد',
      instruction1: 'كود الموظف يجب أن يتطابق مع الموظفين الحاليين',
      instruction2: 'صيغة التاريخ: YYYY-MM-DD',
      instruction3: 'صيغة الوقت: HH:MM (24 ساعة)',
      instruction4: 'الحالة: present, absent, late, leave',
      uploadFile: 'رفع الملف',
      processing: 'جاري المعالجة...',
      successCount: 'ناجح',
      failedCount: 'فاشل',
      clearResults: 'مسح النتائج',
      clearFilters: 'مسح الفلاتر',
      totalRecords: 'إجمالي السجلات',
      filter: 'تصفية',
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

  // ========== Filter Fields Definition ==========
  const attendanceFilterFields: FilterField[] = [
    {
      key: 'employee_name',
      label: 'Employee Name',
      labelAr: 'اسم الموظف',
      type: 'text',
      placeholder: 'Search by employee name...',
      placeholderAr: 'البحث باسم الموظف...'
    },
    {
      key: 'employee_code',
      label: 'Employee Code',
      labelAr: 'كود الموظف',
      type: 'text',
      placeholder: 'Search by employee code...',
      placeholderAr: 'البحث بكود الموظف...'
    },
    {
      key: 'status',
      label: 'Status',
      labelAr: 'الحالة',
      type: 'select',
      options: [
        { value: 'present', label: 'Present', labelAr: 'حاضر' },
        { value: 'absent', label: 'Absent', labelAr: 'غائب' },
        { value: 'late', label: 'Late', labelAr: 'متأخر' },
        { value: 'leave', label: 'Leave', labelAr: 'إجازة' }
      ]
    },
    {
      key: 'check_in',
      label: 'Check In Time',
      labelAr: 'وقت الحضور',
      type: 'timeRange'
    },
    {
      key: 'check_out',
      label: 'Check Out Time',
      labelAr: 'وقت الانصراف',
      type: 'timeRange'
    }
  ];

  // ========== Filter Function - معدلة حسب Response الباك ==========
  const filterAttendance = (records: AttendanceRecord[]) => {
    return records.filter(record => {
      // 1. فلترة بالتاريخ (الفلتر الأساسي)
      if (dateFilter && record.date !== dateFilter) return false;
      
      // 2. فلترة بالبحث النصي (searchQuery)
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const employeeName = (record.employee?.name || '').toLowerCase();
        const employeeCode = String(record.employee?.employee_code || '').toLowerCase();
        
        const matchesSearch = 
          employeeName.includes(searchLower) ||
          employeeCode.includes(searchLower);
        
        if (!matchesSearch) return false;
      }
      
      // 3. فلترة بالـ Advanced Filters
      if (Object.keys(attendanceFilters).length > 0) {
        
        // فلتر اسم الموظف
        if (attendanceFilters.employee_name) {
          const employeeName = (record.employee?.name || '').toLowerCase();
          if (!employeeName.includes(String(attendanceFilters.employee_name).toLowerCase())) return false;
        }
        
        // فلتر كود الموظف
        if (attendanceFilters.employee_code) {
          const employeeCode = String(record.employee?.employee_code || '').toLowerCase();
          if (!employeeCode.includes(String(attendanceFilters.employee_code).toLowerCase())) return false;
        }
        
        // فلتر الحالة
        if (attendanceFilters.status && attendanceFilters.status !== 'all') {
          if (record.status !== attendanceFilters.status) return false;
        }
        
        // فلتر وقت الحضور (من - إلى) - مع تنسيق الوقت بشكل صحيح
        if (attendanceFilters.check_in_min && record.check_in) {
          // إزالة الثواني للمقارنة (لو الوقت في الباك بيجي بالساعات والدقائق فقط)
          const checkInTime = record.check_in.substring(0, 5); // "06:06:00" -> "06:06"
          if (checkInTime < attendanceFilters.check_in_min) return false;
        }
        if (attendanceFilters.check_in_max && record.check_in) {
          const checkInTime = record.check_in.substring(0, 5);
          if (checkInTime > attendanceFilters.check_in_max) return false;
        }
        
        // فلتر وقت الانصراف (من - إلى)
        if (attendanceFilters.check_out_min && record.check_out) {
          const checkOutTime = record.check_out.substring(0, 5);
          if (checkOutTime < attendanceFilters.check_out_min) return false;
        }
        if (attendanceFilters.check_out_max && record.check_out) {
          const checkOutTime = record.check_out.substring(0, 5);
          if (checkOutTime > attendanceFilters.check_out_max) return false;
        }
      }
      
      return true;
    });
  };

  // ========== Reset Filters ==========
  const handleResetFilters = () => {
    setAttendanceFilters({});
    setSearchQuery('');
    setDateFilter(new Date().toISOString().split('T')[0]);
  };

  // Apply filters
  const filteredAttendance = filterAttendance(attendance);

  // Add attendance mutation
  const addAttendanceMutation = useMutation({
    mutationFn: async (data: typeof newAttendance) => {
      const response = await api.post('/attendance', {
        employee_id: data.employee_id,
        date: data.date,
        check_in: data.check_in || null,
        check_out: data.check_out || null,
        status: data.status,
        notes: data.notes || null
      });
      return response.data;
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
    onError: (error: any) => {
      console.error('Add attendance error:', error);
      toast({ 
        title: t.addError, 
        description: error.response?.data?.message || error.message,
        variant: 'destructive' 
      });
    }
  });

  // Import Excel/CSV file mutation
  const importFileMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsProcessing(true);
      setProgress(30);
      
      const formData = new FormData();
      formData.append('file', file);
      
      setProgress(60);
      
      const response = await api.post('/attendance/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(Math.min(60 + Math.round(percentCompleted * 0.4), 95));
          }
        }
      });
      
      setProgress(100);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      
      setImportResult({
        success: data.success || 0,
        failed: data.failed || 0
      });
      
      if (data.errors && data.errors.length > 0) {
        setImportErrors(data.errors);
      }
      
      toast({
        title: t.importSuccess,
        description: `${data.success || 0} ${t.successCount}, ${data.failed || 0} ${t.failedCount}`
      });
      
      setIsProcessing(false);
      setProgress(0);
      
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      console.error('Import error:', error);
      toast({ 
        title: t.importError, 
        description: error.response?.data?.message || error.message,
        variant: 'destructive' 
      });
      setIsProcessing(false);
      setProgress(0);
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

  // File parsing functions
  const parseCSVFile = (file: File): Promise<AttendanceRow[]> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as any[];
          const validData: AttendanceRow[] = [];
          
          data.forEach((row: any) => {
            const employee_code = row.employee_code || row.employeeCode || row['Employee Code'] || row.employee;
            const date = row.date || row.Date || row.attendance_date;
            const check_in = row.check_in || row.checkIn || row['Check In'] || row.checkin;
            const check_out = row.check_out || row.checkOut || row['Check Out'] || row.checkout;
            const status = row.status || row.Status || 'present';
            const notes = row.notes || row.Notes || row.remarks;
            
            if (employee_code && date) {
              validData.push({
                employee_code: String(employee_code).trim(),
                date: String(date).trim(),
                check_in: check_in ? String(check_in).trim() : undefined,
                check_out: check_out ? String(check_out).trim() : undefined,
                status: String(status).trim().toLowerCase(),
                notes: notes ? String(notes).trim() : undefined
              });
            }
          });
          
          resolve(validData);
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  };

  const parseExcelFile = (file: File): Promise<AttendanceRow[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

          const validData: AttendanceRow[] = [];

          jsonData.forEach((row: any) => {
            const employee_code = row.employee_code || row.employeeCode || row['Employee Code'] || row.employee;
            const date = row.date || row.Date || row.attendance_date;
            const check_in = row.check_in || row.checkIn || row['Check In'] || row.checkin;
            const check_out = row.check_out || row.checkOut || row['Check Out'] || row.checkout;
            const status = row.status || row.Status || 'present';
            const notes = row.notes || row.Notes || row.remarks;
            
            if (employee_code && date) {
              validData.push({
                employee_code: String(employee_code).trim(),
                date: String(date).trim(),
                check_in: check_in ? String(check_in).trim() : undefined,
                check_out: check_out ? String(check_out).trim() : undefined,
                status: String(status).trim().toLowerCase(),
                notes: notes ? String(notes).trim() : undefined
              });
            }
          });

          resolve(validData);
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setSelectedFile(file);
    setImportResult(null);
    setImportErrors([]);
    setImportData([]);
    
    try {
      let validData: AttendanceRow[] = [];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      
      if (fileExtension === 'csv') {
        validData = await parseCSVFile(file);
      } else if (['xlsx', 'xls'].includes(fileExtension || '')) {
        validData = await parseExcelFile(file);
      } else {
        toast({ 
          title: t.invalidFile, 
          description: language === 'ar' ? 'الرجاء رفع ملف Excel أو CSV' : 'Please upload an Excel or CSV file',
          variant: 'destructive' 
        });
        return;
      }
      
      const errors: string[] = [];
      validData.forEach((row, index) => {
        if (!row.employee_code || !row.date) {
          errors.push(`Row ${index + 2}: Missing required fields`);
        }
      });
      
      setImportData(validData);
      
      if (errors.length > 0) {
        setImportErrors(errors);
        toast({
          title: language === 'ar' ? 'تم العثور على أخطاء في الملف' : 'Errors found in file',
          description: `${errors.length} ${language === 'ar' ? 'صف به مشاكل' : 'rows with issues'}`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: language === 'ar' ? 'تم قراءة الملف بنجاح' : 'File read successfully',
          description: `${validData.length} ${language === 'ar' ? 'صف جاهز للاستيراد' : 'rows ready to import'}`,
        });
      }
      
    } catch (err) {
      console.error('File parsing error:', err);
      toast({ 
        title: t.invalidFile, 
        description: language === 'ar' ? 'خطأ في قراءة الملف' : 'Error reading file',
        variant: 'destructive' 
      });
      setImportData([]);
    }
  };

  const handleImportFile = () => {
    if (!selectedFile) {
      toast({
        title: language === 'ar' ? 'الرجاء اختيار ملف أولاً' : 'Please select a file first',
        variant: 'destructive'
      });
      return;
    }
    
    importFileMutation.mutate(selectedFile);
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
      },
      {
        employee_code: 'EMP002',
        date: new Date().toISOString().split('T')[0],
        check_in: '09:00',
        check_out: '18:00',
        status: 'late',
        notes: 'Came late'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');
    XLSX.writeFile(wb, 'attendance_template.xlsx');
    
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'attendance_template.csv';
    link.click();
  };

  const clearResults = () => {
    setSelectedFile(null);
    setImportData([]);
    setImportErrors([]);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <FileUp className="mx-auto text-muted-foreground mb-4" size={48} />;
    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension === 'csv') {
      return <FileText className="mx-auto text-muted-foreground mb-4" size={48} />;
    } else {
      return <FileSpreadsheet className="mx-auto text-muted-foreground mb-4" size={48} />;
    }
  };

  // إحصائيات سريعة
  const totalRecords = attendance.length;
  const filteredCount = filteredAttendance.length;
  const presentCount = filteredAttendance.filter(r => r.status === 'present').length;
  const absentCount = filteredAttendance.filter(r => r.status === 'absent').length;
  const lateCount = filteredAttendance.filter(r => r.status === 'late').length;
  const leaveCount = filteredAttendance.filter(r => r.status === 'leave').length;

  // تنسيق الوقت (إزالة الثواني)
  const formatTime = (time: string | null) => {
    if (!time) return '-';
    return time.substring(0, 5); // "06:06:00" -> "06:06"
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
                          {emp.employee_code} - {language === 'ar' ? emp.name_ar || emp.name : emp.name}
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
                  {addAttendanceMutation.isPending ? <RefreshCw className="animate-spin me-2" size={16} /> : t.add}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* List Tab - مع الفلاتر المتقدمة */}
        <TabsContent value="list">
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <div className="space-y-4">
                {/* الفلاتر المتقدمة */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <AdvancedFilter
                      fields={attendanceFilterFields}
                      values={attendanceFilters}
                      onChange={setAttendanceFilters}
                      onReset={handleResetFilters}
                      language={language}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative w-64">
                      <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                      <Input
                        placeholder={t.search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="ps-9"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleResetFilters}
                      title={t.clearFilters}
                    >
                      <RefreshCw size={16} />
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <Badge variant="outline" className="px-3 py-1">
                    {t.totalRecords}: {filteredCount} / {totalRecords}
                  </Badge>
                  <Badge className="bg-accent text-accent-foreground px-3 py-1">
                    {t.present}: {presentCount}
                  </Badge>
                  <Badge className="bg-destructive text-destructive-foreground px-3 py-1">
                    {t.absent}: {absentCount}
                  </Badge>
                  <Badge className="bg-warning text-warning-foreground px-3 py-1">
                    {t.late}: {lateCount}
                  </Badge>
                  <Badge className="bg-secondary text-secondary-foreground px-3 py-1">
                    {t.leave}: {leaveCount}
                  </Badge>
                </div>

                {/* Date Filter */}
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.employee}</TableHead>
                      <TableHead>{t.employeeCode}</TableHead>
                      <TableHead>{t.date}</TableHead>
                      <TableHead>{t.checkIn}</TableHead>
                      <TableHead>{t.checkOut}</TableHead>
                      <TableHead>{t.status}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAttendance.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          <Calendar className="mx-auto h-12 w-12 mb-4 opacity-20" />
                          <p>{t.noRecords}</p>
                          {(Object.keys(attendanceFilters).length > 0 || searchQuery) && (
                            <Button
                              variant="link"
                              onClick={handleResetFilters}
                              className="mt-2"
                            >
                              {t.clearFilters}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAttendance.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            {language === 'ar'
                              ? record.employee?.name
                              : record.employee?.name}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono">
                              {record.employee?.employee_code || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(record.date)}</TableCell>
                          <TableCell>{formatTime(record.check_in)}</TableCell>
                          <TableCell>{formatTime(record.check_out)}</TableCell>
                          <TableCell>{getStatusBadge(record.status)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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
                <div className="flex justify-between items-center mb-4">
                  <Button variant="outline" onClick={downloadTemplate}>
                    <Download size={16} className="me-2" />
                    {t.downloadTemplate}
                  </Button>
                  
                  {(selectedFile || importData.length > 0 || importErrors.length > 0) && (
                    <Button variant="ghost" size="sm" onClick={clearResults}>
                      {t.clearResults}
                    </Button>
                  )}
                </div>
                
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                    isProcessing 
                      ? 'border-muted-foreground/25 cursor-not-allowed opacity-50' 
                      : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onClick={() => !isProcessing && fileInputRef.current?.click()}
                >
                  {getFileIcon()}
                  <p className="text-lg font-medium mb-2">
                    {selectedFile ? selectedFile.name : t.dragDrop}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedFile 
                      ? `${(selectedFile.size / 1024).toFixed(2)} KB` 
                      : t.supportedFormats}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </div>

                {selectedFile && !isProcessing && (
                  <div className="mt-4 flex justify-center">
                    <Button 
                      size="lg" 
                      onClick={handleImportFile}
                      className="gradient-success px-8"
                    >
                      <Upload size={18} className="me-2" />
                      {t.uploadFile}
                    </Button>
                  </div>
                )}

                {isProcessing && (
                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{t.processing}</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}

                {importResult && (
                  <div className="mt-4 flex justify-center gap-4">
                    <Badge variant="success" className="text-base px-4 py-2">
                      {t.successCount}: {importResult.success}
                    </Badge>
                    <Badge variant="destructive" className="text-base px-4 py-2">
                      {t.failedCount}: {importResult.failed}
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Preview */}
            {importData.length > 0 && (
              <Card className="card-elevated">
                <CardHeader className="border-b">
                  <CardTitle>{t.preview}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[300px] w-full rounded-md border">
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
                              <TableCell>
                                <Badge variant="outline">{row.status}</Badge>
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate">{row.notes || '-'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                  {importData.length > 50 && (
                    <p className="text-sm text-muted-foreground p-2">
                      {language === 'ar' ? `عرض أول 50 صف من أصل ${importData.length}` : `Showing first 50 rows of ${importData.length}`}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Errors */}
            {importErrors.length > 0 && (
              <Card className="card-elevated border-destructive/50">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle size={18} />
                    {t.errors} ({importErrors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[150px]">
                    <ul className="space-y-1 text-sm text-muted-foreground list-disc list-inside">
                      {importErrors.map((error, index) => (
                        <li key={index}>{error}</li>
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