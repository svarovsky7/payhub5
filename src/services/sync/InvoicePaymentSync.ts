/**
 * Invoice-Payment synchronization service
 * Replaces database function: fn_sync_invoice_payment
 */

import { supabase } from '../supabase'
import { HistoryService } from '../history/HistoryService'

export interface SyncResult {
  invoiceId: number
  oldStatus: string
  newStatus: string
  changed: boolean
  paidAmount: number
  pendingAmount: number
  totalAmount: number
}

export class InvoicePaymentSyncService {
  /**
   * Synchronize invoice status based on its payments
   */
  static async syncInvoiceStatus(
    invoiceId: number,
    userId?: string
  ): Promise<SyncResult> {
    try {
      console.log('[InvoicePaymentSync] Starting sync for invoice:', invoiceId)

      // Get invoice data
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, status, total_amount')
        .eq('id', invoiceId)
        .single()

      if (invoiceError || !invoice) {
        throw new Error(`Invoice ${invoiceId} not found`)
      }

      // Get all payments for this invoice
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, status, total_amount')
        .eq('invoice_id', invoiceId)

      if (paymentsError) {
        throw paymentsError
      }

      // Calculate payment summaries
      const paidAmount = this.calculatePaidAmount(payments || [])
      const pendingAmount = this.calculatePendingAmount(payments || [])
      const totalAmount = Number(invoice.total_amount || 0)

      // Determine new status
      const oldStatus = invoice.status
      const newStatus = this.determineInvoiceStatus(
        totalAmount,
        paidAmount,
        pendingAmount,
        payments || []
      )

      // Update if status changed
      let changed = false
      if (oldStatus !== newStatus) {
        console.log(`[InvoicePaymentSync] Status change detected: ${oldStatus} → ${newStatus}`)

        const { error: updateError } = await supabase
          .from('invoices')
          .update({ status: newStatus })
          .eq('id', invoiceId)

        if (updateError) {
          throw updateError
        }

        changed = true

        // Track status change in history
        if (userId) {
          await HistoryService.trackInvoiceChange(
            invoiceId,
            'status_changed',
            [{
              field: 'status',
              oldValue: oldStatus,
              newValue: newStatus
            }],
            userId,
            {
              trigger: 'payment_sync',
              paid_amount: paidAmount,
              pending_amount: pendingAmount,
              total_amount: totalAmount
            }
          )
        }
      }

      console.log('[InvoicePaymentSync] Sync completed:', {
        invoiceId,
        oldStatus,
        newStatus,
        changed,
        paidAmount,
        pendingAmount,
        totalAmount
      })

      return {
        invoiceId,
        oldStatus,
        newStatus,
        changed,
        paidAmount,
        pendingAmount,
        totalAmount
      }
    } catch (error) {
      console.error('[InvoicePaymentSync] Sync error:', error)
      throw error
    }
  }

  /**
   * Sync multiple invoices (batch operation)
   */
  static async syncMultipleInvoices(
    invoiceIds: number[],
    userId?: string
  ): Promise<SyncResult[]> {
    console.log('[InvoicePaymentSync] Syncing multiple invoices:', invoiceIds.length)

    const results = await Promise.all(
      invoiceIds.map(id => this.syncInvoiceStatus(id, userId))
    )

    const changedCount = results.filter(r => r.changed).length
    console.log(`[InvoicePaymentSync] Synced ${invoiceIds.length} invoices, ${changedCount} changed`)

    return results
  }

  /**
   * Calculate total paid amount from payments
   */
  private static calculatePaidAmount(payments: any[]): number {
    return payments
      .filter(p => p.status === 'paid' || p.status === 'completed')
      .reduce((sum, p) => sum + Number(p.total_amount || 0), 0)
  }

  /**
   * Calculate total pending amount from payments
   */
  private static calculatePendingAmount(payments: any[]): number {
    return payments
      .filter(p => ['pending', 'approved', 'scheduled', 'processing'].includes(p.status))
      .reduce((sum, p) => sum + Number(p.total_amount || 0), 0)
  }

  /**
   * Determine invoice status based on payment amounts
   */
  private static determineInvoiceStatus(
    totalAmount: number,
    paidAmount: number,
    pendingAmount: number,
    payments: any[]
  ): string {
    // No payments at all
    if (!payments || payments.length === 0) {
      return 'draft'
    }

    // Check if cancelled
    const allCancelled = payments.every(p => p.status === 'cancelled')
    if (allCancelled) {
      return 'draft'
    }

    // Fully paid
    if (paidAmount >= totalAmount) {
      return 'paid'
    }

    // Partially paid
    if (paidAmount > 0) {
      return 'partially_paid'
    }

    // Has pending payments
    if (pendingAmount > 0) {
      return 'pending'
    }

    // Default to draft
    return 'draft'
  }

  /**
   * Validate invoice-payment consistency
   */
  static async validateInvoicePayments(invoiceId: number): Promise<{
    valid: boolean
    errors: string[]
  }> {
    const errors: string[] = []

    try {
      // Get invoice
      const { data: invoice } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (!invoice) {
        errors.push('Invoice not found')
        return { valid: false, errors }
      }

      // Get payments
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('invoice_id', invoiceId)

      if (!payments) {
        return { valid: true, errors }
      }

      // Check for overpayment
      const totalPaid = this.calculatePaidAmount(payments)
      if (totalPaid > invoice.total_amount) {
        errors.push(`Overpayment detected: paid ${totalPaid}, invoice total ${invoice.total_amount}`)
      }

      // Check status consistency
      const expectedStatus = this.determineInvoiceStatus(
        invoice.total_amount,
        totalPaid,
        this.calculatePendingAmount(payments),
        payments
      )

      if (invoice.status !== expectedStatus) {
        errors.push(`Status mismatch: current ${invoice.status}, expected ${expectedStatus}`)
      }

      // Check for orphaned payments (payments without invoice)
      const orphanedPayments = payments.filter(p => !p.invoice_id)
      if (orphanedPayments.length > 0) {
        errors.push(`Found ${orphanedPayments.length} orphaned payments`)
      }

      return {
        valid: errors.length === 0,
        errors
      }
    } catch (error) {
      console.error('[InvoicePaymentSync] Validation error:', error)
      errors.push(`Validation error: ${error}`)
      return { valid: false, errors }
    }
  }

  /**
   * Fix invoice status inconsistencies
   */
  static async fixInconsistencies(
    dryRun: boolean = true
  ): Promise<{
    checked: number
    fixed: number
    issues: Array<{ invoiceId: number; issue: string; fixed: boolean }>
  }> {
    console.log('[InvoicePaymentSync] Starting consistency check, dryRun:', dryRun)

    const issues: Array<{ invoiceId: number; issue: string; fixed: boolean }> = []
    let checked = 0
    let fixed = 0

    try {
      // Get all invoices
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id')
        .order('id')

      if (!invoices) {
        return { checked, fixed, issues }
      }

      // Check each invoice
      for (const invoice of invoices) {
        checked++

        const validation = await this.validateInvoicePayments(invoice.id)
        if (!validation.valid) {
          for (const error of validation.errors) {
            issues.push({
              invoiceId: invoice.id,
              issue: error,
              fixed: false
            })
          }

          // Fix if not dry run
          if (!dryRun) {
            try {
              await this.syncInvoiceStatus(invoice.id, 'system')
              fixed++

              // Update issue status
              issues
                .filter(i => i.invoiceId === invoice.id)
                .forEach(i => i.fixed = true)
            } catch (error) {
              console.error(`[InvoicePaymentSync] Failed to fix invoice ${invoice.id}:`, error)
            }
          }
        }
      }

      console.log(`[InvoicePaymentSync] Check completed: ${checked} checked, ${fixed} fixed, ${issues.length} issues`)

      return { checked, fixed, issues }
    } catch (error) {
      console.error('[InvoicePaymentSync] Fix inconsistencies error:', error)
      throw error
    }
  }
}