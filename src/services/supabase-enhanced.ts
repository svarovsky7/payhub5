/**
 * Enhanced Supabase client with performance monitoring and query optimization
 * This demonstrates how to integrate performance monitoring into existing services
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'
import { performanceMonitor, withPerformanceMonitoring } from '../utils/performance-monitor'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Отсутствуют переменные окружения для Supabase. Проверьте файл .env')
}

// Create base client
const baseSupabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

/**
 * Enhanced Supabase client with performance monitoring
 */
class EnhancedSupabaseClient {
  private client = baseSupabase

  /**
   * Execute a SELECT query with performance monitoring
   */
  async select<T = any>(
    tableName: string,
    columns: string = '*',
    queryBuilder?: (query: any) => any,
    context?: {
      queryType?: string
      parameters?: Record<string, any>
      userId?: string
      companyId?: string
    }
  ): Promise<{ data: T[] | null; error: any; count?: number }> {
    const queryType = context?.queryType || `SELECT_${tableName.toUpperCase()}`
    
    return await withPerformanceMonitoring(
      queryType,
      async () => {
        let query = this.client.from(tableName).select(columns, { count: 'exact' })
        
        if (queryBuilder) {
          query = queryBuilder(query)
        }
        
        const result = await query
        
        // Log large result sets in development
        if (import.meta.env.DEV && result.data && Array.isArray(result.data) && result.data.length > 1000) {
          console.warn(`⚠️ Large result set: ${queryType} returned ${result.data.length} records`)
        }
        
        return result
      },
      {
        parameters: context?.parameters,
        userId: context?.userId,
        companyId: context?.companyId,
      }
    )
  }

  /**
   * Execute a paginated SELECT query with monitoring
   */
  async selectPaginated<T = any>(
    tableName: string,
    columns: string = '*',
    page: number = 1,
    limit: number = 20,
    queryBuilder?: (query: any) => any,
    context?: {
      queryType?: string
      parameters?: Record<string, any>
      userId?: string
      companyId?: string
    }
  ): Promise<{
    data: T[] | null
    error: any
    count?: number
    page: number
    limit: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }> {
    // Enforce reasonable limits
    const safeLimit = Math.min(Math.max(limit, 1), 100)
    const safePage = Math.max(page, 1)
    
    const from = (safePage - 1) * safeLimit
    const to = from + safeLimit - 1

    const queryType = context?.queryType || `SELECT_PAGINATED_${tableName.toUpperCase()}`
    
    const result = await withPerformanceMonitoring(
      queryType,
      async () => {
        let query = this.client.from(tableName).select(columns, { count: 'exact' })
        
        if (queryBuilder) {
          query = queryBuilder(query)
        }
        
        return await query.range(from, to)
      },
      {
        parameters: { 
          ...context?.parameters,
          page: safePage,
          limit: safeLimit,
          from,
          to,
        },
        userId: context?.userId,
        companyId: context?.companyId,
      }
    )

    const totalPages = Math.ceil((result.count || 0) / safeLimit)

    return {
      ...result,
      page: safePage,
      limit: safeLimit,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    }
  }

  /**
   * Execute INSERT with monitoring
   */
  async insert<T = any>(
    tableName: string,
    data: any | any[],
    context?: {
      queryType?: string
      userId?: string
      companyId?: string
    }
  ): Promise<{ data: T | null; error: any }> {
    const queryType = context?.queryType || `INSERT_${tableName.toUpperCase()}`
    
    return await withPerformanceMonitoring(
      queryType,
      async () => {
        return await this.client
          .from(tableName)
          .insert(data)
          .select()
          .single()
      },
      {
        parameters: { recordCount: Array.isArray(data) ? data.length : 1 },
        userId: context?.userId,
        companyId: context?.companyId,
      }
    )
  }

  /**
   * Execute UPDATE with monitoring
   */
  async update<T = any>(
    tableName: string,
    updates: any,
    matchConditions: Record<string, any>,
    context?: {
      queryType?: string
      userId?: string
      companyId?: string
    }
  ): Promise<{ data: T[] | null; error: any }> {
    const queryType = context?.queryType || `UPDATE_${tableName.toUpperCase()}`
    
    return await withPerformanceMonitoring(
      queryType,
      async () => {
        let query = this.client.from(tableName).update(updates)
        
        // Apply match conditions
        Object.entries(matchConditions).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
        
        return await query.select()
      },
      {
        parameters: { updates, conditions: matchConditions },
        userId: context?.userId,
        companyId: context?.companyId,
      }
    )
  }

  /**
   * Execute DELETE with monitoring
   */
  async delete(
    tableName: string,
    matchConditions: Record<string, any>,
    context?: {
      queryType?: string
      userId?: string
      companyId?: string
    }
  ): Promise<{ data: any; error: any }> {
    const queryType = context?.queryType || `DELETE_${tableName.toUpperCase()}`
    
    return await withPerformanceMonitoring(
      queryType,
      async () => {
        let query = this.client.from(tableName).delete()
        
        // Apply match conditions
        Object.entries(matchConditions).forEach(([key, value]) => {
          query = query.eq(key, value)
        })
        
        return await query
      },
      {
        parameters: { conditions: matchConditions },
        userId: context?.userId,
        companyId: context?.companyId,
      }
    )
  }

  /**
   * Execute RPC (stored procedure) with monitoring
   */
  async rpc<T = any>(
    functionName: string,
    parameters?: Record<string, any>,
    context?: {
      queryType?: string
      userId?: string
      companyId?: string
    }
  ): Promise<{ data: T | null; error: any }> {
    const queryType = context?.queryType || `RPC_${functionName.toUpperCase()}`
    
    return await withPerformanceMonitoring(
      queryType,
      async () => {
        return await this.client.rpc(functionName, parameters)
      },
      {
        parameters,
        userId: context?.userId,
        companyId: context?.companyId,
      }
    )
  }

  /**
   * Execute aggregation query with monitoring
   */
  async aggregate(
    tableName: string,
    aggregations: {
      count?: boolean
      sum?: string[]
      avg?: string[]
      min?: string[]
      max?: string[]
    },
    queryBuilder?: (query: any) => any,
    context?: {
      queryType?: string
      parameters?: Record<string, any>
      userId?: string
      companyId?: string
    }
  ): Promise<{ data: any; error: any }> {
    const queryType = context?.queryType || `AGGREGATE_${tableName.toUpperCase()}`
    
    return await withPerformanceMonitoring(
      queryType,
      async () => {
        // Build aggregation query
        const selectParts: string[] = []
        
        if (aggregations.count) {
          selectParts.push('count(*)')
        }
        
        aggregations.sum?.forEach(col => {
          selectParts.push(`sum(${col}) as sum_${col}`)
        })
        
        aggregations.avg?.forEach(col => {
          selectParts.push(`avg(${col}) as avg_${col}`)
        })
        
        aggregations.min?.forEach(col => {
          selectParts.push(`min(${col}) as min_${col}`)
        })
        
        aggregations.max?.forEach(col => {
          selectParts.push(`max(${col}) as max_${col}`)
        })
        
        const selectClause = selectParts.join(', ')
        
        let query = this.client.from(tableName).select(selectClause)
        
        if (queryBuilder) {
          query = queryBuilder(query)
        }
        
        return await query.single()
      },
      {
        parameters: { 
          ...context?.parameters,
          aggregations,
        },
        userId: context?.userId,
        companyId: context?.companyId,
      }
    )
  }

  /**
   * Get the base client for direct access
   */
  get raw() {
    return this.client
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return performanceMonitor.getStats()
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    return performanceMonitor.generateReport()
  }
}

// Create enhanced client instance
export const enhancedSupabase = new EnhancedSupabaseClient()

// Export original client for backward compatibility
export const supabase = baseSupabase

// Export all types from original supabase service
export * from './supabase'

/**
 * Query execution limits and best practices
 */
export const QueryLimits = {
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE_SIZE: 20,
  MAX_EXPORT_RECORDS: 10000,
  SLOW_QUERY_THRESHOLD_MS: 1000,
  LARGE_RESULT_SET_THRESHOLD: 1000,
} as const

/**
 * Utility function to validate query parameters
 */
export function validateQueryParams(params: {
  page?: number
  limit?: number
  maxRecords?: number
}): {
  page: number
  limit: number
  isValid: boolean
  warnings: string[]
} {
  const warnings: string[] = []
  
  const page = Math.max(params.page || 1, 1)
  const limit = Math.min(
    Math.max(params.limit || QueryLimits.DEFAULT_PAGE_SIZE, 1),
    params.maxRecords || QueryLimits.MAX_PAGE_SIZE
  )

  if (params.page && params.page < 1) {
    warnings.push('Page number must be >= 1, adjusted to 1')
  }

  if (params.limit && params.limit > QueryLimits.MAX_PAGE_SIZE) {
    warnings.push(`Limit reduced from ${params.limit} to ${QueryLimits.MAX_PAGE_SIZE} for performance`)
  }

  if (params.limit && params.limit > 50) {
    warnings.push('Large page sizes may impact performance')
  }

  return {
    page,
    limit,
    isValid: warnings.length === 0,
    warnings,
  }
}

/**
 * Utility to create optimized query builders
 */
export const QueryBuilders = {
  /**
   * Add standard filters to a query
   */
  withStandardFilters: (filters: {
    companyId?: string
    userId?: string
    status?: string
    dateFrom?: string
    dateTo?: string
  }) => (query: any) => {
    if (filters.companyId) {query = query.eq('company_id', filters.companyId)}
    if (filters.userId) {query = query.eq('user_id', filters.userId)}
    if (filters.status) {query = query.eq('status', filters.status)}
    if (filters.dateFrom) {query = query.gte('created_at', filters.dateFrom)}
    if (filters.dateTo) {query = query.lte('created_at', filters.dateTo)}
    return query
  },

  /**
   * Add search functionality
   */
  withSearch: (searchQuery: string, columns: string[]) => (query: any) => {
    if (!searchQuery) {return query}
    
    const searchConditions = columns.map(col => `${col}.ilike.%${searchQuery}%`).join(',')
    return query.or(searchConditions)
  },

  /**
   * Add sorting
   */
  withSorting: (sortBy: string = 'created_at', sortOrder: 'asc' | 'desc' = 'desc') => (query: any) => {
    return query.order(sortBy, { ascending: sortOrder === 'asc' })
  },

  /**
   * Add range filtering
   */
  withRange: (column: string, from?: number, to?: number) => (query: any) => {
    if (from !== undefined) {query = query.gte(column, from)}
    if (to !== undefined) {query = query.lte(column, to)}
    return query
  },
}

// Performance monitoring is enabled in development
if (import.meta.env.DEV) {
  console.log('🚀 Enhanced Supabase client with performance monitoring initialized')
}

// Export performance monitor for direct access
export { performanceMonitor }