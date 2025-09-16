/**
 * Optimized query operations for payment approvals - performance improvements
 * Fixes massive N+1 query problems and reduces database round trips
 */

import {
    handleSupabaseError,
    type PaginatedResponse,
    type PaginationParams,
    supabase
} from '../supabase'
import type {ApprovalItem} from './queries'

export class OptimizedApprovalQueryService {

    /**
     * OPTIMIZED: Get approvals list with single comprehensive query
     * Eliminates N+1 problems by loading all related data in batches
     */
    static async getOptimizedMyApprovals(
        userId: string,
        pagination: PaginationParams = {},
        testRole?: string
    ): Promise<PaginatedResponse<ApprovalItem>> {
        try {
            console.log('[OptimizedApprovalQueryService.getOptimizedMyApprovals] Загрузка оптимизированного списка согласований для пользователя:', userId)

            const {page = 1, limit = 20, sortBy = 'started_at', sortOrder = 'desc'} = pagination

            // Enforce maximum limit to prevent runaway queries
            const safeLimit = Math.min(limit, 50)
            const from = (page - 1) * safeLimit
            const to = from + safeLimit - 1

            // Get user role efficiently - use test role if provided
            let userRole = testRole || 'user'

            if (!testRole) {
                const {data: user} = await supabase
                    .from('users')
                    .select('role_id, rolesinner(code)')
                    .eq('id', userId)
                    .single()

                userRole = user?.roles?.code || 'user'
            }

            console.log('[OptimizedApprovalQueryService.getOptimizedMyApprovals] Используемая роль:', userRole)

            // Single comprehensive query with all necessary JOINs
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
          approval_progress,
          created_at,
          workflow:workflowsworkflow_id(
            id,
            name,
            description
          ),
          current_stage:workflow_stagescurrent_stage_id(
            id,
            name,
            position,
            assigned_users,
            assigned_roles
          ),
          payment:paymentspayment_id(
            id,
            reference,
            amount,
            payment_date,
            status,
            payment_method,
            comment,
            created_at,
            payer:contractorspayer_id(id, name, inn, email, phone)
          ),
          invoice:invoicesinvoice_id(
            id,
            invoice_number,
            description,
            total_amount,
            status,
            supplier:contractorssupplier_id(id, name, inn),
            payer:contractorspayer_id(id, name, inn),
            project:projectsproject_id(id, name, code),
            invoice_type:invoice_typestype_id(id, name)
          )
        `, {count: 'exact'})
                .eq('status', 'in_progress')

            // Apply user/role filtering at database level for better performance
            query = query.or(
                `current_stage.assigned_users.cs.{${userId}},` +
                `current_stage.assigned_roles.cs.{${userRole}}`
            )

            // Sorting and pagination
            query = query
                .order(sortBy, {ascending: sortOrder === 'asc'})
                .range(from, to)

            const {data: workflows, error, count} = await query

            if (error) {
                console.error('[OptimizedApprovalQueryService.getOptimizedMyApprovals] Ошибка загрузки workflows:', error)
                throw error
            }

            console.log('[OptimizedApprovalQueryService.getOptimizedMyApprovals] Загружено workflows:', workflows?.length || 0)

            // Additional filtering in application (database filtering not perfect for JSON arrays)
            const filteredWorkflows = workflows?.filter(workflow => {
                if (!workflow.current_stage) {
                    return false
                }

                const assignedUsers = workflow.current_stage.assigned_users ?? []
                const assignedRoles = workflow.current_stage.assigned_roles ?? []

                return assignedUsers.includes(userId) || assignedRoles.includes(userRole)
            }) || []

            console.log('[OptimizedApprovalQueryService.getOptimizedMyApprovals] Отфильтровано workflows:', filteredWorkflows.length)

            // Batch load all user data in single query
            const allUserIds = new Set<string>()
            filteredWorkflows.forEach(workflow => {
                if (workflow.started_by) {
                    allUserIds.add(workflow.started_by)
                }

                // Collect user IDs from approval_progress
                if (workflow.approval_progress && Array.isArray(workflow.approval_progress)) {
                    workflow.approval_progress.forEach((progress: any) => {
                        if (progress.approved_by) {
                            allUserIds.add(progress.approved_by)
                        }
                        if (progress.rejected_by) {
                            allUserIds.add(progress.rejected_by)
                        }
                    })
                }
            })

            // Single query to load all users
            let usersMap: Record<string, any> = {}
            if (allUserIds.size > 0) {
                const {data: users} = await supabase
                    .from('users')
                    .select('id, full_name, email')
                    .in('id', Array.from(allUserIds))

                if (users) {
                    usersMap = users.reduce((acc, user) => {
                        acc[user.id] = user
                        return acc
                    }, {} as Record<string, any>)
                }
            }

            // Transform data - most relations already loaded
            const approvalItems: ApprovalItem[] = filteredWorkflows.map(workflow => {
                const startedByUser = workflow.started_by ? usersMap[workflow.started_by] : null

                // Enrich approval_progress with user data
                let approvalProgress = workflow.approval_progress
                if (approvalProgress && Array.isArray(approvalProgress)) {
                    approvalProgress = approvalProgress.map((progress: any) => ({
                        ...progress,
                        approver: progress.approved_by ? usersMap[progress.approved_by] :
                            progress.rejected_by ? usersMap[progress.rejected_by] : null
                    }))
                }

                return {
                    id: workflow.id,
                    payment_workflow_id: workflow.id,
                    payment_id: workflow.payment_id,
                    invoice_id: workflow.invoice_id,
                    amount: (workflow.amount ?? workflow.payment?.amount ?? workflow.invoice?.total_amount) || 0,
                    payment_date: workflow.payment?.payment_date ?? new Date().toISOString(),
                    current_stage_id: workflow.current_stage_id,
                    current_stage_position: workflow.current_stage_position,
                    stages_total: workflow.stages_total,
                    stages_completed: workflow.stages_completed,
                    workflow_status: workflow.status,
                    started_at: workflow.started_at,
                    started_by: workflow.started_by,
                    started_by_user: startedByUser,
                    approval_progress: approvalProgress,
                    payment: workflow.payment,
                    invoice: workflow.invoice,
                    workflow: workflow.workflow,
                    current_stage: workflow.current_stage
                }
            })

            const filteredCount = filteredWorkflows.length
            const totalPages = Math.ceil(filteredCount / safeLimit)

            console.log('[OptimizedApprovalQueryService.getOptimizedMyApprovals] Оптимизированная загрузка завершена:', approvalItems.length)

            return {
                data: approvalItems,
                error: null,
                count: filteredCount,
                page,
                limit: safeLimit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        } catch (error) {
            console.error('[OptimizedApprovalQueryService.getOptimizedMyApprovals] Ошибка получения оптимизированного списка согласований:', error)
            return {
                data: [],
                error: handleSupabaseError(error),
                count: 0,
                page: pagination.page || 1,
                limit: Math.min(pagination.limit || 20, 50),
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false,
            }
        }
    }

    /**
     * OPTIMIZED: Approve payment with minimal database operations
     * Reduces number of queries needed for approval process
     */
    static async optimizedApprovePayment(
        workflowId: number,
        userId: string,
        comment?: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('[OptimizedApprovalQueryService.optimizedApprovePayment] Оптимизированное одобрение платежа:', {
                workflowId,
                userId
            })

            // Get workflow instance with all necessary data in single query
            const {data: workflow, error: fetchError} = await supabase
                .from('payment_workflows')
                .select(`
          *,
          current_stage:workflow_stagescurrent_stage_id(
            id,
            name,
            position
          ),
          workflow:workflowsworkflow_id(
            id,
            name,
            stages:workflow_stages(id, name, position)
          )
        `)
                .eq('id', workflowId)
                .single()

            if (fetchError ?? !workflow) {
                return {success: false, error: 'Процесс согласования не найден'}
            }

            // Update approval progress
            const approvalProgress = workflow.approval_progress ?? []
            approvalProgress.push({
                stage_id: workflow.current_stage_id,
                stage_name: workflow.current_stage.name,
                approved_by: userId,
                approved_at: new Date().toISOString(),
                comment: comment ?? null,
                action: 'approved'
            })

            // Determine next stage efficiently
            const allStages = workflow.workflow.stages
                .sort((a: any, b: any) => a.position - b.position)

            const currentStageIndex = allStages.findIndex((s: any) => s.id === workflow.current_stage_id)
            const nextStage = allStages[currentStageIndex + 1]

            const updateData: any = {
                approval_progress: approvalProgress,
                stages_completed: workflow.stages_completed + 1,
                updated_at: new Date().toISOString()
            }

            // Handle workflow completion or progression
            if (nextStage) {
                // Move to next stage
                updateData.current_stage_id = nextStage.id
                updateData.current_stage_position = nextStage.position
            } else {
                // Complete workflow
                updateData.status = 'completed'
                updateData.completed_at = new Date().toISOString()
                updateData.completed_by = userId
            }

            // Use transaction to update both workflow and payment atomically
            const {error: updateError} = await supabase.rpc('approve_payment_optimized', {
                workflow_id: workflowId,
                payment_id: workflow.payment_id,
                update_data: updateData,
                is_final_approval: !nextStage,
                approver_id: userId
            })

            if (updateError) {
                console.error('[OptimizedApprovalQueryService.optimizedApprovePayment] Ошибка обновления:', updateError)
                return {success: false, error: 'Ошибка обновления процесса согласования'}
            }

            console.log('[OptimizedApprovalQueryService.optimizedApprovePayment] Оптимизированное одобрение выполнено успешно')
            return {success: true}
        } catch (error) {
            console.error('[OptimizedApprovalQueryService.optimizedApprovePayment] Ошибка одобрения:', error)
            return {success: false, error: handleSupabaseError(error)}
        }
    }

    /**
     * OPTIMIZED: Reject payment with minimal database operations
     * Reduces number of queries needed for rejection process
     */
    static async optimizedRejectPayment(
        workflowId: number,
        userId: string,
        reason: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            console.log('[OptimizedApprovalQueryService.optimizedRejectPayment] Оптимизированное отклонение платежа:', {
                workflowId,
                userId
            })

            // Get workflow instance with minimal data needed
            const {data: workflow, error: fetchError} = await supabase
                .from('payment_workflows')
                .select(`
          id,
          payment_id,
          current_stage_id,
          approval_progress,
          current_stage:workflow_stagescurrent_stage_id(id, name)
        `)
                .eq('id', workflowId)
                .single()

            if (fetchError ?? !workflow) {
                return {success: false, error: 'Процесс согласования не найден'}
            }

            // Update approval progress
            const approvalProgress = workflow.approval_progress ?? []
            approvalProgress.push({
                stage_id: workflow.current_stage_id,
                stage_name: workflow.current_stage.name,
                rejected_by: userId,
                rejected_at: new Date().toISOString(),
                reason: reason,
                action: 'rejected'
            })

            // Use transaction to update both workflow and payment atomically
            const {error: updateError} = await supabase.rpc('reject_payment_optimized', {
                workflow_id: workflowId,
                payment_id: workflow.payment_id,
                approval_progress: approvalProgress,
                rejector_id: userId,
                rejection_reason: reason
            })

            if (updateError) {
                console.error('[OptimizedApprovalQueryService.optimizedRejectPayment] Ошибка обновления:', updateError)
                return {success: false, error: 'Ошибка обновления процесса согласования'}
            }

            console.log('[OptimizedApprovalQueryService.optimizedRejectPayment] Оптимизированное отклонение выполнено успешно')
            return {success: true}
        } catch (error) {
            console.error('[OptimizedApprovalQueryService.optimizedRejectPayment] Ошибка отклонения:', error)
            return {success: false, error: handleSupabaseError(error)}
        }
    }

    /**
     * OPTIMIZED: Get approval statistics with aggregated queries
     * Uses database aggregation instead of loading all data to client
     */
    static async getOptimizedApprovalStats(
        userId: string,
        userRole: string
    ): Promise<{
        pending: number
        completedToday: number
        avgApprovalTime: number
        myApprovals: number
    }> {
        try {
            // Use database aggregation functions for better performance
            const [pendingResult, completedResult, myApprovalsResult] = await Promise.all([
                // Count pending approvals
                supabase
                    .from('payment_workflows')
                    .select('id', {count: 'exact'})
                    .eq('status', 'in_progress')
                    .or(
                        `current_stage.assigned_users.cs.{${userId}},` +
                        `current_stage.assigned_roles.cs.{${userRole}}`
                    ),

                // Count completed today
                supabase
                    .from('payment_workflows')
                    .select('completed_at', {count: 'exact'})
                    .eq('status', 'completed')
                    .gte('completed_at', new Date().toISOString().split('T')[0]),

                // Count my total approvals
                supabase
                    .from('payment_workflows')
                    .select('approval_progress', {count: 'exact'})
                    .contains('approval_progress', [{approved_by: userId}])
            ])

            // Calculate average approval time using database function
            const {data: avgTimeData} = await supabase
                .rpc('calculate_avg_approval_time', {approver_id: userId})

            return {
                pending: pendingResult.count || 0,
                completedToday: completedResult.count || 0,
                avgApprovalTime: avgTimeData?.[0]?.avg_time || 0,
                myApprovals: myApprovalsResult.count || 0
            }
        } catch (error) {
            console.error('Ошибка получения оптимизированной статистики согласований:', error)
            return {
                pending: 0,
                completedToday: 0,
                avgApprovalTime: 0,
                myApprovals: 0
            }
        }
    }

    /**
     * OPTIMIZED: Get workflow history with minimal queries
     * Loads complete workflow history efficiently
     */
    static async getOptimizedWorkflowHistory(
        workflowId: number
    ): Promise<{
        workflow: any
        stages: any[]
        approvalHistory: any[]
    }> {
        try {
            // Single query to get all workflow data
            const {data: workflow, error} = await supabase
                .from('payment_workflows')
                .select(`
          *,
          workflow:workflowsworkflow_id(
            id,
            name,
            description,
            stages:workflow_stages(*)
          ),
          payment:paymentspayment_id(
            id,
            reference,
            amount,
            status
          ),
          invoice:invoicesinvoice_id(
            id,
            invoice_number,
            description,
            total_amount
          )
        `)
                .eq('id', workflowId)
                .single()

            if (error) {
                throw error
            }

            // Extract and process approval history
            const approvalHistory = workflow.approval_progress ?? []

            // Load user data for approval history
            const userIds = approvalHistory
                .map((progress: any) => progress.approved_by ?? progress.rejected_by)
                .filter(Boolean)

            let usersMap: Record<string, any> = {}
            if (userIds.length > 0) {
                const {data: users} = await supabase
                    .from('users')
                    .select('id, full_name, email')
                    .in('id', userIds)

                if (users) {
                    usersMap = users.reduce((acc, user) => {
                        acc[user.id] = user
                        return acc
                    }, {} as Record<string, any>)
                }
            }

            // Enrich approval history with user data
            const enrichedHistory = approvalHistory.map((progress: any) => ({
                ...progress,
                approver: progress.approved_by ? usersMap[progress.approved_by] :
                    progress.rejected_by ? usersMap[progress.rejected_by] : null
            }))

            return {
                workflow: workflow,
                stages: workflow.workflow?.stages ?? [],
                approvalHistory: enrichedHistory
            }
        } catch (error) {
            console.error('Ошибка получения оптимизированной истории согласования:', error)
            return {
                workflow: null,
                stages: [],
                approvalHistory: []
            }
        }
    }
}

// SQL for creating optimized database functions
export const createOptimizedApprovalFunctions = `
-- Function to approve payment atomically
CREATE OR REPLACE FUNCTION approve_payment_optimized(
  workflow_id bigint,
  payment_id bigint,
  update_data jsonb,
  is_final_approval boolean,
  approver_id uuid
) RETURNS void AS $$
BEGIN
  -- Update workflow
  UPDATE payment_workflows 
  SET 
    approval_progress = (update_data->>'approval_progress')::jsonb,
    stages_completed = (update_data->>'stages_completed')::int,
    current_stage_id = COALESCE((update_data->>'current_stage_id')::bigint, current_stage_id),
    current_stage_position = COALESCE((update_data->>'current_stage_position')::int, current_stage_position),
    status = COALESCE(update_data->>'status', status),
    completed_at = COALESCE((update_data->>'completed_at')::timestamp, completed_at),
    completed_by = COALESCE((update_data->>'completed_by')::uuid, completed_by),
    updated_at = (update_data->>'updated_at')::timestamp
  WHERE id = workflow_id;
  
  -- Update payment if final approval
  IF is_final_approval THEN
    UPDATE payments 
    SET 
      status = 'completed',
      approved_by = approver_id,
      approved_at = NOW()
    WHERE id = payment_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to reject payment atomically
CREATE OR REPLACE FUNCTION reject_payment_optimized(
  workflow_id bigint,
  payment_id bigint,
  approval_progress jsonb,
  rejector_id uuid,
  rejection_reason text
) RETURNS void AS $$
BEGIN
  -- Update workflow
  UPDATE payment_workflows 
  SET 
    status = 'rejected',
    approval_progress = approval_progress,
    completed_at = NOW(),
    completed_by = rejector_id,
    updated_at = NOW()
  WHERE id = workflow_id;
  
  -- Update payment
  UPDATE payments 
  SET 
    status = 'failed',
    approved_by = rejector_id,
    approved_at = NOW(),
    comment = rejection_reason
  WHERE id = payment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate average approval time for user
CREATE OR REPLACE FUNCTION calculate_avg_approval_time(approver_id uuid)
RETURNS TABLE(avg_time numeric) AS $$
BEGIN
  RETURN QUERY
  SELECT AVG(
    EXTRACT(EPOCH FROM 
      (progress->>'approved_at')::timestamp - 
      (progress->>'created_at')::timestamp
    ) / 3600
  ) as avg_time
  FROM payment_workflows,
       jsonb_array_elements(approval_progress) as progress
  WHERE progress->>'approved_by' = approver_id::text
    AND progress->>'approved_at' IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
`;