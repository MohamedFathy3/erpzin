/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useOpeningBalances.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { ProductService } from '../services/productService';
import { Product, SelectedProduct } from '../types';

const productService = new ProductService();

export const useSaveOpeningBalances = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (items: SelectedProduct[]) => {
      const results = [];
      for (const item of items) {
        try {
          // If product has variants (unitId exists)
          if (item.unitId) {
            await productService.updateVariantBalance(
              item.product.id,
              item.unitId,
              item.colorId || null,
              {
                stock: item.quantity,
                cost: item.cost,
                price: item.price
              }
            );
          } else {
            // Simple product without variants
            await productService.updateProductBalance(item.product.id, {
              stock: item.quantity,
              cost: item.cost,
              price: item.price,
              beginning_balance: true // This will be sent as 1
            });
          }
          results.push({ success: true, item });
        } catch (error) {
          console.error('Error updating product:', error);
          results.push({ success: false, item, error });
        }
      }
      return {
        total: items.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      };
    },
    onSuccess: (result) => {
      toast({
        title: 'تم الحفظ بنجاح',
        description: `تم تحديث ${result.success} منتج بنجاح، فشل ${result.failed}`,
      });
      queryClient.invalidateQueries({ queryKey: ['products-with-balance'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (error: any) => {
      toast({
        title: 'حدث خطأ',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
};


// hooks/useOpeningBalances.ts

export const useDeleteOpeningBalance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productId: number) => productService.deleteProductBalance(productId),
    
    // Optimistic update: delete immediately from UI
    onMutate: async (productId) => {
      // Cancel ongoing queries
      await queryClient.cancelQueries({ queryKey: ['products-with-balance'] });
      
      // Save previous state
      const previousProducts = queryClient.getQueryData<Product[]>(['products-with-balance']);
      
      // Optimistically update cache
      queryClient.setQueryData<Product[]>(['products-with-balance'], (old) => {
        if (!old) return old;
        return old.filter(product => product.id !== productId);
      });
      
      // Return context for rollback
      return { previousProducts };
    },
    
    // If error, rollback to previous state
    onError: (error, productId, context) => {
      if (context?.previousProducts) {
        queryClient.setQueryData(['products-with-balance'], context.previousProducts);
      }
      toast({ 
        title: 'حدث خطأ', 
        description: error.response?.data?.message || error.message, 
        variant: 'destructive' 
      });
    },
    
    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['products-with-balance'] });
    },
  });
};