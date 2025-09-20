/**
 * Сервис для работы с историей счетов
 * Использует новую таблицу invoice_history для получения всех событий
 */

import { type ApiResponse, handleSupabaseError, supabase } from '../supabase'

export interface InvoiceHistoryEntry {
  id: number
  invoice_id: number
  event_type: string
  event_date: string
  action: string
  description: string | null

  // Связанные сущности
  payment_id: number | null
  document_id: number | null
  attachment_id: number | null

  // Изменения статусов и сумм
  status_from: string | null
  status_to: string | null
  amount_from: number | null
  amount_to: number | null

  // Изменения полей
  changed_fields: Record<string, any> | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null

  // Информация о пользователе
  user_id: string | null
  user_name: string | null
  user_role: string | null

  // Метаданные
  metadata: Record<string, any> | null
  created_at: string

  // Дополнительные поля из представления
  invoice_number?: string
  invoice_internal_number?: string
  payment_internal_number?: string
  document_name?: string
  user_email?: string
  user_full_name?: string
  role_name?: string
}

export type EventType =
  | 'INVOICE_CREATED'
  | 'INVOICE_UPDATED'
  | 'STATUS_CHANGED'
  | 'INVOICE_DELETED'
  | 'PAYMENT_CREATED'
  | 'PAYMENT_STATUS_CHANGED'
  | 'PAYMENT_AMOUNT_CHANGED'
  | 'PAYMENT_DELETED'
  | 'DOCUMENT_ADDED'
  | 'DOCUMENT_REMOVED'
  | 'COMMENT_ADDED'
  | 'WORKFLOW_CHANGED'
  | 'MRP_CHANGED'

export interface HistoryFilter {
  event_types?: EventType[]
  date_from?: string
  date_to?: string
  user_id?: string
  limit?: number
  offset?: number
}

export class InvoiceHistoryService {
  /**
   * Получить историю счета
   */
  static async getInvoiceHistory(
    invoiceId: string | number,
    filter?: HistoryFilter
  ): Promise<ApiResponse<InvoiceHistoryEntry[]>> {
    try {
      console.log('[InvoiceHistoryService.getInvoiceHistory] Загрузка истории для счета:', invoiceId, filter)

      let query = supabase
        .from('invoice_history_view')
        .select('*')
        .eq('invoice_id', Number(invoiceId))

      // Применяем фильтры
      if (filter?.event_types && filter.event_types.length > 0) {
        query = query.in('event_type', filter.event_types)
      }

      if (filter?.date_from) {
        query = query.gte('event_date', filter.date_from)
      }

      if (filter?.date_to) {
        query = query.lte('event_date', filter.date_to)
      }

      if (filter?.user_id) {
        query = query.eq('user_id', filter.user_id)
      }

      // Сортировка и пагинация
      query = query.order('event_date', { ascending: false })

      if (filter?.limit) {
        query = query.limit(filter.limit)
      }

      if (filter?.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1)
      }

      const { data, error } = await query

      if (error) {
        console.error('[InvoiceHistoryService.getInvoiceHistory] Ошибка:', error)
        return handleSupabaseError(error)
      }

      console.log('[InvoiceHistoryService.getInvoiceHistory] Загружено записей:', data?.length || 0)
      return { data: data || [], error: null }
    } catch (error) {
      console.error('[InvoiceHistoryService.getInvoiceHistory] Критическая ошибка:', error)
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Неизвестная ошибка',
          code: 'UNKNOWN_ERROR'
        }
      }
    }
  }

  /**
   * Получить историю всех платежей по счету
   */
  static async getPaymentHistory(
    invoiceId: string | number
  ): Promise<ApiResponse<InvoiceHistoryEntry[]>> {
    return this.getInvoiceHistory(invoiceId, {
      event_types: [
        'PAYMENT_CREATED',
        'PAYMENT_STATUS_CHANGED',
        'PAYMENT_AMOUNT_CHANGED',
        'PAYMENT_DELETED'
      ]
    })
  }

  /**
   * Получить историю документов счета
   */
  static async getDocumentHistory(
    invoiceId: string | number
  ): Promise<ApiResponse<InvoiceHistoryEntry[]>> {
    return this.getInvoiceHistory(invoiceId, {
      event_types: ['DOCUMENT_ADDED', 'DOCUMENT_REMOVED']
    })
  }

  /**
   * Добавить комментарий в историю
   */
  static async addComment(
    invoiceId: string | number,
    comment: string
  ): Promise<ApiResponse<void>> {
    try {
      console.log('[InvoiceHistoryService.addComment] Добавление комментария:', { invoiceId, comment })

      const { error } = await supabase.rpc('add_invoice_history_entry', {
        p_invoice_id: Number(invoiceId),
        p_event_type: 'COMMENT_ADDED',
        p_action: 'Добавлен комментарий',
        p_description: comment
      })

      if (error) {
        console.error('[InvoiceHistoryService.addComment] Ошибка:', error)
        return handleSupabaseError(error)
      }

      console.log('[InvoiceHistoryService.addComment] Комментарий добавлен')
      return { data: undefined, error: null }
    } catch (error) {
      console.error('[InvoiceHistoryService.addComment] Критическая ошибка:', error)
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Неизвестная ошибка',
          code: 'UNKNOWN_ERROR'
        }
      }
    }
  }

  /**
   * Добавить произвольное событие в историю
   */
  static async addCustomEvent(
    invoiceId: string | number,
    eventType: string,
    action: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<ApiResponse<void>> {
    try {
      console.log('[InvoiceHistoryService.addCustomEvent] Добавление события:', {
        invoiceId,
        eventType,
        action,
        description,
        metadata
      })

      const { error } = await supabase.rpc('add_invoice_history_entry', {
        p_invoice_id: Number(invoiceId),
        p_event_type: eventType,
        p_action: action,
        p_description: description || null,
        p_metadata: metadata || null
      })

      if (error) {
        console.error('[InvoiceHistoryService.addCustomEvent] Ошибка:', error)
        return handleSupabaseError(error)
      }

      console.log('[InvoiceHistoryService.addCustomEvent] Событие добавлено')
      return { data: undefined, error: null }
    } catch (error) {
      console.error('[InvoiceHistoryService.addCustomEvent] Критическая ошибка:', error)
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Неизвестная ошибка',
          code: 'UNKNOWN_ERROR'
        }
      }
    }
  }

  /**
   * Получить статистику по истории счета
   */
  static async getHistoryStats(
    invoiceId: string | number
  ): Promise<ApiResponse<{
    totalEvents: number
    statusChanges: number
    paymentEvents: number
    documentEvents: number
    updates: number
    comments: number
    lastModified: string | null
    lastModifiedBy: string | null
  }>> {
    try {
      const { data, error } = await this.getInvoiceHistory(invoiceId)

      if (error) {
        return { data: null, error }
      }

      const history = data || []

      const stats = {
        totalEvents: history.length,
        statusChanges: history.filter(h => h.event_type === 'STATUS_CHANGED').length,
        paymentEvents: history.filter(h => h.event_type?.startsWith('PAYMENT_')).length,
        documentEvents: history.filter(h => h.event_type?.startsWith('DOCUMENT_')).length,
        updates: history.filter(h => h.event_type === 'INVOICE_UPDATED').length,
        comments: history.filter(h => h.event_type === 'COMMENT_ADDED').length,
        lastModified: history[0]?.event_date || null,
        lastModifiedBy: history[0]?.user_name || null
      }

      console.log('[InvoiceHistoryService.getHistoryStats] Статистика:', stats)
      return { data: stats, error: null }
    } catch (error) {
      console.error('[InvoiceHistoryService.getHistoryStats] Ошибка:', error)
      return {
        data: null,
        error: {
          message: error instanceof Error ? error.message : 'Неизвестная ошибка',
          code: 'UNKNOWN_ERROR'
        }
      }
    }
  }

  /**
   * Форматирование суммы с валютой
   */
  static formatCurrency(amount: number | null, _currency?: string | null): string {
    if (!amount) {return ''}

    const formatted = amount.toLocaleString('ru-RU', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })

    return `${formatted} ₽`
  }

  /**
   * Форматирование размера файла
   */
  private static formatFileSize(bytes: number): string {
    if (!bytes) {return '0 Б'}
    const k = 1024
    const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
  }

  /**
   * Форматирование события для отображения
   */
  static formatEventForDisplay(event: InvoiceHistoryEntry): {
    icon: string
    color: string
    title: string
    description: string
    details: string[]
  } {
    const details: string[] = []

    // Определяем иконку и цвет в зависимости от типа события
    let icon = '📝'
    let color = 'default'
    let title = event.action
    let description = ''

    // Маппинг статусов для отображения
    const statusMap: Record<string, string> = {
      'draft': 'Черновик',
      'pending': 'На согласовании',
      'approved': 'Согласован',
      'paid': 'Оплачен',
      'cancelled': 'Отменен',
      'rejected': 'Отклонен',
      'completed': 'Завершен',
      'failed': 'Ошибка',
      'processing': 'В обработке',
      'scheduled': 'Запланирован'
    }

    switch (event.event_type) {
      case 'INVOICE_CREATED':
        icon = '✨'
        color = 'blue'
        title = 'Создан'
        if (event.amount_to) {
          description = this.formatCurrency(event.amount_to, 'RUB')
        }
        break

      case 'INVOICE_UPDATED':
        icon = '✏️'
        color = 'orange'
        title = 'Изменен'
        if (event.changed_fields && event.old_values && event.new_values) {
          const fieldNames: Record<string, string> = {
            'amount': 'сумма',
            'total_amount': 'общая сумма',
            'amount_with_vat': 'сумма с НДС',
            'amount_net': 'сумма без НДС',
            'vat_amount': 'сумма НДС',
            'vat_rate': 'ставка НДС',
            'contractor_id': 'контрагент',
            'supplier_id': 'поставщик',
            'payer_id': 'плательщик',
            'project_id': 'проект',
            'description': 'описание',
            'due_date': 'срок оплаты',
            'invoice_number': 'номер счета',
            'internal_number': 'внутренний номер',
            'invoice_date': 'дата счета',
            'delivery_days': 'срок поставки',
            'delivery_days_type': 'тип срока поставки',
            'priority': 'приоритет',
            'material_responsible_person_id': 'МОЛ'
          }

          // Маппинг значений для более понятного отображения
          const priorityMap: Record<string, string> = {
            'low': 'низкий',
            'normal': 'обычный',
            'high': 'высокий',
            'urgent': 'срочный'
          }

          const deliveryTypeMap: Record<string, string> = {
            'calendar': 'календарные дни',
            'working': 'рабочие дни'
          }

          // Собираем изменения для каждого поля
          const changes: string[] = []

          for (const field of Object.keys(event.changed_fields)) {
            const fieldName = fieldNames[field] || field
            const oldValue = event.old_values[field]
            const newValue = event.new_values[field]

            // Специальная обработка для разных типов полей
            if (field === 'total_amount' || field === 'amount_net' || field === 'vat_amount') {
              const oldAmount = oldValue ? this.formatCurrency(oldValue, 'RUB') : '0'
              const newAmount = newValue ? this.formatCurrency(newValue, 'RUB') : '0'
              changes.push(`${fieldName}: ${oldAmount} → ${newAmount}`)
            } else if (field === 'vat_rate') {
              changes.push(`${fieldName}: ${oldValue ?? 0}% → ${newValue ?? 0}%`)
            } else if (field === 'priority') {
              const oldPriority = priorityMap[oldValue] || oldValue || 'не указан'
              const newPriority = priorityMap[newValue] || newValue || 'не указан'
              changes.push(`${fieldName}: ${oldPriority} → ${newPriority}`)
            } else if (field === 'delivery_days_type') {
              const oldType = deliveryTypeMap[oldValue] || oldValue || 'не указан'
              const newType = deliveryTypeMap[newValue] || newValue || 'не указан'
              changes.push(`${fieldName}: ${oldType} → ${newType}`)
            } else if (field === 'material_responsible_person_id') {
              // Для МОЛ показываем имена если есть, иначе просто изменение
              if (event.old_values.material_responsible_person_name || event.new_values.material_responsible_person_name) {
                const oldName = event.old_values.material_responsible_person_name || 'не назначен'
                const newName = event.new_values.material_responsible_person_name || 'не назначен'
                changes.push(`${fieldName}: ${oldName} → ${newName}`)
              } else {
                // Если имен нет, просто фиксируем изменение
                changes.push(`${fieldName} изменен`)
              }
            } else if (field === 'supplier_id' || field === 'payer_id' || field === 'project_id') {
              // Для связанных сущностей пытаемся получить имена из metadata
              // Если имен нет, просто фиксируем изменение
              if (event.metadata?.[`old_${field}_name`] || event.metadata?.[`new_${field}_name`]) {
                const oldName = event.metadata[`old_${field}_name`] || 'не указано'
                const newName = event.metadata[`new_${field}_name`] || 'не указано'
                changes.push(`${fieldName}: ${oldName} → ${newName}`)
              } else {
                // Просто фиксируем факт изменения без ID
                changes.push(`${fieldName} изменен`)
              }
            } else if (field === 'invoice_date' || field === 'due_date') {
              // Для дат форматируем
              const oldDate = oldValue ? new Date(oldValue).toLocaleDateString('ru-RU') : 'не указано'
              const newDate = newValue ? new Date(newValue).toLocaleDateString('ru-RU') : 'не указано'
              changes.push(`${fieldName}: ${oldDate} → ${newDate}`)
            } else if (field === 'description') {
              // Для описания показываем сокращенную версию если слишком длинное
              let oldDesc = oldValue || 'пусто'
              let newDesc = newValue || 'пусто'
              if (oldDesc.length > 30) {oldDesc = oldDesc.substring(0, 27) + '...'}
              if (newDesc.length > 30) {newDesc = newDesc.substring(0, 27) + '...'}
              changes.push(`${fieldName}: ${oldDesc} → ${newDesc}`)
            } else {
              // Для остальных полей показываем как есть
              const oldDisplay = oldValue !== null && oldValue !== undefined ? String(oldValue) : 'не указано'
              const newDisplay = newValue !== null && newValue !== undefined ? String(newValue) : 'не указано'
              changes.push(`${fieldName}: ${oldDisplay} → ${newDisplay}`)
            }
          }

          // Всегда показываем все изменения, даже если их много
          if (changes.length === 1) {
            description = changes[0]
          } else if (changes.length === 2) {
            description = changes.join('; ')
          } else {
            // Для множественных изменений показываем каждое с новой строки
            description = changes.join(', ')
          }
        } else if (event.changed_fields) {
          // Если нет old_values/new_values, показываем просто список полей
          const fieldNames: Record<string, string> = {
            'amount': 'сумма',
            'total_amount': 'общая сумма',
            'amount_with_vat': 'сумма с НДС',
            'amount_net': 'сумма без НДС',
            'vat_amount': 'сумма НДС',
            'vat_rate': 'ставка НДС',
            'contractor_id': 'контрагент',
            'supplier_id': 'поставщик',
            'payer_id': 'плательщик',
            'project_id': 'проект',
            'description': 'описание',
            'due_date': 'срок оплаты',
            'invoice_number': 'номер счета',
            'internal_number': 'внутренний номер',
            'invoice_date': 'дата счета',
            'delivery_days': 'срок поставки',
            'delivery_days_type': 'тип срока поставки',
            'priority': 'приоритет',
            'material_responsible_person_id': 'МОЛ'
          }
          const fields = Object.keys(event.changed_fields).map(f => fieldNames[f] || f)
          description = fields.join(', ')
        }
        break

      case 'STATUS_CHANGED':
        icon = '🔄'
        color = event.status_to === 'paid' ? 'green' :
               event.status_to === 'cancelled' || event.status_to === 'rejected' ? 'red' : 'blue'
        title = 'Статус'
        const fromStatus = statusMap[event.status_from || ''] || event.status_from || '—'
        const toStatus = statusMap[event.status_to || ''] || event.status_to || '—'
        description = `${fromStatus} → ${toStatus}`
        break

      case 'PAYMENT_CREATED':
        icon = '💰'
        color = 'green'
        title = 'Платеж'
        if (event.amount_to) {
          const typeMap: Record<string, string> = {
            'ADV': 'Аванс',
            'RET': 'Возврат',
            'DEBT': 'Оплата'
          }
          const paymentType = 'Оплата'
          description = `${paymentType} ${this.formatCurrency(event.amount_to, 'RUB')}`
        }
        break

      case 'PAYMENT_STATUS_CHANGED':
        icon = '💳'
        color = event.status_to === 'completed' || event.status_to === 'paid' ? 'green' :
               event.status_to === 'cancelled' || event.status_to === 'failed' ? 'red' : 'blue'
        title = 'Платеж'
        const fromPayStatus = statusMap[event.status_from || ''] || event.status_from || '—'
        const toPayStatus = statusMap[event.status_to || ''] || event.status_to || '—'
        description = `${fromPayStatus} → ${toPayStatus}`
        break

      case 'PAYMENT_AMOUNT_CHANGED':
        icon = '💵'
        color = 'orange'
        title = 'Сумма'
        if (event.amount_from && event.amount_to) {
          const diff = event.amount_to - event.amount_from
          const sign = diff > 0 ? '+' : ''
          description = `${sign}${this.formatCurrency(diff, 'RUB')}`
        }
        break

      case 'DOCUMENT_ADDED':
        icon = '📎'
        color = 'blue'
        title = 'Документ'
        if (event.metadata?.file_name) {
          // Сокращаем имя файла если слишком длинное
          let fileName = event.metadata.file_name
          if (fileName.length > 30) {
            const ext = fileName.split('.').pop()
            fileName = fileName.substring(0, 25) + '...' + (ext ? `.${ext}` : '')
          }
          description = fileName
        }
        break

      case 'DOCUMENT_REMOVED':
        icon = '🗑️'
        color = 'red'
        title = 'Удален'
        if (event.metadata?.file_name) {
          let fileName = event.metadata.file_name
          if (fileName.length > 30) {
            const ext = fileName.split('.').pop()
            fileName = fileName.substring(0, 25) + '...' + (ext ? `.${ext}` : '')
          }
          description = fileName
        }
        break

      case 'COMMENT_ADDED':
        icon = '💬'
        color = 'blue'
        title = 'Комментарий'
        // Обрезаем длинные комментарии
        description = event.description || ''
        if (description.length > 100) {
          description = description.substring(0, 97) + '...'
        }
        break

      case 'INVOICE_DELETED':
        icon = '❌'
        color = 'red'
        title = 'Удален'
        if (event.metadata?.invoice_number) {
          description = `Счет №${event.metadata.invoice_number}`
        }
        break

      case 'PAYMENT_DELETED':
        icon = '❌'
        color = 'red'
        title = 'Удален'
        if (event.payment_internal_number) {
          description = `Платеж ${event.payment_internal_number}`
        }
        break

      case 'WORKFLOW_CHANGED':
        icon = '⚙️'
        color = 'purple'
        title = 'Маршрут'
        description = event.description || 'Изменен маршрут согласования'
        break

      case 'MRP_CHANGED':
        icon = '👤'
        color = 'blue'
        title = 'МОЛ'
        // Показываем старое и новое значение МОЛ
        if (event.old_values && event.new_values) {
          const oldName = event.old_values.material_responsible_person_name || 'не назначен'
          const newName = event.new_values.material_responsible_person_name || 'не назначен'
          description = `${oldName} → ${newName}`
        } else {
          description = 'изменен'
        }
        break

      default:
        icon = '📌'
        color = 'default'
        title = event.action || 'Событие'
        description = event.description || ''
        if (description.length > 100) {
          description = description.substring(0, 97) + '...'
        }
    }

    return {
      icon,
      color,
      title,
      description,
      details
    }
  }
}