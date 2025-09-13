/**
 * Payments tab component for invoice creation
 */

import React, { useState } from 'react'
import {
  Button,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { ColumnsType } from 'antd/es/table'

const { Text } = Typography

export interface Payment {
  id?: string
  amount: number
  currency: string
  payment_date: dayjs.Dayjs | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  description?: string
}

interface PaymentsTabProps {
  payments: Payment[]
  onPaymentsChange: (payments: Payment[]) => void
  currency: string
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  payments,
  onPaymentsChange,
  currency
}) => {
  const [modalOpen, setModalOpen] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const [form] = Form.useForm()

  const handleOpen = (payment?: Payment) => {
    console.log('[PaymentsTab] Opening modal for:', payment || 'new payment')
    if (payment) {
      setEditingPayment(payment)
      form.setFieldsValue({
        amount: payment.amount,
        currency: payment.currency,
        payment_date: payment.payment_date,
        status: payment.status,
        description: payment.description
      })
    } else {
      setEditingPayment(null)
      form.resetFields()
      form.setFieldsValue({
        currency: currency,
        status: 'pending',
        payment_date: dayjs()
      })
    }
    setModalOpen(true)
  }

  const handleClose = () => {
    console.log('[PaymentsTab] Closing modal')
    setModalOpen(false)
    setEditingPayment(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      console.log('[PaymentsTab] Submitting form')
      const values = await form.validateFields()
      console.log('[PaymentsTab] Form values:', values)

      const newPayment: Payment = {
        ...values,
        id: editingPayment?.id || `temp-${Date.now()}`
      }

      let updatedPayments: Payment[]
      if (editingPayment) {
        console.log('[PaymentsTab] Updating payment:', editingPayment.id)
        updatedPayments = payments.map(p =>
          p.id === editingPayment.id ? newPayment : p
        )
      } else {
        console.log('[PaymentsTab] Adding new payment')
        updatedPayments = [...payments, newPayment]
      }

      onPaymentsChange(updatedPayments)
      handleClose()
    } catch (error) {
      console.error('[PaymentsTab] Error:', error)
    }
  }

  const handleDelete = (id: string | undefined) => {
    if (!id) return
    console.log('[PaymentsTab] Deleting payment:', id)
    const updatedPayments = payments.filter(p => p.id !== id)
    onPaymentsChange(updatedPayments)
  }

  const columns: ColumnsType<Payment> = [
    {
      title: 'Дата платежа',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date: dayjs.Dayjs | null) =>
        date ? date.format('DD.MM.YYYY') : '-',
      width: 120
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number, record: Payment) => (
        <Text strong>
          {amount.toLocaleString('ru-RU')} {record.currency}
        </Text>
      ),
      width: 150
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: 'Ожидает' },
          processing: { color: 'blue', text: 'В обработке' },
          completed: { color: 'green', text: 'Завершен' },
          failed: { color: 'red', text: 'Ошибка' },
          cancelled: { color: 'gray', text: 'Отменен' }
        }
        const statusInfo = statusMap[status] || { color: 'default', text: status }
        return (
          <Text style={{ color: statusInfo.color }}>
            {statusInfo.text}
          </Text>
        )
      },
      width: 120
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpen(record)}
          />
          <Popconfirm
            title="Удалить платеж?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id)}
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
      )
    }
  ]

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => handleOpen()}
        >
          Добавить платеж
        </Button>
        <Text strong style={{ fontSize: 16 }}>
          Итого: {totalAmount.toLocaleString('ru-RU')} {currency}
        </Text>
      </div>

      <Table
        dataSource={payments}
        columns={columns}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{
          emptyText: 'Платежи не добавлены'
        }}
      />

      <Modal
        title={editingPayment ? 'Редактировать платеж' : 'Новый платеж'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={handleClose}
        okText="Сохранить"
        cancelText="Отмена"
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="payment_date"
            label="Дата платежа"
            rules={[{ required: true, message: 'Выберите дату' }]}
          >
            <DatePicker
              style={{ width: '100%' }}
              format="DD.MM.YYYY"
              placeholder="Выберите дату"
            />
          </Form.Item>

          <Form.Item
            name="amount"
            label="Сумма платежа"
            rules={[
              { required: true, message: 'Введите сумму' },
              { type: 'number', min: 0.01, message: 'Сумма должна быть больше 0' }
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              precision={2}
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={value => value!.replace(/\s?/g, '')}
              placeholder="0.00"
            />
          </Form.Item>

          <Form.Item
            name="currency"
            label="Валюта"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'RUB', label: 'RUB - Российский рубль' },
                { value: 'USD', label: 'USD - Доллар США' },
                { value: 'EUR', label: 'EUR - Евро' },
                { value: 'KZT', label: 'KZT - Казахстанский тенге' }
              ]}
            />
          </Form.Item>

          <Form.Item
            name="status"
            label="Статус"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'pending', label: 'Ожидает' },
                { value: 'processing', label: 'В обработке' },
                { value: 'completed', label: 'Завершен' },
                { value: 'failed', label: 'Ошибка' },
                { value: 'cancelled', label: 'Отменен' }
              ]}
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <Input.TextArea
              rows={3}
              placeholder="Дополнительная информация о платеже"
              maxLength={500}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}