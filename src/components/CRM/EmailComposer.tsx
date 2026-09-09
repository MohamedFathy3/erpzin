import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';
import { toast } from 'sonner';
export default function EmailComposer() { const [customerId,setCustomerId]=useState(''); const [subject,setSubject]=useState(''); const [body,setBody]=useState(''); const [loading,setLoading]=useState(false); const send=async()=>{setLoading(true);try{await api.post(`/crm/email/customers/${customerId}/send`,{subject,body});toast.success('تم وضع البريد في قائمة الإرسال');setSubject('');setBody('');}catch{toast.error('تعذر إرسال البريد')}finally{setLoading(false)}};return <div className="max-w-2xl space-y-4" dir="rtl"><div><Label>رقم العميل</Label><Input value={customerId} onChange={e=>setCustomerId(e.target.value)} placeholder="Customer ID" dir="ltr" /></div><div><Label>الموضوع</Label><Input value={subject} onChange={e=>setSubject(e.target.value)} /></div><div><Label>نص البريد</Label><Textarea value={body} onChange={e=>setBody(e.target.value)} rows={8} /></div><Button disabled={!customerId||!subject||!body||loading} onClick={send}>{loading?'جاري الإرسال...':'إرسال البريد'}</Button></div> }
