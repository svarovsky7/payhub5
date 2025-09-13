/**
 * Dashboard hooks for statistics and summary data
 */

import { useQuery } from '@tanstack/react-query'
import { supabase } from '../supabase'
import { queryKeys } from './queryKeys'
import { INVOICE_STATUS, PAYMENT_STATUS, PROJECT_STATUS } from '../../constants/statuses'

interface DashboardStats {
  invoices: {
    total: number
    pending: number
    draft: number
    paid: number
    totalAmount: number
    paidAmount: number
  }
  projects: {
    total: number
    active: number
    completed: number
    totalBudget: number
    totalSpent: number
  }
  contractors: {
    total: number
    active: number
  }
  payments: {
    total: number
    confirmed: number
    totalAmount: number
  }
}

/**
 * Get dashboard statistics
 * Optimized query that fetches only aggregated data
 */
export const useDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async (): Promise<DashboardStats> => {
      try {
        console.log('[useDashboardStats] Fetching dashboard statistics')

        // First fetch statuses from database to get actual codes
        const { data: statusesData } = await supabase
          .from('statuses')
          .select('entity_type, code, is_final')
          .eq('is_active', true)

        const statuses = statusesData || []
        console.log('[useDashboardStats] Loaded statuses:', statuses)

        // Get status codes for filtering
        const invoiceStatuses = {
          pending: statuses.find(s => s.entity_type === 'invoice' && s.code === INVOICE_STATUS.PENDING)?.code || INVOICE_STATUS.PENDING,
          draft: statuses.find(s => s.entity_type === 'invoice' && s.code === INVOICE_STATUS.DRAFT)?.code || INVOICE_STATUS.DRAFT,
          paid: statuses.find(s => s.entity_type === 'invoice' && s.code === INVOICE_STATUS.PAID)?.code || INVOICE_STATUS.PAID
        }

        const paymentStatuses = {
          paid: statuses.find(s => s.entity_type === 'payment' && s.code === PAYMENT_STATUS.PAID)?.code || PAYMENT_STATUS.PAID,
          approved: statuses.find(s => s.entity_type === 'payment' && s.code === PAYMENT_STATUS.APPROVED)?.code || PAYMENT_STATUS.APPROVED
        }

        const projectStatuses = {
          active: statuses.find(s => s.entity_type === 'project' && s.code === PROJECT_STATUS.ACTIVE)?.code || PROJECT_STATUS.ACTIVE,
          completed: statuses.find(s => s.entity_type === 'project' && s.code === PROJECT_STATUS.COMPLETED)?.code || PROJECT_STATUS.COMPLETED
        }

        // Parallel queries for better performance
        const [
          invoicesResult,
          projectsResult,
          contractorsResult,
          paymentsResult
        ] = await Promise.all([
          // Invoices stats
          supabase
            .from('invoices')
            .select('status, total_amount', { count: 'exact' }),

          // Projects stats
          supabase
            .from('projects')
            .select('*', { count: 'exact' }),

          // Contractors stats
          supabase
            .from('contractors')
            .select('is_active', { count: 'exact' }),

          // Payments stats
          supabase
            .from('payments')
            .select('status, amount', { count: 'exact' })
        ])

        // Process invoices with dynamic statuses
        const invoices = invoicesResult.data || []
        const invoiceStats = {
          total: invoicesResult.count || 0,
          pending: invoices.filter(i => i.status === invoiceStatuses.pending).length,
          draft: invoices.filter(i => i.status === invoiceStatuses.draft).length,
          paid: invoices.filter(i => i.status === invoiceStatuses.paid).length,
          totalAmount: invoices.reduce((sum, i) => sum + (i.total_amount || 0), 0),
          paidAmount: invoices
            .filter(i => i.status === invoiceStatuses.paid)
            .reduce((sum, i) => sum + (i.total_amount || 0), 0)
        }

        // Process projects with dynamic statuses
        const projects = projectsResult.data || []
        const projectStats = {
          total: projectsResult.count || 0,
          active: projects.filter(p => p.status === projectStatuses.active).length,
          completed: projects.filter(p => p.status === projectStatuses.completed).length,
          totalBudget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
          totalSpent: projects.reduce((sum, p) => sum + (p.spent_amount || 0), 0)
        }

        // Process contractors
        const contractors = contractorsResult.data || []
        const contractorStats = {
          total: contractorsResult.count || 0,
          active: contractors.filter(c => c.is_active).length
        }

        // Process payments with dynamic statuses
        const payments = paymentsResult.data || []
        const paymentStats = {
          total: paymentsResult.count || 0,
          confirmed: payments.filter(p =>
            p.status === paymentStatuses.paid ||
            p.status === paymentStatuses.approved
          ).length,
          totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0)
        }

        console.log('[useDashboardStats] Statistics calculated:', {
          invoices: invoiceStats,
          projects: projectStats,
          payments: paymentStats
        })

        return {
          invoices: invoiceStats,
          projects: projectStats,
          contractors: contractorStats,
          payments: paymentStats
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
        // Return default values on error
        return {
          invoices: {
            total: 0,
            pending: 0,
            draft: 0,
            paid: 0,
            totalAmount: 0,
            paidAmount: 0
          },
          projects: {
            total: 0,
            active: 0,
            completed: 0,
            totalBudget: 0,
            totalSpent: 0
          },
          contractors: {
            total: 0,
            active: 0
          },
          payments: {
            total: 0,
            confirmed: 0,
            totalAmount: 0
          }
        }
      }
    },
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
  })
}

/**
 * Get recent activity for dashboard
 */
const useDashboardActivity = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.activity(),
    queryFn: async () => {
      try {
        const { data: recentInvoices } = await supabase
          .from('invoices')
          .select('id, invoice_number, status, created_at, total_amount')
          .order('created_at', { ascending: false })
          .limit(5)

        const { data: recentPayments } = await supabase
          .from('payments')
          .select('id, payment_number, status, created_at, amount')
          .order('created_at', { ascending: false })
          .limit(5)

        return {
          recentInvoices: recentInvoices || [],
          recentPayments: recentPayments || []
        }
      } catch (error) {
        console.error('Error fetching dashboard activity:', error)
        return {
          recentInvoices: [],
          recentPayments: []
        }
      }
    },
    staleTime: 1000 * 60, // Cache for 1 minute
  })
}