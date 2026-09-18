// src/lib/api.ts
import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";

const API_BASE_URL = "/api";

const getTenantSlug = (): string | null => {
  const configured = import.meta.env.VITE_TENANT_SLUG?.trim();
  if (configured) return configured.toLowerCase();

  const host = window.location.hostname.toLowerCase();
  const labels = host.split('.');
  // Do not treat localhost, IPs, or known central hosts as workspaces.
  if (labels.length < 3 || host === 'www.example.com' || labels[0] === 'www' || labels[0] === 'admin') {
    return null;
  }
  return labels[0];
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 
    "Content-Type": "application/json",
    "Accept": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  withCredentials: true, // مهم جداً للـ cookies
});

// 🔧 متغير لتتبع حالة CSRF
let csrfTokenRetrieved = false;

// 🟢 دالة محسنة للحصول على CSRF token
export const getCsrfToken = async (force: boolean = false): Promise<void> => {
  if (csrfTokenRetrieved && !force) {
    console.log("🛡️ CSRF Token already retrieved, skipping...");
    return;
  }

  console.log("🛡️ Getting CSRF Token...");
  try {
    const response = await axios.get("/sanctum/csrf-cookie", {
      withCredentials: true,
      baseURL: "", // استخدام نفس الـ origin
    });
    
    console.log("🛡️ CSRF Token Response:", {
      status: response.status,
      headers: response.headers,
      cookies: document.cookie
    });
    
    csrfTokenRetrieved = true;
    console.log("🛡️ CSRF Token obtained successfully");
    
    // طباعة الـ cookies للتأكد
    const cookies = document.cookie.split(';');
    const xsrfToken = cookies.find(cookie => cookie.trim().startsWith('XSRF-TOKEN='));
    console.log("🍪 XSRF-TOKEN Cookie:", xsrfToken);
    
  } catch (error) {
    console.error("❌ Failed to get CSRF token:", error);
    csrfTokenRetrieved = false;
    throw error;
  }
};

// 🟢 Interceptor محسن للطلبات
api.interceptors.request.use(async (config) => {
  const token = Cookies.get("token");
  const method = config.method?.toUpperCase();

  console.log("🔍 API Request Details:", {
    url: config.url,
    method: method,
    hasToken: !!token,
    baseURL: config.baseURL,
  });

  // 🟢 الحصول على CSRF token قبل الطلبات التي تغير البيانات
  if (method && ["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    console.log("🔄 CSRF Token required for", method, "request");
    await getCsrfToken();
    
    // إضافة X-XSRF-TOKEN header إذا كان موجود في الـ cookies
    const xsrfToken = Cookies.get("XSRF-TOKEN");
    if (xsrfToken) {
      config.headers["X-XSRF-TOKEN"] = xsrfToken;
      console.log("✅ X-XSRF-TOKEN header added");
    }
  }

  // 🟢 إضافة Authorization header إذا كان التوكن موجود
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("✅ Authorization header added");
  }
  const configuredTenantSlug = import.meta.env.VITE_TENANT_SLUG?.trim();
  const storedTenantSlug = localStorage.getItem('tenant_slug')?.trim() || '';
  const hostParts = window.location.hostname.split('.');
  const hostTenantSlug = hostParts.length >= 3 && !['www', 'admin', 'api'].includes(hostParts[0])
    ? hostParts[0]
    : '';
  const tenantSlug = configuredTenantSlug || storedTenantSlug || hostTenantSlug;
  if (tenantSlug) config.headers["X-Tenant-Slug"] = tenantSlug;

  console.log("📋 Final Request Headers:", config.headers);

  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    // 🔄 معالجة خطأ 419 (CSRF Token Mismatch)
    if (error.response?.status === 419) {
      // إعادة تعيين حالة CSRF
      csrfTokenRetrieved = false;
      
      try {
        // الحصول على CSRF token جديد
        await getCsrfToken(true);
        
        // إعادة الطلب الأصلي
        if (originalRequest) {
          return api(originalRequest);
        }
      } catch (retryError) {
      }
    }

    // 🚨 معالجة خطأ 401 (Unauthorized)
    if (error.response?.status === 401) {
      Cookies.remove("token");
    }

    if (error.response?.status === 403 && error.response?.data?.code === 'tenant_suspended') {
      Cookies.remove("token");
      Cookies.remove("auth_type");
      localStorage.removeItem('user');
      localStorage.removeItem('tenant_slug');
      if (window.location.pathname !== '/auth') window.location.href = '/auth';
    }

    const responseData = error.response?.data as {
      message?: string;
      error?: string;
      errors?: Record<string, string[] | string>;
    } | undefined;
    const validationMessage = responseData?.errors
      ? Object.values(responseData.errors).flat().join('، ')
      : undefined;
    const serverMessage = validationMessage || responseData?.message || responseData?.error;
    if (serverMessage) error.message = serverMessage;

    return Promise.reject(error);
  }
);

// 🟢 دالة لتهيئة التطبيق بـ CSRF token
export const initializeApp = async (): Promise<void> => {
  console.log("🚀 Initializing app with CSRF token...");
  await getCsrfToken();
  console.log("🚀 App initialized successfully");
};

export default api;
