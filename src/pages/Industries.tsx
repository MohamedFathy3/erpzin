import { useMemo, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2, Factory, HardHat, Search, Boxes, Users, Wallet, BarChart3, Link2, CheckCircle2 } from 'lucide-react';

const sectors = [
  { id: 'general', name: 'ERP أساسي متعدد القطاعات', nameEn: 'Core ERP', icon: Building2, color: 'from-blue-500 to-cyan-500', modules: ['المبيعات', 'المشتريات', 'المخزون', 'المالية', 'CRM', 'الموارد البشرية'] },
  { id: 'manufacturing', name: 'المصانع والتصنيع', nameEn: 'Manufacturing', icon: Factory, color: 'from-violet-500 to-fuchsia-500', modules: ['أوامر الإنتاج', 'قوائم المواد BOM', 'مراكز العمل', 'التكاليف الصناعية', 'فحص الجودة', 'الصيانة'] },
  { id: 'contracting', name: 'المقاولات والمشروعات', nameEn: 'Contracting & Projects', icon: HardHat, color: 'from-amber-500 to-orange-500', modules: ['المشروعات', 'المستخلصات', 'بنود الأعمال', 'المقاولون', 'الموارد والمعدات', 'التدفقات النقدية'] },
  { id: 'retail', name: 'التجزئة ونقاط البيع', nameEn: 'Retail & POS', icon: Boxes, color: 'from-emerald-500 to-teal-500', modules: ['POS', 'العروض', 'الولاء', 'الفروع', 'التحويلات', 'الجرد'] },
  { id: 'services', name: 'الخدمات والوكالات', nameEn: 'Services & Agencies', icon: Users, color: 'from-pink-500 to-rose-500', modules: ['العملاء', 'عقود الخدمة', 'ساعات العمل', 'الفوترة الدورية', 'التذاكر', 'مؤشرات الأداء'] },
  { id: 'distribution', name: 'التوزيع والجملة', nameEn: 'Distribution & Wholesale', icon: Wallet, color: 'from-sky-500 to-indigo-500', modules: ['المندوبون', 'خطوط السير', 'تسعير الجملة', 'حدود الائتمان', 'التحصيل', 'المخازن'] },
];

const sharedModules = ['العملاء والموردون', 'المبيعات والمشتريات', 'المخزون والمخازن', 'الحسابات العامة', 'الخزائن والبنوك', 'الموارد البشرية', 'التقارير ولوحات المؤشرات', 'الصلاحيات وسجل النشاط'];

export default function Industries() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState('manufacturing');
  const filtered = useMemo(() => sectors.filter((sector) => `${sector.name} ${sector.nameEn}`.toLowerCase().includes(query.toLowerCase())), [query]);
  const selected = sectors.find((sector) => sector.id === active) || sectors[0];
  const SelectedIcon = selected.icon;

  return (
    <MainLayout>
      <div className="space-y-6" dir="rtl">
        <div className="rounded-2xl bg-gradient-to-l from-[#101a3b] via-[#18255a] to-[#273a8a] p-6 text-white shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge className="mb-3 border-white/20 bg-white/10 text-white">Fusion X ERP · Multi-Industry</Badge>
              <h1 className="text-3xl font-extrabold tracking-tight">منصة واحدة، قطاعات بلا حدود</h1>
              <p className="mt-2 max-w-2xl text-blue-100">فعّل الوحدات التي يحتاجها نشاطك، واجعل كل معاملة تنتقل تلقائياً إلى المخزون والمالية والعملاء والتقارير.</p>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-sm backdrop-blur">
              <Link2 className="text-cyan-300" size={22} />
              <span>ترابط البيانات مفعّل من المصدر حتى التقرير</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-xl font-bold">اختر قطاعك</h2><p className="text-sm text-muted-foreground">ابدأ بالقالب المناسب ثم وسّع النظام مع نمو أعمالك.</p></div>
          <div className="relative w-full sm:w-80"><Search className="absolute right-3 top-3 text-muted-foreground" size={18} /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ابحث عن قطاع..." className="pr-10" /></div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((sector) => {
            const Icon = sector.icon;
            const isActive = sector.id === selected.id;
            return <button key={sector.id} onClick={() => setActive(sector.id)} className={`text-right transition-all ${isActive ? 'scale-[1.01]' : ''}`}>
              <Card className={`h-full border-2 ${isActive ? 'border-primary shadow-lg' : 'border-transparent hover:border-primary/30'}`}>
                <CardHeader><div className="flex items-center justify-between"><div className={`rounded-xl bg-gradient-to-br ${sector.color} p-3 text-white`}><Icon size={24} /></div><Badge variant={isActive ? 'default' : 'secondary'}>{sector.modules.length} وحدات</Badge></div><CardTitle className="pt-2">{sector.name}</CardTitle><p className="text-xs text-muted-foreground" dir="ltr">{sector.nameEn}</p></CardHeader>
                <CardContent><div className="flex flex-wrap gap-2">{sector.modules.slice(0, 4).map((module) => <Badge key={module} variant="outline">{module}</Badge>)}</div></CardContent>
              </Card>
            </button>;
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><SelectedIcon className="text-primary" size={22} /> وحدات {selected.name}</CardTitle></CardHeader><CardContent><div className="grid gap-3 sm:grid-cols-2">{selected.modules.map((module) => <div key={module} className="flex items-center gap-2 rounded-lg border bg-muted/30 p-3"><CheckCircle2 className="text-emerald-500" size={18} /><span>{module}</span></div>)}</div><Button className="mt-5 w-full">تجهيز قالب القطاع</Button></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="text-primary" size={22} /> النواة المشتركة لكل القطاعات</CardTitle></CardHeader><CardContent><div className="grid gap-2">{sharedModules.map((module) => <div key={module} className="flex items-center gap-2 border-b py-2 last:border-0"><CheckCircle2 className="text-cyan-500" size={17} /><span className="text-sm">{module}</span></div>)}</div></CardContent></Card>
        </div>
      </div>
    </MainLayout>
  );
}
