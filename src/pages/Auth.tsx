// pages/Auth.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, LogIn, UserPlus, Mail, Lock, User, Globe, Upload, ArrowRight, ShieldCheck, BarChart3, Boxes } from 'lucide-react';
import { z } from 'zod';
import logoFull from '@/assets/logo-full.png';
import FileUploader from '@/components/FileUploader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAllowedPages, UserRole } from '@/config/permissions'; // استيراد دالة الصلاحيات

const loginSchema = z.object({
  identifier: z.string().trim().min(3, { message: 'اسم المستخدم أو البريد الإلكتروني مطلوب' }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, { message: 'الاسم يجب أن يكون حرفين على الأقل' }).max(100),
  email: z.string().trim().email({ message: 'البريد الإلكتروني غير صالح' }),
  password: z.string().min(6, { message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
});

// دالة لتحديد الصفحة الافتراضية بناءً على دور المستخدم
const getDefaultRoute = (role: UserRole): string => {
  const allowedPages = getAllowedPages(role);
  
  // ترتيب الأولويات للصفحات
  const priorityPages = ['dashboard', 'pos', 'sales', 'inventory'];
  
  // البحث عن أول صفحة في قائمة الأولويات مسموحة للمستخدم
  for (const pageId of priorityPages) {
    const page = allowedPages.find(p => p.id === pageId);
    if (page) {
      return page.path;
    }
  }
  
  // إذا لم يتم العثور على صفحة من الأولويات، خذ أول صفحة مسموحة
  if (allowedPages.length > 0) {
    return allowedPages[0].path;
  }
  
  // في حالة عدم وجود أي صفحة مسموحة (نادراً ما يحدث)
  return '/';
};

const Auth = () => {
  const { user, signIn, signUp } = useAuth();
  const { language, direction, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [activeTab, setActiveTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [uploadedImageIds, setUploadedImageIds] = useState<number[]>([]);
  
  // Login form
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup form
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/';

  // توجيه المستخدم بعد تسجيل الدخول بناءً على دوره
  useEffect(() => {
    if (user) {
      // إذا كان هناك صفحة محاولة الدخول إليها، استخدمها
      if (from !== '/auth' && from !== '/') {
        navigate(from, { replace: true });
      } else {
        // وإلا، استخدم الصفحة الافتراضية بناءً على الدور
        const defaultRoute = getDefaultRoute(user.role as UserRole);
        navigate(defaultRoute, { replace: true });
      }
    }
  }, [user, navigate, from]);

  const translations = {
    en: {
      welcome: 'Welcome to Fusion X ERP',
      loginTitle: 'Sign In',
      signupTitle: 'Create Account',
      loginDesc: 'Enter your credentials to access your account',
      signupDesc: 'Create a new account to get started',
      identifier: 'Username or Email',
      email: 'Email',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      fullName: 'Full Name',
      profileImage: 'Profile Image (Optional)',
      login: 'Sign In',
      signup: 'Create Account',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      identifierPlaceholder: 'Enter username or email',
      emailPlaceholder: 'Enter your email',
      passwordPlaceholder: 'Enter your password',
      namePlaceholder: 'Enter your full name',
      loginSuccess: 'Logged in successfully',
      signupSuccess: 'Account created successfully!',
      error: 'Error',
      invalidCredentials: 'Invalid username/email or password',
      emailExists: 'An account with this email already exists',
      genericError: 'Something went wrong. Please try again.',
    },
    ar: {
      welcome: 'مرحباً بك في Fusion X ERP',
      loginTitle: 'تسجيل الدخول',
      signupTitle: 'إنشاء حساب',
      loginDesc: 'أدخل بياناتك للوصول إلى حسابك',
      signupDesc: 'أنشئ حساباً جديداً للبدء',
      identifier: 'اسم المستخدم أو البريد الإلكتروني',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      confirmPassword: 'تأكيد كلمة المرور',
      fullName: 'الاسم الكامل',
      profileImage: 'صورة الملف الشخصي (اختياري)',
      login: 'تسجيل الدخول',
      signup: 'إنشاء حساب',
      noAccount: 'ليس لديك حساب؟',
      hasAccount: 'لديك حساب بالفعل؟',
      identifierPlaceholder: 'أدخل اسم المستخدم أو البريد الإلكتروني',
      emailPlaceholder: 'أدخل بريدك الإلكتروني',
      passwordPlaceholder: 'أدخل كلمة المرور',
      namePlaceholder: 'أدخل اسمك الكامل',
      loginSuccess: 'تم تسجيل الدخول بنجاح',
      signupSuccess: 'تم إنشاء الحساب بنجاح!',
      error: 'خطأ',
      invalidCredentials: 'اسم المستخدم/البريد الإلكتروني أو كلمة المرور غير صحيحة',
      emailExists: 'يوجد حساب بهذا البريد الإلكتروني بالفعل',
      genericError: 'حدث خطأ ما. يرجى المحاولة مرة أخرى.',
    }
  };

  const t = translations[language];

  const handleImageUploadSuccess = (ids: number[]) => {
    setUploadedImageIds(ids);
    console.log('Uploaded image IDs:', ids);
  };

  const handleImageUploadError = (error: Error) => {
    toast({
      title: t.error,
      description: 'Failed to upload image',
      variant: 'destructive'
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = loginSchema.safeParse({ identifier: loginIdentifier, password: loginPassword });
    if (!validation.success) {
      toast({ 
        title: t.error, 
        description: validation.error.errors[0].message,
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    const { error } = await signIn(loginIdentifier, loginPassword);
    setLoading(false);

    if (error) {
      let message = t.genericError;
      if (error.message.includes('Invalid') || error.message.includes('invalid')) {
        message = t.invalidCredentials;
      }
      toast({ title: t.error, description: message, variant: 'destructive' });
    } else {
      toast({ title: t.loginSuccess });
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = signupSchema.safeParse({ 
      fullName: signupName, 
      email: signupEmail, 
      password: signupPassword,
      confirmPassword: signupConfirmPassword 
    });
    
    if (!validation.success) {
      toast({ 
        title: t.error, 
        description: validation.error.errors[0].message,
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    const imageId = uploadedImageIds.length > 0 ? uploadedImageIds[0] : undefined;
    
    const { error } = await signUp(signupEmail, signupPassword, signupName, imageId);
    setLoading(false);

    if (error) {
      let message = t.genericError;
      if (error.message.includes('already registered') || error.message.includes('email exists')) {
        message = t.emailExists;
      }
      toast({ title: t.error, description: message, variant: 'destructive' });
    } else {
      toast({ title: t.signupSuccess });
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');
      setUploadedImageIds([]);
      setActiveTab('login');
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[#071329] p-4 text-foreground sm:p-6 lg:p-10"
      dir={direction}
    >
      <div className="pointer-events-none absolute -start-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -end-20 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />

      <div className="absolute end-5 top-5 z-10 sm:end-8 sm:top-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="border-white/20 bg-white/10 text-white backdrop-blur hover:bg-white/20 hover:text-white">
              <Globe size={16} className="me-2" /> {language === 'ar' ? 'العربية' : 'English'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage('ar')}>العربية {language === 'ar' && <span className="ms-auto text-primary">✓</span>}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')}>English {language === 'en' && <span className="ms-auto text-primary">✓</span>}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-black/30 lg:min-h-[680px] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="order-2 flex min-h-[560px] items-center justify-center bg-white px-6 py-12 sm:px-12 lg:order-1 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-10 lg:hidden"><img src={logoFull} alt="Fusion X ERP" className="h-12 w-auto object-contain" /></div>
            <div className="mb-8">
              <p className="mb-3 text-sm font-semibold tracking-[0.2em] text-cyan-600">FUSION X ERP</p>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{t.welcome}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-500">{language === 'ar' ? 'أدخل بياناتك للوصول إلى مساحة العمل وإدارة مؤسستك بكل سهولة.' : 'Sign in to manage your workspace and run your business with clarity.'}</p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-7 grid w-full grid-cols-1 rounded-xl bg-slate-100 p-1">
                <TabsTrigger value="login" className="rounded-lg py-2.5 font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"><LogIn size={16} className="me-2" />{t.loginTitle}</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-5">
                  <div className="space-y-2"><Label htmlFor="login-identifier" className="text-sm font-semibold text-slate-700">{t.identifier}</Label><div className="relative"><User className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><Input id="login-identifier" type="text" placeholder={t.identifierPlaceholder} value={loginIdentifier} onChange={(e) => setLoginIdentifier(e.target.value)} required dir="ltr" className="h-12 rounded-xl border-slate-200 ps-10 focus-visible:ring-cyan-500" /></div></div>
                  <div className="space-y-2"><Label htmlFor="login-password" className="text-sm font-semibold text-slate-700">{t.password}</Label><div className="relative"><Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} /><Input id="login-password" type="password" placeholder={t.passwordPlaceholder} value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required dir="ltr" className="h-12 rounded-xl border-slate-200 ps-10 focus-visible:ring-cyan-500" /></div></div>
                  <Button type="submit" className="h-12 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-base font-bold shadow-lg shadow-cyan-500/20 transition hover:from-cyan-600 hover:to-blue-700" disabled={loading}>{loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <ArrowRight size={17} className="me-2" />}{t.login}</Button>
                </form>
              </TabsContent>
            </Tabs>
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400"><ShieldCheck size={15} className="text-emerald-500" /> {language === 'ar' ? 'بياناتك محمية ومشفرة' : 'Your data is protected and encrypted'}</div>
          </div>
        </section>

        <section className="relative order-1 hidden min-h-[680px] overflow-hidden bg-gradient-to-br from-[#0d1b3d] via-[#14275a] to-[#075e75] p-12 text-white lg:order-2 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -end-28 -top-24 h-80 w-80 rounded-full border border-cyan-300/20" /><div className="absolute -bottom-28 -start-24 h-80 w-80 rounded-full border border-violet-300/20" />
          <div className="relative"><img src={logoFull} alt="Fusion X ERP" className="h-14 w-auto object-contain brightness-0 invert" /><div className="mt-20 max-w-md"><p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Enterprise • Connected • Simple</p><h2 className="text-4xl font-extrabold leading-tight">{language === 'ar' ? 'كل أعمالك في مكان واحد.' : 'Your whole business, connected.'}</h2><p className="mt-5 text-base leading-8 text-slate-300">{language === 'ar' ? 'من المبيعات والمخزون إلى المصانع والمقاولات والمالية، Fusion X يربط كل خطوة في دورة عمل واضحة.' : 'From sales and inventory to manufacturing, projects, and finance — Fusion X connects every step.'}</p></div></div>
          <div className="relative grid grid-cols-3 gap-3"><div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><Boxes className="mb-3 text-cyan-300" size={22} /><p className="text-sm font-semibold">{language === 'ar' ? 'قطاعات متعددة' : 'Multi-sector'}</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><BarChart3 className="mb-3 text-violet-300" size={22} /><p className="text-sm font-semibold">{language === 'ar' ? 'قرارات أذكى' : 'Better insight'}</p></div><div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"><ShieldCheck className="mb-3 text-emerald-300" size={22} /><p className="text-sm font-semibold">{language === 'ar' ? 'تحكم آمن' : 'Secure control'}</p></div></div>
        </section>
      </div>
    </div>
  );
};

export default Auth;
