import { useState, type FormEvent } from 'react';
import { ArrowLeft, BarChart3, Boxes, CalendarDays, Check, CheckCircle2, CircleDollarSign, Factory, MessageCircle, Network, Play, ShieldCheck, ShoppingCart, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import MarketingSEO from '@/components/marketing/MarketingSEO';
import { marketingArticles } from '@/data/marketingArticles';

const whatsappLink = (message: string) => `https://wa.me/201064621943?text=${encodeURIComponent(message)}`;

const features = [
  { icon: ShoppingCart, title: 'المبيعات ونقاط البيع', text: 'تابع البيع من عرض السعر إلى الفاتورة، وخلي شاشة الكاشير واضحة وسريعة وقت الزحمة.' },
  { icon: Boxes, title: 'المخزون والمشتريات', text: 'اربط الأصناف والمستودعات وحركة الشراء والبيع في صورة واحدة أسهل للمراجعة.' },
  { icon: CircleDollarSign, title: 'الحسابات والتقارير', text: 'راجع المستندات والأرصدة والتقارير المالية ضمن دورة العمل نفسها.' },
  { icon: Users, title: 'CRM والعملاء', text: 'اجمع بيانات العميل والفرص والأنشطة حتى يعرف الفريق الخطوة التالية.' },
  { icon: Factory, title: 'التصنيع والإنتاج', text: 'نظّم أوامر الإنتاج ومكوّنات المنتج وتابع تقدم التشغيل.' },
  { icon: CalendarDays, title: 'المهام والمواعيد', text: 'رتّب مسؤوليات الفريق ومواعيده حتى لا تضيع المتابعة بين المحادثات.' },
  { icon: Network, title: 'الفروع والصلاحيات', text: 'إدارة أوضح للفروع والمستخدمين، مع صلاحيات تناسب دور كل عضو.' },
  { icon: ShieldCheck, title: 'خدمات السيارات', text: 'تابع استقبال المركبات وأعمال الخدمة وارتباطها بالعميل والفاتورة.' }
];

const clientLogos = [
  { name: 'TLG WSA Elite', src: '/client-logos/tlg-wsa-elite.png' },
  { name: 'WSA Pay', src: '/client-logos/wsa-pay.png' },
  { name: 'Cornerstone Marine', src: '/client-logos/cornerstone-marine.png' }
];

const plans = [
  { name: 'انطلاقة', amount: '2,000', segment: 'للشركة التي تريد ترتيب الأساسيات من أول يوم', accent: false },
  { name: 'نمو', amount: '4,000', segment: 'للفريق الذي يكبر وتزيد معه تفاصيل التشغيل', accent: true },
  { name: 'توسع', amount: '6,000', segment: 'للأعمال متعددة الفرق والعمليات', accent: false }
] as const;

const includedInEveryPlan = [
  'جميع موديولات Fusion ERP المتاحة',
  'المبيعات والمخزون والحسابات والعملاء',
  'لوحات وتقارير مترابطة لإدارة العمل'
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <span className="marketing-eyebrow"><span className="marketing-eyebrow-dot" />{children}</span>;
}

function SectionTitle({ eyebrow, title, description, centered = false }: { eyebrow: string; title: string; description?: string; centered?: boolean }) {
  return (
    <div className={`marketing-section-heading ${centered ? 'text-center mx-auto' : ''}`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

function ClientStrip() {
  return (
    <section className="marketing-client-section" aria-labelledby="client-heading">
      <div className="marketing-content-wrap">
        <div className="marketing-client-intro">
          <Eyebrow>علاقات مبنية على الثقة</Eyebrow>
          <h2 id="client-heading">شركات تعامل معها فريق Fusion X.tech</h2>
          <p>شعارات منشورة ضمن صفحة عملاء Fusion X.tech، ونشاركها هنا كخبرة للفريق لا كتقييمات أو توصيات مختلقة.</p>
        </div>
        <div className="marketing-client-logos">
          {clientLogos.map((client) => (
            <div className="marketing-client-logo" key={client.name}>
              <img src={client.src} alt={client.name} loading="lazy" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`marketing-pricing-grid ${compact ? 'marketing-pricing-grid-compact' : ''}`}>
      {plans.map((plan) => (
        <article className={`marketing-plan-card ${plan.accent ? 'marketing-plan-featured' : ''}`} key={plan.name}>
          {plan.accent && <span className="marketing-plan-ribbon">اختيار مناسب للنمو</span>}
          <div className="marketing-plan-topline"><span>{plan.name}</span><span className="marketing-plan-icon"><CheckCircle2 className="h-4 w-4" /></span></div>
          <p className="marketing-plan-segment">{plan.segment}</p>
          <p className="marketing-plan-price"><strong>{plan.amount}</strong><span>جنيه مصري <small>/ شهريًا</small></span></p>
          <div className="marketing-plan-includes">
            {includedInEveryPlan.map((item) => <p key={item}><Check className="h-4 w-4" />{item}</p>)}
          </div>
          <Button asChild className={plan.accent ? 'marketing-primary-button w-full' : 'marketing-secondary-button w-full'}>
            <a href={whatsappLink(`مرحبًا، أريد معرفة تفاصيل باقة ${plan.name} الشهرية بقيمة ${plan.amount} جنيه من Fusion ERP.`)} target="_blank" rel="noreferrer">
              اسأل عن الباقة <ArrowLeft className="mr-2 h-4 w-4" />
            </a>
          </Button>
        </article>
      ))}
    </div>
  );
}

function HomeHero() {
  return (
    <section className="marketing-hero">
      <div className="marketing-hero-glow marketing-hero-glow-one" />
      <div className="marketing-hero-glow marketing-hero-glow-two" />
      <div className="marketing-content-wrap marketing-hero-grid">
        <div className="marketing-hero-copy">
          <Badge className="marketing-hero-badge"><Sparkles className="ml-2 h-4 w-4" /> نظام ERP يفهم يومك</Badge>
          <h1>شغلك يستحق <span>صورة أوضح</span></h1>
          <p className="marketing-hero-lead">المبيعات، المخزون، الحسابات والعملاء… كلهم في مكان واحد. Fusion ERP يساعد فريقك يشتغل بهدوء، ويتابع التفاصيل من غير ما يضيع بين أنظمة وجداول متفرقة.</p>
          <div className="marketing-hero-actions">
            <Button asChild className="marketing-primary-button marketing-large-button"><Link to="/signup">ابدأ تجربتك المجانية <ArrowLeft className="mr-2 h-4 w-4" /></Link></Button>
            <a href="#product-video" className="marketing-watch-link"><span><Play className="h-4 w-4 fill-current" /></span>شاهد شرح النظام</a>
          </div>
          <div className="marketing-hero-points"><span><CheckCircle2 className="h-4 w-4" /> 5 أيام للتجربة</span><span><CheckCircle2 className="h-4 w-4" /> بدون بطاقة ائتمان</span></div>
        </div>
        <div className="marketing-hero-visual">
          <div className="marketing-photo-frame"><img src="/fusion-erp-team.jpg" alt="فريق عمل يتعاون حول نظام Fusion ERP في مكتب مصري" width="1408" height="792" fetchPriority="high" /></div>
          <div className="marketing-hero-floating-card"><span className="marketing-live-dot" /><div><strong>شغل مترابط</strong><small>من أول طلب لحد التقرير</small></div><div className="marketing-floating-bars" aria-hidden="true"><i /><i /><i /><i /><i /></div></div>
          <div className="marketing-hero-sticker"><span>ببساطة</span><strong>كل فريق<br />عارف دوره</strong></div>
        </div>
      </div>
      <div className="marketing-hero-bottomline"><span>نظام عملي لفرق حقيقية</span><span>إدارة أوضح. نمو أهدأ.</span></div>
    </section>
  );
}

export function Home() {
  return (
    <MarketingLayout>
      <MarketingSEO title="Fusion ERP | نظام ERP متكامل لإدارة الشركات" description="نظّم المبيعات والمخزون والحسابات والعملاء في نظام ERP عربي واحد. جرّب Fusion ERP مجانًا لمدة 5 أيام." path="/" keywords={['نظام ERP في مصر', 'برنامج إدارة الشركات', 'نظام مخازن ومبيعات', 'Fusion ERP', 'نظام ERP عربي']} schema={{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Fusion ERP', applicationCategory: 'BusinessApplication', operatingSystem: 'Web', description: 'نظام ERP لإدارة المبيعات والمخزون والحسابات والعملاء.' }} />
      <main>
        <HomeHero />
        <ClientStrip />
        <section className="marketing-section marketing-section-light">
          <div className="marketing-content-wrap">
            <SectionTitle eyebrow="كل التفاصيل تتكلم مع بعض" title="موديولات تخلي الشغل أوضح" description="ابدأ من أول عملية في يومك، وشوف أثرها في بقية النظام من غير نقل البيانات يدويًا بين أدوات متفرقة." />
            <div className="marketing-feature-grid">
              {features.map((item, index) => {
                const Icon = item.icon;
                return <article className="marketing-feature-card" key={item.title} style={{ animationDelay: `${index * 55}ms` }}><span className="marketing-feature-icon"><Icon className="h-5 w-5" /></span><h3>{item.title}</h3><p>{item.text}</p></article>;
              })}
            </div>
            <div className="marketing-inline-link-wrap"><Link className="marketing-text-link" to="/services">استكشف كل الموديولات <ArrowLeft className="h-4 w-4" /></Link></div>
          </div>
        </section>
        <section className="marketing-video-section" id="product-video">
          <div className="marketing-content-wrap marketing-video-grid">
            <div className="marketing-video-copy"><Eyebrow>شوف النظام على طبيعته</Eyebrow><h2>خد جولة سريعة قبل ما تبدأ</h2><p>فيديو يشرح طريقة العمل على Fusion ERP، من متابعة العمليات اليومية إلى رؤية التفاصيل في لوحة واحدة.</p><Button asChild className="marketing-secondary-button"><Link to="/signup">جرّب بنفسك <ArrowLeft className="mr-2 h-4 w-4" /></Link></Button></div>
            <div className="marketing-video-frame"><iframe src="https://www.youtube-nocookie.com/embed/ZwEeCs5D5KA" title="شرح Fusion ERP" loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
          </div>
        </section>
        <section className="marketing-section">
          <div className="marketing-content-wrap">
            <SectionTitle eyebrow="خطوات بسيطة" title="ابدأ على مقاس فريقك" description="ما تحتاج تغير طريقة شغلك كلها مرة واحدة. ابدأ بالمعلومة الأهم، وبعدها وسّع الاستخدام بالتدريج." centered />
            <div className="marketing-steps-grid">{[
              ['01', 'احكيلنا عن شغلك', 'نفهم نشاطك وأهم نقطة تريد ترتيبها.'],
              ['02', 'شوف النظام على حالتك', 'نربط احتياجك بالموديولات المناسبة ونوضح طريقة التشغيل.'],
              ['03', 'ابدأ التجربة', 'أنشئ حسابك وجرّب النظام لمدة 5 أيام.']
            ].map(([number, title, text]) => <article className="marketing-step" key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
          </div>
        </section>

        <section className="marketing-section">
          <div className="marketing-content-wrap">
            <div className="marketing-pricing-heading"><SectionTitle eyebrow="اقرأ وتعلّم" title="مقالات تساعدك تختار بوعي" description="أدلة مبسطة عن الموديولات والعمليات اللي تعتمد عليها شركتك كل يوم." /><Link className="marketing-text-link" to="/blog">كل المقالات <ArrowLeft className="h-4 w-4" /></Link></div>
            <div className="marketing-article-grid marketing-home-articles">{marketingArticles.slice(0, 3).map((article) => <article key={article.slug} className="marketing-article-card"><span className="marketing-tag">{article.category}</span><h3>{article.title}</h3><p>{article.excerpt}</p><Link to={`/blog/${article.slug}`} className="marketing-text-link">اقرأ المقال <ArrowLeft className="h-4 w-4" /></Link></article>)}</div>
          </div>
        </section>
        <section className="marketing-final-cta"><div className="marketing-content-wrap"><span className="marketing-final-cta-icon"><Sparkles className="h-6 w-6" /></span><h2>خلّي إدارة شغلك أخف على فريقك.</h2><p>ابدأ بتجربة مجانية، ولو عندك سؤال إحنا قريبين على واتساب.</p><div><Button asChild className="marketing-primary-button marketing-large-button"><Link to="/signup">ابدأ التجربة المجانية <ArrowLeft className="mr-2 h-4 w-4" /></Link></Button><a href={whatsappLink('مرحبًا، أرغب في تجربة Fusion ERP ومعرفة التفاصيل.')} target="_blank" rel="noreferrer" className="marketing-light-link"><MessageCircle className="h-4 w-4" />اسألنا على واتساب</a></div></div></section>
      </main>
    </MarketingLayout>
  );
}

export function About() {
  return <MarketingLayout>
    <MarketingSEO title="عن Fusion ERP | نظام عملي لإدارة الأعمال" description="تعرف على Fusion ERP، النظام الذي يربط تفاصيل العمل اليومية ويساعد فرق الشركات العربية على العمل بوضوح." path="/about" keywords={['عن Fusion ERP', 'نظام إدارة الأعمال', 'برنامج ERP للشركات']} schema={{ '@context': 'https://schema.org', '@type': 'AboutPage', name: 'عن Fusion ERP' }} />
    <main className="marketing-page-shell">
      <section className="marketing-page-hero"><Eyebrow>عن Fusion ERP</Eyebrow><h1>وراء كل شركة شغل ناس،<br /><span className="marketing-gradient-text">مش أرقام وبس.</span></h1><p>بنينا Fusion ERP عشان التفاصيل اليومية تبقى أسهل للفريق، والإدارة تقدر تشوف الصورة من غير ما تدور عليها في أكتر من مكان.</p></section>
      <section className="marketing-about-grid"><article><span className="marketing-tag">رؤيتنا</span><h2>نخلّي التقنية تخدم يومك.</h2><p>النظام الجيد مش اللي يزود خطوات على الفريق. هو اللي يرتبها، يوضح المسؤوليات، ويربط المعلومة بالقرار المناسب.</p></article><article><span className="marketing-tag">طريقتنا</span><h2>نبدأ من احتياجك الحقيقي.</h2><p>كل نشاط له تفاصيله. لذلك نركز على فهم طريقة العمل، ثم نساعدك تختار الموديولات والخطوات التي تناسب فريقك.</p></article><article><span className="marketing-tag">وعدنا</span><h2>وضوح من أول يوم.</h2><p>معلوماتك وعملياتك في مساحة منظمة، مع متابعة أوضح بين المبيعات والمخزون والحسابات والعملاء.</p></article></section>
      <section className="marketing-about-visual"><img src="/fusion-erp-team.jpg" alt="فريق يعمل معًا في مكتب ويستعرض بيانات العمل" loading="lazy" /><div><Eyebrow>مساحة واحدة للفريق كله</Eyebrow><h2>لما كل فريق يشوف اللي يخصه، الشغل يمشي بسلاسة أكتر.</h2><p>من الكاشير والمستودع إلى الإدارة، كل شخص يقدر يتابع دوره ضمن دورة عمل مفهومة.</p><Button asChild className="marketing-primary-button"><Link to="/signup">ابدأ تجربتك <ArrowLeft className="mr-2 h-4 w-4" /></Link></Button></div></section>
    </main>
  </MarketingLayout>;
}

export function Services() {
  return <MarketingLayout>
    <MarketingSEO title="موديولات Fusion ERP | نظام متكامل لإدارة الشركات" description="تعرف على موديولات Fusion ERP للمبيعات والمخزون والحسابات والعملاء والتصنيع والفروع ونقاط البيع." path="/services" keywords={['موديولات ERP', 'مخزون ومبيعات', 'نظام POS', 'برنامج محاسبة ERP', 'CRM عربي']} />
    <main className="marketing-page-shell"><section className="marketing-page-hero"><Eyebrow>موديولات متصلة</Eyebrow><h1>كل عملية لها مكان،<br /><span className="marketing-gradient-text">وكل معلومة لها سياق.</span></h1><p>اختار من موديولات Fusion ERP ما يناسب نشاطك، وخلي العمليات اليومية تشتغل ضمن نظام واحد.</p></section><div className="marketing-feature-grid marketing-services-grid">{features.map((item) => { const Icon = item.icon; return <article className="marketing-feature-card" key={item.title}><span className="marketing-feature-icon"><Icon className="h-5 w-5" /></span><h2>{item.title}</h2><p>{item.text}</p></article>; })}</div><section className="marketing-services-article"><div><Eyebrow>دليل عملي</Eyebrow><h2>قبل اختيار أي نظام، ابدأ من طريقة شغلك.</h2><p>اطلع على مقالاتنا عن المخزون ونقاط البيع والحسابات وCRM، وخذ معك أسئلة واضحة قبل بدء التجربة.</p></div><Button asChild className="marketing-secondary-button"><Link to="/blog">اقرأ المقالات <ArrowLeft className="mr-2 h-4 w-4" /></Link></Button></section></main>
  </MarketingLayout>;
}

export function Pricing() {
  const faq = [
    ['هل كل الموديولات مشمولة في الباقات؟', 'نعم، الباقات الشهرية تشمل موديولات Fusion ERP المتاحة. نراجع معك تفاصيل التشغيل التي تناسب نشاطك قبل البدء.'],
    ['هل يمكن تجربة النظام قبل الاشتراك؟', 'نعم، تقدر تبدأ تجربة مجانية لمدة 5 أيام بدون بطاقة ائتمان.'],
    ['هل يوجد شراء دائم؟', 'نعم، تواصل معنا على واتساب لمعرفة تفاصيل الترخيص الدائم.'],
    ['هل يوجد دفع إلكتروني من الموقع؟', 'الاشتراك يتم بالتواصل مع فريقنا مباشرة. اضغط على زر واتساب لبدء المحادثة.']
  ];
  return <MarketingLayout>
    <MarketingSEO title="أسعار وباقات Fusion ERP | باقات شهرية بالجنيه المصري" description="قارن باقات Fusion ERP الشهرية: 2,000 أو 4,000 أو 6,000 جنيه مصري، وجميعها تشمل موديولات النظام المتاحة." path="/pricing" keywords={['أسعار ERP في مصر', 'باقات ERP شهرية', 'سعر نظام ERP', 'Fusion ERP']} schema={{ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faq.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }} />
    <main className="marketing-page-shell">
      <section className="marketing-page-hero marketing-pricing-hero"><Eyebrow>أسعار واضحة بالجنيه المصري</Eyebrow><h1>نظام كامل،<br /><span className="marketing-gradient-text">وباقة على قدّ شغلك.</span></h1><p>كل باقة شهرية تشمل موديولات Fusion ERP المتاحة. اختار مستوى يناسب حجم فريقك، وتواصل معنا لنرتب طريقة التشغيل المناسبة.</p></section>
      <PricingCards />
      <p className="marketing-pricing-note">الأسعار شهرية بالجنيه المصري. يتم تأكيد نطاق الإعداد والتفاصيل مع فريقنا قبل الاشتراك.</p>
      <section className="marketing-lifetime-panel"><div><span className="marketing-tag">ترخيص دائم</span><h2>تفضّل تدفع مرة واحدة؟</h2><p>خيارات الشراء الدائم تختلف حسب طريقة التشغيل واحتياج شركتك. كلمنا ونوضح لك التفاصيل قبل القرار.</p></div><Button asChild className="marketing-primary-button"><a href={whatsappLink('مرحبًا، أريد معرفة تفاصيل شراء Fusion ERP بشكل دائم.')} target="_blank" rel="noreferrer"><MessageCircle className="ml-2 h-4 w-4" />تواصل على واتساب</a></Button></section>
      <section className="marketing-faq"><SectionTitle eyebrow="إجابات مباشرة" title="أسئلة تتكرر قبل الاشتراك" /><div>{faq.map(([question, answer]) => <details key={question}><summary>{question}<span>+</span></summary><p>{answer}</p></details>)}</div></section>
    </main>
  </MarketingLayout>;
}

export function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      await api.post('/public/contact', form);
      toast.success('وصلتنا رسالتك، شكرًا لتواصلك');
      setForm({ name: '', email: '', phone: '', message: '' });
    } catch {
      toast.error('تعذر إرسال الرسالة. تواصل معنا مباشرة عبر واتساب.');
    } finally {
      setLoading(false);
    }
  };
  return <MarketingLayout>
    <MarketingSEO title="تواصل مع Fusion ERP | اسأل فريقنا" description="تواصل مع فريق Fusion ERP عبر واتساب أو أرسل سؤالك عن النظام والتجربة والباقات الشهرية." path="/contact" />
    <main className="marketing-page-shell marketing-contact-grid"><section className="marketing-contact-copy"><Eyebrow>إحنا قريبين</Eyebrow><h1>احكيلنا عن شغلك،<br /><span className="marketing-gradient-text">ونبدأ من هناك.</span></h1><p>مش لازم تكون عارف كل التفاصيل. ابعت سؤالك أو كلمنا على واتساب، وفريقنا يساعدك تحدد الخطوة المناسبة.</p><a className="marketing-contact-whatsapp" href={whatsappLink('مرحبًا، أريد التواصل مع فريق Fusion ERP.')} target="_blank" rel="noreferrer"><MessageCircle className="h-5 w-5" /><span><small>واتساب المبيعات</small><strong>+20 106 462 1943</strong></span><ArrowLeft className="mr-auto h-4 w-4" /></a></section><Card className="marketing-contact-card"><CardHeader><CardTitle>اكتب لنا رسالة</CardTitle><p className="text-sm text-slate-400">هنرجع لك للرد على استفسارك.</p></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div><Label htmlFor="contact-name">الاسم</Label><Input id="contact-name" className="mt-1" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div><Label htmlFor="contact-email">البريد الإلكتروني</Label><Input id="contact-email" className="mt-1" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div><div><Label htmlFor="contact-phone">رقم الموبايل</Label><Input id="contact-phone" className="mt-1" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div><div><Label htmlFor="contact-message">كيف نقدر نساعدك؟</Label><Textarea id="contact-message" className="mt-1 min-h-28" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div><Button disabled={loading} className="marketing-primary-button w-full">{loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}<ArrowLeft className="mr-2 h-4 w-4" /></Button></form></CardContent></Card></main>
  </MarketingLayout>;
}

export function Signup() {
  const [form, setForm] = useState({ company_name: '', full_name: '', email: '', phone: '', password: '', password_confirmation: '' });
  const [loading, setLoading] = useState(false);
  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/public/trial-signup', form);
      toast.success('تم إنشاء مساحة العمل وإرسال رسالة الترحيب');
      window.location.href = response.data.data.login_url;
    } catch (error: unknown) {
      const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || 'تعذر إنشاء التجربة');
    } finally {
      setLoading(false);
    }
  };
  const fields: Array<{ key: keyof typeof form; label: string; type: string; required?: boolean }> = [
    { key: 'company_name', label: 'اسم الشركة', type: 'text', required: true },
    { key: 'full_name', label: 'الاسم بالكامل', type: 'text', required: true },
    { key: 'email', label: 'البريد الإلكتروني', type: 'email', required: true },
    { key: 'phone', label: 'رقم الموبايل', type: 'tel' },
    { key: 'password', label: 'كلمة المرور', type: 'password', required: true },
    { key: 'password_confirmation', label: 'تأكيد كلمة المرور', type: 'password', required: true }
  ];
  return <MarketingLayout>
    <MarketingSEO title="ابدأ تجربة Fusion ERP المجانية | سجّل شركتك" description="أنشئ حسابك وجرّب Fusion ERP مجانًا لمدة 5 أيام بدون بطاقة ائتمان." path="/signup" keywords={['تجربة ERP مجانية', 'تجربة Fusion ERP', 'تسجيل نظام ERP']} schema={{ '@context': 'https://schema.org', '@type': 'WebPage', name: 'التسجيل في Fusion ERP' }} />
    <main className="marketing-page-shell marketing-signup-grid"><section className="marketing-signup-copy"><span className="marketing-signup-icon"><Sparkles className="h-6 w-6" /></span><Eyebrow>ابدأ على راحتك</Eyebrow><h1>جرّب النظام،<br /><span className="marketing-gradient-text">قبل ما تقرر.</span></h1><p>5 أيام لتشوف كيف تتصل المبيعات والمخزون والحسابات والعملاء في مساحة واحدة. ما فيش بطاقة ائتمان مطلوبة.</p><div className="marketing-signup-points"><span><CheckCircle2 className="h-4 w-4" /> كل الموديولات متاحة للتجربة</span><span><CheckCircle2 className="h-4 w-4" /> تسجيل بسيط وواضح</span><span><CheckCircle2 className="h-4 w-4" /> فريقنا قريب لو احتجت مساعدة</span></div></section><Card className="marketing-signup-card"><CardHeader><CardTitle>أنشئ مساحة عملك</CardTitle><p className="text-sm text-slate-400">املأ البيانات الأساسية ونبدأ.</p></CardHeader><CardContent><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">{fields.map((field) => <div key={field.key}><Label htmlFor={`signup-${field.key}`}>{field.label}</Label><Input id={`signup-${field.key}`} className="mt-1" type={field.type} autoComplete={field.key.includes('password') ? field.key : field.key === 'full_name' ? 'name' : field.key === 'company_name' ? 'organization' : field.key} required={field.required} value={form[field.key]} onChange={(event) => updateField(field.key, event.target.value)} /></div>)}<Button disabled={loading} className="marketing-primary-button mt-2 sm:col-span-2">{loading ? 'جاري إنشاء المساحة...' : 'إنشاء حساب التجربة'}<ArrowLeft className="mr-2 h-4 w-4" /></Button></form><p className="mt-5 text-center text-xs leading-6 text-slate-500">بالتسجيل، أنت توافق على شروط الاستخدام وسياسة الخصوصية.</p></CardContent></Card></main>
  </MarketingLayout>;
}
