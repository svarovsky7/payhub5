/**
 * Optimized React Query hooks for invoices with caching and performance improvements
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { InvoiceCrudService } from '../invoices/crud'
import { OptimizedInvoiceQueryService } from '../invoices/optimized-queries'
import { CacheKeys, CacheTTL, invalidateCache, queryCache } from '../cache/query-cache'
import type { InvoiceFilters, InvoiceWithRelations } from '../invoices/queries'
import type { Invoice, InvoiceInsert, InvoiceUpdate, PaginationParams } from '../supabase'

export const INVOICE_QUERY_KEYS = {
  all: ['invoices'] as const,
  lists: () => [...INVOICE_QUERY_KEYS.all, 'list'] as const,
  list: (filters: InvoiceFilters, pagination: PaginationParams) => 
    [...INVOICE_QUERY_KEYS.lists(), { filters, pagination }] as const,
  details: () => [...INVOICE_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...INVOICE_QUERY_KEYS.details(), id] as const,
  stats: (companyId: string, filters?: InvoiceFilters) => 
    [...INVOICE_QUERY_KEYS.all, 'stats', companyId, filters] as const,
  dashboard: (companyId: string) => 
    [...INVOICE_QUERY_KEYS.all, 'dashboard', companyId] as const,
  search: (query: string, companyId: string) => 
    [...INVOICE_QUERY_KEYS.all, 'search', companyId, query] as const,
  export: (filters: InvoiceFilters) => 
    [...INVOICE_QUERY_KEYS.all, 'export', filters] as const,
} as const

/**
 * OPTIMIZED: Get invoices list with caching and performance improvements
 */
export function useOptimizedInvoicesList(
  filters: InvoiceFilters = {},
  pagination: PaginationParams = {},
  options?: {
    enabled?: boolean
    refetchInterval?: number
    staleTime?: number
  }
) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.list(filters, pagination),
    queryFn: async () => {
      const cacheKey = CacheKeys.invoices.list(filters, pagination)
      return queryCache.get(
        cacheKey,
        () => OptimizedInvoiceQueryService.getOptimizedList(filters, pagination),
        {
          ttl: CacheTTL.DYNAMIC,
          dependencies: ['invoices', 'contractors', 'projects']
        }
      )
    },
    staleTime: options?.staleTime || CacheTTL.DYNAMIC,
    refetchInterval: options?.refetchInterval || false,
    enabled: options?.enabled ?? true,
  })
}

/**
 * OPTIMIZED: Get invoice by ID with enhanced caching
 */
export function useOptimizedInvoiceById(
  id: string | undefined,
  options?: {
    enabled?: boolean
    staleTime?: number
  }
) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.detail(id!),
    queryFn: async () => {
      const cacheKey = CacheKeys.invoices.byId(id!)
      return queryCache.get(
        cacheKey,
        async () => {
          const result = await InvoiceCrudService.getById(id!)
          if (result.error) {
            throw new Error(result.error)
          }
          return result.data
        },
        {
          ttl: CacheTTL.MODERATE,
          dependencies: ['invoices', id!, 'contractors', 'projects', 'users']
        }
      )
    },
    enabled: Boolean(id) && (options?.enabled ?? true),
    staleTime: options?.staleTime || CacheTTL.MODERATE,
  })
}

/**
 * OPTIMIZED: Get invoice statistics with materialized view caching
 */
export function useOptimizedInvoiceStats(
  companyId: string,
  filters: InvoiceFilters = {},
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.stats(companyId, filters),
    queryFn: async () => {
      const cacheKey = CacheKeys.invoices.stats(companyId, filters)
      return queryCache.get(
        cacheKey,
        () => OptimizedInvoiceQueryService.getOptimizedStats(companyId, filters),
        {
          ttl: CacheTTL.MODERATE,
          dependencies: ['invoices', 'stats', companyId]
        }
      )
    },
    staleTime: CacheTTL.MODERATE,
    refetchInterval: options?.refetchInterval || 5 * 60 * 1000, // Refresh every 5 minutes
    enabled: Boolean(companyId) && (options?.enabled ?? true),
  })
}

/**
 * OPTIMIZED: Get dashboard data with batch loading
 */
export function useOptimizedInvoiceDashboard(
  companyId: string,
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.dashboard(companyId),
    queryFn: async () => {
      const cacheKey = CacheKeys.invoices.dashboard(companyId)
      return queryCache.get(
        cacheKey,
        () => OptimizedInvoiceQueryService.getOptimizedDashboardData(companyId),
        {
          ttl: CacheTTL.DYNAMIC,
          dependencies: ['invoices', 'dashboard', companyId, 'contractors']
        }
      )
    },
    staleTime: CacheTTL.DYNAMIC,
    refetchInterval: options?.refetchInterval || 2 * 60 * 1000, // Refresh every 2 minutes
    enabled: Boolean(companyId) && (options?.enabled ?? true),
  })
}

/**
 * OPTIMIZED: Search invoices with debounced caching
 */
export function useOptimizedInvoiceSearch(
  searchQuery: string,
  companyId: string,
  options?: {
    enabled?: boolean
    debounceMs?: number
  }
) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.search(searchQuery, companyId),
    queryFn: async () => {
      if (!searchQuery.trim()) {return []}
      
      const cacheKey = CacheKeys.invoices.search(searchQuery, companyId)
      return queryCache.get(
        cacheKey,
        () => OptimizedInvoiceQueryService.optimizedSearch(searchQuery, companyId),
        {
          ttl: CacheTTL.MODERATE,
          dependencies: ['invoices', 'search', companyId]
        }
      )
    },
    enabled: Boolean(searchQuery.trim()) && Boolean(companyId) && (options?.enabled ?? true),
    staleTime: CacheTTL.MODERATE,
  })
}

/**
 * OPTIMIZED: Create invoice mutation with cache invalidation
 */
export function useCreateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (invoice: InvoiceInsert) => {
      console.log('[useCreateInvoice] Создание оптимизированного счета:', invoice)
      const result = await InvoiceCrudService.create(invoice)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (data) => {
      console.log('[useCreateInvoice] Счет успешно создан, инвалидация кеша')
      
      // Invalidate relevant caches
      invalidateCache.invoices()
      
      // Invalidate React Query caches
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.lists() })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.all })
      
      // Add new invoice to cache
      const cacheKey = CacheKeys.invoices.byId(data!.id)
      queryCache.set(cacheKey, data, { ttl: CacheTTL.MODERATE })
    },
    onError: (error) => {
      console.error('[useCreateInvoice] Ошибка создания счета:', error)
    }
  })
}

/**
 * OPTIMIZED: Update invoice mutation with selective cache invalidation
 */
export function useUpdateInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: InvoiceUpdate }) => {
      console.log('[useUpdateInvoice] Обновление оптимизированного счета:', { id, updates })
      const result = await InvoiceCrudService.update(id, updates)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (data, variables) => {
      console.log('[useUpdateInvoice] Счет успешно обновлен, обновление кеша')
      
      const { id } = variables
      
      // Invalidate specific invoice cache
      invalidateCache.invoiceRelated(id)
      
      // Update React Query cache
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.detail(id) })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.lists() })
      
      // Update cached invoice data
      const cacheKey = CacheKeys.invoices.byId(id)
      queryCache.set(cacheKey, data, { ttl: CacheTTL.MODERATE })
    },
    onError: (error) => {
      console.error('[useUpdateInvoice] Ошибка обновления счета:', error)
    }
  })
}

/**
 * OPTIMIZED: Delete invoice mutation with cache cleanup
 */
export function useDeleteInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[useDeleteInvoice] Удаление оптимизированного счета:', id)
      const result = await InvoiceCrudService.delete(id)
      if (result.error) {
        throw new Error(result.error)
      }
      return id
    },
    onSuccess: (id) => {
      console.log('[useDeleteInvoice] Счет успешно удален, очистка кеша')
      
      // Remove from cache
      invalidateCache.invoiceRelated(id)
      
      // Remove from React Query cache
      queryClient.removeQueries({ queryKey: INVOICE_QUERY_KEYS.detail(id) })
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.lists() })
      
      // Remove specific cache entries
      queryCache.invalidate(`invoices:byId:${id}`)
    },
    onError: (error) => {
      console.error('[useDeleteInvoice] Ошибка удаления счета:', error)
    }
  })
}

/**
 * OPTIMIZED: Clone invoice mutation
 */
export function useCloneInvoice() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[useCloneInvoice] Клонирование оптимизированного счета:', id)
      const result = await InvoiceCrudService.clone(id)
      if (result.error) {
        throw new Error(result.error)
      }
      return result.data
    },
    onSuccess: (data) => {
      console.log('[useCloneInvoice] Счет успешно клонирован, обновление кеша')
      
      // Invalidate lists to include new invoice
      invalidateCache.invoices()
      queryClient.invalidateQueries({ queryKey: INVOICE_QUERY_KEYS.lists() })
      
      // Cache the new invoice
      if (data) {
        const cacheKey = CacheKeys.invoices.byId(data.id)
        queryCache.set(cacheKey, data, { ttl: CacheTTL.MODERATE })
      }
    },
    onError: (error) => {
      console.error('[useCloneInvoice] Ошибка клонирования счета:', error)
    }
  })
}

/**
 * OPTIMIZED: Get export data with streaming
 */
export function useInvoiceExportData(
  filters: InvoiceFilters = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.export(filters),
    queryFn: async () => {
      console.log('[useInvoiceExportData] Загрузка данных для оптимизированного экспорта')
      return OptimizedInvoiceQueryService.getOptimizedExportData(filters)
    },
    enabled: options?.enabled ?? false, // Only run when explicitly enabled
    staleTime: CacheTTL.STATIC, // Export data can be cached longer
  })
}