import { useState } from 'react';
import { ArrowLeft, Menu, MessageCircle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const links = [
  ['/about', 'عن Fusion ERP'],
  ['/services', 'الموديولات'],
  ['/pricing', 'الباقات'],
  ['/blog', 'المقالات'],
  ['/contact', 'تواصل معنا']
] as const;

const whatsappHref = 'https://wa.me/201064621943?text=' + encodeURIComponent('مرحبًا، أريد معرفة المزيد عن Fusion ERP.');

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="marketing-shell min-h-screen text-white" dir="rtl">
      <header className="marketing-header">
        <div className="marketing-nav-wrap">
          <Link to="/" className="marketing-brand" aria-label="Fusion ERP الرئيسية" onClick={() => setOpen(false)}>
            <span className="marketing-brand-mark" aria-hidden="true">F</span>
            <span><strong>Fusion <em>ERP</em></strong><small>إدارة أوضح. نمو أهدأ.</small></span>
          </Link>
          <nav className={`${open ? 'marketing-nav-open' : ''} marketing-nav`} aria-label="التنقل الرئيسي">
            {links.map(([url, label]) => (
              <Link key={url} to={url} onClick={() => setOpen(false)}>{label}</Link>
            ))}
            <Link to="/auth" className="marketing-login" onClick={() => setOpen(false)}>تسجيل الدخول</Link>
            <Button asChild className="marketing-primary-button marketing-nav-cta">
              <Link to="/signup" onClick={() => setOpen(false)}>ابدأ تجربة مجانية <ArrowLeft className="mr-2 h-4 w-4" /></Link>
            </Button>
          </nav>
          <button className="marketing-menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'} aria-expanded={open}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>
      {children}
      <footer className="marketing-footer">
        <div className="marketing-footer-main">
          <div className="max-w-sm">
            <Link to="/" className="marketing-brand" aria-label="Fusion ERP الرئيسية">
              <span className="marketing-brand-mark" aria-hidden="true">F</span>
              <span><strong>Fusion <em>ERP</em></strong><small>إدارة أوضح. نمو أهدأ.</small></span>
            </Link>
            <p className="mt-4 text-sm leading-7 text-slate-400">نظام واحد يجمع تفاصيل العمل اليومية، عشان فريقك يركز على اللي يفرق فعلًا.</p>
          </div>
          <div className="marketing-footer-links">
            <Link to="/about">عن النظام</Link>
            <Link to="/services">الموديولات</Link>
            <Link to="/pricing">الباقات</Link>
            <Link to="/blog">المقالات</Link>
            <Link to="/contact">تواصل معنا</Link>
          </div>
          <div className="marketing-footer-contact">
            <p>خلّينا نسمع عن شغلك</p>
            <a href={whatsappHref} target="_blank" rel="noreferrer">+20 106 462 1943</a>
            <span>نرد عليك عبر واتساب ونفهم احتياجك.</span>
          </div>
        </div>
        <div className="marketing-footer-bottom">
          <span>© {new Date().getFullYear()} Fusion ERP. جميع الحقوق محفوظة.</span>
          <div><Link to="/privacy">الخصوصية</Link><Link to="/terms">الشروط</Link><Link to="/cookies">ملفات الارتباط</Link></div>
        </div>
      </footer>
      <a className="marketing-whatsapp-float" href={whatsappHref} target="_blank" rel="noreferrer" aria-label="تواصل مع Fusion ERP عبر واتساب">
        <MessageCircle className="h-5 w-5" /><span>اسألنا على واتساب</span>
      </a>
    </div>
  );
}
