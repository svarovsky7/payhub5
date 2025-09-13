/**
 * Main business logic hook for InvoiceView
 */

import { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { message } from 'antd'
import {
  useInvoice,
  useInvoiceApprovalHistory,
  useInvoiceWorkflowHistory
} from '@/services/hooks/useInvoices'
import { useInvoiceDocuments } from '@/services/hooks/useDocuments'
import { useAuth } from '@/models/auth'
import { DEFAULT_VAT_RATE } from '../constants'

export const useInvoiceView = () => {
  const { user } = useAuth()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  // URL параметры
  const tabFromUrl = searchParams.get('tab') || 'general'
  const paymentIdFromUrl = searchParams.get('paymentId')

  // Состояние табов
  const [activeTab, setActiveTab] = useState(tabFromUrl)

  // Загрузка данных счета
  const {
    data: invoice,
    isLoading: invoiceLoading,
    isError: invoiceError,
    refetch: refetchInvoice
  } = useInvoice(id!)

  // История workflow
  const {
    data: workflowHistory,
    isLoading: historyLoading
  } = useInvoiceWorkflowHistory(id!)

  // История согласований платежей
  const {
    data: approvalHistory,
    isLoading: approvalHistoryLoading
  } = useInvoiceApprovalHistory(id!)

  // Документы счета
  const {
    data: documents,
    isLoading: documentsLoading
  } = useInvoiceDocuments(id)

  // Обработка изменения табов
  const handleTabChange = (key: string) => {
    console.log('[InvoiceView.handleTabChange] Переключение таба:', key)
    setActiveTab(key)

    const newParams = new URLSearchParams(searchParams)
    if (key !== 'general') {
      newParams.set('tab', key)
    } else {
      newParams.delete('tab')
    }

    if (key !== 'payments') {
      newParams.delete('paymentId')
    }

    setSearchParams(newParams)
  }

  // Подсветка платежа из URL
  useEffect(() => {
    if (paymentIdFromUrl && activeTab === 'payments') {
      setTimeout(() => {
        const element = document.getElementById(`payment-row-${paymentIdFromUrl}`)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          element.classList.add('highlighted-row')
          setTimeout(() => {
            element.classList.remove('highlighted-row')
          }, 3000)
        }
      }, 500)
    }
  }, [paymentIdFromUrl, activeTab])

  // Обработка ошибок
  useEffect(() => {
    if (invoiceError) {
      message.error('Ошибка загрузки счета')
      navigate('/invoices')
    }
  }, [invoiceError, navigate])

  // Расчеты по счету
  const calculateInvoiceAmounts = () => {
    if (!invoice) {return {
      totalAmount: 0,
      taxRate: DEFAULT_VAT_RATE,
      taxAmount: 0,
      subtotal: 0,
      balance: 0
    }}

    const totalAmount = invoice.total_amount ?? (invoice.amount || 0)
    const taxRate = invoice.tax_rate || DEFAULT_VAT_RATE
    const taxAmount = invoice.tax_amount || (totalAmount * taxRate / (100 + taxRate))
    const subtotal = totalAmount - taxAmount

    // Расчет платежей по статусам
    const paymentsByStatus = invoice.payments?.reduce((acc, payment) => {
      const status = payment.status || 'pending'
      acc[status] = (acc[status] || 0) + (payment.amount_with_vat || 0)
      return acc
    }, {} as Record<string, number>) || {}

    const totalPaid = paymentsByStatus['completed'] || 0
    const balance = totalAmount - totalPaid

    return {
      totalAmount,
      taxRate,
      taxAmount,
      subtotal,
      balance,
      paymentsByStatus
    }
  }

  const amounts = calculateInvoiceAmounts()

  // Логирование для отладки
  useEffect(() => {
    console.log('[InvoiceViewPage] История изменений:', {
      invoiceId: id,
      workflowHistory,
      historyCount: workflowHistory?.length || 0,
      historyLoading
    })
  }, [id, workflowHistory, historyLoading])

  useEffect(() => {
    console.log('[InvoiceViewPage] История согласований платежей:', {
      invoiceId: id,
      approvalHistory,
      approvalHistoryCount: approvalHistory?.length || 0,
      approvalHistoryLoading
    })
  }, [id, approvalHistory, approvalHistoryLoading])

  useEffect(() => {
    console.log('[InvoiceViewPage] Документы счета:', {
      invoiceId: id,
      documents,
      documentsCount: documents?.length || 0,
      documentsLoading
    })
  }, [id, documents, documentsLoading])

  return {
    // Data
    invoice,
    workflowHistory,
    approvalHistory,
    documents,
    amounts,

    // Loading states
    invoiceLoading,
    historyLoading,
    approvalHistoryLoading,
    documentsLoading,

    // Navigation
    id,
    userId: user?.id || '',
    navigate,

    // Tabs
    activeTab,
    handleTabChange,
    paymentIdFromUrl,

    // Actions
    refetchInvoice
  }
}