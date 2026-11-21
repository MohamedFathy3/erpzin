// src/lib/api.ts
import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";
import { removeAuthCookie } from "@/lib/authCookies";

const configuredApiUrl = (import.meta.env.VITE_API_URL || "https://testapi.injazyemen.cloud")
  .trim()
  .replace(/\/+$/, "");
const API_BASE_URL = configuredApiUrl.endsWith("/api")
  ? configuredApiUrl
  : `${configuredApiUrl}/api`;

const getTenantSlug = (): string | null => {
  const configured = import.meta.env.VITE_TENANT_SLUG?.trim();
  if (configured) return configured.toLowerCase();

  // A user may sign in through a tenant alias that differs from the canonical
  // tenant slug. Prefer the slug returned by the API for subsequent requests.
  if (typeof window !== 'undefined') {
    const stored = window.localStorage.getItem('tenant_slug')?.trim();
    if (stored) return stored.toLowerCase();
  }

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
  // Authentication uses bearer tokens; the frontend and API are on different sites.
  withCredentials: false,
});

// 🟢 Interceptor محسن للطلبات
api.interceptors.request.use(async (config) => {
  const portalToken = window.location.pathname.startsWith('/customer-portal')
    ? localStorage.getItem('customer_token')
    : window.location.pathname.startsWith('/technician-portal')
      ? localStorage.getItem('technician_token')
      : null;
  const token = portalToken || Cookies.get("token");
  const method = config.method?.toUpperCase();

  console.log("🔍 API Request Details:", {
    url: config.url,
    method: method,
    hasToken: !!token,
    baseURL: config.baseURL,
  });

  // 🟢 إضافة Authorization header إذا كان التوكن موجود
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log("✅ Authorization header added");
  }
  const tenantSlug = getTenantSlug();
  if (tenantSlug) config.headers["X-Tenant-Slug"] = tenantSlug;

  console.log("📋 Final Request Headers:", config.headers);

  return config;
});

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    // 🚨 معالجة خطأ 401 (Unauthorized)
    if (error.response?.status === 401) {
      removeAuthCookie("token");
    }

    if (error.response?.status === 403 && error.response?.data?.code === 'tenant_suspended') {
      removeAuthCookie("token");
      removeAuthCookie("auth_type");
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

export default api;
