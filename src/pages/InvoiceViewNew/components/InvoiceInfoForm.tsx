import React from 'react'
import { Form, Input, DatePicker, Select, InputNumber, Card, Row, Col, Typography } from 'antd'
import type { FormInstance } from 'antd'
import dayjs from 'dayjs'

const { TextArea } = Input
const { Text } = Typography

interface InvoiceInfoFormProps {
  form: FormInstance
  isEditing: boolean
  invoice: any
  suppliers: any[]
  payers: any[]
  projects: any[]
  invoiceTypes: any[]
  materialResponsiblePersons: any[]
  priorities: any[]
  currencies: any[]
  deliveryDate: dayjs.Dayjs | null
  onFormChange: () => void
}

export const InvoiceInfoForm: React.FC<InvoiceInfoFormProps> = ({
  form,
  isEditing,
  invoice,
  suppliers,
  payers,
  projects,
  invoiceTypes,
  materialResponsiblePersons,
  priorities,
  currencies,
  deliveryDate,
  onFormChange
}) => {
  return (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={onFormChange}
      disabled={!isEditing}
    >
      <Card title="Основная информация" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="invoice_number"
              label="Номер счета"
              rules={[{ required: true, message: 'Введите номер счета' }]}
            >
              <Input placeholder="Номер счета от поставщика" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="internal_number"
              label="Внутренний номер"
            >
              <Input placeholder="Внутренний номер (необязательно)" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="invoice_date"
              label="Дата счета"
              rules={[{ required: true, message: 'Выберите дату' }]}
            >
              <DatePicker
                format="DD.MM.YYYY"
                style={{ width: '100%' }}
                placeholder="Выберите дату"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="invoice_type_id"
              label="Тип счета"
              rules={[{ required: true, message: 'Выберите тип' }]}
            >
              <Select
                placeholder="Выберите тип счета"
                showSearch
                optionFilterProp="children"
              >
                {invoiceTypes.map((type: any) => (
                  <Select.Option key={type.id} value={type.id}>
                    {type.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="priority"
              label="Приоритет"
            >
              <Select placeholder="Выберите приоритет">
                {priorities?.map((p: any) => (
                  <Select.Option key={p.value} value={p.value}>
                    {p.label}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="material_responsible_person_id"
              label="МОЛ"
            >
              <Select
                placeholder="Выберите МОЛ"
                showSearch
                optionFilterProp="children"
                allowClear
              >
                {materialResponsiblePersons.map((mrp: any) => (
                  <Select.Option key={mrp.id} value={mrp.id}>
                    {mrp.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          name="title"
          label="Название"
          rules={[{ required: true, message: 'Введите название' }]}
        >
          <Input placeholder="Краткое название счета" />
        </Form.Item>

        <Form.Item
          name="description"
          label="Описание"
        >
          <TextArea
            rows={3}
            placeholder="Подробное описание счета"
          />
        </Form.Item>
      </Card>

      <Card title="Контрагенты и проект" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="supplier_id"
              label="Поставщик"
              rules={[{ required: true, message: 'Выберите поставщика' }]}
            >
              <Select
                placeholder="Выберите поставщика"
                showSearch
                optionFilterProp="children"
              >
                {suppliers.map((supplier: any) => (
                  <Select.Option key={supplier.id} value={supplier.id}>
                    {supplier.name} {supplier.inn && `(ИНН: ${supplier.inn})`}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="payer_id"
              label="Плательщик"
              rules={[{ required: true, message: 'Выберите плательщика' }]}
            >
              <Select
                placeholder="Выберите плательщика"
                showSearch
                optionFilterProp="children"
              >
                {payers.map((payer: any) => (
                  <Select.Option key={payer.id} value={payer.id}>
                    {payer.name} {payer.inn && `(ИНН: ${payer.inn})`}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="project_id"
              label="Проект"
            >
              <Select
                placeholder="Выберите проект"
                showSearch
                optionFilterProp="children"
                allowClear
              >
                {projects.map((project: any) => (
                  <Select.Option key={project.id} value={project.id}>
                    {project.name}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Финансовая информация" style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col xs={24} md={6}>
            <Form.Item
              name="amount_net"
              label="Сумма без НДС"
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={value => value!.replace(/\s?/g, '')}
                precision={2}
                disabled
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="vat_rate"
              label="Ставка НДС (%)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                disabled
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="vat_amount"
              label="Сумма НДС"
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={value => value!.replace(/\s?/g, '')}
                precision={2}
                disabled
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="amount_with_vat"
              label="Общая сумма"
            >
              <InputNumber
                style={{ width: '100%' }}
                formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={value => value!.replace(/\s?/g, '')}
                precision={2}
                disabled
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="delivery_days"
              label="Срок поставки (дней)"
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                placeholder="Количество дней"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="delivery_days_type"
              label="Тип дней"
            >
              <Select placeholder="Выберите тип">
                <Select.Option value="calendar">Календарные</Select.Option>
                <Select.Option value="working">Рабочие</Select.Option>
                <Select.Option value="banking">Банковские</Select.Option>
              </Select>
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item label="Расчетная дата поставки">
              <Input
                value={deliveryDate ? deliveryDate.format('DD.MM.YYYY') : '—'}
                disabled
              />
            </Form.Item>
          </Col>
        </Row>
      </Card>

      <Card title="Дополнительно">
        <Form.Item
          name="notes"
          label="Примечания"
        >
          <TextArea
            rows={4}
            placeholder="Дополнительные примечания"
          />
        </Form.Item>
      </Card>
    </Form>
  )
}