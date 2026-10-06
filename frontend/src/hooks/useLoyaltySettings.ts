// hooks/useLoyaltySettings.ts
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { LoyaltySettings } from '@/types/loyalty';

export const useLoyaltySettings = (language: string) => {
  const queryClient = useQueryClient();

  // Fetch loyalty settings
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['loyalty-settings'],
    queryFn: async () => {
      try {
        const response = await api.post('/loyalty-points/index', {
          filters: {},
          orderBy: 'id',
          orderByDirection: 'desc',
          perPage: 1,
          paginate: false
        });

        if (response.data.result === 'Success' && response.data.data?.length > 0) {
          return response.data.data[0];
        }
        return null;
      } catch (error) {
        console.error('Error fetching loyalty settings:', error);
        toast.error(language === 'ar' ? 'خطأ في جلب إعدادات الولاء' : 'Error fetching loyalty settings');
        return null;
      }
    }
  });

  // Create loyalty settings mutation
  const createMutation = useMutation({
    mutationFn: async (settings: LoyaltySettings) => {
      const payload = {
        points: settings.points,
        point_value: settings.point_value,
        silver: settings.silver,
        gold: settings.gold,
        platinum: settings.platinum
      };
      const response = await api.post('/loyalty-points', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success(
        language === 'ar' ? 'تم إنشاء إعدادات الولاء بنجاح' : 'Loyalty settings created successfully'
      );
      queryClient.invalidateQueries({ queryKey: ['loyalty-settings'] });
    },
    onError: (error: any) => {
      console.error('Error creating loyalty settings:', error);
      toast.error(
        language === 'ar' ? 'حدث خطأ أثناء إنشاء الإعدادات' : 'Error creating loyalty settings'
      );
    }
  });

  // Update loyalty settings mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, settings }: { id: number; settings: LoyaltySettings }) => {
      const payload = {
        points: settings.points,
        point_value: settings.point_value,
        silver: settings.silver,
        gold: settings.gold,
        platinum: settings.platinum
      };
      const response = await api.patch(`/loyalty-points/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success(
        language === 'ar' ? 'تم تحديث إعدادات الولاء بنجاح' : 'Loyalty settings updated successfully'
      );
      queryClient.invalidateQueries({ queryKey: ['loyalty-settings'] });
    },
    onError: (error: any) => {
      console.error('Error updating loyalty settings:', error);
      toast.error(
        language === 'ar' ? 'حدث خطأ أثناء تحديث الإعدادات' : 'Error updating loyalty settings'
      );
    }
  });

  return {
    settings: data,
    isLoading,
    refetch,
    createSettings: createMutation.mutate,
    updateSettings: updateMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending
  };
};