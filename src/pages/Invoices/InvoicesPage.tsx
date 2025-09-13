import React, { useState } from 'react'
import { 
  Button, 
  Card,
  Col,
  DatePicker,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  List,
  message,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Tooltip,
  Typography
} from 'antd'
import { 
  CalendarOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  CloseOutlined,
  CreditCardOutlined,
  DeleteOutlined,
  DollarOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  PlusOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

import { 
  useDeleteInvoice,
  useInvoice, 
  useInvoicesList
} from '../../services/hooks/useInvoices'
import { useContractorsList } from '../../services/hooks/useContractors'
import { useProjectsList } from '../../services/hooks/useProjects'
import { useCreatePayment, usePaymentsList } from '../../services/hooks/usePayments'
import { useInvoiceDocuments } from '../../services/hooks/useDocuments'
import { ResponsiveTable } from '../../components/table/ResponsiveTable'
import type { ResponsiveTableColumn } from '../../components/table/ResponsiveTable'
import { DateCell, LinkCell, MoneyCell, StatusCell } from '../../components/table/TableCells'
import { type InvoiceWithRelations } from '../../services/invoices/crud'
import { useAuth } from '../../models/auth'
import { useNavigate } from 'react-router-dom'
import { formatFileSize } from '../../utils/format'

const { Title, Text } = Typography

// Функция для получения иконки файла по MIME типу
const getFileIcon = (mimeType: string) => {
  if (mimeType.includes('pdf')) {return <FilePdfOutlined style={{ fontSize: 20, color: '#ff4d4f' }} />}
  if (mimeType.includes('word') || mimeType.includes('doc')) {return <FileWordOutlined style={{ fontSize: 20, color: '#1890ff' }} />}
  if (mimeType.includes('excel') || mimeType.includes('sheet')) {return <FileExcelOutlined style={{ fontSize: 20, color: '#52c41a' }} />}
  if (mimeType.includes('image')) {return <FileImageOutlined style={{ fontSize: 20, color: '#faad14' }} />}
  if (mimeType.includes('text')) {return <FileTextOutlined style={{ fontSize: 20 }} />}
  return <FileOutlined style={{ fontSize: 20, color: '#1890ff' }} />
}

const InvoicesPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null)
  const [drawerVisible, setDrawerVisible] = useState(false)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<{ url: string, name: string, mimeType: string } | null>(null)
  const [pagination, setPagination] = useState({ page: 1, limit: 50 })
  const [paymentForm] = Form.useForm()
  
  // Data hooks
  const { data: invoicesData, isLoading, refetch } = useInvoicesList('1', {}, pagination)
  const { data: selectedInvoice } = useInvoice(selectedInvoiceId || '', { enabled: !!selectedInvoiceId })
  const { data: contractorsData } = useContractorsList({}, { page: 1, limit: 100 })
  const { data: projectsData } = useProjectsList({}, { page: 1, limit: 100 })
  const createPaymentMutation = useCreatePayment()
  const { data: paymentsData } = usePaymentsList(selectedInvoiceId ?? undefined)
  const deleteInvoiceMutation = useDeleteInvoice()
  
  // Хук для документов счета
  const { 
    documents, 
    isLoading: documentsLoading, 
    downloadDocument 
  } = useInvoiceDocuments(selectedInvoiceId ? Number(selectedInvoiceId) : undefined)
  
  // Handle row click
  const handleRowClick = (record: InvoiceWithRelations) => {
    setSelectedInvoiceId(record.id.toString())
    setDrawerVisible(true)
  }
  
  const handleView = (record: InvoiceWithRelations) => {
    setSelectedInvoiceId(record.id.toString())
    setDrawerVisible(true)
  }
  
  const handleCancel = async (record: InvoiceWithRelations) => {
    Modal.confirm({
      title: 'Отменить счет?', content: 'Это действие нельзя отменить', okText: 'Да', cancelText: 'Нет', onOk: async () => {
        try {
          // TODO: Implement cancel invoice
          message.info('Отмена счета будет реализована')
        } catch (error) {
          console.error('Cancel error:', error)
        }
      }
    })
  }
  
  const handleDelete = async (record: InvoiceWithRelations) => {
    Modal.confirm({
      title: 'Удалить счет?',
      content: (
        <div>
          <p>Вы уверены, что хотите удалить счет <strong>{record.invoice_number}</strong>?</p>
          <p style={{ color: '#ff4d4f', marginTop: 8 }}>
            Внимание: Будут удалены все связанные данные:
          </p>
          <ul style={{ color: '#ff4d4f', marginTop: 4 }}>
            <li>Все платежи по этому счету</li>
            <li>Все документы и приложения</li>
            <li>История изменений</li>
            <li>Процессы согласования</li>
          </ul>
          <p style={{ marginTop: 8 }}>Это действие нельзя отменить!</p>
        </div>
      ),
      okText: 'Да, удалить все',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      ellipsis: true,
      onOk: async () => {
        try {
          console.log('[InvoicesPage.handleDelete] Удаление счета:', record.id)
          await deleteInvoiceMutation.mutateAsync({
            id: record.id.toString(),
            companyId: '1'
          })
          
          // Закрываем drawer если удаляем текущий открытый счет
          if (selectedInvoiceId === record.id.toString()) {
            setDrawerVisible(false)
            setSelectedInvoiceId(null)
          }
          
          void refetch()
        } catch (error) {
          console.error('[InvoicesPage.handleDelete] Ошибка:', error)
          // Сообщение об ошибке обрабатывается в хуке useDeleteInvoice
        }
      }
    })
  }
  
  
  const columns: ResponsiveTableColumn<InvoiceWithRelations>[] = [
    {
      title: '№ счета',
      dataIndex: 'invoice_number',
      key: 'invoice_number',
      sorter: (a, b) => (a.invoice_number || '').localeCompare(b.invoice_number || ''),
      render: (text) => <LinkCell text={text} />,
    },
    {
      title: 'Внутренний №',
      dataIndex: 'internal_number',
      key: 'internal_number',
      sorter: (a, b) => (a.internal_number || '').localeCompare(b.internal_number || ''),
      render: (text) => {
        if (!text) return '—'
        // Разбиваем по последнему дефису с 4 цифрами после него (формат -XXXX-YYYY)
        const match = text.match(/^(.+)-(\d{4}-\d{4})$/)
        if (match) {
          return (
            <div style={{ lineHeight: '1.2' }}>
              <div>{match[1]}</div>
              <div>{match[2]}</div>
            </div>
          )
        }
        // Если формат не совпадает, пробуем разбить по середине
        const middle = Math.ceil(text.length / 2)
        const lastDash = text.lastIndexOf('-', middle)
        if (lastDash > 0) {
          return (
            <div style={{ lineHeight: '1.2' }}>
              <div>{text.substring(0, lastDash)}</div>
              <div>{text.substring(lastDash + 1)}</div>
            </div>
          )
        }
        return text
      },
    },
    {
      title: 'Дата',
      dataIndex: 'invoice_date',
      key: 'invoice_date',
      sorter: (a, b) => dayjs(a.invoice_date).unix() - dayjs(b.invoice_date).unix(),
      render: (text) => <DateCell date={text} format="DD.MM.YYYY" />,
    },
    {
      title: 'Поставщик',
      dataIndex: ['supplier', 'name'],
      key: 'supplier_name',
      sorter: (a, b) => (a.supplier?.name || '').localeCompare(b.supplier?.name || ''),
      render: (text, record) => record.supplier?.name || '—',
    },
    {
      title: 'Проект',
      dataIndex: ['project', 'name'],
      key: 'project_name',
      sorter: (a, b) => (a.project?.name || '').localeCompare(b.project?.name || ''),
      render: (text, record) => record.project?.name || '—',
    },
    {
      title: 'Сумма',
      dataIndex: 'total_amount',
      key: 'total_amount',
      align: 'right',
      sorter: (a, b) => (a.total_amount || 0) - (b.total_amount || 0),
      render: (text, record) => <MoneyCell amount={text} currency={record.currency} strong />,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
      render: (text) => <StatusCell status={text} type="invoice" />,
    },
    {
      title: 'Создал',
      dataIndex: ['creator', 'full_name'],
      key: 'creator',
      sorter: (a, b) => (a.creator?.full_name ?? a.creator?.email || '').localeCompare(b.creator?.full_name ?? b.creator?.email || ''),
      render: (text, record) => record.creator?.full_name ?? record.creator?.email || '—',
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
      render: (text) => <DateCell date={text} format="DD.MM.YYYY HH:mm" />,
    },
    {
      title: 'Действия',
      key: 'actions',
      fixed: 'right',
      fixed: 'right',
      render: (_, record) => (<Space size={4}>
          {/* Просмотр - всегда доступен */}
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              handleView(record)
            }}
            title="Просмотр"
          />
          {/* Отменить - для статусов draft, pending, approved */}
          <Button
            type="text"
            size="small"
            icon={<CloseCircleOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              handleCancel(record)
            }}
            title="Отменить"
            danger
            disabled={!['draft', 'pending', 'approved'].includes(record.status)}
            style={{ opacity: !['draft', 'pending', 'approved'].includes(record.status) ? 0.3 : 1 }}
          />
          {/* Удалить - только для draft и cancelled */}
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(record)
            }}
            title="Удалить"
            danger
            disabled={!['draft', 'cancelled'].includes(record.status)}
            style={{ opacity: !['draft', 'cancelled'].includes(record.status) ? 0.3 : 1 }}
          />
        </Space>
      ),
    },
  ]
  
  
  return (<div>
      {/* Header */}
      <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 24 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0 }}>Счета</Title>
        </Col>
        <Col>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => void navigate('/invoices/create')}
          >
            Добавить счет
          </Button>
        </Col>
      </Row>
      
      {/* Table */}
      <ResponsiveTable<InvoiceWithRelations>
        dataSource={invoicesData?.data ?? []}
        columns={columns}
        loading={isLoading}
        rowKey="id"
        onRow={(record) => ({
          onClick: (e) => {
            // Не открывать drawer при клике на кнопки
            const target = e.target as HTMLElement
            if (!target.closest('button')) {
              handleRowClick(record)
            }
          },
          style: { cursor: 'pointer' }
        })}
        pagination={{
          current: pagination.page,
          pageSize: pagination.limit,
          total: invoicesData?.total || 0,
          showSizeChanger: true,
          pageSizeOptions: ['50', '100', '200'],
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total} записей`,
          onChange: (page, pageSize) => {
            console.log('[InvoicesPage] Pagination change:', { page, pageSize })
            setPagination({ page, limit: pageSize || 50 })
          }
        }}
      />
      
      {/* Details Drawer */}
      <Drawer
        title="Информация о счете"
        placement="left"
        width={720}
        onClose={() => {
          setDrawerVisible(false)
          setSelectedInvoiceId(null)
        }}
        open={drawerVisible}
      >
        {selectedInvoice && (<>
            {/* Invoice Summary */}
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="Сумма счета"
                    value={selectedInvoice.total_amount}
                    prefix="₽"
                    precision={2}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Оплачено"
                    value={paymentsData?.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0}
                    prefix="₽"
                    precision={2}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
              </Row>
            </Card>
            
            {/* Invoice Details */}
            <Descriptions title="Детали счета" bordered column={1} style={{ marginBottom: 24 }}>
              <Descriptions.Item label="Номер счета">
                {selectedInvoice.invoice_number}
              </Descriptions.Item>
              <Descriptions.Item label="Дата">
                {dayjs(selectedInvoice.invoice_date).format('DD.MM.YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Поставщик">
                {selectedInvoice.supplier?.name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Плательщик">
                {selectedInvoice.payer?.name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Проект">
                {selectedInvoice.project?.name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Тип счета">
                {selectedInvoice.invoice_type?.name || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                <StatusCell status={selectedInvoice.status} type="invoice" />
              </Descriptions.Item>
              <Descriptions.Item label="Создал">
                {selectedInvoice.creator?.full_name ?? selectedInvoice.creator?.email || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Дата создания">
                {selectedInvoice.created_at ? dayjs(selectedInvoice.created_at).format('DD.MM.YYYY HH:mm') : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Сумма без НДС">
                <MoneyCell amount={selectedInvoice.amount_net} currency="RUB" />
              </Descriptions.Item>
              <Descriptions.Item label="НДС">
                <MoneyCell amount={selectedInvoice.vat_amount} currency="RUB" />
              </Descriptions.Item>
              <Descriptions.Item label="Итого">
                <MoneyCell amount={selectedInvoice.total_amount} currency="RUB" strong />
              </Descriptions.Item>
              <Descriptions.Item label="Описание">
                {selectedInvoice.description || '—'}
              </Descriptions.Item>
            </Descriptions>
            
            {/* Payments Section */}
            <Row align="middle" style={{ marginBottom: 16 }}>
              <Col flex="auto">
                <Title level={5} style={{ margin: 0 }}>
                  <DollarOutlined /> Платежи по счету
                </Title>
              </Col>
              <Col>
                {(() => {
                  const totalPaid = paymentsData?.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
                  const remainingAmount = selectedInvoice.total_amount - totalPaid
                  const isPaid = selectedInvoice.status === 'paid' || remainingAmount <= 0
                  const isCancelled = selectedInvoice.status === 'cancelled' || selectedInvoice.status === 'rejected'
                  const isDraft = selectedInvoice.status === 'draft'
                  
                  if (isCancelled) {
                    return null // Не показываем кнопку для отмененных счетов
                  }
                  
                  let buttonText = 'Добавить платеж'
                  let tooltipText = ''
                  let disabled = false
                  
                  if (isPaid) {
                    buttonText = 'Полностью оплачено'
                    tooltipText = 'Счет уже полностью оплачен'
                    disabled = true
                  } else if (isDraft) {
                    tooltipText = 'Счет в статусе черновика. Можно добавлять платежи.'
                  }
                  
                  const button = (<Button
                      type={isPaid ? "default" : "primary"}
                      icon={<CreditCardOutlined />}
                      size="small"
                      onClick={() => {
                        paymentForm.setFieldsValue({
                          invoice_id: selectedInvoice.id,
                          amount: remainingAmount > 0 ? remainingAmount : 0,
                          payment_date: dayjs()
                        })
                        setPaymentModalVisible(true)
                      }}
                      disabled={disabled}
                    >
                      {buttonText}
                    </Button>
                  )
                  
                  return tooltipText ? (
                    <Tooltip title={tooltipText}>
                      {button}
                    </Tooltip>
                  ) : button
                })()}
              </Col>
            </Row>
            <Table
              dataSource={paymentsData?.data ?? []}
              columns={[
                {
                  title: 'Дата',
                  dataIndex: 'payment_date',
                  key: 'payment_date',
                  render: (text) => text ? dayjs(text).format('DD.MM.YYYY') : '—'
                },
                {
                  title: 'Сумма',
                  dataIndex: 'amount',
                  key: 'amount',
                  align: 'right',
                  render: (text) => <MoneyCell amount={text} currency="RUB" />
                },
                {
                  title: 'Номер платежа',
                  dataIndex: 'reference',
                  key: 'reference',
                  render: (text) => text || '—'
                },
                {
                  title: 'Статус',
                  dataIndex: 'status',
                  key: 'status',
                  render: (status) => {
                    const statusConfig = {
                      'pending': { color: 'orange', text: 'В обработке' },
                      'processing': { color: 'blue', text: 'Обрабатывается' },
                      'completed': { color: 'green', text: 'Завершен' },
                      'cancelled': { color: 'red', text: 'Отменен' }
                    }
                    const config = statusConfig[status] ?? { color: 'default', text: status }
                    return <Tag color={config.color}>{config.text}</Tag>
                  }
                }
              ]}
              pagination={false}
              size="small"
              style={{ marginTop: 16 }}
              summary={() => {
                const totalAmount = paymentsData?.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
                return totalAmount > 0 ? (
                  <Table.Summary>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0}><strong>Итого</strong></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        <strong>
                          <MoneyCell amount={totalAmount} currency="RUB" />
                        </strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} />
                      <Table.Summary.Cell index={3} />
                    </Table.Summary.Row>
                  </Table.Summary>
                ) : null
              }}
            />
            
            {/* Документы */}
            <Divider />
            <Title level={5}>
              <FileTextOutlined /> Прикрепленные документы
            </Title>
            {documents && documents.length > 0 ? (<div style={{ marginTop: 16 }}>
                {documents.map((doc) => (
                  <Card 
                    key={doc.id} 
                    size="small" 
                    style={{ marginBottom: 8 }}
                    bodyStyle={{ padding: '8px 12px' }}
                  >
                    <Row align="middle" gutter={16}>
                      <Col span={2}>
                        {getFileIcon(doc.attachment.mime_type)}
                      </Col>
                      <Col span={14}>
                        <div>
                          <Text strong>{doc.attachment.original_name}</Text>
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {formatFileSize(doc.attachment.size_bytes)} • {dayjs(doc.created_at).format('DD.MM.YYYY')}
                          </Text>
                        </div>
                      </Col>
                      <Col span={8} style={{ textAlign: 'right' }}>
                        <Space>
                          <Tooltip title="Скачать">
                            <Button
                              type="text"
                              size="small"
                              icon={<DownloadOutlined />}
                              onClick={() => void downloadDocument(doc.id)}
                            />
                          </Tooltip>
                          <Tooltip title="Просмотр">
                            <Button
                              type="text"
                              size="small"
                              icon={<EyeOutlined />}
                              onClick={() => setPreviewDocument({
                                url: doc.url,
                                name: doc.attachment.original_name,
                                mimeType: doc.attachment.mime_type
                              })}
                            />
                          </Tooltip>
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Text type="secondary">Нет прикрепленных документов</Text>
              </div>
            )}
            
            {/* Timeline */}
            <Divider />
            <Title level={5}>
              <ClockCircleOutlined /> История изменений
            </Title>
            <Timeline style={{ marginTop: 16 }}>
              <Timeline.Item color="green">
                Счет создан - {dayjs(selectedInvoice.created_at).format('DD.MM.YYYY HH:mm')}
              </Timeline.Item>
              {selectedInvoice.submitted_at && (
                <Timeline.Item color="blue">
                  Отправлен на согласование - {dayjs(selectedInvoice.submitted_at).format('DD.MM.YYYY HH:mm')}
                </Timeline.Item>
              )}
              {selectedInvoice.approved_at && (
                <Timeline.Item color="green">
                  Одобрен - {dayjs(selectedInvoice.approved_at).format('DD.MM.YYYY HH:mm')}
                </Timeline.Item>
              )}
              {/* Добавляем информацию о загруженных документах */}
              {documents?.map((doc) => (
                <Timeline.Item 
                  key={`doc-${doc.id}`} 
                  color="blue"
                  dot={getFileIcon(doc.attachment.mime_type)}
                >
                  Документ "{doc.attachment.original_name}" загружен - {dayjs(doc.created_at).format('DD.MM.YYYY HH:mm')}
                </Timeline.Item>
              ))}
              {/* Добавляем информацию о платежах */}
              {paymentsData?.data?.map((payment: any) => (
                <Timeline.Item 
                  key={payment.id} 
                  color={payment.status === 'completed' ? 'green' : payment.status === 'failed' ? 'red' : 'blue'}
                >
                  Платеж {payment.reference ?? `#${payment.id}`} на сумму {new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB'
                  }).format(payment.amount)} - {dayjs(payment.created_at).format('DD.MM.YYYY HH:mm')}
                  {payment.status === 'completed' && ' (Подтвержден)'}
                  {payment.status === 'pending' && ' (Ожидает подтверждения)'}
                  {payment.status === 'failed' && ' (Отклонен)'}
                </Timeline.Item>
              ))}
              {selectedInvoice.paid_at && (
                <Timeline.Item color="green">
                  Счет полностью оплачен - {dayjs(selectedInvoice.paid_at).format('DD.MM.YYYY HH:mm')}
                </Timeline.Item>
              )}
            </Timeline>
          </>
        )}
      </Drawer>
      
      {/* Payment Modal */}
      <Modal
        title="Создание платежа"
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false)
          paymentForm.resetFields()
        }}
        footer={null}
        width={600}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={() => void (async (values) => {
            try {
              const paymentData = {
                invoice_id: values.invoice_id,
                amount: parseFloat(values.amount),
                payment_date: values.payment_date?.format('YYYY-MM-DD'),
                reference: values.reference_number,
                comment: values.description,
                status: 'pending',
                created_by: user?.id || 'f47ac10b-58cc-4372-a567-0e02b2c3d479', // Using default UUID
                payer_id: selectedInvoice?.payer_id // Will be handled in service if not provided
              )()}
              
              await createPaymentMutation.mutateAsync(paymentData)
              
              message.success('Платеж успешно добавлен к счету')
              setPaymentModalVisible(false)
              paymentForm.resetFields()
              // Refresh invoice data to update paid amount
              void refetch()
            } catch (error: any) {
              console.error('Error creating payment:', error)
              message.error('Ошибка при создании платежа: ' + (error?.message || 'Неизвестная ошибка'))
            }
          }}
        >
          <Form.Item name="invoice_id" hidden>
            <Input />
          </Form.Item>
          
          <Form.Item name="currency" hidden>
            <Input />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="payment_date"
                label="Дата платежа"
                rules={[{ required: true, message: 'Выберите дату' }]}
              >
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="amount"
                label="Сумма платежа"
                rules={[
                  { required: true, message: 'Укажите сумму' },
                  {
                    validator: (_, value) => {
                      const totalPaid = paymentsData?.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
                      const remainingAmount = selectedInvoice ?
                        selectedInvoice.total_amount - totalPaid : 0
                      if (value > remainingAmount) {
                        return Promise.reject(new Error(`Сумма не может превышать остаток к оплате: ₽${remainingAmount.toFixed(2)}`))
                      }
                      return Promise.resolve()
                    }
                  }
                ]}
                extra={selectedInvoice && (() => {
                  const totalPaid = paymentsData?.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
                  const remaining = selectedInvoice.total_amount - totalPaid
                  return `Остаток к оплате: ₽${remaining.toFixed(2)}`
                })()}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  min={0}
                  max={selectedInvoice ? (() => {
                    const totalPaid = paymentsData?.data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0
                    return selectedInvoice.total_amount - totalPaid
                  })() : undefined}
                  precision={2}
                  formatter={value => `₽ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/₽\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item
            name="reference_number"
            label="Номер платежа"
          >
            <Input placeholder="Автоматически" />
          </Form.Item>
          
          <Form.Item
            name="description"
            label="Примечание"
          >
            <Input.TextArea rows={3} placeholder="Дополнительная информация о платеже" />
          </Form.Item>
          
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => {
                setPaymentModalVisible(false)
                paymentForm.resetFields()
              }}>
                Отмена
              </Button>
              <Button 
                type="primary" 
                htmlType="submit"
                loading={createPaymentMutation.isPending}
              >
                Создать платеж
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Document Preview Modal */}
      <Modal
        title={`Просмотр документа: ${previewDocument?.name || ''}`}
        open={!!previewDocument}
        onCancel={() => setPreviewDocument(null)}
        width="90%"
        style={{ top: 20 }}
        bodyStyle={{ height: 'calc(100vh - 200px)', padding: 0 }}
        footer={[
          <Button key="download" type="primary" icon={<DownloadOutlined />}
            onClick={() => {
              if (previewDocument?.url) {
                const link = document.createElement('a')
                link.href = previewDocument.url
                link.download = previewDocument.name
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }
            }}
          >
            Скачать
          </Button>,
          <Button key="close" onClick={() => void setPreviewDocument(null)}>
            Закрыть
          </Button>
        ]}
      >
        {previewDocument && (
          <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
            {previewDocument.mimeType.includes('pdf') ? (
              <iframe
                src={previewDocument.url}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title={previewDocument.name}
              />
            ) : previewDocument.mimeType.includes('image') ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <img
                  src={previewDocument.url}
                  alt={previewDocument.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                />
              </div>
            ) : previewDocument.mimeType.includes('text') || 
                previewDocument.mimeType.includes('html') || 
                previewDocument.mimeType.includes('xml') || 
                previewDocument.mimeType.includes('json') ? (
              <iframe
                src={previewDocument.url}
                style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'white' }}
                title={previewDocument.name}
              />
            ) : (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                height: '100%',
                padding: '40px'
              }}>
                {getFileIcon(previewDocument.mimeType)}
                <Title level={4} style={{ marginTop: 20 }}>
                  {previewDocument.name}
                </Title>
                <Text type="secondary">
                  Предварительный просмотр недоступен для этого типа файла
                </Text>
                <Button 
                  type="primary" 
                  icon={<DownloadOutlined />}
                  style={{ marginTop: 20 }}
                  onClick={() => {
                    const link = document.createElement('a')
                    link.href = previewDocument.url
                    link.download = previewDocument.name
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }}
                >
                  Скачать файл
                </Button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default InvoicesPage