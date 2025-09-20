/**
 * List and search operations for payments
 */

import {
  handleSupabaseError,
  type PaginatedResponse,
  type PaginationParams,
  supabase
} from '../../supabase'
import type { PaymentWithRelations } from '../crud'
import type { PaymentFilters } from './types'

/**
 * Get list of payments with filtering and pagination
 */
export async function getPaymentsList(
  filters: PaymentFilters = {},
  pagination: PaginationParams = {}
): Promise<PaginatedResponse<PaymentWithRelations>> {
  try {
    const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    console.log('[PaymentsList] Loading payments list')

    let query = supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices!invoice_id(
          id,
          invoice_number,
          invoice_date,
          type_id,
          description,
          total_amount,
          project_id,
          supplier:contractors!supplier_id(name),
          payer:contractors!payer_id(name),
          project:projects!project_id(name)
        ),
        payer:contractors!payer_id(name)
      `, { count: 'exact' })

    // Apply filters
    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.invoiceId) {
      query = query.eq('invoice_id', filters.invoiceId)
    }

    // Filter by user projects if restriction is set
    if (filters.viewOwnProjectsOnly && filters.userProjectIds && filters.userProjectIds.length > 0) {
      console.log('[PaymentsList] Filtering by user projects:', filters.userProjectIds)
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .in('project_id', filters.userProjectIds)

      if (invoices) {
        const invoiceIds = invoices.map(inv => inv.id)
        if (invoiceIds.length > 0) {
          query = query.in('invoice_id', invoiceIds)
        } else {
          // No invoices for user projects
          return { data: [], total: 0, page, limit }
        }
      }
    }

    if (filters.contractorId) {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .or(`supplier_id.eq.${filters.contractorId},payer_id.eq.${filters.contractorId}`)

      if (invoices) {
        const invoiceIds = invoices.map(inv => inv.id)
        if (invoiceIds.length > 0) {
          query = query.in('invoice_id', invoiceIds)
        } else {
          return { data: [], total: 0, page, limit }
        }
      }
    }

    if (filters.processedBy) {
      query = query.eq('processed_by', filters.processedBy)
    }

    // Amount range filter
    if (filters.amountFrom !== undefined) {
      query = query.gte('total_amount', filters.amountFrom)
    }
    if (filters.amountTo !== undefined) {
      query = query.lte('total_amount', filters.amountTo)
    }

    // Date range filter
    if (filters.paymentDateFrom) {
      query = query.gte('payment_date', filters.paymentDateFrom)
    }
    if (filters.paymentDateTo) {
      query = query.lte('payment_date', filters.paymentDateTo)
    }

    // Search filter
    if (filters.search) {
      query = query.or(`internal_number.ilike.%${filters.search}%,comment.ilike.%${filters.search}%`)
    }

    // Sorting
    if (sortBy && sortOrder) {
      const column = sortBy === 'amount' ? 'total_amount' : sortBy
      query = query.order(column, { ascending: sortOrder === 'asc' })
    }

    // Pagination
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      throw handleSupabaseError(error)
    }

    console.log(`[PaymentsList] Loaded ${data?.length || 0} of ${count || 0} payments`)

    return {
      data: data || [],
      total: count || 0,
      page,
      limit
    }
  } catch (error) {
    console.error('[PaymentsList] Error loading payments:', error)
    throw error
  }
}

/**
 * Search payments by various criteria
 */
export async function searchPayments(
  searchQuery: string,
  filters: PaymentFilters = {}
): Promise<PaymentWithRelations[]> {
  try {
    console.log('[PaymentsList] Searching payments:', searchQuery)

    let query = supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices!invoice_id(
          id,
          invoice_number,
          invoice_date,
          type_id,
          description,
          total_amount,
          supplier:contractors!supplier_id(name),
          payer:contractors!payer_id(name),
          project:projects!project_id(name)
        ),
        payer:contractors!payer_id(name)
      `)

    // Apply base filters
    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId)
    }

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    // Search in multiple fields
    query = query.or(`
      internal_number.ilike.%${searchQuery}%,
      comment.ilike.%${searchQuery}%
    `)

    const { data, error } = await query.limit(50)

    if (error) {
      throw handleSupabaseError(error)
    }

    console.log(`[PaymentsList] Found ${data?.length || 0} payments`)

    return data || []
  } catch (error) {
    console.error('[PaymentsList] Search error:', error)
    throw error
  }
}