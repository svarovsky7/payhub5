/**
 * Statuses management tab component
 */

import React, { useState } from 'react'
import {
  Button,
  ColorPicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography
} from 'antd'
import { ProTable } from '@ant-design/pro-components'
import type { ProColumns } from '@ant-design/pro-components'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons'
import {
  useCreateStatus,
  useDeleteStatus,
  useStatusesList,
  useUpdateStatus
} from '@/services/hooks/useStatuses'
import type { Status } from '../types'

const { Text } = Typography
const { TextArea } = Input

type EntityType = 'invoice' | 'payment'

// Компонент для выбора цвета
const ColorSelector: React.FC<{
  value?: string
  onChange?: (value: string) => void
}> = ({ value, onChange }) => {
  const [colorType, setColorType] = useState<'preset' | 'custom'>(
    value && !['default', 'success', 'processing', 'warning', 'error', 'magenta', 'red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'].includes(value) ? 'custom' : 'preset'
  )
  const [customColor, setCustomColor] = useState(value && colorType === 'custom' ? value : '#1890ff')
  const [presetColor, setPresetColor] = useState(value && colorType === 'preset' ? value : '')

  React.useEffect(() => {
    if (value) {
      const isPreset = ['default', 'success', 'processing', 'warning', 'error', 'magenta', 'red', 'volcano', 'orange', 'gold', 'lime', 'green', 'cyan', 'blue', 'geekblue', 'purple'].includes(value)
      if (isPreset) {
        setColorType('preset')
        setPresetColor(value)
      } else {
        setColorType('custom')
        setCustomColor(value)
      }
    }
  }, [value])

  const handleTypeChange = (type: 'preset' | 'custom') => {
    setColorType(type)
    if (type === 'preset' && presetColor) {
      onChange?.(presetColor)
    } else if (type === 'custom' && customColor) {
      onChange?.(customColor)
    }
  }

  const handleCustomColorChange = (color: any) => {
    const hexColor = typeof color === 'string' ? color : color.toHexString()
    setCustomColor(hexColor)
    if (colorType === 'custom') {
      onChange?.(hexColor)
    }
  }

  const handlePresetColorChange = (color: string) => {
    setPresetColor(color)
    if (colorType === 'preset') {
      onChange?.(color)
    }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Select
        value={colorType}
        onChange={handleTypeChange}
        options={[
          { value: 'preset', label: 'Предустановленные цвета' },
          { value: 'custom', label: 'Пользовательский цвет' }
        ]}
        style={{ width: '100%' }}
      />
      {colorType === 'custom' ? (
        <ColorPicker
          value={customColor}
          onChange={handleCustomColorChange}
          showText
          format="hex"
          style={{ width: '100%' }}
          presets={[
            {
              label: 'Рекомендуемые',
              colors: [
                '#52c41a', '#1890ff', '#faad14', '#f5222d',
                '#722ed1', '#13c2c2', '#fa8c16', '#eb2f96',
                '#fadb14', '#a0d911', '#52c41a', '#1890ff',
                '#2f54eb', '#fa541c'
              ]
            }
          ]}
        />
      ) : (
        <Select
          value={presetColor}
          onChange={handlePresetColorChange}
          style={{ width: '100%' }}
          placeholder="Выберите цвет"
          allowClear
          options={[
            { value: 'default', label: <Tag color="default">default</Tag> },
            { value: 'success', label: <Tag color="success">success</Tag> },
            { value: 'processing', label: <Tag color="processing">processing</Tag> },
            { value: 'warning', label: <Tag color="warning">warning</Tag> },
            { value: 'error', label: <Tag color="error">error</Tag> },
            { value: 'magenta', label: <Tag color="magenta">magenta</Tag> },
            { value: 'red', label: <Tag color="red">red</Tag> },
            { value: 'volcano', label: <Tag color="volcano">volcano</Tag> },
            { value: 'orange', label: <Tag color="orange">orange</Tag> },
            { value: 'gold', label: <Tag color="gold">gold</Tag> },
            { value: 'lime', label: <Tag color="lime">lime</Tag> },
            { value: 'green', label: <Tag color="green">green</Tag> },
            { value: 'cyan', label: <Tag color="cyan">cyan</Tag> },
            { value: 'blue', label: <Tag color="blue">blue</Tag> },
            { value: 'geekblue', label: <Tag color="geekblue">geekblue</Tag> },
            { value: 'purple', label: <Tag color="purple">purple</Tag> }
          ]}
        />
      )}
      {value && (
        <div style={{ marginTop: 8 }}>
          Предпросмотр: <Tag color={value}>{value}</Tag>
        </div>
      )}
    </Space>
  )
}

export const StatusesTab: React.FC = () => {
  const [entityType, setEntityType] = useState<EntityType>('invoice')
  const { data: invoiceStatuses, isLoading: loadingInvoices } = useStatusesList('invoice')
  const { data: paymentStatuses, isLoading: loadingPayments } = useStatusesList('payment')
  const createStatus = useCreateStatus()
  const updateStatus = useUpdateStatus()
  const deleteStatus = useDeleteStatus()

  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [statusModalMode, setStatusModalMode] = useState<'create' | 'edit'>('create')
  const [statusForm] = Form.useForm<Partial<Status>>()
  const [current, setCurrent] = useState<Status | null>(null)

  const openCreate = () => {
    setCurrent(null)
    setStatusModalMode('create')
    statusForm.resetFields()
    const currentStatuses = entityType === 'invoice' ? invoiceStatuses : paymentStatuses
    statusForm.setFieldsValue({
      entity_type: entityType,
      is_active: true,
      is_final: false,
      order_index: (currentStatuses?.length || 0) + 1
    })
    setStatusModalVisible(true)
  }

  const openEdit = (record: Status) => {
    setCurrent(record)
    setStatusModalMode('edit')
    statusForm.setFieldsValue({
      entity_type: record.entity_type,
      code: record.code,
      name: record.name,
      description: record.description,
      color: record.color,
      order_index: record.order_index,
      is_final: record.is_final,
      is_active: record.is_active
    })
    setStatusModalVisible(true)
  }

  const handleDelete = async (id: number) => {
    await deleteStatus.mutateAsync(id)
  }

  const handleSubmit = async () => {
    const values = await statusForm.validateFields()
    if (statusModalMode === 'create') {
      await createStatus.mutateAsync(values as any)
    } else if (current) {
      await updateStatus.mutateAsync({ id: current.id, ...(values as any) })
    }
    setStatusModalVisible(false)
    statusForm.resetFields()
    setCurrent(null)
  }

  const columns: ProColumns[] = [
    {
      title: 'Тип',
      dataIndex: 'entity_type',
      render: (t) => t === 'invoice' ? 'Счёт' : 'Платёж'
    },
    {
      title: 'Порядок',
      dataIndex: 'order_index',
    },
    {
      title: 'Код',
      dataIndex: 'code',
      render: (text) => <Text code>{text}</Text>,
    },
    {
      title: 'Название',
      dataIndex: 'name',
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      ellipsis: true,
    },
    {
      title: 'Цвет',
      dataIndex: 'color',
      render: (color: string) => color ? <Tag color={color}>{color}</Tag> : '-'
    },
    {
      title: 'Финальный',
      dataIndex: 'is_final',
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Да' : 'Нет'}</Tag>
    },
    {
      title: 'Активен',
      dataIndex: 'is_active',
      render: (v: boolean) => <Tag color={v ? 'success' : 'default'}>{v ? 'Да' : 'Нет'}</Tag>
    },
    {
      title: 'Действия',
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => void openEdit(record as Status)}
          />
          <Popconfirm
            title="Удалить статус?"
            onConfirm={() => handleDelete((record as Status).id)}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      )
    }
  ]

  // Компонент таблицы для отображения статусов
  const StatusTable: React.FC<{ type: EntityType }> = ({ type }) => {
    const statuses = type === 'invoice' ? invoiceStatuses : paymentStatuses
    const loading = type === 'invoice' ? loadingInvoices : loadingPayments

    return (
      <ProTable
        dataSource={statuses ?? []}
        columns={columns}
        rowKey="id"
        loading={loading}
        search={false}
        scroll={{ x: 'max-content' }}
        pagination={false}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEntityType(type)
              openCreate()
            }}
          >
            Добавить статус
          </Button>
        ]}
      />
    )
  }

  return (
    <>
      <Tabs
        defaultActiveKey="invoice"
        items={[
          {
            key: 'invoice',
            label: 'Статусы счетов',
            children: <StatusTable type="invoice" />
          },
          {
            key: 'payment',
            label: 'Статусы платежей',
            children: <StatusTable type="payment" />
          }
        ]}
        onChange={(key) => setEntityType(key as EntityType)}
      />

      <Modal
        title={statusModalMode === 'create' ? 'Добавить статус' : 'Редактировать статус'}
        open={statusModalVisible}
        onOk={handleSubmit}
        onCancel={() => {
          setStatusModalVisible(false)
          statusForm.resetFields()
        }}
        confirmLoading={createStatus.isPending ?? updateStatus.isPending}
      >
        <Form form={statusForm} layout="vertical">
          <Form.Item
            name="entity_type"
            label="Тип"
            rules={[{ required: true, message: 'Укажите тип' }]}
          >
            <Select
              options={[
                { value: 'invoice', label: 'Счёт' },
                { value: 'payment', label: 'Платёж' },
              ]}
            />
          </Form.Item>

          <Form.Item
            name="code"
            label="Код"
            rules={[
              { required: true, message: 'Укажите код' },
              { pattern: /^[a-z_]+$/, message: 'Только латиница в нижнем регистре и _' }
            ]}
          >
            <Input placeholder="например: pending" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Укажите название' }]}
          >
            <Input placeholder="например: В ожидании" />
          </Form.Item>

          <Form.Item
            name="color"
            label="Цвет"
            tooltip="Выберите цвет из палитры или используйте предустановленные цвета antd"
          >
            <ColorSelector />
          </Form.Item>

          <Form.Item name="order_index" label="Порядок">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="is_final" label="Финальный" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активен"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}