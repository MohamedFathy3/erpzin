// hooks/useOpeningBalances.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ProductService } from '../services/productService';
import { SelectedProduct } from '../types';
const productService = new ProductService();
export const useSaveOpeningBalances = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (products: SelectedProduct[]) => {
      const results = [];
      for (const selected of products) {
        const product = selected.product;
        if (!selected.unitId) {
          const productData = {
            name: product.name,
            name_ar: product.name_ar,
            description: product.description,
            category_id: product.category?.id || product.category_id,
            sku: product.sku,
            barcode: product.barcode,
            reorder_level: product.reorder_level || 0,
            cost: selected.cost,
            price: selected.price,
            stock: selected.quantity,
            beginning_balance: 1,
            active: true
          };
          await productService.createProductWithBalance(productData);
        } 
        else {
          const productData = {
            name: product.name,
            name_ar: product.name_ar,
            description: product.description,
            category_id: product.category?.id || product.category_id,
            sku: product.sku,
            barcode: product.barcode,
            reorder_level: product.reorder_level || 0,
            cost: selected.cost,
            price: selected.price,
            stock: 0,
            beginning_balance: 1,
            active: true,
            units: [{
              unit_id: selected.unitId,
              cost_price: selected.cost,
              sell_price: selected.price,
              barcode: product.barcode,
              colors: selected.colorId ? [{
                color_id: selected.colorId,
                stock: selected.quantity
              }] : []
            }]
          };
          await productService.createProductWithBalance(productData);
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-balance'] });
    }
  });
};
export const useDeleteOpeningBalance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (productId: number) => {
      await productService.deleteProductBalance(productId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['products-with-balance'] });
    }
  });
};