import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';

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
  has_variants: boolean | null;
  
  // الحقول الجديدة من API
  units?: ProductUnit[];
  image?: ProductImage;
  category?: ProductCategory;
  
  created_at?: string;
  updated_at?: string;
}

// ========== Categories Hook - مع /index-sub-account ==========

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        // ✅ استخدام /index-sub-account كما طلبت
        const response = await api.get('/index-sub-account', {
          params: {
            orderBy: 'id',
            orderByDirection: 'asc',
            perPage: 100,
            paginate: false
          }
        });
        
        // API بترجع data.data
        const categories = response.data?.data || response.data || [];
        
        // تحويل الفئات للشكل المطلوب
        return categories.map((cat: any) => ({
          id: cat.id?.toString() || '',
          name: cat.name || '',
          name_ar: cat.name_ar || cat.name || '',
          icon: cat.icon || null
        }));
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: 'خطأ في جلب الفئات',
          variant: 'destructive'
        });
        return [];
      }
    },
  });
};

// ========== Products Hook with Category Filter ==========

export const useProducts = (categoryId?: string | null) => {
  return useQuery({
    queryKey: ['pos-products', categoryId],
    queryFn: async () => {
      const payload: any = {
        orderBy: "id",
        orderByDirection: "asc",
        perPage: 50,
        paginate: true,
        delete: false
      };

      // إضافة فلتر category_id لو موجود
      if (categoryId && categoryId !== 'all') {
        payload.filters = {
          category_id: parseInt(categoryId)
        };
      }

      const response = await api.post('/product/index', payload);
      
      // API بتجيب الـ data جوا data.data
      const products = response.data?.data || response.data || [];
      
      // ✅ تحويل المنتجات مع الحفاظ على كل البيانات بما فيها units و colors
      return products.map((prod: any) => ({
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
        category_id: prod.category_id?.toString() || null,
        image_url: prod.image_url || null,
        imageUrl: prod.imageUrl || prod.image_url || null,
        is_active: prod.active ?? prod.is_active ?? true,
        // ✅ مهم: has_variants من units
        has_variants: (prod.units && prod.units.length > 0) || false,
        
        // ✅ الحقول الجديدة - مهمة جداً للـ variants
        units: prod.units || [],
        image: prod.image || null,
        category: prod.category || null,
        
        created_at: prod.created_at || null,
        updated_at: prod.updated_at || null
      }));
    },
  });
};

// ========== Product by Barcode Hook - من الـ API بتاعك ==========

export const useProductByBarcode = (barcode: string) => {
  return useQuery({
    queryKey: ['product-barcode', barcode],
    queryFn: async () => {
      try {
        // ✅ استخدام /product/index مع فلتر barcode
        const payload = {
          filters: { barcode: barcode },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1,
          paginate: false,
          delete: false
        };

        const response = await api.post('/product/index', payload);
        
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
            category_id: product.category_id?.toString() || null,
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

// ========== Product by ID Hook ==========

export const useProductById = (productId: string) => {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      try {
        const payload = {
          filters: { id: parseInt(productId) },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 1,
          paginate: false,
          delete: false
        };

        const response = await api.post('/product/index', payload);
        
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
            category_id: product.category_id?.toString() || null,
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
        console.error('Error fetching product by id:', error);
        return null;
      }
    },
    enabled: !!productId,
  });
};

// ========== Helper Functions ==========

// دالة لاستخراج الألوان المتاحة للمنتج
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

// دالة لاستخراج المقاسات المتاحة للمنتج
export const getProductSizes = (product: Product): string[] => {
  if (!product.units || product.units.length === 0) return [];
  
  const sizes = new Set<string>();
  product.units.forEach(unit => {
    if (unit.unit_name) sizes.add(unit.unit_name);
  });
  
  return Array.from(sizes);
};

// دالة للبحث عن variant معين
export const findProductVariant = (
  product: Product, 
  color: string, 
  size: string
): { unit: ProductUnit; color: ProductColor } | null => {
  if (!product.units) return null;
  
  // البحث عن الوحدة (المقاس)
  const unit = product.units.find(u => u.unit_name === size);
  if (!unit) return null;
  
  // البحث عن اللون
  const colorObj = unit.colors?.find(c => c.color === color);
  if (!colorObj) return null;
  
  return { unit, color: colorObj };
};

// دالة لحساب سعر الـ variant
export const getVariantPrice = (unit: ProductUnit): number => {
  return parseFloat(unit.sell_price || '0');
};

// دالة لجلب صورة المنتج
export const getProductImageUrl = (product: Product): string | null => {
  // 1. product.image?.fullUrl
  if (product.image?.fullUrl) {
    return product.image.fullUrl;
  }
  
  // 2. product.imageUrl
  if (product.imageUrl) {
    return product.imageUrl;
  }
  
  // 3. product.image_url
  if (product.image_url) {
    return product.image_url;
  }
  
  // 4. product.image?.previewUrl
  if (product.image?.previewUrl) {
    return product.image.previewUrl;
  }
  
  return null;
};

// دالة للتحقق من وجود مخزون للـ variant
export const hasVariantStock = (color: ProductColor): boolean => {
  return color.stock > 0;
};

// دالة لجلب كل الـ variants المتاحة
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