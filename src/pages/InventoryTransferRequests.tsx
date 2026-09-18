import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function InventoryTransferRequests() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['inventory-transfer-requests'],
    queryFn: async () => (await api.get('/inventory-transfer-requests')).data?.data,
  });
  const requests = data?.data || [];
  const act = async (id: number, action: 'approve' | 'reject') => {
    try {
      await api.post(`/inventory-transfer-requests/${id}/${action}`, action === 'reject' ? { rejection_reason: language === 'ar' ? 'تم الرفض من الإدارة' : 'Rejected by management' } : {});
      await queryClient.invalidateQueries({ queryKey: ['inventory-transfer-requests'] });
      toast({ title: language === 'ar' ? 'تم تحديث طلب النقل والمخزون' : 'Transfer and inventory updated' });
    } catch (error) {
      toast({ title: language === 'ar' ? 'تعذر معالجة الطلب' : 'Could not process request', variant: 'destructive' });
    }
  };

  return <MainLayout activeItem="inventory-transfer-requests">
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">{language === 'ar' ? 'طلبات نقل المخزون' : 'Inventory transfer requests'}</h1><p className="text-muted-foreground">{language === 'ar' ? 'اعتماد النقل يخصم من المخزن المصدر ويضيف إلى مخزنك تلقائياً.' : 'Approval deducts from the source warehouse and adds to your warehouse atomically.'}</p></div>
      {isLoading && <Loader2 className="animate-spin" />}
      {!isLoading && requests.length === 0 && <Card><CardContent className="p-8 text-center text-muted-foreground">{language === 'ar' ? 'لا توجد طلبات نقل' : 'No transfer requests'}</CardContent></Card>}
      {requests.map((request: any) => <Card key={request.id}><CardHeader className="flex-row items-center justify-between"><CardTitle className="text-base">{request.product?.name_ar || request.product?.name || '-'}</CardTitle><Badge variant={request.status === 'pending' ? 'secondary' : request.status === 'approved' ? 'default' : 'destructive'}>{request.status}</Badge></CardHeader><CardContent className="flex flex-wrap items-center justify-between gap-3"><div className="text-sm text-muted-foreground">{request.quantity} · {request.fromBranch?.name} / {request.fromWarehouse?.name} → {request.toBranch?.name} / {request.toWarehouse?.name}</div>{request.status === 'pending' && <div className="flex gap-2"><Button size="sm" onClick={() => act(request.id, 'approve')}>{language === 'ar' ? 'قبول واعتماد' : 'Approve'}</Button><Button size="sm" variant="outline" onClick={() => act(request.id, 'reject')}>{language === 'ar' ? 'رفض' : 'Reject'}</Button></div>}</CardContent></Card>)}
    </div>
  </MainLayout>;
}
