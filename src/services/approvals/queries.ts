/**
 * Query operations for payment approvals
 */

import {
    handleSupabaseError,
    type PaginatedResponse,
    type PaginationParams,
    supabase
} from '../supabase'
import type {PaymentWithRelations} from '../payments/crud'

export interface ApprovalItem {
    id: number
    payment_workflow_id: number
    payment_id: number
    payment_number?: string
    invoice_id?: number
    amount: number
    payment_date: string
    current_stage_id: number
    current_stage_position: number
    stages_total: number
    stages_completed: number
    workflow_status: string
    started_at: string
    started_by: string
    started_by_user?: {
        full_name?: string
        email?: string
    }
    approval_progress?: Array<{
        stage_id: number
        stage_name: string
        approved_by?: string
        approved_at?: string
        rejected_by?: string
        rejected_at?: string
        comment?: string
        reason?: string
        action: 'approved' | 'rejected'
        approver?: {
            full_name?: string
            email?: string
        }
    }>
    payment?: PaymentWithRelations
    invoice?: {
        id: number
        invoice_number: string
        internal_number?: string
        invoice_date?: string
        description?: string
        supplier?: {
            id: number
            name: string
            inn?: string
        }
        payer?: {
            id: number
            name: string
            inn?: string
        }
        project?: {
            id: number
            name: string
        }
        invoice_type?: {
            id: number
            name: string
        }
    }
    workflow?: {
        id: number
        name: string
        description?: string
    }
    current_stage?: {
        id: number
        name: string
        position: number
        // permissions field removed from database
    }
}

export class ApprovalQueryService {

    /**
     * Получить список платежей, ожидающих согласования от текущего пользователя
     */
    static async getMyApprovals(
        userId: string,
        pagination: PaginationParams = {},
        testRole?: string,
        userProfile?: { roles?: any; project_ids?: any[] }
    ): Promise<PaginatedResponse<ApprovalItem>> {
        try {
            console.log('[ApprovalQueryService.getMyApprovals] Загрузка платежей на согласовании для пользователя:', userId)

            const {page = 1, limit = 20, sortBy = 'started_at', sortOrder = 'desc'} = pagination
            const from = (page - 1) * limit
            const to = from + limit - 1

            // Получаем полную информацию о пользователе и его роли
            let userRole = testRole || 'user'
            let viewOwnProjectOnly = false
            let userProjectIds = userProfile?.project_ids ?? []

            // Получаем полную информацию о роли пользователя из базы данных
            const {data: userData} = await supabase
                .from('users')
                .select('role_id, project_ids, roles!inner(code, view_own_project_only)')
                .eq('id', userId)
                .single()

            if (userData) {
                // Используем тестовую роль если она передана, иначе берем из БД
                if (!testRole) {
                    userRole = userData.roles?.code || 'user'
                }
                viewOwnProjectOnly = userData.roles?.view_own_project_only ?? false
                userProjectIds = userData.project_ids ?? []

                // Если передана тестовая роль, получаем её настройки
                if (testRole && testRole !== userData.roles?.code) {
                    const {data: testRoleData} = await supabase
                        .from('roles')
                        .select('view_own_project_only')
                        .eq('code', testRole)
                        .single()

                    if (testRoleData) {
                        viewOwnProjectOnly = testRoleData.view_own_project_only ?? false
                    }
                }
            }

            console.log('[ApprovalQueryService.getMyApprovals] Параметры фильтрации:', {
                userId,
                userRole,
                viewOwnProjectOnly,
                userProjectIds: userProjectIds?.length ? userProjectIds : 'нет проектов',
                testRole: !!testRole
            })

            // Критическая проверка: если у пользователя включено ограничение, но нет проектов - возвращаем пустой результат
            if (viewOwnProjectOnly && (!userProjectIds || userProjectIds.length === 0)) {
                console.warn('[ApprovalQueryService.getMyApprovals] У пользователя включено ограничение по проектам, но нет назначенных проектов - возвращаем пустой результат')
                return {
                    data: [],
                    error: null,
                    count: 0,
                    page,
                    limit,
                    totalPages: 0,
                    hasNextPage: false,
                    hasPrevPage: false,
                }
            }

            // Сначала получаем workflow instances где текущий пользователь является approver на текущем этапе
            let query = supabase
                .from('payment_workflows')
                .select(`
          id,
          payment_id,
          invoice_id,
          workflow_id,
          current_stage_id,
          current_stage_position,
          stages_total,
          stages_completed,
          status,
          amount,
          started_at,
          started_by,
          created_at,
          workflow:workflows!workflow_id(
            id,
            name,
            description
          ),
          current_stage:workflow_stages!current_stage_id(
            id,
            name,
            position
          )
        `, {count: 'exact'})
                .eq('status', 'in_progress')

            // Сортировка и пагинация
            query = query
                .order(sortBy, {ascending: sortOrder === 'asc'})
                .range(from, to)

            const {data: workflows, error, count} = await query

            if (error) {
                console.error('[ApprovalQueryService.getMyApprovals] Ошибка загрузки workflows:', error)
                throw error
            }

            console.log('[ApprovalQueryService.getMyApprovals] Загружено workflows до фильтрации:', {
                count: workflows?.length || 0,
                workflows: workflows?.map(w => ({
                    id: w.id,
                    payment_id: w.payment_id,
                    status: w.status,
                    current_stage_id: w.current_stage_id,
                    current_stage: w.current_stage
                }))
            })

            // Фильтруем workflows, где текущий пользователь является approver
            const filteredWorkflows = workflows?.filter((workflow, index) => {
                console.log(`[ApprovalQueryService.getMyApprovals] Проверка workflow ${index + 1}:`, {
                    workflowId: workflow.id,
                    paymentId: workflow.payment_id,
                    invoiceId: workflow.invoice_id,
                    status: workflow.status,
                    currentStage: workflow.current_stage,
                    hasCurrentStage: !!workflow.current_stage
                })

                if (!workflow.current_stage) {
                    console.log(`[ApprovalQueryService.getMyApprovals] Workflow ${workflow.id} пропущен - нет current_stage`)
                    return false
                }

                // Проверяем, является ли пользователь approver на текущем этапе
                // NOTE: assigned_users и assigned_roles не существуют в таблице workflow_stages
                // Эта логика временно отключена до добавления этих полей в БД
                const assignedUsers: string[] = []
                const assignedRoles: string[] = []

                console.log(`[ApprovalQueryService.getMyApprovals] Детали согласования для workflow ${workflow.id}:`, {
                    stageName: workflow.current_stage.name,
                    currentUserId: userId,
                    currentUserRole: userRole,
                    // NOTE: assigned_users и assigned_roles временно отключены
                    assignedFieldsDisabled: true
                })

                // TODO: Восстановить проверку после добавления assigned_users и assigned_roles в БД
                // Временно возвращаем true для всех workflows в статусе in_progress
                console.log(`[ApprovalQueryService.getMyApprovals] Workflow ${workflow.id} включен - временная логика без проверки назначений`)
                return true

                // Эта строка больше не достижима с временной логикой
                // console.log(`[ApprovalQueryService.getMyApprovals] Workflow ${workflow.id} исключен - пользователь не является согласующим`)
                // return false
            }) || []

            console.log('[ApprovalQueryService.getMyApprovals] Отфильтровано workflows для пользователя:', {
                userId,
                totalWorkflows: workflows?.length || 0,
                filteredCount: filteredWorkflows.length
            })

            // Теперь загружаем информацию о платежах и счетах
            const approvalItems: ApprovalItem[] = []

            if (filteredWorkflows && filteredWorkflows.length > 0) {
                // Получаем уникальные payment_ids и invoice_ids
                const paymentIds = [...new Set(filteredWorkflows.map(w => w.payment_id).filter(Boolean))]
                const invoiceIds = [...new Set(filteredWorkflows.map(w => w.invoice_id).filter(Boolean))]

                // Загружаем платежи
                let paymentsMap: Record<string, any> = {}
                if (paymentIds.length > 0) {
                    const {data: payments} = await supabase
                        .from('payments')
                        .select(`
              *,
              payer:contractors!payer_id(id, name, inn)
            `)
                        .in('id', paymentIds)

                    if (payments) {
                        paymentsMap = payments.reduce((acc, payment) => {
                            acc[payment.id] = payment
                            return acc
                        }, {} as Record<string, any>)
                    }
                }

                // Загружаем счета БЕЗ фильтрации - фильтрацию сделаем позже при формировании результата
                let invoicesMap: Record<string, any> = {}
                if (invoiceIds.length > 0) {
                    const {data: invoices} = await supabase
                        .from('invoices')
                        .select(`
              *,
              supplier:contractors!supplier_id(id, name, inn),
              payer:contractors!payer_id(id, name, inn),
              project:projects!project_id(id, name),
              invoice_type:invoice_types!type_id(id, name)
            `)
                        .in('id', invoiceIds)

                    if (invoices) {
                        invoicesMap = invoices.reduce((acc, invoice) => {
                            acc[invoice.id] = invoice
                            return acc
                        }, {} as Record<string, any>)

                        // Логируем информацию о проектах счетов для отладки
                        if (viewOwnProjectOnly) {
                            console.log('[ApprovalQueryService.getMyApprovals] Проекты загруженных счетов:',
                                invoices.map(inv => ({
                                    invoice_id: inv.id,
                                    project_id: inv.project_id,
                                    project_name: inv.project?.name
                                }))
                            )
                        }
                    }

                    console.log('[ApprovalQueryService.getMyApprovals] Загружено счетов:', Object.keys(invoicesMap).length, 'из', invoiceIds.length)
                }

                // Получаем уникальные user_ids для загрузки информации о пользователях
                const userIds = [...new Set(filteredWorkflows.map(w => w.started_by).filter(Boolean))]

                // Также собираем user_ids из approval_progress
                filteredWorkflows.forEach(workflow => {
                    if (workflow.approval_progress && Array.isArray(workflow.approval_progress)) {
                        workflow.approval_progress.forEach((progress: any) => {
                            if (progress.approved_by) {
                                userIds.push(progress.approved_by)
                            }
                            if (progress.rejected_by) {
                                userIds.push(progress.rejected_by)
                            }
                        })
                    }
                })

                // Убираем дубликаты
                const uniqueUserIds = [...new Set(userIds)]

                // Загружаем пользователей
                let usersMap: Record<string, any> = {}
                if (uniqueUserIds.length > 0) {
                    const {data: users} = await supabase
                        .from('users')
                        .select('id, full_name, email')
                        .in('id', uniqueUserIds)

                    if (users) {
                        usersMap = users.reduce((acc, user) => {
                            acc[user.id] = user
                            return acc
                        }, {} as Record<string, any>)
                    }
                }

                // Собираем полные данные
                for (const workflow of filteredWorkflows) {
                    const payment = workflow.payment_id ? paymentsMap[workflow.payment_id] : null
                    const invoice = workflow.invoice_id ? invoicesMap[workflow.invoice_id] : null
                    const startedByUser = workflow.started_by ? usersMap[workflow.started_by] : null

                    // КРИТИЧНО: Если у пользователя есть ограничение по проектам, проверяем соответствие
                    if (viewOwnProjectOnly && userProjectIds && userProjectIds.length > 0) {
                        // Если workflow связан со счетом (invoice_id существует)
                        if (workflow.invoice_id) {
                            // Преобразуем project_ids пользователя в массив чисел для корректного сравнения
                            const projectIds = Array.isArray(userProjectIds)
                                ? userProjectIds.map(id => typeof id === 'string' ? parseInt(id) : id)
                                : []

                            // Проверяем наличие счета и его проект
                            if (!invoice) {
                                // Счет не найден (возможно удален) - пропускаем
                                console.log(`[ApprovalQueryService.getMyApprovals] Workflow ${workflow.id} пропущен - счет #${workflow.invoice_id} не найден`)
                                continue
                            }

                            // Проверяем project_id счета
                            if (!invoice.project_id) {
                                // У счета нет проекта - пропускаем при ограничении
                                console.log(`[ApprovalQueryService.getMyApprovals] Workflow ${workflow.id} пропущен - у счета #${workflow.invoice_id} нет проекта, а у пользователя есть ограничение по проектам`)
                                continue
                            }

                            // Проверяем, входит ли проект счета в список проектов пользователя
                            if (!projectIds.includes(invoice.project_id)) {
                                console.log(`[ApprovalQueryService.getMyApprovals] Workflow ${workflow.id} пропущен - проект счета #${invoice.project_id} не входит в проекты пользователя:`, projectIds)
                                continue
                            }

                            // Счет прошел все проверки - можно добавлять
                            console.log(`[ApprovalQueryService.getMyApprovals] Workflow ${workflow.id} включен - проект счета #${invoice.project_id} входит в проекты пользователя`)
                        } else {
                            // Workflow не связан со счетом (возможно это прямой платеж) - включаем
                            console.log(`[ApprovalQueryService.getMyApprovals] Workflow ${workflow.id} включен - нет связи со счетом (прямой платеж)`)
                        }
                    }

                    // Обрабатываем approval_progress, добавляя информацию о пользователях
                    let approvalProgress = workflow.approval_progress
                    if (approvalProgress && Array.isArray(approvalProgress)) {
                        approvalProgress = approvalProgress.map((progress: any) => ({
                            ...progress,
                            approver: progress.approved_by ? usersMap[progress.approved_by] :
                                progress.rejected_by ? usersMap[progress.rejected_by] : null
                        }))
                    }

                    approvalItems.push({
                        id: workflow.id,
                        payment_workflow_id: workflow.id,
                        payment_id: workflow.payment_id,
                        payment_number: payment?.payment_number,
                        invoice_id: workflow.invoice_id,
                        amount: (workflow.amount ?? payment?.amount) || 0,
                        payment_date: payment?.payment_date ?? new Date().toISOString(),
                        current_stage_id: workflow.current_stage_id,
                        current_stage_position: workflow.current_stage_position,
                        stages_total: workflow.stages_total,
                        stages_completed: workflow.stages_completed,
                        workflow_status: workflow.status,
                        started_at: workflow.started_at,
                        started_by: workflow.started_by,
                        started_by_user: startedByUser,
                        approval_progress: approvalProgress,
                        payment,
                        invoice,
                        workflow: workflow.workflow,
                        current_stage: workflow.current_stage
                    })
                }
            }

            const filteredCount = filteredWorkflows.length
            const totalPages = Math.ceil(filteredCount / limit)

            console.log('[ApprovalQueryService.getMyApprovals] Загружено платежей на согласовании:', approvalItems.length)

            return {
                data: approvalItems,
                error: null,
                count: filteredCount,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        } catch (error) {
            console.error('[ApprovalQueryService.getMyApprovals] Ошибка получения списка согласований:', error)
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
     * Одобрить платеж
     */
    static async approvePayment(
        workflowId: number,
        userId: string,
        comment?: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Убедимся, что workflowId - это число
            const numericWorkflowId = typeof workflowId === 'string' ? parseInt(workflowId, 10) : workflowId

            console.log('[ApprovalQueryService.approvePayment] Одобрение платежа:', {
                workflowId: numericWorkflowId,
                originalWorkflowId: workflowId,
                workflowIdType: typeof numericWorkflowId,
                userId
            })

            // Получаем текущий workflow instance
            const {data: workflow, error: fetchError} = await supabase
                .from('payment_workflows')
                .select(`
          *,
          current_stage:workflow_stages!current_stage_id(
            id,
            name,
            position
          ),
          workflow:workflows!workflow_id(
            stages:workflow_stages(*)
          )
        `)
                .eq('id', numericWorkflowId)
                .single()

            if (fetchError ?? !workflow) {
                console.error('[ApprovalQueryService.approvePayment] Ошибка загрузки workflow:', fetchError)
                return {success: false, error: 'Процесс согласования не найден'}
            }

            console.log('[ApprovalQueryService.approvePayment] Загруженный workflow:', {
                id: workflow.id,
                current_stage_id: workflow.current_stage_id,
                current_stage: workflow.current_stage,
                workflow_stages: workflow.workflow?.stages,
                stages_completed: workflow.stages_completed,
                stages_total: workflow.stages_total
            })

            // Записываем прогресс в отдельную таблицу
            const stageName = workflow.current_stage?.name ?? `Stage ${workflow.current_stage_id}`

            const { error: progressError } = await supabase
                .from('workflow_approval_progress')
                .insert({
                    workflow_id: numericWorkflowId,
                    stage_id: workflow.current_stage_id,
                    stage_name: stageName,
                    action: 'approved',
                    user_id: userId,
                    comment: comment ?? null
                })

            if (progressError) {
                console.error('[ApprovalQueryService.approvePayment] Ошибка записи прогресса:', progressError)
            }

            // Определяем следующий этап
            const allStages = workflow.workflow?.stages ?? []

            if (allStages.length === 0) {
                console.error('[ApprovalQueryService.approvePayment] Не найдены этапы workflow')
                return {success: false, error: 'Не найдены этапы процесса согласования'}
            }

            allStages.sort((a: any, b: any) => a.position - b.position)

            const currentStageIndex = allStages.findIndex((s: any) => s.id === workflow.current_stage_id)
            const nextStage = allStages[currentStageIndex + 1]

            // Формируем данные для обновления
            const updateData: any = {
                stages_completed: workflow.stages_completed + 1,
                updated_at: new Date().toISOString()
            }

            if (nextStage) {
                // Есть следующий этап
                updateData.current_stage_id = nextStage.id
                updateData.current_stage_position = nextStage.position
            } else {
                // Это был последний этап - завершаем процесс
                updateData.status = 'approved' // Используем 'approved' вместо 'completed'
                updateData.completed_at = new Date().toISOString()
                updateData.completed_by = userId

                // Обновляем статус платежа
                // payment_id может быть строкой или числом, преобразуем в число
                const paymentId = typeof workflow.payment_id === 'string'
                    ? parseInt(workflow.payment_id, 10)
                    : workflow.payment_id

                console.log('[ApprovalQueryService.approvePayment] Обновление статуса платежа:', {
                    paymentId,
                    newStatus: 'completed',
                    userId,
                    timestamp: new Date().toISOString()
                })

                const {error: paymentUpdateError} = await supabase
                    .from('payments')
                    .update({
                        status: 'completed', // Используем 'completed' для платежа (допустимый статус в таблице payments)
                        approved_by: userId,
                        approved_at: new Date().toISOString()
                    })
                    .eq('id', paymentId)

                if (paymentUpdateError) {
                    console.error('[ApprovalQueryService.approvePayment] Ошибка обновления платежа:', paymentUpdateError)
                    return {success: false, error: 'Ошибка обновления статуса платежа'}
                }

                console.log('[ApprovalQueryService.approvePayment] Платеж успешно обновлен')
            }

            // Логируем данные для отладки
            console.log('[ApprovalQueryService.approvePayment] Обновляем workflow с данными:', {
                workflowId: numericWorkflowId,
                updateData,
                hasNextStage: !!nextStage,
                currentStageIndex,
                totalStages: allStages.length
            })

            // Обновляем workflow instance
            const {data: updatedWorkflow, error: updateError} = await supabase
                .from('payment_workflows')
                .update(updateData)
                .eq('id', numericWorkflowId)
                .select()
                .single()

            if (updateError) {
                console.error('[ApprovalQueryService.approvePayment] Ошибка обновления workflow:', {
                    error: updateError,
                    updateData,
                    workflowId: numericWorkflowId,
                    errorMessage: updateError.message,
                    errorDetails: updateError.details,
                    errorHint: updateError.hint
                })
                return {
                    success: false,
                    error: `Ошибка обновления процесса согласования: ${updateError.message || 'Неизвестная ошибка'}`
                }
            }

            console.log('[ApprovalQueryService.approvePayment] Платеж одобрен успешно')
            return {success: true}
        } catch (error) {
            console.error('[ApprovalQueryService.approvePayment] Ошибка одобрения платежа:', error)
            return {success: false, error: handleSupabaseError(error)}
        }
    }

    /**
     * Отклонить платеж
     */
    static async rejectPayment(
        workflowId: number,
        userId: string,
        reason: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Убедимся, что workflowId - это число
            const numericWorkflowId = typeof workflowId === 'string' ? parseInt(workflowId, 10) : workflowId

            console.log('[ApprovalQueryService.rejectPayment] Отклонение платежа:', {
                workflowId: numericWorkflowId,
                originalWorkflowId: workflowId,
                workflowIdType: typeof numericWorkflowId,
                userId
            })

            // Получаем текущий workflow instance
            const {data: workflow, error: fetchError} = await supabase
                .from('payment_workflows')
                .select(`
          *,
          current_stage:workflow_stages!current_stage_id(
            id,
            name,
            position
          )
        `)
                .eq('id', numericWorkflowId)
                .single()

            if (fetchError || !workflow) {
                console.error('[ApprovalQueryService.rejectPayment] Workflow не найден:', {
                    workflowId: numericWorkflowId,
                    error: fetchError,
                    workflow
                })
                return {success: false, error: 'Процесс согласования не найден'}
            }

            // Записываем прогресс отклонения в отдельную таблицу
            const { error: progressError } = await supabase
                .from('workflow_approval_progress')
                .insert({
                    workflow_id: numericWorkflowId,
                    stage_id: workflow.current_stage_id,
                    stage_name: workflow.current_stage.name,
                    action: 'rejected',
                    user_id: userId,
                    reason: reason
                })

            if (progressError) {
                console.error('[ApprovalQueryService.rejectPayment] Ошибка записи прогресса:', progressError)
            }

            // Отклоняем workflow
            console.log('[ApprovalQueryService.rejectPayment] Обновляем workflow:', {
                workflowId: numericWorkflowId,
                workflowIdType: typeof numericWorkflowId,
                isNumber: Number.isInteger(numericWorkflowId),
                status: 'rejected'
            })

            // Попробуем альтернативный способ через прямой API запрос
            const updatePayload = {
                status: 'rejected',
                updated_at: new Date().toISOString()
            }

            // Используем прямой API запрос с правильным форматированием ID
            const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/payment_workflows?id=eq.${numericWorkflowId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify(updatePayload)
                }
            )

            let updateData = null
            let updateError = null

            if (!response.ok) {
                const errorText = await response.text()
                try {
                    updateError = JSON.parse(errorText)
                } catch {
                    updateError = { message: errorText, code: response.status.toString() }
                }
            } else {
                const responseText = await response.text()
                if (responseText) {
                    try {
                        updateData = JSON.parse(responseText)
                    } catch {
                        updateData = []
                    }
                }
            }

            if (updateError) {
                console.error('[ApprovalQueryService.rejectPayment] Ошибка обновления workflow через прямой API:', {
                    error: updateError,
                    errorMessage: updateError.message || updateError,
                    errorCode: updateError.code,
                    errorDetails: updateError.details,
                    workflowId: numericWorkflowId,
                    workflowIdType: typeof numericWorkflowId,
                    url: `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/payment_workflows?id=eq.${numericWorkflowId}`,
                    updateData
                })
                return {success: false, error: 'Ошибка обновления процесса согласования'}
            }

            console.log('[ApprovalQueryService.rejectPayment] Workflow успешно обновлен:', {
                workflowId: numericWorkflowId,
                updateData
            })

            // Обновляем статус платежа
            const paymentId = parseInt(workflow.payment_id)
            console.log('[ApprovalQueryService.rejectPayment] Обновляем платеж:', {
                paymentId,
                originalPaymentId: workflow.payment_id,
                status: 'failed'
            })

            const {error: paymentError} = await supabase
                .from('payments')
                .update({
                    status: 'failed',
                    approved_by: userId,
                    approved_at: new Date().toISOString(),
                    comment: reason
                })
                .eq('id', paymentId)

            if (paymentError) {
                console.error('[ApprovalQueryService.rejectPayment] Ошибка обновления платежа:', {
                    error: paymentError,
                    paymentId
                })
                return {success: false, error: 'Ошибка обновления статуса платежа'}
            }

            console.log('[ApprovalQueryService.rejectPayment] Платеж отклонен успешно')
            return {success: true}
        } catch (error) {
            console.error('[ApprovalQueryService.rejectPayment] Ошибка отклонения платежа:', error)
            return {success: false, error: handleSupabaseError(error)}
        }
    }
}