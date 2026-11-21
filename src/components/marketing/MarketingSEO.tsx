import { useEffect } from 'react';

type Props = {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  schema?: Record<string, unknown>;
};

const SITE_ORIGIN = (import.meta.env.VITE_SITE_URL || 'https://fusionerp.systems').replace(/\/+$/, '');
const BRAND_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Fusion X.tech',
  alternateName: 'Fusion ERP',
  url: SITE_ORIGIN,
  logo: `${SITE_ORIGIN}/fusionx-logo.png`
};

const keywordMap: Record<string, string[]> = {
  '/': ['نظام ERP', 'ERP عربي', 'نظام إدارة الشركات', 'Fusion ERP', 'نظام نقاط البيع'],
  '/about': ['Fusion ERP', 'برنامج ERP للشركات', 'إدارة الأعمال العربية'],
  '/services': ['موديولات ERP', 'إدارة المخزون', 'نقاط البيع', 'CRM', 'الحسابات'],
  '/pricing': ['أسعار ERP في مصر', 'أسعار نظام ERP', 'باقات Fusion ERP'],
  '/contact': ['تواصل Fusion ERP', 'نظام ERP في مصر', 'استفسار ERP'],
  '/signup': ['تجربة ERP مجانية', 'تجربة Fusion ERP', 'نظام ERP للشركات'],
  '/blog': ['مقالات ERP', 'إدارة المخزون', 'نظام نقاط البيع', 'CRM عربي']
};

export default function MarketingSEO({ title, description, path, keywords = [], schema }: Props) {
  const pageKeywords = keywords.length ? keywords : keywordMap[path] || ['Fusion ERP', 'نظام ERP', 'إدارة الأعمال'];
  const keywordsContent = pageKeywords.join(', ');

  useEffect(() => {
    const canonicalUrl = new URL(path, `${SITE_ORIGIN}/`).toString();
    const imageUrl = `${SITE_ORIGIN}/fusionx-logo.png`;
    document.title = title;
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';

    const values: Array<[string, string, string]> = [
      ['name', 'description', description],
      ['name', 'keywords', keywordsContent],
      ['name', 'robots', 'index, follow, max-image-preview:large'],
      ['property', 'og:title', title],
      ['property', 'og:description', description],
      ['property', 'og:type', path.startsWith('/blog/') ? 'article' : 'website'],
      ['property', 'og:url', canonicalUrl],
      ['property', 'og:site_name', 'Fusion ERP'],
      ['property', 'og:image', imageUrl],
      ['name', 'twitter:card', 'summary_large_image'],
      ['name', 'twitter:title', title],
      ['name', 'twitter:description', description],
      ['name', 'twitter:image', imageUrl]
    ];

    values.forEach(([attribute, key, content]) => {
      let element = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, key);
        document.head.appendChild(element);
      }
      element.content = content;
    });

    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const verification = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION;
    if (verification) {
      let element = document.head.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.name = 'google-site-verification';
        document.head.appendChild(element);
      }
      element.content = verification;
    }

    const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
    if (measurementId && !document.getElementById('ga-script')) {
      const analyticsScript = document.createElement('script');
      analyticsScript.id = 'ga-script';
      analyticsScript.async = true;
      analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(analyticsScript);
      const analyticsWindow = window as typeof window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };
      analyticsWindow.dataLayer = analyticsWindow.dataLayer || [];
      analyticsWindow.gtag = analyticsWindow.gtag || function (...args) { analyticsWindow.dataLayer?.push(args); };
      analyticsWindow.gtag('js', new Date());
      analyticsWindow.gtag('config', measurementId);
    }

    document.getElementById('marketing-schema')?.remove();
    const script = document.createElement('script');
    script.id = 'marketing-schema';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schema ? { ...BRAND_SCHEMA, ...schema } : BRAND_SCHEMA);
    document.head.appendChild(script);
  }, [title, description, path, keywordsContent, schema]);

  return null;
}
