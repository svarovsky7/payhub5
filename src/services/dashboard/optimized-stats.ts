/**
 * Optimized dashboard statistics with dynamic status support
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { queryKeys } from '../hooks/queryKeys'
import { getStatusMappings, countByStatus, sumByStatus } from './helpers'
import { INVOICE_STATUS, PAYMENT_STATUS, PROJECT_STATUS } from '../../constants/statuses'

interface DashboardStats {
  invoices: {
    total: number
    byStatus: Record<string, number>
    totalAmount: number
    paidAmount: number
  }
  projects: {
    total: number
    byStatus: Record<string, number>
    totalBudget: number
    totalSpent: number
  }
  contractors: {
    total: number
    active: number
  }
  payments: {
    total: number
    byStatus: Record<string, number>
    totalAmount: number
  }
}

/**
 * Get optimized dashboard statistics with dynamic statuses
 */
export const useOptimizedDashboardStats = () => {
  return useQuery({
    queryKey: [...queryKeys.dashboard.stats(), 'optimized'],
    queryFn: async (): Promise<DashboardStats> => {
      try {
        console.log('[useOptimizedDashboardStats] Starting to fetch statistics')

        // Get status mappings (cached)
        const statusMappings = await getStatusMappings()

        // Parallel queries for better performance
        const [
          invoicesResult,
          projectsResult,
          contractorsResult,
          paymentsResult
        ] = await Promise.all([
          supabase
            .from('invoices')
            .select('status, total_amount', { count: 'exact' }),
          supabase
            .from('projects')
            .select('status, budget, spent_amount', { count: 'exact' }),
          supabase
            .from('contractors')
            .select('is_active', { count: 'exact' }),
          supabase
            .from('payments')
            .select('status, amount', { count: 'exact' })
        ])

        const invoices = invoicesResult.data || []
        const projects = projectsResult.data || []
        const contractors = contractorsResult.data || []
        const payments = paymentsResult.data || []

        // Calculate invoice statistics
        const invoiceStatusCounts: Record<string, number> = {}
        Object.keys(statusMappings.invoice).forEach(code => {
          invoiceStatusCounts[code] = countByStatus(invoices, code)
        })

        const invoiceStats = {
          total: invoicesResult.count || 0,
          byStatus: invoiceStatusCounts,
          totalAmount: invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
          paidAmount: sumByStatus(invoices, INVOICE_STATUS.PAID)
        }

        // Calculate project statistics
        const projectStatusCounts: Record<string, number> = {}
        Object.keys(statusMappings.project).forEach(code => {
          projectStatusCounts[code] = countByStatus(projects, code)
        })

        const projectStats = {
          total: projectsResult.count || 0,
          byStatus: projectStatusCounts,
          totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
          totalSpent: projects.reduce((sum, p) => sum + (p.spent_amount || 0), 0)
        }

        // Calculate payment statistics
        const paymentStatusCounts: Record<string, number> = {}
        Object.keys(statusMappings.payment).forEach(code => {
          paymentStatusCounts[code] = countByStatus(payments, code)
        })

        const paymentStats = {
          total: paymentsResult.count || 0,
          byStatus: paymentStatusCounts,
          totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0)
        }

        // Calculate contractor statistics
        const contractorStats = {
          total: contractorsResult.count || 0,
          active: contractors.filter(c => c.is_active).length
        }

        const result = {
          invoices: invoiceStats,
          projects: projectStats,
          contractors: contractorStats,
          payments: paymentStats
        }

        console.log('[useOptimizedDashboardStats] Statistics calculated:', result)
        return result
      } catch (error) {
        console.error('[useOptimizedDashboardStats] Error fetching statistics:', error)
        throw error
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  })
}

/**
 * Get simplified dashboard stats for backward compatibility
 */
export const useSimplifiedDashboardStats = () => {
  const { data, ...rest } = useOptimizedDashboardStats()

  // Transform to match old interface
  const transformedData = data ? {
    invoices: {
      total: data.invoices.total,
      pending: data.invoices.byStatus[INVOICE_STATUS.PENDING] || 0,
      draft: data.invoices.byStatus[INVOICE_STATUS.DRAFT] || 0,
      paid: data.invoices.byStatus[INVOICE_STATUS.PAID] || 0,
      totalAmount: data.invoices.totalAmount,
      paidAmount: data.invoices.paidAmount
    },
    projects: {
      total: data.projects.total,
      active: data.projects.byStatus[PROJECT_STATUS.ACTIVE] || 0,
      completed: data.projects.byStatus[PROJECT_STATUS.COMPLETED] || 0,
      totalBudget: data.projects.totalBudget,
      totalSpent: data.projects.totalSpent
    },
    contractors: data.contractors,
    payments: {
      total: data.payments.total,
      confirmed: (data.payments.byStatus[PAYMENT_STATUS.APPROVED] || 0) +
                 (data.payments.byStatus[PAYMENT_STATUS.PAID] || 0),
      totalAmount: data.payments.totalAmount
    }
  } : undefined

  return {
    ...rest,
    data: transformedData
  }
}