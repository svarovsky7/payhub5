/**
 * Report generation for payments
 */

import type { PaymentWithRelations } from '../crud'
import type { PaymentFilters, PaymentReportData } from './types'
import { getPaymentsList } from './list'
import { getPaymentStats } from './stats'

/**
 * Generate payment report for a specific period
 */
export async function generatePaymentReport(
  startDate: string,
  endDate: string,
  filters: PaymentFilters = {}
): Promise<PaymentReportData> {
  try {
    console.log('[PaymentReports] Generating report for period:', startDate, '-', endDate)

    // Set date filters
    const reportFilters: PaymentFilters = {
      ...filters,
      paymentDateFrom: startDate,
      paymentDateTo: endDate
    }

    // Get payments and stats
    const [paymentsResponse, stats] = await Promise.all([
      getPaymentsList(reportFilters, { limit: 10000 }),
      getPaymentStats(reportFilters)
    ])

    const payments = paymentsResponse.data

    // Group by status
    const groupedByStatus: Record<string, PaymentWithRelations[]> = {}
    payments.forEach(payment => {
      if (!groupedByStatus[payment.status]) {
        groupedByStatus[payment.status] = []
      }
      groupedByStatus[payment.status].push(payment)
    })

    // Group by contractor
    const groupedByContractor: Record<string, PaymentWithRelations[]> = {}
    payments.forEach(payment => {
      const contractorName = payment.invoice?.payer?.name || payment.payer?.name || 'Не указан'
      if (!groupedByContractor[contractorName]) {
        groupedByContractor[contractorName] = []
      }
      groupedByContractor[contractorName].push(payment)
    })

    const reportData: PaymentReportData = {
      period: `${formatDate(startDate)} - ${formatDate(endDate)}`,
      payments,
      stats,
      groupedByStatus,
      groupedByContractor
    }

    console.log('[PaymentReports] Report generated:', {
      total: payments.length,
      statuses: Object.keys(groupedByStatus),
      contractors: Object.keys(groupedByContractor).length
    })

    return reportData
  } catch (error) {
    console.error('[PaymentReports] Error generating report:', error)
    throw error
  }
}

/**
 * Get monthly payment summary
 */
export async function getMonthlyPaymentSummary(
  year: number,
  month: number,
  filters: PaymentFilters = {}
): Promise<{
  month: string
  totalPayments: number
  totalAmount: number
  averageAmount: number
  topContractors: Array<{ name: string; amount: number; count: number }>
  statusBreakdown: Record<string, number>
}> {
  try {
    const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const endDate = new Date(year, month, 0).toISOString().split('T')[0]

    console.log('[PaymentReports] Getting monthly summary:', year, month)

    const reportFilters: PaymentFilters = {
      ...filters,
      paymentDateFrom: startDate,
      paymentDateTo: endDate
    }

    const { data: payments } = await getPaymentsList(reportFilters, { limit: 10000 })

    // Calculate summary
    const totalAmount = payments.reduce((sum, p) => sum + (p.total_amount || 0), 0)
    const averageAmount = payments.length > 0 ? totalAmount / payments.length : 0

    // Group by contractor
    const contractorMap = new Map<string, { amount: number; count: number }>()
    payments.forEach(payment => {
      const name = payment.invoice?.payer?.name || payment.payer?.name || 'Не указан'
      const existing = contractorMap.get(name) || { amount: 0, count: 0 }
      contractorMap.set(name, {
        amount: existing.amount + (payment.total_amount || 0),
        count: existing.count + 1
      })
    })

    // Get top contractors
    const topContractors = Array.from(contractorMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)

    // Status breakdown
    const statusBreakdown: Record<string, number> = {}
    payments.forEach(payment => {
      statusBreakdown[payment.status] = (statusBreakdown[payment.status] || 0) + 1
    })

    const monthNames = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ]

    return {
      month: `${monthNames[month - 1]} ${year}`,
      totalPayments: payments.length,
      totalAmount,
      averageAmount,
      topContractors,
      statusBreakdown
    }
  } catch (error) {
    console.error('[PaymentReports] Error getting monthly summary:', error)
    throw error
  }
}

/**
 * Get payment trends over time
 */
export async function getPaymentTrends(
  periods: number = 12,
  periodType: 'month' | 'week' | 'day' = 'month',
  filters: PaymentFilters = {}
): Promise<Array<{
  period: string
  count: number
  amount: number
  avgAmount: number
}>> {
  try {
    console.log('[PaymentReports] Getting payment trends:', periods, periodType)

    const endDate = new Date()
    let startDate: Date

    switch (periodType) {
      case 'month':
        startDate = new Date(endDate.getFullYear(), endDate.getMonth() - periods, 1)
        break
      case 'week':
        startDate = new Date(endDate.getTime() - periods * 7 * 24 * 60 * 60 * 1000)
        break
      case 'day':
        startDate = new Date(endDate.getTime() - periods * 24 * 60 * 60 * 1000)
        break
    }

    const reportFilters: PaymentFilters = {
      ...filters,
      paymentDateFrom: startDate.toISOString().split('T')[0],
      paymentDateTo: endDate.toISOString().split('T')[0]
    }

    const { data: payments } = await getPaymentsList(reportFilters, { limit: 10000 })

    // Group by period
    const periodMap = new Map<string, { count: number; amount: number }>()

    payments.forEach(payment => {
      const date = new Date(payment.payment_date)
      let periodKey: string

      switch (periodType) {
        case 'month':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          periodKey = weekStart.toISOString().split('T')[0]
          break
        case 'day':
          periodKey = date.toISOString().split('T')[0]
          break
      }

      const existing = periodMap.get(periodKey) || { count: 0, amount: 0 }
      periodMap.set(periodKey, {
        count: existing.count + 1,
        amount: existing.amount + (payment.total_amount || 0)
      })
    })

    // Convert to array and calculate averages
    const trends = Array.from(periodMap.entries())
      .map(([period, data]) => ({
        period,
        count: data.count,
        amount: data.amount,
        avgAmount: data.count > 0 ? data.amount / data.count : 0
      }))
      .sort((a, b) => a.period.localeCompare(b.period))

    console.log('[PaymentReports] Trends calculated:', trends.length, 'periods')

    return trends
  } catch (error) {
    console.error('[PaymentReports] Error getting trends:', error)
    throw error
  }
}

// Helper functions
function formatDate(date: string | Date): string {
  if (!date) {return ''}
  const d = new Date(date)
  return d.toLocaleDateString('ru-RU')
}