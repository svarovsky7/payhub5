/**
 * Новая страница просмотра и редактирования счета
 * Основана на форме создания счета с добавлением финансового блока
 */

import React, { useEffect, useState } from 'react'
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
  Alert,
  Statistic,
  Table,
  Tag,
  Modal,
  Breadcrumb,
  Tabs,
  Timeline
} from 'antd'
import {
  SaveOutlined,
  CloseOutlined,
  ArrowLeftOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  HomeOutlined,
  InfoCircleOutlined,
  CreditCardOutlined,
  FileOutlined,
  HistoryOutlined,
  PlusOutlined
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
        paymentsCount: invoice.payments?.length || 0
      })

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
        priority: invoice.priority,
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
  const handleCalculateAmounts = () => {
    const amountWithVat = form.getFieldValue('amount_with_vat') || 0
    const vatRate = form.getFieldValue('vat_rate') || DEFAULT_VAT_RATE

    const { amountNet, vatAmount } = calculateVATAmounts(amountWithVat, vatRate)

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
            priority: invoice.priority,
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
    if (!person) return mrpId
    return person.phone ? `${person.name} (${person.phone})` : person.name
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
                options={materialResponsiblePersons?.map((person: any) => ({
                  label: person.phone ? `${person.name} (${person.phone})` : person.name,
                  value: person.id
                }))}
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
              options={currencies?.map((curr: any) => ({
                label: `${curr.code} - ${curr.name}`,
                value: curr.code
              }))}
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
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              parser={value => value!.replace(/\s?/g, '')}
              onChange={handleCalculateAmounts}
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
              onChange={handleCalculateAmounts}
              options={[
                { label: '0%', value: 0 },
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
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
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
              formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
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
              <Form.Item
                label="Предварительная дата поставки"
                style={{ marginBottom: 12 }}
              >
                <Input
                  value={deliveryDate ? `${deliveryDate.locale('ru').format('DD.MM.YYYY')} (${deliveryDate.locale('ru').format('dddd')})` : '—'}
                  disabled
                  size="small"
                />
              </Form.Item>
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
              options={priorities?.map((priority: any) => ({
                label: priority.name,
                value: priority.code
              }))}
            />
          </Form.Item>
          <Form.Item
            name="notes"
            label="Примечания"
            style={{ marginBottom: 0 }}
          >
            <TextArea rows={2} placeholder="Дополнительная информация" size="small" />
          </Form.Item>
        </Card>
      </Col>
    </Row>
  </Space>
)

// Render payments tab
const renderPayments = () => (
  <Card type="inner" title={<><CreditCardOutlined style={{ marginRight: 8 }} />Управление платежами</>}>
    <div style={{ marginBottom: 16 }}>
      <Button type="primary" icon={<PlusOutlined />} size="small">
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
    <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
      <FileOutlined style={{ fontSize: 48, marginBottom: 16 }} />
      <div>Функция управления документами будет добавлена позже</div>
      <Button type="link" style={{ marginTop: 8 }}>
        Загрузить документ
      </Button>
    </div>
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

        {hasChanges && (
          <Alert
            message="Есть несохраненные изменения"
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Space>
                <Button size="small" onClick={handleCancel}>
                  Отменить
                </Button>
                <Button size="small" type="primary" onClick={handleSave}>
                  Сохранить
                </Button>
              </Space>
            }
          />
        )}
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
            background: 'rgba(255, 255, 255, 0.95)',
            borderTop: '1px solid #f0f0f0',
            boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.08)',
            zIndex: 1000,
            backdropFilter: 'blur(8px)'
          }}
        >
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Space style={{ float: 'right' }}>
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
                onClick={handleSave}
                size="middle"
              >
                Сохранить
              </Button>
            </Space>
          </div>
        </div>
      )}
    </div>
  )
}

export default InvoiceViewNew