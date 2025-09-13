/**
 * Main business logic hook for InvoiceCreate
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, message } from 'antd'
import dayjs from 'dayjs'
import { useCreateInvoice } from '@/services/hooks/useInvoices'
import { useAuthStore } from '@/models/auth'
import { useContractorsList } from '@/services/hooks/useContractors'
import { useProjectsList } from '@/services/hooks/useProjects'
import { useInvoiceTypesList } from '@/services/hooks/useInvoiceTypes'
import { useMaterialResponsiblePersonsList } from '@/services/hooks/useMaterialResponsiblePersons'
import { useCurrencies, usePriorities } from '@/services/hooks/useEnums'
import { getCurrentYearMonth } from '@/utils/invoice-number-generator'
import { getNextSequenceNumber } from '@/services/invoices/sequence'
import { calculateDeliveryDate, calculateVATAmounts } from '../utils/calculations'
import type { InvoiceFormValues, PaymentRow } from '../types'
import { DEFAULT_CURRENCY, DEFAULT_VAT_RATE } from '../constants'

export const useInvoiceCreate = () => {
  const [form] = Form.useForm<InvoiceFormValues>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState<dayjs.Dayjs | null>(null)
  const [selectedCurrency, setSelectedCurrency] = useState(DEFAULT_CURRENCY)
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [internalNumberPreview, setInternalNumberPreview] = useState<string>('')

  const createInvoiceMutation = useCreateInvoice()
  const { user } = useAuthStore()

  // Load related data
  const { data: contractorsResponse, isLoading: loadingContractors, error: contractorsError } = useContractorsList()
  const { data: projectsResponse, isLoading: loadingProjects, error: projectsError } = useProjectsList()
  const { data: invoiceTypes, isLoading: loadingInvoiceTypes } = useInvoiceTypesList()
  const {
    data: materialResponsiblePersons,
    isLoading: loadingMRPs,
    error: mrpsError
  } = useMaterialResponsiblePersonsList({ is_active: true })

  // Load enums from database
  const { data: currencies, isLoading: loadingCurrencies } = useCurrencies()
  const { data: priorities, isLoading: loadingPriorities } = usePriorities()

  // Logging
  useEffect(() => {
    console.log('[InvoiceCreate] Загрузка данных контрагентов:', {
      contractorsResponse,
      isLoading: loadingContractors,
      error: contractorsError
    })
  }, [contractorsResponse, loadingContractors, contractorsError])

  useEffect(() => {
    console.log('[InvoiceCreate] Загрузка данных проектов:', {
      projectsResponse,
      isLoading: loadingProjects,
      error: projectsError
    })
  }, [projectsResponse, loadingProjects, projectsError])

  useEffect(() => {
    console.log('[InvoiceCreate] Загрузка данных МОЛ:', {
      materialResponsiblePersons,
      isLoading: loadingMRPs,
      error: mrpsError
    })
  }, [materialResponsiblePersons, loadingMRPs, mrpsError])

  // Extract data from responses - the API returns PaginatedResponse with data property
  const contractors = contractorsResponse?.data || []
  // Filter by type_id: 4 for vendors (suppliers), 2 for clients (payers)
  const suppliers = contractors.filter((c: any) => c.type_id === 4)
  const payers = contractors.filter((c: any) => c.type_id === 2)
  // Projects API returns array directly (listProjects already extracts data)
  const projects = projectsResponse || []

  // Handle internal number update
  const handleInternalNumberUpdate = useCallback(async () => {
    try {
      const supplierId = form.getFieldValue('supplier_id')
      const projectId = form.getFieldValue('project_id')
      const payerId = form.getFieldValue('payer_id')
      const invoiceTypeId = form.getFieldValue('invoice_type_id')
      const invoiceDate = form.getFieldValue('invoice_date')

      // Generate internal number with defaults for missing fields
      const nextNumber = await getNextSequenceNumber()

      // ORG - код плательщика (используем только если выбран)
      let orgCode = 'ORG'
      if (payerId) {
        const payer = payers.find((p: any) => p.id === payerId)
        if (payer) {
          orgCode = payer.supplier_code || payer.name?.substring(0, 3).toUpperCase() || 'ORG'
        }
      }
      // НЕ используем первого плательщика по умолчанию

      // PROJ - код проекта (используем project_code из таблицы projects только если выбран)
      let projectCode = 'PROJ'
      if (projectId) {
        const project = projects.find((p: any) => p.id === projectId)
        if (project) {
          projectCode = project.project_code || project.abbreviation || project.name?.substring(0, 3).toUpperCase() || 'PROJ'
        }
      }
      // НЕ используем первый проект по умолчанию

      // VEND - код поставщика + 4 последние цифры ИНН (только если выбран)
      let vendorCode = 'VEND0000'
      if (supplierId) {
        const supplier = suppliers.find((s: any) => s.id === supplierId)
        if (supplier) {
          vendorCode = supplier.supplier_code || supplier.name?.substring(0, 3).toUpperCase() || 'VEND'
          if (supplier.inn) {
            const innDigits = supplier.inn.replace(/\D/g, '')
            const last4Digits = innDigits.slice(-4).padStart(4, '0')
            vendorCode = `${vendorCode}${last4Digits}`
          }
        }
      }
      // НЕ используем первого поставщика по умолчанию

      // CODE - код типа счета (в верхнем регистре)
      let typeCode = 'INV'
      if (invoiceTypeId) {
        const invoiceType = invoiceTypes?.find((t: any) => t.id === invoiceTypeId)
        if (invoiceType) {
          typeCode = (invoiceType.code || 'INV').toUpperCase()
        }
      } else if (invoiceTypes && invoiceTypes.length > 0) {
        // Используем первый тип по умолчанию
        typeCode = (invoiceTypes[0].code || 'INV').toUpperCase()
      }

      // YYMM - год и месяц из даты счета
      let yearMonth = getCurrentYearMonth()
      if (invoiceDate) {
        const year = invoiceDate.year().toString().slice(-2)
        const month = (invoiceDate.month() + 1).toString().padStart(2, '0')
        yearMonth = `${year}${month}`
      }

      // Формат: ORG-PROJ-VEND-CODE-YYMM-SEQ
      const preview = `${orgCode}-${projectCode}-${vendorCode}-${typeCode}-${yearMonth}-${String(nextNumber).padStart(4, '0')}`
      setInternalNumberPreview(preview)
      // Устанавливаем значение в форму
      form.setFieldValue('internal_number', preview)

      console.log('[InvoiceCreate] Внутренний номер сгенерирован:', {
        preview,
        orgCode,
        projectCode,
        vendorCode,
        typeCode,
        yearMonth,
        nextNumber
      })
    } catch (error) {
      console.error('[InvoiceCreate] Ошибка генерации превью номера:', error)
    }
  }, [form, suppliers, projects, payers, invoiceTypes])

  // Auto-update internal number when dependencies change
  useEffect(() => {
    handleInternalNumberUpdate()
  }, [handleInternalNumberUpdate])

  // Calculate VAT amounts
  const handleCalculateAmounts = useCallback(() => {
    const amountWithVat = form.getFieldValue('amount_with_vat') || 0
    const vatRate = form.getFieldValue('vat_rate') || DEFAULT_VAT_RATE

    const { amountNet, vatAmount } = calculateVATAmounts(amountWithVat, vatRate)

    form.setFieldsValue({
      amount_net: amountNet,
      vat_amount: vatAmount
    })
  }, [form])

  // Calculate delivery date for display only (not stored in DB)
  const handleDeliveryDaysChange = useCallback(() => {
    const days = form.getFieldValue('delivery_days')
    const daysType = form.getFieldValue('delivery_days_type') || 'calendar'
    const date = calculateDeliveryDate(days, daysType)
    setDeliveryDate(date)
    // Не сохраняем в форму, так как estimated_delivery_date больше не хранится в БД
  }, [form])

  // Submit form
  const handleSubmit = async (values: InvoiceFormValues, launchApproval: boolean = false) => {
    console.log('[InvoiceCreate.handleSubmit] Начало отправки формы:', { values, launchApproval })
    setLoading(true)

    try {
      // Prepare invoice data - map to actual DB column names
      const invoiceData = {
        invoice_number: values.invoice_number || 'б/н', // Если номер не указан, записываем "б/н"
        internal_number: values.internal_number,
        invoice_date: values.invoice_date?.format('YYYY-MM-DD'),
        type_id: values.invoice_type_id,  // invoice_type_id -> type_id
        payer_id: values.payer_id,
        supplier_id: values.supplier_id,
        project_id: values.project_id,
        material_responsible_person_id: values.material_responsible_person_id,
        description: values.description,
        priority: values.priority,
        created_by: user?.id,
        status: launchApproval ? 'pending' : 'draft',
        currency: values.currency,
        // Map form field names to DB column names
        total_amount: Number(values.amount_with_vat),  // amount_with_vat -> total_amount
        amount_net: Number(values.amount_net || 0),  // amount_net (Amount excluding VAT)
        vat_amount: Number(values.vat_amount || 0),
        vat_rate: Number(values.vat_rate || DEFAULT_VAT_RATE),
        // Temporarily comment out delivery_days to avoid trigger error
        // delivery_days: values.delivery_days ? Number(values.delivery_days) : undefined,
        delivery_days_type: values.delivery_days_type || 'calendar'  // Теперь это поле есть в БД
      }

      console.log('[InvoiceCreate.handleSubmit] Подготовленные данные счета:', invoiceData)

      // Create invoice
      const result = await createInvoiceMutation.mutateAsync(invoiceData)

      console.log('[InvoiceCreate.handleSubmit] Счет успешно создан:', result)

      message.success(`Счет ${result.invoice_number || result.id} успешно создан`)

      // Navigate to invoices list
      navigate('/invoices/list')
    } catch (error) {
      console.error('[InvoiceCreate.handleSubmit] Ошибка создания счета:', error)
      message.error('Ошибка при создании счета')
    } finally {
      setLoading(false)
    }
  }

  // Form initialization with defaults
  useEffect(() => {
    const initialValues: any = {
      invoice_date: dayjs(),
      currency: DEFAULT_CURRENCY,
      vat_rate: DEFAULT_VAT_RATE,
      delivery_days_type: 'calendar'  // Предустанавливаем календарные дни
    }

    // НЕ устанавливаем по умолчанию: supplier_id, payer_id, project_id
    // Пользователь должен выбрать их сам

    // Устанавливаем только тип счета по умолчанию (первый из списка)
    if (invoiceTypes && invoiceTypes.length > 0 && !form.getFieldValue('invoice_type_id')) {
      initialValues.invoice_type_id = invoiceTypes[0].id
    }

    form.setFieldsValue(initialValues)

    // Генерируем внутренний номер только если есть данные
    if ((suppliers.length > 0 || payers.length > 0 || projects.length > 0) && invoiceTypes && invoiceTypes.length > 0) {
      handleInternalNumberUpdate()
    }
  }, [form, suppliers, payers, projects, invoiceTypes, handleInternalNumberUpdate])

  return {
    // Form
    form,
    loading,

    // Data
    contractors,
    suppliers,
    payers,
    projects,
    invoiceTypes,
    materialResponsiblePersons,
    user,
    currencies,
    priorities,

    // Loading states
    loadingContractors,
    loadingProjects,
    loadingInvoiceTypes,
    loadingMRPs,
    loadingCurrencies,
    loadingPriorities,

    // State
    deliveryDate,
    selectedCurrency,
    setSelectedCurrency,
    payments,
    setPayments,
    internalNumberPreview,

    // Actions
    handleSubmit,
    handleCalculateAmounts,
    handleDeliveryDaysChange,
    handleInternalNumberUpdate,
    navigate
  }
}