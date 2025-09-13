/**
 * Query operations for invoices with filtering, search, and pagination
 */

import { 
  exportToExcel, 
  type FilterParams, 
  handleSupabaseError, 
  type PaginatedResponse, 
  type PaginationParams,
  supabase
} from '../supabase'
import type { InvoiceWithRelations } from './crud'

// Re-export type for convenience
export type { InvoiceWithRelations } from './crud'

export interface InvoiceFilters extends FilterParams {
  status?: string
  amountFrom?: number
  amountTo?: number
  supplierId?: string
  payerId?: string
  projectId?: string
  typeId?: string
  dueDateFrom?: string
  dueDateTo?: string
  invoiceDateFrom?: string
  invoiceDateTo?: string
  overdue?: boolean
  userProjectIds?: number[]  // Проекты пользователя для фильтрации
  viewOwnProjectsOnly?: boolean  // Флаг ограничения по проектам
}

export interface InvoiceStats {
  total: number
  totalAmount: number
  byStatus: Record<string, number>
  byStatusAmount: Record<string, number>
  avgAmount: number
  overdueCount: number
  overdueAmount: number
}

export class InvoiceQueryService {
  
  /**
   * Получить список заявок с фильтрацией и пагинацией
   */
  static async getList(
    filters: InvoiceFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<InvoiceWithRelations>> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('invoices')
        .select(`
          *,
          supplier:contractors!supplier_id(id, name, inn),
          payer:contractors!payer_id(id, name, inn),
          project:projects(id, name, address),
          invoice_type:invoice_types!type_id(id, code, name, description)
        `, { count: 'exact' })

      // Применяем фильтры
      if (filters.status) {
        query = query.eq('status', filters.status)
      }

      if (filters.supplierId) {
        query = query.eq('supplier_id', filters.supplierId)
      }

      if (filters.payerId) {
        query = query.eq('payer_id', filters.payerId)
      }

      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }

      // Фильтрация по проектам пользователя если установлено ограничение
      if (filters.viewOwnProjectsOnly && filters.userProjectIds && filters.userProjectIds.length > 0) {
        console.log('[InvoiceQueryService.getList] Фильтрация по проектам пользователя:', filters.userProjectIds)
        query = query.in('project_id', filters.userProjectIds)
      }

      if (filters.typeId) {
        query = query.eq('type_id', filters.typeId)
      }

      if (filters.userId) {
        query = query.eq('created_by', filters.userId)
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
      if (filters.invoiceDateFrom) {
        query = query.gte('invoice_date', filters.invoiceDateFrom)
      }
      if (filters.invoiceDateTo) {
        query = query.lte('invoice_date', filters.invoiceDateTo)
      }
      if (filters.dueDateFrom) {
        query = query.gte('payment_due_date', filters.dueDateFrom)
      }
      if (filters.dueDateTo) {
        query = query.lte('payment_due_date', filters.dueDateTo)
      }

      // Фильтр просроченных заявок
      if (filters.overdue) {
        query = query
          .lt('payment_due_date', new Date().toISOString())
          .neq('status', 'paid')
          .neq('status', 'cancelled')
      }

      // Поисковый запрос
      if (filters.search) {
        query = query.or(
          `invoice_number.ilike.%${filters.search}%,` +
          `description.ilike.%${filters.search}%`
        )
      }

      // Сортировка и пагинация
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to)

      const { data, error, count } = await query

      if (error) {throw error}

      // Получаем уникальные ID пользователей
      const userIds = [...new Set((data || []).map(invoice => invoice.created_by).filter(Boolean))]
      
      // Загружаем информацию о пользователях
      let usersMap: Record<string, any> = {}
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, email, full_name')
          .in('id', userIds)
        
        if (users) {
          usersMap = users.reduce((acc, user) => {
            acc[user.id] = user
            return acc
          }, {} as Record<string, any>)
        }
      }

      // Добавляем информацию о создателе к каждому счету
      const enrichedData = (data || []).map(invoice => ({
        ...invoice,
        creator: invoice.created_by ? usersMap[invoice.created_by] : null
      }))

      const totalPages = Math.ceil((count || 0) / limit)


      return {
        data: enrichedData as InvoiceWithRelations[],
        error: null,
        count: count || 0,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    } catch (error) {
      console.error('Ошибка получения списка заявок:', error)
      return {
        data: [],
        error: handleSupabaseError(error),
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
   * Поиск заявок по номеру или названию
   */
  static async search(
    query: string,
    companyId: string,
    limit = 10
  ): Promise<InvoiceWithRelations[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .or(
          `invoice_number.ilike.%${query}%,` +
          `description.ilike.%${query}%`
        )
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {throw error}

      return (data as InvoiceWithRelations[]) || []
    } catch (error) {
      console.error('Ошибка поиска заявок:', error)
      return []
    }
  }

  /**
   * Получить статистику по заявкам
   */
  static async getStats(
    companyId: string,
    filters: InvoiceFilters = {}
  ): Promise<InvoiceStats> {
    try {
      let query = supabase
        .from('invoices')
        .select('total_amount, status, payment_due_date')

      // Применяем те же фильтры что и в getList
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }
      if (filters.projectId) {
        query = query.eq('project_id', filters.projectId)
      }
      if (filters.supplierId) {
        query = query.eq('supplier_id', filters.supplierId)
      }

      const { data, error } = await query

      if (error) {throw error}

      const invoices = data || []
      const total = invoices.length
      const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0)
      const avgAmount = total > 0 ? totalAmount / total : 0

      // Группировка по статусам
      const byStatus: Record<string, number> = {
        draft: 0,
        pending: 0,
        approved: 0,
        paid: 0,
        rejected: 0,
        cancelled: 0,
      }

      const byStatusAmount: Record<string, number> = {
        draft: 0,
        pending: 0,
        approved: 0,
        paid: 0,
        rejected: 0,
        cancelled: 0,
      }

      // Просроченные заявки
      const currentDate = new Date().toISOString()
      let overdueCount = 0
      let overdueAmount = 0

      invoices.forEach(invoice => {
        if (invoice.status && byStatus[invoice.status] !== undefined) {
          byStatus[invoice.status]++
          byStatusAmount[invoice.status] += invoice.total_amount || 0
        }

        // Проверяем просрочку
        if (
          invoice.payment_due_date && 
          invoice.payment_due_date < currentDate && 
          !['paid', 'cancelled'].includes(invoice.status)
        ) {
          overdueCount++
          overdueAmount += invoice.total_amount || 0
        }
      })

      return {
        total,
        totalAmount,
        byStatus,
        byStatusAmount,
        avgAmount,
        overdueCount,
        overdueAmount,
      }
    } catch (error) {
      console.error('Ошибка получения статистики заявок:', error)
      return {
        total: 0,
        totalAmount: 0,
        byStatus: {
          draft: 0,
          pending: 0,
          approved: 0,
          paid: 0,
          rejected: 0,
          cancelled: 0,
        },
        byStatusAmount: {
          draft: 0,
          pending: 0,
          approved: 0,
          paid: 0,
          rejected: 0,
          cancelled: 0,
        },
        avgAmount: 0,
        overdueCount: 0,
        overdueAmount: 0,
      }
    }
  }

  /**
   * Получить заявки для дашборда
   */
  static async getDashboardData(companyId: string) {
    try {
      const [stats, recentInvoices, overdueInvoices] = await Promise.all([
        this.getStats(companyId),
        this.getList(
          {},
          { limit: 5, sortBy: 'created_at', sortOrder: 'desc' }
        ),
        this.getList(
          { overdue: true },
          { limit: 10, sortBy: 'payment_due_date', sortOrder: 'asc' }
        ),
      ])

      return {
        stats,
        recentInvoices: recentInvoices.data,
        overdueInvoices: overdueInvoices.data,
      }
    } catch (error) {
      console.error('Ошибка получения данных дашборда:', error)
      return {
        stats: await this.getStats(companyId),
        recentInvoices: [],
        overdueInvoices: [],
      }
    }
  }

  /**
   * Экспорт заявок в Excel
   */
  static async exportToExcel(
    filters: InvoiceFilters = {},
    filename = 'invoices'
  ): Promise<void> {
    try {
      // Получаем все данные без пагинации
      const result = await this.getList(filters, { limit: 10000 })
      
      if (result.error || !result.data?.length) {
        throw new Error('Нет данных для экспорта')
      }

      const columns = [
        { key: 'invoice_number', label: 'Номер заявки' },
        { key: 'title', label: 'Название' },
        { key: 'contractorName', label: 'Поставщик' },
        { key: 'projectName', label: 'Проект' },
        { key: 'formattedAmount', label: 'Сумма' },
        { key: 'status', label: 'Статус' },
        { key: 'formattedInvoiceDate', label: 'Дата заявки' },
        { key: 'formattedDueDate', label: 'Срок оплаты' },
        { key: 'createdByName', label: 'Создал' },
        { key: 'formattedDate', label: 'Дата создания' },
      ]

      // Форматируем данные
      const exportData = result.data.map(invoice => ({
        ...invoice,
        supplierName: invoice.supplier?.name || '',
        projectName: invoice.project?.name || '',
        createdByName: invoice.created_by_profile?.full_name || '',
        formattedAmount: `${invoice.total_amount} ${invoice.currency}`,
        formattedInvoiceDate: new Date(invoice.invoice_date).toLocaleDateString('ru-RU'),
        formattedDueDate: invoice.payment_due_date 
          ? new Date(invoice.payment_due_date).toLocaleDateString('ru-RU') 
          : '',
        formattedDate: new Date(invoice.created_at).toLocaleDateString('ru-RU'),
        status: this.getStatusLabel(invoice.status),
      }))

      await exportToExcel(exportData, filename, columns)
    } catch (error) {
      console.error('Ошибка экспорта заявок:', error)
      throw new Error(handleSupabaseError(error))
    }
  }

  /**
   * Получить мои заявки (созданные текущим пользователем)
   */
  static async getMyInvoices(
    userId: string,
    companyId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<InvoiceWithRelations>> {
    return this.getList(
      { userId },
      pagination
    )
  }

  /**
   * Получить заявки требующие моего действия
   */
  static async getMyTasks(
    userId: string,
    companyId: string
  ): Promise<InvoiceWithRelations[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .in('status', ['pending', 'approved'])
        .order('created_at', { ascending: false })

      if (error) {throw error}

      return (data as InvoiceWithRelations[]) || []
    } catch (error) {
      console.error('Ошибка получения задач:', error)
      return []
    }
  }

  /**
   * Получить популярных поставщиков
   */
  static async getTopContractors(
    companyId: string,
    limit = 5
  ): Promise<Array<{ contractor: any; count: number; totalAmount: number }>> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          supplier_id,
          total_amount,
          supplier:contractors!supplier_id(id, name, inn)
        `)
        .not('status', 'in', '("cancelled")')

      if (error) {throw error}

      // Группируем по поставщикам
      const contractorStats = new Map()
      
      data.forEach(invoice => {
        const supplierId = invoice.supplier_id
        if (!supplierId) {return}
        
        if (!contractorStats.has(supplierId)) {
          contractorStats.set(supplierId, {
            contractor: invoice.supplier,
            count: 0,
            totalAmount: 0,
          })
        }
        
        const stats = contractorStats.get(supplierId)
        stats.count++
        stats.totalAmount += invoice.total_amount || 0
      })

      // Сортируем по количеству заявок и берем топ
      return Array.from(contractorStats.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
    } catch (error) {
      console.error('Ошибка получения популярных поставщиков:', error)
      return []
    }
  }

  /**
   * Получить локализованное название статуса
   */
  private static getStatusLabel(status: string): string {
    const statusLabels: Record<string, string> = {
      draft: 'Черновик',
      pending: 'На согласовании',
      approved: 'Согласована',
      paid: 'Оплачена',
      rejected: 'Отклонена',
      cancelled: 'Отменена',
    }
    
    return statusLabels[status] || status
  }
}