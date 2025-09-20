/**
 * Payment query operations
 * Modularized from the original 842-line queries.ts file
 */

// Re-export types
export * from './types'

// Re-export list operations
export { getPaymentsList, searchPayments } from './list'

// Re-export statistics
export { getPaymentStats, getPaymentStatsByPeriod } from './stats'

// Re-export export operations
export { exportPaymentsToExcel, exportPaymentsWithStats } from './export'

// Re-export report operations
export {
  generatePaymentReport,
  getMonthlyPaymentSummary,
  getPaymentTrends
} from './reports'

// Main service class for backward compatibility
export class PaymentQueryService {
  static getList = (filters?: any, pagination?: any) => {
    // Import dynamically to avoid circular dependency
    const { getPaymentsList } = require('./list')
    return getPaymentsList(filters, pagination)
  }

  static getStats = (filters?: any) => {
    const { getPaymentStats } = require('./stats')
    return getPaymentStats(filters)
  }

  static exportToExcel = (filters?: any, filename?: string) => {
    const { exportPaymentsToExcel } = require('./export')
    return exportPaymentsToExcel(filters, filename)
  }

  static generateReport = (startDate: string, endDate: string, filters?: any) => {
    const { generatePaymentReport } = require('./reports')
    return generatePaymentReport(startDate, endDate, filters)
  }

  static search = (query: string, filters?: any) => {
    const { searchPayments } = require('./list')
    return searchPayments(query, filters)
  }
}