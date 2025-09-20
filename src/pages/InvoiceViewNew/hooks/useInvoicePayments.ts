import { useCallback, useState } from 'react'
import { Form, message, Modal } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { useCreatePayment, useDeletePayment, useUpdatePayment } from '@/services/hooks/usePayments'
import { InvoiceWorkflowService } from '@/services/invoices/workflow'

export const useInvoicePayments = (invoiceId?: string) => {
  const queryClient = useQueryClient()
  const [paymentForm] = Form.useForm()
  const [paymentEditForm] = Form.useForm()

  // Modals state
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [editPaymentModalVisible, setEditPaymentModalVisible] = useState(false)
  const [approvalModalVisible, setApprovalModalVisible] = useState(false)

  // Data state
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [selectedPaymentForApproval, setSelectedPaymentForApproval] = useState<any>(null)
  const [workflows, setWorkflows] = useState<any[]>([])
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState(0)

  // Mutations
  const createPaymentMutation = useCreatePayment()
  const updatePaymentMutation = useUpdatePayment()
  const deletePaymentMutation = useDeletePayment()

  // Open payment modal
  const handleAddPayment = useCallback(() => {
    console.log('[useInvoicePayments] Opening payment modal')
    paymentForm.resetFields()
    paymentForm.setFieldsValue({
      payment_date: new Date().toISOString().split('T')[0]
    })
    setPaymentModalVisible(true)
  }, [paymentForm])

  // Create payment
  const handleCreatePayment = useCallback(async (invoice: any) => {
    try {
      const values = await paymentForm.validateFields()
      console.log('[useInvoicePayments] Creating payment:', values)

      const paymentData = {
        invoice_id: invoice.id,
        internal_number: values.internal_number,
        payment_date: values.payment_date,
        payment_type_id: values.payment_type_id,
        total_amount: values.total_amount || 0,
        currency: invoice.currency || 'RUB',
        status: 'draft',
        comment: values.comment
      }

      await createPaymentMutation.mutateAsync(paymentData)
      message.success('Платеж успешно создан')
      setPaymentModalVisible(false)
      paymentForm.resetFields()

      // Refresh queries
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    } catch (error) {
      console.error('[useInvoicePayments] Create payment error:', error)
      message.error('Ошибка при создании платежа')
    }
  }, [paymentForm, createPaymentMutation, queryClient, invoiceId])

  // Edit payment
  const handleEditPayment = useCallback((payment: any) => {
    console.log('[useInvoicePayments] Editing payment:', payment)
    setEditingPayment(payment)
    paymentEditForm.setFieldsValue({
      internal_number: payment.internal_number,
      payment_date: payment.payment_date,
      payment_type_id: payment.payment_type_id,
      total_amount: payment.total_amount,
      comment: payment.comment
    })
    setEditPaymentModalVisible(true)
  }, [paymentEditForm])

  // Save edited payment
  const handleSaveEditedPayment = useCallback(async () => {
    try {
      const values = await paymentEditForm.validateFields()
      console.log('[useInvoicePayments] Saving edited payment:', values)

      await updatePaymentMutation.mutateAsync({
        id: editingPayment.id,
        ...values
      })

      message.success('Платеж успешно обновлен')
      setEditPaymentModalVisible(false)
      setEditingPayment(null)
      paymentEditForm.resetFields()

      // Refresh queries
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    } catch (error) {
      console.error('[useInvoicePayments] Update payment error:', error)
      message.error('Ошибка при обновлении платежа')
    }
  }, [paymentEditForm, editingPayment, updatePaymentMutation, queryClient, invoiceId])

  // Delete payment
  const handleDeletePayment = useCallback(async (payment: any) => {
    Modal.confirm({
      title: 'Удаление платежа',
      content: `Вы уверены, что хотите удалить платеж ${payment.internal_number || `#${payment.id}`}?`,
      okText: 'Удалить',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          await deletePaymentMutation.mutateAsync(payment.id)
          message.success('Платеж удален')

          // Refresh queries
          await queryClient.invalidateQueries({ queryKey: ['payments'] })
          await queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
        } catch (error) {
          console.error('[useInvoicePayments] Delete payment error:', error)
          message.error('Ошибка при удалении платежа')
        }
      }
    })
  }, [deletePaymentMutation, queryClient, invoiceId])

  // Send to approval
  const handleSendToApproval = useCallback(async (payment: any) => {
    console.log('[useInvoicePayments] Sending payment to approval:', payment)
    setSelectedPaymentForApproval(payment)
    setLoadingWorkflows(true)

    try {
      const workflows = await InvoiceWorkflowService.getWorkflowsForPayments()
      console.log('[useInvoicePayments] Available workflows:', workflows)
      setWorkflows(workflows)
      setApprovalModalVisible(true)
    } catch (error) {
      console.error('[useInvoicePayments] Load workflows error:', error)
      message.error('Ошибка при загрузке процессов согласования')
    } finally {
      setLoadingWorkflows(false)
    }
  }, [])

  // Start approval workflow
  const handleStartApprovalWorkflow = useCallback(async () => {
    if (!selectedPaymentForApproval || !selectedWorkflow) {
      message.warning('Выберите процесс согласования')
      return
    }

    try {
      console.log('[useInvoicePayments] Starting approval workflow:', {
        payment: selectedPaymentForApproval,
        workflow: selectedWorkflow
      })

      await updatePaymentMutation.mutateAsync({
        id: selectedPaymentForApproval.id,
        status: 'pending',
        workflow_id: selectedWorkflow
      })

      message.success('Платеж отправлен на согласование')
      setApprovalModalVisible(false)
      setSelectedPaymentForApproval(null)
      setSelectedWorkflow(null)

      // Refresh queries
      await queryClient.invalidateQueries({ queryKey: ['payments'] })
      await queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
    } catch (error) {
      console.error('[useInvoicePayments] Start workflow error:', error)
      message.error('Ошибка при отправке на согласование')
    }
  }, [selectedPaymentForApproval, selectedWorkflow, updatePaymentMutation, queryClient, invoiceId])

  return {
    // Forms
    paymentForm,
    paymentEditForm,

    // Modal state
    paymentModalVisible,
    setPaymentModalVisible,
    editPaymentModalVisible,
    setEditPaymentModalVisible,
    approvalModalVisible,
    setApprovalModalVisible,

    // Data state
    editingPayment,
    setEditingPayment,
    selectedPaymentForApproval,
    setSelectedPaymentForApproval,
    workflows,
    loadingWorkflows,
    selectedWorkflow,
    setSelectedWorkflow,
    currentPaymentAmount,
    setCurrentPaymentAmount,

    // Actions
    handleAddPayment,
    handleCreatePayment,
    handleEditPayment,
    handleSaveEditedPayment,
    handleDeletePayment,
    handleSendToApproval,
    handleStartApprovalWorkflow
  }
}