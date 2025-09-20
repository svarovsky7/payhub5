import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Tag, Space, Tooltip } from 'antd'
import {
  EyeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SendOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { DataTable } from '@/components/table'
import type { DataTableColumn, BulkAction } from '@/components/table'
import { DateCell, MoneyCell, StatusCell, TextCell, UserCell } from '@/components/table/TableCells'
import { Payment, statusConfig, getStatusColor } from '../types'

interface PaymentsTableProps {
  data: Payment[]
  loading: boolean
  total: number
  pageSize: number
  currentPage: number
  onPageChange: (page: number, pageSize: number) => void
  selectedRowKeys: React.Key[]
  onSelectionChange: (keys: React.Key[]) => void
  onConfirm: (payment: Payment) => void
  onCancel: (payment: Payment) => void
  onDelete: (payment: Payment) => void
  onSendToApproval: (payment: Payment) => void
  bulkActions: BulkAction[]
}

export const PaymentsTable: React.FC<PaymentsTableProps> = ({
  data,
  loading,
  total,
  pageSize,
  currentPage,
  onPageChange,
  selectedRowKeys,
  onSelectionChange,
  onConfirm,
  onCancel,
  onDelete,
  onSendToApproval,
  bulkActions
}) => {
  const navigate = useNavigate()

  const columns: DataTableColumn<Payment>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      sorter: true
    },
    {
      title: 'Номер платежа',
      dataIndex: 'internal_number',
      key: 'internal_number',
      width: 150,
      render: (value: string, record: Payment) => (
        <TextCell value={value || `P-${record.id}`} />
      )
    },
    {
      title: 'Счет',
      dataIndex: ['invoice', 'invoice_number'],
      key: 'invoice_number',
      width: 150,
      render: (_: any, record: Payment) => (
        <Space>
          <FileTextOutlined />
          <a
            onClick={() => navigate(`/invoices/${record.invoice_id}/view?tab=payments&payment_id=${record.id}&from=payments`)}
            style={{ cursor: 'pointer' }}
          >
            {record.invoice?.invoice_number || '—'}
          </a>
        </Space>
      )
    },
    {
      title: 'Поставщик',
      dataIndex: ['invoice', 'supplier', 'name'],
      key: 'supplier_name',
      width: 200,
      ellipsis: true,
      render: (value: string) => <TextCell value={value} />
    },
    {
      title: 'Плательщик',
      dataIndex: ['invoice', 'payer', 'name'],
      key: 'payer_name',
      width: 200,
      ellipsis: true,
      render: (value: string) => <TextCell value={value} />
    },
    {
      title: 'Проект',
      dataIndex: ['invoice', 'project', 'name'],
      key: 'project_name',
      width: 150,
      ellipsis: true,
      render: (value: string) => <TextCell value={value} />
    },
    {
      title: 'Сумма',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 120,
      align: 'right',
      render: (value: number, record: Payment) => (
        <MoneyCell value={value || record.amount} currency="RUB" />
      ),
      sorter: true
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (value: string) => (
        <Tag color={getStatusColor(value)}>
          {statusConfig[value as keyof typeof statusConfig] || value}
        </Tag>
      )
    },
    {
      title: 'Дата платежа',
      dataIndex: 'payment_date',
      key: 'payment_date',
      width: 120,
      render: (value: string) => <DateCell value={value} />,
      sorter: true
    },
    {
      title: 'Автор',
      dataIndex: ['creator', 'full_name'],
      key: 'creator_name',
      width: 150,
      ellipsis: true,
      render: (_: any, record: Payment) => (
        <UserCell
          name={record.creator?.full_name}
          email={record.creator?.email}
        />
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
      fixed: 'right',
      render: (_: any, record: Payment) => (
        <Space size="small">
          <Tooltip title="Просмотреть">
            <Button
              type="link"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/invoices/${record.invoice_id}/view?tab=payments&payment_id=${record.id}&from=payments`)}
            />
          </Tooltip>

          {record.status === 'draft' && (
            <Tooltip title="Отправить на согласование">
              <Button
                type="link"
                size="small"
                icon={<SendOutlined />}
                onClick={() => onSendToApproval(record)}
              />
            </Tooltip>
          )}

          {record.status === 'pending' && (
            <>
              <Tooltip title="Подтвердить">
                <Button
                  type="link"
                  size="small"
                  icon={<CheckCircleOutlined />}
                  style={{ color: '#52c41a' }}
                  onClick={() => onConfirm(record)}
                />
              </Tooltip>
              <Tooltip title="Отменить">
                <Button
                  type="link"
                  size="small"
                  icon={<CloseCircleOutlined />}
                  danger
                  onClick={() => onCancel(record)}
                />
              </Tooltip>
            </>
          )}

          {['draft', 'cancelled'].includes(record.status) && (
            <Tooltip title="Удалить">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                onClick={() => onDelete(record)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  return (
    <DataTable
      columns={columns}
      dataSource={data}
      loading={loading}
      rowKey="id"
      pagination={{
        total,
        pageSize,
        current: currentPage,
        onChange: onPageChange,
        showSizeChanger: true,
        showTotal: (total) => `Всего: ${total}`
      }}
      rowSelection={{
        selectedRowKeys,
        onChange: onSelectionChange
      }}
      bulkActions={bulkActions}
      scroll={{ x: 1500 }}
    />
  )
}