import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Form, message } from 'antd'
import dayjs from 'dayjs'
import { useInvoice, useUpdateInvoice } from '@/services/hooks/useInvoices'
import { usePaymentsList } from '@/services/hooks/usePayments'
import { useInvoiceHistory } from '@/services/hooks/useInvoiceHistory'
import { calculateDeliveryDate } from '../../InvoiceCreate/utils/calculations'
import { DEFAULT_VAT_RATE } from '../../InvoiceCreate/constants'
import type { FinancialSummary } from '../types'
import type { InvoiceFormValues } from '../../InvoiceCreate/types'

export const useInvoiceView = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form] = Form.useForm<InvoiceFormValues>()
  const queryClient = useQueryClient()

  // Get active tab from URL
  const tabFromUrl = searchParams.get('tab') || 'info'
  const highlightPaymentId = searchParams.get('paymentId') || searchParams.get('payment_id')
  const showReturnButton = searchParams.get('from') === 'payments'

  // State
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState<dayjs.Dayjs | null>(null)
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  const [originalValues, setOriginalValues] = useState<any>(null)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary>({
    amountNet: 0,
    vatAmount: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    balance: 0
  })

  // Load invoice data
  const { data: invoice, isLoading: invoiceLoading, refetch: refetchInvoice } = useInvoice(id || '')
  const updateInvoiceMutation = useUpdateInvoice()

  // Load payments
  const { data: paymentsResponse, isLoading: loadingPayments, refetch: refetchPayments } = usePaymentsList(
    invoice?.id ? Number(invoice.id) : undefined
  )

  // Load history
  const { data: historyData, isLoading: loadingHistory } = useInvoiceHistory(id)

  // Sync tab with URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'info'
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, activeTab])

  // Set form values and calculate financial summary
  useEffect(() => {
    if (invoice) {
      console.log('[useInvoiceView] Loading invoice data:', {
        id: invoice.id,
        number: invoice.invoice_number,
        status: invoice.status
      })

      // Calculate financial summary
      const amountNet = Number(invoice.amount_net || 0)
      const vatAmount = Number(invoice.vat_amount || 0)
      const totalAmount = Number(invoice.total_amount || 0)

      // Calculate payment summary
      const payments = paymentsResponse?.data || []
      const paidAmount = payments
        .filter((p: any) => p.status === 'paid' || p.status === 'completed')
        .reduce((sum: number, p: any) => sum + Number(p.total_amount || 0), 0)

      const pendingAmount = payments
        .filter((p: any) => ['pending', 'processing', 'approved', 'scheduled', 'draft'].includes(p.status))
        .reduce((sum: number, p: any) => sum + Number(p.total_amount || 0), 0)

      const balance = totalAmount - paidAmount - pendingAmount

      setFinancialSummary({
        amountNet,
        vatAmount,
        totalAmount,
        paidAmount,
        pendingAmount,
        balance
      })

      // Set form values
      const formValues = {
        invoice_number: invoice.invoice_number,
        internal_number: invoice.internal_number,
        invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs(),
        invoice_type_id: invoice.type_id,
        title: invoice.title,
        description: invoice.description,
        supplier_id: invoice.supplier_id,
        payer_id: invoice.payer_id,
        project_id: invoice.project_id,
        amount_with_vat: totalAmount,
        amount_net: amountNet,
        vat_rate: invoice.vat_rate || DEFAULT_VAT_RATE,
        vat_amount: vatAmount,
        delivery_days: invoice.delivery_days,
        delivery_days_type: invoice.delivery_days_type || 'calendar',
        priority: invoice.priority || 'normal',
        material_responsible_person_id: invoice.material_responsible_person_id,
        notes: invoice.notes
      }

      form.setFieldsValue(formValues)
      setOriginalValues(formValues)

      // Calculate delivery date
      if (invoice.delivery_days) {
        const calculatedDate = calculateDeliveryDate(
          invoice.delivery_days,
          invoice.delivery_days_type || 'calendar'
        )
        setDeliveryDate(calculatedDate)
      }
    }
  }, [invoice, form, paymentsResponse])

  // Scroll to highlighted payment
  useEffect(() => {
    if (highlightPaymentId && activeTab === 'payments' && paymentsResponse?.data) {
      setTimeout(() => {
        const highlightedRow = document.querySelector('.highlighted-row')
        if (highlightedRow) {
          highlightedRow.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
          console.log('[useInvoiceView] Scrolled to payment:', highlightPaymentId)
        }
      }, 500)
    }
  }, [highlightPaymentId, activeTab, paymentsResponse])

  const handleFormChange = useCallback(() => {
    console.log('[useInvoiceView] Form changed')
    if (!isEditing) {
      setIsEditing(true)
    }
    setHasChanges(true)
  }, [isEditing])

  const handleTabChange = useCallback((key: string) => {
    console.log('[useInvoiceView] Tab changed to:', key)
    setActiveTab(key)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('tab', key)
    setSearchParams(newParams, { replace: true })
  }, [searchParams, setSearchParams])

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields()
      console.log('[useInvoiceView] Saving invoice:', values)

      // Implementation will be in the main component
      message.success('Изменения сохранены')
      setIsEditing(false)
      setHasChanges(false)
      await refetchInvoice()
    } catch (error) {
      console.error('[useInvoiceView] Save error:', error)
      message.error('Ошибка при сохранении')
    }
  }, [form, refetchInvoice])

  const handleCancel = useCallback(() => {
    console.log('[useInvoiceView] Cancelling changes')
    form.setFieldsValue(originalValues)
    setIsEditing(false)
    setHasChanges(false)
  }, [form, originalValues])

  return {
    // IDs and params
    id,
    searchParams,
    setSearchParams,
    highlightPaymentId,
    showReturnButton,

    // Forms
    form,

    // State
    isEditing,
    hasChanges,
    deliveryDate,
    activeTab,
    financialSummary,
    originalValues,

    // Data
    invoice,
    invoiceLoading,
    paymentsResponse,
    loadingPayments,
    historyData,
    loadingHistory,

    // Actions
    handleFormChange,
    handleTabChange,
    handleSave,
    handleCancel,
    refetchInvoice,
    refetchPayments,
    updateInvoiceMutation,

    // Setters
    setIsEditing,
    setHasChanges,
    setDeliveryDate,
    setActiveTab
  }
}