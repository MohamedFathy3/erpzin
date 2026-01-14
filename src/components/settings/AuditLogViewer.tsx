import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
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
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: any;
  new_values: any;
  ip_address: string | null;
  user_agent: string | null;
  notes: string | null;
  created_at: string;
}

const AuditLogViewer: React.FC = () => {
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [tableFilter, setTableFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch audit logs
  const { data: auditLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', searchQuery, actionFilter, tableFilter],
    queryFn: async () => {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (actionFilter !== 'all') {
        query = query.eq('action', actionFilter);
      }

      if (tableFilter !== 'all') {
        query = query.eq('table_name', tableFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as AuditLog[];
    }
  });

  // Get unique table names
  const uniqueTables = [...new Set(auditLogs.map(log => log.table_name).filter(Boolean))];

  const t = {
    title: language === 'ar' ? 'سجل المراجعة' : 'Audit Log',
    description: language === 'ar' ? 'تتبع جميع التغييرات في النظام' : 'Track all system changes',
    search: language === 'ar' ? 'بحث...' : 'Search...',
    action: language === 'ar' ? 'الإجراء' : 'Action',
    table: language === 'ar' ? 'الجدول' : 'Table',
    user: language === 'ar' ? 'المستخدم' : 'User',
    date: language === 'ar' ? 'التاريخ' : 'Date',
    details: language === 'ar' ? 'التفاصيل' : 'Details',
    allActions: language === 'ar' ? 'كل الإجراءات' : 'All Actions',
    allTables: language === 'ar' ? 'كل الجداول' : 'All Tables',
    create: language === 'ar' ? 'إنشاء' : 'Create',
    update: language === 'ar' ? 'تعديل' : 'Update',
    delete: language === 'ar' ? 'حذف' : 'Delete',
    login: language === 'ar' ? 'تسجيل دخول' : 'Login',
    logout: language === 'ar' ? 'تسجيل خروج' : 'Logout',
    noLogs: language === 'ar' ? 'لا توجد سجلات' : 'No logs found',
    oldValues: language === 'ar' ? 'القيم السابقة' : 'Old Values',
    newValues: language === 'ar' ? 'القيم الجديدة' : 'New Values',
    refresh: language === 'ar' ? 'تحديث' : 'Refresh',
    export: language === 'ar' ? 'تصدير' : 'Export',
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="h-4 w-4" />;
      case 'update': return <Edit className="h-4 w-4" />;
      case 'delete': return <Trash2 className="h-4 w-4" />;
      case 'login': return <LogIn className="h-4 w-4" />;
      case 'logout': return <LogOut className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-success/20 text-success border-success/30';
      case 'update': return 'bg-warning/20 text-warning border-warning/30';
      case 'delete': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'login': return 'bg-primary/20 text-primary border-primary/30';
      case 'logout': return 'bg-muted text-muted-foreground border-border';
      default: return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      create: t.create,
      update: t.update,
      delete: t.delete,
      login: t.login,
      logout: t.logout,
    };
    return labels[action] || action;
  };

  const filteredLogs = auditLogs.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.user_name?.toLowerCase().includes(search) ||
      log.table_name?.toLowerCase().includes(search) ||
      log.action.toLowerCase().includes(search) ||
      log.notes?.toLowerCase().includes(search)
    );
  });

  const handleExport = () => {
    const headers = ['Date', 'User', 'Action', 'Table', 'Record ID', 'Notes'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.user_name || '-',
      log.action,
      log.table_name || '-',
      log.record_id || '-',
      log.notes || '-'
    ]);

    let csvContent = headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_log_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  return (
    <Card className="h-full">
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
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw size={14} className={cn("me-2", isLoading && "animate-spin")} />
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
              <SelectItem value="create">{t.create}</SelectItem>
              <SelectItem value="update">{t.update}</SelectItem>
              <SelectItem value="delete">{t.delete}</SelectItem>
              <SelectItem value="login">{t.login}</SelectItem>
              <SelectItem value="logout">{t.logout}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder={t.allTables} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t.allTables}</SelectItem>
              {uniqueTables.map((table) => (
                <SelectItem key={table} value={table!}>{table}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Logs Table */}
        <ScrollArea className="h-[500px] border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow>
                <TableHead className="w-[180px]">{t.date}</TableHead>
                <TableHead className="w-[150px]">{t.user}</TableHead>
                <TableHead className="w-[100px]">{t.action}</TableHead>
                <TableHead className="w-[150px]">{t.table}</TableHead>
                <TableHead>{t.details}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t.noLogs}
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id} className="group">
                    <TableCell className="text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-muted-foreground" />
                        {format(new Date(log.created_at), 'yyyy-MM-dd HH:mm', {
                          locale: language === 'ar' ? ar : undefined
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-muted-foreground" />
                        <span className="text-sm">{log.user_name || '-'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("gap-1", getActionColor(log.action))}>
                        {getActionIcon(log.action)}
                        {getActionLabel(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs">
                        {log.table_name || '-'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground line-clamp-1">
                          {log.notes || (log.record_id ? `ID: ${log.record_id.slice(0, 8)}...` : '-')}
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
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <History size={18} />
                                {t.details}
                              </DialogTitle>
                            </DialogHeader>
                            {selectedLog && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">{t.user}</p>
                                    <p className="font-medium">{selectedLog.user_name || '-'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">{t.date}</p>
                                    <p className="font-medium">
                                      {format(new Date(selectedLog.created_at), 'yyyy-MM-dd HH:mm:ss')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">{t.action}</p>
                                    <Badge variant="outline" className={cn("gap-1", getActionColor(selectedLog.action))}>
                                      {getActionIcon(selectedLog.action)}
                                      {getActionLabel(selectedLog.action)}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">{t.table}</p>
                                    <p className="font-medium font-mono">{selectedLog.table_name || '-'}</p>
                                  </div>
                                </div>

                                {selectedLog.old_values && (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">{t.oldValues}</p>
                                    <pre className="p-3 bg-destructive/10 rounded-lg text-xs overflow-auto max-h-40">
                                      {JSON.stringify(selectedLog.old_values, null, 2)}
                                    </pre>
                                  </div>
                                )}

                                {selectedLog.new_values && (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">{t.newValues}</p>
                                    <pre className="p-3 bg-success/10 rounded-lg text-xs overflow-auto max-h-40">
                                      {JSON.stringify(selectedLog.new_values, null, 2)}
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
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default AuditLogViewer;
