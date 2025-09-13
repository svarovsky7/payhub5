import React from 'react'
import { Button, Card, Empty, List, Popconfirm, Space, Spin, Switch, Tag, Typography } from 'antd'
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  CopyOutlined, 
  DeleteOutlined,
  EditOutlined,
  PlusOutlined 
} from '@ant-design/icons'
import type { WorkflowDefinition } from './types'

const { Text } = Typography

interface WorkflowListProps {
  workflows: WorkflowDefinition[]
  loading: boolean
  selectedWorkflow?: WorkflowDefinition
  onSelect: (workflow: WorkflowDefinition) => void
  onCreate: () => void
  onEdit: (workflow: WorkflowDefinition) => void
  onDelete: (id: number) => void
  onClone: (workflow: WorkflowDefinition) => void
  onToggleActive: (id: number, isActive: boolean) => void
}

export const WorkflowList: React.FC<WorkflowListProps> = ({
  workflows,
  loading,
  selectedWorkflow,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onClone,
  onToggleActive,
}) => {
  console.log('[WorkflowList] Rendering with workflows:', workflows?.length)


  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'success' : 'default'
  }

  if (loading) {
    return (
      <Card 
        title="Процессы согласования платежей"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            Создать процесс
          </Button>
        }
        style={{ height: '100%' }}
      >
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <Spin size="large" />
        </div>
      </Card>
    )
  }

  if (!workflows || workflows.length === 0) {
    return (
      <Card 
        title="Процессы согласования платежей"
        extra={
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            Создать процесс
          </Button>
        }
        style={{ height: '100%' }}
      >
        <Empty
          description="Нет созданных процессов"
          style={{ marginTop: 50 }}
        >
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={onCreate}
          >
            Создать первый процесс
          </Button>
        </Empty>
      </Card>
    )
  }

  return (
    <Card 
      title="Процессы согласования платежей"
      extra={
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={onCreate}
        >
          Создать процесс
        </Button>
      }
      style={{ height: '100%', overflow: 'auto' }}
    >
      <List
        dataSource={workflows}
        renderItem={(workflow) => (
          <List.Item
            key={workflow.id}
            className={selectedWorkflow?.id === workflow.id ? 'ant-list-item-selected' : ''}
            style={{
              cursor: 'pointer',
              padding: '12px 16px',
              borderRadius: 8,
              marginBottom: 8,
              backgroundColor: selectedWorkflow?.id === workflow.id ? '#f0f5ff' : 'transparent',
              border: selectedWorkflow?.id === workflow.id ? '1px solid #1890ff' : '1px solid #f0f0f0',
            }}
            onClick={() => onSelect(workflow)}
            actions={[
              <Switch
                checked={workflow.is_active}
                checkedChildren={<CheckCircleOutlined />}
                unCheckedChildren={<CloseCircleOutlined />}
                onChange={(checked) => {
                  console.log('[WorkflowList] Toggling workflow active state:', workflow.id, checked)
                  onToggleActive(workflow.id, checked)
                }}
                onClick={(e) => e.stopPropagation()}
              />,
              <Space size={0} onClick={(e) => e.stopPropagation()}>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(workflow)}
                  title="Редактировать"
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => onClone(workflow)}
                  title="Клонировать"
                />
                <Popconfirm
                  title="Удалить процесс?"
                  description="Это действие нельзя отменить"
                  onConfirm={() => onDelete(workflow.id)}
                  okText="Удалить"
                  cancelText="Отмена"
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    title="Удалить"
                  />
                </Popconfirm>
              </Space>
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Text strong>{workflow.name}</Text>
                  <Tag color={getStatusColor(workflow.is_active)}>
                    {workflow.is_active ? 'Активен' : 'Неактивен'}
                  </Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size={0}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Этапов: {workflow.stages?.length || 0}
                  </Text>
                  {workflow.invoice_type_ids && workflow.invoice_type_ids.length > 0 ? (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Типы счетов: {workflow.invoice_type_ids.length} выбрано
                    </Text>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Типы счетов: Все
                    </Text>
                  )}
                  {workflow.description && (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {workflow.description}
                    </Text>
                  )}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  )
}