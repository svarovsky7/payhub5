/**
 * WorkflowSteps - visual workflow display
 */

import React from 'react'
import { Avatar, Space, Steps, Tag, Tooltip, Typography } from 'antd'
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  UserOutlined 
} from '@ant-design/icons'
import { formatDate } from '../utils/format'

const { Text } = Typography

interface WorkflowStep {
  id: string
  step_name: string
  step_order: number
  assignee_id?: string
  assignee_name?: string
  action_type: 'approve' | 'review' | 'sign' | 'pay' | 'custom'
  is_required: boolean
  can_reject: boolean
  status?: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'skipped'
  completed_at?: string
  completed_by?: string
  completed_by_name?: string
  comment?: string
  timeout_hours?: number
}

interface WorkflowStepsProps {
  steps: WorkflowStep[]
  currentStepId?: string
  direction?: 'horizontal' | 'vertical'
  size?: 'default' | 'small'
  showDetails?: boolean
}

const getStepStatus = (step: WorkflowStep, currentStepId?: string) => {
  if (step.status === 'completed') {return 'finish'}
  if (step.status === 'rejected') {return 'error'}
  if (step.status === 'skipped') {return 'wait'}
  if (step.id === currentStepId || step.status === 'in_progress') {return 'process'}
  return 'wait'
}

const getStepIcon = (step: WorkflowStep) => {
  switch (step.status) {
    case 'completed':
      return <CheckCircleOutlined />
    case 'rejected':
      return <CloseCircleOutlined />
    case 'in_progress':
      return <ClockCircleOutlined />
    default:
      if (step.timeout_hours && step.status === 'pending') {
        return <ExclamationCircleOutlined />
      }
      return null
  }
}

const getActionTypeText = (actionType: string) => {
  const types = {
    approve: 'Согласование',
    review: 'Проверка',
    sign: 'Подпись',
    pay: 'Оплата',
    custom: 'Действие'
  }
  return types[actionType] || actionType
}

export const WorkflowSteps: React.FC<WorkflowStepsProps> = ({
  steps,
  currentStepId,
  direction = 'horizontal',
  size = 'default',
  showDetails = true,
}) => {
  const sortedSteps = steps.sort((a, b) => a.step_order - b.step_order)
  const currentIndex = sortedSteps.findIndex(step => step.id === currentStepId)

  const stepItems = sortedSteps.map((step, index) => ({
    title: (
      <Space direction="vertical" size={2}>
        <Text strong style={{ fontSize: size === 'small' ? 12 : 14 }}>
          {step.step_name}
        </Text>
        {showDetails && (
          <Space size={4} wrap>
            <Tag size="small" color="blue">
              {getActionTypeText(step.action_type)}
            </Tag>
            {step.is_required && (
              <Tag size="small" color="red">
                Обязательно
              </Tag>
            )}
          </Space>
        )}
      </Space>
    ),
    description: showDetails && (
      <Space direction="vertical" size={4}>
        {step.assignee_name && (
          <Space size={4}>
            <Avatar size="small" icon={<UserOutlined />} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {step.assignee_name}
            </Text>
          </Space>
        )}
        
        {step.completed_at && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {formatDate(step.completed_at, 'DD.MM.YYYY HH:mm')}
          </Text>
        )}
        
        {step.completed_by_name && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Выполнил: {step.completed_by_name}
          </Text>
        )}
        
        {step.comment && (
          <Tooltip title={step.comment}>
            <Text 
              type="secondary" 
              ellipsis 
              style={{ fontSize: 12, maxWidth: 200 }}
            >
              {step.comment}
            </Text>
          </Tooltip>
        )}
      </Space>
    ),
    status: getStepStatus(step, currentStepId),
    icon: getStepIcon(step),
  }))

  return (
    <Steps
      direction={direction}
      size={size}
      current={currentIndex}
      items={stepItems}
      style={{
        marginTop: 16,
        ...(direction === 'vertical' && { minHeight: 300 })
      }}
    />
  )
}

interface WorkflowProgressProps {
  totalSteps: number
  completedSteps: number
  rejectedSteps?: number
  showPercentage?: boolean
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  totalSteps,
  completedSteps,
  rejectedSteps = 0,
  showPercentage = true,
}) => {
  const percentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
  const hasErrors = rejectedSteps > 0

  return (
    <Space direction="vertical" size={4}>
      <Space>
        <Text type="secondary">Прогресс согласования:</Text>
        {showPercentage && (
          <Text strong color={hasErrors ? 'error' : 'success'}>
            {percentage}%
          </Text>
        )}
      </Space>
      
      <Space size={16}>
        <Space size={4}>
          <Tag color="green">{completedSteps}</Tag>
          <Text type="secondary">завершено</Text>
        </Space>
        
        <Space size={4}>
          <Tag color="blue">{totalSteps - completedSteps - rejectedSteps}</Tag>
          <Text type="secondary">в работе</Text>
        </Space>
        
        {rejectedSteps > 0 && (
          <Space size={4}>
            <Tag color="red">{rejectedSteps}</Tag>
            <Text type="secondary">отклонено</Text>
          </Space>
        )}
      </Space>
    </Space>
  )
}

export default WorkflowSteps