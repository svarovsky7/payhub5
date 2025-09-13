import React, { useEffect, useState } from 'react'
import { 
  Badge, 
  Button, 
  Card, 
  Empty, 
  message, 
  Modal,
  Popconfirm,
  Space,
  Tag,
  Tooltip,
  Typography
} from 'antd'
import { 
  ArrowRightOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  LockOutlined,
  PlusOutlined,
  UnlockOutlined,
  UserOutlined
} from '@ant-design/icons'
import { DragDropContext, Draggable, Droppable } from 'react-beautiful-dnd'
import type { WorkflowDefinition, WorkflowStage } from './types'
import { SYSTEM_ROLES } from './types'
import { StageEditor } from './StageEditor'

const { Title, Text } = Typography

interface WorkflowEditorProps {
  workflow: WorkflowDefinition
  projects?: Array<{ id: number; name: string }>
  onUpdateStages: (stages: WorkflowStage[]) => void
  onAddStage: (stage: Partial<WorkflowStage>) => void
  onUpdateStage: (stageId: number, stage: Partial<WorkflowStage>) => void
  onDeleteStage: (stageId: number) => void
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({
  workflow,
  projects,
  onUpdateStages,
  onAddStage,
  onUpdateStage,
  onDeleteStage,
}) => {
  const [stages, setStages] = useState<WorkflowStage[]>([])
  const [editingStage, setEditingStage] = useState<WorkflowStage | null>(null)
  const [isAddingStage, setIsAddingStage] = useState(false)

  useEffect(() => {
    console.log('[WorkflowEditor] Workflow changed:', workflow)
    if (workflow?.stages) {
      const sortedStages = [...workflow.stages].sort((a, b) => a.position - b.position)
      setStages(sortedStages)
      console.log('[WorkflowEditor] Loaded stages:', sortedStages)
    } else {
      setStages([])
      console.log('[WorkflowEditor] No stages found, setting empty array')
    }
  }, [workflow, workflow?.stages])

  const handleDragEnd = (result: any) => {
    if (!result.destination) {return}

    const items = Array.from(stages)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Обновляем позиции
    const updatedStages = items.map((stage, index) => ({
      ...stage,
      position: index + 1
    }))

    setStages(updatedStages)
    onUpdateStages(updatedStages)
    console.log('[WorkflowEditor] Reordered stages:', updatedStages)
  }

  const handleAddStage = () => {
    setIsAddingStage(true)
    setEditingStage(null)
  }

  const handleEditStage = (stage: WorkflowStage) => {
    setEditingStage(stage)
    setIsAddingStage(false)
  }

  const handleSaveStage = (stageData: Partial<WorkflowStage>) => {
    if (isAddingStage) {
      const newStage = {
        ...stageData,
        workflow_id: workflow.id,
        position: stages.length + 1,
      }
      onAddStage(newStage)
      console.log('[WorkflowEditor] Adding new stage:', newStage)
    } else if (editingStage) {
      onUpdateStage(editingStage.id, stageData)
      console.log('[WorkflowEditor] Updating stage:', editingStage.id, stageData)
    }
    
    setEditingStage(null)
    setIsAddingStage(false)
  }

  const handleCancelEdit = () => {
    setEditingStage(null)
    setIsAddingStage(false)
  }

  const handleDeleteStage = (stageId: number) => {
    onDeleteStage(stageId)
    console.log('[WorkflowEditor] Deleting stage:', stageId)
  }

  const getPermissionIcons = (stage: WorkflowStage) => {
    const icons = []
    if (stage.permissions?.can_view) {icons.push(<EyeOutlined key="view" title="Просмотр" />)}
    if (stage.permissions?.can_edit) {icons.push(<EditOutlined key="edit" title="Редактирование" />)}
    if (stage.permissions?.can_approve) {icons.push(<CheckCircleOutlined key="approve" title="Согласование" style={{ color: '#52c41a' }} />)}
    if (stage.permissions?.can_reject) {icons.push(<CloseCircleOutlined key="reject" title="Отклонение" style={{ color: '#f5222d' }} />)}
    if (stage.permissions?.can_cancel) {icons.push(<DeleteOutlined key="cancel" title="Отмена" />)}
    return icons
  }

  const getRoleNames = (stage: WorkflowStage) => {
    if (!stage.assigned_roles || stage.assigned_roles.length === 0) {
      return 'Не назначено'
    }
    return stage.assigned_roles.map(roleId => {
      const role = Object.values(SYSTEM_ROLES).find(r => r.id === roleId)
      return role?.name || roleId
    }).join(', ')
  }

  if (editingStage || isAddingStage) {
    return (
      <StageEditor
        stage={editingStage || undefined}
        projects={projects}
        contractors={[]}
        onSave={handleSaveStage}
        onCancel={handleCancelEdit}
      />
    )
  }

  return (
    <Card 
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>{workflow.name}</Title>
          <Badge 
            status={workflow.is_active ? "success" : "default"} 
            text={workflow.is_active ? "Активен" : "Неактивен"}
          />
        </Space>
      }
      extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={handleAddStage}
        >
          Добавить этап
        </Button>
      }
    >
      {workflow.description && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {workflow.description}
        </Text>
      )}

      {stages.length === 0 ? (
        <Empty
          description="Нет этапов согласования"
          style={{ margin: '40px 0' }}
        >
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={handleAddStage}
          >
            Добавить первый этап
          </Button>
        </Empty>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="stages">
            {(provided) => (
              <div {...provided.droppableProps} ref={provided.innerRef}>
                {stages.map((stage, index) => (
                  <Draggable key={stage.id} draggableId={String(stage.id)} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          marginBottom: index < stages.length - 1 ? 24 : 0,
                        }}
                      >
                        <Card
                          size="small"
                          style={{
                            backgroundColor: snapshot.isDragging ? '#f0f5ff' : stage.is_final ? '#fff9e6' : '#fff',
                            border: snapshot.isDragging ? '2px solid #1890ff' : stage.is_final ? '2px solid #faad14' : '1px solid #d9d9d9',
                            cursor: 'move',
                          }}
                          title={
                            <Space>
                              <Badge count={stage.position} style={{ backgroundColor: stage.is_final ? '#faad14' : '#1890ff' }} />
                              <Text strong>{stage.name}</Text>
                              {stage.is_final && <Tag color="gold">Финальный</Tag>}
                            </Space>
                          }
                          extra={
                            <Space>
                              <Button
                                type="text"
                                size="small"
                                icon={<EditOutlined />}
                                onClick={() => handleEditStage(stage)}
                              />
                              <Popconfirm
                                title="Удалить этап?"
                                description="Это действие нельзя отменить"
                                onConfirm={() => handleDeleteStage(stage.id)}
                                okText="Удалить"
                                cancelText="Отмена"
                              >
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                />
                              </Popconfirm>
                            </Space>
                          }
                        >
                          <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {stage.description && (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                {stage.description}
                              </Text>
                            )}
                            
                            {stage.is_final && (
                              <Text type="warning" style={{ fontSize: 12, fontWeight: 'bold' }}>
                                ⚠️ После этого этапа счет считается оплаченным и не может быть изменен
                              </Text>
                            )}
                            
                            <Space wrap>
                              <Tag icon={<UserOutlined />} color="blue">
                                {getRoleNames(stage)}
                              </Tag>
                              
                              <Tag icon={<ClockCircleOutlined />} color="orange">
                                {stage.timeout_days || 3} дней
                              </Tag>
                            </Space>

                            <Space>
                              <Text type="secondary" style={{ fontSize: 12 }}>Права:</Text>
                              {getPermissionIcons(stage)}
                            </Space>
                          </Space>
                        </Card>
                        
                        {index < stages.length - 1 && (
                          <div style={{ textAlign: 'center', margin: '8px 0' }}>
                            <ArrowRightOutlined style={{ fontSize: 20, color: '#1890ff' }} rotate={90} />
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </Card>
  )
}