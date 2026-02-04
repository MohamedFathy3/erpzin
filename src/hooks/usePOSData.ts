import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import api from '@/lib/api';
import { toast } from '@/hooks/use-toast';

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
  sku: string;
  barcode: string | null;
  price: number;
  stock: number;
  category_id: string | null;
  image_url: string | null;
  is_active: boolean | null;
  has_variants: boolean | null;
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      try {
        const response = await api.get('/index-sub-account', {
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching categories:', error);
        toast({
          title: 'Error fetching categories',
          variant: 'destructive'
        });
        return [];
      }
    },
  });
};

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      try {
        const response = await api.post('/product/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        
        return response.data.data || [];
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({
          title: 'Error fetching products',
          variant: 'destructive'
        });
        return [];
      }
    }
  });
};

export const useProductByBarcode = (barcode: string) => {
  return useQuery({
    queryKey: ['product-barcode', barcode],
    queryFn: async () => {
      try {
        const response = await api.post('/product/index', {
          filters: { barcode: barcode },
          orderBy: 'id',
          orderByDirection: 'asc',
          perPage: 100,
          paginate: false
        });
        return response.data.data[0] || null;
      } catch (error) {
        console.error('Error fetching product by barcode:', error);
        toast({
          title: 'Error fetching product by barcode',
          variant: 'destructive'
        });
        return null;
      }
    },
    enabled: barcode.length > 5
  });
};
