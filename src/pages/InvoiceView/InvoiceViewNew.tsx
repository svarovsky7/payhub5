/**
 * Новая страница просмотра и редактирования счета
 * Основана на форме создания счета с добавлением финансового блока
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert,
  Breadcrumb,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
  Upload
} from 'antd'
import {
  ArrowLeftOutlined,
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleFilled,
  ExclamationCircleOutlined,
  EyeOutlined,
  FallOutlined,
  FileExcelOutlined,
  FileExclamationOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  HistoryOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  RiseOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  SaveOutlined,
  SendOutlined,
  SwapOutlined,
  TeamOutlined,
  UploadOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { useQueryClient } from '@tanstack/react-query'
import { useInvoice, useUpdateInvoice } from '@/services/hooks/useInvoices'
import { useContractorsList } from '@/services/hooks/useContractors'
import { useProjectsList } from '@/services/hooks/useProjects'
import { useInvoiceTypesList } from '@/services/hooks/useInvoiceTypes'
import { useMaterialResponsiblePersonsList } from '@/services/hooks/useMaterialResponsiblePersons'
import { useCurrencies, usePriorities } from '@/services/hooks/useEnums'
import { usePaymentsList } from '@/services/hooks/usePayments'
import { usePaymentTypes } from '@/services/hooks/usePaymentTypes'
import { useAuthStore } from '@/models/auth'
import { useInvoiceHistory } from '@/services/hooks/useInvoiceHistory'
import { InvoiceHistoryService } from '@/services/invoices/history-service'
import { calculateDeliveryDate, calculateVATAmounts } from '../InvoiceCreate/utils/calculations'
import { formatCurrency } from '@/utils/format'
import { DEFAULT_CURRENCY, DEFAULT_VAT_RATE } from '../InvoiceCreate/constants'
import { InvoiceFileStorage } from '@/services/invoices/file-storage'
import type { InvoiceFormValues } from '../InvoiceCreate/types'
import './InvoiceView.css'

const { Title, Text } = Typography
const { TextArea } = Input

export const InvoiceViewNew: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form] = Form.useForm<InvoiceFormValues>()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Получаем активную вкладку из URL или используем 'info' по умолчанию
  const tabFromUrl = searchParams.get('tab') || 'info'

  // State
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState<dayjs.Dayjs | null>(null)
  const [activeTab, setActiveTab] = useState(tabFromUrl)
  // Payment modal state removed - using paymentModalVisible instead
  const [documents, setDocuments] = useState<any[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [paymentForm] = Form.useForm()
  const [approvalModalVisible, setApprovalModalVisible] = useState(false)
  const [selectedPaymentForApproval, setSelectedPaymentForApproval] = useState<any>(null)
  const [workflows, setWorkflows] = useState<any[]>([])
  const [loadingWorkflows, setLoadingWorkflows] = useState(false)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)
  const [currentPaymentAmount, setCurrentPaymentAmount] = useState(0)
  const [financialSummary, setFinancialSummary] = useState({
    amountNet: 0,
    vatAmount: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    balance: 0
  })
  // File preview modal state
  const [previewModalVisible, setPreviewModalVisible] = useState(false)
  const [previewFile, setPreviewFile] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  // Field changes history state (для локального отслеживания изменений)
  const [fieldChangesHistory, setFieldChangesHistory] = useState<any[]>([])
  const [originalValues, setOriginalValues] = useState<any>(null)

  // История счета - вызываем хук на верхнем уровне компонента
  const { data: historyData, isLoading: loadingHistory } = useInvoiceHistory(id)

  // Payment edit modal state
  const [editPaymentModalVisible, setEditPaymentModalVisible] = useState(false)
  const [editingPayment, setEditingPayment] = useState<any>(null)
  const [paymentEditForm] = Form.useForm()

  // console.log('[InvoiceViewNew] Инициализация компонента с ID:', id)

  // Load invoice data
  const { data: invoice, isLoading: invoiceLoading, refetch: refetchInvoice } = useInvoice(id || '')
  const updateInvoiceMutation = useUpdateInvoice()

  // Load payments for this invoice
  const { data: paymentsResponse, isLoading: loadingPayments, refetch: refetchPayments } = usePaymentsList(
    invoice?.id ? Number(invoice.id) : undefined
  )

  console.log('[InvoiceViewNew] Загрузка платежей для счета:', invoice?.id, 'Результат:', paymentsResponse)

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

  // Получаем ID платежа для подсветки из URL (поддерживаем оба варианта параметра)
  const highlightPaymentId = searchParams.get('paymentId') || searchParams.get('payment_id')
  // Получаем флаг для отображения кнопки возврата
  const showReturnButton = searchParams.get('from') === 'payments'

  // Синхронизация вкладки с URL при изменении URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'info'
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams, activeTab])

  // Прокрутка к выделенному платежу
  useEffect(() => {
    if (highlightPaymentId && activeTab === 'payments' && paymentsResponse?.data) {
      // Небольшая задержка, чтобы таблица успела отрендериться
      setTimeout(() => {
        const highlightedRow = document.querySelector('.highlighted-row')
        if (highlightedRow) {
          highlightedRow.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          })
          console.log('[InvoiceViewNew] Прокрутка к платежу:', highlightPaymentId)
        }
      }, 500)
    }
  }, [highlightPaymentId, activeTab, paymentsResponse])

  // Set form values when invoice loads
  useEffect(() => {
    if (invoice) {
      console.log('[InvoiceViewNew.useEffect] Загрузка данных счета:', {
        id: invoice.id,
        number: invoice.invoice_number,
        status: invoice.status,
        totalAmount: invoice.total_amount,
        
        vatRate: invoice.vat_rate,
        mrpId: invoice.material_responsible_person_id,
        paymentsCount: invoice.payments?.length || 0
      })

      console.log('[InvoiceViewNew.useEffect] Доступные МОЛ:', materialResponsiblePersons)
      console.log('[InvoiceViewNew.useEffect] Доступные валюты:', currencies)
      console.log('[InvoiceViewNew.useEffect] Доступные приоритеты:', priorities)

      // Calculate financial summary
      const amountNet = Number(invoice.amount_net || 0)
      const vatAmount = Number(invoice.vat_amount || 0)
      const totalAmount = Number(invoice.total_amount || 0)

      // Calculate payment summary
      const payments = invoice.payments || []
      const paidAmount = payments
        .filter((p: any) => p.status === 'completed')
        .reduce((sum: number, p: any) => sum + Number(p.amount_with_vat || 0), 0)

      const pendingAmount = payments
        .filter((p: any) => p.status === 'pending' || p.status === 'processing')
        .reduce((sum: number, p: any) => sum + Number(p.amount_with_vat || 0), 0)

      const balance = totalAmount - paidAmount

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

      // Save original values for comparison
      setOriginalValues(formValues)

      // Calculate delivery date if needed
      if (invoice.delivery_days) {
        const calculatedDate = calculateDeliveryDate(
          invoice.delivery_days,
          invoice.delivery_days_type || 'calendar'
        )
        setDeliveryDate(calculatedDate)
      }
    }
  }, [invoice, form])

  // Track form changes
  const handleFormChange = () => {
    console.log('[InvoiceViewNew.handleFormChange] Изменения в форме')
    if (!isEditing) {
      setIsEditing(true)
    }
    setHasChanges(true)
  }

  // Calculate VAT amounts
  const handleCalculateAmounts = (newAmountWithVat?: number) => {
    // Если передано новое значение, используем его, иначе берем из формы
    const amountWithVat = newAmountWithVat !== undefined ? newAmountWithVat : (form.getFieldValue('amount_with_vat') || 0)
    const vatRate = form.getFieldValue('vat_rate')

    // Используем 0 для ставки НДС если она явно 0, иначе DEFAULT_VAT_RATE
    const actualVatRate = vatRate === 0 ? 0 : (vatRate || DEFAULT_VAT_RATE)

    console.log('[InvoiceViewNew.handleCalculateAmounts] Начало расчета НДС:', {
      amountWithVat,
      newAmountWithVat,
      vatRate,
      actualVatRate,
      isZeroRate: actualVatRate === 0,
      DEFAULT_VAT_RATE
    })

    const { amountNet, vatAmount } = calculateVATAmounts(amountWithVat, actualVatRate)

    console.log('[InvoiceViewNew.handleCalculateAmounts] Результат расчета:', {
      amountNet,
      vatAmount,
      totalAmount: amountWithVat,
      formula: actualVatRate === 0 ? 'без НДС (сумма без НДС = сумме с НДС)' : `с НДС ${actualVatRate}%`
    })

    form.setFieldsValue({
      amount_net: amountNet,
      vat_amount: vatAmount
    })

    // Update financial summary
    setFinancialSummary(prev => ({
      ...prev,
      amountNet,
      vatAmount,
      totalAmount: amountWithVat
    }))
  }

  // Calculate delivery date
  const handleDeliveryDaysChange = () => {
    const days = form.getFieldValue('delivery_days')
    const daysType = form.getFieldValue('delivery_days_type') || 'calendar'
    const date = calculateDeliveryDate(days, daysType)
    setDeliveryDate(date)
  }

  // Save changes
  const handleSave = async () => {
    try {
      const rawValues = await form.validateFields()

      console.log('[InvoiceViewNew.handleSave] ============ НАЧАЛО СОХРАНЕНИЯ ============')
      console.log('[InvoiceViewNew.handleSave] Сырые значения из формы:', rawValues)
      console.log('[InvoiceViewNew.handleSave] Ключи сырых значений:', Object.keys(rawValues))
      console.log('[InvoiceViewNew.handleSave] JSON сырых значений:', JSON.stringify(rawValues))

      // Фильтруем только разрешенные поля формы
      const allowedFormFields = [
        'invoice_number',
        'internal_number',
        'invoice_date',
        'invoice_type_id',
        'description',
        'supplier_id',
        'payer_id',
        'project_id',
        'material_responsible_person_id',
        
        'amount_with_vat',
        'amount_net',
        'vat_rate',
        'vat_amount',
        'delivery_days',
        'delivery_days_type',
        'priority',
        'title' // может быть в форме, но не в БД
      ]

      const values: any = {}
      for (const field of allowedFormFields) {
        if (field in rawValues) {
          values[field] = rawValues[field]
        }
      }

      console.log('[InvoiceViewNew.handleSave] Отфильтрованные значения:', values)
      console.log('[InvoiceViewNew.handleSave] Ключи отфильтрованных значений:', Object.keys(values))

      // Определяем изменённые поля
      const changedFields: string[] = []
      const fieldNames: Record<string, string> = {
        invoice_number: 'Номер счета',
        internal_number: 'Внутренний номер',
        invoice_date: 'Дата счета',
        invoice_type_id: 'Тип счета',
        description: 'Описание',
        supplier_id: 'Поставщик',
        payer_id: 'Плательщик',
        project_id: 'Проект',
        material_responsible_person_id: 'МОЛ',
        
        amount_with_vat: 'Сумма с НДС',
        amount_net: 'Сумма без НДС',
        vat_rate: 'Ставка НДС',
        vat_amount: 'Сумма НДС',
        delivery_days: 'Срок поставки',
        delivery_days_type: 'Тип срока поставки',
        priority: 'Приоритет'
      }

      // Сравниваем текущие значения с оригинальными
      if (originalValues) {
        Object.keys(values).forEach(key => {
          const newValue = values[key]
          const oldValue = originalValues[key]

          // Преобразуем значения для сравнения
          const normalizedNew = newValue instanceof dayjs ? newValue.format('YYYY-MM-DD') : newValue
          const normalizedOld = oldValue instanceof dayjs ? oldValue.format('YYYY-MM-DD') : oldValue

          if (normalizedNew !== normalizedOld && fieldNames[key]) {
            changedFields.push(fieldNames[key])
          }
        })
      }

      // Подготавливаем данные для БД - ТОЛЬКО поля БД
      const updateData: any = {}

      // Маппинг полей формы на поля БД
      if (values.invoice_number !== undefined) updateData.invoice_number = values.invoice_number
      if (values.internal_number !== undefined) updateData.internal_number = values.internal_number
      if (values.invoice_date !== undefined) updateData.invoice_date = values.invoice_date?.format('YYYY-MM-DD')
      if (values.invoice_type_id !== undefined) updateData.type_id = values.invoice_type_id // invoice_type_id -> type_id
      if (values.description !== undefined) updateData.description = values.description
      if (values.supplier_id !== undefined) updateData.supplier_id = values.supplier_id
      if (values.payer_id !== undefined) updateData.payer_id = values.payer_id
      if (values.project_id !== undefined) updateData.project_id = values.project_id
      if (values.material_responsible_person_id !== undefined) updateData.material_responsible_person_id = values.material_responsible_person_id
      
      if (values.amount_with_vat !== undefined) updateData.total_amount = Number(values.amount_with_vat)
      if (values.amount_net !== undefined) updateData.amount_net = Number(values.amount_net || 0)
      if (values.vat_amount !== undefined) updateData.vat_amount = Number(values.vat_amount || 0)
      if (values.vat_rate !== undefined) updateData.vat_rate = Number(values.vat_rate || DEFAULT_VAT_RATE)
      if (values.delivery_days !== undefined) updateData.delivery_days = values.delivery_days ? Number(values.delivery_days) : null
      if (values.delivery_days_type !== undefined) updateData.delivery_days_type = values.delivery_days_type || 'calendar'
      if (values.priority !== undefined) updateData.priority = values.priority

      console.log('[InvoiceViewNew.handleSave] Подготовленные данные для БД:', updateData)
      console.log('[InvoiceViewNew.handleSave] Ключи данных для БД:', Object.keys(updateData))
      console.log('[InvoiceViewNew.handleSave] JSON данных для БД:', JSON.stringify(updateData))

      console.log('[InvoiceViewNew.handleSave] Вызов мутации с параметрами:', {
        id: id!,
        updates: updateData,
        companyId: user?.companyId || '1'
      })

      await updateInvoiceMutation.mutateAsync({
        id: id!,
        updates: updateData,
        companyId: user?.companyId || '1'
      })

      console.log('[InvoiceViewNew.handleSave] ============ УСПЕШНОЕ СОХРАНЕНИЕ ============')

      // Добавляем изменения в историю
      if (changedFields.length > 0) {
        const changeRecord = {
          date: new Date().toISOString(),
          type: 'field_change',
          fields: changedFields,
          user: user?.email || 'Пользователь'
        }
        setFieldChangesHistory(prev => [...prev, changeRecord])
      }

      message.success('Изменения сохранены')
      setHasChanges(false)
      setIsEditing(false)
      setOriginalValues(values) // Обновляем оригинальные значения
      refetchInvoice()
      // Инвалидируем кэш истории для мгновенного обновления
      queryClient.invalidateQueries({ queryKey: ['invoice-history', id] })
      console.log('[InvoiceViewNew.handleSave] Изменения успешно сохранены')
    } catch (error) {
      console.error('[InvoiceViewNew.handleSave] Ошибка сохранения:', error)
      message.error('Ошибка при сохранении изменений')
    }
  }

  // Cancel changes
  const handleCancel = () => {
    Modal.confirm({
      title: 'Отменить изменения?',
      content: 'Все несохраненные изменения будут потеряны',
      okText: 'Да, отменить',
      cancelText: 'Продолжить редактирование',
      onOk: () => {
        // Reset form to original values
        if (invoice) {
          form.setFieldsValue({
            invoice_number: invoice.invoice_number,
            internal_number: invoice.internal_number,
            invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs(),
            invoice_type_id: invoice.type_id,
            title: invoice.title,
            supplier_id: invoice.supplier_id,
            payer_id: invoice.payer_id,
            project_id: invoice.project_id,
            
            amount_with_vat: Number(invoice.total_amount || 0),
            amount_net: Number(invoice.amount_net || 0),
            vat_rate: invoice.vat_rate || DEFAULT_VAT_RATE,
            vat_amount: Number(invoice.vat_amount || 0),
            delivery_days: invoice.delivery_days,
            delivery_days_type: invoice.delivery_days_type || 'calendar',
            priority: invoice.priority || 'normal',
            material_responsible_person_id: invoice.material_responsible_person_id
          })
        }
        setHasChanges(false)
        setIsEditing(false)
      }
    })
  }

  // Format MRP display
  const getMRPDisplay = (mrpId: string | number) => {
    const person = materialResponsiblePersons?.find((p: any) => p.id === mrpId)
    console.log('[InvoiceViewNew.getMRPDisplay] Поиск МОЛ:', { mrpId, person, allPersons: materialResponsiblePersons })
    if (!person) {
      console.warn('[InvoiceViewNew.getMRPDisplay] МОЛ не найден для ID:', mrpId)
      return `МОЛ ID: ${mrpId}`
    }
    // Используем full_name вместо name, так как в БД поле называется full_name
    const name = person.full_name || person.name || 'Без имени'
    return person.phone ? `${name} (${person.phone})` : name
  }

  // Payment status columns
  const paymentColumns = [
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig: Record<string, { color: string, icon: React.ReactNode, text: string }> = {
          completed: { color: 'success', icon: <CheckCircleOutlined />, text: 'Оплачено' },
          pending: { color: 'warning', icon: <ClockCircleOutlined />, text: 'Ожидает' },
          processing: { color: 'processing', icon: <ClockCircleOutlined />, text: 'В обработке' },
          failed: { color: 'error', icon: <ExclamationCircleOutlined />, text: 'Ошибка' }
        }
        const config = statusConfig[status] || { color: 'default', icon: null, text: status }
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        )
      }
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number, record: any) => (
        <Text strong>
          {new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB'
          }).format(amount)}
        </Text>
      )
    }
  ]

  // Group payments by status
  const paymentsByStatus = React.useMemo(() => {
    // Используем платежи из paymentsResponse вместо invoice.payments
    if (!paymentsResponse?.data || paymentsResponse.data.length === 0) {return []}

    console.log('[InvoiceViewNew.paymentsByStatus] Группировка платежей:', {
      paymentsCount: paymentsResponse.data.length,
      payments: paymentsResponse.data
    })

    const grouped = paymentsResponse.data.reduce((acc: any, payment: any) => {
      const status = payment.status || 'draft'
      if (!acc[status]) {
        acc[status] = {
          status,
          amount: 0,
          count: 0,
          currency: 'RUB'
        }
      }
      acc[status].amount += Number(payment.total_amount || 0)
      acc[status].count += 1
      return acc
    }, {})

    return Object.values(grouped)
  }, [paymentsResponse, invoice])

  // Tab change handler
  const handleTabChange = (key: string) => {
    console.log('[InvoiceViewNew.handleTabChange] Переключение вкладки:', { from: activeTab, to: key })
    setActiveTab(key)

    // Обновляем URL с параметром tab
    const newParams = new URLSearchParams(searchParams)
    if (key === 'info') {
      // Для вкладки по умолчанию удаляем параметр из URL
      newParams.delete('tab')
    } else {
      newParams.set('tab', key)
    }
    setSearchParams(newParams, { replace: true })
  }

  // Render main form content
  const renderMainForm = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card type="inner" title={<><InfoCircleOutlined style={{ marginRight: 8 }} />Основная информация</>} size="small">
        <Row gutter={[12, 8]}>
          <Col xs={24} sm={12}>
            <Form.Item
              name="invoice_number"
              label="Номер счета"
              rules={[{ required: true, message: 'Введите номер счета' }]}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder="Введите номер счета" size="small" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="internal_number"
              label="Внутренний номер"
              style={{ marginBottom: 12 }}
            >
              <Input disabled size="small" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="invoice_date"
              label="Дата счета"
              rules={[{ required: true, message: 'Выберите дату' }]}
              style={{ marginBottom: 12 }}
            >
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" size="small" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name="invoice_type_id"
              label="Тип счета"
              rules={[{ required: true, message: 'Выберите тип' }]}
              style={{ marginBottom: 12 }}
            >
              <Select
                placeholder="Выберите тип"
                loading={loadingInvoiceTypes}
                size="small"
                options={invoiceTypes?.map((type: any) => ({
                  label: type.name,
                  value: type.id
                }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              name="description"
              label="Описание"
              style={{ marginBottom: 12 }}
            >
              <TextArea rows={2} placeholder="Подробное описание" size="small" />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card type="inner" title="Контрагенты" size="small">
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Form.Item
                name="supplier_id"
                label="Поставщик"
                rules={[{ required: true, message: 'Выберите поставщика' }]}
                style={{ marginBottom: 12 }}
              >
                <Select
                  placeholder="Выберите поставщика"
                  loading={loadingContractors}
                  showSearch
                  size="small"
                  optionFilterProp="children"
                  options={suppliers.map((supplier: any) => ({
                    label: `${supplier.name} (ИНН: ${supplier.inn})`,
                    value: supplier.id
                  }))}
                />
              </Form.Item>
              <Form.Item
                name="payer_id"
                label="Плательщик"
                rules={[{ required: true, message: 'Выберите плательщика' }]}
                style={{ marginBottom: 12 }}
              >
                <Select
                  placeholder="Выберите плательщика"
                  loading={loadingContractors}
                  showSearch
                  size="small"
                  optionFilterProp="children"
                  options={payers.map((payer: any) => ({
                    label: payer.name,
                    value: payer.id
                  }))}
                />
            </Form.Item>
          </Space>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card type="inner" title="Проект и МОЛ" size="small">
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Form.Item
              name="project_id"
              label="Проект"
              style={{ marginBottom: 12 }}
            >
              <Select
                placeholder="Выберите проект"
                loading={loadingProjects}
                showSearch
                allowClear
                size="small"
                optionFilterProp="children"
                options={projects.map((project: any) => ({
                  label: `${project.name} ${project.address ? `(${project.address})` : ''}`,
                  value: project.id
                }))}
              />
            </Form.Item>
            <Form.Item
              name="material_responsible_person_id"
              label="Материально ответственное лицо"
              style={{ marginBottom: 12 }}
            >
              <Select
                placeholder="Выберите МОЛ"
                loading={loadingMRPs}
                showSearch
                allowClear
                size="small"
                optionFilterProp="children"
                options={materialResponsiblePersons?.map((person: any) => {
                  // Используем full_name из БД
                  const name = person.full_name || person.name || 'Без имени'
                  return {
                    label: person.phone ? `${name} (${person.phone})` : name,
                    value: person.id
                  }
                })}
              />
            </Form.Item>
          </Space>
        </Card>
      </Col>
    </Row>

    <Card type="inner" title={<><DollarOutlined style={{ marginRight: 8 }} />Финансовые данные</>} size="small">
      <Row gutter={[12, 8]}>
        <Col xs={24} sm={8}>
          <Form.Item
            name="currency"
            label="Валюта"
            rules={[{ required: true, message: 'Выберите валюту' }]}
            style={{ marginBottom: 12 }}
          >
            <Select
              placeholder="Выберите валюту"
              loading={loadingCurrencies}
              size="small"
              options={currencies?.map((curr: any) => {
                console.log('[InvoiceViewNew] Валюта:', curr)
                // Для enum используем value и label из ответа
                return {
                  label: curr.label || `${curr.value} - ${curr.name || curr.value}`,
                  value: curr.value || curr.code
                }
              })}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name="amount_with_vat"
            label="Сумма с НДС"
            rules={[{ required: true, message: 'Введите сумму' }]}
            style={{ marginBottom: 12 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              size="small"
              min={0}
              precision={2}
              stringMode // Используем строковый режим для точного сохранения десятичных знаков
              formatter={value => {
                // Сохраняем десятичные знаки при форматировании
                console.log('[InvoiceViewNew.formatter] Форматирование значения:', value, 'тип:', typeof value)
                if (!value) {return ''}
                const strValue = value.toString()
                // Разделяем целую и дробную части
                const parts = strValue.split('.')
                // Добавляем пробелы в целую часть
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                // Ограничиваем дробную часть до 2 знаков
                if (parts[1] && parts[1].length > 2) {
                  parts[1] = parts[1].substring(0, 2)
                }
                const result = parts.join(',') // Используем запятую для отображения
                console.log('[InvoiceViewNew.formatter] Результат форматирования:', result)
                return result
              }}
              parser={value => {
                // Обрабатываем ввод с поддержкой запятой и точки
                console.log('[InvoiceViewNew.parser] Парсинг значения:', value)
                if (!value) {return ''}

                // Удаляем пробелы
                let parsed = value.replace(/\s/g, '')

                // Заменяем запятую на точку для правильной работы с числами
                parsed = parsed.replace(',', '.')

                // Проверяем и ограничиваем количество знаков после разделителя
                const parts = parsed.split('.')
                if (parts.length > 1) {
                  // Оставляем только первую точку и ограничиваем дробную часть
                  parsed = parts[0] + '.' + (parts[1] || '').substring(0, 2)
                }

                console.log('[InvoiceViewNew.parser] Результат парсинга:', parsed)
                return parsed
              }}
              onChange={(value) => {
                console.log('[InvoiceViewNew.onChange] Изменение суммы с НДС:', value, 'тип:', typeof value)
                // В строковом режиме value приходит как строка
                if (value !== undefined && value !== null && value !== '') {
                  // Преобразуем строку с точкой (после парсера) в число
                  const strValue = value.toString().replace(',', '.')
                  const numValue = parseFloat(strValue)
                  console.log('[InvoiceViewNew.onChange] Числовое значение:', numValue)
                  if (!isNaN(numValue)) {
                    handleCalculateAmounts(numValue)
                  }
                }
              }}
              onBlur={(e) => {
                const currentValue = form.getFieldValue('amount_with_vat')
                console.log('[InvoiceViewNew.onBlur] Потеря фокуса, текущее значение в форме:', currentValue)
                console.log('[InvoiceViewNew.onBlur] Значение в поле:', e.target.value)
              }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item
            name="vat_rate"
            label="Ставка НДС (%)"
            style={{ marginBottom: 12 }}
          >
            <Select
              style={{ width: '100%' }}
              size="small"
              onChange={(value) => {
                console.log('[InvoiceViewNew] Изменена ставка НДС на:', value)
                // Важно: вызываем handleCalculateAmounts после обновления значения в форме
                setTimeout(() => {
                  handleCalculateAmounts()
                }, 0)
              }}
              options={[
                { label: '0% (Без НДС)', value: 0 },
                { label: '5%', value: 5 },
                { label: '7%', value: 7 },
                { label: '10%', value: 10 },
                { label: '20%', value: 20 }
              ]}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name="amount_net"
            label="Сумма без НДС"
            style={{ marginBottom: 12 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              size="small"
              disabled
              precision={2}
              stringMode // Строковый режим для точного отображения
              formatter={value => {
                // Сохраняем десятичные знаки при форматировании
                if (!value) {return ''}
                const strValue = value.toString()
                const parts = strValue.split('.')
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                // Ограничиваем дробную часть до 2 знаков
                if (parts[1] && parts[1].length > 2) {
                  parts[1] = parts[1].substring(0, 2)
                }
                return parts.join(',') // Используем запятую для отображения
              }}
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={12}>
          <Form.Item
            name="vat_amount"
            label="Сумма НДС"
            style={{ marginBottom: 12 }}
          >
            <InputNumber
              style={{ width: '100%' }}
              size="small"
              disabled
              precision={2}
              stringMode // Строковый режим для точного отображения
              formatter={value => {
                // Сохраняем десятичные знаки при форматировании
                if (!value) {return ''}
                const strValue = value.toString()
                const parts = strValue.split('.')
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                // Ограничиваем дробную часть до 2 знаков
                if (parts[1] && parts[1].length > 2) {
                  parts[1] = parts[1].substring(0, 2)
                }
                return parts.join(',') // Используем запятую для отображения
              }}
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>

    <Row gutter={16}>
      <Col xs={24} lg={12}>
        <Card type="inner" title="Поставка" size="small">
          <Row gutter={[8, 8]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="delivery_days"
                label="Дней до поставки"
                style={{ marginBottom: 12 }}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  size="small"
                  min={0}
                  onChange={handleDeliveryDaysChange}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="delivery_days_type"
                label="Тип дней"
                style={{ marginBottom: 12 }}
              >
                <Select
                  size="small"
                  onChange={handleDeliveryDaysChange}
                  options={[
                    { label: 'Календарные', value: 'calendar' },
                    { label: 'Рабочие', value: 'working' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: 'rgba(0, 0, 0, 0.85)', marginBottom: 4, display: 'block' }}>
                  Предварительная дата поставки
                </label>
                <div style={{
                  padding: '8px 12px',
                  background: '#f5f5f5',
                  borderRadius: 4,
                  minHeight: 32,
                  display: 'flex',
                  alignItems: 'center',
                  color: deliveryDate ? 'rgba(0, 0, 0, 0.85)' : 'rgba(0, 0, 0, 0.25)'
                }}>
                  {deliveryDate ? (
                    <>
                      <strong>{deliveryDate.format('DD.MM.YYYY')}</strong>
                      <span style={{ marginLeft: 8, color: '#1890ff' }}>
                        ({deliveryDate.locale('ru').format('dddd')})
                      </span>
                    </>
                  ) : (
                    <span>Не указана</span>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card type="inner" title="Прочее" size="small">
          <Form.Item
            name="priority"
            label="Приоритет"
            style={{ marginBottom: 12 }}
          >
            <Select
              placeholder="Выберите приоритет"
              loading={loadingPriorities}
              allowClear
              size="small"
              options={priorities?.map((priority: any) => {
                console.log('[InvoiceViewNew] Приоритет:', priority)
                // Для enum используем value и label
                return {
                  label: priority.label || priority.name,
                  value: priority.value || priority.code
                }
              })}
            />
          </Form.Item>
        </Card>
      </Col>
    </Row>
  </Space>
)

// Render payments tab
// Обработчик добавления платежа
const handleAddPayment = () => {
  console.log('[InvoiceViewNew.handleAddPayment] Открытие модального окна добавления платежа')

  if (!invoice) {
    message.error('Не загружена информация о счете')
    return
  }

  // Устанавливаем начальные значения для формы платежа
  const remainingAmount = invoice.total_amount - (invoice.paid_amount || 0)
  const vatRate = invoice.vat_rate || 20
  const vatAmount = remainingAmount * vatRate / (100 + vatRate)
  const amountNet = remainingAmount - vatAmount

  paymentForm.setFieldsValue({
    payment_date: dayjs(),
    total_amount: remainingAmount > 0 ? remainingAmount : 0,
    vat_rate: vatRate,
    vat_amount: parseFloat(vatAmount.toFixed(2)),
    amount_net: parseFloat(amountNet.toFixed(2))
  })

  setCurrentPaymentAmount(remainingAmount)
  setPaymentModalVisible(true)
}

// Обработчик создания платежа
const handleCreatePayment = async () => {
  try {
    const values = await paymentForm.validateFields()

    console.log('[InvoiceViewNew.handleCreatePayment] Создание платежа:', {
      invoiceId: id,
      invoice: invoice,
      values,
      defaultStatus: 'draft'
    })

    const { PaymentCrudService } = await import('@/services/payments/crud')

    // Создаем запись платежа через PaymentCrudService
    const paymentData = {
      invoice_id: parseInt(id!),
      payment_date: values.payment_date.format('YYYY-MM-DD'),
      payer_id: invoice?.payer_id || 1,
      total_amount: values.total_amount,
      comment: values.comment || '',
      status: 'draft', // Используем статус 'draft' (Черновик) по умолчанию
      payment_type_id: values.payment_type_id, // Добавляем тип платежа
      // VAT поля для сохранения в БД
      vat_rate: values.vat_rate || invoice?.vat_rate || 20,
      vat_amount: values.vat_amount || 0,
      amount_net: values.amount_net || 0
    }

    console.log('[InvoiceViewNew.handleCreatePayment] Данные для создания платежа:', paymentData)

    const response = await PaymentCrudService.create(paymentData as any)

    if (response.error) {
      console.error('[InvoiceViewNew.handleCreatePayment] Ошибка создания платежа:', response.error)
      throw new Error(response.error)
    }

    console.log('[InvoiceViewNew.handleCreatePayment] Платеж создан:', response.data)

    // Платежи создаются со статусом 'draft' (Черновик), поэтому не обновляем paid_amount
    // paid_amount обновляется только когда платеж будет одобрен и переведен в статус paid, approved или scheduled

    message.success('Платеж успешно создан')
    setPaymentModalVisible(false)
    paymentForm.resetFields()
    setCurrentPaymentAmount(0)

    // Перезагружаем данные счета и платежи
    refetchInvoice()
    refetchPayments()

    // Инвалидируем кэш истории для мгновенного обновления
    queryClient.invalidateQueries({ queryKey: ['invoice-history', id] })
  } catch (error) {
    console.error('[InvoiceViewNew.handleCreatePayment] Ошибка:', error)
    message.error('Ошибка при создании платежа')
  }
}

// Обработчик редактирования платежа
const handleEditPayment = (payment: any) => {
  console.log('[InvoiceViewNew.handleEditPayment] Редактирование платежа:', payment)

  setEditingPayment(payment)

  // Вычисляем НДС
  const vatRate = invoice?.vat_rate || 20
  const vatAmount = payment.total_amount ? payment.total_amount * vatRate / (100 + vatRate) : 0
  const amountNet = payment.total_amount ? payment.total_amount - vatAmount : 0

  paymentEditForm.setFieldsValue({
    payment_date: payment.payment_date ? dayjs(payment.payment_date) : dayjs(),
    total_amount: payment.total_amount || 0,
    payment_type_id: payment.payment_type_id || undefined, // Добавляем тип платежа
    vat_rate: vatRate,
    vat_amount: parseFloat(vatAmount.toFixed(2)),
    amount_net: parseFloat(amountNet.toFixed(2)),
    comment: payment.comment || ''
  })
  setEditPaymentModalVisible(true)
}

const handleSaveEditedPayment = async () => {
  try {
    const values = await paymentEditForm.validateFields()
    console.log('[InvoiceViewNew.handleSaveEditedPayment] Сохранение изменений платежа:', {
      paymentId: editingPayment.id,
      values
    })

    const { PaymentCrudService } = await import('@/services/payments/crud')

    // Подготавливаем данные для обновления
    const updateData = {
      ...values,
      payment_date: values.payment_date ? values.payment_date.toISOString() : undefined,
      updated_at: new Date().toISOString()
    }

    const result = await PaymentCrudService.update(editingPayment.id, updateData)

    if (result.error) {
      throw new Error(result.error)
    }

    message.success('Платеж успешно обновлен')
    setEditPaymentModalVisible(false)
    setEditingPayment(null)
    paymentEditForm.resetFields()
    refetchPayments()
    refetchInvoice()
    // Инвалидируем кэш истории для мгновенного обновления
    queryClient.invalidateQueries({ queryKey: ['invoice-history', id] })
  } catch (error: any) {
    console.error('[InvoiceViewNew.handleSaveEditedPayment] Ошибка сохранения:', error)
    message.error(error.message || 'Ошибка при сохранении платежа')
  }
}

const handleDeletePayment = async (payment: any) => {
  console.log('[InvoiceViewNew.handleDeletePayment] Удаление платежа:', payment)

  Modal.confirm({
    title: 'Удалить платеж?',
    content: `Вы уверены, что хотите удалить платеж ${payment.internal_number || '#' + payment.id}?`,
    okText: 'Удалить',
    cancelText: 'Отмена',
    okType: 'danger',
    onOk: async () => {
      try {
        const { PaymentCrudService } = await import('@/services/payments/crud')
        const result = await PaymentCrudService.delete(payment.id)

        if (result.error) {
          throw new Error(result.error)
        }

        message.success('Платеж успешно удален')
        refetchPayments()
        refetchInvoice()
        // Инвалидируем кэш истории для мгновенного обновления
        queryClient.invalidateQueries({ queryKey: ['invoice-history', id] })
      } catch (error) {
        console.error('[InvoiceViewNew.handleDeletePayment] Ошибка:', error)
        message.error('Ошибка при удалении платежа')
      }
    }
  })
}

// Обработчик отправки на согласование
const handleSendToApproval = async (payment: any) => {
  console.log('[InvoiceViewNew.handleSendToApproval] Отправка на согласование:', payment)

  setSelectedPaymentForApproval(payment)
  setApprovalModalVisible(true)

  // Загружаем доступные процессы согласования
  setLoadingWorkflows(true)
  try {
    const { supabase } = await import('@/services/supabase')
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('[InvoiceViewNew.handleSendToApproval] Ошибка загрузки процессов:', error)
      message.error('Ошибка загрузки процессов согласования')
    } else {
      console.log('[InvoiceViewNew.handleSendToApproval] Процессы загружены:', data)
      setWorkflows(data || [])
    }
  } catch (error) {
    console.error('[InvoiceViewNew.handleSendToApproval] Ошибка:', error)
    message.error('Ошибка загрузки процессов согласования')
  } finally {
    setLoadingWorkflows(false)
  }
}

// Обработчик запуска процесса согласования
const handleStartApprovalWorkflow = async () => {
  if (!selectedWorkflow) {
    message.warning('Выберите процесс согласования')
    return
  }

  if (!selectedPaymentForApproval) {
    message.warning('Не выбран платеж для согласования')
    return
  }

  console.log('[InvoiceViewNew.handleStartApprovalWorkflow] Запуск процесса:', {
    payment: selectedPaymentForApproval,
    paymentId: selectedPaymentForApproval.id,
    workflowId: selectedWorkflow,
    userId: user?.id
  })

  try {
    // Импортируем сервис для работы с workflow платежей
    const { PaymentWorkflowService } = await import('@/services/admin/payment-workflow')
    const { PaymentCrudService } = await import('@/services/payments/crud')

    // Проверяем user ID
    if (!user?.id) {
      throw new Error('Не удалось определить пользователя')
    }

    console.log('[InvoiceViewNew.handleStartApprovalWorkflow] Создание workflow instance...')

    // Создаем экземпляр процесса согласования
    const workflowInstance = await PaymentWorkflowService.startPaymentWorkflow(
      selectedPaymentForApproval.id,
      selectedWorkflow,
      user.id
    )

    console.log('[InvoiceViewNew.handleStartApprovalWorkflow] Workflow instance создан:', workflowInstance)
    // Статус платежа уже обновлен на "pending" в PaymentWorkflowService.startPaymentWorkflow

    message.success('Платеж успешно отправлен на согласование')
    setApprovalModalVisible(false)
    setSelectedPaymentForApproval(null)
    setSelectedWorkflow(null)

    // Обновляем данные
    refetchPayments()
    refetchInvoice()
  } catch (error: any) {
    console.error('[InvoiceViewNew.handleStartApprovalWorkflow] Ошибка:', error)
    console.error('[InvoiceViewNew.handleStartApprovalWorkflow] Детали ошибки:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      stack: error?.stack
    })

    // Показываем более информативное сообщение об ошибке
    const errorMessage = error?.message || 'Неизвестная ошибка'
    message.error(`Ошибка при отправке на согласование: ${errorMessage}`)
  }
}

// Обработчик загрузки документов
const handleUploadDocument = async (file: any) => {
  console.log('[InvoiceViewNew.handleUploadDocument] Загрузка документа:', {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    invoiceId: id
  })

  if (!id) {
    console.error('[InvoiceViewNew.handleUploadDocument] Нет ID счета')
    message.error('Ошибка: не определен ID счета')
    return false
  }

  setUploadingFile(true)

  try {
    // Сначала проверяем, что bucket существует
    await InvoiceFileStorage.ensureBucketExists()

    // Получаем ID текущего пользователя
    const userId = user?.id
    console.log('[InvoiceViewNew.handleUploadDocument] ID пользователя:', userId)

    // Загружаем файл
    const result = await InvoiceFileStorage.uploadFile(id, file, userId)

    console.log('[InvoiceViewNew.handleUploadDocument] Результат загрузки:', result)

    if (result.error) {
      console.error('[InvoiceViewNew.handleUploadDocument] Ошибка от сервиса:', result.error)

      // Проверяем, является ли ошибка строкой или объектом
      const errorMessage = typeof result.error === 'string'
        ? result.error
        : result.error?.message || 'Неизвестная ошибка при загрузке файла'

      message.error(`Ошибка загрузки: ${errorMessage}`)
    } else if (result.data) {
      console.log('[InvoiceViewNew.handleUploadDocument] Файл успешно загружен:', result.data)
      message.success(`Документ ${file.name} успешно загружен`)

      // Перезагружаем список документов
      await loadDocuments()

      // Инвалидируем кэш истории для мгновенного обновления
      queryClient.invalidateQueries({ queryKey: ['invoice-history', id] })

      // Также обновляем счет для получения актуальных данных
      if (refetchInvoice) {
        await refetchInvoice()
      }
    } else {
      console.warn('[InvoiceViewNew.handleUploadDocument] Неожиданный результат:', result)
      message.warning('Файл загружен, но требуется обновление страницы')

      // Все равно пытаемся обновить список документов
      await loadDocuments()
    }
  } catch (error) {
    console.error('[InvoiceViewNew.handleUploadDocument] Ошибка загрузки:', error)
    message.error('Ошибка при загрузке документа')
  } finally {
    setUploadingFile(false)
  }

  return false // Prevent default upload behavior
}

// Handler for file preview
const handlePreviewDocument = async (doc: any) => {
  console.log('[InvoiceViewNew.handlePreviewDocument] Открытие документа для просмотра:', {
    doc,
    storage_path: doc.storage_path,
    mime_type: doc.mime_type,
    original_name: doc.original_name,
    attachment_id: doc.attachment_id || doc.attachment?.id
  })

  setPreviewFile(doc)
  setPreviewModalVisible(true)
  setPreviewLoading(true)

  try {
    // Проверяем тип storage_path
    const isLocalFile = doc.storage_path?.startsWith('local://')
    const isStorageFile = doc.storage_path?.startsWith('invoices/')

    console.log('[InvoiceViewNew.handlePreviewDocument] Тип файла:', {
      isLocalFile,
      isStorageFile,
      storage_path: doc.storage_path
    })

    if (isLocalFile) {
      // Для локальных файлов пытаемся перезагрузить в storage
      console.log('[InvoiceViewNew.handlePreviewDocument] Попытка перезагрузки локального файла в storage')

      // Пытаемся получить attachment_id
      const attachmentId = doc.attachment_id || doc.attachment?.id
      console.log('[InvoiceViewNew.handlePreviewDocument] Attachment ID:', attachmentId)

      if (attachmentId) {
        // Пытаемся получить URL через reuploadLocalFile
        const { InvoiceFileStorage } = await import('@/services/invoices/file-storage')
        const reuploadResult = await InvoiceFileStorage.reuploadLocalFile(attachmentId, id!)

        if (reuploadResult.data) {
          console.log('[InvoiceViewNew.handlePreviewDocument] Получен URL для просмотра')
          setPreviewFile({ ...doc, previewUrl: reuploadResult.data })
          setPreviewLoading(false)
          return
        }
      }

      // Показываем информационное сообщение с предложением повторной загрузки
      setPreviewFile({
        ...doc,
        previewUrl: null,
        isLocal: true,
        localMessage: 'Файл был сохранен только в базе данных из-за ограничений безопасности. Для просмотра требуется повторная загрузка.'
      })

      // Не закрываем модальное окно - показываем информацию о файле
      setPreviewLoading(false)
      return
    }

    // Если файл - изображение, создаем URL для его отображения
    if (doc.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(doc.original_name)) {
      console.log('[InvoiceViewNew.handlePreviewDocument] Обработка изображения')

      // Для файлов в storage пытаемся получить signed URL
      if (isStorageFile) {
        const { supabase } = await import('@/services/supabase')

        console.log('[InvoiceViewNew.handlePreviewDocument] Создание signed URL для изображения:', doc.storage_path)

        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storage_path, 300) // URL действителен 5 минут

        if (!error && data?.signedUrl) {
          console.log('[InvoiceViewNew.handlePreviewDocument] Signed URL создан успешно')
          setPreviewFile({ ...doc, previewUrl: data.signedUrl })
        } else {
          console.error('[InvoiceViewNew.handlePreviewDocument] Ошибка получения signed URL:', error)

          // Пробуем получить публичный URL как fallback
          const { data: publicUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(doc.storage_path)

          if (publicUrlData?.publicUrl) {
            console.log('[InvoiceViewNew.handlePreviewDocument] Используем публичный URL как fallback')
            setPreviewFile({ ...doc, previewUrl: publicUrlData.publicUrl })
          } else {
            message.warning('Не удалось загрузить изображение для просмотра')
            setPreviewFile({ ...doc, previewUrl: null, error: 'Не удалось получить URL файла' })
          }
        }
      }
    } else if (doc.mime_type?.includes('pdf')) {
      console.log('[InvoiceViewNew.handlePreviewDocument] Обработка PDF')

      // Для PDF файлов также создаем signed URL
      if (isStorageFile) {
        const { supabase } = await import('@/services/supabase')

        console.log('[InvoiceViewNew.handlePreviewDocument] Создание signed URL для PDF:', doc.storage_path)

        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(doc.storage_path, 300)

        if (!error && data?.signedUrl) {
          console.log('[InvoiceViewNew.handlePreviewDocument] Signed URL для PDF создан успешно')
          setPreviewFile({ ...doc, previewUrl: data.signedUrl })
        } else {
          console.error('[InvoiceViewNew.handlePreviewDocument] Ошибка получения URL для PDF:', error)

          // Пробуем публичный URL как fallback
          const { data: publicUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(doc.storage_path)

          if (publicUrlData?.publicUrl) {
            console.log('[InvoiceViewNew.handlePreviewDocument] Используем публичный URL для PDF как fallback')
            setPreviewFile({ ...doc, previewUrl: publicUrlData.publicUrl })
          } else {
            message.warning('Не удалось загрузить PDF для просмотра')
            setPreviewFile({ ...doc, previewUrl: null, error: 'Не удалось получить URL файла' })
          }
        }
      }
    } else {
      console.log('[InvoiceViewNew.handlePreviewDocument] Файл другого типа:', doc.mime_type)
      // Для других типов файлов показываем информацию
      setPreviewFile({ ...doc, previewUrl: null })
    }
  } catch (error) {
    console.error('[InvoiceViewNew.handlePreviewDocument] Критическая ошибка:', error)
    message.error('Ошибка при открытии документа')
    setPreviewFile({ ...doc, previewUrl: null, error: 'Произошла ошибка при загрузке файла' })
  } finally {
    setPreviewLoading(false)
  }
}

// Render preview modal content
const renderPreviewContent = () => {
  if (!previewFile) {return null}

  if (previewLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 0' }}>
        <Spin size="large" tip="Загрузка файла..." />
      </div>
    )
  }

  // Особая обработка для локальных файлов
  if (previewFile.isLocal) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px' }}>
        <FileExclamationOutlined style={{ fontSize: 64, color: '#faad14' }} />
        <Title level={4} style={{ marginTop: 24, marginBottom: 16 }}>
          Файл недоступен для просмотра
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
          {previewFile.localMessage || 'Файл сохранен только в базе данных'}
        </Text>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card type="inner" style={{ backgroundColor: '#f6f8fa' }}>
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Text strong>Информация о файле:</Text>
              <Text>Название: {previewFile.original_name || 'Неизвестно'}</Text>
              <Text>Тип: {previewFile.mime_type || 'Неизвестно'}</Text>
              <Text>Размер: {previewFile.size_bytes ? `${(previewFile.size_bytes / 1024).toFixed(1)} KB` : 'Неизвестно'}</Text>
            </Space>
          </Card>
          <Alert
            message="Что можно сделать?"
            description="Обратитесь к администратору для настройки прав доступа к хранилищу файлов или попробуйте загрузить файл заново."
            type="info"
            showIcon
          />
        </Space>
      </div>
    )
  }

  // Обработка ошибок
  if (previewFile.error) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px' }}>
        <FileExclamationOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />
        <Title level={4} style={{ marginTop: 24, marginBottom: 16, color: '#ff4d4f' }}>
          Ошибка загрузки файла
        </Title>
        <Text type="secondary">{previewFile.error}</Text>
      </div>
    )
  }

  // Для изображений
  if (previewFile.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(previewFile.original_name)) {
    if (previewFile.previewUrl) {
      return (
        <div style={{ textAlign: 'center' }}>
          <img
            src={previewFile.previewUrl}
            alt={previewFile.original_name}
            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
            onError={(e) => {
              console.error('[InvoiceViewNew.renderPreviewContent] Ошибка загрузки изображения')
              // При ошибке загрузки обновляем состояние
              setPreviewFile({ ...previewFile, previewUrl: null, error: 'Не удалось загрузить изображение' })
            }}
          />
        </div>
      )
    } else {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <FileImageOutlined style={{ fontSize: 64, color: '#ccc' }} />
          <p style={{ marginTop: 16, color: '#999' }}>Изображение недоступно для просмотра</p>
        </div>
      )
    }
  }

  // Для PDF
  if (previewFile.mime_type?.includes('pdf')) {
    if (previewFile.previewUrl) {
      return (
        <iframe
          src={previewFile.previewUrl}
          style={{ width: '100%', height: '70vh', border: 'none' }}
          title={previewFile.original_name}
        />
      )
    } else {
      return (
        <div style={{ textAlign: 'center', padding: '50px 0' }}>
          <FilePdfOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />
          <p style={{ marginTop: 16, color: '#999' }}>PDF файл недоступен для просмотра</p>
        </div>
      )
    }
  }

  // Для остальных файлов показываем информацию
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        {getFileIcon(previewFile.mime_type, previewFile.original_name)}
      </div>
      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="Название">{previewFile.original_name}</Descriptions.Item>
        <Descriptions.Item label="Размер">{formatFileSize(previewFile.size_bytes)}</Descriptions.Item>
        <Descriptions.Item label="Тип">{previewFile.mime_type || 'Неизвестно'}</Descriptions.Item>
        <Descriptions.Item label="Загружен">
          {dayjs(previewFile.created_at).format('DD.MM.YYYY HH:mm')}
        </Descriptions.Item>
      </Descriptions>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Text type="secondary">Предпросмотр недоступен для данного типа файла</Text>
      </div>
    </div>
  )
}

// Загрузка документов счета
const loadDocuments = useCallback(async () => {
  if (!id) {return}

  console.log('[InvoiceViewNew.loadDocuments] Загрузка документов для счета:', id)
  setLoadingDocuments(true)

  try {
    // Используем метод из file-storage.ts который правильно объединяет таблицы
    const { InvoiceFileStorage } = await import('@/services/invoices/file-storage')
    const result = await InvoiceFileStorage.getInvoiceDocuments(id)

    if (result.error) {
      console.error('[InvoiceViewNew.loadDocuments] Ошибка загрузки документов:', result.error)
      message.error('Ошибка при загрузке документов')
      setDocuments([])
    } else {
      console.log('[InvoiceViewNew.loadDocuments] Загруженные документы:', result.data)
      // Данные уже содержат всю необходимую информацию из обеих таблиц
      setDocuments(result.data || [])
    }
  } catch (error) {
    console.error('[InvoiceViewNew.loadDocuments] Ошибка загрузки документов:', error)
    message.error('Ошибка при загрузке документов')
  } finally {
    setLoadingDocuments(false)
  }
}, [id])


// Загружаем документы при монтировании компонента
useEffect(() => {
  if (activeTab === 'documents') {
    loadDocuments()
  }
}, [activeTab, loadDocuments])

// Получение иконки для файла
const getFileIcon = (mimeType: string, fileName: string = '') => {
  if (mimeType?.includes('pdf') || fileName.endsWith('.pdf')) {
    return <FilePdfOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
  }
  if (mimeType?.includes('image') || /\.(jpg|jpeg|png|gif|bmp)$/i.test(fileName)) {
    return <FileImageOutlined style={{ fontSize: 24, color: '#1890ff' }} />
  }
  if (mimeType?.includes('excel') || /\.(xls|xlsx)$/i.test(fileName)) {
    return <FileExcelOutlined style={{ fontSize: 24, color: '#52c41a' }} />
  }
  if (mimeType?.includes('word') || /\.(doc|docx)$/i.test(fileName)) {
    return <FileWordOutlined style={{ fontSize: 24, color: '#1890ff' }} />
  }
  return <FileTextOutlined style={{ fontSize: 24, color: '#8c8c8c' }} />
}

// Форматирование размера файла
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {return '0 B'}
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const renderPayments = () => {
  console.log('[InvoiceViewNew.renderPayments] Отображение платежей:', paymentsResponse)

  return (
    <Card type="inner" title={<><CreditCardOutlined style={{ marginRight: 8 }} />Управление платежами</>}>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={handleAddPayment}
        >
          Добавить платеж
        </Button>
      </div>
      {loadingPayments ? (
        <Spin tip="Загрузка платежей..." />
      ) : (
        <Table
          dataSource={paymentsResponse?.data || []}
          size="small"
          rowKey="id"
          rowClassName={(record: any) => {
            // Подсвечиваем строку, если ID платежа совпадает с переданным в URL
            return highlightPaymentId && record.id === Number(highlightPaymentId)
              ? 'highlighted-row'
              : ''
          }}
          pagination={{ pageSize: 10, size: 'small' }}
          columns={[
        {
          title: 'Номер',
          dataIndex: 'internal_number',
          key: 'internal_number',
          width: 200,
          sorter: (a: any, b: any) => (a.internal_number || '').localeCompare(b.internal_number || ''),
          render: (text: string) => text || '-'
        },
        {
          title: 'Дата',
          dataIndex: 'payment_date',
          key: 'payment_date',
          width: 100,
          sorter: (a: any, b: any) => dayjs(a.payment_date).unix() - dayjs(b.payment_date).unix(),
          defaultSortOrder: 'descend',
          render: (date: string) => dayjs(date).format('DD.MM.YYYY')
        },
        {
          title: 'Сумма',
          dataIndex: 'total_amount',
          key: 'amount',
          align: 'right',
          sorter: (a: any, b: any) => (a.total_amount || 0) - (b.total_amount || 0),
          render: (amount: number) => (
            <Text strong>
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB'
              }).format(amount || 0)}
            </Text>
          )
        },
        {
          title: 'Тип',
          dataIndex: 'payment_type_id',
          key: 'payment_type',
          width: 150,
          render: (typeId: string) => {
            const paymentType = paymentTypes.find(type => type.id === typeId)
            return paymentType ? (
              <Tag color="blue">{paymentType.name}</Tag>
            ) : (
              <Text type="secondary">-</Text>
            )
          }
        },
        {
          title: 'Статус',
          dataIndex: 'status',
          key: 'status',
          sorter: (a: any, b: any) => (a.status || '').localeCompare(b.status || ''),
          render: (status: string) => {
            const statusConfig: Record<string, { color: string, icon: React.ReactNode, text: string }> = {
              draft: { color: 'default', icon: <FileTextOutlined />, text: 'Черновик' },
              pending: { color: 'warning', icon: <ClockCircleOutlined />, text: 'На согласовании' },
              approved: { color: 'volcano', icon: <CheckCircleOutlined />, text: 'Согласован' },
              scheduled: { color: 'magenta', icon: <ClockCircleOutlined />, text: 'В графике' },
              paid: { color: 'success', icon: <CheckCircleOutlined />, text: 'Оплачен' },
              completed: { color: 'success', icon: <CheckCircleOutlined />, text: 'Завершен' },
              processing: { color: 'processing', icon: <ClockCircleOutlined />, text: 'В обработке' },
              failed: { color: 'error', icon: <ExclamationCircleOutlined />, text: 'Ошибка' },
              cancelled: { color: 'error', icon: <CloseOutlined />, text: 'Отменен' }
            }
            const config = statusConfig[status] || { color: 'default', icon: null, text: status }
            return (
              <Tag color={config.color} icon={config.icon}>
                {config.text}
              </Tag>
            )
          }
        },
        {
          title: 'Примечания',
          dataIndex: 'comment',
          key: 'comment',
          ellipsis: true,
          sorter: (a: any, b: any) => (a.comment || '').localeCompare(b.comment || '')
        },
        {
          title: 'Действия',
          key: 'actions',
          width: 120,
          fixed: 'right',
          render: (_: any, record: any) => (
            <Space size="small">
              <Button
                type="link"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEditPayment(record)}
                title="Редактировать"
              />
              <Button
                type="link"
                icon={<SendOutlined />}
                size="small"
                onClick={() => handleSendToApproval(record)}
                disabled={record.status !== 'draft'}
                title="Отправить на согласование"
              />
              <Button
                type="link"
                icon={<DeleteOutlined />}
                size="small"
                danger
                onClick={() => handleDeletePayment(record)}
                disabled={['paid', 'approved', 'scheduled'].includes(record.status)}
                title="Удалить"
              />
            </Space>
          )
        }
      ]}
        />
      )}
    </Card>
  )
}

// Render documents tab
const renderDocuments = () => (
  <Card type="inner" title={<><FileOutlined style={{ marginRight: 8 }} />Документы</>}>
    <div style={{ marginBottom: 16 }}>
      <Upload
        beforeUpload={handleUploadDocument}
        showUploadList={false}
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
      >
        <Button
          icon={<UploadOutlined />}
          loading={uploadingFile}
          disabled={uploadingFile}
        >
          {uploadingFile ? 'Загрузка...' : 'Загрузить документ'}
        </Button>
      </Upload>
    </div>

    {loadingDocuments ? (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" />
      </div>
    ) : documents.length > 0 ? (
      <List
        dataSource={documents}
        renderItem={(doc: any) => (
          <List.Item
            key={doc.id}
            actions={[
              <Button
                type="link"
                icon={<EyeOutlined />}
                size="small"
                onClick={() => handlePreviewDocument(doc)}
                title="Просмотреть"
              />,
              <Button
                type="link"
                icon={<DownloadOutlined />}
                size="small"
                onClick={async () => {
                  try {
                    console.log('[InvoiceViewNew] Скачивание документа:', {
                      doc,
                      storagePath: doc.storage_path,
                      attachmentId: doc.attachment_id
                    })

                    // Используем метод getFileDownloadUrl для получения URL
                    const { InvoiceFileStorage } = await import('@/services/invoices/file-storage')
                    const result = await InvoiceFileStorage.getFileDownloadUrl(doc.storage_path)

                    if (result.error) {
                      console.error('[InvoiceViewNew] Ошибка получения URL для скачивания:', result.error)

                      // Для локальных файлов показываем информативное сообщение
                      if (doc.storage_path?.startsWith('local://')) {
                        message.info('Файл был сохранен только в базе данных. Для скачивания попробуйте загрузить файл заново.')
                      } else {
                        message.error(result.error || 'Ошибка при скачивании файла')
                      }
                      return
                    }

                    if (result.data) {
                      console.log('[InvoiceViewNew] URL для скачивания получен успешно')

                      // Принудительно скачиваем файл через fetch + blob
                      try {
                        const response = await fetch(result.data)
                        if (!response.ok) {
                          throw new Error('Ошибка загрузки файла')
                        }

                        const blob = await response.blob()
                        const url = window.URL.createObjectURL(blob)

                        const link = document.createElement('a')
                        link.href = url
                        link.download = doc.original_name || 'document'
                        link.style.display = 'none'
                        document.body.appendChild(link)
                        link.click()

                        // Очищаем ресурсы
                        setTimeout(() => {
                          document.body.removeChild(link)
                          window.URL.revokeObjectURL(url)
                        }, 100)

                        console.log('[InvoiceViewNew] Файл успешно скачан:', doc.original_name)
                      } catch (fetchError) {
                        console.error('[InvoiceViewNew] Ошибка загрузки через fetch:', fetchError)

                        // Fallback: пробуем обычный способ с добавлением параметра download
                        const link = document.createElement('a')
                        link.href = result.data + (result.data.includes('?') ? '&' : '?') + 'download=1'
                        link.download = doc.original_name || 'document'
                        link.setAttribute('download', doc.original_name || 'document')
                        link.style.display = 'none'
                        document.body.appendChild(link)
                        link.click()

                        setTimeout(() => {
                          document.body.removeChild(link)
                        }, 100)
                      }
                    }
                  } catch (error) {
                    console.error('[InvoiceViewNew] Критическая ошибка скачивания:', error)
                    message.error('Ошибка при скачивании файла')
                  }
                }}
                title="Скачать"
              />,
              <Button
                type="link"
                icon={<DeleteOutlined />}
                size="small"
                danger
                onClick={async () => {
                  Modal.confirm({
                    title: 'Удалить документ?',
                    content: `Вы уверены, что хотите удалить документ "${doc.original_name}"?`,
                    okText: 'Удалить',
                    cancelText: 'Отмена',
                    okType: 'danger',
                    onOk: async () => {
                      try {
                        console.log('[InvoiceViewNew] Удаление документа:', doc.id)

                        // Удаляем связь из invoice_documents
                        const { supabase } = await import('@/services/supabase')
                        const { error } = await supabase
                          .from('invoice_documents')
                          .delete()
                          .eq('attachment_id', doc.id)

                        if (error) {
                          console.error('[InvoiceViewNew] Ошибка удаления связи:', error)
                          throw error
                        }

                        // Удаляем запись из attachments
                        const { error: attachmentError } = await supabase
                          .from('attachments')
                          .delete()
                          .eq('id', doc.id)

                        if (attachmentError) {
                          console.error('[InvoiceViewNew] Ошибка удаления attachment:', attachmentError)
                          throw attachmentError
                        }

                        // Если файл в storage, пытаемся удалить
                        if (doc.storage_path?.startsWith('invoices/')) {
                          const { error: storageError } = await supabase.storage
                            .from('documents')
                            .remove([doc.storage_path])

                          if (storageError) {
                            console.warn('[InvoiceViewNew] Не удалось удалить файл из storage:', storageError)
                          }
                        }

                        message.success('Документ удален')
                        await loadDocuments()
                        // Инвалидируем кэш истории для мгновенного обновления
                        queryClient.invalidateQueries({ queryKey: ['invoice-history', id] })

                      } catch (error) {
                        console.error('[InvoiceViewNew] Ошибка удаления документа:', error)
                        message.error('Ошибка при удалении документа')
                      }
                    }
                  })
                }}
                title="Удалить"
              />
            ]}
          >
            <List.Item.Meta
              avatar={getFileIcon(doc.mime_type, doc.original_name)}
              title={doc.original_name}
              description={
                <Space>
                  <span>{formatFileSize(doc.size_bytes)}</span>
                  <span>•</span>
                  <span>{dayjs(doc.created_at).format('DD.MM.YYYY HH:mm')}</span>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    ) : (
      <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
        <FileOutlined style={{ fontSize: 48, marginBottom: 16 }} />
        <div>Нет загруженных документов</div>
      </div>
    )}
  </Card>
)

// Render history tab
const renderHistory = () => {
  // Формируем элементы для Timeline из уже загруженных данных
  const timelineItems = historyData?.map(event => {
    const displayData = InvoiceHistoryService.formatEventForDisplay(event)

    // Определяем цвет для Timeline
    const colorMap: Record<string, string> = {
      'blue': 'blue',
      'green': 'green',
      'red': 'red',
      'orange': 'orange',
      'purple': 'purple',
      'default': 'gray'
    }

    return {
      color: colorMap[displayData.color] || 'gray',
      children: (
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ fontSize: 14 }}>{displayData.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <Text strong style={{ fontSize: 13 }}>{displayData.title}</Text>
                {displayData.description && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {displayData.description}
                  </Text>
                )}
              </div>
              <div style={{ marginTop: 2 }}>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {dayjs(event.event_date).format('DD.MM HH:mm')}
                  {event.user_name && ` • ${event.user_name}`}
                </Text>
              </div>
            </div>
          </div>
        </div>
      )
    }
  }) || []

  return (
    <Card type="inner" title={<><HistoryOutlined style={{ marginRight: 8 }} />История изменений</>}>
      {loadingHistory ? (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Spin size="large" />
        </div>
      ) : timelineItems.length > 0 ? (
        <Timeline
          size="small"
          items={timelineItems}
        />
      ) : (
        <div style={{ textAlign: 'center', padding: 50 }}>
          <Text type="secondary">История пуста</Text>
        </div>
      )}
    </Card>
  )
}

  if (invoiceLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!invoice) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Text type="secondary">Счет не найден</Text>
      </div>
    )
  }

  // Разрешаем редактирование для всех статусов кроме 'cancelled'
  // paid и partially_paid - можно продолжать редактировать и добавлять платежи/документы
  // Это позволяет корректировать счета даже после оплаты
  const canEdit = invoice.status !== 'cancelled'

  return (
    <div style={{ padding: '24px' }}>
      {/* Кнопка возврата к платежам, если пришли со страницы платежей */}
      {showReturnButton && (
        <div style={{ marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/payments/list')}
            style={{ marginBottom: 8 }}
          >
            Вернуться к платежам
          </Button>
        </div>
      )}

      {/* Breadcrumb */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: (
              <a onClick={() => navigate('/')}>
                <HomeOutlined style={{ marginRight: 4 }} />
                Главная
              </a>
            )
          },
          {
            title: <a onClick={() => navigate('/invoices/list')}>Счета</a>
          },
          {
            title: invoice.internal_number || `Счет №${invoice.invoice_number}`
          }
        ]}
      />

      {/* Кнопка возврата на страницу согласований, если пришли оттуда */}
      {highlightPaymentId && (
        <div style={{ marginBottom: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => {
              // Если есть сохраненный URL для возврата, используем его
              if (returnUrl) {
                window.location.href = decodeURIComponent(returnUrl)
              } else {
                // Иначе просто переходим на страницу согласований
                navigate('/approvals')
              }
            }}
            type="default"
          >
            Вернуться к согласованиям
          </Button>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          Счет №{invoice.invoice_number} от {dayjs(invoice.invoice_date).format('DD.MM.YYYY')}
        </Title>
      </div>

      {/* Информационное сообщение для оплаченных счетов */}
      {(invoice.status === 'paid' || invoice.status === 'partially_paid') && (
        <Alert
          message="Возможность редактирования"
          description={
            invoice.status === 'paid'
              ? "Счет полностью оплачен, но вы можете продолжать добавлять платежи и документы для корректировки."
              : "Счет частично оплачен. Вы можете продолжать редактировать счет, добавлять платежи и документы."
          }
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
        disabled={!canEdit}
      >
        <Row gutter={16}>
          {/* Left Column - Tabbed Content */}
          <Col xs={24} lg={16}>
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              size="small"
              items={[
                {
                  key: 'info',
                  label: (
                    <span>
                      <InfoCircleOutlined />
                      Основная информация
                    </span>
                  ),
                  children: renderMainForm()
                },
                {
                  key: 'payments',
                  label: (
                    <span>
                      <CreditCardOutlined />
                      Платежи
                    </span>
                  ),
                  children: renderPayments()
                },
                {
                  key: 'documents',
                  label: (
                    <span>
                      <FileOutlined />
                      Документы
                    </span>
                  ),
                  children: renderDocuments()
                },
                {
                  key: 'history',
                  label: (
                    <span>
                      <HistoryOutlined />
                      История
                    </span>
                  ),
                  children: renderHistory()
                }
              ]}
            />
          </Col>

          {/* Right Column - Compact Financial Summary */}
          <Col xs={24} lg={8}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Card
                title={
                  <Space size="small">
                    <DollarOutlined />
                    <span>Финансовая сводка</span>
                  </Space>
                }
                size="small"
                styles={{ body: { padding: '12px 16px' } }}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic
                        title="Без НДС"
                        value={financialSummary.amountNet}
                        formatter={(value) => formatCurrency(Number(value), invoice.currency || 'RUB')}
                        valueStyle={{ fontSize: 14 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={`НДС (${form.getFieldValue('vat_rate') || DEFAULT_VAT_RATE}%)`}
                        value={financialSummary.vatAmount}
                        formatter={(value) => formatCurrency(Number(value), invoice.currency || 'RUB')}
                        valueStyle={{ fontSize: 14 }}
                      />
                    </Col>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <Statistic
                    title="Общая сумма счета"
                    value={financialSummary.totalAmount}
                    formatter={(value) => formatCurrency(Number(value), invoice.currency || 'RUB')}
                    valueStyle={{ color: '#1890ff', fontSize: '20px', fontWeight: 600 }}
                  />
                </Space>
              </Card>

              <Card
                title="Статус оплат"
                size="small"
                styles={{ body: { padding: '8px 12px' } }}
              >
                {paymentsResponse?.data && paymentsResponse.data.length > 0 ? (
                  <>
                    {/* Детальный список платежей */}
                    <div style={{ marginBottom: 12 }}>
                      <Text strong style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                        Платежи ({paymentsResponse.data.length})
                      </Text>
                      <List
                        size="small"
                        dataSource={paymentsResponse.data}
                        renderItem={(payment) => {
                          const statusConfig: Record<string, { color: string, text: string }> = {
                            draft: { color: 'default', text: 'Черновик' },
                            pending: { color: 'warning', text: 'На согласовании' },
                            approved: { color: 'volcano', text: 'Согласован' },
                            scheduled: { color: 'magenta', text: 'В графике' },
                            paid: { color: 'success', text: 'Оплачен' },
                            completed: { color: 'success', text: 'Завершен' },
                            processing: { color: 'processing', text: 'В обработке' },
                            failed: { color: 'error', text: 'Ошибка' },
                            cancelled: { color: 'error', text: 'Отменен' }
                          }
                          const status = payment.status || 'draft'
                          const config = statusConfig[status] || { color: 'default', text: status }

                          return (
                            <List.Item style={{ padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <div style={{ width: '100%' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                  <Text style={{ fontSize: 11, fontWeight: 500 }}>
                                    {payment.internal_number || `#${payment.id}`}
                                  </Text>
                                  <Text strong style={{ fontSize: 12 }}>
                                    {formatCurrency(payment.total_amount || 0, payment.currency || invoice?.currency || 'RUB')}
                                  </Text>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Space size={4}>
                                    <Tag color={config.color} style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                                      {config.text}
                                    </Tag>
                                  </Space>
                                  <Text type="secondary" style={{ fontSize: 10 }}>
                                    {dayjs(payment.payment_date || payment.created_at).format('DD.MM.YY')}
                                  </Text>
                                </div>
                              </div>
                            </List.Item>
                          )
                        }}
                      />
                    </div>

                    <Divider style={{ margin: '8px 0' }} />

                    {/* Сводка по статусам */}
                    {paymentsByStatus.length > 0 && (
                      <>
                        <Text type="secondary" style={{ fontSize: 11, marginBottom: 6, display: 'block' }}>
                          Сводка по статусам
                        </Text>
                        <Table
                          dataSource={paymentsByStatus}
                          columns={[
                            {
                              title: 'Статус',
                              dataIndex: 'status',
                              key: 'status',
                              width: 140,
                              render: (status: string, record) => {
                                const statusConfig: Record<string, { color: string, text: string }> = {
                                  draft: { color: 'default', text: 'Черновик' },
                                  pending: { color: 'warning', text: 'На согласовании' },
                                  approved: { color: 'volcano', text: 'Согласован' },
                                  scheduled: { color: 'magenta', text: 'В графике' },
                                  paid: { color: 'success', text: 'Оплачен' },
                                  completed: { color: 'success', text: 'Завершен' },
                                  processing: { color: 'processing', text: 'В обработке' },
                                  failed: { color: 'error', text: 'Ошибка' },
                                  cancelled: { color: 'error', text: 'Отменен' }
                                }
                                const config = statusConfig[status] || { color: 'default', text: status }
                                return (
                                  <div>
                                    <Tag color={config.color} style={{ fontSize: 10, margin: 0 }}>
                                      {config.text}
                                    </Tag>
                                    <Text type="secondary" style={{ fontSize: 10, marginLeft: 4 }}>
                                      ({record.count})
                                    </Text>
                                  </div>
                                )
                              }
                            },
                            {
                              title: 'Сумма',
                              dataIndex: 'amount',
                              key: 'amount',
                              align: 'right',
                              render: (amount: number, record) => (
                                <Text style={{ fontSize: 12, fontWeight: 500 }}>
                                  {formatCurrency(amount, record.currency || invoice?.currency || 'RUB')}
                                </Text>
                              )
                            }
                          ]}
                          pagination={false}
                          size="small"
                          rowKey="status"
                          showHeader={false}
                        />
                        <Divider style={{ margin: '8px 0' }} />
                      </>
                    )}
                  </>
                ) : (
                  <div style={{ padding: '8px 0' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Платежи отсутствуют</Text>
                  </div>
                )}
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Statistic
                      title="Оплачено"
                      value={financialSummary.paidAmount}
                      formatter={(value) => formatCurrency(Number(value), invoice.currency || 'RUB')}
                      valueStyle={{ color: '#52c41a', fontSize: 13 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Ожидает"
                      value={financialSummary.pendingAmount}
                      formatter={(value) => formatCurrency(Number(value), invoice.currency || 'RUB')}
                      valueStyle={{ color: '#faad14', fontSize: 13 }}
                    />
                  </Col>
                  <Col span={24}>
                    <Divider style={{ margin: '6px 0' }} />
                    <Statistic
                      title="Остаток к оплате"
                      value={financialSummary.balance}
                      formatter={(value) => formatCurrency(Number(value), invoice.currency || 'RUB')}
                      valueStyle={{
                        color: financialSummary.balance > 0 ? '#ff4d4f' : '#52c41a',
                        fontSize: '18px',
                        fontWeight: 'bold'
                      }}
                    />
                  </Col>
                </Row>
              </Card>

            </Space>
          </Col>
        </Row>
      </Form>

      {/* Floating Action Buttons */}
      {hasChanges && (
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px 24px',
            background: 'linear-gradient(to bottom, #fffbe6, #fff7db)',
            borderTop: '1px solid #fadb14',
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
            zIndex: 1000,
            backdropFilter: 'blur(8px)'
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <ExclamationCircleFilled style={{ color: '#faad14', fontSize: 16 }} />
                <Text style={{ color: '#8c6800', fontWeight: 500 }}>
                  Есть несохраненные изменения
                </Text>
              </Space>
              <Space>
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleCancel}
                  size="middle"
                >
                  Отменить
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => void handleSave()}
                  size="middle"
                >
                  Сохранить
                </Button>
              </Space>
            </div>
          </div>
        </div>
      )}

      {/* Modal для добавления платежа */}
      <Modal
        title="Добавить платеж"
        open={paymentModalVisible}
        onOk={() => void handleCreatePayment()}
        onCancel={() => {
          setPaymentModalVisible(false)
          paymentForm.resetFields()
          setCurrentPaymentAmount(0)
        }}
        okText="Создать"
        cancelText="Отмена"
        width={600}
      >
        <Form
          form={paymentForm}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="payment_date"
                label="Дата платежа"
                rules={[{ required: true, message: 'Выберите дату платежа' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="payment_type_id"
                label="Тип платежа"
                rules={[{ required: true, message: 'Выберите тип платежа' }]}
              >
                <Select
                  placeholder="Выберите тип платежа"
                  loading={loadingPaymentTypes}
                  options={paymentTypes.map((type) => ({
                    label: type.name,
                    value: type.id
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="total_amount"
                label="Сумма с НДС"
                rules={[
                  { required: true, message: 'Введите сумму' },
                  { type: 'number', min: 0.01, message: 'Сумма должна быть больше 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  precision={2}
                  formatter={value => {
                    if (!value) { return '' }
                    const parts = value.toString().split('.')
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                    return parts.join(',')
                  }}
                  parser={value => {
                    if (!value) { return '' }
                    return value.replace(/\s/g, '').replace(',', '.')
                  }}
                  onChange={(value) => {
                    setCurrentPaymentAmount(value || 0)
                    // Пересчитываем сумму НДС
                    const vatRate = invoice?.vat_rate || 20
                    const vatAmount = (value || 0) * vatRate / (100 + vatRate)
                    const amountNet = (value || 0) - vatAmount
                    paymentForm.setFieldsValue({
                      vat_amount: parseFloat(vatAmount.toFixed(2)),
                      amount_net: parseFloat(amountNet.toFixed(2))
                    })
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="vat_rate"
                label="НДС %"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  formatter={value => `${value}%`}
                  parser={value => value?.replace('%', '')}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="vat_amount"
                label="Сумма НДС"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  precision={2}
                  formatter={value => {
                    if (!value) { return '' }
                    const parts = value.toString().split('.')
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                    return parts.join(',')
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount_net"
                label="Сумма без НДС"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  precision={2}
                  formatter={value => {
                    if (!value) { return '' }
                    const parts = value.toString().split('.')
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                    return parts.join(',')
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="comment"
                label="Комментарий"
              >
                <Input.TextArea rows={2} placeholder="Дополнительная информация" />
              </Form.Item>
            </Col>
          </Row>

          {/* Статус будет присвоен автоматически как 'Черновик' */}

          <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
            <Row>
              <Col span={12}>
                <Text>Сумма счета:</Text>
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    {new Intl.NumberFormat('ru-RU').format(invoice?.total_amount || 0)} {invoice?.currency || 'RUB'}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text>Остаток к оплате после этого платежа:</Text>
                <div>
                  <Text strong style={{ fontSize: 16, color: currentPaymentAmount > 0 ? '#52c41a' : '#ff4d4f' }}>
                    {new Intl.NumberFormat('ru-RU').format(
                      Math.max(0, (invoice?.total_amount || 0) - (invoice?.paid_amount || 0) - currentPaymentAmount)
                    )} {invoice?.currency || 'RUB'}
                  </Text>
                  {currentPaymentAmount > 0 && (
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Текущий платеж: {new Intl.NumberFormat('ru-RU').format(currentPaymentAmount)} {invoice?.currency || 'RUB'}
                      </Text>
                    </div>
                  )}
                </div>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>

      {/* Modal для редактирования платежа */}
      <Modal
        title="Редактировать платеж"
        open={editPaymentModalVisible}
        onOk={() => void handleSaveEditedPayment()}
        onCancel={() => {
          setEditPaymentModalVisible(false)
          setEditingPayment(null)
          paymentEditForm.resetFields()
        }}
        okText="Сохранить"
        cancelText="Отмена"
        width={600}
      >
        <Form
          form={paymentEditForm}
          layout="vertical"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="payment_date"
                label="Дата платежа"
                rules={[{ required: true, message: 'Выберите дату платежа' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="payment_type_id"
                label="Тип платежа"
                rules={[{ required: true, message: 'Выберите тип платежа' }]}
              >
                <Select
                  placeholder="Выберите тип платежа"
                  loading={loadingPaymentTypes}
                  options={paymentTypes.map((type) => ({
                    label: type.name,
                    value: type.id
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="total_amount"
                label="Сумма с НДС"
                rules={[
                  { required: true, message: 'Введите сумму' },
                  { type: 'number', min: 0.01, message: 'Сумма должна быть больше 0' }
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0.01}
                  precision={2}
                  formatter={value => {
                    if (!value) { return '' }
                    const parts = value.toString().split('.')
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                    return parts.join(',')
                  }}
                  parser={value => {
                    if (!value) { return '' }
                    return value.replace(/\s/g, '').replace(',', '.')
                  }}
                  onChange={(value) => {
                    // Пересчитываем сумму НДС
                    const vatRate = invoice?.vat_rate || 20
                    const vatAmount = (value || 0) * vatRate / (100 + vatRate)
                    const amountNet = (value || 0) - vatAmount
                    paymentEditForm.setFieldsValue({
                      vat_amount: parseFloat(vatAmount.toFixed(2)),
                      amount_net: parseFloat(amountNet.toFixed(2))
                    })
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="vat_rate"
                label="НДС %"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  formatter={value => `${value}%`}
                  parser={value => value?.replace('%', '')}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="vat_amount"
                label="Сумма НДС"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  precision={2}
                  formatter={value => {
                    if (!value) { return '' }
                    const parts = value.toString().split('.')
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                    return parts.join(',')
                  }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amount_net"
                label="Сумма без НДС"
              >
                <InputNumber
                  style={{ width: '100%' }}
                  disabled
                  precision={2}
                  formatter={value => {
                    if (!value) { return '' }
                    const parts = value.toString().split('.')
                    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                    return parts.join(',')
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="comment"
                label="Комментарий"
              >
                <Input.TextArea rows={2} placeholder="Дополнительная информация" />
              </Form.Item>
            </Col>
          </Row>

          <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
            <Row>
              <Col span={12}>
                <Text>Сумма счета:</Text>
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    {new Intl.NumberFormat('ru-RU').format(invoice?.total_amount || 0)} {invoice?.currency || 'RUB'}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <Text>Остаток к оплате:</Text>
                <div>
                  <Text strong style={{ fontSize: 16 }}>
                    {new Intl.NumberFormat('ru-RU').format(
                      Math.max(0, (invoice?.total_amount || 0) - (invoice?.paid_amount || 0))
                    )} {invoice?.currency || 'RUB'}
                  </Text>
                </div>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>

      {/* Modal для выбора процесса согласования */}
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
              <Title level={5} style={{ margin: 0, color: '#1f2937', fontSize: 16 }}>
                Отправка платежа на согласование
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Выберите процесс согласования для обработки платежа
              </Text>
            </div>
          </div>
        }
        open={approvalModalVisible}
        onOk={handleStartApprovalWorkflow}
        onCancel={() => {
          setApprovalModalVisible(false)
          setSelectedPaymentForApproval(null)
          setSelectedWorkflow(null)
        }}
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
          {/* Информация о платеже */}
          {selectedPaymentForApproval && (
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
                  <Title level={5} style={{ margin: 0, color: '#374151', fontSize: 14 }}>
                    Платеж {selectedPaymentForApproval.internal_number || `#${selectedPaymentForApproval.id}`}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {dayjs(selectedPaymentForApproval.payment_date).format('DD.MM.YYYY')}
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
                      selectedPaymentForApproval.total_amount || 0,
                      selectedPaymentForApproval.currency || invoice?.currency || 'RUB'
                    )}
                  </div>
                </div>
              </div>

            </Card>
          )}

          {/* Выбор процесса согласования */}
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
                <Title level={5} style={{ color: '#374151', margin: '0 0 8px', fontSize: 14 }}>
                  Нет доступных процессов
                </Title>
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
                  onChange={setSelectedWorkflow}
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

      {/* File Preview Modal */}
      <Modal
        title={
          <Space>
            <FileOutlined />
            {previewFile?.original_name || 'Просмотр документа'}
          </Space>
        }
        open={previewModalVisible}
        onCancel={() => {
          setPreviewModalVisible(false)
          setPreviewFile(null)
        }}
        footer={[
          <Button
            key="download"
            icon={<DownloadOutlined />}
            onClick={async () => {
              if (previewFile?.storage_path?.startsWith('invoices/')) {
                try {
                  const { supabase } = await import('@/services/supabase')
                  const { data, error } = await supabase.storage
                    .from('documents')
                    .createSignedUrl(previewFile.storage_path, 60)

                  if (!error && data?.signedUrl) {
                    const link = document.createElement('a')
                    link.href = data.signedUrl
                    link.download = previewFile.original_name || 'document'
                    link.click()
                  } else {
                    message.error('Не удалось скачать файл')
                  }
                } catch (error) {
                  console.error('[InvoiceViewNew] Ошибка скачивания:', error)
                  message.error('Ошибка при скачивании файла')
                }
              } else {
                message.warning('Файл недоступен для скачивания')
              }
            }}
          >
            Скачать
          </Button>,
          <Button key="close" onClick={() => {
            setPreviewModalVisible(false)
            setPreviewFile(null)
          }}>
            Закрыть
          </Button>
        ]}
        width={800}
        centered
        destroyOnHidden
      >
        {renderPreviewContent()}
      </Modal>
    </div>
  )
}

export default InvoiceViewNew