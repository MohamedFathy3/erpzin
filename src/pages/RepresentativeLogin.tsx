import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Loader2, LogIn, UserRound } from 'lucide-react';
import { toast } from 'sonner';

export default function RepresentativeLogin() {
  const { user, signInRepresentative } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isArabic = language === 'ar';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (user) navigate('/representative', { replace: true }); }, [user, navigate]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!identifier || !password) return toast.error(isArabic ? 'أدخل البريد/الهاتف وكلمة المرور' : 'Enter your email/phone and password');
    setLoading(true);
    const result = await signInRepresentative(identifier, password);
    setLoading(false);
    if (result.error) toast.error(result.error.message); else { toast.success(isArabic ? 'تم تسجيل الدخول' : 'Signed in successfully'); navigate('/representative', { replace: true }); }
  };
  return <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-emerald-950 to-cyan-900 p-4" dir={isArabic ? 'rtl' : 'ltr'}><Card className="w-full max-w-md border-white/10 bg-white/95 shadow-2xl"><CardHeader className="text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><UserRound size={28} /></div><CardTitle className="text-2xl">{isArabic ? 'دخول المندوب' : 'Representative login'}</CardTitle><p className="text-sm text-muted-foreground">{isArabic ? 'ادخل إلى فواتيرك وتقاريرك وعمولاتك' : 'Access your invoices, reports and commissions'}</p></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><div><label className="mb-2 block text-sm font-medium">{isArabic ? 'البريد الإلكتروني أو الهاتف' : 'Email or phone'}</label><Input value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="username" /></div><div><label className="mb-2 block text-sm font-medium">{isArabic ? 'كلمة المرور' : 'Password'}</label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" /></div><Button className="w-full" type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" size={17} /> : <LogIn size={17} />}<span className="ms-2">{isArabic ? 'تسجيل الدخول' : 'Sign in'}</span></Button></form></CardContent></Card></div>;
}
