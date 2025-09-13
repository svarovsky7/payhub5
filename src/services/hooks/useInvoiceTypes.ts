import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { supabase } from '../supabase';
import { queryKeys } from './queryKeys';

export interface InvoiceType {
  id: number;
  code: string;
  name: string;
  description?: string;
  created_at?: string;
}

// Список типов счетов
export const useInvoiceTypesList = () => {
  return useQuery({
    queryKey: queryKeys.invoiceTypes.all,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoice_types')
        .select('*')
        .order('name');
      
      if (error) {throw error;}
      return data as InvoiceType[];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Создание типа счета
export const useCreateInvoiceType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (invoiceType: Omit<InvoiceType, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('invoice_types')
        .insert([invoiceType])
        .select()
        .single();
      
      if (error) {throw error;}
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoiceTypes.all });
      message.success('Тип счета создан');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка создания типа счета');
    },
  });
};

// Обновление типа счета
export const useUpdateInvoiceType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<InvoiceType> & { id: number }) => {
      const { data, error } = await supabase
        .from('invoice_types')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {throw error;}
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoiceTypes.all });
      message.success('Тип счета обновлен');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка обновления типа счета');
    },
  });
};

// Удаление типа счета
export const useDeleteInvoiceType = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase
        .from('invoice_types')
        .delete()
        .eq('id', id);
      
      if (error) {throw error;}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoiceTypes.all });
      message.success('Тип счета удален');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка удаления типа счета');
    },
  });
};