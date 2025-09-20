/**
 * Statistics operations for payments
 */

import { handleSupabaseError, supabase } from '../../supabase'
import type { PaymentFilters, PaymentStats } from './types'

/**
 * Get payment statistics
 */
export async function getPaymentStats(filters: PaymentFilters = {}): Promise<PaymentStats> {
  try {
    console.log('[PaymentStats] Loading payment statistics')

    let query = supabase
      .from('payments')
      .select('id, total_amount, status, created_at, approved_at', { count: 'exact' })

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
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .in('project_id', filters.userProjectIds)

      if (invoices) {
        const invoiceIds = invoices.map(inv => inv.id)
        if (invoiceIds.length > 0) {
          query = query.in('invoice_id', invoiceIds)
        } else {
          // Return empty stats
          return {
            total: 0,
            totalAmount: 0,
            byStatus: {} as Record<string, number>,
            byStatusAmount: {} as Record<string, number>,
            avgAmount: 0,
            avgProcessingTime: 0
          }
        }
      }
    }

    // Date range filter
    if (filters.paymentDateFrom) {
      query = query.gte('payment_date', filters.paymentDateFrom)
    }
    if (filters.paymentDateTo) {
      query = query.lte('payment_date', filters.paymentDateTo)
    }

    const { data, error, count } = await query

    if (error) {
      throw handleSupabaseError(error)
    }

    // Calculate statistics
    const stats: PaymentStats = {
      total: count || 0,
      totalAmount: 0,
      byStatus: {} as Record<string, number>,
      byStatusAmount: {} as Record<string, number>,
      avgAmount: 0,
      avgProcessingTime: 0
    }

    if (data && data.length > 0) {
      let totalProcessingTime = 0
      let processedCount = 0

      data.forEach(payment => {
        const amount = payment.total_amount || 0
        stats.totalAmount += amount

        // Count by status
        if (!stats.byStatus[payment.status]) {
          stats.byStatus[payment.status] = 0
          stats.byStatusAmount[payment.status] = 0
        }
        stats.byStatus[payment.status]++
        stats.byStatusAmount[payment.status] += amount

        // Calculate processing time for approved payments
        if (payment.approved_at && payment.created_at) {
          const createdAt = new Date(payment.created_at).getTime()
          const approvedAt = new Date(payment.approved_at).getTime()
          const processingTime = (approvedAt - createdAt) / (1000 * 60 * 60) // in hours
          totalProcessingTime += processingTime
          processedCount++
        }
      })

      stats.avgAmount = stats.totalAmount / stats.total
      stats.avgProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0
    }

    console.log('[PaymentStats] Statistics calculated:', stats)

    return stats
  } catch (error) {
    console.error('[PaymentStats] Error calculating statistics:', error)
    throw error
  }
}

/**
 * Get payment statistics grouped by period
 */
export async function getPaymentStatsByPeriod(
  period: 'day' | 'week' | 'month' | 'year',
  filters: PaymentFilters = {}
): Promise<Array<{ period: string; stats: PaymentStats }>> {
  try {
    console.log('[PaymentStats] Loading statistics by period:', period)

    // Get all payments within date range
    let query = supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: true })

    // Apply filters
    if (filters.companyId) {
      query = query.eq('company_id', filters.companyId)
    }

    if (filters.paymentDateFrom) {
      query = query.gte('payment_date', filters.paymentDateFrom)
    }
    if (filters.paymentDateTo) {
      query = query.lte('payment_date', filters.paymentDateTo)
    }

    const { data, error } = await query

    if (error) {
      throw handleSupabaseError(error)
    }

    if (!data || data.length === 0) {
      return []
    }

    // Group by period
    const grouped = new Map<string, any[]>()

    data.forEach(payment => {
      const date = new Date(payment.payment_date)
      let key: string

      switch (period) {
        case 'day':
          key = date.toISOString().split('T')[0]
          break
        case 'week':
          const week = getWeekNumber(date)
          key = `${date.getFullYear()}-W${week}`
          break
        case 'month':
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'year':
          key = String(date.getFullYear())
          break
      }

      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(payment)
    })

    // Calculate stats for each period
    const result: Array<{ period: string; stats: PaymentStats }> = []

    for (const [periodKey, payments] of grouped) {
      const stats: PaymentStats = {
        total: payments.length,
        totalAmount: 0,
        byStatus: {} as Record<string, number>,
        byStatusAmount: {} as Record<string, number>,
        avgAmount: 0,
        avgProcessingTime: 0
      }

      let totalProcessingTime = 0
      let processedCount = 0

      payments.forEach(payment => {
        const amount = payment.total_amount || 0
        stats.totalAmount += amount

        if (!stats.byStatus[payment.status]) {
          stats.byStatus[payment.status] = 0
          stats.byStatusAmount[payment.status] = 0
        }
        stats.byStatus[payment.status]++
        stats.byStatusAmount[payment.status] += amount

        if (payment.approved_at && payment.created_at) {
          const createdAt = new Date(payment.created_at).getTime()
          const approvedAt = new Date(payment.approved_at).getTime()
          const processingTime = (approvedAt - createdAt) / (1000 * 60 * 60)
          totalProcessingTime += processingTime
          processedCount++
        }
      })

      stats.avgAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0
      stats.avgProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0

      result.push({ period: periodKey, stats })
    }

    console.log(`[PaymentStats] Calculated statistics for ${result.length} periods`)

    return result
  } catch (error) {
    console.error('[PaymentStats] Error calculating statistics by period:', error)
    throw error
  }
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
}