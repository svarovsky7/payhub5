/**
 * React Query хук для работы с историей счетов
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { InvoiceHistoryService, type InvoiceHistoryEntry, type HistoryFilter } from '../invoices/history-service'
import { message } from 'antd'

/**
 * Хук для получения истории счета
 */
export function useInvoiceHistory(invoiceId: string | number | undefined, filter?: HistoryFilter) {
  return useQuery({
    queryKey: ['invoice-history', invoiceId, filter],
    queryFn: async () => {
      if (!invoiceId) return []

      const response = await InvoiceHistoryService.getInvoiceHistory(invoiceId, filter)

      if (response.error) {
        console.error('[useInvoiceHistory] Ошибка загрузки истории:', response.error)
        throw new Error(response.error.message)
      }

      return response.data || []
    },
    enabled: !!invoiceId,
    staleTime: 30 * 1000, // 30 секунд
    refetchOnWindowFocus: false
  })
}

/**
 * Хук для получения истории платежей по счету
 */
export function useInvoicePaymentHistory(invoiceId: string | number | undefined) {
  return useQuery({
    queryKey: ['invoice-payment-history', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return []

      const response = await InvoiceHistoryService.getPaymentHistory(invoiceId)

      if (response.error) {
        console.error('[useInvoicePaymentHistory] Ошибка загрузки истории платежей:', response.error)
        throw new Error(response.error.message)
      }

      return response.data || []
    },
    enabled: !!invoiceId,
    staleTime: 30 * 1000
  })
}

/**
 * Хук для получения истории документов счета
 */
export function useInvoiceDocumentHistory(invoiceId: string | number | undefined) {
  return useQuery({
    queryKey: ['invoice-document-history', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return []

      const response = await InvoiceHistoryService.getDocumentHistory(invoiceId)

      if (response.error) {
        console.error('[useInvoiceDocumentHistory] Ошибка загрузки истории документов:', response.error)
        throw new Error(response.error.message)
      }

      return response.data || []
    },
    enabled: !!invoiceId,
    staleTime: 30 * 1000
  })
}

/**
 * Хук для добавления комментария в историю
 */
export function useAddInvoiceComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ invoiceId, comment }: { invoiceId: string | number; comment: string }) => {
      const response = await InvoiceHistoryService.addComment(invoiceId, comment)

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data
    },
    onSuccess: (_, variables) => {
      // Инвалидируем кэш истории
      queryClient.invalidateQueries({ queryKey: ['invoice-history', variables.invoiceId] })
      message.success('Комментарий добавлен')
    },
    onError: (error) => {
      console.error('[useAddInvoiceComment] Ошибка:', error)
      message.error('Ошибка при добавлении комментария')
    }
  })
}

/**
 * Хук для добавления произвольного события в историю
 */
export function useAddInvoiceHistoryEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      invoiceId,
      eventType,
      action,
      description,
      metadata
    }: {
      invoiceId: string | number
      eventType: string
      action: string
      description?: string
      metadata?: Record<string, any>
    }) => {
      const response = await InvoiceHistoryService.addCustomEvent(
        invoiceId,
        eventType,
        action,
        description,
        metadata
      )

      if (response.error) {
        throw new Error(response.error.message)
      }

      return response.data
    },
    onSuccess: (_, variables) => {
      // Инвалидируем кэш истории
      queryClient.invalidateQueries({ queryKey: ['invoice-history', variables.invoiceId] })
    },
    onError: (error) => {
      console.error('[useAddInvoiceHistoryEvent] Ошибка:', error)
      message.error('Ошибка при добавлении события в историю')
    }
  })
}

/**
 * Хук для получения статистики по истории счета
 */
export function useInvoiceHistoryStats(invoiceId: string | number | undefined) {
  return useQuery({
    queryKey: ['invoice-history-stats', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null

      const response = await InvoiceHistoryService.getHistoryStats(invoiceId)

      if (response.error) {
        console.error('[useInvoiceHistoryStats] Ошибка загрузки статистики:', response.error)
        throw new Error(response.error.message)
      }

      return response.data
    },
    enabled: !!invoiceId,
    staleTime: 60 * 1000 // 1 минута
  })
}