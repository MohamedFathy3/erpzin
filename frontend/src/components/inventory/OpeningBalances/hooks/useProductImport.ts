/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useProductImport.ts
import { useMutation } from '@tanstack/react-query';
import { ProductService } from '../services/productService';
import { useState } from 'react';

const productService = new ProductService();

export const useProductImport = () => {
  const [progress, setProgress] = useState(0);

  const mutation = useMutation({
    mutationFn: async (file: File) => {
      setProgress(0);
      const result = await productService.importProducts(file, (percent) => {
        setProgress(percent);
      });
      return result;
    },
    onSuccess: () => {
      setProgress(100);
    },
    onError: (error: any) => {
      console.error('Import error:', error);
      setProgress(0);
    }
  });

  return {
    importMutation: mutation,
    progress
  };
};