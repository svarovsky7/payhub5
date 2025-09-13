/**
 * Payment workflow service - управление процессами согласования платежей
 */

import {supabase} from '../supabase'

interface PaymentWorkflowInstance {
    id: number
    payment_id: number
    workflow_id: number
    current_stage_id: number
    status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled'
    started_at: string
    completed_at?: string
    created_by: string
}


export class PaymentWorkflowService {
    /**
     * Получить подходящий workflow для платежа по типу счета
     */
    static async getWorkflowForPayment(invoiceTypeId: number, companyId: string) {
        try {
            console.log('[PaymentWorkflowService] Getting workflow for invoice type:', invoiceTypeId)

            // Ищем активные workflow, которые применяются к данному типу счета
            const {data, error} = await supabase
                .from('workflows')
                .select(`
          *,
          stages:workflow_stages(*)
        `)
                .eq('company_id', companyId)
                .eq('is_active', true)
                .contains('invoice_type_ids', [invoiceTypeId])
                .order('created_at', {ascending: false})

            if (error) {
                console.error('[PaymentWorkflowService] Error getting workflow:', error)
                throw error
            }

            // Берем первый подходящий workflow
            if (data && data.length > 0) {
                const workflow = data[0]
                // Сортируем этапы по позиции
                workflow.stages = (workflow.stages ?? []).sort((a: any, b: any) => a.position - b.position)
                console.log('[PaymentWorkflowService] Found workflow:', workflow.id, workflow.name)
                return workflow
            }

            console.log('[PaymentWorkflowService] No workflow found for invoice type:', invoiceTypeId)
            return null
        } catch (_error: any) {
            console.error('[PaymentWorkflowService] Error in getWorkflowForPayment:', _error)
            throw _error
        }
    }

    /**
     * Получить все доступные workflow для компании
     */
    static async getAvailableWorkflows(companyId: string, invoiceTypeId?: number) {
        try {
            console.log('[PaymentWorkflowService] Getting available workflows:', {companyId, invoiceTypeId})

            let query = supabase
                .from('workflows')
                .select(`
          *,
          stages:workflow_stages(*)
        `)
                .eq('is_active', true)
                .order('name')

            // Если указан тип счета, фильтруем по нему
            if (invoiceTypeId) {
                query = query.contains('invoice_type_ids', [invoiceTypeId])
            }

            const {data, error} = await query

            if (error) {
                console.error('[PaymentWorkflowService] Error getting workflows:', error)
                throw error
            }

            // Сортируем этапы в каждом workflow и добавляем is_final флаг
            const workflowsWithSortedStages = (data ?? []).map(workflow => ({
                ...workflow,
                stages: (workflow.stages ?? [])
                    .sort((a: any, b: any) => a.position - b.position)
                    .map((stage: any) => ({
                        ...stage,
                        is_final: stage.stage_type === 'final'
                    }))
            }))

            console.log('[PaymentWorkflowService] Found workflows:', workflowsWithSortedStages.length)
            return workflowsWithSortedStages
        } catch (_error: any) {
            console.error('[PaymentWorkflowService] Error in getAvailableWorkflows:', _error)
            throw _error
        }
    }

    /**
     * Создать экземпляр процесса согласования для платежа
     */
    static async startPaymentWorkflow(paymentId: number, workflowId: number, userId: string) {
        try {
            console.log('[PaymentWorkflowService] Starting payment workflow:', {paymentId, workflowId, userId})

            // Получаем информацию о платеже
            const {data: payment, error: paymentFetchError} = await supabase
                .from('payments')
                .select('amount, invoice_id')
                .eq('id', paymentId)
                .single()

            if (paymentFetchError ?? !payment) {
                throw new Error('Payment not found')
            }

            // Получаем workflow с этапами
            const {data: workflow, error: workflowError} = await supabase
                .from('workflows')
                .select(`
          *,
          stages:workflow_stages(*)
        `)
                .eq('id', workflowId)
                .single()

            if (workflowError ?? !workflow) {
                throw new Error('Workflow not found')
            }

            // Получаем первый этап
            const firstStage = workflow.stages
                ?.sort((a: any, b: any) => a.position - b.position)[0]

            if (!firstStage) {
                throw new Error('Workflow has no stages')
            }

            // Создаем экземпляр процесса
            const {data: instance, error: instanceError} = await supabase
                .from('payment_workflows')
                .insert({
                    payment_id: paymentId.toString(),
                    invoice_id: payment.invoice_id?.toString(),
                    workflow_id: workflowId,
                    current_stage_id: firstStage.id,
                    current_stage_position: 1,
                    status: 'in_progress',
                    stages_total: workflow.stages?.length || 0,
                    stages_completed: 0,
                    started_at: new Date().toISOString(),
                    started_by: userId,
                    amount: payment.amount || 0,
                    approval_progress: []
                })
                .select()
                .single()

            if (instanceError) {
                console.error('[PaymentWorkflowService] Error creating workflow instance:', instanceError)
                throw instanceError
            }

            // Обновляем статус платежа
            const {error: paymentError} = await supabase
                .from('payments')
                .update({
                    status: 'processing',
                    workflow_status: 'in_approval'
                })
                .eq('id', paymentId)

            if (paymentError) {
                console.error('[PaymentWorkflowService] Error updating payment status:', paymentError)
            }

            console.log('[PaymentWorkflowService] Workflow started:', instance)
            return instance
        } catch (_error: any) {
            console.error('[PaymentWorkflowService] Error in startPaymentWorkflow:', _error)
            throw _error
        }
    }

    /**
     * Получить текущий статус процесса согласования платежа
     */
    static async getPaymentWorkflowStatus(paymentId: number) {
        try {
            const {data, error} = await supabase
                .from('payment_workflows')
                .select(`
          *,
          workflow:workflows(*),
          current_stage:workflow_stages(*),
        `)
                .eq('payment_id', paymentId)
                .single()

            if (error) {
                if (error.code === 'PGRST116') {
                    // Нет процесса для этого платежа
                    return null
                }
                throw error
            }

            return data
        } catch (_error: any) {
            console.error('[PaymentWorkflowService] Error in getPaymentWorkflowStatus:', _error)
            throw _error
        }
    }

    /**
     * Одобрить или отклонить этап согласования
     */
    static async processApproval(workflowInstanceId: number, stageId: number, userId: string, action: 'approve' | 'reject', comment?: string) {
        try {
            console.log('[PaymentWorkflowService] Processing approval:', {
                workflowInstanceId,
                stageId,
                userId,
                action
            })

            // Получаем информацию о процессе
            const {data: instance, error: instanceError} = await supabase
                .from('payment_workflows')
                .select(`
          *,
          workflow:workflows(
            *,
            stages:workflow_stages(*)
          ),
          current_stage:workflow_stagescurrent_stage_id(*)
        `)
                .eq('id', workflowInstanceId)
                .single()

            if (instanceError ?? !instance) {
                throw new Error('Workflow instance not found')
            }

            // Обновляем approval_progress
            const approvalProgress = instance.approval_progress ?? []
            approvalProgress.push({
                stage_id: stageId,
                stage_name: instance.current_stage?.name || 'Unknown',
                user_id: userId,
                action,
                comment,
                created_at: new Date().toISOString()
            })

            // Если отклонено - завершаем процесс
            if (action === 'reject') {
                await supabase
                    .from('payment_workflows')
                    .update({
                        status: 'rejected',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', workflowInstanceId)

                // Обновляем статус платежа
                await supabase
                    .from('payments')
                    .update({
                        status: 'failed',
                        workflow_status: 'rejected'
                    })
                    .eq('id', instance.payment_id)

                // Обновляем approval_progress
                await supabase
                    .from('payment_workflows')
                    .update({
                        approval_progress: approvalProgress
                    })
                    .eq('id', workflowInstanceId)

                return {nextStage: null, completed: true, rejected: true}
            }

            // Если одобрено - проверяем, есть ли следующий этап
            const stages = instance.workflow.stages ?? []
            const sortedStages = stages.sort((a: any, b: any) => a.position - b.position)
            const currentStageIndex = sortedStages.findIndex((s: any) => s.id === stageId)

            if (currentStageIndex < sortedStages.length - 1) {
                // Есть следующий этап
                const nextStage = sortedStages[currentStageIndex + 1]

                await supabase
                    .from('payment_workflows')
                    .update({
                        current_stage_id: nextStage.id
                    })
                    .eq('id', workflowInstanceId)

                // Обновляем approval_progress
                await supabase
                    .from('payment_workflows')
                    .update({
                        approval_progress: approvalProgress
                    })
                    .eq('id', workflowInstanceId)

                return {nextStage, completed: false}
            } else {
                // Это был последний этап - процесс завершен
                await supabase
                    .from('payment_workflows')
                    .update({
                        status: 'approved',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', workflowInstanceId)

                // Обновляем статус платежа
                await supabase
                    .from('payments')
                    .update({
                        status: 'completed',
                        workflow_status: 'approved',
                        approved_at: new Date().toISOString()
                    })
                    .eq('id', instance.payment_id)

                // Обновляем approval_progress
                await supabase
                    .from('payment_workflows')
                    .update({
                        approval_progress: approvalProgress
                    })
                    .eq('id', workflowInstanceId)

                return {nextStage: null, completed: true, approved: true}
            }
        } catch (_error: any) {
            console.error('[PaymentWorkflowService] Error in processApproval:', _error)
            throw _error
        }
    }

    /**
     * Отменить процесс согласования
     */
    static async cancelWorkflow(workflowInstanceId: number, userId: string, reason?: string) {
        try {
            console.log('[PaymentWorkflowService] Cancelling workflow:', workflowInstanceId)

            // Получаем информацию о процессе
            const {data: instance, error: instanceError} = await supabase
                .from('payment_workflows')
                .select('*')
                .eq('id', workflowInstanceId)
                .single()

            if (instanceError ?? !instance) {
                throw new Error('Workflow instance not found')
            }

            // Обновляем статус процесса
            const {error: updateError} = await supabase
                .from('payment_workflows')
                .update({
                    status: 'cancelled',
                    completed_at: new Date().toISOString()
                })
                .eq('id', workflowInstanceId)

            if (updateError) {
                throw updateError
            }

            // Сохраняем информацию об отмене в approval_progress

            // Обновляем статус платежа
            await supabase
                .from('payments')
                .update({
                    status: 'cancelled',
                    workflow_status: 'cancelled'
                })
                .eq('id', instance.payment_id)

            console.log('[PaymentWorkflowService] Workflow cancelled')
            return true
        } catch (_error: any) {
            console.error('[PaymentWorkflowService] Error in cancelWorkflow:', _error)
            throw _error
        }
    }
}