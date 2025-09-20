import React from 'react'
import { Modal, Select, Card, Space, Typography, Spin, Title as AntTitle } from 'antd'
import {
  RocketOutlined,
  SendOutlined,
  CreditCardOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatCurrency } from '@/utils/format'

const { Text } = Typography

interface ApprovalModalProps {
  visible: boolean
  payment: any
  invoice: any
  workflows: any[]
  loadingWorkflows: boolean
  selectedWorkflow: string | null
  onWorkflowChange: (value: string) => void
  onOk: () => void
  onCancel: () => void
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  visible,
  payment,
  invoice,
  workflows,
  loadingWorkflows,
  selectedWorkflow,
  onWorkflowChange,
  onOk,
  onCancel
}) => {
  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 6,
            backgroundColor: '#f0f9ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <RocketOutlined style={{ fontSize: 16, color: '#0ea5e9' }} />
          </div>
          <div>
            <AntTitle level={5} style={{ margin: 0, color: '#1f2937', fontSize: 16 }}>
              Отправка платежа на согласование
            </AntTitle>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Выберите процесс согласования для обработки платежа
            </Text>
          </div>
        </div>
      }
      open={visible}
      onOk={onOk}
      onCancel={onCancel}
      okText={
        <Space>
          <SendOutlined />
          Отправить на согласование
        </Space>
      }
      cancelText="Отмена"
      confirmLoading={loadingWorkflows}
      width={700}
      okButtonProps={{
        disabled: !selectedWorkflow,
        style: { height: 36, borderRadius: 6, fontWeight: 500, fontSize: 13 }
      }}
      cancelButtonProps={{
        style: { height: 36, borderRadius: 6, fontSize: 13 }
      }}
      styles={{
        header: { paddingBottom: 16, borderBottom: '1px solid #f0f0f0' },
        body: { paddingTop: 16, paddingBottom: 8 },
        footer: { paddingTop: 16, borderTop: '1px solid #f0f0f0' }
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Payment info */}
        {payment && (
          <Card
            size="small"
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              backgroundColor: '#fafafa'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid #e5e7eb'
              }}>
                <CreditCardOutlined style={{ fontSize: 16, color: '#6b7280' }} />
              </div>
              <div style={{ flex: 1 }}>
                <AntTitle level={5} style={{ margin: 0, color: '#374151', fontSize: 14 }}>
                  Платеж {payment.internal_number || `#${payment.id}`}
                </AntTitle>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {dayjs(payment.payment_date).format('DD.MM.YYYY')}
                </Text>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#059669',
                  lineHeight: 1
                }}>
                  {formatCurrency(
                    payment.total_amount || 0,
                    payment.currency || invoice?.currency || 'RUB'
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Workflow selection */}
        <Card
          title={
            <Space size={12}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                backgroundColor: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <TeamOutlined style={{ fontSize: 14, color: '#6b7280' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
                Процесс согласования
              </span>
            </Space>
          }
          style={{
            border: '1px solid #e5e7eb',
            borderRadius: 12
          }}
        >
          {loadingWorkflows ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '24px 0'
            }}>
              <Spin size="large" />
              <span style={{ marginLeft: 12, color: '#6b7280' }}>
                Загрузка процессов согласования...
              </span>
            </div>
          ) : workflows.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 16px' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 8,
                backgroundColor: '#fef3cd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px'
              }}>
                <ExclamationCircleOutlined style={{ fontSize: 20, color: '#f59e0b' }} />
              </div>
              <AntTitle level={5} style={{ color: '#374151', margin: '0 0 8px', fontSize: 14 }}>
                Нет доступных процессов
              </AntTitle>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Не найдено активных процессов согласования для платежей.<br />
                Обратитесь к администратору системы.
              </Text>
            </div>
          ) : (
            <div style={{ marginTop: 12 }}>
              <Select
                placeholder="Выберите процесс согласования"
                value={selectedWorkflow}
                onChange={onWorkflowChange}
                size="middle"
                style={{ width: '100%' }}
                suffixIcon={<SafetyCertificateOutlined style={{ color: '#6b7280' }} />}
                dropdownStyle={{ borderRadius: 8 }}
              >
                {workflows.map(workflow => (
                  <Select.Option key={workflow.id} value={workflow.id}>
                    <div style={{ padding: '8px 0' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginBottom: workflow.description ? 4 : 0
                      }}>
                        <div style={{
                          width: 24,
                          height: 24,
                          borderRadius: 4,
                          backgroundColor: '#dbeafe',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <ClockCircleOutlined style={{ fontSize: 12, color: '#3b82f6' }} />
                        </div>
                        <Text strong style={{ fontSize: 13, color: '#1f2937' }}>
                          {workflow.name}
                        </Text>
                      </div>
                      {workflow.description && (
                        <Text
                          type="secondary"
                          style={{
                            fontSize: 11,
                            marginLeft: 44,
                            display: 'block',
                            lineHeight: 1.4
                          }}
                        >
                          {workflow.description}
                        </Text>
                      )}
                    </div>
                  </Select.Option>
                ))}
              </Select>

              {selectedWorkflow && (
                <div style={{
                  marginTop: 12,
                  padding: 12,
                  backgroundColor: '#f0f9ff',
                  borderRadius: 8,
                  border: '1px solid #bfdbfe'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <InfoCircleOutlined style={{ color: '#0ea5e9', fontSize: 14 }} />
                    <Text strong style={{ color: '#0c4a6e', fontSize: 12 }}>
                      Информация о процессе
                    </Text>
                  </div>
                  <Text style={{ color: '#0c4a6e', fontSize: 11, marginTop: 4, display: 'block' }}>
                    После отправки платеж будет направлен на согласование выбранным участникам процесса.
                    Вы получите уведомление о результатах согласования.
                  </Text>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </Modal>
  )
}