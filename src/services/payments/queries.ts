/**
 * Query operations for payments with filtering, search, statistics
 */

import { 
  exportToExcel, 
  type FilterParams, 
  handleSupabaseError, 
  type PaginatedResponse, 
  type PaginationParams, 
  type Payment,
  supabase
} from '../supabase'
import type { PaymentWithRelations } from './crud'

// Re-export type for convenience
export type { PaymentWithRelations } from './crud'

export interface PaymentFilters extends FilterParams {
  status?: Payment['status']
  amountFrom?: number
  amountTo?: number
  contractorId?: string
  invoiceId?: string
  paymentDateFrom?: string
  paymentDateTo?: string
  processedBy?: string
  userProjectIds?: number[]  // Проекты пользователя для фильтрации
  viewOwnProjectsOnly?: boolean  // Флаг ограничения по проектам
}

export interface PaymentStats {
  total: number
  totalAmount: number
  byStatus: Record<Payment['status'], number>
  byStatusAmount: Record<Payment['status'], number>
  avgAmount: number
  avgProcessingTime: number // в часах
}

export class PaymentQueryService {
  
  /**
   * Получить список платежей с фильтрацией и пагинацией
   */
  static async getList(
    filters: PaymentFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<PaymentWithRelations>> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination
      const from = (page - 1) * limit
      const to = from + limit - 1

      console.log('[PaymentQueryService.getList] Загрузка списка платежей')

      let query = supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices!invoice_id(
            id, 
            invoice_number,
            invoice_date,
            type_id,
            description,
            total_amount,
            project_id,
            supplier:contractors!supplier_id(name),
            payer:contractors!payer_id(name),
            project:projects!project_id(name)
          ),
          payer:contractors!payer_id(name)
        `, { count: 'exact' })

      // Применяем фильтры
      if (filters.companyId) {
        query = query.eq('company_id', filters.companyId)
      }

      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.method) {
        query = query.eq('payment_method', filters.method)
      }

      if (filters.invoiceId) {
        query = query.eq('invoice_id', filters.invoiceId)
      }

      // Фильтрация по проектам пользователя если установлено ограничение
      if (filters.viewOwnProjectsOnly && filters.userProjectIds && filters.userProjectIds.length > 0) {
        // Сначала получаем ID счетов, которые относятся к проектам пользователя
        console.log('[PaymentQueryService.getList] Фильтрация по проектам пользователя:', filters.userProjectIds)
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id')
          .in('project_id', filters.userProjectIds)
        
        const invoiceIds = invoices?.map(inv => inv.id) || []
        console.log('[PaymentQueryService.getList] Найдено счетов для проектов пользователя:', invoiceIds.length)
        
        // Фильтруем платежи по найденным счетам
        if (invoiceIds.length > 0) {
          query = query.in('invoice_id', invoiceIds)
        } else {
          // Если нет счетов в проектах пользователя, возвращаем пустой результат
          return {
            data: [],
            count: 0,
            page,
            limit,
            totalPages: 0
          }
        }
      }

      // Contractor filter removed as we don't have that relationship

      if (filters.userId) {
        query = query.eq('created_by', filters.userId)
      }

      if (filters.processedBy) {
        query = query.eq('processed_by', filters.processedBy)
      }

      // Фильтры по сумме
      if (filters.amountFrom) {
        query = query.gte('total_amount', filters.amountFrom)
      }
      if (filters.amountTo) {
        query = query.lte('total_amount', filters.amountTo)
      }

      // Фильтры по датам
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }
      if (filters.paymentDateFrom) {
        query = query.gte('payment_date', filters.paymentDateFrom)
      }
      if (filters.paymentDateTo) {
        query = query.lte('payment_date', filters.paymentDateTo)
      }

      // Поисковый запрос
      if (filters.search) {
        query = query.or(
          `internal_number.ilike.%${filters.search}%,` +
          `comment.ilike.%${filters.search}%`
        )
      }

      // Сортировка и пагинация
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('[PaymentQueryService.getList] Ошибка запроса:', error)
        throw error
      }

      console.log('[PaymentQueryService.getList] Получено платежей:', data?.length || 0)

      // Собираем уникальные payment ids и user ids для загрузки
      const paymentIds = data?.map(p => p.id) || []
      const userIds = new Set<string>()
      data?.forEach(payment => {
        if (payment.created_by) {userIds.add(payment.created_by)}
        if (payment.confirmed_by) {userIds.add(payment.confirmed_by)}
      })

      // Загружаем информацию о workflow
      let workflowsMap: Record<string, any> = {}
      if (paymentIds.length > 0) {
        const { data: workflows } = await supabase
          .from('payment_workflows')
          .select(`
            id,
            payment_id,
            status,
            stages_completed,
            stages_total,
            current_stage_position
          `)
          .in('payment_id', paymentIds)
        
        if (workflows) {
          workflowsMap = workflows.reduce((acc, workflow) => {
            acc[workflow.payment_id] = workflow
            return acc
          }, {} as Record<string, any>)
        }
      }

      // Загружаем информацию о пользователях
      let usersMap: Record<string, any> = {}
      if (userIds.size > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', Array.from(userIds))
        
        if (users) {
          usersMap = users.reduce((acc, user) => {
            acc[user.id] = user
            return acc
          }, {} as Record<string, any>)
        }
      }

      // Преобразуем данные для совместимости с компонентом
      const transformedData = (data || []).map(payment => {
        console.log('[PaymentQueryService.getList] Обработка платежа:', {
          id: payment.id,
          total_amount: payment.total_amount,
          amount: payment.total_amount || 0
        })
        return {
          ...payment,
          // Добавляем поле amount для совместимости с компонентом (в БД это total_amount)
          amount: payment.total_amount || 0,
          // Добавляем информацию о пользователях
          creator: payment.created_by ? usersMap[payment.created_by] : null,
          confirmed_by: payment.confirmed_by ? usersMap[payment.confirmed_by] : null,
          // Добавляем информацию о workflow
          workflow: workflowsMap[payment.id] || null,
          // Преобразуем данные счета
          invoice: payment.invoice ? {
            ...payment.invoice,
            title: payment.invoice.description || 'Без описания',
            contractor: payment.invoice.supplier || payment.invoice.payer
          } : null
        }
      })

      const totalPages = Math.ceil((count || 0) / limit)

      console.log('[PaymentQueryService.getList] Преобразовано данных:', transformedData.length)

      return {
        data: transformedData as PaymentWithRelations[],
        error: null,
        count: count || 0,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    } catch (error) {
      console.error('Ошибка получения списка платежей:', error)
      return {
        data: [],
        error: handleSupabaseError(error).error,
        count: 0,
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      }
    }
  }

  /**
   * Получить список платежей с информацией о счетах
   */
  static async getListWithInvoices(
    filters: PaymentFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<any>> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination
      const from = (page - 1) * limit
      const to = from + limit - 1

      console.log('[PaymentQueryService.getListWithInvoices] Загрузка платежей с счетами')

      let query = supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices!invoice_id(
            id,
            invoice_number,
            total_amount,
            currency,
            status,
            project_id,
            supplier:contractors!supplier_id(id, name, inn),
            payer:contractors!payer_id(id, name, inn)
          )
        `, { count: 'exact' })

      // Применяем фильтры
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.invoiceId) {
        query = query.eq('invoice_id', filters.invoiceId)
      }

      // Фильтрация по проектам пользователя если установлено ограничение
      if (filters.viewOwnProjectsOnly && filters.userProjectIds && filters.userProjectIds.length > 0) {
        // Сначала получаем ID счетов, которые относятся к проектам пользователя
        console.log('[PaymentQueryService.getListWithInvoices] Фильтрация по проектам пользователя:', filters.userProjectIds)
        const { data: invoices } = await supabase
          .from('invoices')
          .select('id')
          .in('project_id', filters.userProjectIds)
        
        const invoiceIds = invoices?.map(inv => inv.id) || []
        console.log('[PaymentQueryService.getListWithInvoices] Найдено счетов для проектов пользователя:', invoiceIds.length)
        
        // Фильтруем платежи по найденным счетам
        if (invoiceIds.length > 0) {
          query = query.in('invoice_id', invoiceIds)
        } else {
          // Если нет счетов в проектах пользователя, возвращаем пустой результат
          return {
            data: [],
            count: 0,
            page,
            limit,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false
          }
        }
      }

      // Фильтры по сумме
      if (filters.amountFrom) {
        query = query.gte('total_amount', filters.amountFrom)
      }
      if (filters.amountTo) {
        query = query.lte('total_amount', filters.amountTo)
      }

      // Фильтры по датам
      if (filters.paymentDateFrom) {
        query = query.gte('payment_date', filters.paymentDateFrom)
      }
      if (filters.paymentDateTo) {
        query = query.lte('payment_date', filters.paymentDateTo)
      }

      // Поисковый запрос
      if (filters.search) {
        query = query.or(
          `internal_number.ilike.%${filters.search}%,` +
          `comment.ilike.%${filters.search}%`
        )
      }

      // Сортировка и пагинация
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error('[PaymentQueryService.getListWithInvoices] Ошибка:', error)
        throw error
      }

      const totalPages = Math.ceil((count || 0) / limit)

      console.log('[PaymentQueryService.getListWithInvoices] Загружено платежей:', data?.length || 0)

      return {
        data: data || [],
        error: null,
        count: count || 0,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    } catch (error) {
      console.error('Ошибка получения списка платежей с счетами:', error)
      return {
        data: [],
        error: handleSupabaseError(error).error,
        count: 0,
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
      }
    }
  }

  /**
   * Поиск платежей по номеру или описанию
   */
  static async search(
    query: string,
    companyId: string,
    limit = 10
  ): Promise<PaymentWithRelations[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices!invoice_id(
            id, 
            invoice_number, 
            title, 
            contractor_id,
            contractor:contractors!contractor_id(id, name, tax_id)
          )
        `)
        .eq('company_id', companyId)
        .or(
          `internal_number.ilike.%${query}%,` +
          `comment.ilike.%${query}%`
        )
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {throw error}

      return (data as PaymentWithRelations[]) || []
    } catch (error) {
      console.error('Ошибка поиска платежей:', error)
      return []
    }
  }

  /**
   * Получить статистику по платежам
   */
  static async getStats(
    companyId: string,
    filters: PaymentFilters = {}
  ): Promise<PaymentStats> {
    try {
      let query = supabase
        .from('payments')
        .select('total_amount, status, payment_method, created_at')
        .eq('company_id', companyId)

      // Применяем те же фильтры что и в getList
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }
      if (filters.invoiceId) {
        query = query.eq('invoice_id', filters.invoiceId)
      }

      const { data, error } = await query

      if (error) {throw error}

      const payments = data || []
      const total = payments.length
      const totalAmount = payments.reduce((sum, payment) => sum + payment.total_amount, 0)
      const avgAmount = total > 0 ? totalAmount / total : 0

      // Группировка по статусам
      const byStatus: Record<Payment['status'], number> = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      }

      const byStatusAmount: Record<Payment['status'], number> = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
      }

      // Группировка по методам платежа (закомментировано - не используется)
      // const byMethod: Record<Payment['payment_method'], number> = {
      //   bank_transfer: 0,
      //   cash: 0,
      //   card: 0,
      //   check: 0,
      //   other: 0,
      // }

      // const byMethodAmount: Record<Payment['payment_method'], number> = {
      //   bank_transfer: 0,
      //   cash: 0,
      //   card: 0,
      //   check: 0,
      //   other: 0,
      // }

      // Расчет среднего времени обработки
      const totalProcessingTime = 0
      const processedCount = 0

      payments.forEach(payment => {
        byStatus[payment.status]++
        byStatusAmount[payment.status] += payment.total_amount

        // byMethod[payment.payment_method]++
        // byMethodAmount[payment.payment_method] += payment.total_amount

        // Processing time calculation removed since approved_at is no longer available
      })

      const avgProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0

      return {
        total,
        totalAmount,
        byStatus,
        byStatusAmount,
        // byMethod,
        // byMethodAmount,
        avgAmount,
        avgProcessingTime,
      }
    } catch (error) {
      console.error('Ошибка получения статистики платежей:', error)
      return {
        total: 0,
        totalAmount: 0,
        byStatus: {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          cancelled: 0,
        },
        byStatusAmount: {
          pending: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          cancelled: 0,
        },
        byMethod: {
          bank_transfer: 0,
          cash: 0,
          card: 0,
          check: 0,
          other: 0,
        },
        byMethodAmount: {
          bank_transfer: 0,
          cash: 0,
          card: 0,
          check: 0,
          other: 0,
        },
        avgAmount: 0,
        avgProcessingTime: 0,
      }
    }
  }

  /**
   * Получить платежи по заявке
   */
  static async getByInvoiceId(invoiceId: string): Promise<PaymentWithRelations[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices!invoice_id(
            id, 
            invoice_number, 
            title, 
            contractor_id,
            contractor:contractors!contractor_id(id, name, tax_id)
          )
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return (data as PaymentWithRelations[]) || []
    } catch (error) {
      console.error('Ошибка получения платежей по заявке:', error)
      return []
    }
  }

  /**
   * Получить ожидающие обработки платежи
   */
  static async getPendingPayments(companyId: string): Promise<PaymentWithRelations[]> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices!invoice_id(
            id, 
            invoice_number, 
            title, 
            contractor_id,
            contractor:contractors!contractor_id(id, name, tax_id)
          )
        `)
        .eq('company_id', companyId)
        .in('status', ['pending', 'processing'])
        .order('created_at', { ascending: true })

      if (error) {throw error}

      return (data as PaymentWithRelations[]) || []
    } catch (error) {
      console.error('Ошибка получения ожидающих платежей:', error)
      return []
    }
  }

  /**
   * Получить мои платежи (созданные текущим пользователем)
   */
  static async getMyPayments(
    userId: string,
    companyId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<PaymentWithRelations>> {
    return this.getList(
      { userId, companyId },
      pagination
    )
  }

  /**
   * Получить данные для дашборда платежей
   */
  static async getDashboardData(companyId: string) {
    try {
      const [stats, recentPayments, pendingPayments] = await Promise.all([
        this.getStats(companyId),
        this.getList(
          { companyId },
          { limit: 5, sortBy: 'created_at', sortOrder: 'desc' }
        ),
        this.getPendingPayments(companyId),
      ])

      return {
        stats,
        recentPayments: recentPayments.data,
        pendingPayments: pendingPayments.slice(0, 10), // Ограничиваем до 10
      }
    } catch (error) {
      console.error('Ошибка получения данных дашборда платежей:', error)
      return {
        stats: await this.getStats(companyId),
        recentPayments: [],
        pendingPayments: [],
      }
    }
  }

  /**
   * Экспорт платежей в Excel
   */
  static async exportToExcel(
    filters: PaymentFilters = {},
    filename = 'payments'
  ): Promise<void> {
    try {
      // Получаем все данные без пагинации
      const result = await this.getList(filters, { limit: 10000 })
      
      if (result.error || !result.data?.length) {
        throw new Error('Нет данных для экспорта')
      }

      const columns = [
        { key: 'internal_number', label: 'Номер платежа' },
        { key: 'invoiceNumber', label: 'Номер заявки' },
        { key: 'invoiceTitle', label: 'Название заявки' },
        { key: 'contractorName', label: 'Поставщик' },
        { key: 'formattedAmount', label: 'Сумма' },
        { key: 'statusLabel', label: 'Статус' },
        { key: 'methodLabel', label: 'Способ оплаты' },
        { key: 'formattedPaymentDate', label: 'Дата платежа' },
        { key: 'formattedProcessedDate', label: 'Дата обработки' },
        { key: 'createdByName', label: 'Создал' },
        { key: 'processedByName', label: 'Обработал' },
        { key: 'internal_number', label: 'Внутренний номер' },
      ]

      // Форматируем данные
      const exportData = result.data.map(payment => ({
        ...payment,
        invoiceNumber: payment.invoice.invoice_number,
        invoiceTitle: payment.invoice.title,
        contractorName: payment.invoice.contractor.name,
        formattedAmount: `${payment.total_amount} ${payment.currency}`,
        formattedPaymentDate: payment.payment_date 
          ? new Date(payment.payment_date).toLocaleDateString('ru-RU') 
          : '',
        formattedProcessedDate: '',
        createdByName: payment.created_by || '',
        processedByName: '',
        statusLabel: this.getStatusLabel(payment.status),
        methodLabel: this.getMethodLabel(payment.payment_method),
      }))

      await exportToExcel(exportData, filename, columns)
    } catch (error) {
      console.error('Ошибка экспорта платежей:', error)
      throw new Error(handleSupabaseError(error).error || 'Ошибка экспорта платежей')
    }
  }

  /**
   * Получить отчет по платежам за период
   */
  static async getPeriodicReport(
    companyId: string,
    dateFrom: string,
    dateTo: string,
    groupBy: 'day' | 'week' | 'month' = 'day'
  ) {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('total_amount, status, created_at, payment_method')
        .eq('company_id', companyId)
        .gte('created_at', dateFrom)
        .lte('created_at', dateTo)
        .order('created_at', { ascending: true })

      if (error) {throw error}

      // Группируем данные по периодам
      const groupedData = new Map()
      
      data?.forEach(payment => {
        const date = new Date(payment.created_at)
        let key: string
        
        switch (groupBy) {
          case 'week':
            const weekStart = new Date(date)
            weekStart.setDate(date.getDate() - date.getDay())
            key = weekStart.toISOString().split('T')[0]
            break
          case 'month':
            key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
            break
          default: // day
            key = date.toISOString().split('T')[0]
        }
        
        if (!groupedData.has(key)) {
          groupedData.set(key, {
            period: key,
            totalAmount: 0,
            totalCount: 0,
            completedAmount: 0,
            completedCount: 0,
            pendingAmount: 0,
            pendingCount: 0,
          })
        }
        
        const group = groupedData.get(key)
        group.totalAmount += payment.total_amount
        group.totalCount++
        
        if (payment.status === 'completed') {
          group.completedAmount += payment.total_amount
          group.completedCount++
        } else if (['pending', 'processing'].includes(payment.status)) {
          group.pendingAmount += payment.total_amount
          group.pendingCount++
        }
      })

      return Array.from(groupedData.values()).sort((a, b) => a.period.localeCompare(b.period))
    } catch (error) {
      console.error('Ошибка получения отчета по платежам:', error)
      return []
    }
  }

  /**
   * Получить локализованное название статуса
   */
  private static getStatusLabel(status: Payment['status']): string {
    const statusLabels: Record<Payment['status'], string> = {
      pending: 'В ожидании',
      processing: 'Обработка',
      completed: 'Завершен',
      failed: 'Отклонен',
      cancelled: 'Отменен',
    }
    
    return statusLabels[status] || status
  }

  /**
   * Получить локализованное название метода платежа
   */
  private static getMethodLabel(method: Payment['payment_method']): string {
    const methodLabels: Record<Payment['payment_method'], string> = {
      bank_transfer: 'Банковский перевод',
      cash: 'Наличные',
      card: 'Банковская карта',
      check: 'Чек',
      other: 'Другое',
    }
    
    return methodLabels[method] || method
  }
}