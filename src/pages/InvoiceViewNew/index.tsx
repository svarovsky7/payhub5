/**
 * Рефакторинговая версия страницы просмотра счета
 * Разбита на модульные компоненты и хуки
 */

import React, { useCallback, useState, useEffect } from 'react'
import { Tabs, Button, Space, message, Modal, Form, Spin } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/models/auth'
import { useInvoiceView } from './hooks/useInvoiceView'
import { useInvoicePayments } from './hooks/useInvoicePayments'
import { useContractorsList } from '@/services/hooks/useContractors'
import { useProjectsList } from '@/services/hooks/useProjects'
import { useInvoiceTypesList } from '@/services/hooks/useInvoiceTypes'
import { useMaterialResponsiblePersonsList } from '@/services/hooks/useMaterialResponsiblePersons'
import { useCurrencies, usePriorities } from '@/services/hooks/useEnums'
import { usePaymentTypes } from '@/services/hooks/usePaymentTypes'
import { InvoiceFileStorage } from '@/services/invoices/file-storage'

// Components
import { SummaryHeader } from './components/SummaryHeader'
import { FinanceStats } from './components/FinanceStats'
import { InvoiceInfoForm } from './components/InvoiceInfoForm'
import { PaymentTable } from './components/PaymentTable'
import { AttachmentSection } from './components/AttachmentSection'
import { HistoryTimeline } from './components/HistoryTimeline'

// Modals
import { PaymentModal } from './components/modals/PaymentModal'
import { PaymentEditModal } from './components/modals/PaymentEditModal'
import { ApprovalModal } from './components/modals/ApprovalModal'
import { FilePreviewModal } from './components/modals/FilePreviewModal'

import './styles.css'

export const InvoiceViewNew: React.FC = () => {
  const { user } = useAuthStore()

  // Main invoice hook
  const {
    id,
    searchParams,
    highlightPaymentId,
    showReturnButton,
    form,
    isEditing,
    hasChanges,
    deliveryDate,
    activeTab,
    financialSummary,
    invoice,
    invoiceLoading,
    paymentsResponse,
    loadingPayments,
    historyData,
    loadingHistory,
    handleFormChange,
    handleTabChange,
    handleSave,
    handleCancel,
    refetchInvoice,
    refetchPayments,
    setIsEditing,
    setHasChanges,
    setDeliveryDate
  } = useInvoiceView()

  // Payments hook
  const {
    paymentForm,
    paymentEditForm,
    paymentModalVisible,
    setPaymentModalVisible,
    editPaymentModalVisible,
    setEditPaymentModalVisible,
    approvalModalVisible,
    setApprovalModalVisible,
    editingPayment,
    selectedPaymentForApproval,
    workflows,
    loadingWorkflows,
    selectedWorkflow,
    setSelectedWorkflow,
    handleAddPayment,
    handleCreatePayment,
    handleEditPayment,
    handleSaveEditedPayment,
    handleDeletePayment,
    handleSendToApproval,
    handleStartApprovalWorkflow
  } = useInvoicePayments(id)

  // Documents state
  const [documents, setDocuments] = useState<any[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewFile, setPreviewFile] = useState<any>(null)

  // Load related data
  const { data: contractorsResponse, isLoading: loadingContractors } = useContractorsList()
  const { data: projectsResponse, isLoading: loadingProjects } = useProjectsList()
  const { data: invoiceTypes, isLoading: loadingInvoiceTypes } = useInvoiceTypesList()
  const { data: materialResponsiblePersons, isLoading: loadingMRPs } = useMaterialResponsiblePersonsList({ is_active: true })
  const { data: currencies, isLoading: loadingCurrencies } = useCurrencies()
  const { data: priorities, isLoading: loadingPriorities } = usePriorities()
  const { data: paymentTypes = [], isLoading: loadingPaymentTypes } = usePaymentTypes()

  // Extract data from responses
  const contractors = contractorsResponse?.data ?? []
  const suppliers = contractors.filter((c: any) => c.type_id === 4)
  const payers = contractors.filter((c: any) => c.type_id === 2)
  const projects = projectsResponse ?? []
  const payments = paymentsResponse?.data || []

  // Load documents
  const loadDocuments = useCallback(async () => {
    if (!invoice?.id) return

    setLoadingDocuments(true)
    try {
      console.log('[InvoiceViewNew] Loading documents for invoice:', invoice.id)
      const docs = await InvoiceFileStorage.getInvoiceDocuments(invoice.id)
      console.log('[InvoiceViewNew] Documents loaded:', docs)
      setDocuments(docs)
    } catch (error) {
      console.error('[InvoiceViewNew] Error loading documents:', error)
      message.error('Ошибка при загрузке документов')
    } finally {
      setLoadingDocuments(false)
    }
  }, [invoice?.id])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  // Document handlers
  const handleUploadDocument = async (file: any) => {
    if (!invoice?.id) return

    setUploadingFile(true)
    try {
      console.log('[InvoiceViewNew] Uploading document:', file.name)
      await InvoiceFileStorage.uploadInvoiceDocument(invoice.id, file, user?.id)
      message.success(`Файл ${file.name} успешно загружен`)
      await loadDocuments()
    } catch (error) {
      console.error('[InvoiceViewNew] Upload error:', error)
      message.error(`Ошибка при загрузке файла ${file.name}`)
    } finally {
      setUploadingFile(false)
    }
  }

  const handlePreviewDocument = async (doc: any) => {
    setPreviewFile(doc)
    setPreviewModalVisible(true)
  }

  const handleDownloadDocument = async (doc: any) => {
    try {
      await InvoiceFileStorage.downloadDocument(doc.storage_path, doc.original_name)
    } catch (error) {
      console.error('[InvoiceViewNew] Download error:', error)
      message.error('Ошибка при скачивании файла')
    }
  }

  const handleDeleteDocument = async (doc: any) => {
    Modal.confirm({
      title: 'Удаление документа',
      content: `Вы уверены, что хотите удалить документ "${doc.original_name}"?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          await InvoiceFileStorage.deleteDocument(doc.id)
          message.success('Документ удален')
          await loadDocuments()
        } catch (error) {
          console.error('[InvoiceViewNew] Delete document error:', error)
          message.error('Ошибка при удалении документа')
        }
      }
    })
  }

  // Save handler
  const handleSaveWithUpdate = async () => {
    try {
      const values = await form.validateFields()
      console.log('[InvoiceViewNew] Saving invoice:', values)

      // Update invoice logic here
      // await updateInvoiceMutation.mutateAsync({ id, ...values })

      message.success('Изменения сохранены')
      setIsEditing(false)
      setHasChanges(false)
      await refetchInvoice()
    } catch (error) {
      console.error('[InvoiceViewNew] Save error:', error)
      message.error('Ошибка при сохранении')
    }
  }

  const handleEdit = () => {
    setIsEditing(true)
  }

  // Loading state
  if (invoiceLoading || loadingContractors || loadingProjects) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!invoice) {
    return <div>Счет не найден</div>
  }

  const tabItems = [
    {
      key: 'info',
      label: 'Информация',
      children: (
        <InvoiceInfoForm
          form={form}
          isEditing={isEditing}
          invoice={invoice}
          suppliers={suppliers}
          payers={payers}
          projects={projects}
          invoiceTypes={invoiceTypes || []}
          materialResponsiblePersons={materialResponsiblePersons || []}
          priorities={priorities || []}
          currencies={currencies || []}
          deliveryDate={deliveryDate}
          onFormChange={handleFormChange}
        />
      )
    },
    {
      key: 'finance',
      label: 'Финансы',
      children: <FinanceStats summary={financialSummary} currency={invoice?.currency} />
    },
    {
      key: 'payments',
      label: `Платежи (${payments.length})`,
      children: (
        <>
          <div style={{ marginBottom: 16 }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddPayment}
            >
              Добавить платеж
            </Button>
          </div>
          <PaymentTable
            payments={payments}
            loading={loadingPayments}
            highlightPaymentId={highlightPaymentId}
            onEdit={handleEditPayment}
            onDelete={handleDeletePayment}
            onSendToApproval={handleSendToApproval}
          />
        </>
      )
    },
    {
      key: 'documents',
      label: `Документы (${documents.length})`,
      children: (
        <AttachmentSection
          documents={documents}
          loading={loadingDocuments}
          uploading={uploadingFile}
          onUpload={handleUploadDocument}
          onPreview={handlePreviewDocument}
          onDownload={handleDownloadDocument}
          onDelete={handleDeleteDocument}
          editable={isEditing}
        />
      )
    },
    {
      key: 'history',
      label: 'История',
      children: (
        <HistoryTimeline
          history={historyData || []}
          loading={loadingHistory}
        />
      )
    }
  ]

  return (
    <div style={{ padding: '0 24px' }}>
      <SummaryHeader
        invoice={invoice}
        isEditing={isEditing}
        hasChanges={hasChanges}
        showReturnButton={showReturnButton}
        onSave={handleSaveWithUpdate}
        onCancel={handleCancel}
        onEdit={handleEdit}
      />

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabItems}
      />

      {/* Payment Modal */}
      {paymentModalVisible && (
        <PaymentModal
          visible={paymentModalVisible}
          invoice={invoice}
          paymentsResponse={paymentsResponse}
          paymentTypes={paymentTypes}
          form={paymentForm}
          onOk={() => handleCreatePayment(invoice)}
          onCancel={() => {
            setPaymentModalVisible(false)
            paymentForm.resetFields()
          }}
        />
      )}

      {/* Edit Payment Modal */}
      {editPaymentModalVisible && (
        <PaymentEditModal
          visible={editPaymentModalVisible}
          payment={editingPayment}
          invoice={invoice}
          paymentsResponse={paymentsResponse}
          paymentTypes={paymentTypes}
          form={paymentEditForm}
          onOk={handleSaveEditedPayment}
          onCancel={() => {
            setEditPaymentModalVisible(false)
            paymentEditForm.resetFields()
          }}
        />
      )}

      {/* Approval Modal */}
      {approvalModalVisible && (
        <ApprovalModal
          visible={approvalModalVisible}
          payment={selectedPaymentForApproval}
          invoice={invoice}
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
      )}

      {/* File Preview Modal */}
      {previewModalVisible && (
        <FilePreviewModal
          visible={previewModalVisible}
          file={previewFile}
          onCancel={() => {
            setPreviewModalVisible(false)
            setPreviewFile(null)
          }}
          onDownload={() => handleDownloadDocument(previewFile)}
        />
      )}
    </div>
  )
}