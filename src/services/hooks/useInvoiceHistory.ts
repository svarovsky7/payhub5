/**
 * React Query хук для работы с историей счетов
 */

import { useQuery } from '@tanstack/react-query'
import { type HistoryFilter, InvoiceHistoryService } from '../invoices/history-service'

/**
 * Хук для получения истории счета
 */
export function useInvoiceHistory(invoiceId: string | number | undefined, filter?: HistoryFilter) {
  return useQuery({
    queryKey: ['invoice-history', invoiceId, filter],
    queryFn: async () => {
      if (!invoiceId) {return []}

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





