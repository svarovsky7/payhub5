/**
 * Invoice creation page component (compact single-page layout)
 */

import React from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tabs,
  Typography,
  Upload
} from 'antd'
import {
  ArrowLeftOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  InboxOutlined,
  QuestionCircleOutlined,
  SaveOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import 'dayjs/locale/ru'
import { useInvoiceCreate } from './hooks/useInvoiceCreate'
import { useFileUpload } from './hooks/useFileUpload'
import type { InvoiceFormValues } from './types'
import { ACCEPTED_FILE_TYPES, VAT_RATE_OPTIONS } from './constants'
import { calculateVATAmounts, formatFileSize } from './utils/calculations'
import { PaymentsTab } from './components/PaymentsTab'
import type { Payment } from './components/PaymentsTab'
import './InvoiceCreate.css'

const { Title, Text } = Typography
const { TextArea } = Input

const InvoiceCreate: React.FC = () => {
  const {
    form,
    loading,
    suppliers,
    payers,
    projects,
    invoiceTypes,
    materialResponsiblePersons,
    currencies,
    priorities,
    loadingContractors,
    loadingProjects,
    loadingInvoiceTypes,
    loadingMRPs,
    loadingCurrencies,
    loadingPriorities,
    deliveryDate,
    payments,
    setPayments,
    internalNumberPreview,
    handleSubmit,
    handleCalculateAmounts,
    handleDeliveryDaysChange,
    handleInternalNumberUpdate,
    navigate
  } = useInvoiceCreate()

  const {
    fileList,
    previewOpen,
    previewImage,
    previewTitle,
    previewFile,
    previewType,
    beforeUpload,
    handleFileChange,
    handlePreview,
    handleRemove,
    handleCancelPreview,
    getFileIcon
  } = useFileUpload()

  const onFinish = (values: InvoiceFormValues) => {
    void handleSubmit(values, false, fileList)
  }

  return (
    <div className="invoice-create-container">
      <Card className="invoice-create-card">
        {/* Заголовок */}
        <div className="invoice-create-header">
          <Title level={4} style={{ margin: 0 }}>Создание нового счета</Title>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          size="small"
          initialValues={{
            currency: 'RUB',
            vat_rate: 20,
            invoice_date: dayjs(),
            priority: 'normal',
            invoice_type_id: 1, // Default to МАТЕРИАЛЫ (mtrl)
            delivery_days_type: 'calendar'
          }}
          onValuesChange={(changedValues) => {
            // Отслеживаем изменения полей доставки
            if ('delivery_days' in changedValues || 'delivery_days_type' in changedValues) {
              handleDeliveryDaysChange()
            }
          }}
        >
          <Tabs
            defaultActiveKey="1"
            type="card"
            items={[
              {
                key: '1',
                label: (
                  <span>
                    <FileTextOutlined />
                    Основная информация
                  </span>
                ),
                children: (
                  <>
                    {/* Основная информация и контрагенты в одной строке */}
                    <Row gutter={[16, 8]}>
            <Col span={12}>
              <Text strong style={{ fontSize: '13px', color: '#1890ff' }}>ОСНОВНАЯ ИНФОРМАЦИЯ</Text>
              <Row gutter={[12, 0]} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <Form.Item
                    label="Номер счета"
                    name="invoice_number"
                    style={{ marginBottom: 12 }}
                  >
                    <Input placeholder="Номер поставщика" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <span>
                        Внутренний номер{' '}
                        <QuestionCircleOutlined style={{ fontSize: 11, color: '#999' }} />
                      </span>
                    }
                    name="internal_number"
                    style={{ marginBottom: 12 }}
                  >
                    <Input
                      disabled
                      placeholder="Выберите все обязательные поля"
                      style={{
                        backgroundColor: internalNumberPreview ? '#f6ffed' : '#f5f5f5',
                        fontWeight: internalNumberPreview ? 600 : 400,
                        color: internalNumberPreview ? '#52c41a' : 'rgba(0,0,0,0.25)'
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Дата счета"
                    name="invoice_date"
                    rules={[{ required: true, message: 'Укажите дату' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <DatePicker
                      format="DD.MM.YYYY"
                      style={{ width: '100%' }}
                      placeholder="Выберите дату"
                      onChange={handleInternalNumberUpdate}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Тип счета"
                    name="invoice_type_id"
                    rules={[{ required: true, message: 'Выберите тип счета' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      placeholder="Тип счета"
                      loading={loadingInvoiceTypes}
                      onChange={handleInternalNumberUpdate}
                      options={invoiceTypes?.map(type => ({
                        label: type.name,
                        value: type.id
                      }))}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Col>

            <Col span={12}>
              <Text strong style={{ fontSize: '13px', color: '#52c41a' }}>КОНТРАГЕНТЫ</Text>
              <Row gutter={[12, 0]} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <Form.Item
                    label="Плательщик"
                    name="payer_id"
                    rules={[{ required: true, message: 'Выберите плательщика' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      placeholder="Выберите"
                      loading={loadingContractors}
                      showSearch
                      optionFilterProp="children"
                      onChange={handleInternalNumberUpdate}
                      options={payers?.map(payer => ({
                        label: payer.name,
                        value: payer.id
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Поставщик"
                    name="supplier_id"
                    rules={[{ required: true, message: 'Выберите поставщика' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      placeholder="Выберите"
                      loading={loadingContractors}
                      showSearch
                      optionFilterProp="children"
                      onChange={handleInternalNumberUpdate}
                      options={suppliers?.map(supplier => ({
                        label: supplier.name,
                        value: supplier.id
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item
                    label="Проект"
                    name="project_id"
                    rules={[{ required: true, message: 'Выберите проект' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      placeholder="Выберите проект"
                      loading={loadingProjects}
                      showSearch
                      optionFilterProp="children"
                      allowClear
                      onChange={handleInternalNumberUpdate}
                      options={projects?.map(project => ({
                        label: project.name,
                        value: project.id
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="МОЛ"
                    name="material_responsible_person_id"
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      placeholder="Выберите"
                      loading={loadingMRPs}
                      showSearch
                      optionFilterProp="children"
                      allowClear
                      options={materialResponsiblePersons?.map(mrp => ({
                        label: mrp?.full_name || 'Не указан',
                        value: mrp?.id
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Приоритет"
                    name="priority"
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      placeholder="Приоритет"
                      options={priorities}
                      loading={loadingPriorities}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Row>

          <Divider style={{ margin: '12px 0' }} />

          {/* Финансовая информация и дополнительные параметры */}
          <Row gutter={[16, 8]}>
            <Col span={12}>
              <Text strong style={{ fontSize: '13px', color: '#fa8c16' }}>ФИНАНСОВАЯ ИНФОРМАЦИЯ</Text>
              <Row gutter={[12, 0]} style={{ marginTop: 8 }}>
                <Col span={8}>
                  <Form.Item
                    label="Валюта"
                    name="currency"
                    rules={[{ required: true }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      options={currencies}
                      loading={loadingCurrencies}
                    />
                  </Form.Item>
                </Col>
                <Col span={16}>
                  <Form.Item
                    label="Сумма с НДС"
                    name="amount_with_vat"
                    rules={[{ required: true, message: 'Введите сумму' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      formatter={value => {
                        if (!value) {return ''}
                        return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
                      }}
                      parser={value => {
                        if (!value) {return ''}
                        // Replace comma with dot and remove all non-digit characters except dot
                        const normalized = value.replace(',', '.').replace(/[^\d.]/g, '')
                        // Ensure only one dot and max 2 decimal places
                        const parts = normalized.split('.')
                        if (parts.length > 2) {
                          return parts[0] + '.' + parts.slice(1).join('').substring(0, 2)
                        }
                        if (parts.length === 2 && parts[1].length > 2) {
                          return parts[0] + '.' + parts[1].substring(0, 2)
                        }
                        return normalized
                      }}
                      onChange={handleCalculateAmounts}
                      precision={2}
                      min={0}
                      onKeyPress={(e) => {
                        const value = (e.target as HTMLInputElement).value
                        const key = e.key

                        // Allow control keys
                        if (key === 'Enter' || key === 'Tab' || key === 'Backspace' || key === 'Delete') {
                          return
                        }

                        // Check if key is a valid digit or decimal separator
                        if (!/[\d.,]/.test(key)) {
                          e.preventDefault()
                          return
                        }

                        // Get clean value without currency and spaces
                        const cleanValue = value.replace(/[^\d.,]/g, '').replace(',', '.')

                        // Prevent multiple decimal separators
                        if ((key === '.' || key === ',') && cleanValue.includes('.')) {
                          e.preventDefault()
                          return
                        }

                        // Check decimal places limit
                        if (cleanValue.includes('.')) {
                          const parts = cleanValue.split('.')
                          if (parts[1] && parts[1].length >= 2 && /\d/.test(key)) {
                            // Check if we're adding a digit after 2 decimal places
                            const selectionStart = (e.target as HTMLInputElement).selectionStart || 0
                            const beforeCursor = value.substring(0, selectionStart)
                            const cleanBeforeCursor = beforeCursor.replace(/[^\d.,]/g, '').replace(',', '.')

                            if (cleanBeforeCursor.includes('.')) {
                              const decimalIndex = cleanBeforeCursor.indexOf('.')
                              const decimalsBeforeCursor = cleanBeforeCursor.substring(decimalIndex + 1)
                              if (decimalsBeforeCursor.length >= 2) {
                                e.preventDefault()
                              }
                            }
                          }
                        }
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Ставка НДС"
                    name="vat_rate"
                    rules={[{ required: true }]}
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      options={VAT_RATE_OPTIONS}
                      onChange={(value) => {
                        console.log('[InvoiceCreate] Изменение ставки НДС:', {
                          newVatRate: value,
                          oldVatRate: form.getFieldValue('vat_rate')
                        })

                        form.setFieldValue('vat_rate', value)

                        // Recalculate with new VAT rate
                        const amountWithVat = form.getFieldValue('amount_with_vat') || 0
                        console.log('[InvoiceCreate] Пересчет НДС:', {
                          amountWithVat,
                          vatRate: value
                        })

                        const { amountNet, vatAmount } = calculateVATAmounts(amountWithVat, value)
                        console.log('[InvoiceCreate] Результат пересчета:', {
                          amountNet,
                          vatAmount
                        })

                        form.setFieldsValue({
                          amount_net: amountNet,
                          vat_amount: vatAmount
                        })
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Сумма без НДС"
                    name="amount_net"
                    style={{ marginBottom: 12 }}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      disabled
                      formatter={value => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                      precision={2}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item
                    label="Сумма НДС"
                    name="vat_amount"
                    style={{ marginBottom: 12 }}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      disabled
                      formatter={value => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                      precision={2}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Col>

            <Col span={12}>
              <Text strong style={{ fontSize: '13px', color: '#722ed1' }}>ПОСТАВКА И ПРИМЕЧАНИЯ</Text>
              <Row gutter={[12, 0]} style={{ marginTop: 8 }}>
                <Col span={12}>
                  <Form.Item
                    label="Дней до поставки после оплаты"
                    name="delivery_days"
                    rules={[{ required: true, message: 'Укажите количество дней' }]}
                    style={{ marginBottom: 12 }}
                  >
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      placeholder="Количество дней"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Тип дней"
                    name="delivery_days_type"
                    style={{ marginBottom: 12 }}
                  >
                    <Select
                      options={[
                        { value: 'calendar', label: 'Календарные' },
                        { value: 'working', label: 'Рабочие' }
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
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
                      fontSize: 14,
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
                        'Укажите количество дней до поставки'
                      )}
                    </div>
                  </div>
                </Col>
                <Col span={24}>
                  <Form.Item
                    label="Примечания"
                    name="description"
                    style={{ marginBottom: 12 }}
                  >
                    <TextArea
                      rows={2}
                      placeholder="Примечания к счету"
                      maxLength={1000}
                      showCount
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Col>
          </Row>

                  <Divider style={{ margin: '12px 0' }} />

                  {/* Файлы */}
                  <Text strong style={{ fontSize: '13px', color: '#13c2c2' }}>ПРИКРЕПЛЕННЫЕ ФАЙЛЫ</Text>
                  <div style={{ marginTop: 8 }}>
                    <Upload
                      multiple
                      fileList={fileList}
                      beforeUpload={beforeUpload}
                      onChange={handleFileChange}
                      onPreview={handlePreview}
                      onRemove={handleRemove}
                      accept={ACCEPTED_FILE_TYPES}
                      showUploadList={true}
                    >
                      <Button icon={<InboxOutlined />}>
                        Выбрать файлы
                      </Button>
                    </Upload>
                    {fileList.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Загружено файлов: {fileList.length}
                        </Text>
                      </div>
                    )}
                  </div>
                  </>
                )
              },
              {
                key: '2',
                label: (
                  <span>
                    <CreditCardOutlined />
                    Платежи
                  </span>
                ),
                children: (
                  <PaymentsTab
                    payments={payments as Payment[]}
                    onPaymentsChange={(newPayments) => setPayments(newPayments as any)}
                    currency={form.getFieldValue('currency') || 'RUB'}
                  />
                )
              }
            ]}
          />
        </Form>

        {/* Дублирующие кнопки внизу формы */}
        <Divider style={{ margin: '24px 0 16px' }} />
        <div className="invoice-create-bottom-actions" style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: '24px'
        }}>
          <Space size="middle">
            <Button
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/invoices')}
              className="invoice-create-cancel-btn"
              style={{
                minWidth: '120px',
                height: '40px',
                fontSize: '16px'
              }}
            >
              Отмена
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              onClick={() => form.submit()}
              loading={loading}
              className="invoice-create-save-btn"
              style={{
                minWidth: '140px',
                height: '40px',
                fontSize: '16px',
                backgroundColor: '#52c41a',
                borderColor: '#52c41a'
              }}
            >
              Сохранить
            </Button>
          </Space>
        </div>

        {/* Модальное окно предпросмотра */}
        <Modal
          open={previewOpen}
          title={previewTitle}
          footer={null}
          onCancel={handleCancelPreview}
          width={previewType === 'pdf' ? 900 : 600}
          style={{ top: 20 }}
        >
          {previewType === 'image' && previewImage && (
            <Image
              alt="preview"
              style={{ width: '100%' }}
              src={previewImage}
            />
          )}
          {previewType === 'pdf' && previewImage && (
            <iframe
              src={previewImage}
              style={{
                width: '100%',
                height: '600px',
                border: 'none'
              }}
              title="PDF Preview"
            />
          )}
          {previewType === 'other' && previewFile && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ fontSize: 64, marginBottom: 24 }}>
                {getFileIcon(previewFile.name || '')}
              </div>
              <Title level={4}>{previewFile.name}</Title>
              {previewFile.size && (
                <Text type="secondary">
                  Размер: {formatFileSize(previewFile.size)}
                </Text>
              )}
              <div style={{ marginTop: 24 }}>
                <Text type="secondary">
                  Предпросмотр недоступен для данного типа файла
                </Text>
              </div>
              {previewFile.url && (
                <div style={{ marginTop: 16 }}>
                  <Button
                    type="primary"
                    href={previewFile.url}
                    target="_blank"
                  >
                    Скачать файл
                  </Button>
                </div>
              )}
            </div>
          )}
        </Modal>
      </Card>
    </div>
  )
}

export default InvoiceCreate