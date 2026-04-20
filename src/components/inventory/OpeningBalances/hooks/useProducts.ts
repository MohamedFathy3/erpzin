/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useProducts.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ProductService } from '../services/productService';
import { Product, Branch, Warehouse } from '../types';
import api from '@/lib/api';

const productService = new ProductService();

interface UseProductsFilters {
  searchQuery: string;
  selectedBranch: string;
  selectedWarehouse: string;
  hasBalance?: boolean; // Add this option
}

export const useProducts = (filters: UseProductsFilters) => {
  return useQuery<Product[]>({
    queryKey: ['products', filters],
    queryFn: () => productService.getProducts({
      searchQuery: filters.searchQuery,
      branchId: filters.selectedBranch,
      warehouseId: filters.selectedWarehouse,
      hasBalance: filters.hasBalance ?? false,
    }),
    enabled: true
  });
};
export const useSearchProducts = (searchQuery: string) => {
  return useQuery<Product[]>({
    queryKey: ['search-products', searchQuery],
    queryFn: () => productService.searchProducts(searchQuery),
    enabled: searchQuery.length > 0 && searchQuery !== '___empty___',
  });
};
// Separate hook for products with balance only (for main list)
export const useProductsWithBalance = (filters: {
  searchQuery: string;
  selectedBranch: string;
  selectedWarehouse: string;
}) => {
  return useQuery<Product[]>({
    queryKey: ['products-with-balance', filters],
    queryFn: () => productService.getProducts({
      searchQuery: filters.searchQuery,
      branchId: filters.selectedBranch,
      warehouseId: filters.selectedWarehouse,
      hasBalance: true
    })
  });
};

// hooks/useProducts.ts

export const useBranches = () => {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      const response = await api.post('/branch/index', { paginate: false });
      // Handle different response structures
      const data = response.data?.data || response.data || [];
      // Ensure we return an array
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useWarehouses = (selectedBranch: string) => {
  return useQuery({
    queryKey: ['warehouses', selectedBranch],
    queryFn: async () => {
      const filters: any = {};
      if (selectedBranch && selectedBranch !== 'all') {
        filters.branch_id = parseInt(selectedBranch);
      }
      const response = await api.post('/warehouse/index', { filters, paginate: false });
      // Handle different response structures
      const data = response.data?.data || response.data || [];
      // Ensure we return an array
      return Array.isArray(data) ? data : [];
    },
    enabled: !!selectedBranch,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};