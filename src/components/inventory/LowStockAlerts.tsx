import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { 
  AlertTriangle, 
  Bell, 
  BellOff, 
  CheckCircle, 
  XCircle,
  Package,
  RefreshCw
} from 'lucide-react';

const LowStockAlerts = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);

  const t = {
    en: {
      title: 'Low Stock Alerts',
      description: 'Monitor products with low stock levels',
      product: 'Product',
      sku: 'SKU',
      currentStock: 'Current Stock',
      threshold: 'Threshold',
      type: 'Type',
      createdAt: 'Created At',
      status: 'Status',
      actions: 'Actions',
      lowStock: 'Low Stock',
      outOfStock: 'Out of Stock',
      overstock: 'Overstock',
      markResolved: 'Mark Resolved',
      markRead: 'Mark Read',
      unread: 'Unread',
      read: 'Read',
      resolved: 'Resolved',
      showResolved: 'Show Resolved',
      refresh: 'Refresh',
      noAlerts: 'No alerts found',
      alertResolved: 'Alert marked as resolved',
      alertRead: 'Alert marked as read',
      unreadAlerts: 'Unread Alerts',
      totalAlerts: 'Total Alerts'
    },
    ar: {
      title: 'تنبيهات انخفاض المخزون',
      description: 'مراقبة المنتجات ذات المخزون المنخفض',
      product: 'المنتج',
      sku: 'رمز المنتج',
      currentStock: 'المخزون الحالي',
      threshold: 'الحد',
      type: 'النوع',
      createdAt: 'تاريخ الإنشاء',
      status: 'الحالة',
      actions: 'الإجراءات',
      lowStock: 'مخزون منخفض',
      outOfStock: 'نفاد المخزون',
      overstock: 'مخزون زائد',
      markResolved: 'تحديد كمحلول',
      markRead: 'تحديد كمقروء',
      unread: 'غير مقروء',
      read: 'مقروء',
      resolved: 'محلول',
      showResolved: 'إظهار المحلولة',
      refresh: 'تحديث',
      noAlerts: 'لا توجد تنبيهات',
      alertResolved: 'تم تحديد التنبيه كمحلول',
      alertRead: 'تم تحديد التنبيه كمقروء',
      unreadAlerts: 'تنبيهات غير مقروءة',
      totalAlerts: 'إجمالي التنبيهات'
    }
  }[language];

  // Fetch alerts with product data
  const { data: alerts = [], refetch } = useQuery({
    queryKey: ['low-stock-alerts', showResolved],
    queryFn: async () => {
      let query = supabase
        .from('low_stock_alerts')
        .select('*, products(name, name_ar, sku)')
        .order('created_at', { ascending: false });
      
      if (!showResolved) {
        query = query.eq('is_resolved', false);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('low_stock_alerts')
        .update({ is_read: true })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast({ title: t.alertRead });
    }
  });

  // Mark as resolved mutation
  const markResolvedMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('low_stock_alerts')
        .update({ is_resolved: true, resolved_at: new Date().toISOString() })
        .eq('id', alertId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
      toast({ title: t.alertResolved });
    }
  });

  const getAlertTypeBadge = (type: string) => {
    const config = {
      low_stock: { label: t.lowStock, variant: 'secondary' as const, icon: AlertTriangle },
      out_of_stock: { label: t.outOfStock, variant: 'destructive' as const, icon: XCircle },
      overstock: { label: t.overstock, variant: 'default' as const, icon: Package }
    };
    const alertConfig = config[type as keyof typeof config] || config.low_stock;
    const Icon = alertConfig.icon;
    return (
      <Badge variant={alertConfig.variant} className="gap-1">
        <Icon size={12} />
        {alertConfig.label}
      </Badge>
    );
  };

  const getStatusBadge = (isRead: boolean, isResolved: boolean) => {
    if (isResolved) {
      return <Badge variant="outline" className="gap-1"><CheckCircle size={12} />{t.resolved}</Badge>;
    }
    if (isRead) {
      return <Badge variant="secondary" className="gap-1"><Bell size={12} />{t.read}</Badge>;
    }
    return <Badge variant="destructive" className="gap-1"><BellOff size={12} />{t.unread}</Badge>;
  };

  const unreadCount = alerts.filter(a => !a.is_read && !a.is_resolved).length;
  const totalCount = alerts.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <AlertTriangle className="text-amber-500" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{t.title}</h2>
            <p className="text-sm text-muted-foreground">{t.description}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw size={16} className="me-2" />
          {t.refresh}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <BellOff className="text-red-500" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.unreadAlerts}</p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-elevated">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Bell className="text-amber-500" size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t.totalAlerts}</p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="showResolved"
          checked={showResolved}
          onCheckedChange={(checked) => setShowResolved(checked as boolean)}
        />
        <label htmlFor="showResolved" className="text-sm cursor-pointer">
          {t.showResolved}
        </label>
      </div>

      {/* Alerts Table */}
      <Card className="card-elevated">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle size={18} />
            {t.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px] w-full">
            <div className="min-w-[900px]">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="min-w-[200px]">{t.product}</TableHead>
                    <TableHead className="min-w-[100px]">{t.sku}</TableHead>
                    <TableHead className="min-w-[100px]">{t.currentStock}</TableHead>
                    <TableHead className="min-w-[80px]">{t.threshold}</TableHead>
                    <TableHead className="min-w-[120px]">{t.type}</TableHead>
                    <TableHead className="min-w-[150px]">{t.createdAt}</TableHead>
                    <TableHead className="min-w-[100px]">{t.status}</TableHead>
                    <TableHead className="min-w-[150px]">{t.actions}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {t.noAlerts}
                      </TableCell>
                    </TableRow>
                  ) : (
                    alerts.map(alert => (
                      <TableRow key={alert.id} className={!alert.is_read ? 'bg-amber-500/5' : ''}>
                        <TableCell className="font-medium">
                          {language === 'ar' 
                            ? alert.products?.name_ar || alert.products?.name || '-'
                            : alert.products?.name || '-'
                          }
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {alert.products?.sku || '-'}
                        </TableCell>
                        <TableCell className="font-semibold">{alert.current_quantity}</TableCell>
                        <TableCell>{alert.threshold_quantity}</TableCell>
                        <TableCell>{getAlertTypeBadge(alert.alert_type)}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(alert.created_at).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </TableCell>
                        <TableCell>{getStatusBadge(alert.is_read, alert.is_resolved)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!alert.is_read && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => markReadMutation.mutate(alert.id)}
                              >
                                {t.markRead}
                              </Button>
                            )}
                            {!alert.is_resolved && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => markResolvedMutation.mutate(alert.id)}
                              >
                                {t.markResolved}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default LowStockAlerts;
