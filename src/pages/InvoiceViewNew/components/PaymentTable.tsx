import React from 'react'
import { Table, Button, Tag, Space, Tooltip, Typography } from 'antd'
import {
  EditOutlined,
  DeleteOutlined,
  SendOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatCurrency } from '@/utils/format'

const { Text } = Typography

interface PaymentTableProps {
  payments: any[]
  loading?: boolean
  highlightPaymentId?: string | null
  onEdit: (payment: any) => void
  onDelete: (payment: any) => void
  onSendToApproval: (payment: any) => void
}

export const PaymentTable: React.FC<PaymentTableProps> = ({
  payments,
  loading,
  highlightPaymentId,
  onEdit,
  onDelete,
  onSendToApproval
}) => {
  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default'
      case 'pending': return 'processing'
      case 'approved': return 'blue'
      case 'scheduled': return 'cyan'
      case 'paid': return 'success'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'draft': return 'Черновик'
      case 'pending': return 'На согласовании'
      case 'approved': return 'Согласован'
      case 'scheduled': return 'В графике'
      case 'paid': return 'Оплачен'
      case 'cancelled': return 'Отменён'
      default: return status
    }
  }

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
      case 'approved':
        return <CheckCircleOutlined />
      case 'pending':
      case 'scheduled':
        return <ClockCircleOutlined />
      case 'cancelled':
        return <ExclamationCircleOutlined />
      default:
        return null
    }
  }

  const columns = [
    {
      title: '№',
      dataIndex: 'internal_number',
      key: 'internal_number',
      width: 100,
      render: (text: string, record: any) => (
        <Text strong>
          {text || `#${record.id}`}
        </Text>
      )
    },
    {
      title: 'Дата',
      dataIndex: 'payment_date',
      key: 'payment_date',
      width: 120,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY')
    },
    {
      title: 'Тип платежа',
      dataIndex: 'payment_type',
      key: 'payment_type',
      width: 150,
      render: (type: any) => type?.name || '-'
    },
    {
      title: 'Сумма',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 150,
      render: (amount: number, record: any) => (
        <Text strong style={{ color: '#52c41a' }}>
          {formatCurrency(amount, record.currency || 'RUB')}
        </Text>
      )
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => (
        <Tag
          icon={getPaymentStatusIcon(status)}
          color={getPaymentStatusColor(status)}
        >
          {getPaymentStatusText(status)}
        </Tag>
      )
    },
    {
      title: 'Комментарий',
      dataIndex: 'comment',
      key: 'comment',
      ellipsis: true,
      render: (text: string) => text || '-'
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_: any, record: any) => (
        <Space size="small">
          {record.status === 'draft' && (
            <>
              <Tooltip title="Редактировать">
                <Button
                  type="link"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record)}
                  size="small"
                />
              </Tooltip>
              <Tooltip title="Отправить на согласование">
                <Button
                  type="link"
                  icon={<SendOutlined />}
                  onClick={() => onSendToApproval(record)}
                  size="small"
                />
              </Tooltip>
            </>
          )}
          {['draft', 'cancelled'].includes(record.status) && (
            <Tooltip title="Удалить">
              <Button
                type="link"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record)}
                size="small"
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  return (
    <Table
      columns={columns}
      dataSource={payments}
      rowKey="id"
      loading={loading}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Всего: ${total}`
      }}
      scroll={{ x: 900 }}
      rowClassName={(record) =>
        record.id === Number(highlightPaymentId) ? 'highlighted-row' : ''
      }
    />
  )
}