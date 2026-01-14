import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Bell,
  Package,
  FileText,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  Check,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  title_ar: string | null;
  message: string;
  message_ar: string | null;
  type: string;
  category: string;
  reference_id: string | null;
  reference_type: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
  read_at: string | null;
}

const NotificationCenter: React.FC = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as Notification[];
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('is_read', false);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Dismiss notification mutation
  const dismissMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_dismissed: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  // Subscribe to real-time notifications
  useEffect(() => {
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationIcon = (type: string, category: string) => {
    if (category === 'low_stock') return <Package className="h-4 w-4 text-warning" />;
    if (category === 'overdue_invoice') return <FileText className="h-4 w-4 text-destructive" />;
    
    switch (type) {
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      default: return <Info className="h-4 w-4 text-primary" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'warning': return 'border-l-warning';
      case 'error': return 'border-l-destructive';
      case 'success': return 'border-l-success';
      default: return 'border-l-primary';
    }
  };

  const t = {
    notifications: language === 'ar' ? 'الإشعارات' : 'Notifications',
    noNotifications: language === 'ar' ? 'لا توجد إشعارات' : 'No notifications',
    markAllRead: language === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all as read',
    refresh: language === 'ar' ? 'تحديث' : 'Refresh',
    justNow: language === 'ar' ? 'الآن' : 'Just now',
    minutesAgo: language === 'ar' ? 'منذ دقائق' : 'minutes ago',
    hoursAgo: language === 'ar' ? 'منذ ساعات' : 'hours ago',
    daysAgo: language === 'ar' ? 'منذ أيام' : 'days ago',
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t.justNow;
    if (diffMins < 60) return `${diffMins} ${t.minutesAgo}`;
    if (diffHours < 24) return `${diffHours} ${t.hoursAgo}`;
    return `${diffDays} ${t.daysAgo}`;
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-primary" />
            <h3 className="font-semibold">{t.notifications}</h3>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={cn(isLoading && "animate-spin")} />
            </Button>
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs"
                onClick={() => markAllAsReadMutation.mutate()}
              >
                <Check size={14} className="me-1" />
                {t.markAllRead}
              </Button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell size={32} className="mb-2 opacity-50" />
              <p className="text-sm">{t.noNotifications}</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "p-4 hover:bg-muted/50 transition-colors cursor-pointer border-l-4",
                    getTypeColor(notification.type),
                    !notification.is_read && "bg-primary/5"
                  )}
                  onClick={() => {
                    if (!notification.is_read) {
                      markAsReadMutation.mutate(notification.id);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {getNotificationIcon(notification.type, notification.category)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn(
                          "text-sm font-medium line-clamp-1",
                          !notification.is_read && "text-foreground",
                          notification.is_read && "text-muted-foreground"
                        )}>
                          {language === 'ar' && notification.title_ar 
                            ? notification.title_ar 
                            : notification.title}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissMutation.mutate(notification.id);
                          }}
                        >
                          <X size={12} />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {language === 'ar' && notification.message_ar 
                          ? notification.message_ar 
                          : notification.message}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {getRelativeTime(notification.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter;
