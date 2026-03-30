// hooks/useCustomers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Customer, CustomerFormData } from '@/types/loyalty';

interface CustomerFilters {
  address?: string;
  points_min?: number;
  points_max?: number;
  purchases_min?: number;
  purchases_max?: number;
  tier?: string;
}

export const useCustomers = (language: string, filters?: CustomerFilters, searchQuery?: string) => {
  const queryClient = useQueryClient();

  // Fetch customers
  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['customers', filters, searchQuery],
    queryFn: async () => {
      try {
        const payload: any = {
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 100,
          paginate: false
        };

        const apiFilters: any = {};

        if (searchQuery) {
          apiFilters.name = searchQuery;
        }
        if (filters?.address) {
          apiFilters.address = filters.address;
        }
        if (filters?.points_min) {
          apiFilters.point = filters.points_min;
        }
        if (filters?.points_max) {
          apiFilters.point = filters.points_max;
        }
        if (filters?.purchases_min) {
          apiFilters.last_paid_amount = filters.purchases_min;
        }
        if (filters?.purchases_max) {
          apiFilters.last_paid_amount = filters.purchases_max;
        }

        if (Object.keys(apiFilters).length > 0) {
          payload.filters = apiFilters;
        }

        const response = await api.post('/customer/index', payload);

        if (response.data.result === 'Success') {
          return response.data.data || [];
        }
        return [];
      } catch (error) {
        console.error('Error fetching customers:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب العملاء' : 'Error fetching customers');
        return [];
      }
    }
  });

  // Add customer mutation
  const addMutation = useMutation({
    mutationFn: async (customerData: CustomerFormData) => {
      const payload = {
        name: customerData.name,
        name_ar: customerData.name_ar || null,
        phone: customerData.phone || null,
        email: customerData.email || null,
        address: customerData.address || null
      };
      const response = await api.post('/customer', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success(
        language === 'ar' ? 'تم إضافة العميل بنجاح' : 'Customer added successfully'
      );
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => {
      console.error('Error creating customer:', error);
      toast.error(
        language === 'ar' ? 'حدث خطأ في إضافة العميل' : 'Error adding customer'
      );
    }
  });

  // Update customer mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CustomerFormData }) => {
      const payload = {
        name: data.name,
        name_ar: data.name_ar || null,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null
      };
      const response = await api.patch(`/customer/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success(
        language === 'ar' ? 'تم تحديث العميل بنجاح' : 'Customer updated successfully'
      );
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => {
      console.error('Error updating customer:', error);
      toast.error(
        language === 'ar' ? 'حدث خطأ في تحديث العميل' : 'Error updating customer'
      );
    }
  });

  // Redeem points mutation
  const redeemMutation = useMutation({
    mutationFn: async ({ customerId, points }: { customerId: string; points: number }) => {
      const payload = { points };
      const response = await api.patch(`/customer/${customerId}/redeem-points`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success(
        language === 'ar' ? 'تم استبدال النقاط بنجاح' : 'Points redeemed successfully'
      );
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
    onError: (error: any) => {
      console.error('Error redeeming points:', error);
      toast.error(
        language === 'ar'
          ? error.response?.data?.message || 'حدث خطأ في استبدال النقاط'
          : error.response?.data?.message || 'Error redeeming points'
      );
    }
  });

  return {
    customers: data,
    isLoading,
    refetch,
    addCustomer: addMutation.mutate,
    updateCustomer: updateMutation.mutate,
    redeemPoints: redeemMutation.mutate,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRedeeming: redeemMutation.isPending
  };
};