import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, AlertTriangle, CheckCircle, Info, Check, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

type NotificationItem = { id: string; type: string; data: { title?: string; message?: string; category?: string; url?: string }; read_at: string | null; created_at: string };
const NotificationCenter: React.FC = () => {
  const { language } = useLanguage(); const queryClient = useQueryClient(); const [isOpen, setIsOpen] = React.useState(false);
  const { data: notifications = [], isLoading, refetch } = useQuery<NotificationItem[]>({ queryKey:['notifications'], queryFn: async () => (await api.get('/notifications?per_page=50')).data.data?.data ?? [], refetchInterval: 15000 });
  const markRead = useMutation({ mutationFn: (id:string) => api.post(`/notifications/${id}/read`), onSuccess: () => queryClient.invalidateQueries({ queryKey:['notifications'] }) });
  const markAll = useMutation({ mutationFn: () => api.post('/notifications/read-all'), onSuccess: () => queryClient.invalidateQueries({ queryKey:['notifications'] }) });
  const unreadCount = notifications.filter(item => !item.read_at).length;
  const text = language === 'ar' ? { title:'الإشعارات', empty:'لا توجد إشعارات', all:'تحديد الكل كمقروء', now:'الآن', min:'منذ دقائق', hour:'منذ ساعات', day:'منذ أيام' } : { title:'Notifications', empty:'No notifications', all:'Mark all as read', now:'Just now', min:'minutes ago', hour:'hours ago', day:'days ago' };
  const relative = (date:string) => { const mins=Math.floor((Date.now()-new Date(date).getTime())/60000); if(mins<1)return text.now; if(mins<60)return `${mins} ${text.min}`; const hours=Math.floor(mins/60); if(hours<24)return `${hours} ${text.hour}`; return `${Math.floor(hours/24)} ${text.day}`; };
  const icon = (type:string) => type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600"/> : type === 'warning' ? <AlertTriangle className="h-4 w-4 text-yellow-600"/> : <Info className="h-4 w-4 text-primary"/>;
  return <Popover open={isOpen} onOpenChange={setIsOpen}><PopoverTrigger asChild><Button variant="ghost" size="icon" className="relative"><Bell size={20}/>{unreadCount>0 && <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 w-5 p-0 text-[10px]">{unreadCount>99?'99+':unreadCount}</Badge>}</Button></PopoverTrigger><PopoverContent className="w-96 p-0" align="end"><div className="flex items-center justify-between border-b p-4"><div className="flex items-center gap-2"><Bell size={18} className="text-primary"/><h3 className="font-semibold">{text.title}</h3>{unreadCount>0&&<Badge variant="secondary">{unreadCount}</Badge>}</div><div className="flex items-center gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}><RefreshCw size={14} className={cn(isLoading&&'animate-spin')}/></Button>{unreadCount>0&&<Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => markAll.mutate()}><Check size={14} className="me-1"/>{text.all}</Button>}</div></div><ScrollArea className="h-[400px]">{notifications.length===0?<div className="flex h-32 flex-col items-center justify-center text-muted-foreground"><Bell size={32} className="mb-2 opacity-50"/><p className="text-sm">{text.empty}</p></div>:<div className="divide-y">{notifications.map(item=><div key={item.id} className={cn('cursor-pointer p-4 transition-colors hover:bg-muted/50',!item.read_at&&'bg-primary/5')} onClick={() => { if(!item.read_at) markRead.mutate(item.id); if(item.data.url) window.location.href=item.data.url; }}><div className="flex items-start gap-3">{icon(item.type)}<div className="min-w-0 flex-1"><p className="text-sm font-medium">{item.data.title || 'CRM Notification'}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.data.message || ''}</p><p className="mt-2 text-[10px] text-muted-foreground">{relative(item.created_at)}</p></div></div></div>)}</div>}</ScrollArea></PopoverContent></Popover>;
};
export default NotificationCenter;
