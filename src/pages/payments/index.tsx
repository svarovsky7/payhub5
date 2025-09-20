import React, { useState } from 'react'
import { Typography } from 'antd'
import { usePaymentsPage } from './hooks/usePaymentsPage'
import { PaymentsTable } from './components/PaymentsTable'
import { getPaymentsFilters } from './components/PaymentsFilters'
import { ApprovalModal } from './components/ApprovalModal'
import { DataTable } from '@/components/table'

const { Title } = Typography

interface PaymentsPageProps {
  embedded?: boolean
}

const PaymentsPage: React.FC<PaymentsPageProps> = ({ embedded = false }) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const {
    // Data
    payments,
    total,
    suppliers,
    payers,
    projects,
    paymentTypes,

    // Loading states
    loadingPayments,
    loadingContractors,
    loadingProjects,
    loadingPaymentTypes,
    loadingWorkflows,

    // Selection
    selectedRowKeys,
    setSelectedRowKeys,

    // Modal state
    approvalModalVisible,
    setApprovalModalVisible,
    selectedPayment,
    workflows,
    selectedWorkflow,
    setSelectedWorkflow,

    // Actions
    handleConfirmPayment,
    handleCancelPayment,
    handleDeletePayment,
    handleSendToApproval,
    handleStartApprovalWorkflow,
    bulkActions
  } = usePaymentsPage()

  const filters = getPaymentsFilters(
    suppliers,
    payers,
    projects,
    paymentTypes
  )

  const handlePageChange = (page: number, size: number) => {
    setCurrentPage(page)
    setPageSize(size)
  }

  const loading = loadingPayments || loadingContractors || loadingProjects || loadingPaymentTypes

  if (embedded) {
    return (
      <>
        <PaymentsTable
          data={payments}
          loading={loading}
          total={total}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={setSelectedRowKeys}
          onConfirm={handleConfirmPayment}
          onCancel={handleCancelPayment}
          onDelete={handleDeletePayment}
          onSendToApproval={handleSendToApproval}
          bulkActions={bulkActions}
        />

        <ApprovalModal
          visible={approvalModalVisible}
          payment={selectedPayment}
          workflows={workflows}
          loadingWorkflows={loadingWorkflows}
          selectedWorkflow={selectedWorkflow}
          onWorkflowChange={setSelectedWorkflow}
          onOk={handleStartApprovalWorkflow}
          onCancel={() => {
            setApprovalModalVisible(false)
            setSelectedWorkflow(null)
          }}
        />
      </>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2} style={{ marginBottom: 24 }}>
        Управление платежами
      </Title>

      <DataTable
        title="Платежи"
        filters={filters}
        columns={[]} // Columns are handled inside PaymentsTable
        dataSource={payments}
        loading={loading}
        rowKey="id"
        pagination={{
          total,
          pageSize,
          current: currentPage,
          onChange: handlePageChange,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: setSelectedRowKeys
        }}
        bulkActions={bulkActions}
      >
        <PaymentsTable
          data={payments}
          loading={loading}
          total={total}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          selectedRowKeys={selectedRowKeys}
          onSelectionChange={setSelectedRowKeys}
          onConfirm={handleConfirmPayment}
          onCancel={handleCancelPayment}
          onDelete={handleDeletePayment}
          onSendToApproval={handleSendToApproval}
          bulkActions={bulkActions}
        />
      </DataTable>

      <ApprovalModal
        visible={approvalModalVisible}
        payment={selectedPayment}
        workflows={workflows}
        loadingWorkflows={loadingWorkflows}
        selectedWorkflow={selectedWorkflow}
        onWorkflowChange={setSelectedWorkflow}
        onOk={handleStartApprovalWorkflow}
        onCancel={() => {
          setApprovalModalVisible(false)
          setSelectedWorkflow(null)
        }}
      />
    </div>
  )
}

export default PaymentsPage