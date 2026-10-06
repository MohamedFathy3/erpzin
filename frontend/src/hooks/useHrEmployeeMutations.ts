import { AxiosError } from 'axios';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { HrServices } from '@/services/HrService';
import type { AddEmployee, UpdateEmployee } from '@/types/Hr';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface UseHrEmployeeMutationsProps {
    onSuccess?: () => void;
    onClose?: () => void;
    resetForm?: () => void;
    setIsEditing?: React.Dispatch<React.SetStateAction<boolean>>;
    setCurrentId?: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useHrEmployeeMutations = ({
    onSuccess,
    onClose,
    resetForm,
    setIsEditing,
    setCurrentId
}: UseHrEmployeeMutationsProps = {}) => {
    const queryClient = useQueryClient();
    const { language } = useLanguage();

    const createEmployeeMutation = useMutation({
        mutationFn: HrServices.createEmployee,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });

            if (resetForm) resetForm();
            if (setIsEditing) setIsEditing(false);
            if (setCurrentId) setCurrentId(null);
            if (onClose) onClose();

            toast({
                title: language === 'ar' ? 'تم إضافة الموظف بنجاح' : 'Employee added successfully',
            });

            onSuccess?.();
        },
        onError: (error: unknown) => {
            let description = '';

            if (error instanceof AxiosError) {
                description = error.response?.data?.message || error.message;
            } else if (error instanceof Error) {
                description = error.message;
            } else {
                description = String(error);
            }

            toast({
                title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
                description,
                variant: 'destructive',
            });
        },
    });

    const updateEmployeeMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateEmployee }) => HrServices.updateEmployee(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] });

            if (resetForm) resetForm();
            if (setIsEditing) setIsEditing(false);
            if (setCurrentId) setCurrentId(null);
            if (onClose) onClose();

            toast({
                title: language === 'ar' ? 'تم تحديث الموظف بنجاح' : 'Employee updated successfully',
            });

            onSuccess?.();
        },
        onError: (error: unknown) => {
            let description = '';

            if (error instanceof AxiosError) {
                description = error.response?.data?.message || error.message;
            } else if (error instanceof Error) {
                description = error.message;
            } else {
                description = String(error);
            }

            toast({
                title: language === 'ar' ? 'حدث خطأ' : 'Error occurred',
                description,
                variant: 'destructive',
            });
        },
    });

    return {
        createEmployee: createEmployeeMutation,
        updateEmployee: updateEmployeeMutation,
        isPending: createEmployeeMutation.isPending || updateEmployeeMutation.isPending,
    };
};

