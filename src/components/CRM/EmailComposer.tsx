import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';

type Customer = {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
};

export default function EmailComposer() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.post('/customer/index', { paginate: false, perPage: 500 })
      .then((response) => {
        const data = response.data?.data;
        const rows = Array.isArray(data) ? data : data?.data ?? [];
        if (!cancelled) setCustomers(rows.filter((customer: Customer) => customer.email));
      })
      .catch(() => {
        if (!cancelled) toast.error('تعذر تحميل العملاء');
      })
      .finally(() => {
        if (!cancelled) setLoadingCustomers(false);
      });
    return () => { cancelled = true; };
  }, []);

  const send = async () => {
    if (!customerId || !subject.trim() || !body.trim()) return;
    setLoading(true);
    try {
      await api.post(`/crm/customers/${customerId}/send-email`, { subject, body });
      toast.success('تم وضع البريد في قائمة الإرسال');
      setCustomerId('');
      setSubject('');
      setBody('');
    } catch {
      toast.error('تعذر إرسال البريد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-4" dir="rtl">
      <div>
        <Label htmlFor="crm-customer">العميل</Label>
        <select
          id="crm-customer"
          className="mt-1 flex h-10 w-full rounded-md border bg-background px-3 text-sm"
          value={customerId}
          onChange={(event) => setCustomerId(event.target.value)}
          disabled={loadingCustomers}
        >
          <option value="">{loadingCustomers ? 'جاري تحميل العملاء...' : 'اختر العميل'}</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name} — {customer.email}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="crm-email-subject">الموضوع</Label>
        <Input id="crm-email-subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
      </div>
      <div>
        <Label htmlFor="crm-email-body">نص البريد</Label>
        <Textarea id="crm-email-body" value={body} onChange={(event) => setBody(event.target.value)} rows={8} />
      </div>
      <Button disabled={!customerId || !subject.trim() || !body.trim() || loading} onClick={send}>
        {loading ? 'جاري الإرسال...' : 'إرسال البريد'}
      </Button>
    </div>
  );
}
