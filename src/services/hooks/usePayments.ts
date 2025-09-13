import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { PaymentCrudService, PaymentQueryService } from '../payments';
import { queryKeys } from './queryKeys';

// Список платежей
export const usePaymentsList = (invoiceId?: number, filters?: any, pagination?: any) => {
  return useQuery({
    queryKey: queryKeys.payments.list(invoiceId?.toString(), filters, pagination),
    queryFn: async () => {
      console.log('[usePaymentsList] Загрузка платежей, invoiceId:', invoiceId, 'filters:', filters);
      const paymentFilters = {
        ...(filters || {}),
        ...(invoiceId ? { invoiceId: invoiceId.toString() } : {})
      };
      const result = await PaymentQueryService.getList(
        paymentFilters,
        pagination || { limit: 20 }
      );
      console.log('[usePaymentsList] Результат загрузки:', {
        count: result.count,
        dataLength: result.data?.length
      });
      return {
        data: result.data || [],
        total: result.count || 0,
        error: result.error
      };
    },
  });
};

// Создание платежа
export const useCreatePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: PaymentCrudService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      message.success('Платеж создан');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка создания платежа');
    },
  });
};

// Подтверждение платежа
export const useConfirmPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: PaymentCrudService.confirmPayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      message.success('Платеж подтвержден');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка подтверждения платежа');
    },
  });
};

// Отмена платежа
export const useCancelPayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => 
      PaymentCrudService.cancelPayment(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      message.success('Платеж отменен');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка отмены платежа');
    },
  });
};

// Удаление платежа
export const useDeletePayment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => PaymentCrudService.deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      message.success('Платеж удален');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка удаления платежа');
    },
  });
};