/**
 * Core CRUD operations for invoices
 */

import {
  type ApiResponse,
  handleSupabaseError,
  type Invoice,
  type InvoiceInsert,
  type InvoiceUpdate,
  supabase
} from '../supabase'
import type { InvoiceWithRelations } from './types'

export class InvoiceCrudOperations {
  /**
   * Create new invoice
   */
  static async create(invoice: InvoiceInsert): Promise<ApiResponse<Invoice>> {
    try {
      console.log('[InvoiceCrudOperations.create] Creating invoice:', invoice)

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id

      // Prepare invoice data
      const invoiceData = {
        ...invoice,
        created_by: userId || invoice.created_by,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Remove undefined fields to avoid database errors
      Object.keys(invoiceData).forEach(key => {
        if (invoiceData[key as keyof typeof invoiceData] === undefined) {
          delete invoiceData[key as keyof typeof invoiceData]
        }
      })

      console.log('[InvoiceCrudOperations.create] Prepared invoice data:', invoiceData)
      console.log('[InvoiceCrudOperations.create] delivery_days value:', invoiceData.delivery_days, 'type:', typeof invoiceData.delivery_days)
      console.log('[InvoiceCrudOperations.create] delivery_days_type value:', invoiceData.delivery_days_type)

      const { data, error } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select('*')
        .single()

      if (error) {
        console.error('[InvoiceCrudOperations.create] Error creating invoice:', error)
        throw error
      }

      console.log('[InvoiceCrudOperations.create] Invoice created successfully:', data)

      return { data, error: null }
    } catch (error) {
      console.error('[InvoiceCrudOperations.create] Error:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Get invoice by ID
   */
  static async getById(id: string): Promise<ApiResponse<InvoiceWithRelations>> {
    try {
      console.log('[InvoiceCrudOperations.getById] Getting invoice:', id)

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('[InvoiceCrudOperations.getById] Error getting invoice:', error)
        throw error
      }

      console.log('[InvoiceCrudOperations.getById] Invoice retrieved:', data)

      return { data, error: null }
    } catch (error) {
      console.error('[InvoiceCrudOperations.getById] Error:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Update invoice
   */
  static async update(
    id: string,
    updates: InvoiceUpdate
  ): Promise<ApiResponse<Invoice>> {
    try {
      console.log('[InvoiceCrudOperations.update] Updating invoice:', { id, updates })

      // Remove read-only fields
      const cleanedUpdates = { ...updates }
      delete (cleanedUpdates as any).id
      delete (cleanedUpdates as any).created_at
      delete (cleanedUpdates as any).created_by

      // Add updated_at
      cleanedUpdates.updated_at = new Date().toISOString()

      console.log('[InvoiceCrudOperations.update] Cleaned updates:', cleanedUpdates)

      const { data, error } = await supabase
        .from('invoices')
        .update(cleanedUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('[InvoiceCrudOperations.update] Error updating invoice:', error)
        throw error
      }

      console.log('[InvoiceCrudOperations.update] Invoice updated successfully:', data)

      return { data, error: null }
    } catch (error) {
      console.error('[InvoiceCrudOperations.update] Error:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Delete invoice
   */
  static async delete(id: string): Promise<ApiResponse<null>> {
    try {
      console.log('[InvoiceCrudOperations.delete] Deleting invoice:', id)

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('[InvoiceCrudOperations.delete] Error deleting invoice:', error)
        throw error
      }

      console.log('[InvoiceCrudOperations.delete] Invoice deleted successfully')

      return { data: null, error: null }
    } catch (error) {
      console.error('[InvoiceCrudOperations.delete] Error:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Clone invoice
   */
  static async clone(id: string): Promise<ApiResponse<Invoice>> {
    try {
      console.log('[InvoiceCrudOperations.clone] Cloning invoice:', id)

      // Get original invoice
      const { data: original, error: fetchError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', id)
        .single()

      if (fetchError || !original) {
        throw fetchError || new Error('Invoice not found')
      }

      // Remove fields that shouldn't be cloned
      const clonedData = { ...original }
      delete clonedData.id
      delete clonedData.created_at
      delete clonedData.updated_at
      delete clonedData.status
      delete clonedData.workflow_state
      delete clonedData.paid_amount
      delete clonedData.attachments

      // Update reference and dates
      clonedData.reference = `${original.reference}-COPY-${Date.now()}`
      clonedData.invoice_date = new Date().toISOString()
      clonedData.status = 'draft'

      // Create new invoice
      const result = await this.create(clonedData)

      if (result.error) {
        throw result.error
      }

      console.log('[InvoiceCrudOperations.clone] Invoice cloned successfully:', result.data)

      return result
    } catch (error) {
      console.error('[InvoiceCrudOperations.clone] Error:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }
}