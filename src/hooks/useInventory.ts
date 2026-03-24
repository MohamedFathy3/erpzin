// hooks/useInventory.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { inventoryService } from '@/services/inventoryService';
import type { InventoryFilters, CreateInventoryPayload, UpdateInventoryPayload, UpdateNotePayload } from '@/types/inventory';
import { useLanguage } from '@/contexts/LanguageContext';

export const useInventory = () => {
  const { language } = useLanguage();
  const queryClient = useQueryClient();

  const t = {
    success: language === 'ar' ? 'نجاح' : 'Success',
    error: language === 'ar' ? 'خطأ' : 'Error',
    created: language === 'ar' ? 'تم إنشاء الجرد بنجاح' : 'Inventory created successfully',
    updated: language === 'ar' ? 'تم تحديث الجرد بنجاح' : 'Inventory updated successfully',
    deleted: language === 'ar' ? 'تم حذف الجرد بنجاح' : 'Inventory deleted successfully',
    noteUpdated: language === 'ar' ? 'تم تحديث الملاحظة بنجاح' : 'Note updated successfully',
    stockSynced: language === 'ar' ? 'تم تحديث المخزون بنجاح' : 'Stock synced successfully'
  };

  // Query: جلب جميع سجلات الجرد
  const useGetAll = (filters?: InventoryFilters) => {
    return useQuery({
      queryKey: ['inventory-records', filters],
      queryFn: () => inventoryService.getAll(filters),
      select: (data) => data.data || []
    });
  };

  // Query: جلب تفاصيل سجل جرد
  const useGetById = (id: number | null, enabled: boolean = true) => {
    return useQuery({
      queryKey: ['inventory-record', id],
      queryFn: () => inventoryService.getById(id!),
      select: (data) => data.data,
      enabled: !!id && enabled
    });
  };

  // Mutation: إنشاء جرد جديد
  const useCreate = () => {
    return useMutation({
      mutationFn: (data: CreateInventoryPayload) => inventoryService.create(data),
      onSuccess: () => {
        toast({ title: t.success, description: t.created });
        queryClient.invalidateQueries({ queryKey: ['inventory-records'] });
      },
      onError: (error: any) => {
        toast({
          title: t.error,
          description: error?.response?.data?.message || error.message,
          variant: 'destructive'
        });
      }
    });
  };

  // Mutation: تحديث الجرد
  const useUpdate = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: UpdateInventoryPayload }) =>
        inventoryService.update(id, data),
      onSuccess: () => {
        toast({ title: t.success, description: t.updated });
        queryClient.invalidateQueries({ queryKey: ['inventory-records'] });
        queryClient.invalidateQueries({ queryKey: ['inventory-record'] });
      },
      onError: (error: any) => {
        toast({
          title: t.error,
          description: error?.response?.data?.message || error.message,
          variant: 'destructive'
        });
      }
    });
  };

  // Mutation: تحديث الملاحظة
  const useUpdateNote = () => {
    return useMutation({
      mutationFn: ({ id, data }: { id: number; data: UpdateNotePayload }) =>
        inventoryService.updateNote(id, data),
      onSuccess: () => {
        toast({ title: t.success, description: t.noteUpdated });
        queryClient.invalidateQueries({ queryKey: ['inventory-records'] });
      },
      onError: (error: any) => {
        toast({
          title: t.error,
          description: error?.response?.data?.message || error.message,
          variant: 'destructive'
        });
      }
    });
  };

  // Mutation: حذف الجرد
  const useDelete = () => {
    return useMutation({
      mutationFn: (id: number) => inventoryService.delete(id),
      onSuccess: () => {
        toast({ title: t.success, description: t.deleted });
        queryClient.invalidateQueries({ queryKey: ['inventory-records'] });
      },
      onError: (error: any) => {
        toast({
          title: t.error,
          description: error?.response?.data?.message || error.message,
          variant: 'destructive'
        });
      }
    });
  };

  // Mutation: مزامنة المخزون
  const useSyncStock = () => {
    return useMutation({
      mutationFn: (id: number) => inventoryService.syncStock(id),
      onSuccess: () => {
        toast({ title: t.success, description: t.stockSynced });
        queryClient.invalidateQueries({ queryKey: ['inventory-records'] });
      },
      onError: (error: any) => {
        toast({
          title: t.error,
          description: error?.response?.data?.message || error.message,
          variant: 'destructive'
        });
      }
    });
  };

  return {
    useGetAll,
    useGetById,
    useCreate,
    useUpdate,
    useUpdateNote,
    useDelete,
    useSyncStock
  };
};