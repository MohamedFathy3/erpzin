import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Download, Laptop, RefreshCw, ShieldCheck, Trash2, Wifi, WifiOff } from 'lucide-react';
import api from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

type Agent = {
  id: string;
  name?: string;
  status?: 'online' | 'degraded' | 'offline' | string;
  last_seen_at?: string | null;
  version?: string | null;
  pending_events?: number;
  devices_count?: number;
};

type PairingCode = { code: string; expires_at?: string; agent_id?: string };

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message || 'Request failed');
  }
  return 'Request failed';
}

export default function BiometricAgentPanel() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const queryClient = useQueryClient();
  const [pairing, setPairing] = useState<PairingCode | null>(null);
  const [copied, setCopied] = useState(false);

  const agentsQuery = useQuery<Agent[]>({
    queryKey: ['biometric-agents'],
    queryFn: async () => (await api.get('/biometric/agents')).data?.data || [],
    retry: 1,
  });

  const createCode = useMutation({
    mutationFn: async () => {
      const value = (await api.post('/biometric/agents/pairing-codes', { name: 'ERP Biometric Connector' })).data?.data as PairingCode;
      if (!value?.code) throw new Error('ERP API did not return a pairing code');
      return value;
    },
    onSuccess: (value) => {
      setPairing(value);
      setCopied(false);
      toast({ title: ar ? 'تم إنشاء رمز الربط' : 'Pairing code created' });
      void queryClient.invalidateQueries({ queryKey: ['biometric-agents'] });
    },
    onError: (error) => toast({
      title: ar ? 'تعذر إنشاء رمز الربط' : 'Could not create pairing code',
      description: getErrorMessage(error),
      variant: 'destructive',
    }),
  });

  const revokeAgent = useMutation({
    mutationFn: async (agentId: string) => api.delete(`/biometric/agents/${agentId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['biometric-agents'] });
      toast({ title: ar ? 'تم إلغاء ربط الـAgent' : 'Agent access revoked' });
    },
    onError: (error) => toast({
      title: ar ? 'تعذر إلغاء الربط' : 'Could not revoke agent',
      description: getErrorMessage(error),
      variant: 'destructive',
    }),
  });

  const copyCode = async () => {
    if (!pairing?.code) return;
    try {
      await navigator.clipboard.writeText(pairing.code);
      setCopied(true);
      toast({ title: ar ? 'تم نسخ الرمز' : 'Code copied' });
    } catch {
      toast({ title: ar ? 'تعذر النسخ' : 'Could not copy', description: ar ? 'انسخ الرمز يدويًا.' : 'Copy the code manually.' });
    }
  };

  const agents = agentsQuery.data || [];
  const statusLabel = (status?: string) => {
    if (status === 'online') return ar ? 'متصل' : 'Online';
    if (status === 'degraded') return ar ? 'يعمل مع تنبيه' : 'Degraded';
    return ar ? 'غير متصل' : 'Offline';
  };

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Laptop size={19} />{ar ? 'الـConnector المحلي' : 'Local Connector'}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {ar
              ? 'ثبّت الـAgent على جهاز داخل شبكة الشركة. هو الذي يتصل بأجهزة ZKTeco محليًا ويرسل سجلات الحضور إلى ERP عبر HTTPS؛ لا يحتاج خادم SaaS للوصول إلى IP داخلي.'
              : 'Install the agent on a computer inside the company LAN. It reads ZKTeco terminals locally and sends attendance to ERP over HTTPS; the SaaS server never needs access to private device IPs.'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => createCode.mutate()} disabled={createCode.isPending}>
              {createCode.isPending ? <RefreshCw size={16} className="me-2 animate-spin" /> : <ShieldCheck size={16} className="me-2" />}
              {ar ? 'إنشاء رمز ربط لمرة واحدة' : 'Generate one-time pairing code'}
            </Button>
            <Button variant="outline" onClick={() => void agentsQuery.refetch()} disabled={agentsQuery.isFetching}>
              <RefreshCw size={15} className={`me-2 ${agentsQuery.isFetching ? 'animate-spin' : ''}`} />{ar ? 'تحديث الحالة' : 'Refresh status'}
            </Button>
          </div>

          {agentsQuery.isError && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-3 text-sm text-muted-foreground">
              {ar
                ? `واجهة الـAgent غير متاحة من API الحالي (${getErrorMessage(agentsQuery.error)}). يلزم نشر مسارات biometric-agent الموضحة في docs/biometric-local-agent.md على Backend الـERP.`
                : `The current API does not expose the agent endpoints (${getErrorMessage(agentsQuery.error)}). Deploy the biometric-agent routes documented in docs/biometric-local-agent.md to the ERP backend.`}
            </div>
          )}

          {pairing && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{ar ? 'رمز مؤقت — استخدمه مرة واحدة فقط' : 'Temporary code — redeem it once only'}</p>
                  {pairing.expires_at && <p className="text-xs text-muted-foreground">{ar ? 'ينتهي:' : 'Expires:'} {new Date(pairing.expires_at).toLocaleString()}</p>}
                </div>
                <Button variant="outline" size="sm" onClick={() => void copyCode()}>{copied ? <Check size={15} className="me-2" /> : <Copy size={15} className="me-2" />}{copied ? (ar ? 'تم النسخ' : 'Copied') : (ar ? 'نسخ' : 'Copy')}</Button>
              </div>
              <code dir="ltr" className="block break-all rounded bg-background p-3 text-lg font-semibold tracking-wider">{pairing.code}</code>
              <p className="text-sm text-muted-foreground">
                {ar ? 'على كمبيوتر داخل الشبكة، نزّل مجلد agent من المستودع ثم شغّل:' : 'On a computer inside the LAN, download the agent folder from the repository and run:'}
              </p>
              <pre dir="ltr" className="overflow-x-auto rounded bg-muted p-3 text-xs">{`python -m pip install ./agent\npython -m erp_biometric_agent pair --api-url ${window.location.origin}/api --code ${pairing.code}\npython -m erp_biometric_agent run`}</pre>
              <p className="text-xs text-muted-foreground">{ar ? 'لا تشارك الرمز. يُخزَّن الـToken محليًا بصلاحية المستخدم فقط، ولا يُعرض مرة أخرى.' : 'Do not share the code. The agent token is saved locally with owner-only permissions and is never shown again.'}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2"><Wifi size={18} />{ar ? 'الأجهزة المرتبطة' : 'Paired agents'}</CardTitle>
          <Badge variant="outline">{agents.length}</Badge>
        </CardHeader>
        <CardContent>
          {agentsQuery.isLoading ? <p className="text-sm text-muted-foreground">{ar ? 'جاري التحميل...' : 'Loading...'}</p> : agents.length ? (
            <div className="space-y-2">
              {agents.map((agent) => {
                const online = agent.status === 'online';
                return <div key={agent.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    {online ? <Wifi size={17} className="text-emerald-600" /> : <WifiOff size={17} className="text-muted-foreground" />}
                    <div><p className="font-medium">{agent.name || agent.id}</p><p className="text-xs text-muted-foreground">{ar ? 'آخر اتصال:' : 'Last seen:'} {agent.last_seen_at ? new Date(agent.last_seen_at).toLocaleString() : '—'}{agent.version ? ` · v${agent.version}` : ''}</p></div>
                  </div>
                  <div className="flex items-center gap-2"><Badge variant={online ? 'default' : 'secondary'}>{statusLabel(agent.status)}</Badge>{typeof agent.pending_events === 'number' && <span className="text-xs text-muted-foreground">{agent.pending_events} {ar ? 'في الانتظار' : 'pending'}</span>}<Button size="sm" variant="outline" disabled={revokeAgent.isPending} onClick={() => { if (window.confirm(ar ? 'سيُمنع هذا الـAgent من الاتصال. هل تريد المتابعة؟' : 'This agent will no longer be able to connect. Continue?')) revokeAgent.mutate(agent.id); }}><Trash2 size={14} className="me-1" />{ar ? 'إلغاء' : 'Revoke'}</Button></div>
                </div>;
              })}
            </div>
          ) : <div className="py-6 text-center text-sm text-muted-foreground">{ar ? 'لا يوجد Agent مرتبط بعد.' : 'No agent paired yet.'}</div>}
        </CardContent>
      </Card>
      <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground"><Download size={15} className="mt-0.5 shrink-0" />{ar ? 'حاليًا يدعم الـAgent أجهزة ZKTeco عبر بروتوكول TCP/UDP. أبقِ كمبيوتر الـAgent قيد التشغيل، واضبط IP والمنفذ في تبويب الأجهزة.' : 'The agent currently supports ZKTeco terminals over TCP/UDP. Keep the agent computer running and configure device IP/port in the Devices tab.'}</div>
    </div>
  );
}
