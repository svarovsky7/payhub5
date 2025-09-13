/**
 * General information tab component
 */

import React from 'react'
import {
  Card,
  Col,
  Divider,
  Row,
  Space,
  Typography
} from 'antd'
import { ProCard, ProDescriptions } from '@ant-design/pro-components'
import { MoneyCell } from '@/components/MoneyCell'
import { StatusTag } from '@/components/StatusTag'
import { WorkflowSteps } from '@/components/WorkflowSteps'
import { formatDate } from '@/utils/format'
import { getPriorityLabel } from '../utils/formatters'

const { Text } = Typography

interface GeneralTabProps {
  invoice: any
  amounts: {
    totalAmount: number
    taxRate: number
    taxAmount: number
    subtotal: number
    balance: number
    paymentsByStatus: Record<string, number>
  }
}

export const GeneralTab: React.FC<GeneralTabProps> = ({ invoice, amounts }) => {
  const { totalAmount, taxRate, taxAmount, subtotal, balance, paymentsByStatus } = amounts

  const paidAmount = paymentsByStatus['completed'] || 0
  const pendingAmount = paymentsByStatus['pending'] || 0
  const processingAmount = paymentsByStatus['processing'] || 0
  const failedAmount = paymentsByStatus['failed'] || 0
  const cancelledAmount = paymentsByStatus['cancelled'] || 0
  const totalPaid = paidAmount

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={16}>
        <ProDescriptions
          title="Основные данные"
          dataSource={invoice}
          columns={[
            {
              title: 'Номер счета',
              key: 'invoice_number',
              dataIndex: 'invoice_number',
              render: (text) => text || '—',
            },
            {
              title: 'Описание',
              key: 'description',
              dataIndex: 'description',
              span: 3,
              render: (text) => text || '—',
            },
            {
              title: 'Поставщик',
              key: 'supplier',
              render: () => invoice.supplier?.name ?? (invoice.contractor?.name || '—'),
            },
            {
              title: 'Проект',
              key: 'project',
              render: () => invoice.project?.name || '—',
            },
            {
              title: 'Плательщик',
              key: 'payer',
              render: () => invoice.payer?.name || '—',
            },
            {
              title: 'Статус',
              key: 'status',
              render: () => <StatusTag status={invoice.status} type="invoice" />,
            },
            {
              title: 'Дата создания',
              key: 'created_at',
              render: () => formatDate(invoice.created_at),
            },
            {
              title: 'Дата счета',
              key: 'invoice_date',
              render: () => formatDate(invoice.invoice_date),
            },
            {
              title: 'Поставка дней после оплаты',
              key: 'delivery_days',
              render: () => invoice.delivery_days || '—',
            },
            {
              title: 'Прогнозная дата поставки',
              key: 'estimated_delivery_date',
              render: () => {
                if (invoice.estimated_delivery_date) {
                  return formatDate(invoice.estimated_delivery_date)
                }
                if (invoice.delivery_days && invoice.delivery_days > 0) {
                  const deliveryDate = new Date()
                  deliveryDate.setDate(deliveryDate.getDate() + invoice.delivery_days)
                  return formatDate(deliveryDate.toISOString())
                }
                return '—'
              },
            },
            {
              title: 'Тип счета',
              key: 'invoice_type',
              render: () => {
                const type = invoice.invoice_type
                if (!type) {return '—'}
                if (typeof type === 'object' && type.name) {return type.name}
                if (typeof type === 'string') {return type}
                return '—'
              },
            },
            {
              title: 'МОЛ (Материально ответственное лицо)',
              key: 'responsible_person',
              render: () => {
                if (invoice.material_responsible_person?.full_name) {
                  const mol = invoice.material_responsible_person
                  let display = mol.full_name
                  if (mol.position) {
                    display += ` (${mol.position})`
                  }
                  return display
                }

                if (invoice.material_responsible_person_id !== null && invoice.material_responsible_person_id !== undefined) {
                  return `ID: ${invoice.material_responsible_person_id}`
                }

                const person = invoice.responsible_person ?? invoice.responsible_person_id ?? invoice.mol

                if (!person) {
                  if (invoice.responsible_user?.full_name) {
                    return invoice.responsible_user.full_name
                  }
                  return 'Не указан'
                }

                if (typeof person === 'object') {
                  if (person.full_name) {return person.full_name}
                  if (person.name) {return person.name}
                  if (person.email) {return person.email}
                }

                if (typeof person === 'string') {return person}

                return 'Не указан'
              },
              span: 2,
            },
            {
              title: 'Приоритет',
              key: 'priority',
              render: () => {
                const priority = invoice.priority
                if (!priority) {return 'Средний'}

                if (typeof priority === 'object') {
                  if (priority.name_ru) {return priority.name_ru}
                  if (priority.label) {return getPriorityLabel(priority.label)}
                  if (priority.name) {return getPriorityLabel(priority.name)}
                  if (priority.value) {return getPriorityLabel(priority.value)}
                }

                if (typeof priority === 'string') {
                  return getPriorityLabel(priority)
                }

                return 'Средний'
              },
            },
            {
              title: 'Примечания',
              key: 'notes',
              dataIndex: 'notes',
              span: 3,
              render: (text) => text || '—',
            },
          ]}
          column={3}
          size="small"
        />

        {invoice.workflow_steps && (
          <Card title="Процесс согласования" style={{ marginTop: 16 }}>
            <WorkflowSteps
              steps={invoice.workflow_steps}
              currentStepId={invoice.current_step_id}
              direction="horizontal"
              showDetails
            />
          </Card>
        )}
      </Col>

      <Col xs={24} lg={8}>
        <ProCard title="Финансовая информация" size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">Сумма без НДС:</Text>
              <MoneyCell
                amount={subtotal}
                currency={invoice.currency || 'RUB'}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text type="secondary">НДС {taxRate > 0 ? `(${taxRate}%)` : ''}:</Text>
              <MoneyCell
                amount={taxAmount}
                currency={invoice.currency || 'RUB'}
                type="secondary"
              />
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>Общая сумма счета:</Text>
              <MoneyCell
                amount={totalAmount}
                currency={invoice.currency || 'RUB'}
                strong
              />
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <div style={{ marginBottom: 8 }}>
              <Text strong>Платежи по статусам:</Text>
            </div>

            {paidAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16 }}>
                <Text type="success">✓ Оплачено:</Text>
                <MoneyCell
                  amount={paidAmount}
                  currency={invoice.currency}
                  type="success"
                />
              </div>
            )}

            {pendingAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16 }}>
                <Text type="warning">⏳ Ожидает:</Text>
                <MoneyCell
                  amount={pendingAmount}
                  currency={invoice.currency}
                  type="warning"
                />
              </div>
            )}

            {processingAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16 }}>
                <Text style={{ color: '#1890ff' }}>⚡ Обрабатывается:</Text>
                <MoneyCell
                  amount={processingAmount}
                  currency={invoice.currency}
                />
              </div>
            )}

            {failedAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16 }}>
                <Text type="danger">✗ Ошибка:</Text>
                <MoneyCell
                  amount={failedAmount}
                  currency={invoice.currency}
                  type="danger"
                />
              </div>
            )}

            {cancelledAmount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 16 }}>
                <Text type="secondary">⊘ Отменено:</Text>
                <MoneyCell
                  amount={cancelledAmount}
                  currency={invoice.currency}
                  type="secondary"
                />
              </div>
            )}

            <Divider style={{ margin: '8px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>Остаток к оплате:</Text>
              <MoneyCell
                amount={balance}
                currency={invoice.currency}
                type={balance > 0 ? 'warning' : balance < 0 ? 'danger' : 'success'}
                strong
              />
            </div>

            {balance !== 0 && (
              <div style={{ marginTop: 4, paddingLeft: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {totalAmount.toLocaleString('ru-RU')} - {totalPaid.toLocaleString('ru-RU')} = {balance.toLocaleString('ru-RU')}
                </Text>
              </div>
            )}
          </Space>
        </ProCard>
      </Col>
    </Row>
  )
}