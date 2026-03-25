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
import { Loader2, LogIn, UserPlus, Mail, Lock, User, Globe, Upload } from 'lucide-react';
import { z } from 'zod';
import logoFull from '@/assets/logo-full.png';
import FileUploader from '@/components/FileUploader';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getAllowedPages } from '@/config/permissions'; // استيراد دالة الصلاحيات

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
const getDefaultRoute = (role: string): string => {
  const allowedPages = getAllowedPages(role as any);
  
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

  const from = (location.state as any)?.from?.pathname || '/';

  // توجيه المستخدم بعد تسجيل الدخول بناءً على دوره
  useEffect(() => {
    if (user) {
      // إذا كان هناك صفحة محاولة الدخول إليها، استخدمها
      if (from !== '/auth' && from !== '/') {
        navigate(from, { replace: true });
      } else {
        // وإلا، استخدم الصفحة الافتراضية بناءً على الدور
        const defaultRoute = getDefaultRoute(user.role);
        navigate(defaultRoute, { replace: true });
      }
    }
  }, [user, navigate, from]);

  const translations = {
    en: {
      welcome: 'Welcome to INJAZ ERP',
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
      welcome: 'مرحباً بك في نظام إنجاز',
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
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{ background: 'linear-gradient(135deg, hsl(217 47% 14%) 0%, hsl(217 47% 20%) 50%, hsl(160 60% 35%) 100%)' }}
      dir={direction}
    >
      {/* Language Selector */}
      <div className="absolute top-4 end-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
              <Globe size={16} className="me-2" />
              {language === 'ar' ? 'العربية' : 'English'}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLanguage('ar')} className="flex items-center gap-2">
              <span>🇾🇪</span>
              <span>العربية</span>
              {language === 'ar' && <span className="ms-auto text-primary">✓</span>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setLanguage('en')} className="flex items-center gap-2">
              <span>🇺🇸</span>
              <span>English</span>
              {language === 'en' && <span className="ms-auto text-primary">✓</span>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src={logoFull} alt="INJAZ ERP" className="h-16 object-contain" />
          </div>
          <CardTitle className="text-xl">{t.welcome}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-1 mb-6">
              <TabsTrigger value="login" className="flex items-center gap-2">
                <LogIn size={16} />
                {t.loginTitle}
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-identifier" className="flex items-center gap-2">
                    <User size={14} />
                    {t.identifier}
                  </Label>
                  <Input
                    id="login-identifier"
                    type="text"
                    placeholder={t.identifierPlaceholder}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="flex items-center gap-2">
                    <Lock size={14} />
                    {t.password}
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder={t.passwordPlaceholder}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    dir="ltr"
                  />
                </div>
                <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  ) : (
                    <LogIn size={16} className="me-2" />
                  )}
                  {t.login}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;