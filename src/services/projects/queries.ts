/**
 * Query operations for projects with filtering, search, and statistics
 */

import { 
  exportToExcel, 
  type FilterParams, 
  handleSupabaseError, 
  type PaginatedResponse, 
  type PaginationParams, 
  type Project,
  supabase
} from '../supabase'
import type { ProjectWithRelations } from './crud'

// Re-export type for convenience
export type { ProjectWithRelations } from './crud'

export interface ProjectFilters extends FilterParams {
  status?: Project['status']
  budgetFrom?: number
  budgetTo?: number
  managerId?: string
  startDateFrom?: string
  startDateTo?: string
  endDateFrom?: string
  endDateTo?: string
  budgetUsageMin?: number
  budgetUsageMax?: number
  overBudget?: boolean
}

export interface ProjectStats {
  total: number
  totalBudget: number
  totalSpent: number
  byStatus: Record<Project['status'], number>
  byStatusBudget: Record<Project['status'], number>
  avgBudget: number
  budgetUtilization: number
  overBudgetCount: number
  completedOnTime: number
  totalProjects: number
}

export class ProjectQueryService {
  
  /**
   * Получить список проектов (алиас для getList)
   */
  static async listProjects(
    filters: ProjectFilters = {},
    pagination: PaginationParams = {}
  ) {
    const result = await this.getList(filters, pagination)
    return result.data || []
  }
  
  /**
   * Получить список проектов с фильтрацией и пагинацией
   */
  static async getList(
    filters: ProjectFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<ProjectWithRelations>> {
    try {
      const { page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc' } = pagination
      const from = (page - 1) * limit
      const to = from + limit - 1

      let query = supabase
        .from('projects')
        .select('*', { count: 'exact' })

      // Применяем фильтры
      // Фильтр по активности
      if (filters.status === 'active') {
        query = query.eq('is_active', true)
      } else if (filters.status === 'inactive') {
        query = query.eq('is_active', false)
      }


      // Убраны фильтры по бюджету - поля нет в БД

      // Фильтры по датам
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }
      if (filters.startDateFrom) {
        query = query.gte('start_date', filters.startDateFrom)
      }
      if (filters.startDateTo) {
        query = query.lte('start_date', filters.startDateTo)
      }
      if (filters.endDateFrom) {
        query = query.gte('end_date', filters.endDateFrom)
      }
      if (filters.endDateTo) {
        query = query.lte('end_date', filters.endDateTo)
      }

      // Поисковый запрос
      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,` +
          `address.ilike.%${filters.search}%`
        )
      }

      // Сортировка и пагинация
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(from, to)

      const { data, error, count } = await query

      if (error) {throw error}

      // Возвращаем проекты без дополнительной статистики (так как полей нет в БД)
      const projectsWithStats = (data || []).map(project => ({
        ...project,
        stats: {
          invoicesCount: 0,
          totalInvoicesAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          budgetUsed: 0,
          budgetRemaining: 0,
          budgetUsagePercent: 0
        }
      } as ProjectWithRelations))

      // Применяем фильтры по использованию бюджета
      let filteredProjects = projectsWithStats
      
      if (filters.budgetUsageMin !== undefined) {
        filteredProjects = filteredProjects.filter(
          p => p.stats.budgetUsagePercent >= filters.budgetUsageMin!
        )
      }
      if (filters.budgetUsageMax !== undefined) {
        filteredProjects = filteredProjects.filter(
          p => p.stats.budgetUsagePercent <= filters.budgetUsageMax!
        )
      }
      if (filters.overBudget) {
        filteredProjects = filteredProjects.filter(
          p => p.stats.budgetUsagePercent > 100
        )
      }

      const totalPages = Math.ceil((count || 0) / limit)

      return {
        data: filteredProjects,
        error: null,
        count: count || 0,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    } catch (error) {
      console.error('Ошибка получения списка проектов:', error)
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
   * Поиск проектов
   */
  static async search(
    query: string,
    companyId: string,
    limit = 10
  ): Promise<ProjectWithRelations[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .or(
          `name.ilike.%${query}%`
        )
        .order('name', { ascending: true })
        .limit(limit)

      if (error) {throw error}

      // Возвращаем проекты без дополнительной статистики
      const projectsWithStats = (data || []).map(project => ({
        ...project,
        stats: {
          invoicesCount: 0,
          totalInvoicesAmount: 0,
          paidAmount: 0,
          pendingAmount: 0,
          budgetUsed: 0,
          budgetRemaining: 0,
          budgetUsagePercent: 0
        }
      } as ProjectWithRelations))

      return projectsWithStats
    } catch (error) {
      console.error('Ошибка поиска проектов:', error)
      return []
    }
  }

  /**
   * Получить активные проекты для выпадающих списков
   */
  static async getActiveList(companyId: string): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, address, is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) {throw error}

      return (data as Project[]) || []
    } catch (error) {
      console.error('Ошибка получения активных проектов:', error)
      return []
    }
  }

  /**
   * Получить проект по имени
   */
  static async getByName(
    name: string
  ): Promise<Project | null> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('name', name)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {return null} // Не найден
        throw error
      }

      return data as Project
    } catch (error) {
      console.error('Ошибка поиска проекта по имени:', error)
      return null
    }
  }

  /**
   * Получить статистику проектов
   */
  static async getStats(
    companyId: string,
    filters: ProjectFilters = {}
  ): Promise<ProjectStats> {
    try {
      let query = supabase
        .from('projects')
        .select('id, name, address, is_active, created_at, updated_at')

      // Применяем фильтры
      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom)
      }
      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo)
      }

      const { data: projects, error } = await query

      if (error) {throw error}

      const projectsList = projects || []
      const total = projectsList.length
      const activeCount = projectsList.filter(p => p.is_active).length
      const inactiveCount = total - activeCount

      // Упрощенная статистика для текущей структуры БД
      const byStatus = {
        planning: 0,
        active: activeCount,
        completed: 0,
        on_hold: 0,
        cancelled: inactiveCount
      }

      const byStatusBudget = {
        planning: 0,
        active: 0,
        completed: 0,
        on_hold: 0,
        cancelled: 0
      }

      return {
        total,
        totalBudget,
        totalSpent,
        byStatus,
        byStatusBudget,
        avgBudget,
        budgetUtilization,
        overBudgetCount,
        completedOnTime,
        totalProjects: total,
      }
    } catch (error) {
      console.error('Ошибка получения статистики проектов:', error)
      return {
        total: 0,
        totalBudget: 0,
        totalSpent: 0,
        byStatus: {
          planning: 0,
          active: 0,
          completed: 0,
          on_hold: 0,
          cancelled: 0,
        },
        byStatusBudget: {
          planning: 0,
          active: 0,
          completed: 0,
          on_hold: 0,
          cancelled: 0,
        },
        avgBudget: 0,
        budgetUtilization: 0,
        overBudgetCount: 0,
        completedOnTime: 0,
        totalProjects: 0,
      }
    }
  }

  /**
   * Получить проекты менеджера
   */
  static async getByManagerId(
    managerId: string,
    companyId: string,
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<ProjectWithRelations>> {
    return this.getList(
      { managerId, companyId },
      pagination
    )
  }

  /**
   * Получить проекты с превышением бюджета
   */
  static async getOverBudgetProjects(companyId: string): Promise<ProjectWithRelations[]> {
    try {
      const result = await this.getList(
        { companyId, overBudget: true },
        { limit: 100 }
      )

      return result.data || []
    } catch (error) {
      console.error('Ошибка получения проектов с превышением бюджета:', error)
      return []
    }
  }

  /**
   * Получить данные для дашборда проектов
   */
  static async getDashboardData(companyId: string) {
    try {
      const [stats, recentProjects, activeProjects, overBudgetProjects] = await Promise.all([
        this.getStats(companyId),
        this.getList(
          { companyId },
          { limit: 5, sortBy: 'created_at', sortOrder: 'desc' }
        ),
        this.getList(
          { companyId, status: 'active' },
          { limit: 10, sortBy: 'name', sortOrder: 'asc' }
        ),
        this.getOverBudgetProjects(companyId),
      ])

      return {
        stats,
        recentProjects: recentProjects.data,
        activeProjects: activeProjects.data,
        overBudgetProjects: overBudgetProjects.slice(0, 5),
      }
    } catch (error) {
      console.error('Ошибка получения данных дашборда проектов:', error)
      return {
        stats: await this.getStats(companyId),
        recentProjects: [],
        activeProjects: [],
        overBudgetProjects: [],
      }
    }
  }

  /**
   * Экспорт проектов в Excel
   */
  static async exportToExcel(
    filters: ProjectFilters = {},
    filename = 'projects'
  ): Promise<void> {
    try {
      // Получаем все данные без пагинации
      const result = await this.getList(filters, { limit: 10000 })
      
      if (result.error || !result.data?.length) {
        throw new Error('Нет данных для экспорта')
      }

      const columns = [
        { key: 'name', label: 'Название' },
        { key: 'code', label: 'Код' },
        { key: 'statusLabel', label: 'Статус' },
        { key: 'formattedBudget', label: 'Бюджет' },
        { key: 'formattedSpentAmount', label: 'Потрачено' },
        { key: 'formattedBudgetRemaining', label: 'Остаток' },
        { key: 'budgetUsagePercent', label: 'Использование бюджета (%)' },
        { key: 'invoicesCount', label: 'Количество заявок' },
        { key: 'formattedTotalInvoices', label: 'Общая сумма заявок' },
        { key: 'managerName', label: 'Менеджер' },
        { key: 'formattedStartDate', label: 'Дата начала' },
        { key: 'formattedEndDate', label: 'Дата окончания' },
        { key: 'formattedCreatedDate', label: 'Дата создания' },
      ]

      // Форматируем данные
      const exportData = result.data.map(project => ({
        ...project,
        statusLabel: this.getStatusLabel(project.status),
        formattedBudget: `${project.budget} RUB`,
        formattedSpentAmount: `${project.spent_amount} RUB`,
        formattedBudgetRemaining: `${project.stats.budgetRemaining} RUB`,
        budgetUsagePercent: Math.round(project.stats.budgetUsagePercent),
        invoicesCount: project.stats.invoicesCount,
        formattedTotalInvoices: `${project.stats.totalInvoicesAmount} RUB`,
        managerName: project.manager 
          ? `${project.manager.first_name} ${project.manager.last_name}`
          : '',
        formattedStartDate: project.start_date 
          ? new Date(project.start_date).toLocaleDateString('ru-RU') 
          : '',
        formattedEndDate: project.end_date 
          ? new Date(project.end_date).toLocaleDateString('ru-RU') 
          : '',
        formattedCreatedDate: new Date(project.created_at).toLocaleDateString('ru-RU'),
      }))

      await exportToExcel(exportData, filename, columns)
    } catch (error) {
      console.error('Ошибка экспорта проектов:', error)
      throw new Error(handleSupabaseError(error))
    }
  }

  /**
   * Получить отчет по бюджету проектов
   */
  static async getBudgetReport(
    companyId: string,
    dateFrom?: string,
    dateTo?: string
  ) {
    try {
      let query = supabase
        .from('projects')
        .select(`
          id, name, code, budget, spent_amount, status,
          manager:users!manager_id(first_name, last_name)
        `)
        .eq('company_id', companyId)

      if (dateFrom) {query = query.gte('created_at', dateFrom)}
      if (dateTo) {query = query.lte('created_at', dateTo)}

      const { data: projects, error } = await query

      if (error) {throw error}

      // Добавляем детальную статистику по каждому проекту
      const projectsWithDetails = await Promise.all(
        (projects || []).map(async (project) => {
          const stats = await this.getProjectStats(project.id)
          
          return {
            ...project,
            stats,
            budgetUsagePercent: project.budget > 0 
              ? (project.spent_amount / project.budget) * 100 
              : 0,
            budgetRemaining: project.budget - project.spent_amount,
            managerName: project.manager 
              ? `${project.manager.first_name} ${project.manager.last_name}`
              : '',
          }
        })
      )

      return projectsWithDetails.sort((a, b) => b.budgetUsagePercent - a.budgetUsagePercent)
    } catch (error) {
      console.error('Ошибка получения отчета по бюджету:', error)
      return []
    }
  }

  /**
   * Получить статистику по конкретному проекту
   */
  private static async getProjectStats(projectId: string) {
    try {
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('amount, status')
        .eq('project_id', projectId)

      if (error) {throw error}

      const invoicesList = invoices || []
      const invoicesCount = invoicesList.length
      const totalInvoicesAmount = invoicesList.reduce((sum, inv) => sum + inv.amount, 0)
      const paidAmount = invoicesList
        .filter(inv => inv.status === 'paid')
        .reduce((sum, inv) => sum + inv.amount, 0)
      const pendingAmount = invoicesList
        .filter(inv => ['pending', 'approved'].includes(inv.status))
        .reduce((sum, inv) => sum + inv.amount, 0)

      // Получаем бюджет проекта
      const { data: project } = await supabase
        .from('projects')
        .select('budget, spent_amount')
        .eq('id', projectId)
        .single()

      const budget = project?.budget || 0
      const budgetUsed = project?.spent_amount || 0
      const budgetRemaining = budget - budgetUsed
      const budgetUsagePercent = budget > 0 ? (budgetUsed / budget) * 100 : 0

      return {
        invoicesCount,
        totalInvoicesAmount,
        paidAmount,
        pendingAmount,
        budgetUsed,
        budgetRemaining,
        budgetUsagePercent,
      }
    } catch (error) {
      console.error('Ошибка получения статистики проекта:', error)
      return {
        invoicesCount: 0,
        totalInvoicesAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        budgetUsed: 0,
        budgetRemaining: 0,
        budgetUsagePercent: 0,
      }
    }
  }

  /**
   * Получить локализованное название статуса
   */
  private static getStatusLabel(status: Project['status']): string {
    const statusLabels: Record<Project['status'], string> = {
      planning: 'Планирование',
      active: 'Активный',
      completed: 'Завершен',
      on_hold: 'Приостановлен',
      cancelled: 'Отменен',
    }
    
    return statusLabels[status] || status
  }
}