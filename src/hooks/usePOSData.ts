import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
}

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, name_ar, icon')
        .order('name');
      
      if (error) throw error;
      return data as Category[];
    }
  });
};

export const useProducts = () => {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, name_ar, sku, barcode, price, stock, category_id, image_url, is_active')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Product[];
    }
  });
};

export const useProductByBarcode = (barcode: string) => {
  return useQuery({
    queryKey: ['product-barcode', barcode],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('barcode', barcode)
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data as Product | null;
    },
    enabled: barcode.length > 5
  });
};
