/**
 * Optimized query operations for invoices - performance improvements
 * Demonstrates how to fix SELECT *, add proper limits, and optimize JOINs
 */

import { 
  handleSupabaseError, 
  type PaginatedResponse, 
  type PaginationParams, 
  supabase,
} from '../supabase'
import type { InvoiceFilters, InvoiceStats, InvoiceWithRelations } from './queries'

export class OptimizedInvoiceQueryService {
  
  /**
   * OPTIMIZED: Get invoice list with specific column selection
   * Eliminates SELECT * and adds proper result limits
   */
  static async getOptimizedList(
    filters: InvoiceFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<InvoiceWithRelations>> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination
      
      // Enforce maximum limit to prevent runaway queries
      const safeLimit = Math.min(limit, 100)
      const from = (page - 1) * safeLimit
      const to = from + safeLimit - 1

      // Use specific columns instead of SELECT *
      let query = supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          description,
          total_amount,
          amount_net,
          vat_amount,
          vat_rate,
          currency,
          status,
          invoice_date,
          payment_due_date,
          created_at,
          updated_at,
          created_by,
          supplier_id,
          payer_id,
          project_id,
          priority,
          supplier:contractors!supplier_id(id, name, inn),
          payer:contractors!payer_id(id, name, inn),
          project:projects!project_id(id, name, code)
        `, { count: 'exact' })

      // Apply filters with indexed columns first for better performance
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.supplierId) {
        query = query.eq('supplier_id', filters.supplierId)
      }

      if (filters.payerId) {
        query = query.eq('payer_id', filters.payerId)
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      if (filters.userId) {
        query = query.eq('created_by', filters.userId)
      }

      // Amount range filters with proper indexing
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

      // Due date filters
      if (filters.dueDateFrom) {
        query = query.gte('payment_due_date', filters.dueDateFrom)
      }
      if (filters.dueDateTo) {
        query = query.lte('payment_due_date', filters.dueDateTo)
      }

      // Overdue filter using indexed approach
      if (filters.overdue) {
        const currentDate = new Date().toISOString().split('T')[0]
        query = query
          .lt('payment_due_date', currentDate)
          .not('status', 'in', '("paid","cancelled")')
      }

      // Optimized search using full-text search
      if (filters.search) {
        // Use the text search index created in database-optimization.sql
        query = query.textSearch('invoice_search', filters.search, {
          type: 'websearch',
          config: 'russian'
        })
      }

      // Sorting and pagination
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to)

      const { data, error, count } = await query

      if (error) {throw error}

      const totalPages = Math.ceil((count || 0) / safeLimit)

      return {
        data: (data as InvoiceWithRelations[]) || [],
        error: null,
        count: count || 0,
        page,
        limit: safeLimit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    } catch (error) {
      console.error('Ошибка получения оптимизированного списка заявок:', error)
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
    filters: InvoiceFilters = {}
  ): Promise<InvoiceStats> {
    try {
      // Use the materialized view for basic stats
      const { data: baseStats, error: statsError } = await supabase
        .from('invoice_stats_mv')
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
            draft: baseStats.draft_count,
            pending: baseStats.pending_count,
            approved: baseStats.approved_count,
            paid: baseStats.paid_count,
            rejected: baseStats.rejected_count,
            cancelled: baseStats.cancelled_count,
          },
          byStatusAmount: {
            draft: baseStats.draft_amount,
            pending: baseStats.pending_amount,
            approved: baseStats.approved_amount,
            paid: baseStats.paid_amount,
            rejected: baseStats.rejected_amount,
            cancelled: baseStats.cancelled_amount,
          },
          avgAmount: baseStats.avg_amount,
          overdueCount: baseStats.overdue_count,
          overdueAmount: baseStats.overdue_amount,
        }
      }

      // For filtered stats, use optimized aggregation query
      let query = supabase
        .from('invoices')
        .select(`
          total_amount,
          status,
          payment_due_date
        `)
        .eq('company_id', companyId)

      // Apply same filters as main query
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters.supplierId) {
        query = query.eq('supplier_id', filters.supplierId)
      }

      const { data: filteredData, error } = await query

      if (error) {throw error}

      // Calculate filtered statistics
      const invoices = filteredData || []
      const total = invoices.length
      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
      const avgAmount = total > 0 ? totalAmount / total : 0

      const byStatus: Record<string, number> = {
        draft: 0, pending: 0, approved: 0, paid: 0, rejected: 0, cancelled: 0,
      }
      const byStatusAmount: Record<string, number> = {
        draft: 0, pending: 0, approved: 0, paid: 0, rejected: 0, cancelled: 0,
      }

      let overdueCount = 0
      let overdueAmount = 0
      const currentDate = new Date().toISOString()

      invoices.forEach(invoice => {
        if (invoice.status && byStatus[invoice.status] !== undefined) {
          byStatus[invoice.status]++
          byStatusAmount[invoice.status] += invoice.total_amount || 0
        }

        if (
          invoice.payment_due_date && 
          invoice.payment_due_date < currentDate && 
          !['paid', 'cancelled'].includes(invoice.status)
        ) {
          overdueCount++
          overdueAmount += invoice.total_amount || 0
        }
      })

      return {
        total,
        totalAmount,
        byStatus,
        byStatusAmount,
        avgAmount,
        overdueCount,
        overdueAmount,
      }
    } catch (error) {
      console.error('Ошибка получения оптимизированной статистики заявок:', error)
      return {
        total: 0,
        totalAmount: 0,
        byStatus: { draft: 0, pending: 0, approved: 0, paid: 0, rejected: 0, cancelled: 0 },
        byStatusAmount: { draft: 0, pending: 0, approved: 0, paid: 0, rejected: 0, cancelled: 0 },
        avgAmount: 0,
        overdueCount: 0,
        overdueAmount: 0,
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
        recentInvoicesResult,
        overdueInvoicesResult,
        topContractorsResult
      ] = await Promise.all([
        // Stats from materialized view
        this.getOptimizedStats(companyId),
        
        // Recent invoices with specific columns
        supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            description,
            total_amount,
            currency,
            status,
            created_at,
            supplier:contractors!supplier_id(name)
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5),
        
        // Overdue invoices using indexed query
        supabase
          .from('invoices')
          .select(`
            id,
            invoice_number,
            description,
            total_amount,
            currency,
            payment_due_date,
            status,
            supplier:contractors!supplier_id(name)
          `)
          .eq('company_id', companyId)
          .lt('payment_due_date', new Date().toISOString())
          .not('status', 'in', '("paid","cancelled")')
          .order('payment_due_date', { ascending: true })
          .limit(10),
        
        // Top contractors - direct query instead of materialized view
        supabase
          .from('contractors')
          .select(`
            id,
            name,
            invoices:invoices!supplier_id(
              id,
              total_amount
            )
          `)
          .eq('is_active', true)
          .limit(5)
      ])

      return {
        stats: statsResult,
        recentInvoices: recentInvoicesResult.data || [],
        overdueInvoices: overdueInvoicesResult.data || [],
        topContractors: topContractorsResult.data?.map(c => ({
          contractor: { id: c.id, name: c.name },
          count: c.invoices?.length || 0,
          totalAmount: c.invoices?.reduce((sum: number, inv: any) => sum + (inv.total_amount || 0), 0) || 0,
        })) || []
      }
    } catch (error) {
      console.error('Ошибка получения оптимизированных данных дашборда заявок:', error)
      return {
        stats: await this.getOptimizedStats(companyId),
        recentInvoices: [],
        overdueInvoices: [],
        topContractors: []
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
  ): Promise<InvoiceWithRelations[]> {
    try {
      // Enforce reasonable limit
      const safeLimit = Math.min(limit, 50)
      
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          description,
          total_amount,
          currency,
          status,
          created_at,
          supplier:contractors!supplier_id(name)
        `)
        .eq('company_id', companyId)
        .textSearch('invoice_search', searchQuery, {
          type: 'websearch',
          config: 'russian'
        })
        .order('created_at', { ascending: false })
        .limit(safeLimit)

      if (error) {
        // Fallback to ILIKE if text search fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('invoices')
          .select(`
            id, invoice_number, description, total_amount, currency, status, created_at,
            supplier:contractors!supplier_id(name)
          `)
          .eq('company_id', companyId)
          .or(
            `invoice_number.ilike.%${searchQuery}%,` +
            `description.ilike.%${searchQuery}%`
          )
          .order('created_at', { ascending: false })
          .limit(safeLimit)
        
        if (fallbackError) {throw fallbackError}
        return (fallbackData as InvoiceWithRelations[]) || []
      }

      return (data as InvoiceWithRelations[]) || []
    } catch (error) {
      console.error('Ошибка оптимизированного поиска заявок:', error)
      return []
    }
  }

  /**
   * OPTIMIZED: Export with streaming and column selection
   * Prevents memory issues with large datasets
   */
  static async getOptimizedExportData(
    filters: InvoiceFilters = {},
    maxRecords = 10000 // Reasonable limit for exports
  ): Promise<any[]> {
    try {
      // Use specific columns for export
      let query = supabase
        .from('invoices')
        .select(`
          invoice_number,
          description,
          total_amount,
          currency,
          status,
          invoice_date,
          payment_due_date,
          created_at,
          supplier:contractors!supplier_id(name, inn),
          payer:contractors!payer_id(name, inn),
          project:projects!project_id(name, code)
        `)
        .limit(maxRecords)

      // Apply filters
      if (filters.status) {query = query.eq('status', filters.status)}
      if (filters.supplierId) {query = query.eq('supplier_id', filters.supplierId)}
      if (filters.projectId) {query = query.eq('project_id', filters.projectId)}
      if (filters.dateFrom) {query = query.gte('created_at', filters.dateFrom)}
      if (filters.dateTo) {query = query.lte('created_at', filters.dateTo)}

      const { data, error } = await query

      if (error) {throw error}

      // Format for export
      return (data || []).map(invoice => ({
        'Номер заявки': invoice.invoice_number,
        'Описание': invoice.description,
        'Сумма': `${invoice.total_amount} ${invoice.currency}`,
        'Статус': this.getStatusLabel(invoice.status),
        'Поставщик': invoice.supplier?.name || '',
        'ИНН поставщика': invoice.supplier?.inn || '',
        'Плательщик': invoice.payer?.name || '',
        'Проект': invoice.project?.name || '',
        'Дата заявки': invoice.invoice_date ? 
          new Date(invoice.invoice_date).toLocaleDateString('ru-RU') : '',
        'Срок оплаты': invoice.payment_due_date ? 
          new Date(invoice.payment_due_date).toLocaleDateString('ru-RU') : '',
        'Создал': invoice.created_by_profile?.full_name || '',
        'Дата создания': new Date(invoice.created_at).toLocaleDateString('ru-RU'),
      }))
    } catch (error) {
      console.error('Ошибка получения данных для оптимизированного экспорта:', error)
      return []
    }
  }

  /**
   * OPTIMIZED: Get invoice by ID with specific relations
   * Loads only necessary related data
   */
  static async getByIdOptimized(id: string): Promise<InvoiceWithRelations | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          id,
          invoice_number,
          description,
          total_amount,
          amount_net,
          vat_amount,
          vat_rate,
          currency,
          status,
          invoice_date,
          payment_due_date,
          attachments,
          priority,
          created_at,
          updated_at,
          supplier:contractors!supplier_id(id, name, inn, email, phone),
          payer:contractors!payer_id(id, name, inn, email, phone),
          project:projects!project_id(id, name, code, budget),
          current_stage:workflow_stages!current_stage_id(id, name, description)
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {return null}
        throw error
      }

      return data as InvoiceWithRelations
    } catch (error) {
      console.error('Ошибка получения оптимизированной заявки:', error)
      return null
    }
  }

  /**
   * Helper method for status localization
   */
  private static getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      draft: 'Черновик',
      pending: 'На согласовании',
      approved: 'Согласована',
      paid: 'Оплачена',
      rejected: 'Отклонена',
      cancelled: 'Отменена',
    }
    
    return statusLabels[status] || status
  }
}

// SQL for creating the full-text search column
export const createInvoiceSearchColumn = `
-- Add full-text search column to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS invoice_search tsvector 
GENERATED ALWAYS AS (
  to_tsvector('russian', 
    COALESCE(invoice_number, '') || ' ' || 
    COALESCE(description, '')
  )
) STORED;

-- Create index on the search column
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_search_vector 
ON invoices USING gin (invoice_search);
`;