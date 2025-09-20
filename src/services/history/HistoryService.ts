/**
 * Service for tracking entity changes history
 * Replaces database triggers: track_invoice_changes, track_payment_history, track_document_changes
 */

import { supabase } from '../supabase'

export interface ChangeRecord {
  field: string
  oldValue: any
  newValue: any
}

export interface HistoryEntry {
  invoice_id?: number
  payment_id?: number
  event_type: 'invoice' | 'payment' | 'document' | 'workflow'
  action: 'created' | 'updated' | 'deleted' | 'status_changed' | 'approved' | 'rejected'
  description?: string
  metadata?: Record<string, any>
  created_by: string
  created_at?: string
}

export class HistoryService {
  /**
   * Track invoice changes
   */
  static async trackInvoiceChange(
    invoiceId: number,
    action: 'created' | 'updated' | 'deleted',
    changes: ChangeRecord[],
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      console.log('[HistoryService] Tracking invoice change:', {
        invoiceId,
        action,
        changes: changes.length,
        userId
      })

      // Prepare history entry
      const historyEntry: HistoryEntry = {
        invoice_id: invoiceId,
        event_type: 'invoice',
        action,
        description: this.generateDescription('invoice', action, changes),
        metadata: {
          ...metadata,
          changes: changes.map(c => ({
            field: c.field,
            old: c.oldValue,
            new: c.newValue
          }))
        },
        created_by: userId
      }

      // Insert into history table
      const { error } = await supabase
        .from('invoice_history')
        .insert(historyEntry)

      if (error) {
        console.error('[HistoryService] Error tracking invoice change:', error)
        throw error
      }

      console.log('[HistoryService] Invoice change tracked successfully')
    } catch (error) {
      console.error('[HistoryService] Failed to track invoice change:', error)
      // Don't throw - history tracking should not break main operation
    }
  }

  /**
   * Track payment changes
   */
  static async trackPaymentChange(
    paymentId: number,
    invoiceId: number,
    action: 'created' | 'updated' | 'deleted' | 'status_changed',
    changes: ChangeRecord[],
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      console.log('[HistoryService] Tracking payment change:', {
        paymentId,
        invoiceId,
        action,
        changes: changes.length,
        userId
      })

      const historyEntry: HistoryEntry = {
        invoice_id: invoiceId,
        payment_id: paymentId,
        event_type: 'payment',
        action,
        description: this.generateDescription('payment', action, changes),
        metadata: {
          ...metadata,
          payment_id: paymentId,
          changes: changes.map(c => ({
            field: c.field,
            old: c.oldValue,
            new: c.newValue
          }))
        },
        created_by: userId
      }

      const { error } = await supabase
        .from('invoice_history')
        .insert(historyEntry)

      if (error) {
        console.error('[HistoryService] Error tracking payment change:', error)
        throw error
      }

      console.log('[HistoryService] Payment change tracked successfully')
    } catch (error) {
      console.error('[HistoryService] Failed to track payment change:', error)
    }
  }

  /**
   * Track document changes
   */
  static async trackDocumentChange(
    documentId: number,
    invoiceId: number,
    action: 'added' | 'deleted',
    documentName: string,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      console.log('[HistoryService] Tracking document change:', {
        documentId,
        invoiceId,
        action,
        documentName,
        userId
      })

      const historyEntry: HistoryEntry = {
        invoice_id: invoiceId,
        event_type: 'document',
        action: action === 'added' ? 'created' : 'deleted',
        description: `Документ "${documentName}" ${action === 'added' ? 'добавлен' : 'удален'}`,
        metadata: {
          ...metadata,
          document_id: documentId,
          document_name: documentName
        },
        created_by: userId
      }

      const { error } = await supabase
        .from('invoice_history')
        .insert(historyEntry)

      if (error) {
        console.error('[HistoryService] Error tracking document change:', error)
        throw error
      }

      console.log('[HistoryService] Document change tracked successfully')
    } catch (error) {
      console.error('[HistoryService] Failed to track document change:', error)
    }
  }

  /**
   * Track workflow changes
   */
  static async trackWorkflowChange(
    invoiceId: number,
    workflowId: number,
    action: 'started' | 'approved' | 'rejected' | 'completed',
    stageName: string,
    userId: string,
    comment?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      console.log('[HistoryService] Tracking workflow change:', {
        invoiceId,
        workflowId,
        action,
        stageName,
        userId
      })

      const historyEntry: HistoryEntry = {
        invoice_id: invoiceId,
        event_type: 'workflow',
        action: action === 'started' ? 'created' : action,
        description: this.generateWorkflowDescription(action, stageName, comment),
        metadata: {
          ...metadata,
          workflow_id: workflowId,
          stage_name: stageName,
          comment
        },
        created_by: userId
      }

      const { error } = await supabase
        .from('invoice_history')
        .insert(historyEntry)

      if (error) {
        console.error('[HistoryService] Error tracking workflow change:', error)
        throw error
      }

      console.log('[HistoryService] Workflow change tracked successfully')
    } catch (error) {
      console.error('[HistoryService] Failed to track workflow change:', error)
    }
  }

  /**
   * Calculate changes between old and new data
   */
  static calculateChanges(
    oldData: Record<string, any>,
    newData: Record<string, any>,
    fieldsToTrack?: string[]
  ): ChangeRecord[] {
    const changes: ChangeRecord[] = []
    const fields = fieldsToTrack || Object.keys(newData)

    for (const field of fields) {
      if (oldData[field] !== newData[field]) {
        changes.push({
          field,
          oldValue: oldData[field],
          newValue: newData[field]
        })
      }
    }

    return changes
  }

  /**
   * Generate human-readable description
   */
  private static generateDescription(
    entityType: string,
    action: string,
    changes: ChangeRecord[]
  ): string {
    const entityName = entityType === 'invoice' ? 'Счет' : 'Платеж'

    switch (action) {
      case 'created':
        return `${entityName} создан`
      case 'updated':
        if (changes.length === 0) {
          return `${entityName} обновлен`
        }
        const changedFields = changes.map(c => this.getFieldLabel(c.field)).join(', ')
        return `${entityName} обновлен: ${changedFields}`
      case 'deleted':
        return `${entityName} удален`
      case 'status_changed':
        const statusChange = changes.find(c => c.field === 'status')
        if (statusChange) {
          return `Статус изменен: ${this.getStatusLabel(statusChange.oldValue)} → ${this.getStatusLabel(statusChange.newValue)}`
        }
        return 'Статус изменен'
      default:
        return `${entityName} изменен`
    }
  }

  /**
   * Generate workflow description
   */
  private static generateWorkflowDescription(
    action: string,
    stageName: string,
    comment?: string
  ): string {
    let description = ''

    switch (action) {
      case 'started':
        description = `Процесс согласования запущен: ${stageName}`
        break
      case 'approved':
        description = `Этап "${stageName}" одобрен`
        break
      case 'rejected':
        description = `Этап "${stageName}" отклонен`
        break
      case 'completed':
        description = `Процесс согласования завершен`
        break
    }

    if (comment) {
      description += `. Комментарий: ${comment}`
    }

    return description
  }

  /**
   * Get field label for display
   */
  private static getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      invoice_number: 'Номер счета',
      internal_number: 'Внутренний номер',
      total_amount: 'Сумма',
      amount_net: 'Сумма без НДС',
      vat_amount: 'НДС',
      status: 'Статус',
      supplier_id: 'Поставщик',
      payer_id: 'Плательщик',
      project_id: 'Проект',
      payment_date: 'Дата платежа',
      description: 'Описание',
      comment: 'Комментарий',
      priority: 'Приоритет',
      delivery_days: 'Срок поставки'
    }
    return labels[field] || field
  }

  /**
   * Get status label
   */
  private static getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      draft: 'Черновик',
      pending: 'В ожидании',
      approved: 'Согласован',
      partially_paid: 'Частично оплачен',
      paid: 'Оплачен',
      cancelled: 'Отменен',
      scheduled: 'В графике'
    }
    return labels[status] || status
  }

  /**
   * Batch track multiple changes (for performance)
   */
  static async batchTrackChanges(entries: HistoryEntry[]): Promise<void> {
    try {
      console.log('[HistoryService] Batch tracking changes:', entries.length)

      const { error } = await supabase
        .from('invoice_history')
        .insert(entries)

      if (error) {
        console.error('[HistoryService] Error batch tracking changes:', error)
        throw error
      }

      console.log('[HistoryService] Batch changes tracked successfully')
    } catch (error) {
      console.error('[HistoryService] Failed to batch track changes:', error)
    }
  }
}