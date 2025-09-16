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
      console.log('[InvoiceCrudOperations.update] ========== НАЧАЛО ОБНОВЛЕНИЯ СЧЕТА ==========')
      console.log('[InvoiceCrudOperations.update] Invoice ID:', id)
      console.log('[InvoiceCrudOperations.update] Received updates:', updates)
      console.log('[InvoiceCrudOperations.update] Updates keys:', Object.keys(updates))
      console.log('[InvoiceCrudOperations.update] Updates JSON:', JSON.stringify(updates))

      // Define allowed fields from the database schema
      const allowedFields = [
        'invoice_number',
        'internal_number',
        'invoice_date',
        'project_id',
        'type_id',
        'supplier_id',
        'payer_id',
        'amount_net',
        'vat_rate',
        'vat_amount',
        'total_amount',
        'paid_amount',
        'description',
        'priority',
        'status',
        'delivery_days',
        'material_responsible_person_id',
        'delivery_days_type',
        'paid_at'
      ]

      // Create new object with only allowed fields
      const cleanedUpdates: any = {}

      // Проверяем каждое поле
      for (const field of allowedFields) {
        if (field in updates && updates[field] !== undefined) {
          console.log(`[InvoiceCrudOperations.update] Копируем разрешенное поле: ${field} = ${updates[field]}`)
          cleanedUpdates[field] = updates[field]
        }
      }

      // Проверяем на неразрешенные поля
      const unauthorizedFields = Object.keys(updates).filter(field => !allowedFields.includes(field))
      if (unauthorizedFields.length > 0) {
        console.warn('[InvoiceCrudOperations.update] Обнаружены неразрешенные поля:', unauthorizedFields)
        unauthorizedFields.forEach(field => {
          console.warn(`[InvoiceCrudOperations.update] Отклонено неразрешенное поле: ${field} = ${updates[field]}`)
        })
      }

      console.log(`[InvoiceCrudOperations.update] Filtered to ${Object.keys(cleanedUpdates).length} allowed fields from ${Object.keys(updates).length} input fields`)

      // Ensure numeric fields are numbers
      if ('total_amount' in cleanedUpdates && typeof cleanedUpdates.total_amount === 'string') {
        cleanedUpdates.total_amount = Number(cleanedUpdates.total_amount)
      }
      if ('amount_net' in cleanedUpdates && typeof cleanedUpdates.amount_net === 'string') {
        cleanedUpdates.amount_net = Number(cleanedUpdates.amount_net)
      }
      if ('vat_amount' in cleanedUpdates && typeof cleanedUpdates.vat_amount === 'string') {
        cleanedUpdates.vat_amount = Number(cleanedUpdates.vat_amount)
      }
      if ('vat_rate' in cleanedUpdates && typeof cleanedUpdates.vat_rate === 'string') {
        cleanedUpdates.vat_rate = Number(cleanedUpdates.vat_rate)
      }

      // Add updated_at
      cleanedUpdates.updated_at = new Date().toISOString()

      console.log('[InvoiceCrudOperations.update] Очищенные данные:', cleanedUpdates)
      console.log('[InvoiceCrudOperations.update] Очищенные ключи:', Object.keys(cleanedUpdates))
      console.log('[InvoiceCrudOperations.update] Очищенный JSON:', JSON.stringify(cleanedUpdates))

      // Deep check for 'key' field
      const jsonStr = JSON.stringify(cleanedUpdates)
      if (jsonStr.includes('"key"')) {
        console.error('[InvoiceCrudOperations.update] WARNING: Field "key" still present in JSON!')
        console.error('[InvoiceCrudOperations.update] JSON string:', jsonStr)

        // Try to find where the key is
        for (const [field, value] of Object.entries(cleanedUpdates)) {
          if (typeof value === 'object' && value !== null) {
            console.error(`[InvoiceCrudOperations.update] Field ${field} is object:`, value)
            if (JSON.stringify(value).includes('key')) {
              console.error(`[InvoiceCrudOperations.update] Field ${field} contains 'key'!`)
            }
          }
        }
      }

      console.log('[InvoiceCrudOperations.update] Отправка запроса в Supabase...')
      console.log('[InvoiceCrudOperations.update] SQL: UPDATE invoices SET', cleanedUpdates, 'WHERE id =', id)

      // Дополнительная проверка перед отправкой
      const finalCheck = JSON.stringify(cleanedUpdates)
      if (finalCheck.includes('"key"')) {
        console.error('[InvoiceCrudOperations.update] КРИТИЧЕСКАЯ ОШИБКА: поле "key" все еще присутствует!')
        console.error('[InvoiceCrudOperations.update] JSON строка:', finalCheck)
        // Попробуем создать абсолютно новый объект
        const safeUpdates: any = {}
        Object.keys(cleanedUpdates).forEach(field => {
          if (field !== 'key') {
            safeUpdates[field] = cleanedUpdates[field]
          }
        })
        console.log('[InvoiceCrudOperations.update] Безопасные обновления:', safeUpdates)

        const { data, error } = await supabase
          .from('invoices')
          .update(safeUpdates)
          .eq('id', id)
          .select()
          .single()

        console.log('[InvoiceCrudOperations.update] Ответ от Supabase (безопасный):')
        console.log('[InvoiceCrudOperations.update] data:', data)
        console.log('[InvoiceCrudOperations.update] error:', error)

        return { data, error }
      }

      const { data, error } = await supabase
        .from('invoices')
        .update(cleanedUpdates)
        .eq('id', id)
        .select()
        .single()

      console.log('[InvoiceCrudOperations.update] Ответ от Supabase:')
      console.log('[InvoiceCrudOperations.update] data:', data)
      console.log('[InvoiceCrudOperations.update] error:', error)

      if (error) {
        console.error('[InvoiceCrudOperations.update] ========== ОШИБКА ОБНОВЛЕНИЯ ==========')
        console.error('[InvoiceCrudOperations.update] Ошибка:', error)
        console.error('[InvoiceCrudOperations.update] Данные, которые пытались отправить:', cleanedUpdates)
        console.error('[InvoiceCrudOperations.update] ==========================================')
        throw error
      }

      console.log('[InvoiceCrudOperations.update] ========== УСПЕШНОЕ ОБНОВЛЕНИЕ ==========')
      console.log('[InvoiceCrudOperations.update] Обновленный счет:', data)
      console.log('[InvoiceCrudOperations.update] ==========================================')

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
  static async delete(id: string, cascade: boolean = false): Promise<ApiResponse<null>> {
    try {
      console.log('[InvoiceCrudOperations.delete] Deleting invoice:', { id, cascade })

      if (cascade) {
        // Используем функцию каскадного удаления
        const { data, error } = await supabase
          .rpc('cascade_delete_invoice', { p_invoice_id: id })

        if (error) {
          console.error('[InvoiceCrudOperations.delete] Error cascade deleting invoice:', error)
          throw error
        }

        console.log('[InvoiceCrudOperations.delete] Cascade deletion result:', data)

        if (!data?.success) {
          throw new Error(data?.error || 'Failed to delete invoice')
        }

        console.log('[InvoiceCrudOperations.delete] Invoice deleted successfully with cascade:', {
          invoice_ref: data.invoice_ref,
          deleted: data.deleted
        })
      } else {
        // Обычное удаление (только счет)
        const { error } = await supabase
          .from('invoices')
          .delete()
          .eq('id', id)

        if (error) {
          console.error('[InvoiceCrudOperations.delete] Error deleting invoice:', error)
          throw error
        }

        console.log('[InvoiceCrudOperations.delete] Invoice deleted successfully')
      }

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