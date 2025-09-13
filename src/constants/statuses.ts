/**
 * Status code constants
 * These codes should match the codes in the statuses table in the database
 */

// Invoice status codes
export const INVOICE_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  CANCELLED: 'cancelled'
} as const

// Payment status codes
export const PAYMENT_STATUS = {
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  SCHEDULED: 'scheduled',
  PAID: 'paid',
  CANCELLED: 'cancelled'
} as const

// Project status codes
export const PROJECT_STATUS = {
  PLANNING: 'planning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  CANCELLED: 'cancelled'
} as const

// Type helpers
export type InvoiceStatusCode = typeof INVOICE_STATUS[keyof typeof INVOICE_STATUS]
export type PaymentStatusCode = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]
export type ProjectStatusCode = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS]