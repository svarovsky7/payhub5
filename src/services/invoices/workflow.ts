/**
 * Workflow operations for invoices - submit, approve, reject
 */

import { 
  type ApiResponse, 
  handleSupabaseError, 
  type Invoice, 
  supabase, 
  type WorkflowStage
} from '../supabase'

export interface WorkflowAction {
  id: string
  invoice_id: string
  step_id: string
  user_id: string
  action: 'approve' | 'reject' | 'submit' | 'return' | 'cancel'
  comment?: string
  created_at: string
}

export interface WorkflowStageWithUsers extends WorkflowStage {
  assignee?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export class InvoiceWorkflowService {
  
  /**
   * Отправить заявку на согласование
   */
  static async submitInvoice(
    invoiceId: string,
    userId: string,
    comment?: string
  ): Promise<ApiResponse<Invoice>> {
    try {
      // Получаем заявку
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (invoiceError || !invoice) {
        throw new Error('Заявка не найдена')
      }

      // Проверяем, что заявку можно отправить
      if (invoice.status !== 'draft') {
        return {
          data: null,
          error: 'Отправить можно только черновики заявок'
        }
      }

      // Проверяем права доступа
      if (invoice.created_by !== userId) {
        return {
          data: null,
          error: 'Вы можете отправлять только свои заявки'
        }
      }

      // Находим первый шаг workflow для заявок
      const { data: firstStep, error: stepError } = await supabase
        .from('workflow_stages')
        .select(`
          *,
          workflow:workflows!workflow_id(*)
        `)
        .eq('workflows.entity_type', 'invoice')
        .eq('workflows.is_active', true)
        .eq('position', 1)
        .single()

      if (stepError || !firstStep) {
        return {
          data: null,
          error: 'Не настроен workflow для согласования заявок'
        }
      }

      // Обновляем статус заявки
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'pending',
          current_step_id: firstStep.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (updateError) {throw updateError}

      // Создаем запись о действии
      await this.createWorkflowAction({
        invoice_id: invoiceId,
        step_id: firstStep.id,
        user_id: userId,
        action: 'submit',
        comment: comment || 'Заявка отправлена на согласование',
      })

      // Создаем экземпляр workflow
      await supabase.from('workflow_instances').insert([{
        workflow_id: firstStep.workflow_id,
        entity_id: invoiceId,
        entity_type: 'invoice',
        current_step_id: firstStep.id,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        data: { submitted_by: userId },
      }])

      return { data: updatedInvoice as Invoice, error: null }
    } catch (error) {
      console.error('Ошибка отправки заявки:', error)
      return {
        data: null,
        error: handleSupabaseError(error).error
      }
    }
  }

  /**
   * Согласовать заявку
   */
  static async approveInvoice(
    invoiceId: string,
    stepId: string,
    userId: string,
    comment?: string
  ): Promise<ApiResponse<Invoice>> {
    try {
      // Проверяем права на согласование
      const canApprove = await this.canUserPerformAction(invoiceId, stepId, userId, 'approve')
      if (!canApprove.success) {
        return { data: null, error: canApprove.error }
      }

      // Получаем текущий шаг и следующий
      const { currentStep, nextStep } = await this.getStepInfo(stepId)
      if (!currentStep) {
        return { data: null, error: 'Шаг workflow не найден' }
      }

      // Определяем новый статус и следующий шаг
      let newStatus: Invoice['status'] = 'approved'
      let nextStepId: string | null = null

      if (nextStep) {
        newStatus = 'pending' // Если есть следующий шаг, остается на согласовании
        nextStepId = nextStep.id
      }

      // Обновляем заявку
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          current_step_id: nextStepId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (updateError) {throw updateError}

      // Создаем запись о действии
      await this.createWorkflowAction({
        invoice_id: invoiceId,
        step_id: stepId,
        user_id: userId,
        action: 'approve',
        comment: comment || 'Заявка согласована',
      })

      // Обновляем экземпляр workflow
      const updateData: any = {
        current_step_id: nextStepId,
        updated_at: new Date().toISOString(),
      }

      if (!nextStep) {
        updateData.status = 'completed'
        updateData.completed_at = new Date().toISOString()
      }

      await supabase
        .from('workflow_instances')
        .update(updateData)
        .eq('entity_id', invoiceId)
        .eq('entity_type', 'invoice')

      return { data: updatedInvoice as Invoice, error: null }
    } catch (error) {
      console.error('Ошибка согласования заявки:', error)
      return {
        data: null,
        error: handleSupabaseError(error).error
      }
    }
  }

  /**
   * Отклонить заявку
   */
  static async rejectInvoice(
    invoiceId: string,
    stepId: string,
    userId: string,
    comment: string
  ): Promise<ApiResponse<Invoice>> {
    try {
      // Проверяем права на отклонение
      const canReject = await this.canUserPerformAction(invoiceId, stepId, userId, 'reject')
      if (!canReject.success) {
        return { data: null, error: canReject.error }
      }

      // Обновляем заявку
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'rejected',
          current_step_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (updateError) {throw updateError}

      // Создаем запись о действии
      await this.createWorkflowAction({
        invoice_id: invoiceId,
        step_id: stepId,
        user_id: userId,
        action: 'reject',
        comment,
      })

      // Завершаем экземпляр workflow
      await supabase
        .from('workflow_instances')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('entity_id', invoiceId)
        .eq('entity_type', 'invoice')

      return { data: updatedInvoice as Invoice, error: null }
    } catch (error) {
      console.error('Ошибка отклонения заявки:', error)
      return {
        data: null,
        error: handleSupabaseError(error).error
      }
    }
  }

  /**
   * Вернуть заявку на доработку
   */
  static async returnInvoice(
    invoiceId: string,
    stepId: string,
    userId: string,
    comment: string
  ): Promise<ApiResponse<Invoice>> {
    try {
      // Проверяем права
      const canReturn = await this.canUserPerformAction(invoiceId, stepId, userId, 'return')
      if (!canReturn.success) {
        return { data: null, error: canReturn.error }
      }

      // Обновляем заявку - возвращаем в статус черновика
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'draft',
          current_step_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (updateError) {throw updateError}

      // Создаем запись о действии
      await this.createWorkflowAction({
        invoice_id: invoiceId,
        step_id: stepId,
        user_id: userId,
        action: 'return',
        comment,
      })

      // Завершаем текущий экземпляр workflow
      await supabase
        .from('workflow_instances')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('entity_id', invoiceId)
        .eq('entity_type', 'invoice')

      return { data: updatedInvoice as Invoice, error: null }
    } catch (error) {
      console.error('Ошибка возврата заявки:', error)
      return {
        data: null,
        error: handleSupabaseError(error).error
      }
    }
  }

  /**
   * Отменить заявку
   */
  static async cancelInvoice(
    invoiceId: string,
    userId: string,
    comment?: string
  ): Promise<ApiResponse<Invoice>> {
    try {
      // Получаем заявку для проверки прав
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('created_by, status')
        .eq('id', invoiceId)
        .single()

      if (invoiceError || !invoice) {
        return { data: null, error: 'Заявка не найдена' }
      }

      // Проверяем права (только автор может отменить)
      if (invoice.created_by !== userId) {
        return { data: null, error: 'Отменить можно только свою заявку' }
      }

      // Проверяем статус (нельзя отменить оплаченную заявку)
      if (invoice.status === 'paid') {
        return { data: null, error: 'Нельзя отменить оплаченную заявку' }
      }

      // Обновляем заявку
      const { data: updatedInvoice, error: updateError } = await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          current_step_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (updateError) {throw updateError}

      // Создаем запись о действии
      if (invoice.status !== 'draft') {
        await this.createWorkflowAction({
          invoice_id: invoiceId,
          step_id: '', // Отмена может происходить вне workflow
          user_id: userId,
          action: 'cancel',
          comment: comment || 'Заявка отменена автором',
        })

        // Отменяем экземпляр workflow
        await supabase
          .from('workflow_instances')
          .update({
            status: 'cancelled',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('entity_id', invoiceId)
          .eq('entity_type', 'invoice')
      }

      return { data: updatedInvoice as Invoice, error: null }
    } catch (error) {
      console.error('Ошибка отмены заявки:', error)
      return {
        data: null,
        error: handleSupabaseError(error).error
      }
    }
  }

  /**
   * Получить историю согласования заявки
   */
  static async getWorkflowHistory(invoiceId: string): Promise<WorkflowAction[]> {
    try {
      const { data, error } = await supabase
        .from('workflow_actions')
        .select(`
          *
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true })

      if (error) {throw error}

      return (data as WorkflowAction[]) || []
    } catch (error) {
      console.error('Ошибка получения истории workflow:', error)
      return []
    }
  }

  /**
   * Получить текущий шаг workflow для заявки
   */
  static async getCurrentStep(invoiceId: string): Promise<WorkflowStageWithUsers | null> {
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('current_step_id')
        .eq('id', invoiceId)
        .single()

      if (invoiceError || !invoice?.current_step_id) {return null}

      const { data: step, error: stepError } = await supabase
        .from('workflow_stages')
        .select(`
          *,
          assignee:users!assignee_id(id, first_name, last_name, email),
        `)
        .eq('id', invoice.current_step_id)
        .single()

      if (stepError) {return null}

      return step as WorkflowStageWithUsers
    } catch (error) {
      console.error('Ошибка получения текущего шага:', error)
      return null
    }
  }

  /**
   * Проверить, может ли пользователь выполнить действие
   */
  private static async canUserPerformAction(
    invoiceId: string,
    stepId: string,
    userId: string,
    action: 'approve' | 'reject' | 'return'
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Получаем информацию о шаге и заявке
      const { data: step, error: stepError } = await supabase
        .from('workflow_stages')
        .select(`
          *,
        `)
        .eq('id', stepId)
        .single()

      if (stepError || !step) {
        return { success: false, error: 'Шаг workflow не найден' }
      }

      // Проверяем права для отклонения
      if (action === 'reject' && !step.can_reject) {
        return { success: false, error: 'На этом шаге нельзя отклонять заявки' }
      }

      // Проверяем назначение
      if (step.assigned_users && step.assigned_users.length > 0) {
        // Шаг назначен конкретным пользователям
        if (!step.assigned_users.includes(userId)) {
          return { success: false, error: 'Действие может выполнить только назначенный пользователь' }
        }
      }

      return { success: true }
    } catch (error) {
      return { success: false, error: handleSupabaseError(error).error }
    }
  }

  /**
   * Получить информацию о шаге и следующем шаге
   */
  private static async getStepInfo(stepId: string) {
    const { data: currentStep, error: stepError } = await supabase
      .from('workflow_stages')
      .select('*')
      .eq('id', stepId)
      .single()

    if (stepError) {return { currentStep: null, nextStep: null }}

    const { data: nextStep } = await supabase
      .from('workflow_stages')
      .select('*')
      .eq('workflow_id', currentStep.workflow_id)
      .eq('position', currentStep.position + 1)
      .single()

    return { currentStep, nextStep }
  }

  /**
   * Создать запись о действии в workflow
   */
  private static async createWorkflowAction(action: Omit<WorkflowAction, 'id' | 'created_at'>) {
    return await supabase
      .from('workflow_actions')
      .insert([{
        ...action,
        created_at: new Date().toISOString(),
      }])
  }

  /**
   * Получить список доступных действий для пользователя по заявке
   */
  static async getAvailableActions(
    invoiceId: string,
    userId: string
  ): Promise<string[]> {
    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('status, current_step_id, created_by')
        .eq('id', invoiceId)
        .single()

      if (invoiceError || !invoice) {return []}

      const actions: string[] = []

      // Автор может отменить заявку (кроме оплаченной)
      if (invoice.created_by === userId && invoice.status !== 'paid') {
        actions.push('cancel')
      }

      // Действия в зависимости от статуса
      if (invoice.status === 'draft' && invoice.created_by === userId) {
        actions.push('submit')
      }

      if (invoice.status === 'pending' && invoice.current_step_id) {
        const currentStep = await this.getCurrentStep(invoiceId)
        if (currentStep) {
          const canApprove = await this.canUserPerformAction(invoiceId, currentStep.id, userId, 'approve')
          if (canApprove.success) {
            actions.push('approve')
            if (currentStep.can_reject) {
              actions.push('reject', 'return')
            }
          }
        }
      }

      return actions
    } catch (error) {
      console.error('Ошибка получения доступных действий:', error)
      return []
    }
  }
}