// hooks/usePOSData.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';
import { useApp } from '@/contexts/AppContext';
import { useEffect, useState } from 'react';
import { 
  saveProductsOffline, 
  getProductsOffline, 
  getProductByBarcodeOffline,
  searchProductsOffline,
  getNetworkStatus,
  saveCategoriesOffline,
  getCategoriesOffline
} from '@/lib/offlineDB';

// ========== أنواع البيانات المتقدمة ==========
export interface ProductColor {
  id: number;
  color_id: number;
  color: string;
  stock: number;
}

export interface ProductUnit {
  id: number;
  unit_id: number;
  unit_name: string;
  cost_price: string;
  sell_price: string;
  barcode: string;
  colors: ProductColor[];
}

export interface ProductImage {
  id: number;
  name: string;
  mimeType: string;
  size: number;
  authorId: number | null;
  previewUrl: string;
  fullUrl: string;
  createdAt: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  icon: string | null;
  parent_id: number | null;
  type: string;
  parent?: {
    id: number;
    name: string;
    icon: string | null;
    parent_id: number | null;
    type: string;
    createdAt: string;
    updatedAt: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  name_ar: string | null;
  icon: string | null;
}

export interface Product {
  id: string;
  name: string;
  name_ar: string | null;
  description: string | null;
  sku: string;
  barcode: string | null;
  price: number;
  cost: string | null;
  stock: number;
  reorder_level: number | null;
  category_id: string | null;
  image_url: string | null;
  imageUrl?: string | null;
  is_active: boolean | null;
  has_variants: boolean;
  units?: ProductUnit[];
  image?: ProductImage;
  category?: ProductCategory;
  created_at?: string;
  updated_at?: string;
}

// ========== Categories Hook مع Offline Support ==========
export const useCategories = () => {
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [offlineCategories, setOfflineCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Online query
  const { data: onlineCategories, isLoading: onlineLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const response = await api.get('/index-sub-account', {
          params: {
            orderBy: 'id',
            orderByDirection: 'asc',
            perPage: 100,
            paginate: false
          }
        });
        
        const categories = response.data?.data || response.data || [];
        
        const formatted = categories.map((cat: any) => ({
          id: cat.id?.toString() || '',
          name: cat.name || '',
          name_ar: cat.name_ar || cat.name || '',
          icon: cat.icon || null
        }));

        // Save to offline DB
        await saveCategoriesOffline(formatted);
        
        return formatted;
      } catch (error) {
        console.error('Error fetching categories:', error);
        if (!navigator.onLine) {
          setIsOfflineMode(true);
          const offline = await getCategoriesOffline();
          setOfflineCategories(offline);
          return offline;
        }
        toast({
          title: 'خطأ في جلب الفئات',
          variant: 'destructive'
        });
        return [];
      }
    },
    enabled: !isOfflineMode,
  });

  useEffect(() => {
    if (isOfflineMode) {
      setIsLoading(true);
      getCategoriesOffline().then(cats => {
        setOfflineCategories(cats);
        setIsLoading(false);
      });
    }
  }, [isOfflineMode]);

  if (isOfflineMode) {
    return {
      data: offlineCategories,
      isLoading,
      isOffline: true
    };
  }

  return {
    data: onlineCategories,
    isLoading: onlineLoading,
    isOffline: false
  };
};

// ========== Products Hook with Offline Support ==========
export const useProducts = (categoryId?: string | null) => {
  const { userBranch, currentBranch } = useApp();
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [offlineProducts, setOfflineProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load offline products when in offline mode
  useEffect(() => {
    if (isOfflineMode) {
      setIsLoading(true);
      getProductsOffline(categoryId).then(products => {
        setOfflineProducts(products);
        setIsLoading(false);
      });
    }
  }, [isOfflineMode, categoryId]);

  // Online query
  const { data: onlineProducts, isLoading: onlineLoading } = useQuery<Product[]>({
    queryKey: ['pos-products', categoryId, userBranch?.id, currentBranch?.id],
    queryFn: async () => {
      try {
        const payload: any = {};

        const branchId = userBranch?.id || currentBranch?.id;
        if (branchId) {
          payload.branch_id = branchId;
        }

        if (categoryId && categoryId !== 'all' && categoryId !== '') {
          payload.category_id = parseInt(categoryId);
        }

        console.log('📦 Fetching products with payload:', payload);
        const response = await api.post('/products/by-branch', payload);
        
        const products = response.data?.data || response.data || [];
        
        const formatted = products.map((prod: any) => ({
          id: prod.id?.toString() || '',
          name: prod.name || '',
          name_ar: prod.name_ar || prod.name || '',
          description: prod.description || null,
          sku: prod.sku || '',
          barcode: prod.barcode || null,
          price: parseFloat(prod.price || '0'),
          cost: prod.cost || null,
          stock: prod.stock || 0,
          reorder_level: prod.reorder_level || null,
          category_id: prod.category?.id?.toString() || null,
          image_url: prod.image_url || null,
          imageUrl: prod.imageUrl || prod.image_url || null,
          is_active: prod.active ?? prod.is_active ?? true,
          has_variants: (prod.units && prod.units.length > 0) || false,
          units: prod.units || [],
          image: prod.image || null,
          category: prod.category || null,
          created_at: prod.created_at || null,
          updated_at: prod.updated_at || null
        }));

        // Save to offline DB for future use
        await saveProductsOffline(formatted);
        
        return formatted;
      } catch (error) {
        console.error('Error fetching products:', error);
        
        // If online fetch fails and we're actually offline, switch to offline mode
        if (!navigator.onLine) {
          setIsOfflineMode(true);
          const offline = await getProductsOffline(categoryId);
          setOfflineProducts(offline);
          return offline;
        }
        
        toast({
          title: 'خطأ في جلب المنتجات',
          variant: 'destructive'
        });
        return [];
      }
    },
    enabled: !isOfflineMode,
  });

  if (isOfflineMode) {
    return {
      data: offlineProducts,
      isLoading,
      isOffline: true
    };
  }

  return {
    data: onlineProducts,
    isLoading: onlineLoading,
    isOffline: false
  };
};

// ========== Product by Barcode with Offline Support ==========
export const useProductByBarcode = (barcode: string) => {
  const { userBranch, currentBranch } = useApp();
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return useQuery({
    queryKey: ['product-barcode', barcode, userBranch?.id, currentBranch?.id],
    queryFn: async () => {
      // Offline mode - search in local DB
      if (isOfflineMode || !navigator.onLine) {
        console.log('🔍 Searching offline for barcode:', barcode);
        return await getProductByBarcodeOffline(barcode);
      }

      // Online mode
      try {
        const payload: any = {};

        const branchId = userBranch?.id || currentBranch?.id;
        if (branchId) {
          payload.branch_id = branchId;
        }

        payload.barcode = barcode;

        console.log('📦 Fetching product by barcode:', payload);
        const response = await api.post('/products/by-branch', payload);
        
        const product = response.data?.data?.[0] || null;
        
        if (product) {
          return {
            id: product.id?.toString() || '',
            name: product.name || '',
            name_ar: product.name_ar || product.name || '',
            description: product.description || null,
            sku: product.sku || '',
            barcode: product.barcode || null,
            price: parseFloat(product.price || '0'),
            cost: product.cost || null,
            stock: product.stock || 0,
            reorder_level: product.reorder_level || null,
            category_id: product.category?.id?.toString() || null,
            image_url: product.image_url || null,
            imageUrl: product.imageUrl || product.image_url || null,
            is_active: product.active ?? product.is_active ?? true,
            has_variants: (product.units && product.units.length > 0) || false,
            units: product.units || [],
            image: product.image || null,
            category: product.category || null
          };
        }
        
        return null;
      } catch (error) {
        console.error('Error fetching product by barcode:', error);
        
        // If online fetch fails and we're offline, try offline
        if (!navigator.onLine) {
          return await getProductByBarcodeOffline(barcode);
        }
        
        toast({
          title: 'خطأ في البحث عن المنتج',
          variant: 'destructive'
        });
        return null;
      }
    },
    enabled: barcode.length > 5,
  });
};

// ========== Helper Functions (بدون تغيير) ==========
export const getProductColors = (product: Product): string[] => {
  if (!product.units || product.units.length === 0) return [];
  
  const colors = new Set<string>();
  product.units.forEach(unit => {
    unit.colors?.forEach(color => {
      if (color.color) colors.add(color.color);
    });
  });
  
  return Array.from(colors);
};

export const getProductSizes = (product: Product): string[] => {
  if (!product.units || product.units.length === 0) return [];
  
  const sizes = new Set<string>();
  product.units.forEach(unit => {
    if (unit.unit_name) sizes.add(unit.unit_name);
  });
  
  return Array.from(sizes);
};

export const getAvailableVariants = (product: Product): Array<{ 
  size: string; 
  color: string; 
  price: number; 
  stock: number;
  unitId: number;
  colorId: number;
}> => {
  const variants: Array<{ 
    size: string; 
    color: string; 
    price: number; 
    stock: number;
    unitId: number;
    colorId: number;
  }> = [];
  
  if (!product.units) return variants;
  
  product.units.forEach(unit => {
    unit.colors?.forEach(color => {
      if (color.stock > 0) {
        variants.push({
          size: unit.unit_name,
          color: color.color,
          price: parseFloat(unit.sell_price || '0'),
          stock: color.stock,
          unitId: unit.id,
          colorId: color.id
        });
      }
    });
  });
  
  return variants;
};

export const getProductImageUrl = (product: Product): string => {
  return product.imageUrl || product.image_url || product.image?.fullUrl || '';
};