// contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import Cookies from 'js-cookie';
import api from '@/lib/api';

// تعريف الأنواع بناءً على الـ response
interface User {
  id: number;
  name: string;
  email: string;
  logoUrl?: string;
  logo?: number | null;
  logo_icon?: string;
  logo_icon_image?: number | null;
  address?: string | null;
  phone?: string | null;
  active: number | null;
  tax_id?: string | null;
  commercial_register?: string | null;
  country?: string | null;
  currency?: string | null;
  date?: string | null;
  created_at: string;
  updated_at: string;
  website?: string | null;
  role: string;
}

interface LoginResponse {
  data: User;
  token: string;
}

interface Session {
  token: string;
  user: User;
  expires_at?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<{
    error: Error | null;
    user?: User;
    token?: string;
  }>;
  signUp: (email: string, password: string, fullName: string, image?: number) => Promise<{
    error: Error | null;
    user?: User;
    token?: string;
  }>;
  signOut: () => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<{ error: Error | null }>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // دالة لتحميل المستخدم من الـ API
  const fetchCurrentUser = async (token?: string): Promise<User | null> => {
    try {
      const authToken = token || Cookies.get('token');

      if (!authToken) {
        return null;
      }

      const response = await api.get('/get-admin', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      console.log('Fetch current user response:', response.data);

      // بناءً على الـ response اللي شايفه
      if (response.data?.data) {
        // إذا كان فيه data داخل data
        return response.data.data;
      } else if (response.data) {
        // إذا كان data مباشر (لكن غالباً مش هيكون هنا)
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      return null;
    }
  };

  // دالة لتحميل المستخدم من الـ API (بديل)
  const getUserProfile = async (token?: string): Promise<User | null> => {
    try {
      const authToken = token || Cookies.get('token');

      if (!authToken) {
        return null;
      }

      const response = await api.get('/admin', {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      console.log('Get user profile response:', response.data);

      // بناءً على الـ response اللي أرسلته
      if (response.data?.data) {
        return response.data.data;
      }

      return null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadSession = async () => {
      try {
        const token = Cookies.get('token');
        console.log('Loading session, token:', token);

        if (token) {
          // حاول أولاً باستخدام get-admin
          let userData = await fetchCurrentUser(token);

          // إذا ما لقيناش بيانات، جرب endpoint تاني
          if (!userData) {
            userData = await getUserProfile(token);
          }

          console.log('Loaded user data:', userData);

          if (userData) {
            setUser(userData);
            setSession({
              token,
              user: userData
            });
          } else {
            console.log('No user data found');
            Cookies.remove('token');
            setUser(null);
            setSession(null);
          }
        } else {
          console.log('No token found');
        }
      } catch (error) {
        console.error('Error loading session:', error);
        Cookies.remove('token');
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, []);

  const signIn = async (identifier: string, password: string) => {
    try {
      console.log('Sign in attempt:', identifier);

      // تحديد إذا كان Identifier هو email أم username
      const isEmail = identifier.includes('@');
      let payload;

      if (isEmail) {
        payload = {
          email: identifier,
          password
        };
      } else {
        // إذا كان username
        payload = {
          username: identifier,
          password
        };
      }

      const response = await api.post<LoginResponse>('/admin/login', payload);
      console.log('Login response:', response.data);

      if (response.data?.token && response.data?.data) {
        const { token, data: userData } = response.data;

        // حفظ التوكن في الـ cookies
        Cookies.set('token', token, {
          expires: 7, // 7 أيام
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        });

        console.log('Setting user:', userData);

        setUser(userData);
        setSession({
          token,
          user: userData
        });

        return {
          error: null,
          user: userData,
          token
        };
      } else {
        console.error('Invalid login response:', response.data);
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login error:', error);

      let errorMessage = 'Login failed';

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
        console.log('Error message:', errorMessage);
      } else if (error.response?.status === 401) {
        errorMessage = 'Invalid credentials';
      } else if (error.response?.status === 422) {
        errorMessage = 'Validation error';
        console.log('Validation errors:', error.response.data.errors);
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      return {
        error: new Error(errorMessage)
      };
    }
  };

  // التسجيل
  // في AuthContext.tsx - دالة signUp
  const signUp = async (email: string, password: string, fullName: string, image?: number) => {
    try {
      console.log('Sign up attempt:', { email, name: fullName, image });

      const payload: any = {
        name: fullName,
        email,
        password,
        password_confirmation: password
      };

      // فقط أضف image إذا كان موجود
      if (image) {
        payload.image = image;
      }

      const response = await api.post('/admin', payload);
      console.log('Signup response:', response.data);

      // بعد التسجيل الناجح، اسجل الدخول تلقائياً
      if (response.data?.data) {
        const userData = response.data.data;

        console.log('User created successfully, now logging in...');

        // الآن اسجل الدخول باستخدام نفس البيانات
        const loginResponse = await api.post('/admin/login', {
          email,
          password
        });

        console.log('Auto login response:', loginResponse.data);

        if (loginResponse.data?.token && loginResponse.data?.data) {
          const { token } = loginResponse.data;

          // حفظ التوكن في الـ cookies
          Cookies.set('token', token, {
            expires: 7,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
          });

          console.log('Setting user after auto login:', loginResponse.data.data);

          setUser(loginResponse.data.data);
          setSession({
            token,
            user: loginResponse.data.data
          });

          return {
            error: null,
            user: loginResponse.data.data,
            token
          };
        } else {
          // إذا ما نجح تسجيل الدخول التلقائي، بس يرجع المستخدم
          console.log('User created but auto login failed');
          return {
            error: null,
            user: userData,
            token: undefined
          };
        }
      } else {
        console.error('Invalid signup response:', response.data);
        throw new Error('Registration failed - invalid response');
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);

      let errorMessage = 'Registration failed';

      if (error.response?.data?.errors) {
        // معالجة أخطاء الـ validation
        const errors = error.response.data.errors;
        errorMessage = Object.values(errors).flat().join(', ');
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      return {
        error: new Error(errorMessage)
      };
    }
  };

  // تسجيل الخروج
  const signOut = async () => {
    try {
      const token = Cookies.get('token');
      console.log('Signing out with token:', token);

      if (token) {
        await api.post('/admin/logout', {}, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // إزالة التوكن والبيانات المحلية
      Cookies.remove('token');
      localStorage.removeItem('user');
      setUser(null);
      setSession(null);
      console.log('Signed out successfully');

      // إعادة توجيه إلى صفحة تسجيل الدخول
      window.location.href = '/auth';
    }
  };

  // تحديث بيانات المستخدم
  const updateUser = async (userData: Partial<User>) => {
    try {
      console.log('Updating user with:', userData);

      const response = await api.put('/admin', userData, {
        headers: {
          Authorization: `Bearer ${Cookies.get('token')}`
        }
      });

      console.log('Update response:', response.data);

      if (response.data?.data) {
        const updatedUser = response.data.data;

        console.log('Updated user:', updatedUser);

        setUser(updatedUser);
        setSession(prev => prev ? { ...prev, user: updatedUser } : null);

        return { error: null };
      }

      throw new Error('Update failed - no data in response');
    } catch (error: any) {
      console.error('Update user error:', error);
      console.error('Update error response:', error.response?.data);
      return { error: new Error(error.response?.data?.message || 'Update failed') };
    }
  };

  // تجديد الجلسة
  const refreshSession = async () => {
    try {
      const token = Cookies.get('token');
      console.log('Refreshing session with token:', token);

      if (token) {
        const userData = await fetchCurrentUser(token);

        if (userData) {
          console.log('Session refreshed with user:', userData);
          setUser(userData);
          setSession({
            token,
            user: userData
          });
        } else {
          console.log('No user data found during refresh');
          await signOut();
        }
      }
    } catch (error) {
      console.error('Refresh session error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    updateUser,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// دالة مساعدة للتحقق من المصادقة
export const withAuth = <P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> => {
  const AuthenticatedComponent: React.FC<P> = (props) => {
    const { user, loading } = useAuth();

    console.log('withAuth - user:', user, 'loading:', loading);

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!user) {
      console.log('withAuth - no user, redirecting');
      // إعادة توجيه إلى صفحة المصادقة
      window.location.href = '/auth';
      return null;
    }

    return <Component {...props} />;
  };

  return AuthenticatedComponent;
};

// دالة مساعدة للحصول على التوكن للاستخدام خارج المكونات
export const getAuthToken = (): string | null => {
  return Cookies.get('token') || null;
};

// دالة مساعدة للحصول على المستخدم الحالي
export const getCurrentUser = (): User | null => {
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      return JSON.parse(storedUser);
    } catch (error) {
      return null;
    }
  }
  return null;
};