import { useEffect } from 'react';

type Props={title:string;description:string;path:string;keywords?:string[];schema?:Record<string,unknown>};
const baseSchema={"@context":"https://schema.org","@type":"Organization",name:"ERPFlow",url:"https://example.com",logo:"https://example.com/fusionx-logo.png"};
export default function MarketingSEO({title,description,path,keywords=[],schema}:Props){
  useEffect(()=>{
    const origin=window.location.origin; document.title=title; document.documentElement.lang='ar'; document.documentElement.dir='rtl';
    const pageKeywords=keywords.length?keywords:{'/':['ERP','CRM','إدارة الشركات','ERP عربي'],'/about':['ERPFlow','ERP للشركات العربية','إدارة الأعمال'],'/services':['CRM','المخزون','الفروع','المبيعات'],'/pricing':['أسعار ERP','باقات CRM','ERP للشركات'],'/contact':['تواصل ERPFlow','دعم ERP'],'/signup':['تجربة ERP مجانية','Free Trial ERP']}[path]||['ERPFlow','ERP','CRM'];
    const values:[string,string,string][]=[['name','description',description],['name','keywords',pageKeywords.join(', ')],['property','og:title',title],['property','og:description',description],['property','og:type','website'],['property','og:url',origin+path],['property','og:image',origin+'/fusionx-logo.png'],['name','twitter:card','summary_large_image'],['name','twitter:title',title],['name','twitter:description',description],['name','twitter:image',origin+'/fusionx-logo.png']];
    values.forEach(([a,b,c])=>{let el=document.head.querySelector(`meta[${a}="${b}"]`) as HTMLMetaElement|null;if(!el){el=document.createElement('meta');el.setAttribute(a,b);document.head.appendChild(el)}el.content=c});
    const verification=import.meta.env.VITE_GOOGLE_SITE_VERIFICATION; if(verification){let el=document.head.querySelector('meta[name="google-site-verification"]') as HTMLMetaElement|null;if(!el){el=document.createElement('meta');el.name='google-site-verification';document.head.appendChild(el)}el.content=verification}
    let canonical=document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement|null;if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}canonical.href=origin+path;
    document.getElementById('marketing-schema')?.remove(); const script=document.createElement('script');script.id='marketing-schema';script.type='application/ld+json';script.textContent=JSON.stringify({...baseSchema,...schema});document.head.appendChild(script);
    const measurementId=import.meta.env.VITE_GA_MEASUREMENT_ID; if(measurementId&&!document.getElementById('ga-script')){const s=document.createElement('script');s.id='ga-script';s.async=true;s.src=`https://www.googletagmanager.com/gtag/js?id=${measurementId}`;document.head.appendChild(s);const w=window as typeof window & {dataLayer?:unknown[];gtag?: (...args:unknown[])=>void};w.dataLayer=w.dataLayer||[];w.gtag=w.gtag||function(...args){w.dataLayer?.push(args)};w.gtag('js',new Date());w.gtag('config',measurementId)}
  },[title,description,path,keywords.join(','),schema]); return null;
}
