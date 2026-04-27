/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useProducts.ts
import { useQuery } from '@tanstack/react-query';
import { ProductService } from '../services/productService';
import { Product } from '../types';
import api from '@/lib/api';

const productService = new ProductService();

// ✅ هوك للبحث بالاسم
export const useSearchProductsByName = (searchQuery: string, enabled: boolean = true) => {
  return useQuery<Product[]>({
    queryKey: ['products', 'name', searchQuery],
    queryFn: () => productService.searchProductsByName(searchQuery),
    enabled: enabled && searchQuery.length > 0 && searchQuery !== '___empty___',
  });
};

// ✅ هوك للبحث بالـ SKU
export const useSearchProductsBySku = (searchQuery: string, enabled: boolean = true) => {
  return useQuery<Product[]>({
    queryKey: ['products', 'sku', searchQuery],
    queryFn: () => productService.searchProductsBySku(searchQuery),
    enabled: enabled && searchQuery.length > 0 && searchQuery !== '___empty___',
  });
};

// ✅ هوك للبحث بالباركود
export const useSearchProductsByBarcode = (searchQuery: string, enabled: boolean = true) => {
  return useQuery<Product[]>({
    queryKey: ['products', 'barcode', searchQuery],
    queryFn: () => productService.searchProductsByBarcode(searchQuery),
    enabled: enabled && searchQuery.length > 0 && searchQuery !== '___empty___',
  });
};

// ✅ الهوك الأصلي (للبحث العام)
export const useProducts = (filters: {
  searchQuery: string;
  selectedBranch: string;
  selectedWarehouse: string;
  hasBalance?: boolean;
}) => {
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

// باقي الهوكات كما هي...