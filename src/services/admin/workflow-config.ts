/**
 * Workflow configuration service for admin
 * Работает с таблицами согласования платежей в Supabase
 */

import {supabase} from '../supabase'

// Типы для workflow платежей
interface WorkflowDefinition {
    id: number
    name: string
    description?: string
    is_active: boolean
    // Условия для платежей
    invoice_type_ids?: number[] // ID типов заявок из invoice_types
    created_at: string
    updated_at: string
    stages?: WorkflowStage[]
}

export interface WorkflowStage {
    id: number
    workflow_id: number
    position: number
    name: string
    description?: string
    stage_type: string
    assigned_roles?: string[]
    created_at: string
    updated_at: string
}

// StagePermissions interface removed - permissions field no longer exists in database

export interface CreateWorkflowInput {
    name: string
    description?: string
    is_active?: boolean
    invoice_type_ids?: number[]
    stages?: Omit<WorkflowStage, 'id' | 'workflow_id' | 'created_at' | 'updated_at'>[]
}

export interface UpdateWorkflowInput {
    name?: string
    description?: string
    is_active?: boolean
    invoice_type_ids?: number[]
}

export interface CreateStageInput {
    workflow_id: number
    position: number
    name: string
    description?: string
    stage_type?: string
    assigned_roles?: string[]
}

export class WorkflowConfigService {
    /**
     * Получить список всех workflow
     */
    static async getWorkflows() {
        try {
            console.log('[WorkflowConfigService] Getting all workflows')

            const {data, error} = await supabase
                .from('workflows')
                .select(`
          *,
          stages:workflow_stages(*)
        `)
                .order('created_at', {ascending: false})

            if (error) {
                console.error('[WorkflowConfigService] Error getting workflows:', error)
                throw error
            }

            // Сортируем этапы по позиции и добавляем is_final флаг
            const workflowsWithSortedStages = (data ?? []).map(workflow => ({
                ...workflow,
                stages: (workflow.stages ?? [])
                    .sort((a: any, b: any) => a.position - b.position)
                    .map((stage: any) => ({
                        ...stage,
                        is_final: stage.stage_type === 'final'
                    }))
            }))

            console.log('[WorkflowConfigService] Loaded workflows:', workflowsWithSortedStages.length)
            return {data: workflowsWithSortedStages, error: null}
        } catch (_error: any) {
            console.error('[WorkflowConfigService] Error in getWorkflows:', error)
            return {
                data: [],
                error: error.message || 'Failed to get workflows'
            }
        }
    }

    /**
     * Получить workflow по ID
     */
    static async getWorkflow(id: number) {
        try {
            const {data, error} = await supabase
                .from('workflows')
                .select(`
          *,
          stages:workflow_stages(*)
        `)
                .eq('id', id)
                .single()

            if (error) {
                throw error
            }

            // Сортируем этапы по позиции и добавляем is_final флаг
            if (data) {
                data.stages = (data.stages ?? [])
                    .sort((a: any, b: any) => a.position - b.position)
                    .map((stage: any) => ({
                        ...stage,
                        is_final: stage.stage_type === 'final'
                    }))
            }

            return {data, error: null}
        } catch (_error: any) {
            console.error('[WorkflowConfigService] Error getting workflow:', error)
            return {
                data: null,
                error: error.message || 'Failed to get workflow'
            }
        }
    }

    /**
     * Создать новый workflow
     */
    static async createWorkflow(workflow: CreateWorkflowInput) {
        try {
            console.log('[WorkflowConfigService] Creating workflow:', workflow)

            // Создаем workflow для платежей
            const {data: workflowData, error: workflowError} = await supabase
                .from('workflows')
                .insert({
                    name: workflow.name,
                    description: workflow.description,
                    is_active: workflow.is_active ?? true,
                    invoice_type_ids: workflow.invoice_type_ids ?? []
                })
                .select()
                .single()

            if (workflowError) {
                console.error('[WorkflowConfigService] Error creating workflow:', workflowError)
                throw workflowError
            }

            console.log('[WorkflowConfigService] Created workflow:', workflowData)

            // Создаем этапы если они указаны
            if (workflow.stages && workflow.stages.length > 0) {
                const stagesData = workflow.stages.map(stage => ({
                    workflow_id: workflowData.id,
                    position: stage.position,
                    name: stage.name,
                    description: stage.description,
                    stage_type: (stage as any).stage_type || 'approval',
                    assigned_roles: stage.assigned_roles ?? []
                }))

                const {error: stagesError} = await supabase
                    .from('workflow_stages')
                    .insert(stagesData)

                if (stagesError) {
                    console.error('[WorkflowConfigService] Error creating stages:', stagesError)
                    // Удаляем созданный workflow если не удалось создать этапы
                    await supabase.from('workflows').delete().eq('id', workflowData.id)
                    throw stagesError
                }
            }

            // Возвращаем полный workflow с этапами
            const result = await this.getWorkflow(workflowData.id)
            return result
        } catch (_error: any) {
            console.error('[WorkflowConfigService] Error in createWorkflow:', error)
            return {
                data: null,
                error: error.message || 'Failed to create workflow'
            }
        }
    }

    /**
     * Обновить workflow
     */
    static async updateWorkflow(id: number, updates: UpdateWorkflowInput) {
        try {
            console.log('[WorkflowConfigService] Updating workflow:', id, updates)

            const {data, error} = await supabase
                .from('workflows')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw error
            }

            console.log('[WorkflowConfigService] Updated workflow:', data)
            return {data, error: null}
        } catch (_error: any) {
            console.error('[WorkflowConfigService] Error updating workflow:', error)
            return {
                data: null,
                error: error.message || 'Failed to update workflow'
            }
        }
    }

    /**
     * Удалить workflow
     */
    static async deleteWorkflow(id: number) {
        try {
            console.log('[WorkflowConfigService] Deleting workflow:', id)

            // Этапы удалятся автоматически благодаря ON DELETE CASCADE
            const {error} = await supabase
                .from('workflows')
                .delete()
                .eq('id', id)

            if (error) {
                throw error
            }

            console.log('[WorkflowConfigService] Deleted workflow:', id)
            return {data: null, error: null}
        } catch (_error: any) {
            console.error('[WorkflowConfigService] Error deleting workflow:', error)
            return {
                data: null,
                error: error.message || 'Failed to delete workflow'
            }
        }
    }

    /**
     * Переключить активность workflow
     */
    static async toggleWorkflow(id: number, isActive: boolean) {
        try {
            console.log('[WorkflowConfigService] Toggling workflow:', id, isActive)
            return await this.updateWorkflow(id, {is_active: isActive})
        } catch (_error: any) {
            console.error('[WorkflowConfigService] Error toggling workflow:', error)
            return {
                data: null,
                error: error.message || 'Failed to toggle workflow'
            }
        }
    }

    /**
     * Создать этап workflow
     */
    static async createStage(stage: CreateStageInput) {
        try {
            console.log('[WorkflowConfigService] Creating stage:', stage)

            const {data, error} = await supabase
                .from('workflow_stages')
                .insert({
                    workflow_id: stage.workflow_id,
                    position: stage.position,
                    name: stage.name,
                    description: stage.description,
                    stage_type: stage.stage_type || 'approval',
                    assigned_roles: stage.assigned_roles ?? []
                })
                .select()
                .single()

            if (error) {
                throw error
            }

            console.log('[WorkflowConfigService] Created stage:', data)
            return {data, error: null}
        } catch (_error: any) {
            console.error('[WorkflowConfigService] Error creating stage:', error)
            return {
                data: null,
                error: error.message || 'Failed to create stage'
            }
        }
    }

    /**
     * Обновить этап workflow
     */
    static async updateStage(id: number, updates: Partial<CreateStageInput>) {
        try {
            console.log('[WorkflowConfigService] Updating stage:', id, updates)

            // Convert is_final to stage_type
            const updateData: any = {...updates}
            if ('is_final' in updates) {
                updateData.stage_type = updates.is_final ? 'final' : 'approval'
                delete updateData.is_final
            }

            const {data, error} = await supabase
                .from('workflow_stages')
                .update({
                    ...updateData,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw error
            }

            console.log('[WorkflowConfigService] Updated stage:', data)
            return {data, error: null}
        } catch (_error: any) {
            console.error('[WorkflowConfigService] Error updating stage:', error)
            return {
                data: null,
                error: error.message || 'Failed to update stage'
            }
        }
    }

    /**
     * Удалить этап workflow
     */
    static async deleteStage(id: number) {
        try {
            console.log('[WorkflowConfigService] Deleting stage:', id)

            const {error} = await supabase
                .from('workflow_stages')
                .delete()
                .eq('id', id)

            if (error) {
                throw error
            }

            console.log('[WorkflowConfigService] Deleted stage:', id)
            return {data: null, error: null}
        } catch (_error: any) {
            console.error('[WorkflowConfigService] Error deleting stage:', error)
            return {
                data: null,
                error: error.message || 'Failed to delete stage'
            }
        }
    }

    /**
     * Изменить порядок этапов
     */
    static async reorderStages(workflowId: number, stageIds: number[]) {
        try {
            console.log('[WorkflowConfigService] Reordering stages:', workflowId, stageIds)

            // Обновляем позиции всех этапов
            const updates = stageIds.map((stageId, _index) =>
                supabase
                    .from('workflow_stages')
                    .update({
                        position: index + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', stageId)
                    .eq('workflow_id', workflowId)
            )

            const results = await Promise.all(updates)

            // Проверяем на ошибки
            const errors = results.filter(r => r.error)
            if (errors.length > 0) {
                throw errors[0].error
            }

            console.log('[WorkflowConfigService] Reordered stages successfully')
            return {data: true, error: null}
        } catch (_error: any) {
            console.error('[WorkflowConfigService] Error reordering stages:', error)
            return {
                data: null,
                error: error.message || 'Failed to reorder stages'
            }
        }
    }

    /**
     * Клонировать workflow
     */
    static async cloneWorkflow(id: number, newName: string, userId: string) {
        try {
            console.log('[WorkflowConfigService] Cloning workflow:', id)

            // Получаем оригинальный workflow
            const {data: original, error: getError} = await this.getWorkflow(id)
            if (getError ?? !original) {
                throw new Error('Workflow not found')
            }

            // Создаем копию workflow для платежей
            const newWorkflow: CreateWorkflowInput = {
                name: newName,
                description: `Копия: ${original.description ?? original.name}`,
                is_active: false, // Новые workflow создаются неактивными
                invoice_type_ids: original.invoice_type_ids,
                stages: original.stages?.map((stage: WorkflowStage) => ({
                    position: stage.position,
                    name: stage.name,
                    description: stage.description,
                    stage_type: stage.stage_type,
                    assigned_roles: stage.assigned_roles
                }))
            }

            const result = await this.createWorkflow(newWorkflow)
            console.log('[WorkflowConfigService] Cloned workflow:', result.data)
            return result
        } catch (_error: any) {
            console.error('[WorkflowConfigService] Error cloning workflow:', error)
            return {
                data: null,
                error: error.message || 'Failed to clone workflow'
            }
        }
    }
}