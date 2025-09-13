/**
 * CRUD operations for projects
 */

import { 
  type ApiResponse, 
  formatCurrency, 
  formatDate, 
  handleSupabaseError, 
  type Project, 
  type ProjectInsert,
  type ProjectUpdate,
  supabase
} from '../supabase'

export interface ProjectWithRelations extends Project {
  manager?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
  created_by_user: {
    id: string
    first_name: string
    last_name: string
  }
  stats: {
    invoicesCount: number
    totalInvoicesAmount: number
    paidAmount: number
    pendingAmount: number
    budgetUsed: number
    budgetRemaining: number
    budgetUsagePercent: number
  }
}

export class ProjectCrudService {
  
  /**
   * Создать новый проект
   */
  static async createProject(project: ProjectInsert): Promise<ApiResponse<Project>> {
    console.log('[ProjectCrudService] createProject called with:', project)
    
    try {
      // Подготавливаем данные для вставки - только те поля, которые есть в БД
      const projectData = {
        name: project.name,
        address: project.address || null,
        is_active: project.is_active !== false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      
      console.log('[ProjectCrudService] Inserting project:', projectData)

      const { data, error } = await supabase
        .from('projects')
        .insert([projectData])
        .select()
        .single()
        
      console.log('[ProjectCrudService] Insert result:', { data, error })

      if (error) {throw error}

      console.log('[ProjectCrudService] Project created successfully:', data)
      return { data: data as Project, error: null }
    } catch (error) {
      console.error('[ProjectCrudService] Error creating project:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Получить проект по ID с связанными данными
   */
  static async getById(id: string): Promise<ApiResponse<ProjectWithRelations>> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          manager:users!manager_id(id, first_name, last_name, email),
          created_by_user:users!created_by(id, first_name, last_name)
        `)
        .eq('id', id)
        .single()

      if (error) {throw error}

      // Получаем статистику проекта
      const stats = await this.getProjectStats(id)
      
      const projectWithRelations: ProjectWithRelations = {
        ...data,
        stats,
      }

      return { data: projectWithRelations, error: null }
    } catch (error) {
      console.error('Ошибка получения проекта:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Обновить проект
   */
  static async updateProject(
    id: string, 
    updates: ProjectUpdate
  ): Promise<ApiResponse<Project>> {
    console.log('[ProjectCrudService] updateProject called with id:', id, 'updates:', updates)
    
    try {
      // Проверяем уникальность кода если он изменился (без company_id)
      if (updates.code) {
        const { data: currentProject } = await supabase
          .from('projects')
          .select('code')
          .eq('id', id)
          .single()

        if (currentProject && updates.code !== currentProject.code) {
          const { data: existingProject } = await supabase
            .from('projects')
            .select('id')
            .eq('code', updates.code)
            .neq('id', id)
            .single()

          if (existingProject) {
            return {
              data: null,
              error: 'Проект с таким кодом уже существует'
            }
          }
        }
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return { data: data as Project, error: null }
    } catch (error) {
      console.error('Ошибка обновления проекта:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Удалить проект (только если нет связанных заявок)
   */
  static async deleteProject(id: string): Promise<ApiResponse<null>> {
    console.log('[ProjectCrudService] deleteProject called with id:', id)
    
    try {
      console.log('[ProjectCrudService] Checking for related invoices...')
      // Проверяем наличие связанных заявок
      const { data: invoices, error: invoicesError } = await supabase
        .from('invoices')
        .select('id')
        .eq('project_id', id)
        .limit(1)

      console.log('[ProjectCrudService] Invoices check result:', { invoices, invoicesError })

      if (invoicesError) {
        console.error('[ProjectCrudService] Error checking invoices:', invoicesError)
        throw invoicesError
      }

      if (invoices && invoices.length > 0) {
        console.log('[ProjectCrudService] Cannot delete - project has invoices:', invoices.length)
        return {
          data: null,
          error: `Нельзя удалить проект, так как по нему есть ${invoices.length} заявок. Сначала удалите или переместите все заявки.`
        }
      }

      console.log('[ProjectCrudService] No related invoices found, proceeding with deletion...')
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id)

      console.log('[ProjectCrudService] Delete query result:', { error })
      
      if (error) {
        console.error('[ProjectCrudService] Error deleting project:', error)
        throw error
      }

      console.log('[ProjectCrudService] Project deleted successfully')
      return { data: null, error: null }
    } catch (error) {
      console.error('Ошибка удаления проекта:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Изменить статус проекта
   */
  static async changeStatus(
    id: string, 
    status: Project['status'], 
    reason?: string
  ): Promise<ApiResponse<Project>> {
    try {
      const updateData: ProjectUpdate = {
        status,
        notes: reason ? `Статус изменен: ${reason}` : undefined,
        updated_at: new Date().toISOString(),
      }

      // Если проект завершается, устанавливаем дату окончания
      if (status === 'completed') {
        updateData.end_date = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return { data: data as Project, error: null }
    } catch (error) {
      console.error('Ошибка изменения статуса проекта:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Обновить бюджет проекта
   */
  static async updateBudget(
    id: string, 
    budget: number, 
    reason?: string
  ): Promise<ApiResponse<Project>> {
    try {
      if (budget < 0) {
        return {
          data: null,
          error: 'Бюджет не может быть отрицательным'
        }
      }

      // Получаем текущую потраченную сумму
      const { data: currentProject } = await supabase
        .from('projects')
        .select('spent_amount')
        .eq('id', id)
        .single()

      if (currentProject && budget < currentProject.spent_amount) {
        return {
          data: null,
          error: 'Бюджет не может быть меньше уже потраченной суммы'
        }
      }

      const updateData: ProjectUpdate = {
        budget,
        notes: reason ? `Бюджет обновлен: ${reason}` : undefined,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return { data: data as Project, error: null }
    } catch (error) {
      console.error('Ошибка обновления бюджета проекта:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Назначить менеджера проекта
   */
  static async assignManager(
    id: string, 
    managerId: string
  ): Promise<ApiResponse<Project>> {
    try {
      const updateData: ProjectUpdate = {
        manager_id: managerId,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return { data: data as Project, error: null }
    } catch (error) {
      console.error('Ошибка назначения менеджера проекта:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Обновить потраченную сумму проекта (вызывается при создании/обновлении заявок)
   */
  static async updateSpentAmount(projectId: string): Promise<void> {
    try {
      // Получаем сумму всех оплаченных заявок по проекту
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('amount')
        .eq('project_id', projectId)
        .eq('status', 'paid')

      if (error) {throw error}

      const spentAmount = invoices?.reduce((sum, invoice) => sum + invoice.amount, 0) || 0

      await supabase
        .from('projects')
        .update({
          spent_amount: spentAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)
    } catch (error) {
      console.error('Ошибка обновления потраченной суммы проекта:', error)
      // Не выбрасываем ошибку, чтобы не прерывать основной процесс
    }
  }

  /**
   * Проверить доступность бюджета проекта
   */
  static async checkBudgetAvailability(
    projectId: string, 
    amount: number
  ): Promise<{
    isAvailable: boolean
    remaining: number
    reason?: string
  }> {
    try {
      const result = await this.getById(projectId)
      if (result.error || !result.data) {
        return { 
          isAvailable: false, 
          remaining: 0, 
          reason: 'Проект не найден' 
        }
      }

      const project = result.data
      const remaining = project.budget - project.spent_amount

      if (amount > remaining) {
        return {
          isAvailable: false,
          remaining,
          reason: `Недостаточно средств в бюджете. Доступно: ${formatCurrency(remaining, project.currency)}`
        }
      }

      return { isAvailable: true, remaining }
    } catch (error) {
      console.error('Ошибка проверки доступности бюджета:', error)
      return { 
        isAvailable: false, 
        remaining: 0, 
        reason: 'Ошибка проверки бюджета' 
      }
    }
  }

  /**
   * Получить статистику по проекту
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
   * Форматированные данные проекта для отображения
   */
  static formatProjectForDisplay(project: ProjectWithRelations) {
    return {
      ...project,
      formattedBudget: formatCurrency(project.budget, project.currency),
      formattedSpentAmount: formatCurrency(project.spent_amount, project.currency),
      formattedBudgetRemaining: formatCurrency(project.stats.budgetRemaining, project.currency),
      formattedTotalInvoices: formatCurrency(project.stats.totalInvoicesAmount, project.currency),
      formattedPaidAmount: formatCurrency(project.stats.paidAmount, project.currency),
      formattedPendingAmount: formatCurrency(project.stats.pendingAmount, project.currency),
      formattedCreatedDate: formatDate(project.created_at),
      formattedStartDate: project.start_date ? formatDate(project.start_date) : null,
      formattedEndDate: project.end_date ? formatDate(project.end_date) : null,
      managerName: project.manager 
        ? `${project.manager.first_name} ${project.manager.last_name}`
        : null,
      createdByName: `${project.created_by_user.first_name} ${project.created_by_user.last_name}`,
      statusLabel: this.getStatusLabel(project.status),
      budgetUsagePercent: Math.round(project.stats.budgetUsagePercent),
      budgetStatus: this.getBudgetStatus(project.stats.budgetUsagePercent),
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

  /**
   * Получить статус использования бюджета
   */
  private static getBudgetStatus(usagePercent: number): string {
    if (usagePercent >= 100) {return 'exceeded'}
    if (usagePercent >= 90) {return 'critical'}
    if (usagePercent >= 70) {return 'warning'}
    return 'normal'
  }
}