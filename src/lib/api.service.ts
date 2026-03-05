// lib/api.service.ts

const API_BASE_URL = (() => {
  // محاولة الحصول على URL من window.__ENV__ (إذا كان موجوداً)
  if (typeof window !== 'undefined' && (window as any).__ENV__?.NEXT_PUBLIC_API_URL) {
    return (window as any).__ENV__.NEXT_PUBLIC_API_URL;
  }
  
  // استخدام القيمة الافتراضية
  return 'http://apierp.dentin.cloud/api';
})();

class ApiService {
  private static instance: ApiService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

  private constructor() {}

  static getInstance(): ApiService {
    if (!ApiService.instance) {
      ApiService.instance = new ApiService();
    }
    return ApiService.instance;
  }

  private getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = this.getAuthToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options?.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'API request failed');
      }

      const data = await response.json();
      
      // التحقق من هيكل الاستجابة
      if (data.status === 200 && data.result === 'Success') {
        return data.data || data;
      }
      
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  async get<T>(endpoint: string, useCache = true): Promise<T> {
    const cacheKey = endpoint;
    
    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.data as T;
      }
    }

    const data = await this.request<T>(endpoint, { method: 'GET' });
    
    if (useCache) {
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
    }
    
    return data;
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  clearCache() {
    this.cache.clear();
  }
}

export const apiService = ApiService.getInstance();