import { useMemo, useState } from 'react';
import { Bot, Send, Sparkles, User, AlertCircle, RotateCcw } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';

type Row = Record<string, unknown>;
type Message = { role: 'user' | 'assistant' | 'error'; content: string; data?: Row[] };

const examples = {
  ar: ['كم عدد العملاء لدينا؟', 'اعرض العملاء الذين لم تتم متابعتهم هذا الشهر', 'ما إجمالي المبيعات لكل فرع؟'],
  en: ['How many customers do we have?', 'Show customers not contacted this month', 'What are total sales by branch?'],
};

export default function AIAssistant() {
  const { language, direction } = useLanguage();
  const isArabic = language === 'ar';
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const suggestions = useMemo(() => examples[language], [language]);

  const send = async (value = input) => {
    const message = value.trim();
    if (!message || loading) return;
    const history = messages.filter(m => m.role !== 'error').slice(-8).map(m => ({ role: m.role, content: m.content }));
    setInput(''); setLoading(true); setMessages(prev => [...prev, { role: 'user', content: message }]);
    try {
      const { data } = await api.post('/ai/chat', { message, history });
      setMessages(prev => [...prev, { role: 'assistant', content: data.answer, data: data.data || [] }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'error', content: error?.response?.data?.message || (isArabic ? 'تعذر تنفيذ الطلب، حاول مرة أخرى.' : 'The request could not be completed. Please try again.') }]);
    } finally { setLoading(false); }
  };

  const clear = () => setMessages([]);
  return <MainLayout>
    <div dir={direction} className="mx-auto flex h-full max-w-6xl flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <div><div className="mb-1 flex items-center gap-2 text-sm font-medium text-primary"><Sparkles size={16} /> {isArabic ? 'مساعد البيانات الذكي' : 'AI Data Assistant'}</div><h1 className="text-3xl font-bold tracking-tight">{isArabic ? 'اسأل نظامك' : 'Ask your ERP'}</h1><p className="mt-1 text-muted-foreground">{isArabic ? 'إجابات مبنية على بياناتك الفعلية وبوضع قراءة فقط.' : 'Answers grounded in your live data, in read-only mode.'}</p></div>
        <Button variant="outline" onClick={clear} disabled={!messages.length}><RotateCcw size={16} className="me-2" />{isArabic ? 'محادثة جديدة' : 'New chat'}</Button>
      </div>
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden border-primary/10 shadow-lg">
        {!messages.length ? <div className="flex flex-1 flex-col items-center justify-center p-8 text-center"><div className="mb-5 rounded-2xl bg-primary/10 p-4 text-primary"><Bot size={36} /></div><h2 className="text-xl font-semibold">{isArabic ? 'كيف يمكنني مساعدتك؟' : 'How can I help?'}</h2><p className="mt-2 max-w-lg text-muted-foreground">{isArabic ? 'اطرح أي سؤال عن العملاء والمبيعات والمخزون والتقارير. سأبحث في قاعدة البيانات بأمان.' : 'Ask anything about customers, sales, inventory, and reports. I will query the database safely.'}</p><div className="mt-7 grid w-full max-w-2xl gap-3 sm:grid-cols-3">{suggestions.map(item => <button key={item} onClick={() => send(item)} className="rounded-xl border bg-background p-4 text-start text-sm transition hover:border-primary hover:bg-primary/5">{item}</button>)}</div></div> : <ScrollArea className="flex-1 p-5"><div className="mx-auto flex max-w-3xl flex-col gap-5">{messages.map((m, i) => <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}><div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${m.role === 'user' ? 'bg-primary text-primary-foreground' : m.role === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{m.role === 'user' ? <User size={16} /> : m.role === 'error' ? <AlertCircle size={16} /> : <Bot size={16} />}</div><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-7 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : m.role === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}><p className="whitespace-pre-wrap">{m.content}</p>{m.data?.length ? <div className="mt-3 max-w-full overflow-x-auto rounded-lg border bg-background text-foreground"><table className="w-full text-xs"><thead className="bg-muted"><tr>{Object.keys(m.data[0]).map(k => <th key={k} className="whitespace-nowrap px-3 py-2 text-start font-semibold">{k}</th>)}</tr></thead><tbody>{m.data.slice(0, 100).map((row, ri) => <tr key={ri} className="border-t">{Object.keys(m.data![0]).map(k => <td key={k} className="whitespace-nowrap px-3 py-2">{String(row[k] ?? '—')}</td>)}</tr>)}</tbody></table></div> : null}</div></div>)}{loading && <div className="flex items-center gap-3 text-sm text-muted-foreground"><Bot size={18} className="text-primary" /><span className="animate-pulse">{isArabic ? 'أحلل سؤالك وأبحث في البيانات…' : 'Analyzing your question and searching the data…'}</span></div>}</div></ScrollArea>}
        <div className="border-t bg-muted/20 p-4"><div className="mx-auto flex max-w-3xl items-end gap-3"><Textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={isArabic ? 'اكتب سؤالك هنا…' : 'Ask a question about your business…'} className="min-h-[52px] resize-none bg-background" disabled={loading} /><Button onClick={() => send()} disabled={loading || !input.trim()} size="icon" className="h-[52px] w-[52px] shrink-0"><Send size={18} /></Button></div><p className="mx-auto mt-2 max-w-3xl text-[11px] text-muted-foreground">{isArabic ? 'المساعد للقراءة فقط. لا يمكنه تعديل أو حذف بياناتك.' : 'Read-only assistant. It cannot modify or delete your data.'}</p></div>
      </Card>
    </div>
  </MainLayout>;
}
