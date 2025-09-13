/**
 * Query operations for contractors with filtering, search, and statistics
 */

import { 
  type Contractor, 
  exportToExcel, 
  type FilterParams, 
  handleSupabaseError, 
  type PaginatedResponse, 
  type PaginationParams,
  supabase
} from '../supabase'
import type { ContractorWithStats } from './crud'

// Re-export type for convenience
export type { ContractorWithStats } from './crud'

export interface ContractorFilters extends FilterParams {
  is_active?: boolean
  type_id?: number
  inn?: string
  name?: string
}

export interface ContractorStats {
  total: number
  active: number
  inactive: number
  totalInvoicesAmount: number
  totalPaidAmount: number
  topContractors: Array<{
    id: string
    name: string
    invoicesCount: number
    totalAmount: number
  }>
}

export class ContractorQueryService {
  
  /**
   * Получить список поставщиков с фильтрацией и пагинацией
   */
  static async getList(
    filters: ContractorFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<Contractor>> {
    try {
      const { page = 1, limit = 20, sortBy = 'name', sortOrder = 'asc' } = pagination
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('contractors')
        .select('*', { count: 'exact' })

      // Применяем фильтры
      if (filters.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active)
      }

      if (filters.type_id) {
        query = query.eq('type_id', filters.type_id)
      }

      // Фильтр по ИНН - частичное совпадение
      if (filters.inn) {
        query = query.ilike('inn', `%${filters.inn}%`)
      }

      // Фильтр по названию - частичное совпадение
      if (filters.name) {
        query = query.ilike('name', `%${filters.name}%`)
      }

      // Фильтры по датам
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      // Общий поисковый запрос (если есть)
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,` +
          `inn.ilike.%${filters.search}%`
        )
      }

      // Сортировка и пагинация
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to)

      const { data, error, count } = await query

      if (error) {throw error}

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        data: (data as Contractor[]) || [],
        error: null,
        count: count || 0,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    } catch (error) {
      console.error('Ошибка получения списка поставщиков:', error)
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
   * Получить список поставщиков со статистикой
   */
  static async getListWithStats(
    filters: ContractorFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<ContractorWithStats>> {
    try {
      const contractorsResult = await this.getList(filters, pagination)
      
      if (contractorsResult.error || !contractorsResult.data.length) {
        return contractorsResult as PaginatedResponse<ContractorWithStats>
      }

      // Получаем статистику для каждого поставщика
      const contractorsWithStats = await Promise.all(
        contractorsResult.data.map(async (contractor) => {
          const stats = await this.getContractorStats(contractor.id)
          return {
            ...contractor,
            stats,
          } as ContractorWithStats
        })
      )

      return {
        ...contractorsResult,
        data: contractorsWithStats,
      }
    } catch (error) {
      console.error('Ошибка получения списка поставщиков со статистикой:', error)
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
   * Поиск поставщиков
   */
  static async search(
    query: string,
    limit = 10
  ): Promise<Contractor[]> {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .or(
          `name.ilike.%${query}%,` +
          `inn.ilike.%${query}%`
        )
        .eq('is_active', true) // Показываем только активных в поиске
        .order('name', { ascending: true })
        .limit(limit)

      if (error) {throw error}

      return (data as Contractor[]) || []
    } catch (error) {
      console.error('Ошибка поиска поставщиков:', error)
      return []
    }
  }

  /**
   * Получить активных поставщиков для выпадающих списков
   */
  static async getActiveList(companyId: string): Promise<Contractor[]> {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('id, name, inn')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {throw error}

      return (data as Contractor[]) || []
    } catch (error) {
      console.error('Ошибка получения активных поставщиков:', error)
      return []
    }
  }

  /**
   * Получить поставщиков по ИНН
   */
  static async getByTaxId(
    taxId: string
  ): Promise<Contractor | null> {
    try {
      const { data, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('inn', taxId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {return null} // Не найден
        throw error
      }

      return data as Contractor
    } catch (error) {
      console.error('Ошибка поиска поставщика по ИНН:', error)
      return null
    }
  }

  /**
   * Получить статистику поставщиков
   */
  static async getStats(
    filters: ContractorFilters = {}
  ): Promise<ContractorStats> {
    try {
      let query = supabase
        .from('contractors')
        .select('id, name, is_active')

      // Применяем фильтры
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      const { data: contractors, error } = await query

      if (error) {throw error}

      const contractorsList = contractors || []
      const total = contractorsList.length
      const active = contractorsList.filter(c => c.is_active).length
      const inactive = total - active

      // Получаем топ поставщиков по количеству заявок
      const { data: topContractorsData } = await supabase
        .from('invoices')
        .select(`
          contractor_id,
          amount,
          contractor:contractors!contractor_id(id, name)
        `)
        .not('contractor', 'is', null)

      // Группируем по поставщикам
      const contractorInvoiceStats = new Map()
      
      topContractorsData?.forEach(invoice => {
        const contractorId = invoice.contractor_id
        if (!contractorInvoiceStats.has(contractorId)) {
          contractorInvoiceStats.set(contractorId, {
            id: contractorId,
            name: invoice.contractor.name,
            invoicesCount: 0,
            totalAmount: 0,
          })
        }
        
        const stats = contractorInvoiceStats.get(contractorId)
        stats.invoicesCount++
        stats.totalAmount += invoice.amount
      })

      const topContractors = Array.from(contractorInvoiceStats.values())
        .sort((a, b) => b.invoicesCount - a.invoicesCount)
        .slice(0, 5)

      const totalInvoicesAmount = topContractors.reduce((sum, c) => sum + c.totalAmount, 0)
      
      // Получаем сумму оплаченных заявок
      const { data: paidInvoices } = await supabase
        .from('invoices')
        .select('amount')
        .eq('status', 'paid')

      const totalPaidAmount = paidInvoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0

      return {
        total,
        active,
        inactive,
        totalInvoicesAmount,
        totalPaidAmount,
        topContractors,
      }
    } catch (error) {
      console.error('Ошибка получения статистики поставщиков:', error)
      return {
        total: 0,
        active: 0,
        inactive: 0,
        totalInvoicesAmount: 0,
        totalPaidAmount: 0,
        topContractors: [],
      }
    }
  }

  /**
   * Получить статистику по конкретному поставщику
   */
  private static async getContractorStats(contractorId: string) {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('amount, status, created_at')
        .eq('contractor_id', contractorId)

      if (error) {throw error}

      const invoicesList = invoices || []
      const invoicesCount = invoicesList.length
      const totalAmount = invoicesList.reduce((sum, inv) => sum + inv.amount, 0)
      const paidAmount = invoicesList
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0)
      const pendingAmount = invoicesList
        .filter(inv => ['pending', 'approved'].includes(inv.status))
        .reduce((sum, inv) => sum + inv.amount, 0)
      
      const avgInvoiceAmount = invoicesCount > 0 ? totalAmount / invoicesCount : 0
      
      // Дата последней заявки
      const sortedInvoices = invoicesList.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      const lastInvoiceDate = sortedInvoices.length > 0 ? sortedInvoices[0].created_at : undefined

      return {
        invoicesCount,
        totalAmount,
        paidAmount,
        pendingAmount,
        lastInvoiceDate,
        avgInvoiceAmount,
      }
    } catch (error) {
      console.error('Ошибка получения статистики поставщика:', error)
      return {
        invoicesCount: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        avgInvoiceAmount: 0,
      }
    }
  }

  /**
   * Экспорт поставщиков в Excel
   */
  static async exportToExcel(
    filters: ContractorFilters = {},
    filename = 'contractors'
  ): Promise<void> {
    try {
      // Получаем все данные без пагинации
      const result = await this.getListWithStats(filters, { limit: 10000 })
      
      if (result.error || !result.data?.length) {
        throw new Error('Нет данных для экспорта')
      }

      const columns = [
        { key: 'name', label: 'Название' },
        { key: 'inn', label: 'ИНН' },
        { key: 'statusLabel', label: 'Статус' },
        { key: 'invoicesCount', label: 'Количество заявок' },
        { key: 'formattedTotalAmount', label: 'Общая сумма заявок' },
        { key: 'formattedPaidAmount', label: 'Оплачено' },
        { key: 'formattedCreatedDate', label: 'Дата создания' },
      ]

      // Форматируем данные
      const exportData = result.data.map(contractor => ({
        ...contractor,
        statusLabel: contractor.is_active ? 'Активный' : 'Неактивный',
        invoicesCount: contractor.stats.invoicesCount,
        formattedTotalAmount: `${contractor.stats.totalAmount} RUB`,
        formattedPaidAmount: `${contractor.stats.paidAmount} RUB`,
        formattedCreatedDate: new Date(contractor.created_at).toLocaleDateString('ru-RU'),
      }))

      await exportToExcel(exportData, filename, columns)
    } catch (error) {
      console.error('Ошибка экспорта поставщиков:', error)
      throw new Error(handleSupabaseError(error))
    }
  }

  /**
   * Получить поставщиков для дашборда
   */
  static async getDashboardData() {
    try {
      const [stats, recentContractors, topContractors] = await Promise.all([
        this.getStats(),
        this.getList(
          {},
          { limit: 5, sortBy: 'created_at', sortOrder: 'desc' }
        ),
        this.getTopContractorsByAmount(5),
      ])

      return {
        stats,
        recentContractors: recentContractors.data,
        topContractors,
      }
    } catch (error) {
      console.error('Ошибка получения данных дашборда поставщиков:', error)
      return {
        stats: await this.getStats(),
        recentContractors: [],
        topContractors: [],
      }
    }
  }

  /**
   * Получить топ поставщиков по сумме заявок
   */
  static async getTopContractorsByAmount(
    limit = 10
  ): Promise<Array<ContractorWithStats>> {
    try {
      const { data: contractors, error } = await supabase
        .from('contractors')
        .select('*')
        .eq('is_active', true)

      if (error) {throw error}

      // Получаем статистику для каждого поставщика
      const contractorsWithStats = await Promise.all(
        (contractors || []).map(async (contractor) => {
          const stats = await this.getContractorStats(contractor.id)
          return {
            ...contractor,
            stats,
          } as ContractorWithStats
        })
      )

      // Сортируем по общей сумме заявок
      return contractorsWithStats
        .sort((a, b) => b.stats.totalAmount - a.stats.totalAmount)
        .slice(0, limit)
    } catch (error) {
      console.error('Ошибка получения топ поставщиков:', error)
      return []
    }
  }

}