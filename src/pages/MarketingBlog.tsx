import { ArrowLeft, BookOpen, Clock3 } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { marketingArticles } from '@/data/marketingArticles';
import MarketingLayout from '@/components/marketing/MarketingLayout';
import MarketingSEO from '@/components/marketing/MarketingSEO';

export function BlogIndex() {
  return (
    <MarketingLayout>
      <MarketingSEO
        title="مقالات Fusion ERP | أدلة عملية لإدارة الأعمال"
        description="مقالات وأدلة عملية عن إدارة المخزون ونقاط البيع وCRM والحسابات باستخدام نظام ERP مترابط."
        path="/blog"
        keywords={['مقالات ERP', 'إدارة المخزون', 'نظام نقاط البيع', 'CRM عربي', 'حسابات الشركات']}
        schema={{ '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'مدونة Fusion ERP' }}
      />
      <main className="marketing-page-shell">
        <section className="marketing-page-hero">
          <span className="marketing-eyebrow"><BookOpen className="h-4 w-4" /> معرفة عملية لشغل أوضح</span>
          <h1>أفكار تساعدك تدير <span className="marketing-gradient-text">شغلك بثقة</span></h1>
          <p>مقالات قصيرة وواضحة عن موديولات ERP وكيفية ربطها بالعمل اليومي لفريقك.</p>
        </section>
        <section className="marketing-article-grid" aria-label="مقالات Fusion ERP">
          {marketingArticles.map((article, index) => (
            <article key={article.slug} className="marketing-article-card" style={{ animationDelay: `${index * 70}ms` }}>
              <div className="flex items-center justify-between gap-3">
                <span className="marketing-tag">{article.category}</span>
                <span className="flex items-center gap-1 text-xs text-slate-400"><Clock3 className="h-3.5 w-3.5" />{article.readingTime}</span>
              </div>
              <h2>{article.title}</h2>
              <p>{article.excerpt}</p>
              <Link className="marketing-text-link" to={`/blog/${article.slug}`}>اقرأ المقال <ArrowLeft className="h-4 w-4" /></Link>
            </article>
          ))}
        </section>
        <section className="marketing-article-cta">
          <div><p className="marketing-eyebrow">جاهز لتجربة النظام؟</p><h2>ابدأ بخطوة صغيرة، وشوف الصورة كاملة.</h2></div>
          <Button asChild className="marketing-primary-button"><Link to="/signup">ابدأ تجربتك المجانية <ArrowLeft className="mr-2 h-4 w-4" /></Link></Button>
        </section>
      </main>
    </MarketingLayout>
  );
}

export function BlogArticlePage() {
  const { slug } = useParams();
  const article = marketingArticles.find((item) => item.slug === slug);

  if (!article) return <Navigate to="/blog" replace />;

  const canonicalPath = `/blog/${article.slug}`;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.excerpt,
    inLanguage: 'ar',
    author: { '@type': 'Organization', name: 'Fusion X.tech' },
    publisher: { '@type': 'Organization', name: 'Fusion X.tech' },
    mainEntityOfPage: new URL(canonicalPath, `${(import.meta.env.VITE_SITE_URL || 'https://fusionerp.systems').replace(/\/+$/, '')}/`).toString()
  };

  return (
    <MarketingLayout>
      <MarketingSEO
        title={`${article.title} | Fusion ERP`}
        description={article.excerpt}
        path={canonicalPath}
        keywords={[article.category, 'Fusion ERP', 'ERP عربي', 'إدارة الأعمال']}
        schema={schema}
      />
      <main className="marketing-page-shell">
        <article className="marketing-article-detail">
          <Link to="/blog" className="marketing-back-link"><ArrowLeft className="h-4 w-4" /> كل المقالات</Link>
          <header className="marketing-article-header">
            <span className="marketing-tag">{article.category}</span>
            <h1>{article.title}</h1>
            <p>{article.excerpt}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm text-slate-400"><Clock3 className="h-4 w-4" />{article.readingTime} قراءة</span>
          </header>
          <div className="marketing-prose">
            {article.sections.map((section) => (
              <section key={section.heading}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && <ul>{section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>}
              </section>
            ))}
          </div>
          <aside className="marketing-article-cta">
            <div><p className="marketing-eyebrow">خلّينا نرتبها سوا</p><h2>شوف كيف تتصل موديولات Fusion ERP في نشاطك.</h2></div>
            <Button asChild className="marketing-primary-button"><Link to="/signup">جرّب Fusion ERP <ArrowLeft className="mr-2 h-4 w-4" /></Link></Button>
          </aside>
        </article>
      </main>
    </MarketingLayout>
  );
}
