/**
 * Export operations for payments
 */

import { exportToExcel } from '../../supabase'
import type { PaymentWithRelations } from '../crud'
import type { PaymentExportOptions, PaymentFilters } from './types'
import { getPaymentsList } from './list'
import { getPaymentStats } from './stats'

/**
 * Export payments to Excel
 */
export async function exportPaymentsToExcel(
  filters: PaymentFilters = {},
  filename: string = 'payments'
): Promise<void> {
  try {
    console.log('[PaymentExport] Exporting payments to Excel')

    // Get all payments without pagination
    const { data: payments } = await getPaymentsList(filters, { limit: 10000 })

    if (!payments || payments.length === 0) {
      throw new Error('No payments to export')
    }

    // Transform data for export
    const exportData = payments.map(payment => ({
      'ID': payment.id,
      'Номер платежа': payment.internal_number || `P-${payment.id}`,
      'Дата платежа': formatDate(payment.payment_date),
      'Номер счета': payment.invoice?.invoice_number || '',
      'Поставщик': payment.invoice?.supplier?.name || '',
      'Плательщик': payment.invoice?.payer?.name || payment.payer?.name || '',
      'Проект': payment.invoice?.project?.name || '',
      'Сумма': payment.total_amount || 0,
      'Статус': getStatusLabel(payment.status),
      'Комментарий': payment.comment || '',
      'Создан': formatDateTime(payment.created_at),
      'Обновлен': formatDateTime(payment.updated_at)
    }))

    // Export to Excel
    exportToExcel(exportData, `${filename}_${formatDate(new Date())}.xlsx`)

    console.log(`[PaymentExport] Exported ${exportData.length} payments`)
  } catch (error) {
    console.error('[PaymentExport] Export error:', error)
    throw error
  }
}

/**
 * Export payments with statistics
 */
export async function exportPaymentsWithStats(
  filters: PaymentFilters = {},
  options: PaymentExportOptions = { format: 'excel' }
): Promise<void> {
  try {
    console.log('[PaymentExport] Exporting payments with statistics')

    // Get payments and stats in parallel
    const [paymentsResponse, stats] = await Promise.all([
      getPaymentsList(filters, { limit: 10000 }),
      options.includeStats ? getPaymentStats(filters) : null
    ])

    const payments = paymentsResponse.data

    if (!payments || payments.length === 0) {
      throw new Error('No payments to export')
    }

    // Prepare sheets for Excel
    const sheets: any[] = []

    // Main data sheet
    const paymentData = payments.map(payment => ({
      'ID': payment.id,
      'Номер': payment.internal_number || `P-${payment.id}`,
      'Дата': formatDate(payment.payment_date),
      'Счет': payment.invoice?.invoice_number || '',
      'Поставщик': payment.invoice?.supplier?.name || '',
      'Плательщик': payment.invoice?.payer?.name || payment.payer?.name || '',
      'Проект': payment.invoice?.project?.name || '',
      'Сумма': payment.total_amount || 0,
      'Статус': getStatusLabel(payment.status),
      'Комментарий': payment.comment || ''
    }))

    sheets.push({
      name: 'Платежи',
      data: paymentData
    })

    // Statistics sheet
    if (stats && options.includeStats) {
      const statsData = [
        { 'Показатель': 'Всего платежей', 'Значение': stats.total },
        { 'Показатель': 'Общая сумма', 'Значение': formatCurrency(stats.totalAmount) },
        { 'Показатель': 'Средняя сумма', 'Значение': formatCurrency(stats.avgAmount) },
        { 'Показатель': 'Среднее время обработки (часов)', 'Значение': stats.avgProcessingTime.toFixed(2) }
      ]

      // Add status breakdown
      Object.entries(stats.byStatus).forEach(([status, count]) => {
        statsData.push({
          'Показатель': `Платежей со статусом "${getStatusLabel(status)}"`,
          'Значение': count
        })
      })

      Object.entries(stats.byStatusAmount).forEach(([status, amount]) => {
        statsData.push({
          'Показатель': `Сумма платежей со статусом "${getStatusLabel(status)}"`,
          'Значение': formatCurrency(amount)
        })
      })

      sheets.push({
        name: 'Статистика',
        data: statsData
      })
    }

    // Export based on format
    switch (options.format) {
      case 'excel':
        exportToExcel(sheets[0].data, `payments_${formatDate(new Date())}.xlsx`)
        break
      case 'csv':
        exportToCSV(paymentData)
        break
      case 'pdf':
        await exportToPDF(payments, stats)
        break
      default:
        throw new Error(`Unsupported export format: ${options.format}`)
    }

    console.log(`[PaymentExport] Export completed in ${options.format} format`)
  } catch (error) {
    console.error('[PaymentExport] Export with stats error:', error)
    throw error
  }
}

// Helper functions
function formatDate(date: string | Date): string {
  if (!date) {return ''}
  const d = new Date(date)
  return d.toLocaleDateString('ru-RU')
}

function formatDateTime(date: string | Date): string {
  if (!date) {return ''}
  const d = new Date(date)
  return d.toLocaleString('ru-RU')
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB'
  }).format(amount)
}

function getStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    draft: 'Черновик',
    pending: 'На согласовании',
    approved: 'Согласован',
    scheduled: 'В графике',
    paid: 'Оплачен',
    cancelled: 'Отменен',
    processing: 'В обработке',
    completed: 'Завершен',
    failed: 'Отклонен'
  }
  return statusMap[status] || status
}

function exportToCSV(data: any[]): void {
  if (!data || data.length === 0) {return}

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',')
          ? `"${value}"`
          : value
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `payments_${formatDate(new Date())}.csv`
  link.click()
}

async function exportToPDF(payments: PaymentWithRelations[], stats: any): Promise<void> {
  // PDF export would require a library like jsPDF
  // This is a placeholder implementation
  console.warn('[PaymentExport] PDF export not implemented')
  throw new Error('PDF export not yet implemented')
}