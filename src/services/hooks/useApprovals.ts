import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import { ApprovalQueryService } from '../approvals/queries'
import { queryKeys } from './queryKeys'
import { useAuth } from '../../models/auth'
import { useAuthStore } from '../../models/auth'

/**
 * Получить список платежей на согласовании для текущего пользователя
 */
export const useMyApprovals = (pagination?: { page?: number; limit?: number }) => {
  const { user, profile } = useAuth()
  const testRole = useAuthStore((state) => state.testRole)
  
  return useQuery({
    queryKey: queryKeys.approvals.myApprovals(user?.id || '', { ...pagination, role: testRole, projectIds: profile?.project_ids }),
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }
      
      // Подготавливаем параметры для фильтрации
      const userProfile = {
        roles: profile?.roles,
        project_ids: profile?.project_ids
      }
      
      console.log('[useMyApprovals] Загрузка платежей на согласовании для пользователя:', user.id, 'с ролью:', testRole, 'профиль:', userProfile)
      const result = await ApprovalQueryService.getMyApprovals(user.id, pagination, testRole, userProfile)
      
      if (result.error) {
        throw new Error(result.error)
      }
      
      console.log('[useMyApprovals] Загружено платежей:', result.data.length)
      return result
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 секунд
  })
}

/**
 * Одобрить платеж
 */
export const useApprovePayment = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ workflowId, comment }: { workflowId: number; comment?: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }
      
      console.log('[useApprovePayment] Одобрение платежа:', { workflowId, userId: user.id })
      const result = await ApprovalQueryService.approvePayment(workflowId, user.id, comment)
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка одобрения платежа')
      }
      
      return result
    },
    onSuccess: () => {
      // Инвалидируем все связанные запросы
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
      
      message.success('Платеж успешно одобрен')
    },
    onError: (error: any) => {
      console.error('[useApprovePayment] Ошибка:', error)
      message.error(error.message || 'Ошибка одобрения платежа')
    },
  })
}

/**
 * Отклонить платеж
 */
export const useRejectPayment = () => {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  
  return useMutation({
    mutationFn: async ({ workflowId, reason }: { workflowId: number; reason: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated')
      }
      
      console.log('[useRejectPayment] Отклонение платежа:', { workflowId, userId: user.id })
      const result = await ApprovalQueryService.rejectPayment(workflowId, user.id, reason)
      
      if (!result.success) {
        throw new Error(result.error || 'Ошибка отклонения платежа')
      }
      
      return result
    },
    onSuccess: () => {
      // Инвалидируем все связанные запросы
      queryClient.invalidateQueries({ queryKey: queryKeys.approvals.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.payments.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
      
      message.success('Платеж отклонен')
    },
    onError: (error: any) => {
      console.error('[useRejectPayment] Ошибка:', error)
      message.error(error.message || 'Ошибка отклонения платежа')
    },
  })
}