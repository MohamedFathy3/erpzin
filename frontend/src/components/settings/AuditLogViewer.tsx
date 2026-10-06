import React, { useState, useMemo } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  History,
  Search,
  Filter,
  Eye,
  Download,
  User,
  Calendar,
  Database,
  Plus,
  Edit,
  Trash2,
  LogIn,
  LogOut,
  RefreshCw,
  Shield,
  Package,
  Users,
  Truck,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

// ========== واجهات البيانات ==========
interface ActivityLog {
  id: number;
  log_name: string;
  description: string;
  subject_type: string;
  event: string | null;
  subject_id: number;
  causer_type: string | null;
  causer_id: number | null;
  properties: {
    attributes?: any;
    old?: any;
  };
  batch_uuid: string | null;
  created_at: string;
  updated_at: string;
  causer?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

interface ActivityLogsResponse {
  status: boolean;
  data: {
    current_page: number;
    data: ActivityLog[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    links: any[];
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
}

const AuditLogViewer: React.FC = () => {
  const { language, direction } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // ========== Fetch audit logs from API ==========
  const { data: logsResponse, isLoading, refetch, isFetching } = useQuery<ActivityLogsResponse>({
    queryKey: ['activity-logs', currentPage],
    queryFn: async () => {
      try {
        const response = await api.get<ActivityLogsResponse>(`/activity-logs?page=${currentPage}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching activity logs:', error);
        throw error;
      }
    }
  });

  const logs = logsResponse?.data?.data || [];
  const pagination = logsResponse?.data;

  // ========== استخراج أنواع الكيانات الفريدة ==========
  const uniqueSubjects = useMemo(() => {
    const subjects = logs.map(log => {
      const parts = log.subject_type.split('\\');
      return parts[parts.length - 1];
    });
    return [...new Set(subjects)].filter(Boolean);
  }, [logs]);

  // ========== فلترة السجلات محلياً ==========
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // فلتر البحث
      let matchesSearch = true;
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        const subjectName = log.subject_type.split('\\').pop()?.toLowerCase() || '';
        const description = log.description.toLowerCase();
        const causerName = log.causer?.name?.toLowerCase() || '';
        
        matchesSearch = 
          subjectName.includes(search) ||
          description.includes(search) ||
          causerName.includes(search) ||
          log.id.toString().includes(search);
      }

      // فلتر الإجراء
      let matchesAction = true;
      if (actionFilter !== 'all') {
        matchesAction = log.description === actionFilter;
      }

      // فلتر الكيان
      let matchesSubject = true;
      if (subjectFilter !== 'all') {
        const subjectType = log.subject_type.split('\\').pop() || '';
        matchesSubject = subjectType === subjectFilter;
      }

      return matchesSearch && matchesAction && matchesSubject;
    });
  }, [logs, searchQuery, actionFilter, subjectFilter]);

  const t = {
    title: language === 'ar' ? 'سجل النشاطات' : 'Activity Log',
    description: language === 'ar' ? 'تتبع جميع الأحداث والتغييرات في النظام' : 'Track all system events and changes',
    search: language === 'ar' ? 'بحث في السجلات...' : 'Search logs...',
    action: language === 'ar' ? 'الإجراء' : 'Action',
    subject: language === 'ar' ? 'الكيان' : 'Subject',
    user: language === 'ar' ? 'المستخدم' : 'User',
    date: language === 'ar' ? 'التاريخ' : 'Date',
    details: language === 'ar' ? 'التفاصيل' : 'Details',
    allActions: language === 'ar' ? 'كل الإجراءات' : 'All Actions',
    allSubjects: language === 'ar' ? 'كل الكيانات' : 'All Subjects',
    created: language === 'ar' ? 'إنشاء' : 'Created',
    updated: language === 'ar' ? 'تحديث' : 'Updated',
    deleted: language === 'ar' ? 'حذف' : 'Deleted',
    login: language === 'ar' ? 'تسجيل دخول' : 'Login',
    logout: language === 'ar' ? 'تسجيل خروج' : 'Logout',
    noLogs: language === 'ar' ? 'لا توجد سجلات' : 'No logs found',
    oldValues: language === 'ar' ? 'القيم السابقة' : 'Old Values',
    newValues: language === 'ar' ? 'القيم الجديدة' : 'New Values',
    refresh: language === 'ar' ? 'تحديث' : 'Refresh',
    export: language === 'ar' ? 'تصدير' : 'Export',
    id: language === 'ar' ? 'رقم' : 'ID',
    ipAddress: language === 'ar' ? 'عنوان IP' : 'IP Address',
    causer: language === 'ar' ? 'المنفذ' : 'Causer',
    subjectId: language === 'ar' ? 'رقم الكيان' : 'Subject ID',
    previous: language === 'ar' ? 'السابق' : 'Previous',
    next: language === 'ar' ? 'التالي' : 'Next',
    page: language === 'ar' ? 'صفحة' : 'Page',
    of: language === 'ar' ? 'من' : 'of',
  };

  // ========== الحصول على أيقونة ولون للإجراء ==========
  const getActionConfig = (description: string) => {
    const action = description.toLowerCase();
    
    if (action.includes('created') || action.includes('create')) {
      return {
        icon: Plus,
        color: 'text-success bg-success/10 border-success/30',
        label: t.created
      };
    }
    if (action.includes('updated') || action.includes('update')) {
      return {
        icon: Edit,
        color: 'text-warning bg-warning/10 border-warning/30',
        label: t.updated
      };
    }
    if (action.includes('deleted') || action.includes('delete')) {
      return {
        icon: Trash2,
        color: 'text-destructive bg-destructive/10 border-destructive/30',
        label: t.deleted
      };
    }
    if (action.includes('login')) {
      return {
        icon: LogIn,
        color: 'text-primary bg-primary/10 border-primary/30',
        label: t.login
      };
    }
    if (action.includes('logout')) {
      return {
        icon: LogOut,
        color: 'text-muted-foreground bg-muted border-border',
        label: t.logout
      };
    }
    return {
      icon: History,
      color: 'bg-secondary text-secondary-foreground border-border',
      label: description
    };
  };

  // ========== الحصول على أيقونة للكيان ==========
  const getSubjectIcon = (subjectType: string) => {
    const type = subjectType.toLowerCase();
    if (type.includes('product')) return Package;
    if (type.includes('customer')) return Users;
    if (type.includes('supplier')) return Truck;
    if (type.includes('sale') || type.includes('order')) return ShoppingCart;
    if (type.includes('admin') || type.includes('user')) return User;
    if (type.includes('employee')) return Users;
    return Database;
  };

  const getSubjectColor = (subjectType: string) => {
    const type = subjectType.toLowerCase();
    if (type.includes('product')) return 'bg-blue-500/10 text-blue-500';
    if (type.includes('customer')) return 'bg-green-500/10 text-green-500';
    if (type.includes('supplier')) return 'bg-orange-500/10 text-orange-500';
    if (type.includes('admin')) return 'bg-purple-500/10 text-purple-500';
    if (type.includes('employee')) return 'bg-pink-500/10 text-pink-500';
    return 'bg-muted text-muted-foreground';
  };

  // ========== تنسيق التاريخ ==========
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, 'yyyy/MM/dd HH:mm:ss', {
      locale: language === 'ar' ? ar : undefined
    });
  };

  // ========== تصدير البيانات ==========
  const handleExport = () => {
    const headers = ['ID', 'Date', 'User', 'Action', 'Subject', 'Subject ID', 'Event'];
    const rows = filteredLogs.map(log => [
      log.id,
      formatDateTime(log.created_at),
      log.causer?.name || 'System',
      log.description,
      log.subject_type.split('\\').pop() || '-',
      log.subject_id,
      log.event || '-'
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `activity_log_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <Card className="h-full" dir={direction}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>{t.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
              <RefreshCw size={14} className={cn("me-2", isFetching && "animate-spin")} />
              {t.refresh}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download size={14} className="me-2" />
              {t.export}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t.allActions} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allActions}</SelectItem>
              <SelectItem value="created">{t.created}</SelectItem>
              <SelectItem value="updated">{t.updated}</SelectItem>
              <SelectItem value="deleted">{t.deleted}</SelectItem>
              <SelectItem value="login">{t.login}</SelectItem>
              <SelectItem value="logout">{t.logout}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t.allSubjects} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allSubjects}</SelectItem>
              {uniqueSubjects.map((subject) => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <ScrollArea className="h-[500px] border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[100px]">{t.date}</TableHead>
                <TableHead className="w-[120px]">{t.user}</TableHead>
                <TableHead className="w-[100px]">{t.action}</TableHead>
                <TableHead className="w-[120px]">{t.subject}</TableHead>
                <TableHead>{t.details}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <RefreshCw className="animate-spin mx-auto text-muted-foreground" size={24} />
                  </TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t.noLogs}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => {
                  const actionConfig = getActionConfig(log.description);
                  const ActionIcon = actionConfig.icon;
                  const subjectType = log.subject_type.split('\\').pop() || '';
                  const SubjectIcon = getSubjectIcon(subjectType);
                  
                  return (
                    <TableRow key={log.id} className="group hover:bg-muted/50">
                      <TableCell className="text-xs whitespace-nowrap">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar size={12} />
                          {formatDateTime(log.created_at)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <User size={12} className="text-primary" />
                          </div>
                          <span className="text-sm">{log.causer?.name || 'System'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("gap-1", actionConfig.color)}>
                          <ActionIcon size={12} />
                          {actionConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", getSubjectColor(subjectType))}>
                            <SubjectIcon size={12} />
                          </div>
                          <span className="text-sm">{subjectType}</span>
                          <Badge variant="secondary" className="text-xs">
                            #{log.subject_id}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {log.event ? `Event: ${log.event}` : `ID: ${log.id}`}
                          </span>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                                onClick={() => setSelectedLog(log)}
                              >
                                <Eye size={14} />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                  <History size={18} />
                                  {t.details} #{log.id}
                                </DialogTitle>
                              </DialogHeader>
                              {selectedLog && selectedLog.id === log.id && (
                                <div className="space-y-4 py-2">
                                  {/* Basic Info Grid */}
                                  <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground">{t.date}</p>
                                      <p className="text-sm font-medium">{formatDateTime(selectedLog.created_at)}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground">{t.causer}</p>
                                      <p className="text-sm font-medium">{selectedLog.causer?.name || 'System'}</p>
                                      {selectedLog.causer?.email && (
                                        <p className="text-xs text-muted-foreground">{selectedLog.causer.email}</p>
                                      )}
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground">{t.action}</p>
                                      <Badge variant="outline" className={cn("gap-1", actionConfig.color)}>
                                        <ActionIcon size={12} />
                                        {actionConfig.label}
                                      </Badge>
                                    </div>
                                  </div>

                                  {/* Subject Info */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground">{t.subject}</p>
                                      <div className="flex items-center gap-2">
                                        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", getSubjectColor(subjectType))}>
                                          <SubjectIcon size={12} />
                                        </div>
                                        <span className="text-sm font-medium">{subjectType}</span>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground">{t.subjectId}</p>
                                      <p className="text-sm font-medium">#{selectedLog.subject_id}</p>
                                    </div>
                                  </div>

                                  {/* Log Name & Event */}
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                      <p className="text-xs text-muted-foreground">Log Name</p>
                                      <Badge variant="secondary">{selectedLog.log_name}</Badge>
                                    </div>
                                    {selectedLog.event && (
                                      <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Event</p>
                                        <Badge variant="outline">{selectedLog.event}</Badge>
                                      </div>
                                    )}
                                  </div>

                                  {/* Old Values */}
                                  {selectedLog.properties?.old && (
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-destructive flex items-center gap-2">
                                        <Trash2 size={14} />
                                        {t.oldValues}
                                      </p>
                                      <pre className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg text-xs overflow-auto max-h-40 font-mono">
                                        {JSON.stringify(selectedLog.properties.old, null, 2)}
                                      </pre>
                                    </div>
                                  )}

                                  {/* New Values */}
                                  {selectedLog.properties?.attributes && (
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-success flex items-center gap-2">
                                        <Plus size={14} />
                                        {t.newValues}
                                      </p>
                                      <pre className="p-3 bg-success/5 border border-success/20 rounded-lg text-xs overflow-auto max-h-40 font-mono">
                                        {JSON.stringify(selectedLog.properties.attributes, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Pagination */}
        {pagination && pagination.last_page > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {t.page} {pagination.current_page} {t.of} {pagination.last_page}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || isFetching}
              >
                {t.previous}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(pagination.last_page, prev + 1))}
                disabled={currentPage === pagination.last_page || isFetching}
              >
                {t.next}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditLogViewer;