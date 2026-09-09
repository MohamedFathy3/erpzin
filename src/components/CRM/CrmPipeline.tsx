import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

type Stage = { id: number; name: string; name_ar?: string; deals_count?: number };
type Deal = { id: number; title: string; value: number; pipeline_stage_id: number; stage?: Stage; customer?: { name: string } };

export default function CrmPipeline() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const { data: stages = [] } = useQuery<Stage[]>({ queryKey: ['crm-stages'], queryFn: async () => (await api.get('/crm/pipeline-stages')).data.data });
  const { data: deals = [] } = useQuery<Deal[]>({ queryKey: ['crm-deals'], queryFn: async () => (await api.get('/crm/deals')).data.data?.data || [] });
  const move = useMutation({ mutationFn: ({ id, stage }: { id: number; stage: number }) => api.post(`/crm/deals/${id}/move-stage`, { pipeline_stage_id: stage }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-deals'] }), onError: () => toast.error('تعذر نقل الصفقة') });
  const addDeal = useMutation({ mutationFn: () => api.post('/crm/deals', { title, pipeline_stage_id: stages[0]?.id, value: 0 }), onSuccess: () => { setTitle(''); queryClient.invalidateQueries({ queryKey: ['crm-deals'] }); toast.success('تمت إضافة الصفقة'); } });
  return <div className="space-y-4" dir="rtl">
    <div className="flex gap-2"><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="اسم الصفقة الجديدة" /><Button disabled={!title || !stages.length} onClick={() => addDeal.mutate()}><Plus className="me-2 h-4 w-4" />إضافة صفقة</Button></div>
    <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">{stages.map(stage => <Card key={stage.id} className="min-h-56"><CardHeader className="pb-2"><CardTitle className="text-sm">{stage.name_ar || stage.name}<Badge variant="secondary" className="ms-2">{deals.filter(deal => deal.pipeline_stage_id === stage.id).length}</Badge></CardTitle></CardHeader><CardContent className="space-y-2">{deals.filter(deal => deal.pipeline_stage_id === stage.id).map(deal => <button key={deal.id} onClick={() => { const next = stages[stages.findIndex(s => s.id === stage.id) + 1]; if (next) move.mutate({ id: deal.id, stage: next.id }); }} className="w-full rounded-md border bg-card p-3 text-right shadow-sm hover:border-primary"><div className="font-medium">{deal.title}</div><div className="text-sm text-muted-foreground">{Number(deal.value || 0).toLocaleString()} · {deal.customer?.name || 'بدون عميل'}</div></button>)}</CardContent></Card>)}</div>
  </div>;
}
