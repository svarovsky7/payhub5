import { useState, useMemo, useCallback } from 'react'
import { message, Modal } from 'antd'
import { useNavigate } from 'react-router-dom'
import {
  usePaymentsList,
  useCancelPayment,
  useConfirmPayment,
  useDeletePayment
} from '@/services/hooks/usePayments'
import { useContractorsList } from '@/services/hooks/useContractors'
import { useProjectsList } from '@/services/hooks/useProjects'
import { usePaymentTypes } from '@/services/hooks/usePaymentTypes'
import { useAuthStore } from '@/models/auth'
import { PaymentWorkflowService } from '@/services/admin/payment-workflow'
import { EnumQueryService } from '@/services/hooks/useEnums'
import type { Payment } from '../types'
import type { BulkAction } from '@/components/table'

export const usePaymentsPage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // State
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [approvalModalVisible, setApprovalModalVisible] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [workflows, setWorkflows] = useState<any[]>([])
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)

  // Data hooks
  const { data: paymentsData, isLoading: loadingPayments, refetch: refetchPayments } = usePaymentsList()
  const { data: contractorsData, isLoading: loadingContractors } = useContractorsList()
  const { data: projectsData, isLoading: loadingProjects } = useProjectsList()
  const { data: paymentTypesData, isLoading: loadingPaymentTypes } = usePaymentTypes()

  // Mutations
  const confirmPaymentMutation = useConfirmPayment()
  const cancelPaymentMutation = useCancelPayment()
  const deletePaymentMutation = useDeletePayment()

  // Extract data
  const payments = paymentsData?.data || []
  const total = paymentsData?.total || 0
  const contractors = contractorsData?.data || []
  const suppliers = contractors.filter((c: any) => c.type_id === 4)
  const payers = contractors.filter((c: any) => c.type_id === 2)
  const projects = projectsData || []
  const paymentTypes = paymentTypesData || []

  // Actions
  const handleConfirmPayment = useCallback(async (payment: Payment) => {
    Modal.confirm({
      title: 'Подтверждение платежа',
      content: `Вы уверены, что хотите подтвердить платеж ${payment.internal_number || `#${payment.id}`}?`,
      okText: 'Подтвердить',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await confirmPaymentMutation.mutateAsync(payment.id)
          message.success('Платеж подтвержден')
          refetchPayments()
        } catch (error) {
          console.error('Error confirming payment:', error)
          message.error('Ошибка при подтверждении платежа')
        }
      }
    })
  }, [confirmPaymentMutation, refetchPayments])

  const handleCancelPayment = useCallback(async (payment: Payment) => {
    Modal.confirm({
      title: 'Отмена платежа',
      content: `Вы уверены, что хотите отменить платеж ${payment.internal_number || `#${payment.id}`}?`,
      okText: 'Отменить',
      cancelText: 'Закрыть',
      okType: 'danger',
      onOk: async () => {
        try {
          await cancelPaymentMutation.mutateAsync(payment.id)
          message.success('Платеж отменен')
          refetchPayments()
        } catch (error) {
          console.error('Error canceling payment:', error)
          message.error('Ошибка при отмене платежа')
        }
      }
    })
  }, [cancelPaymentMutation, refetchPayments])

  const handleDeletePayment = useCallback(async (payment: Payment) => {
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
          refetchPayments()
        } catch (error) {
          console.error('Error deleting payment:', error)
          message.error('Ошибка при удалении платежа')
        }
      }
    })
  }, [deletePaymentMutation, refetchPayments])

  const handleSendToApproval = useCallback(async (payment: Payment) => {
    setSelectedPayment(payment)
    setLoadingWorkflows(true)

    try {
      const availableWorkflows = await PaymentWorkflowService.getAvailableWorkflows()
      setWorkflows(availableWorkflows)
      setApprovalModalVisible(true)
    } catch (error) {
      console.error('Error loading workflows:', error)
      message.error('Ошибка при загрузке процессов согласования')
    } finally {
      setLoadingWorkflows(false)
    }
  }, [])

  const handleStartApprovalWorkflow = useCallback(async () => {
    if (!selectedPayment || !selectedWorkflow) {
      message.warning('Выберите процесс согласования')
      return
    }

    try {
      await PaymentWorkflowService.startWorkflow(selectedPayment.id, selectedWorkflow)
      message.success('Платеж отправлен на согласование')
      setApprovalModalVisible(false)
      setSelectedPayment(null)
      setSelectedWorkflow(null)
      refetchPayments()
    } catch (error) {
      console.error('Error starting workflow:', error)
      message.error('Ошибка при отправке на согласование')
    }
  }, [selectedPayment, selectedWorkflow, refetchPayments])

  // Bulk actions
  const handleBulkConfirm = useCallback(async () => {
    const selectedPayments = payments.filter(p => selectedRowKeys.includes(p.id))
    const confirmablePayments = selectedPayments.filter(p => p.status === 'pending')

    if (confirmablePayments.length === 0) {
      message.warning('Нет платежей для подтверждения')
      return
    }

    Modal.confirm({
      title: 'Массовое подтверждение',
      content: `Подтвердить ${confirmablePayments.length} платеж(ей)?`,
      okText: 'Подтвердить все',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          for (const payment of confirmablePayments) {
            await confirmPaymentMutation.mutateAsync(payment.id)
          }
          message.success(`Подтверждено ${confirmablePayments.length} платеж(ей)`)
          setSelectedRowKeys([])
          refetchPayments()
        } catch (error) {
          console.error('Error in bulk confirm:', error)
          message.error('Ошибка при массовом подтверждении')
        }
      }
    })
  }, [selectedRowKeys, payments, confirmPaymentMutation, refetchPayments])

  const handleBulkCancel = useCallback(async () => {
    const selectedPayments = payments.filter(p => selectedRowKeys.includes(p.id))
    const cancellablePayments = selectedPayments.filter(p => p.status === 'pending')

    if (cancellablePayments.length === 0) {
      message.warning('Нет платежей для отмены')
      return
    }

    Modal.confirm({
      title: 'Массовая отмена',
      content: `Отменить ${cancellablePayments.length} платеж(ей)?`,
      okText: 'Отменить все',
      cancelText: 'Закрыть',
      okType: 'danger',
      onOk: async () => {
        try {
          for (const payment of cancellablePayments) {
            await cancelPaymentMutation.mutateAsync(payment.id)
          }
          message.success(`Отменено ${cancellablePayments.length} платеж(ей)`)
          setSelectedRowKeys([])
          refetchPayments()
        } catch (error) {
          console.error('Error in bulk cancel:', error)
          message.error('Ошибка при массовой отмене')
        }
      }
    })
  }, [selectedRowKeys, payments, cancelPaymentMutation, refetchPayments])

  const handleBulkDelete = useCallback(async () => {
    const selectedPayments = payments.filter(p => selectedRowKeys.includes(p.id))
    const deletablePayments = selectedPayments.filter(p =>
      ['draft', 'cancelled'].includes(p.status)
    )

    if (deletablePayments.length === 0) {
      message.warning('Нет платежей для удаления')
      return
    }

    Modal.confirm({
      title: 'Массовое удаление',
      content: `Удалить ${deletablePayments.length} платеж(ей)?`,
      okText: 'Удалить все',
      cancelText: 'Отмена',
      okType: 'danger',
      onOk: async () => {
        try {
          for (const payment of deletablePayments) {
            await deletePaymentMutation.mutateAsync(payment.id)
          }
          message.success(`Удалено ${deletablePayments.length} платеж(ей)`)
          setSelectedRowKeys([])
          refetchPayments()
        } catch (error) {
          console.error('Error in bulk delete:', error)
          message.error('Ошибка при массовом удалении')
        }
      }
    })
  }, [selectedRowKeys, payments, deletePaymentMutation, refetchPayments])

  const bulkActions: BulkAction[] = useMemo(() => [
    {
      label: 'Подтвердить',
      onClick: handleBulkConfirm,
      icon: 'check',
      type: 'default'
    },
    {
      label: 'Отменить',
      onClick: handleBulkCancel,
      icon: 'close',
      type: 'default'
    },
    {
      label: 'Удалить',
      onClick: handleBulkDelete,
      icon: 'delete',
      type: 'danger'
    }
  ], [handleBulkConfirm, handleBulkCancel, handleBulkDelete])

  return {
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
    bulkActions,

    // Refetch
    refetchPayments
  }
}