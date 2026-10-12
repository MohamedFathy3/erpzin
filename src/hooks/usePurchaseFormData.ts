// hooks/usePurchaseFormData.ts
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Supplier, Branch, Warehouse, Currency, Tax, Treasury, Product } from '@/types/purchaseform';

export const useSuppliers = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['suppliers-active'],
    queryFn: async () => {
      const response = await api.post('/suppliers/index', {
        filters: { active: true },
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 1000,
        paginate: false
      });
      return response.data.result === 'Success' ? (response.data.data || []) : [];
    },
    enabled
  });
};

export const useBranches = (isOpen: boolean = true) => {
  return useQuery({
    queryKey: ['branches-active'],
    queryFn: async () => {
      const response = await api.post('/branch/index', {
        filters: { active: true },
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 1000,
        paginate: false
      });
      return response.data.result === 'Success' ? (response.data.data || []) : [];
    },
    enabled: isOpen,
  });
};

export const useWarehouses = (branchId: string | null, isOpen: boolean = true) => {
  return useQuery({
    queryKey: ['warehouses-active', branchId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filters: any = { active: true };
      if (branchId) filters.branch_id = Number(branchId);

      const response = await api.post('/warehouse/index', {
        filters,
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 1000,
        paginate: false
      });
      return response.data.result === 'Success' ? (response.data.data || []) : [];
    },
    enabled: isOpen && !!branchId
  });
};

export const useCurrencies = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const response = await api.post('/currency/index', {
        filters: { active: true },
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: false
      });
      return response.data.result === 'Success' ? (response.data.data || []) : [];
    },
    enabled
  });
};

export const useTaxes = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['taxes'],
    queryFn: async () => {
      const response = await api.post('/tax/index', {
        filters: { active: true },
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 100,
        paginate: false
      });
      return response.data.result === 'Success' ? (response.data.data || []) : [];
    },
    enabled
  });
};

export const useTreasuries = (branchId: string | null, isOpen: boolean = true) => {
  return useQuery({
    queryKey: ['treasury', branchId],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filters: any = {};
      if (branchId) filters.branch_id = Number(branchId);

      const response = await api.post('/treasury/index', {
        filters,
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 1000,
        paginate: false
      });
      return response.data.result === 'Success' ? (response.data.data || []) : [];
    },
    enabled: isOpen && !!branchId
  });
};

/**
 * يجلب المنتجات.
 * @param enabled - هل الـ query شغالة
 * @param purchasableOnly - لو true، يجيب المنتجات القابلة للشراء فقط (بدون الخدمات)
 *                          يُستخدم في شاشة فاتورة المشتريات.
 */
export const useProducts = (enabled: boolean = true, purchasableOnly: boolean = false) => {
  return useQuery<Product[]>({
    queryKey: ['products-for-purchase', purchasableOnly],
    queryFn: async () => {
      // ✅ لو purchasableOnly → استخدم endpoint /product/purchasable
      //    اللي بيستبعد الخدمات (automotive services)
      const endpoint = purchasableOnly ? '/product/purchasable' : '/product/index';

      const response = await api.post(endpoint, {
        filters: {},
        orderBy: 'name',
        orderByDirection: 'asc',
        perPage: 1000,
        paginate: false
      });

      return response.data.result === 'Success' ? (response.data.data || []) : [];
    },
    enabled
  });
};