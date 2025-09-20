import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentTypesQueries } from '@/services/paymentTypes/queries'
import { queryKeys } from './queryKeys'
import { message } from 'antd'
import type { Database } from '@/types/database'

type PaymentType = Database['public']['Tables']['payment_types']['Row']
type PaymentTypeInsert = Database['public']['Tables']['payment_types']['Insert']
type PaymentTypeUpdate = Database['public']['Tables']['payment_types']['Update']

// Query to get all payment types
export const usePaymentTypes = (includeInactive = false) => {
  return useQuery({
    queryKey: [...queryKeys.paymentTypes.all, { includeInactive }],
    queryFn: () => paymentTypesQueries.getAll(includeInactive),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Query to get a single payment type
export const usePaymentType = (id: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.paymentTypes.detail(id!),
    queryFn: () => paymentTypesQueries.getById(id!),
    enabled: !!id,
  })
}

// Mutation to create a payment type
export const useCreatePaymentType = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: PaymentTypeInsert) => paymentTypesQueries.create(data),
    onSuccess: (data) => {
      console.log('[useCreatePaymentType] Payment type created:', data)
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentTypes.all })
      message.success('Тип платежа успешно создан')
    },
    onError: (error: Error) => {
      console.error('[useCreatePaymentType] Error:', error)
      message.error(error.message || 'Ошибка при создании типа платежа')
    },
  })
}

// Mutation to update a payment type
export const useUpdatePaymentType = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PaymentTypeUpdate }) =>
      paymentTypesQueries.update(id, data),
    onSuccess: (data, variables) => {
      console.log('[useUpdatePaymentType] Payment type updated:', data)
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentTypes.all })
      queryClient.invalidateQueries({
        queryKey: queryKeys.paymentTypes.detail(variables.id),
      })
      message.success('Тип платежа успешно обновлен')
    },
    onError: (error: Error) => {
      console.error('[useUpdatePaymentType] Error:', error)
      message.error(error.message || 'Ошибка при обновлении типа платежа')
    },
  })
}

// Mutation to delete a payment type
export const useDeletePaymentType = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => paymentTypesQueries.delete(id),
    onSuccess: (_, id) => {
      console.log('[useDeletePaymentType] Payment type deleted:', id)
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentTypes.all })
      message.success('Тип платежа успешно удален')
    },
    onError: (error: Error) => {
      console.error('[useDeletePaymentType] Error:', error)
      message.error(error.message || 'Ошибка при удалении типа платежа')
    },
  })
}

// Mutation to update payment types order
export const useUpdatePaymentTypesOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (items: Array<{ id: string; display_order: number }>) =>
      paymentTypesQueries.updateOrder(items),
    onSuccess: () => {
      console.log('[useUpdatePaymentTypesOrder] Order updated')
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentTypes.all })
      message.success('Порядок типов платежей обновлен')
    },
    onError: (error: Error) => {
      console.error('[useUpdatePaymentTypesOrder] Error:', error)
      message.error(error.message || 'Ошибка при обновлении порядка')
    },
  })
}