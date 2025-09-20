import React from 'react'
import { Modal, Form, Input, DatePicker, Select, InputNumber, Row, Col, Typography } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import dayjs from 'dayjs'

const { Text, Title } = Typography

interface PaymentEditModalProps {
  visible: boolean
  payment: any
  invoice: any
  paymentsResponse: any
  paymentTypes: any[]
  form: FormInstance
  onOk: () => void
  onCancel: () => void
}

export const PaymentEditModal: React.FC<PaymentEditModalProps> = ({
  visible,
  payment,
  invoice,
  paymentsResponse,
  paymentTypes,
  form,
  onOk,
  onCancel
}) => {
  const existingPayments = paymentsResponse?.data || []
  const otherPaymentsTotal = existingPayments
    .filter((p: any) => p.id !== payment?.id)
    .reduce((sum: number, p: any) => sum + Number(p.total_amount || 0), 0)
  const remainingAmount = Math.max(0, (invoice?.total_amount || 0) - otherPaymentsTotal)

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: '#fff7e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <EditOutlined style={{ fontSize: 16, color: '#faad14' }} />
          </div>
          <div>
            <Title level={5} style={{ margin: 0, color: '#1f2937', fontSize: 16 }}>
              Редактирование платежа
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Платеж {payment?.internal_number || `#${payment?.id}`}
            </Text>
          </div>
        </div>
      }
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText="Сохранить"
      cancelText="Отмена"
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          internal_number: payment?.internal_number,
          payment_date: payment?.payment_date ? dayjs(payment.payment_date) : dayjs(),
          payment_type_id: payment?.payment_type_id,
          total_amount: payment?.total_amount,
          comment: payment?.comment
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="internal_number"
              label="Внутренний номер платежа"
            >
              <Input placeholder="Например: П-2024-001" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="payment_date"
              label="Дата платежа"
              rules={[{ required: true, message: 'Выберите дату' }]}
            >
              <DatePicker
                format="DD.MM.YYYY"
                style={{ width: '100%' }}
                placeholder="Выберите дату"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="payment_type_id"
              label="Тип платежа"
              rules={[{ required: true, message: 'Выберите тип' }]}
            >
              <Select placeholder="Выберите тип платежа">
                {paymentTypes.map((type: any) => (
                  <Select.Option key={type.id} value={type.id}>
                    {type.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="total_amount"
              label="Сумма платежа"
              rules={[
                { required: true, message: 'Введите сумму' },
                { type: 'number', min: 0.01, message: 'Сумма должна быть больше 0' }
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={value => value!.replace(/\s?/g, '')}
                precision={2}
                placeholder="0.00"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row>
          <Col span={24}>
            <Form.Item
              name="comment"
              label="Комментарий"
            >
              <Input.TextArea rows={2} placeholder="Дополнительная информация" />
            </Form.Item>
          </Col>
        </Row>

        <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
          <Row>
            <Col span={12}>
              <Text>Сумма счета:</Text>
              <div>
                <Text strong style={{ fontSize: 16 }}>
                  {new Intl.NumberFormat('ru-RU').format(invoice?.total_amount || 0)} {invoice?.currency || 'RUB'}
                </Text>
              </div>
            </Col>
            <Col span={12}>
              <Text>Остаток к оплате (без текущего платежа):</Text>
              <div>
                <Text strong style={{ fontSize: 16, color: remainingAmount > 0 ? '#faad14' : '#52c41a' }}>
                  {new Intl.NumberFormat('ru-RU').format(remainingAmount)} {invoice?.currency || 'RUB'}
                </Text>
              </div>
            </Col>
          </Row>
        </div>
      </Form>
    </Modal>
  )
}