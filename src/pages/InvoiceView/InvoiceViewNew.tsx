/**
 * Новая страница просмотра и редактирования счета
 * Основана на форме создания счета с добавлением финансового блока
 */

import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Space,
  Spin,
  message,
  Typography,
  Divider,
  Statistic,
  Table,
  Tag,
  Modal,
  Breadcrumb,
  Tabs,
  Timeline,
  Upload,
  List
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  ExclamationCircleFilled,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileOutlined,
  HistoryOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  PlusOutlined,
  SaveOutlined,
  UploadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileTextOutlined,
  FileExcelOutlined,
  FileWordOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { useInvoice, useUpdateInvoice } from '@/services/hooks/useInvoices'
import { useContractorsList } from '@/services/hooks/useContractors'
import { useProjectsList } from '@/services/hooks/useProjects'
import { useInvoiceTypesList } from '@/services/hooks/useInvoiceTypes'
import { useMaterialResponsiblePersonsList } from '@/services/hooks/useMaterialResponsiblePersons'
import { useCurrencies, usePriorities } from '@/services/hooks/useEnums'
import { useAuthStore } from '@/models/auth'
import { calculateDeliveryDate, calculateVATAmounts } from '../InvoiceCreate/utils/calculations'
import { DEFAULT_CURRENCY, DEFAULT_VAT_RATE } from '../InvoiceCreate/constants'
import { InvoiceFileStorage } from '@/services/invoices/file-storage'
import type { InvoiceFormValues } from '../InvoiceCreate/types'

const { Title, Text } = Typography
const { TextArea } = Input

export const InvoiceViewNew: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form] = Form.useForm<InvoiceFormValues>()
  const { user } = useAuthStore()

  // State
  const [isEditing, setIsEditing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState<dayjs.Dayjs | null>(null)
  const [activeTab, setActiveTab] = useState('info')
  // Payment modal state removed - using paymentModalVisible instead
  const [documents, setDocuments] = useState<any[]>([])
  const [loadingDocuments, setLoadingDocuments] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [paymentForm] = Form.useForm()
  const [financialSummary, setFinancialSummary] = useState({
    amountNet: 0,
    vatAmount: 0,
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    balance: 0
  })

  // console.log('[InvoiceViewNew] Инициализация компонента с ID:', id)

  // Load invoice data
  const { data: invoice, isLoading: invoiceLoading, refetch: refetchInvoice } = useInvoice(id || '')
  const updateInvoiceMutation = useUpdateInvoice()

  // Load related data
  const { data: contractorsResponse, isLoading: loadingContractors } = useContractorsList()
  const { data: projectsResponse, isLoading: loadingProjects } = useProjectsList()
  const { data: invoiceTypes, isLoading: loadingInvoiceTypes } = useInvoiceTypesList()
  const { data: materialResponsiblePersons, isLoading: loadingMRPs } = useMaterialResponsiblePersonsList({ is_active: true })
  const { data: currencies, isLoading: loadingCurrencies } = useCurrencies()
  const { data: priorities, isLoading: loadingPriorities } = usePriorities()

  // Extract data from responses
  const contractors = contractorsResponse?.data ?? []
  const suppliers = contractors.filter((c: any) => c.type_id === 4)
  const payers = contractors.filter((c: any) => c.type_id === 2)
  const projects = projectsResponse ?? []

  // Set form values when invoice loads
  useEffect(() => {
    if (invoice) {
      console.log('[InvoiceViewNew.useEffect] Загрузка данных счета:', {
        id: invoice.id,
        number: invoice.invoice_number,
        status: invoice.status,
        totalAmount: invoice.total_amount,
        currency: invoice.currency,
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
      form.setFieldsValue({
        invoice_number: invoice.invoice_number,
        internal_number: invoice.internal_number,
        invoice_date: invoice.invoice_date ? dayjs(invoice.invoice_date) : dayjs(),
        invoice_type_id: invoice.type_id,
        title: invoice.title,
        description: invoice.description,
        supplier_id: invoice.supplier_id,
        payer_id: invoice.payer_id,
        project_id: invoice.project_id,
        currency: invoice.currency || DEFAULT_CURRENCY,
        amount_with_vat: totalAmount,
        amount_net: amountNet,
        vat_rate: invoice.vat_rate || DEFAULT_VAT_RATE,
        vat_amount: vatAmount,
        delivery_days: invoice.delivery_days,
        delivery_days_type: invoice.delivery_days_type || 'calendar',
        priority: invoice.priority || 'normal',
        material_responsible_person_id: invoice.material_responsible_person_id,
        notes: invoice.notes
      })

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
      const values = await form.validateFields()

      console.log('[InvoiceViewNew.handleSave] Сохранение изменений:', {
        invoiceId: id,
        changes: values,
        hasChanges,
        activeTab
      })

      const updateData = {
        invoice_number: values.invoice_number,
        internal_number: values.internal_number,
        invoice_date: values.invoice_date?.format('YYYY-MM-DD'),
        type_id: values.invoice_type_id,
        description: values.description,
        supplier_id: values.supplier_id,
        payer_id: values.payer_id,
        project_id: values.project_id,
        material_responsible_person_id: values.material_responsible_person_id,
        currency: values.currency,
        total_amount: Number(values.amount_with_vat),
        amount_net: Number(values.amount_net || 0),
        vat_amount: Number(values.vat_amount || 0),
        vat_rate: Number(values.vat_rate || DEFAULT_VAT_RATE),
        delivery_days: values.delivery_days ? Number(values.delivery_days) : null,
        delivery_days_type: values.delivery_days_type || 'calendar',
        priority: values.priority,
        notes: values.notes
      }

      await updateInvoiceMutation.mutateAsync({
        id: id!,
        updates: updateData,
        companyId: user?.companyId || '1'
      })

      message.success('Изменения сохранены')
      setHasChanges(false)
      setIsEditing(false)
      refetchInvoice()
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
            currency: invoice.currency || DEFAULT_CURRENCY,
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
            currency: record.currency || invoice?.currency || 'RUB'
          }).format(amount)}
        </Text>
      )
    }
  ]

  // Group payments by status
  const paymentsByStatus = React.useMemo(() => {
    if (!invoice?.payments) return []

    console.log('[InvoiceViewNew.paymentsByStatus] Группировка платежей:', {
      paymentsCount: invoice.payments.length,
      totalPayments: invoice.payments.reduce((sum: number, p: any) => sum + Number(p.amount_with_vat || 0), 0)
    })

    const grouped = invoice.payments.reduce((acc: any, payment: any) => {
      const status = payment.status || 'pending'
      if (!acc[status]) {
        acc[status] = { status, amount: 0, currency: payment.currency || invoice.currency || 'RUB' }
      }
      acc[status].amount += Number(payment.amount_with_vat || 0)
      return acc
    }, {})

    return Object.values(grouped)
  }, [invoice])

  // Tab change handler
  const handleTabChange = (key: string) => {
    console.log('[InvoiceViewNew.handleTabChange] Переключение вкладки:', { from: activeTab, to: key })
    setActiveTab(key)
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
                if (!value) return ''
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
                if (!value) return ''

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
                if (!value) return ''
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
                if (!value) return ''
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
  paymentForm.setFieldsValue({
    payment_date: dayjs(),
    amount: invoice.total_amount - (invoice.paid_amount || 0), // Остаток к оплате
    currency: invoice.currency || 'RUB',
    payment_method: 'bank_transfer',
    status: 'pending'
  })

  setPaymentModalVisible(true)
}

// Обработчик создания платежа
const handleCreatePayment = async () => {
  try {
    const values = await paymentForm.validateFields()

    console.log('[InvoiceViewNew.handleCreatePayment] Создание платежа:', {
      invoiceId: id,
      values
    })

    const { supabase } = await import('@/services/supabase')

    // Создаем запись платежа
    const { data, error } = await supabase
      .from('payments')
      .insert({
        invoice_id: parseInt(id!),
        payment_date: values.payment_date.format('YYYY-MM-DD'),
        amount: values.amount,
        currency: values.currency,
        payment_method: values.payment_method,
        status: values.status,
        description: values.description,
        created_by: user?.id
      })
      .select()
      .single()

    if (error) {
      console.error('[InvoiceViewNew.handleCreatePayment] Ошибка создания платежа:', error)
      throw error
    }

    console.log('[InvoiceViewNew.handleCreatePayment] Платеж создан:', data)

    // Обновляем paid_amount в счете если платеж завершен
    if (values.status === 'completed') {
      const newPaidAmount = (invoice?.paid_amount || 0) + values.amount
      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaidAmount,
          status: newPaidAmount >= (invoice?.total_amount || 0) ? 'paid' : invoice?.status
        })
        .eq('id', parseInt(id!))

      if (updateError) {
        console.error('[InvoiceViewNew.handleCreatePayment] Ошибка обновления счета:', updateError)
      }
    }

    message.success('Платеж успешно создан')
    setPaymentModalVisible(false)
    paymentForm.resetFields()

    // Перезагружаем данные счета
    refetchInvoice()
  } catch (error) {
    console.error('[InvoiceViewNew.handleCreatePayment] Ошибка:', error)
    message.error('Ошибка при создании платежа')
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
      message.error(`Ошибка загрузки: ${result.error}`)
    } else {
      console.log('[InvoiceViewNew.handleUploadDocument] Файл успешно загружен')
      message.success(`Документ ${file.name} успешно загружен`)
      // Перезагружаем список документов
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

// Загрузка документов счета
const loadDocuments = useCallback(async () => {
  if (!id) return

  console.log('[InvoiceViewNew.loadDocuments] Загрузка документов для счета:', id)
  setLoadingDocuments(true)

  try {
    // Получаем связи invoice_documents
    const invoiceDocsResponse = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/invoice_documents?invoice_id=eq.${id}`,
      {
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      }
    )
    const invoiceDocs = await invoiceDocsResponse.json()

    console.log('[InvoiceViewNew.loadDocuments] Связи документов:', invoiceDocs)

    if (invoiceDocs && invoiceDocs.length > 0) {
      // Получаем attachment_ids
      const attachmentIds = invoiceDocs.map((doc: any) => doc.attachment_id).filter(Boolean)

      if (attachmentIds.length > 0) {
        // Получаем информацию о вложениях
        const attachmentsResponse = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/attachments?id=in.(${attachmentIds.join(',')})`,
          {
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            }
          }
        )
        const attachments = await attachmentsResponse.json()

        console.log('[InvoiceViewNew.loadDocuments] Документы:', attachments)
        setDocuments(attachments || [])
      }
    } else {
      setDocuments([])
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
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const renderPayments = () => (
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
    <Table
      dataSource={invoice?.payments || []}
      size="small"
      pagination={{ pageSize: 10, size: 'small' }}
      columns={[
        {
          title: 'Дата',
          dataIndex: 'payment_date',
          key: 'payment_date',
          render: (date: string) => dayjs(date).format('DD.MM.YYYY')
        },
        {
          title: 'Сумма',
          dataIndex: 'amount_with_vat',
          key: 'amount',
          align: 'right',
          render: (amount: number) => (
            <Text strong>
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: invoice?.currency || 'RUB'
              }).format(amount)}
            </Text>
          )
        },
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
          title: 'Примечания',
          dataIndex: 'description',
          key: 'description',
          ellipsis: true
        }
      ]}
    />
  </Card>
)

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
                onClick={() => {
                  // Формируем URL для просмотра
                  let viewUrl = ''
                  if (doc.storage_path?.startsWith('local://')) {
                    // Для локально сохраненных файлов
                    viewUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/sign/documents/${doc.storage_path.replace('local://', '')}?token=`
                  } else if (doc.storage_path?.startsWith('invoices/')) {
                    // Для файлов в storage - используем signed URL
                    viewUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/sign/documents/${doc.storage_path}?token=`
                  } else {
                    viewUrl = doc.storage_path
                  }

                  console.log('[InvoiceViewNew] Просмотр документа:', {
                    originalPath: doc.storage_path,
                    viewUrl
                  })

                  window.open(viewUrl, '_blank')
                }}
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
                      storagePath: doc.storage_path
                    })

                    // Используем Supabase для получения URL
                    const { supabase } = await import('@/services/supabase')

                    if (doc.storage_path?.startsWith('invoices/')) {
                      // Создаем signed URL для скачивания
                      const { data, error } = await supabase.storage
                        .from('documents')
                        .createSignedUrl(doc.storage_path, 60) // URL действителен 60 секунд

                      if (error) {
                        console.error('[InvoiceViewNew] Ошибка создания signed URL:', error)
                        message.error('Ошибка при скачивании файла')
                        return
                      }

                      if (data?.signedUrl) {
                        // Скачиваем файл
                        const link = document.createElement('a')
                        link.href = data.signedUrl
                        link.download = doc.original_name || 'document'
                        link.click()
                      }
                    } else {
                      message.warning('Файл недоступен для скачивания')
                    }
                  } catch (error) {
                    console.error('[InvoiceViewNew] Ошибка скачивания:', error)
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
const renderHistory = () => (
  <Card type="inner" title={<><HistoryOutlined style={{ marginRight: 8 }} />История изменений</>}>
    <Timeline
      size="small"
      items={[
        {
          color: 'blue',
          children: (
            <div>
              <Text strong>Счет создан</Text>
              <br />
              <Text type="secondary">{dayjs(invoice?.created_at).format('DD.MM.YYYY HH:mm')}</Text>
            </div>
          )
        },
        {
          color: 'green',
          children: (
            <div>
              <Text strong>Статус: {invoice?.status}</Text>
              <br />
              <Text type="secondary">Текущий статус счета</Text>
            </div>
          )
        }
      ]}
    />
    <div style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 6 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Детальная история изменений будет добавлена в следующих версиях
      </Text>
    </div>
  </Card>
)

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

  const canEdit = invoice.status === 'draft' || invoice.status === 'rejected'

  return (
    <div style={{ padding: '24px' }}>
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

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={2}>
          Счет №{invoice.invoice_number} от {dayjs(invoice.invoice_date).format('DD.MM.YYYY')}
        </Title>

      </div>

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
                bodyStyle={{ padding: '12px 16px' }}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Statistic
                        title="Без НДС"
                        value={financialSummary.amountNet}
                        precision={2}
                        suffix={invoice.currency || 'RUB'}
                        valueStyle={{ fontSize: 14 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={`НДС (${form.getFieldValue('vat_rate') || DEFAULT_VAT_RATE}%)`}
                        value={financialSummary.vatAmount}
                        precision={2}
                        suffix={invoice.currency || 'RUB'}
                        valueStyle={{ fontSize: 14 }}
                      />
                    </Col>
                  </Row>
                  <Divider style={{ margin: '8px 0' }} />
                  <Statistic
                    title="Общая сумма счета"
                    value={financialSummary.totalAmount}
                    precision={2}
                    suffix={invoice.currency || 'RUB'}
                    valueStyle={{ color: '#1890ff', fontSize: '20px', fontWeight: 600 }}
                  />
                </Space>
              </Card>

              <Card
                title="Статус оплат"
                size="small"
                bodyStyle={{ padding: '8px 12px' }}
              >
                {paymentsByStatus.length > 0 && (
                  <>
                    <Table
                      dataSource={paymentsByStatus}
                      columns={[
                        {
                          title: 'Статус',
                          dataIndex: 'status',
                          key: 'status',
                          width: 80,
                          render: (status: string) => {
                            const statusConfig: Record<string, { color: string, text: string }> = {
                              completed: { color: 'success', text: 'Оплачено' },
                              pending: { color: 'warning', text: 'Ожидает' },
                              processing: { color: 'processing', text: 'В обработке' },
                              failed: { color: 'error', text: 'Ошибка' }
                            }
                            const config = statusConfig[status] || { color: 'default', text: status }
                            return <Tag color={config.color} style={{ fontSize: 11 }}>{config.text}</Tag>
                          }
                        },
                        {
                          title: 'Сумма',
                          dataIndex: 'amount',
                          key: 'amount',
                          align: 'right',
                          render: (amount: number, record: any) => (
                            <Text style={{ fontSize: 12, fontWeight: 500 }}>
                              {new Intl.NumberFormat('ru-RU', {
                                style: 'currency',
                                currency: record.currency || invoice?.currency || 'RUB'
                              }).format(amount)}
                            </Text>
                          )
                        }
                      ]}
                      pagination={false}
                      size="small"
                      rowKey="status"
                    />
                    <Divider style={{ margin: '8px 0' }} />
                  </>
                )}
                <Row gutter={[8, 8]}>
                  <Col span={12}>
                    <Statistic
                      title="Оплачено"
                      value={financialSummary.paidAmount}
                      precision={2}
                      suffix={invoice.currency || 'RUB'}
                      valueStyle={{ color: '#52c41a', fontSize: 13 }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="Ожидает"
                      value={financialSummary.pendingAmount}
                      precision={2}
                      suffix={invoice.currency || 'RUB'}
                      valueStyle={{ color: '#faad14', fontSize: 13 }}
                    />
                  </Col>
                  <Col span={24}>
                    <Divider style={{ margin: '6px 0' }} />
                    <Statistic
                      title="Остаток к оплате"
                      value={financialSummary.balance}
                      precision={2}
                      suffix={invoice.currency || 'RUB'}
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
                name="amount"
                label="Сумма"
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
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="currency"
                label="Валюта"
                rules={[{ required: true, message: 'Выберите валюту' }]}
              >
                <Select>
                  <Select.Option value="RUB">RUB - Рубль</Select.Option>
                  <Select.Option value="USD">USD - Доллар</Select.Option>
                  <Select.Option value="EUR">EUR - Евро</Select.Option>
                  <Select.Option value="CNY">CNY - Юань</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="payment_method"
                label="Способ оплаты"
                rules={[{ required: true, message: 'Выберите способ оплаты' }]}
              >
                <Select>
                  <Select.Option value="bank_transfer">Банковский перевод</Select.Option>
                  <Select.Option value="cash">Наличные</Select.Option>
                  <Select.Option value="card">Карта</Select.Option>
                  <Select.Option value="other">Другое</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Статус"
                rules={[{ required: true, message: 'Выберите статус' }]}
              >
                <Select>
                  <Select.Option value="pending">Ожидает обработки</Select.Option>
                  <Select.Option value="processing">В обработке</Select.Option>
                  <Select.Option value="completed">Завершен</Select.Option>
                  <Select.Option value="failed">Ошибка</Select.Option>
                  <Select.Option value="cancelled">Отменен</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="description"
                label="Описание"
              >
                <Input.TextArea rows={1} placeholder="Дополнительная информация" />
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
                  <Text strong style={{ fontSize: 16, color: '#ff4d4f' }}>
                    {new Intl.NumberFormat('ru-RU').format(
                      (invoice?.total_amount || 0) - (invoice?.paid_amount || 0)
                    )} {invoice?.currency || 'RUB'}
                  </Text>
                </div>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>
    </div>
  )
}

export default InvoiceViewNew