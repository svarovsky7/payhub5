import React, { useEffect, useState } from 'react'
import { App, Col, Form, Input, Modal, Row, Select, Spin, Switch } from 'antd'
import { WorkflowList } from './WorkflowList'
import { WorkflowEditor } from './WorkflowEditor'
import type { WorkflowDefinition, WorkflowStage } from './types'
import { useProjectsList } from '@/services/hooks/useProjects'
import { supabase } from '@/services/supabase'
import { 
  type CreateStageInput,
  type CreateWorkflowInput,
  WorkflowConfigService 
} from '@/services/admin/workflow-config'

const { TextArea } = Input

export const WorkflowBuilder: React.FC = () => {
  const { message } = App.useApp()
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowDefinition | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [form] = Form.useForm()
  const [invoiceTypes, setInvoiceTypes] = useState<any[]>([])
  
  // Загружаем проекты для этапов
  const { data: projectsData } = useProjectsList()
  const projects = projectsData?.map(p => ({ id: p.id, name: p.name })) || []

  // Загрузка workflow при монтировании
  useEffect(() => {
    loadWorkflows()
    loadTypes()
  }, [])

  const loadTypes = async () => {
    console.log('[WorkflowBuilder] Loading invoice types')
    
    try {
      // Загружаем типы счетов (invoice_types)
      const { data: invoiceTypesData, error: invoiceError } = await supabase
        .from('invoice_types')
        .select('*')
        .order('id')
      
      if (invoiceError) {
        console.error('[WorkflowBuilder] Error loading invoice types:', invoiceError)
      } else {
        setInvoiceTypes(invoiceTypesData || [])
        console.log('[WorkflowBuilder] Loaded invoice types:', invoiceTypesData)
      }
    } catch (error) {
      console.error('[WorkflowBuilder] Error loading types:', error)
    }
  }

  const loadWorkflows = async () => {
    setLoading(true)
    console.log('[WorkflowBuilder] Loading workflows')
    
    try {
      const result = await WorkflowConfigService.getWorkflows()
      if (result.data) {
        // Преобразуем данные из сервиса в формат компонента
        const mappedWorkflows = result.data.map(w => ({
          ...w,
          stages: w.stages || []
        })) as WorkflowDefinition[]
        
        setWorkflows(mappedWorkflows)
        console.log('[WorkflowBuilder] Loaded workflows:', mappedWorkflows.length)
        
        // Выбираем первый workflow если есть
        if (mappedWorkflows.length > 0 && !selectedWorkflow) {
          setSelectedWorkflow(mappedWorkflows[0])
        }
      } else if (result.error) {
        console.error('[WorkflowBuilder] Error:', result.error)
        message.error(`Ошибка загрузки: ${result.error}`)
      }
    } catch (error) {
      console.error('[WorkflowBuilder] Error loading workflows:', error)
      message.error('Ошибка загрузки процессов')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateWorkflow = () => {
    setModalMode('create')
    form.resetFields()
    setModalVisible(true)
  }

  const handleEditWorkflow = (workflow: WorkflowDefinition) => {
    setModalMode('edit')
    form.setFieldsValue({
      name: workflow.name,
      description: workflow.description,
      invoice_type_ids: workflow.invoice_type_ids,
      is_active: workflow.is_active,
    })
    setSelectedWorkflow(workflow)
    setModalVisible(true)
  }

  const handleDeleteWorkflow = async (id: number) => {
    console.log('[WorkflowBuilder] Deleting workflow:', id)
    
    try {
      const result = await WorkflowConfigService.deleteWorkflow(id)
      if (result.error) {
        message.error(result.error)
      } else {
        message.success('Процесс удален')
        await loadWorkflows()
        
        // Если удалили выбранный workflow, сбрасываем выбор
        if (selectedWorkflow?.id === id) {
          setSelectedWorkflow(workflows.find(w => w.id !== id) || null)
        }
      }
    } catch (error) {
      console.error('[WorkflowBuilder] Error deleting workflow:', error)
      message.error('Ошибка удаления процесса')
    }
  }

  const handleCloneWorkflow = async (workflow: WorkflowDefinition) => {
    console.log('[WorkflowBuilder] Cloning workflow:', workflow.id)
    
    try {
      const result = await WorkflowConfigService.cloneWorkflow(
        workflow.id,
        `${workflow.name} (копия)`,
        '1' // TODO: получить текущего пользователя
      )
      
      if (result.data) {
        message.success('Процесс клонирован')
        await loadWorkflows()
      } else if (result.error) {
        message.error(result.error)
      }
    } catch (error) {
      console.error('[WorkflowBuilder] Error cloning workflow:', error)
      message.error('Ошибка клонирования процесса')
    }
  }

  const handleToggleActive = async (id: number, isActive: boolean) => {
    console.log('[WorkflowBuilder] Toggling workflow active state:', id, isActive)
    
    try {
      const result = await WorkflowConfigService.toggleWorkflow(id, isActive)
      if (result.data) {
        message.success(isActive ? 'Процесс активирован' : 'Процесс деактивирован')
        await loadWorkflows()
      } else if (result.error) {
        message.error(result.error)
      }
    } catch (error) {
      console.error('[WorkflowBuilder] Error toggling workflow:', error)
      message.error('Ошибка изменения статуса процесса')
    }
  }

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields()
      console.log('[WorkflowBuilder] Modal submit:', modalMode, values)
      
      if (modalMode === 'create') {
        const input: CreateWorkflowInput = {
          name: values.name,
          description: values.description,
          created_by: '1', // TODO: получить текущего пользователя
          is_active: true,
          invoice_type_ids: values.invoice_type_ids || [],
          contractor_type_ids: [], // Пустой массив
          project_ids: [], // Пустой массив
          stages: []
        }
        
        const result = await WorkflowConfigService.createWorkflow(input)
        
        if (result.data) {
          message.success('Процесс создан')
          setModalVisible(false)
          await loadWorkflows()
        } else if (result.error) {
          console.error('[WorkflowBuilder] Create error:', result.error)
          message.error(`Ошибка создания: ${result.error}`)
        }
      } else {
        // Редактирование
        if (selectedWorkflow) {
          const result = await WorkflowConfigService.updateWorkflow(
            selectedWorkflow.id,
            {
              name: values.name,
              description: values.description,
              is_active: values.is_active,
              invoice_type_ids: values.invoice_type_ids || [],
              contractor_type_ids: [], // Не изменяем
              project_ids: [] // Не изменяем
            }
          )
          
          if (result.data) {
            message.success('Процесс обновлен')
            setModalVisible(false)
            await loadWorkflows()
          } else if (result.error) {
            message.error(result.error)
          }
        }
      }
    } catch (error) {
      console.error('[WorkflowBuilder] Error submitting modal:', error)
      message.error('Ошибка создания workflow')
    }
  }

  const handleUpdateStages = async (stages: WorkflowStage[]) => {
    if (!selectedWorkflow) {return}
    
    console.log('[WorkflowBuilder] Updating stage order:', stages)
    
    try {
      const result = await WorkflowConfigService.reorderStages(
        selectedWorkflow.id,
        stages.map(s => s.id)
      )
      
      if (result.data) {
        message.success('Порядок этапов обновлен')
        await loadWorkflows()
      } else if (result.error) {
        message.error(result.error)
      }
    } catch (error) {
      console.error('[WorkflowBuilder] Error updating stages:', error)
      message.error('Ошибка обновления порядка этапов')
    }
  }

  const handleAddStage = async (stage: Partial<WorkflowStage>) => {
    if (!selectedWorkflow) {return}
    
    console.log('[WorkflowBuilder] Adding stage:', stage)
    
    try {
      const stageInput: CreateStageInput = {
        workflow_id: selectedWorkflow.id,
        position: stage.position || (selectedWorkflow.stages?.length || 0) + 1,
        name: stage.name || 'Новый этап',
        description: stage.description,
        approval_quorum: stage.approval_quorum || 1,
        timeout_days: stage.timeout_days,
        is_final: stage.is_final || false,
        assigned_roles: stage.assigned_roles || [],
        assigned_users: stage.assigned_users || []
      }
      
      const result = await WorkflowConfigService.createStage(stageInput)
      
      if (result.data) {
        // message.success('Этап добавлен')
        console.log('[WorkflowBuilder] Stage created successfully:', result.data)
        
        // Перезагружаем конкретный workflow чтобы получить обновленные этапы
        const updatedResult = await WorkflowConfigService.getWorkflow(selectedWorkflow.id)
        console.log('[WorkflowBuilder] Fetched updated workflow:', updatedResult)
        
        if (updatedResult.data) {
          const updatedWorkflow = {
            ...updatedResult.data,
            stages: updatedResult.data.stages || []
          } as WorkflowDefinition
          
          console.log('[WorkflowBuilder] Updating workflows with:', updatedWorkflow)
          
          // Обновляем в списке
          setWorkflows(prev => {
            const newWorkflows = prev.map(w => 
              w.id === selectedWorkflow.id ? updatedWorkflow : w
            )
            console.log('[WorkflowBuilder] Updated workflows list:', newWorkflows)
            return newWorkflows
          })
          
          // Обновляем выбранный
          setSelectedWorkflow(updatedWorkflow)
          console.log('[WorkflowBuilder] Set selected workflow to:', updatedWorkflow)
        }
      } else if (result.error) {
        // message.error(result.error)
        console.error('[WorkflowBuilder] Stage creation failed:', result.error)
      }
    } catch (error) {
      console.error('[WorkflowBuilder] Error adding stage:', error)
      // message.error('Ошибка добавления этапа')
    }
  }

  const handleUpdateStage = async (stageId: number, stage: Partial<WorkflowStage>) => {
    console.log('[WorkflowBuilder] Updating stage:', stageId, stage)
    
    try {
      const result = await WorkflowConfigService.updateStage(
        stageId,
        {
          position: stage.position,
          name: stage.name,
          description: stage.description,
          approval_quorum: stage.approval_quorum,
          timeout_days: stage.timeout_days,
          is_final: stage.is_final,
          assigned_roles: stage.assigned_roles,
          assigned_users: stage.assigned_users
        }
      )
      
      if (result.data && selectedWorkflow) {
        // message.success('Этап обновлен')
        console.log('[WorkflowBuilder] Stage updated successfully:', result.data)
        
        // Перезагружаем конкретный workflow чтобы получить обновленные этапы
        const updatedResult = await WorkflowConfigService.getWorkflow(selectedWorkflow.id)
        console.log('[WorkflowBuilder] Fetched updated workflow after stage update:', updatedResult)
        
        if (updatedResult.data) {
          const updatedWorkflow = {
            ...updatedResult.data,
            stages: updatedResult.data.stages || []
          } as WorkflowDefinition
          
          // Обновляем в списке
          setWorkflows(prev => prev.map(w => 
            w.id === selectedWorkflow.id ? updatedWorkflow : w
          ))
          // Обновляем выбранный
          setSelectedWorkflow(updatedWorkflow)
        }
      } else if (result.error) {
        // message.error(result.error)
        console.error('[WorkflowBuilder] Stage update failed:', result.error)
      }
    } catch (error) {
      console.error('[WorkflowBuilder] Error updating stage:', error)
      // message.error('Ошибка обновления этапа')
    }
  }

  const handleDeleteStage = async (stageId: number) => {
    console.log('[WorkflowBuilder] Deleting stage:', stageId)
    
    try {
      const result = await WorkflowConfigService.deleteStage(stageId)
      
      if (result.error) {
        // message.error(result.error)
        console.error('[WorkflowBuilder] Stage deletion failed:', result.error)
      } else {
        // message.success('Этап удален')
        console.log('[WorkflowBuilder] Stage deleted successfully')
        
        if (selectedWorkflow) {
          console.log('[WorkflowBuilder] Stage deleted successfully')
          
          // Перезагружаем конкретный workflow чтобы получить обновленные этапы
          const updatedResult = await WorkflowConfigService.getWorkflow(selectedWorkflow.id)
          console.log('[WorkflowBuilder] Fetched updated workflow after stage deletion:', updatedResult)
          
          if (updatedResult.data) {
            const updatedWorkflow = {
              ...updatedResult.data,
              stages: updatedResult.data.stages || []
            } as WorkflowDefinition
            
            // Обновляем в списке
            setWorkflows(prev => prev.map(w => 
              w.id === selectedWorkflow.id ? updatedWorkflow : w
            ))
            // Обновляем выбранный
            setSelectedWorkflow(updatedWorkflow)
          }
        }
      }
    } catch (error) {
      console.error('[WorkflowBuilder] Error deleting stage:', error)
      // message.error('Ошибка удаления этапа')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>Загрузка процессов...</div>
      </div>
    )
  }

  return (
    <>
      <Row gutter={16} style={{ height: 'calc(100vh - 200px)' }}>
        <Col span={8}>
          <WorkflowList
            workflows={workflows}
            loading={loading}
            selectedWorkflow={selectedWorkflow || undefined}
            onSelect={setSelectedWorkflow}
            onCreate={handleCreateWorkflow}
            onEdit={handleEditWorkflow}
            onDelete={handleDeleteWorkflow}
            onClone={handleCloneWorkflow}
            onToggleActive={handleToggleActive}
          />
        </Col>
        
        <Col span={16}>
          {selectedWorkflow ? (
            <WorkflowEditor
              workflow={selectedWorkflow}
              projects={projects}
              onUpdateStages={handleUpdateStages}
              onAddStage={handleAddStage}
              onUpdateStage={handleUpdateStage}
              onDeleteStage={handleDeleteStage}
            />
          ) : (
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#999'
            }}>
              Выберите процесс для редактирования или создайте новый
            </div>
          )}
        </Col>
      </Row>

      <Modal
        title={modalMode === 'create' ? 'Создать процесс согласования платежей' : 'Редактировать процесс'}
        open={modalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setModalVisible(false)}
        okText={modalMode === 'create' ? 'Создать' : 'Сохранить'}
        cancelText="Отмена"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            is_active: true,
          }}
        >
          <Form.Item
            name="name"
            label="Название процесса"
            rules={[{ required: true, message: 'Введите название процесса' }]}
          >
            <Input placeholder="Например: Согласование платежей по материалам" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea 
              rows={3} 
              placeholder="Опишите назначение и особенности процесса"
            />
          </Form.Item>

          <Form.Item
            name="invoice_type_ids"
            label="Типы счетов"
            tooltip="К каким типам счетов применяется данный процесс согласования"
          >
            <Select
              mode="multiple"
              placeholder="Выберите типы счетов"
              allowClear
              options={invoiceTypes.map(type => {
                // Переводим на русский язык
                const russianNames: Record<string, string> = {
                  'GOODS': 'Товары и материалы',
                  'WORKS': 'Работы и услуги',
                  'RENT': 'Аренда',
                  'UTILITIES': 'Коммунальные услуги'
                }
                return {
                  label: russianNames[type.code] || type.name,
                  value: type.id,
                }
              })}
            />
          </Form.Item>

          {modalMode === 'edit' && (
            <Form.Item
              name="is_active"
              label="Статус"
              valuePropName="checked"
            >
              <Switch checkedChildren="Активен" unCheckedChildren="Неактивен" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </>
  )
}