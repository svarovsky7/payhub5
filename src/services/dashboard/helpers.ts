/**
 * Dashboard helper functions for working with dynamic statuses
 */

import { supabase } from '../supabase'
import { INVOICE_STATUS, PAYMENT_STATUS, PROJECT_STATUS } from '../../constants/statuses'

interface StatusMapping {
  invoice: Record<string, string>
  payment: Record<string, string>
  project: Record<string, string>
}

// Cache for status mappings
let statusCache: StatusMapping | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get status mappings from database with caching
 */
export async function getStatusMappings(): Promise<StatusMapping> {
  const now = Date.now()

  // Return cached data if still valid
  if (statusCache && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log('[getStatusMappings] Returning cached status mappings')
    return statusCache
  }

  console.log('[getStatusMappings] Fetching fresh status mappings from database')

  try {
    const { data: statusesData } = await supabase
      .from('statuses')
      .select('entity_type, code')
      .eq('is_active', true)

    const statuses = statusesData || []

    // Build mappings
    const mappings: StatusMapping = {
      invoice: {},
      payment: {},
      project: {}
    }

    // Process statuses and create mappings
    statuses.forEach(status => {
      if (status.entity_type === 'invoice') {
        mappings.invoice[status.code] = status.code
      } else if (status.entity_type === 'payment') {
        mappings.payment[status.code] = status.code
      } else if (status.entity_type === 'project') {
        mappings.project[status.code] = status.code
      }
    })

    // Cache the results
    statusCache = mappings
    cacheTimestamp = now

    console.log('[getStatusMappings] Status mappings loaded:', mappings)
    return mappings
  } catch (error) {
    console.error('[getStatusMappings] Error loading status mappings:', error)

    // Return default mappings on error
    return {
      invoice: {
        draft: INVOICE_STATUS.DRAFT,
        pending: INVOICE_STATUS.PENDING,
        partially_paid: INVOICE_STATUS.PARTIALLY_PAID,
        paid: INVOICE_STATUS.PAID,
        cancelled: INVOICE_STATUS.CANCELLED
      },
      payment: {
        draft: PAYMENT_STATUS.DRAFT,
        pending: PAYMENT_STATUS.PENDING,
        approved: PAYMENT_STATUS.APPROVED,
        scheduled: PAYMENT_STATUS.SCHEDULED,
        paid: PAYMENT_STATUS.PAID,
        cancelled: PAYMENT_STATUS.CANCELLED
      },
      project: {
        planning: PROJECT_STATUS.PLANNING,
        active: PROJECT_STATUS.ACTIVE,
        completed: PROJECT_STATUS.COMPLETED,
        on_hold: PROJECT_STATUS.ON_HOLD,
        cancelled: PROJECT_STATUS.CANCELLED
      }
    }
  }
}

/**
 * Clear the status cache to force a refresh
 */
export function clearStatusCache(): void {
  statusCache = null
  cacheTimestamp = 0
  console.log('[clearStatusCache] Status cache cleared')
}

/**
 * Count items by status
 */
export function countByStatus(
  items: Array<{ status: string }>,
  statusCode: string
): number {
  return items.filter(item => item.status === statusCode).length
}

/**
 * Sum amounts by status
 */
export function sumByStatus(
  items: Array<{ status: string; amount?: number; total_amount?: number }>,
  statusCode: string
): number {
  return items
    .filter(item => item.status === statusCode)
    .reduce((sum, item) => sum + (item.amount || item.total_amount || 0), 0)
}