/**
 * Optimized query operations for payments - performance improvements
 * Fixes N+1 queries, adds proper limits, and optimizes JOINs
 */

import { 
  handleSupabaseError, 
  type PaginatedResponse, 
  type PaginationParams, 
  type Payment,
  supabase
} from '../supabase'
import type { PaymentFilters, PaymentStats, PaymentWithRelations } from './queries'

export class OptimizedPaymentQueryService {
  
  /**
   * OPTIMIZED: Get payment list with single query and specific columns
   * Eliminates N+1 problems and adds proper result limits
   */
  static async getOptimizedList(
    filters: PaymentFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<PaymentWithRelations>> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination
      
      // Enforce maximum limit to prevent runaway queries
      const safeLimit = Math.min(limit, 100)
      const from = (page - 1) * safeLimit
      const to = from + safeLimit - 1

      console.log('[OptimizedPaymentQueryService.getOptimizedList] Загрузка оптимизированного списка платежей')

      // Use specific columns instead of SELECT * and load relations in single query
      let query = supabase
        .from('payments')
        .select(`
          id,
          reference,
          total_amount,
          payment_date,
          status,
          payment_method,
          comment,
          created_at,
          updated_at,
          created_by,
          invoice_id,
          payer_id,
          invoice:invoices!invoice_id(
            id,
            invoice_number,
            description,
            total_amount,
            currency,
            status,
            supplier:contractors!supplier_id(id, name, inn),
            payer:contractors!payer_id(id, name, inn),
            project:projects!project_id(id, name, code)
          ),
          payer:contractors!payer_id(id, name, inn, email, phone)
        `, { count: 'exact' })

      // Apply filters with indexed columns first for better performance
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.method) {
        query = query.eq('payment_method', filters.method)
      }

      if (filters.invoiceId) {
        query = query.eq('invoice_id', filters.invoiceId)
      }

      if (filters.userId) {
        query = query.eq('created_by', filters.userId)
      }

      // processedBy filter removed since approved_by field no longer exists

      // Amount range filters
      if (filters.amountFrom && filters.amountTo) {
        query = query.gte('total_amount', filters.amountFrom)
                    .lte('total_amount', filters.amountTo)
      } else if (filters.amountFrom) {
        query = query.gte('total_amount', filters.amountFrom)
      } else if (filters.amountTo) {
        query = query.lte('total_amount', filters.amountTo)
      }

      // Date filters using indexed columns
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }
      if (filters.paymentDateFrom) {
        query = query.gte('payment_date', filters.paymentDateFrom)
      }
      if (filters.paymentDateTo) {
        query = query.lte('payment_date', filters.paymentDateTo)
      }

      // Optimized search using full-text search index
      if (filters.search) {
        // Use the text search index created in database-optimization.sql
        query = query.textSearch('payment_search', filters.search, {
          type: 'websearch',
          config: 'russian'
        })
      }

      // Sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('[OptimizedPaymentQueryService.getOptimizedList] Ошибка запроса:', error)
        throw error
      }

      console.log('[OptimizedPaymentQueryService.getOptimizedList] Получено платежей:', data?.length || 0)

      // Transform data for compatibility - all user data will be loaded in batch below
      const paymentIds = data?.map(p => p.id) || []
      
      // Batch load workflow data if payment IDs exist
      let workflowsMap: Record<string, any> = {}
      if (paymentIds.length > 0) {
        const { data: workflows } = await supabase
          .from('payment_workflows')
          .select(`
            payment_id,
            status,
            current_stage_position,
            stages_total,
            stages_completed
          `)
          .in('payment_id', paymentIds)
        
        if (workflows) {
          workflowsMap = workflows.reduce((acc, workflow) => {
            acc[workflow.payment_id] = workflow
            return acc
          }, {} as Record<string, any>)
        }
      }

      // Collect unique user IDs for batch loading
      const userIds = new Set<string>()
      data?.forEach(payment => {
        if (payment.created_by) {userIds.add(payment.created_by)}
      })

      // Batch load user data
      let usersMap: Record<string, any> = {}
      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', Array.from(userIds))
        
        if (users) {
          usersMap = users.reduce((acc, user) => {
            acc[user.id] = user
            return acc
          }, {} as Record<string, any>)
        }
      }

      // Transform and enrich data
      const transformedData = (data || []).map(payment => ({
        ...payment,
        creator: payment.created_by ? usersMap[payment.created_by] : null,
        workflow: workflowsMap[payment.id] || null,
        // Transform invoice data for compatibility
        invoice: payment.invoice ? {
          ...payment.invoice,
          title: payment.invoice.description || 'Без описания',
          contractor: payment.invoice.supplier || payment.invoice.payer
        } : null
      }))

      const totalPages = Math.ceil((count || 0) / safeLimit)

      console.log('[OptimizedPaymentQueryService.getOptimizedList] Преобразовано данных:', transformedData.length)

      return {
        data: transformedData as PaymentWithRelations[],
        error: null,
        count: count || 0,
        page,
        limit: safeLimit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    } catch (error) {
      console.error('Ошибка получения оптимизированного списка платежей:', error)
      return {
        data: [],
        error: handleSupabaseError(error),
        count: 0,
        page: pagination.page || 1,
        limit: Math.min(pagination.limit || 20, 100),
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      }
    }
  }

  /**
   * OPTIMIZED: Get statistics using materialized view
   * Replaces expensive aggregations with pre-calculated values
   */
  static async getOptimizedStats(
    companyId: string,
    filters: PaymentFilters = {}
  ): Promise<PaymentStats> {
    try {
      // Use the materialized view for basic stats
      const { data: baseStats, error: statsError } = await supabase
        .from('payment_stats_mv')
        .select('*')
        .eq('company_id', companyId)
        .single()

      if (statsError) {throw statsError}

      // If no filters, return pre-calculated stats
      if (Object.keys(filters).length === 0) {
        return {
          total: baseStats.total_count,
          totalAmount: baseStats.total_amount,
          byStatus: {
            pending: baseStats.pending_count,
            processing: baseStats.processing_count,
            completed: baseStats.completed_count,
            failed: baseStats.failed_count,
            cancelled: baseStats.cancelled_count,
          },
          byStatusAmount: {
            pending: baseStats.pending_amount,
            processing: baseStats.processing_amount,
            completed: baseStats.completed_amount,
            failed: baseStats.failed_amount,
            cancelled: baseStats.cancelled_amount,
          },
          byMethod: {
            bank_transfer: baseStats.bank_transfer_count,
            cash: baseStats.cash_count,
            card: baseStats.card_count,
            check: baseStats.check_count,
            other: baseStats.other_count,
          },
          byMethodAmount: {
            bank_transfer: baseStats.bank_transfer_amount,
            cash: baseStats.cash_amount,
            card: baseStats.card_amount,
            check: baseStats.check_amount,
            other: baseStats.other_amount,
          },
          avgAmount: baseStats.avg_amount,
          avgProcessingTime: baseStats.avg_processing_time,
        }
      }

      // For filtered stats, use optimized aggregation query
      let query = supabase
        .from('payments')
        .select(`
          total_amount,
          status,
          payment_method,
          created_at
        `)
        .eq('company_id', companyId)

      // Apply same filters as main query
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }
      if (filters.invoiceId) {
        query = query.eq('invoice_id', filters.invoiceId)
      }

      const { data: filteredData, error } = await query

      if (error) {throw error}

      // Calculate filtered statistics
      const payments = filteredData || []
      const total = payments.length
      const totalAmount = payments.reduce((sum, p) => sum + p.total_amount, 0)
      const avgAmount = total > 0 ? totalAmount / total : 0

      const byStatus: Record<Payment['status'], number> = {
        pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0,
      }
      const byStatusAmount: Record<Payment['status'], number> = {
        pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0,
      }
      const byMethod: Record<Payment['payment_method'], number> = {
        bank_transfer: 0, cash: 0, card: 0, check: 0, other: 0,
      }
      const byMethodAmount: Record<Payment['payment_method'], number> = {
        bank_transfer: 0, cash: 0, card: 0, check: 0, other: 0,
      }

      const totalProcessingTime = 0
      const processedCount = 0

      payments.forEach(payment => {
        if (byStatus[payment.status] !== undefined) {
          byStatus[payment.status]++
          byStatusAmount[payment.status] += payment.total_amount
        }
        
        if (byMethod[payment.payment_method] !== undefined) {
          byMethod[payment.payment_method]++
          byMethodAmount[payment.payment_method] += payment.total_amount
        }

        // Processing time calculation removed since approved_at is no longer available
      })

      const avgProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0

      return {
        total,
        totalAmount,
        byStatus,
        byStatusAmount,
        byMethod,
        byMethodAmount,
        avgAmount,
        avgProcessingTime,
      }
    } catch (error) {
      console.error('Ошибка получения оптимизированной статистики платежей:', error)
      return {
        total: 0,
        totalAmount: 0,
        byStatus: { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 },
        byStatusAmount: { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0 },
        byMethod: { bank_transfer: 0, cash: 0, card: 0, check: 0, other: 0 },
        byMethodAmount: { bank_transfer: 0, cash: 0, card: 0, check: 0, other: 0 },
        avgAmount: 0,
        avgProcessingTime: 0,
      }
    }
  }

  /**
   * OPTIMIZED: Dashboard data with single batch query
   * Combines multiple requests into efficient batch operations
   */
  static async getOptimizedDashboardData(companyId: string) {
    try {
      // Execute all queries in parallel with proper limits
      const [
        statsResult,
        recentPaymentsResult,
        pendingPaymentsResult
      ] = await Promise.all([
        // Stats from materialized view
        this.getOptimizedStats(companyId),
        
        // Recent payments with specific columns
        supabase
          .from('payments')
          .select(`
            id,
            reference,
            total_amount,
            status,
            payment_date,
            created_at,
            invoice:invoices!invoice_id(
              invoice_number,
              description,
              supplier:contractors!supplier_id(name)
            )
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Pending payments using indexed query
        supabase
          .from('payments')
          .select(`
            id,
            reference,
            total_amount,
            payment_date,
            created_at,
            invoice:invoices!invoice_id(
              invoice_number,
              description,
              supplier:contractors!supplier_id(name)
            )
          `)
          .eq('company_id', companyId)
          .in('status', ['pending', 'processing'])
          .order('created_at', { ascending: true })
          .limit(10)
      ])

      return {
        stats: statsResult,
        recentPayments: recentPaymentsResult.data || [],
        pendingPayments: pendingPaymentsResult.data || []
      }
    } catch (error) {
      console.error('Ошибка получения оптимизированных данных дашборда платежей:', error)
      return {
        stats: await this.getOptimizedStats(companyId),
        recentPayments: [],
        pendingPayments: []
      }
    }
  }

  /**
   * OPTIMIZED: Search with proper limits and indexing
   * Uses full-text search and result limits
   */
  static async optimizedSearch(
    searchQuery: string,
    companyId: string,
    limit = 10
  ): Promise<PaymentWithRelations[]> {
    try {
      // Enforce reasonable limit
      const safeLimit = Math.min(limit, 50)
      
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          reference,
          total_amount,
          status,
          payment_date,
          created_at,
          invoice:invoices!invoice_id(
            invoice_number,
            description,
            supplier:contractors!supplier_id(name)
          )
        `)
        .eq('company_id', companyId)
        .textSearch('payment_search', searchQuery, {
          type: 'websearch',
          config: 'russian'
        })
        .order('created_at', { ascending: false })
        .limit(safeLimit)

      if (error) {
        // Fallback to ILIKE if text search fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('payments')
          .select(`
            id, reference, amount, status, payment_date, created_at,
            invoice:invoices!invoice_id(invoice_number, description, supplier:contractors!supplier_id(name))
          `)
          .eq('company_id', companyId)
          .or(
            `reference.ilike.%${searchQuery}%,` +
            `comment.ilike.%${searchQuery}%`
          )
          .order('created_at', { ascending: false })
          .limit(safeLimit)
        
        if (fallbackError) {throw fallbackError}
        return (fallbackData as PaymentWithRelations[]) || []
      }

      return (data as PaymentWithRelations[]) || []
    } catch (error) {
      console.error('Ошибка оптимизированного поиска платежей:', error)
      return []
    }
  }

  /**
   * OPTIMIZED: Get payments by invoice ID with specific columns
   * Loads only necessary data efficiently
   */
  static async getByInvoiceIdOptimized(invoiceId: string): Promise<PaymentWithRelations[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          reference,
          total_amount,
          status,
          payment_method,
          payment_date,
          comment,
          created_at,
          created_by,
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return (data as PaymentWithRelations[]) || []
    } catch (error) {
      console.error('Ошибка получения оптимизированных платежей по счету:', error)
      return []
    }
  }

  /**
   * OPTIMIZED: Export with streaming and column selection
   * Prevents memory issues with large datasets
   */
  static async getOptimizedExportData(
    filters: PaymentFilters = {},
    maxRecords = 10000 // Reasonable limit for exports
  ): Promise<any[]> {
    try {
      // Use specific columns for export
      let query = supabase
        .from('payments')
        .select(`
          reference,
          total_amount,
          status,
          payment_method,
          payment_date,
          comment,
          created_at,
          invoice:invoices!invoice_id(
            invoice_number,
            description,
            supplier:contractors!supplier_id(name, inn),
            payer:contractors!payer_id(name, inn)
          )
        `)
        .limit(maxRecords)

      // Apply filters
      if (filters.status) {query = query.eq('status', filters.status)}
      if (filters.invoiceId) {query = query.eq('invoice_id', filters.invoiceId)}
      if (filters.dateFrom) {query = query.gte('created_at', filters.dateFrom)}
      if (filters.dateTo) {query = query.lte('created_at', filters.dateTo)}

      const { data, error } = await query

      if (error) {throw error}

      // Format for export
      return (data || []).map(payment => ({
        'Номер платежа': payment.reference,
        'Сумма': `${payment.total_amount} RUB`,
        'Статус': this.getStatusLabel(payment.status),
        'Метод платежа': this.getMethodLabel(payment.payment_method),
        'Счет': payment.invoice?.invoice_number || '',
        'Описание счета': payment.invoice?.description || '',
        'Поставщик': payment.invoice?.supplier?.name || '',
        'ИНН поставщика': payment.invoice?.supplier?.inn || '',
        'Плательщик': payment.invoice?.payer?.name || '',
        'Дата платежа': payment.payment_date ? 
          new Date(payment.payment_date).toLocaleDateString('ru-RU') : '',
        'Дата создания': new Date(payment.created_at).toLocaleDateString('ru-RU'),
        'Дата одобрения': '',
        'Комментарий': payment.comment || '',
      }))
    } catch (error) {
      console.error('Ошибка получения данных для оптимизированного экспорта платежей:', error)
      return []
    }
  }

  /**
   * Helper methods for status and method localization
   */
  private static getStatusLabel(status: Payment['status']): string {
    const statusLabels: Record<Payment['status'], string> = {
      pending: 'В ожидании',
      processing: 'Обработка',
      completed: 'Завершен',
      failed: 'Отклонен',
      cancelled: 'Отменен',
    }
    
    return statusLabels[status] || status
  }

  private static getMethodLabel(method: Payment['payment_method']): string {
    const methodLabels: Record<Payment['payment_method'], string> = {
      bank_transfer: 'Банковский перевод',
      cash: 'Наличные',
      card: 'Банковская карта',
      check: 'Чек',
      other: 'Другое',
    }
    
    return methodLabels[method] || method
  }
}

// SQL for creating the full-text search column
export const createPaymentSearchColumn = `
-- Add full-text search column to payments table
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_search tsvector 
GENERATED ALWAYS AS (
  to_tsvector('russian', 
    COALESCE(reference, '') || ' ' || 
    COALESCE(comment, '')
  )
) STORED;

-- Create index on the search column
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_search_vector 
ON payments USING gin (payment_search);
`;