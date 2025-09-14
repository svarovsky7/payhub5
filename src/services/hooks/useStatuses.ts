/**
 * React Query хуки для работы со статусами
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { StatusQueryService } from '../statuses/queries'
import type { Status } from '../statuses/crud'
import { QUERY_KEYS } from './queryKeys'

/**
 * Хук для получения всех статусов
 */
export const useStatuses = () => {
  return useQuery({
    queryKey: [QUERY_KEYS.STATUSES],
    queryFn: () => StatusQueryService.getAll(),
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}

// Алиас для обратной совместимости
export const useStatusesList = useStatuses

// Unused exports - removed
// /**
//  * Хук для получения статусов счетов
//  */
// export const useInvoiceStatuses = () => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.STATUSES, 'invoice'],
//     queryFn: () => StatusQueryService.getInvoiceStatuses(),
//     staleTime: 1000 * 60 * 5, // 5 минут
//   })
// }

// /**
//  * Хук для получения статусов платежей
//  */
// export const usePaymentStatuses = () => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.STATUSES, 'payment'],
//     queryFn: () => StatusQueryService.getPaymentStatuses(),
//     staleTime: 1000 * 60 * 5, // 5 минут
//   })
// }

// /**
//  * Хук для получения статусов проектов
//  */
// export const useProjectStatuses = () => {
//   return useQuery({
//     queryKey: [QUERY_KEYS.STATUSES, 'project'],
//     queryFn: () => StatusQueryService.getProjectStatuses(),
//     staleTime: 1000 * 60 * 5, // 5 минут
//   })
// }

/**
 * Хук для получения статуса по коду
 */
const useStatusByCode = (entityType: 'invoice' | 'payment' | 'project', code: string) => {
  return useQuery({
    queryKey: [QUERY_KEYS.STATUSES, entityType, code],
    queryFn: () => StatusQueryService.getByCode(entityType, code),
    enabled: !!code,
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}

/**
 * Хук для получения статуса по ID
 */
const useStatusById = (id: number | undefined) => {
  return useQuery({
    queryKey: [QUERY_KEYS.STATUSES, 'byId', id],
    queryFn: () => StatusQueryService.getById(id!),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}

/**
 * Хук для получения начального статуса
 */
const useInitialStatus = (entityType: 'invoice' | 'payment' | 'project') => {
  return useQuery({
    queryKey: [QUERY_KEYS.STATUSES, entityType, 'initial'],
    queryFn: () => StatusQueryService.getInitialStatus(entityType),
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}

/**
 * Хук для получения финальных статусов
 */
const useFinalStatuses = (entityType: 'invoice' | 'payment' | 'project') => {
  return useQuery({
    queryKey: [QUERY_KEYS.STATUSES, entityType, 'final'],
    queryFn: () => StatusQueryService.getFinalStatuses(entityType),
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}

/**
 * Хук для создания статуса
 */
export const useCreateStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: StatusQueryService.create,
    onSuccess: (status) => {
      console.log('[useCreateStatus] Статус создан:', status.id)
      // Инвалидируем кеш статусов
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATUSES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATUSES, status.entity_type] })
    },
    onError: (error) => {
      console.error('[useCreateStatus] Ошибка создания статуса:', error)
    },
  })
}

/**
 * Хук для обновления статуса
 */
export const useUpdateStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof StatusQueryService.update>[1] }) =>
      StatusQueryService.update(id, data),
    onSuccess: (status) => {
      console.log('[useUpdateStatus] Статус обновлен:', status.id)
      // Инвалидируем кеш статусов
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATUSES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATUSES, status.entity_type] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATUSES, 'byId', status.id] })
    },
    onError: (error) => {
      console.error('[useUpdateStatus] Ошибка обновления статуса:', error)
    },
  })
}

/**
 * Хук для удаления статуса
 */
export const useDeleteStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: StatusQueryService.delete,
    onSuccess: (status) => {
      console.log('[useDeleteStatus] Статус удален:', status.id)
      // Инвалидируем кеш статусов
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATUSES] })
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.STATUSES, status.entity_type] })
    },
    onError: (error) => {
      console.error('[useDeleteStatus] Ошибка удаления статуса:', error)
    },
  })
}

/**
 * Утилиты для работы со статусами
 */
const statusUtils = {
  /**
   * Получить цвет статуса для отображения
   */
  getStatusColor: (status: Status | undefined): string => {
    if (!status) {return 'default'}
    return status.color || 'default'
  },

  /**
   * Проверить, является ли статус финальным
   */
  isFinalStatus: (status: Status | undefined): boolean => {
    if (!status) {return false}
    return status.is_final || false
  },

  /**
   * Получить описание статуса
   */
  getStatusDescription: (status: Status | undefined): string => {
    if (!status) {return ''}
    return status.description || ''
  },

  /**
   * Получить название статуса
   */
  getStatusName: (status: Status | undefined): string => {
    if (!status) {return ''}
    return status.name || status.code || ''
  },

  /**
   * Проверить, можно ли изменить статус
   */
  canChangeStatus: (currentStatus: Status | undefined): boolean => {
    if (!currentStatus) {return true}
    return !currentStatus.is_final
  },
}