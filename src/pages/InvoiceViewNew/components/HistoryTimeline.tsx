import React from 'react'
import { Card, Empty, Spin, Tag, Timeline, Typography } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  SyncOutlined,
  UserOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text, Title } = Typography

interface HistoryTimelineProps {
  history: any[]
  loading?: boolean
}

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({ history, loading }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <FileTextOutlined style={{ color: '#52c41a' }} />
      case 'updated':
        return <SyncOutlined style={{ color: '#1890ff' }} />
      case 'status_changed':
        return <CheckCircleOutlined style={{ color: '#faad14' }} />
      case 'payment_added':
        return <DollarOutlined style={{ color: '#52c41a' }} />
      case 'payment_updated':
        return <DollarOutlined style={{ color: '#1890ff' }} />
      case 'payment_deleted':
        return <DollarOutlined style={{ color: '#ff4d4f' }} />
      default:
        return <ClockCircleOutlined />
    }
  }

  const getEventColor = (type: string) => {
    switch (type) {
      case 'created':
        return 'green'
      case 'updated':
        return 'blue'
      case 'status_changed':
        return 'orange'
      case 'payment_added':
        return 'green'
      case 'payment_updated':
        return 'blue'
      case 'payment_deleted':
        return 'red'
      default:
        return 'gray'
    }
  }

  const getEventTitle = (event: any) => {
    switch (event.event_type) {
      case 'created':
        return 'Счет создан'
      case 'updated':
        return 'Счет обновлен'
      case 'status_changed':
        return 'Изменен статус'
      case 'payment_added':
        return 'Добавлен платеж'
      case 'payment_updated':
        return 'Платеж обновлен'
      case 'payment_deleted':
        return 'Платеж удален'
      default:
        return 'Действие'
    }
  }

  const renderFieldChanges = (changes: any) => {
    if (!changes || typeof changes !== 'object') {return null}

    const fieldNames: Record<string, string> = {
      invoice_number: 'Номер счета',
      internal_number: 'Внутренний номер',
      title: 'Название',
      description: 'Описание',
      supplier_id: 'Поставщик',
      payer_id: 'Плательщик',
      project_id: 'Проект',
      amount_net: 'Сумма без НДС',
      vat_amount: 'НДС',
      total_amount: 'Общая сумма',
      status: 'Статус',
      priority: 'Приоритет',
      delivery_days: 'Срок поставки',
      notes: 'Примечания'
    }

    return Object.entries(changes).map(([field, values]: [string, any]) => {
      if (field === 'id' || !values) {return null}

      const fieldName = fieldNames[field] || field
      const oldValue = values.old_value || '-'
      const newValue = values.new_value || '-'

      return (
        <div key={field} style={{ marginTop: 8 }}>
          <Text strong>{fieldName}:</Text>{' '}
          <Text type="secondary" delete>{oldValue}</Text>
          {' → '}
          <Text type="success">{newValue}</Text>
        </div>
      )
    }).filter(Boolean)
  }

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin size="large" />
        </div>
      </Card>
    )
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <Empty description="История изменений отсутствует" />
      </Card>
    )
  }

  return (
    <Card>
      <Timeline mode="left">
        {history.map((event, index) => (
          <Timeline.Item
            key={event.id || index}
            dot={getEventIcon(event.event_type)}
            color={getEventColor(event.event_type)}
          >
            <div style={{ marginBottom: 8 }}>
              <Text strong>{getEventTitle(event)}</Text>
              {event.event_data?.status && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  {event.event_data.status}
                </Tag>
              )}
            </div>

            {event.description && (
              <div style={{ marginBottom: 8 }}>
                <Text>{event.description}</Text>
              </div>
            )}

            {event.event_data?.changes && (
              <div style={{ marginBottom: 8, paddingLeft: 16 }}>
                {renderFieldChanges(event.event_data.changes)}
              </div>
            )}

            {event.event_data?.payment && (
              <div style={{ marginBottom: 8, paddingLeft: 16 }}>
                <Text>
                  Платеж #{event.event_data.payment.id} на сумму{' '}
                  <Text strong>
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: event.event_data.payment.currency || 'RUB'
                    }).format(event.event_data.payment.amount || 0)}
                  </Text>
                </Text>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                <UserOutlined style={{ marginRight: 4 }} />
                {event.created_by_name || 'Система'}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 16 }}>
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {dayjs(event.created_at).format('DD.MM.YYYY HH:mm')}
              </Text>
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    </Card>
  )
}