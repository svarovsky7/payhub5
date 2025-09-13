/**
 * Realtime subscriptions for PayHub
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { subscribeToTable } from '../supabase'
import { queryKeys } from './queryKeys'

export interface UseRealtimeOptions {
  companyId: string
  userId?: string
  enableNotifications?: boolean
  onUpdate?: (data: any) => void
  onError?: (error: Error) => void
}

// Универсальный хук для подписки на изменения в таблице
export const useRealtimeSubscription = <T = any>(
  tableName: string,
  options: UseRealtimeOptions
) => {
  const queryClient = useQueryClient()
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const { companyId, userId, enableNotifications = true, onUpdate, onError } = options

  useEffect(() => {
    if (!companyId) {return}

    const unsubscribe = subscribeToTable<T>(
      tableName,
      (payload) => {
        try {
          const { eventType, new: newRecord, old: oldRecord } = payload

          // Вызываем кастомный обработчик
          onUpdate?.(payload)

          // Показываем уведомления если включены
          if (enableNotifications && newRecord.company_id === companyId) {
            switch (eventType) {
              case 'INSERT':
                handleInsertNotification(tableName, newRecord, userId)
                break
              case 'UPDATE':
                handleUpdateNotification(tableName, newRecord, oldRecord, userId)
                break
              case 'DELETE':
                handleDeleteNotification(tableName, oldRecord, userId)
                break
            }
          }

          // Инвалидируем связанные запросы
          invalidateRelatedQueries(tableName, queryClient, companyId, newRecord || oldRecord)
        } catch (error) {
          console.error(`Ошибка обработки realtime события для ${tableName}:`, error)
          onError?.(error instanceof Error ? error : new Error('Неизвестная ошибка'))
        }
      },
      { column: 'company_id', value: companyId }
    )

    unsubscribeRef.current = unsubscribe

    return () => {
      unsubscribe()
      unsubscribeRef.current = null
    }
  }, [tableName, companyId, userId, enableNotifications, onUpdate, onError])

  return {
    isConnected: !!unsubscribeRef.current,
    disconnect: () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }
}

// Специализированные хуки для каждой сущности
export const useInvoicesRealtime = (options: UseRealtimeOptions) => {
  return useRealtimeSubscription('invoices', {
    ...options,
    onUpdate: (payload) => {
      const { eventType, new: newInvoice } = payload
      
      // Дополнительная логика для заявок
      if (eventType === 'UPDATE' && newInvoice.status === 'pending') {
        // Обновляем задачи пользователя если статус изменился на pending
        const queryClient = useQueryClient()
        if (options.userId) {
          queryClient.invalidateQueries({ 
            queryKey: queryKeys.invoicesMyTasks(options.userId, options.companyId) 
          })
        }
      }
      
      options.onUpdate?.(payload)
    }
  })
}

export const usePaymentsRealtime = (options: UseRealtimeOptions) => {
  return useRealtimeSubscription('payments', options)
}

export const useContractorsRealtime = (options: UseRealtimeOptions) => {
  return useRealtimeSubscription('contractors', options)
}

export const useProjectsRealtime = (options: UseRealtimeOptions) => {
  return useRealtimeSubscription('projects', options)
}

export const useUsersRealtime = (options: UseRealtimeOptions) => {
  return useRealtimeSubscription('users', options)
}

export const useWorkflowRealtime = (options: UseRealtimeOptions) => {
  return useRealtimeSubscription('workflow_instances', options)
}

// Комбинированный хук для подписки на все основные сущности
export const usePayHubRealtime = (options: UseRealtimeOptions) => {
  const invoicesRealtime = useInvoicesRealtime(options)
  const paymentsRealtime = usePaymentsRealtime(options)
  const contractorsRealtime = useContractorsRealtime(options)
  const projectsRealtime = useProjectsRealtime(options)
  const workflowRealtime = useWorkflowRealtime(options)

  return {
    invoices: invoicesRealtime,
    payments: paymentsRealtime,
    contractors: contractorsRealtime,
    projects: projectsRealtime,
    workflow: workflowRealtime,
    disconnectAll: () => {
      invoicesRealtime.disconnect()
      paymentsRealtime.disconnect()
      contractorsRealtime.disconnect()
      projectsRealtime.disconnect()
      workflowRealtime.disconnect()
    }
  }
}

// Хелперы для уведомлений
function handleInsertNotification(tableName: string, record: any, currentUserId?: string) {
  if (record.created_by === currentUserId) {return} // Не показываем уведомления о собственных действиях

  const notifications = {
    invoices: `Создана новая заявка: ${record.title || record.invoice_number}`,
    payments: `Создан новый платеж: ${record.payment_number}`,
    contractors: `Добавлен новый поставщик: ${record.name}`,
    projects: `Создан новый проект: ${record.name}`,
    users: `Добавлен новый пользователь: ${record.first_name} ${record.last_name}`,
  }

  const message = notifications[tableName as keyof typeof notifications]
  if (message) {
    toast.success(message, { duration: 4000 })
  }
}

function handleUpdateNotification(tableName: string, newRecord: any, oldRecord: any, currentUserId?: string) {
  // Не показываем уведомления о собственных действиях
  if (newRecord.updated_by === currentUserId || newRecord.created_by === currentUserId) {return}

  // Специальные уведомления для изменения статуса
  if (tableName === 'invoices' && newRecord.status !== oldRecord.status) {
    const statusMessages = {
      pending: 'отправлена на согласование',
      approved: 'согласована',
      rejected: 'отклонена',
      paid: 'оплачена',
      cancelled: 'отменена',
    }
    
    const statusMessage = statusMessages[newRecord.status as keyof typeof statusMessages]
    if (statusMessage) {
      message.info(`Заявка ${newRecord.invoice_number} ${statusMessage}`, { duration: 4000 })
    }
    return
  }

  if (tableName === 'payments' && newRecord.status !== oldRecord.status) {
    const statusMessages = {
      processing: 'в обработке',
      completed: 'завершен',
      failed: 'отклонен',
      cancelled: 'отменен',
    }
    
    const statusMessage = statusMessages[newRecord.status as keyof typeof statusMessages]
    if (statusMessage) {
      message.info(`Платеж ${newRecord.payment_number} ${statusMessage}`, { duration: 4000 })
    }
    return
  }

  // Общие уведомления об обновлении
  const notifications = {
    invoices: `Обновлена заявка: ${newRecord.title || newRecord.invoice_number}`,
    payments: `Обновлен платеж: ${newRecord.payment_number}`,
    contractors: `Обновлен поставщик: ${newRecord.name}`,
    projects: `Обновлен проект: ${newRecord.name}`,
  }

  const message = notifications[tableName as keyof typeof notifications]
  if (message) {
    toast(`${message}`, { 
      duration: 3000,
      icon: '🔄'
    })
  }
}

function handleDeleteNotification(tableName: string, record: any, currentUserId?: string) {
  if (record.created_by === currentUserId) {return}

  const notifications = {
    invoices: `Удалена заявка: ${record.title || record.invoice_number}`,
    payments: `Удален платеж: ${record.payment_number}`,
    contractors: `Удален поставщик: ${record.name}`,
    projects: `Удален проект: ${record.name}`,
  }

  const message = notifications[tableName as keyof typeof notifications]
  if (message) {
    toast.error(message, { duration: 3000 })
  }
}

// Инвалидация связанных запросов
function invalidateRelatedQueries(
  tableName: string,
  queryClient: any,
  companyId: string,
  record: any
) {
  switch (tableName) {
    case 'invoices':
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices() })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoicesStats(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoicesDashboard(companyId) })
      
      // Инвалидируем задачи если изменился статус или текущий шаг
      if (record.current_step_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.invoicesMyTasks('', companyId) // Инвалидируем все задачи
        })
      }
      break

    case 'payments':
      queryClient.invalidateQueries({ queryKey: queryKeys.payments() })
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentsStats(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentsDashboard(companyId) })
      
      // Также обновляем связанную заявку
      if (record.invoice_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.invoicesItem(record.invoice_id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.paymentsByInvoice(record.invoice_id) })
      }
      break

    case 'contractors':
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors() })
      queryClient.invalidateQueries({ queryKey: queryKeys.contractorsStats(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.contractorsDashboard(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.contractorsActive(companyId) })
      break

    case 'projects':
      queryClient.invalidateQueries({ queryKey: queryKeys.projects() })
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsStats(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsDashboard(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.projectsActive(companyId) })
      break

    case 'users':
      queryClient.invalidateQueries({ queryKey: queryKeys.users() })
      queryClient.invalidateQueries({ queryKey: queryKeys.usersStats(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.usersActive(companyId) })
      break

    case 'workflow_instances':
      // Инвалидируем заявки так как изменился их workflow статус
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices() })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoicesMyTasks('', companyId) })
      
      if (record.entity_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.invoicesWorkflowHistory(record.entity_id) 
        })
      }
      break

    default:
      // Для неизвестных таблиц инвалидируем общие запросы
      queryClient.invalidateQueries({ queryKey: queryKeys.all })
  }
}

// Хук для проверки статуса подключения к realtime
export const useRealtimeStatus = () => {
  const subscriptions = useRef<Set<string>>(new Set())
  
  const addSubscription = (tableName: string) => {
    subscriptions.current.add(tableName)
  }
  
  const removeSubscription = (tableName: string) => {
    subscriptions.current.delete(tableName)
  }
  
  const getActiveSubscriptions = () => {
    return Array.from(subscriptions.current)
  }
  
  return {
    addSubscription,
    removeSubscription,
    getActiveSubscriptions,
    isConnected: subscriptions.current.size > 0,
  }
}