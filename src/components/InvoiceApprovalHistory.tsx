/**
 * InvoiceApprovalHistory - компонент для отображения истории согласований счета
 */

import React from 'react'
import { Timeline, Card, Typography, Tag, Space, Empty, Avatar } from 'antd'
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  UserOutlined,
  SyncOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text, Title } = Typography

interface ApprovalRecord {
  id: string
  user_id: string
  user_name?: string
  user_email?: string
  action: 'approved' | 'rejected' | 'pending' | 'returned'
  comment?: string
  created_at: string
  stage_name?: string
}

interface InvoiceApprovalHistoryProps {
  approvals?: ApprovalRecord[]
  loading?: boolean
}

export const InvoiceApprovalHistory: React.FC<InvoiceApprovalHistoryProps> = ({
  approvals = [],
  loading = false
}) => {
  console.log('[InvoiceApprovalHistory] Rendering with approvals:', approvals.length)

  const getStatusIcon = (action: string) => {
    switch (action) {
      case 'approved':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'rejected':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
      case 'returned':
        return <SyncOutlined style={{ color: '#faad14' }} />
      default:
        return <ClockCircleOutlined style={{ color: '#1890ff' }} />
    }
  }

  const getStatusColor = (action: string) => {
    switch (action) {
      case 'approved':
        return 'success'
      case 'rejected':
        return 'error'
      case 'returned':
        return 'warning'
      default:
        return 'processing'
    }
  }

  const getStatusText = (action: string) => {
    switch (action) {
      case 'approved':
        return 'Согласовано'
      case 'rejected':
        return 'Отклонено'
      case 'returned':
        return 'Возвращено на доработку'
      default:
        return 'Ожидает решения'
    }
  }

  if (loading) {
    return (
      <Card loading={loading}>
        <Title level={5}>История согласований</Title>
      </Card>
    )
  }

  if (approvals.length === 0) {
    return (
      <Card>
        <Title level={5}>История согласований</Title>
        <Empty 
          description="История согласований пуста"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    )
  }

  return (
    <Card>
      <Title level={5}>История согласований</Title>
      <Timeline
        items={approvals.map((approval) => ({
          key: approval.id,
          dot: getStatusIcon(approval.action),
          children: (
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space>
                <Avatar size="small" icon={<UserOutlined />} />
                <Text strong>{approval.user_name || approval.user_email || 'Неизвестный пользователь'}</Text>
                <Tag color={getStatusColor(approval.action)}>
                  {getStatusText(approval.action)}
                </Tag>
              </Space>
              
              {approval.stage_name && (
                <Text type="secondary">Этап: {approval.stage_name}</Text>
              )}
              
              {approval.comment && (
                <Card size="small" style={{ backgroundColor: '#fafafa' }}>
                  <Text>{approval.comment}</Text>
                </Card>
              )}
              
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(approval.created_at).format('DD.MM.YYYY HH:mm')}
              </Text>
            </Space>
          )
        }))}
      />
    </Card>
  )
}

export default InvoiceApprovalHistory