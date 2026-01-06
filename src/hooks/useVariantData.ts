import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Size {
  id: string;
  name: string;
  name_ar: string | null;
  code: string;
  sort_order: number | null;
  is_active: boolean | null;
}

export interface Color {
  id: string;
  name: string;
  name_ar: string | null;
  code: string;
  hex_code: string | null;
  is_active: boolean | null;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  size_id: string | null;
  color_id: string | null;
  sku: string;
  barcode: string | null;
  stock: number;
  price_adjustment: number | null;
  cost_adjustment: number | null;
  image_url: string | null;
  is_active: boolean | null;
  size?: Size;
  color?: Color;
}

export const useSizes = () => {
  return useQuery({
    queryKey: ['sizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sizes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data as Size[];
    }
  });
};

export const useColors = () => {
  return useQuery({
    queryKey: ['colors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colors')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data as Color[];
    }
  });
};

export const useProductVariants = (productId: string | undefined) => {
  return useQuery({
    queryKey: ['product-variants', productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from('product_variants')
        .select(`
          *,
          size:sizes(*),
          color:colors(*)
        `)
        .eq('product_id', productId)
        .eq('is_active', true);
      
      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!productId
  });
};

export const useSaveProductVariants = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      productId, 
      variants 
    }: { 
      productId: string; 
      variants: Omit<ProductVariant, 'id' | 'product_id' | 'size' | 'color'>[] 
    }) => {
      // Delete existing variants for this product
      const { error: deleteError } = await supabase
        .from('product_variants')
        .delete()
        .eq('product_id', productId);
      
      if (deleteError) throw deleteError;
      
      // Insert new variants
      if (variants.length > 0) {
        const { error: insertError } = await supabase
          .from('product_variants')
          .insert(
            variants.map(v => ({
              ...v,
              product_id: productId
            }))
          );
        
        if (insertError) throw insertError;
      }
      
      // Update product has_variants flag
      const { error: updateError } = await supabase
        .from('products')
        .update({ has_variants: variants.length > 0 })
        .eq('id', productId);
      
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    }
  });
};

export const useAddSize = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (size: Omit<Size, 'id'>) => {
      const { data, error } = await supabase
        .from('sizes')
        .insert(size)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sizes'] });
    }
  });
};

export const useAddColor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (color: Omit<Color, 'id'>) => {
      const { data, error } = await supabase
        .from('colors')
        .insert(color)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
    }
  });
};

export const useUpdateSize = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...size }: Partial<Size> & { id: string }) => {
      const { data, error } = await supabase
        .from('sizes')
        .update(size)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sizes'] });
    }
  });
};

export const useUpdateColor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...color }: Partial<Color> & { id: string }) => {
      const { data, error } = await supabase
        .from('colors')
        .update(color)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
    }
  });
};

export const useDeleteSize = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sizes')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sizes'] });
    }
  });
};

export const useDeleteColor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colors')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colors'] });
    }
  });
};
