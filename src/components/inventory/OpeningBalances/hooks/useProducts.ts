// hooks/useProducts.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { ProductService } from '../services/productService';
import { Product } from '../types';

const productService = new ProductService();

// ✅ هوك جلب المنتجات اللي عندها رصيد (لـ OpeningBalances)
export const useProductsWithBalance = (filters: {
  searchQuery: string;
  selectedBranch: string;
  selectedWarehouse: string;
  page?: number;
  perPage?: number;
}) => {
  return useQuery({
    queryKey: ['products-with-balance', filters.searchQuery, filters.selectedBranch, filters.selectedWarehouse, filters.page, filters.perPage],
    queryFn: () => productService.getProductsWithBalance({
      searchQuery: filters.searchQuery,
      branchId: filters.selectedBranch,
      warehouseId: filters.selectedWarehouse,
      page: filters.page || 1,
      perPage: filters.perPage || 16
    }),
    enabled: true,
    staleTime: 0,
    gcTime: 0
  });
};

// ✅ هوك البحث العام للمودال
export const useSearchProducts = (filters: {
  searchQuery: string;
  selectedBranch: string;
  selectedWarehouse: string;
  searchType: 'name' | 'sku' | 'barcode';
  enabled: boolean;
}) => {
  return useQuery<Product[]>({
    queryKey: ['search-products', filters.searchQuery, filters.selectedBranch, filters.selectedWarehouse, filters.searchType],
    queryFn: () => productService.searchProducts({
      searchQuery: filters.searchQuery,
      searchType: filters.searchType
    }),
    enabled: filters.enabled && filters.searchQuery.length > 0 && filters.searchQuery !== '___empty___',
    staleTime: 0,
    gcTime: 0
  });
};