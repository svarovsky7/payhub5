/**
 * TanStack Query hooks for invoices
 */

import { 
  useMutation, 
  type UseMutationOptions, 
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query'
import { message } from 'antd'

import { 
  InvoiceCrudService, 
  type InvoiceFilters, 
  InvoiceQueryService,
  type InvoiceStats,
  type InvoiceWithRelations,
  InvoiceWorkflowService
} from '../invoices'
import { type WorkflowAction } from '../invoices/workflow'
import { 
  type Invoice, 
  type InvoiceInsert, 
  type InvoiceUpdate, 
  type PaginatedResponse,
  type PaginationParams
} from '../supabase'
import { mutationKeys, queryKeys } from './queryKeys'

// Query hooks
export const useInvoicesList = (
  companyId: string,
  filters?: InvoiceFilters,
  pagination?: PaginationParams,
  options?: UseQueryOptions<PaginatedResponse<InvoiceWithRelations>>
) => {
  return useQuery({
    queryKey: queryKeys.invoices.list(companyId, { filters, pagination }),
    queryFn: () => InvoiceQueryService.getList(filters, pagination),
    enabled: !!companyId,
    staleTime: 30000, // 30 seconds
    ...options,
  })
}

export const useInvoice = (
  id: string,
  options?: UseQueryOptions<InvoiceWithRelations>
) => {
  return useQuery({
    queryKey: queryKeys.invoices.item(id),
    queryFn: async () => {
      const result = await InvoiceCrudService.getById(id)
      if (result.error) {throw new Error(result.error)}
      return result.data!
    },
    enabled: !!id,
    staleTime: 60000, // 1 minute
    ...options,
  })
}

const useInvoicesStats = (
  companyId: string,
  filters?: InvoiceFilters,
  options?: UseQueryOptions<InvoiceStats>
) => {
  return useQuery({
    queryKey: queryKeys.invoices.stats(companyId, filters),
    queryFn: () => InvoiceQueryService.getStats(companyId, filters),
    enabled: !!companyId,
    staleTime: 60000, // 1 minute
    ...options,
  })
}

const useInvoicesDashboard = (
  companyId: string,
  options?: UseQueryOptions<any>
) => {
  return useQuery({
    queryKey: queryKeys.invoices.dashboard(companyId),
    queryFn: () => InvoiceQueryService.getDashboardData(companyId),
    enabled: !!companyId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
    ...options,
  })
}

const useMyInvoiceTasks = (
  userId: string,
  companyId: string,
  options?: UseQueryOptions<InvoiceWithRelations[]>
) => {
  return useQuery({
    queryKey: queryKeys.invoices.myTasks(userId, companyId),
    queryFn: () => InvoiceQueryService.getMyTasks(userId, companyId),
    enabled: !!(userId && companyId),
    staleTime: 15000, // 15 seconds
    refetchInterval: 30000, // Refresh every 30 seconds
    ...options,
  })
}

// Unused exports - removed
// export const useInvoiceWorkflowHistory = (
//   invoiceId: string,
//   options?: UseQueryOptions<WorkflowAction[]>
// ) => {
//   return useQuery({
//     queryKey: queryKeys.invoices.workflowHistory(invoiceId),
//     queryFn: () => InvoiceWorkflowService.getWorkflowHistory(invoiceId),
//     enabled: !!invoiceId,
//     staleTime: 30000, // 30 seconds
//     ...options,
//   })
// }

// export const useInvoiceApprovalHistory = (
//   invoiceId: string,
//   options?: UseQueryOptions<any[]>
// ) => {
//   return useQuery({
//     queryKey: ['invoices', 'approvals', invoiceId],
//     queryFn: async () => {
//       console.log('[useInvoiceApprovalHistory] Fetching approval history for invoice:', invoiceId)
//       // For now, return mock data until we have the proper service
//       return []
//     },
//     enabled: !!invoiceId,
//     staleTime: 30000, // 30 seconds
//     ...options,
//   })
// }

// Mutation hooks
export const useCreateInvoice = (
  options?: UseMutationOptions<Invoice, Error, InvoiceInsert>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [mutationKeys.createInvoice],
    mutationFn: async (invoiceData: InvoiceInsert) => {
      console.log('[useCreateInvoice] Создание счета:', invoiceData);
      const result = await InvoiceCrudService.create(invoiceData)
      if (result.error) {
        console.error('[useCreateInvoice] Ошибка создания:', result.error);
        // Передаем полную информацию об ошибке
        const errorMessage = typeof result.error === 'object' 
          ? JSON.stringify(result.error) 
          : result.error;
        throw new Error(errorMessage);
      }
      console.log('[useCreateInvoice] Счет успешно создан:', result.data);
      return result.data!
    },
    onSuccess: (data, variables) => {
      message.success('Заявка создана успешно')
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
      // Only invalidate company-specific queries if company_id is provided
      if (variables.company_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices.stats(variables.company_id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices.dashboard(variables.company_id) })
      }
    },
    onError: (error) => {
      message.error(error.message || 'Ошибка создания заявки')
    },
    ...options,
  })
}

export const useUpdateInvoice = (
  options?: UseMutationOptions<Invoice, Error, { id: string; updates: InvoiceUpdate; companyId: string }>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [mutationKeys.updateInvoice],
    mutationFn: async ({ id, updates }) => {
      const result = await InvoiceCrudService.update(id, updates)
      if (result.error) {throw new Error(result.error)}
      return result.data!
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.invoices.item(id) })

      // Snapshot previous value
      const previousInvoice = queryClient.getQueryData(queryKeys.invoices.item(id))

      // Optimistically update
      if (previousInvoice) {
        queryClient.setQueryData(queryKeys.invoices.item(id), {
          ...previousInvoice,
          ...updates,
          updated_at: new Date().toISOString(),
        })
      }

      return { previousInvoice }
    },
    onSuccess: (data, { companyId }) => {
      message.success('Заявка обновлена успешно')
      
      // Update specific item query
      queryClient.setQueryData(queryKeys.invoices.item(data.id), data)
      
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.list(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.stats(companyId) })
    },
    onError: (error, { id }, context) => {
      // Rollback optimistic update
      if (context?.previousInvoice) {
        queryClient.setQueryData(queryKeys.invoices.item(id), context.previousInvoice)
      }
      message.error(error.message || 'Ошибка обновления заявки')
    },
    ...options,
  })
}

export const useDeleteInvoice = (
  options?: UseMutationOptions<null, Error, { id: string; companyId: string }>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [mutationKeys.deleteInvoice],
    mutationFn: async ({ id }) => {
      const result = await InvoiceCrudService.delete(id)
      if (result.error) {throw new Error(result.error)}
      return result.data
    },
    onSuccess: (_, { id, companyId }) => {
      message.success('Заявка удалена успешно')
      
      // Remove from cache
      queryClient.removeQueries({ queryKey: queryKeys.invoices.item(id) })
      
      // Invalidate lists and stats
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.stats(companyId) })
    },
    onError: (error) => {
      message.error(error.message || 'Ошибка удаления заявки')
    },
    ...options,
  })
}

const useSubmitInvoice = (
  options?: UseMutationOptions<Invoice, Error, { invoiceId: string; userId: string; companyId: string; comment?: string }>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [mutationKeys.submitInvoice],
    mutationFn: async ({ invoiceId, userId, comment }) => {
      const result = await InvoiceWorkflowService.submitInvoice(invoiceId, userId, comment)
      if (result.error) {throw new Error(result.error)}
      return result.data!
    },
    onSuccess: (data, { companyId, userId }) => {
      message.success('Заявка отправлена на согласование')
      
      // Update specific item
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.item(data.id) })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.myTasks(userId, companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.workflowHistory(data.id) })
    },
    onError: (error) => {
      message.error(error.message || 'Ошибка отправки заявки на согласование')
    },
    ...options,
  })
}

const useApproveInvoice = (
  options?: UseMutationOptions<Invoice, Error, { invoiceId: string; stepId: string; userId: string; companyId: string; comment?: string }>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [mutationKeys.approveInvoice],
    mutationFn: async ({ invoiceId, stepId, userId, comment }) => {
      const result = await InvoiceWorkflowService.approveInvoice(invoiceId, stepId, userId, comment)
      if (result.error) {throw new Error(result.error)}
      return result.data!
    },
    onSuccess: (data, { companyId, userId }) => {
      message.success('Заявка согласована')
      
      // Update specific item
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.item(data.id) })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.myTasks(userId, companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.workflowHistory(data.id) })
    },
    onError: (error) => {
      message.error(error.message || 'Ошибка согласования заявки')
    },
    ...options,
  })
}

const useRejectInvoice = (
  options?: UseMutationOptions<Invoice, Error, { invoiceId: string; stepId: string; userId: string; companyId: string; comment: string }>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [mutationKeys.rejectInvoice],
    mutationFn: async ({ invoiceId, stepId, userId, comment }) => {
      const result = await InvoiceWorkflowService.rejectInvoice(invoiceId, stepId, userId, comment)
      if (result.error) {throw new Error(result.error)}
      return result.data!
    },
    onSuccess: (data, { companyId, userId }) => {
      message.success('Заявка отклонена')
      
      // Update specific item
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.item(data.id) })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.myTasks(userId, companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.workflowHistory(data.id) })
    },
    onError: (error) => {
      message.error(error.message || 'Ошибка отклонения заявки')
    },
    ...options,
  })
}

const useCancelInvoice = (
  options?: UseMutationOptions<Invoice, Error, { invoiceId: string; userId: string; companyId: string; comment?: string }>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: [mutationKeys.cancelInvoice],
    mutationFn: async ({ invoiceId, userId, comment }) => {
      const result = await InvoiceWorkflowService.cancelInvoice(invoiceId, userId, comment)
      if (result.error) {throw new Error(result.error)}
      return result.data!
    },
    onSuccess: (data, { companyId }) => {
      message.success('Заявка отменена')
      
      // Update specific item
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.item(data.id) })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.stats(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.workflowHistory(data.id) })
    },
    onError: (error) => {
      message.error(error.message || 'Ошибка отмены заявки')
    },
    ...options,
  })
}

const useCloneInvoice = (
  options?: UseMutationOptions<Invoice, Error, { id: string; companyId: string }>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['cloneInvoice'],
    mutationFn: async ({ id }) => {
      const result = await InvoiceCrudService.clone(id)
      if (result.error) {throw new Error(result.error)}
      return result.data!
    },
    onSuccess: (data, { companyId }) => {
      message.success('Заявка скопирована')
      
      // Invalidate lists to show new item
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.list(companyId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.stats(companyId) })
    },
    onError: (error) => {
      message.error(error.message || 'Ошибка копирования заявки')
    },
    ...options,
  })
}

const useInvoiceFileUpload = (
  options?: UseMutationOptions<string, Error, { invoiceId: string; file: File; companyId: string }>
) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationKey: ['uploadInvoiceFile'],
    mutationFn: async ({ invoiceId, file }) => {
      const result = await InvoiceCrudService.uploadFile(invoiceId, file)
      if (result.error) {throw new Error(result.error)}
      return result.data!
    },
    onSuccess: (_, { invoiceId, companyId }) => {
      message.success('Файл загружен успешно')
      
      // Invalidate specific invoice to refresh attachments
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.item(invoiceId) })
    },
    onError: (error) => {
      message.error(error.message || 'Ошибка загрузки файла')
    },
    ...options,
  })
}

export const useInvoiceExport = (
  options?: UseMutationOptions<void, Error, { filters?: InvoiceFilters; filename?: string }>
) => {
  return useMutation({
    mutationKey: ['exportInvoices'],
    mutationFn: async ({ filters = {}, filename = 'invoices' }) => {
      await InvoiceQueryService.exportToExcel(filters, filename)
    },
    onSuccess: () => {
      message.success('Экспорт заявок завершен')
    },
    onError: (error) => {
      message.error(error.message || 'Ошибка экспорта заявок')
    },
    ...options,
  })
}