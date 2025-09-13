/**
 * Simplified InvoiceView page component
 */

import React from 'react'
import { Spin, Tabs, Button, message } from 'antd'
import { PageContainer } from '@ant-design/pro-layout'
import { EditOutlined } from '@ant-design/icons'
import { useInvoiceView } from './hooks/useInvoiceView'
import { usePaymentModal } from './hooks/usePaymentModal'
import { GeneralTab } from './components/GeneralTab'
import { DocumentsTab } from './components/DocumentsTab'
import { formatDate } from '@/utils/format'
import type { InvoiceViewPageProps } from './types'

// Temporary imports - will be moved to separate components
import { Card, Timeline, Typography } from 'antd'
import { ProTable } from '@ant-design/pro-components'
import { MoneyCell } from '@/components/MoneyCell'
import { StatusTag } from '@/components/StatusTag'
import { PlusOutlined } from '@ant-design/icons'

const { Text } = Typography

export const InvoiceViewPage: React.FC<InvoiceViewPageProps> = ({
  userId: propUserId,
  companyId
}) => {
  const {
    invoice,
    workflowHistory,
    approvalHistory,
    documents,
    amounts,
    invoiceLoading,
    historyLoading,
    approvalHistoryLoading,
    documentsLoading,
    id,
    userId,
    navigate,
    activeTab,
    handleTabChange,
    paymentIdFromUrl,
    refetchInvoice
  } = useInvoiceView()

  const {
    paymentModalVisible,
    setPaymentModalVisible,
    paymentForm,
    paymentFiles,
    setPaymentFiles,
    createPaymentMutation,
    calculateAmounts,
    handleAddPayment,
    openPaymentModal
  } = usePaymentModal(invoice, propUserId || userId, refetchInvoice)

  // Handle loading state
  if (invoiceLoading) {
    return (
      <PageContainer>
        <Spin size="large" style={{ display: 'block', textAlign: 'center', marginTop: 100 }} />
      </PageContainer>
    )
  }

  if (!invoice) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', marginTop: 100 }}>
          <Text type="secondary">Счет не найден</Text>
        </div>
      </PageContainer>
    )
  }

  // Tab items configuration
  const tabItems = [
    {
      key: 'general',
      label: 'Общая информация',
      children: <GeneralTab invoice={invoice} amounts={amounts} />
    },
    {
      key: 'documents',
      label: `Документы${documents ? ` (${documents.length})` : ''}`,
      children: <DocumentsTab documents={documents} onDocumentsChange={refetchInvoice} />
    },
    {
      key: 'payments',
      label: `Платежи (${invoice.payments?.length || 0})`,
      children: (
        <ProTable
          columns={[
            {
              title: 'Номер',
              dataIndex: 'reference',
              key: 'reference',
              width: 150,
            },
            {
              title: 'Дата платежа',
              dataIndex: 'payment_date',
              key: 'payment_date',
              width: 120,
              render: (date) => formatDate(date),
            },
            {
              title: 'Сумма',
              dataIndex: 'amount_with_vat',
              key: 'amount',
              width: 150,
              render: (amount, record) => (
                <MoneyCell amount={amount} currency={record.currency || 'RUB'} />
              ),
            },
            {
              title: 'Статус',
              dataIndex: 'status',
              key: 'status',
              width: 120,
              render: (status) => <StatusTag status={status} type="payment" />,
            },
          ]}
          dataSource={invoice.payments || []}
          rowKey="id"
          search={false}
          pagination={false}
          toolBarRender={() => [
            <Button
              key="add"
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => openPaymentModal(amounts.balance)}
              disabled={amounts.balance <= 0}
            >
              Добавить платеж
            </Button>,
          ]}
        />
      )
    },
    {
      key: 'history',
      label: 'История изменений',
      children: (
        <Card title="История изменений">
          {workflowHistory && workflowHistory.length > 0 ? (
            <Timeline
              mode="left"
              items={workflowHistory.map((event: any) => ({
                children: (
                  <div>
                    <Text strong>{event.title}</Text>
                    <br />
                    <Text type="secondary">{formatDate(event.created_at)}</Text>
                  </div>
                ),
              }))}
            />
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Text type="secondary">История изменений пуста</Text>
            </div>
          )}
        </Card>
      )
    }
  ]

  return (
    <>
      <style>
        {`
          .highlighted-row {
            background-color: #e6f7ff !important;
            animation: highlight 1s ease-in-out;
          }

          @keyframes highlight {
            0% { background-color: #bae7ff; }
            100% { background-color: #e6f7ff; }
          }

          .highlighted-row:hover td {
            background-color: #d6efff !important;
          }
        `}
      </style>
      <PageContainer
        title={`Счет №${invoice.invoice_number} от ${formatDate(invoice.invoice_date)}`}
        subTitle={invoice.title}
        extra={[
          <Button
            key="edit"
            icon={<EditOutlined />}
            onClick={() => navigate(`/invoices/${id}/edit`)}
            disabled={!['draft', 'rejected'].includes(invoice.status)}
          >
            Редактировать
          </Button>,
        ]}
        onBack={() => navigate('/invoices')}
      >
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          items={tabItems}
        />
      </PageContainer>
    </>
  )
}

export default InvoiceViewPage