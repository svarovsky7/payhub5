/**
 * Invoice types management tab component
 */

import React, { useState } from 'react'
import {
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Typography,
  message
} from 'antd'
import { ProTable } from '@ant-design/pro-components'
import type { ProColumns } from '@ant-design/pro-components'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined
} from '@ant-design/icons'
import {
  useCreateInvoiceType,
  useDeleteInvoiceType,
  useInvoiceTypesList,
  useUpdateInvoiceType
} from '@/services/hooks/useInvoiceTypes'

const { Text } = Typography
const { TextArea } = Input

export const InvoiceTypesTab: React.FC = () => {
  const { data: invoiceTypes, isLoading, refetch } = useInvoiceTypesList()
  const createInvoiceType = useCreateInvoiceType()
  const updateInvoiceType = useUpdateInvoiceType()
  const deleteInvoiceType = useDeleteInvoiceType()

  const [modalOpen, setModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)
  const [form] = Form.useForm()

  const handleOpen = (record?: any) => {
    console.log('[InvoiceTypesTab] Opening modal for:', record || 'new type')
    if (record) {
      setEditingRecord(record)
      form.setFieldsValue({
        code: record.code,
        name: record.name,
        description: record.description || ''
      })
    } else {
      setEditingRecord(null)
      form.resetFields()
    }
    setModalOpen(true)
  }

  const handleClose = () => {
    console.log('[InvoiceTypesTab] Closing modal')
    setModalOpen(false)
    setEditingRecord(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      console.log('[InvoiceTypesTab] Submitting form')
      const values = await form.validateFields()
      console.log('[InvoiceTypesTab] Form values:', values)

      if (editingRecord) {
        console.log('[InvoiceTypesTab] Updating type:', editingRecord.id)
        await updateInvoiceType.mutateAsync({
          id: editingRecord.id,
          code: values.code,
          name: values.name,
          description: values.description
        })
        message.success('Тип счета успешно обновлен')
      } else {
        console.log('[InvoiceTypesTab] Creating new type')
        await createInvoiceType.mutateAsync(values)
        message.success('Тип счета успешно создан')
      }

      handleClose()
      void refetch()
    } catch (error: any) {
      console.error('[InvoiceTypesTab] Error:', error)
      if (error.errorFields) {
        console.log('[InvoiceTypesTab] Validation errors:', error.errorFields)
      } else {
        message.error('Ошибка при сохранении')
      }
    }
  }

  const handleDelete = async (id: number) => {
    try {
      console.log('[InvoiceTypesTab] Deleting type:', id)
      await deleteInvoiceType.mutateAsync(id)
      message.success('Тип счета удален')
      void refetch()
    } catch (error) {
      console.error('[InvoiceTypesTab] Delete error:', error)
      message.error('Ошибка при удалении')
    }
  }

  const columns: ProColumns[] = [
    {
      title: 'ID',
      dataIndex: 'id',
    },
    {
      title: 'Код',
      dataIndex: 'code',
      render: (text) => <Text code>{text?.toUpperCase()}</Text>,
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
      title: 'Дата создания',
      dataIndex: 'created_at',
      render: (text) => text ? new Date(text).toLocaleDateString('ru-RU') : '-',
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
            onClick={() => void handleOpen(record)}
          />
          <Popconfirm
            title="Удалить тип счета?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id)}
            okText="Удалить"
            cancelText="Отмена"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      <ProTable
        dataSource={invoiceTypes ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        search={false}
        scroll={{ x: 'max-content' }}
        pagination={false}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => void handleOpen()}
          >
            Добавить тип
          </Button>,
        ]}
      />

      <Modal
        title={editingRecord ? 'Редактировать тип счета' : 'Новый тип счета'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={handleClose}
        confirmLoading={createInvoiceType.isPending ?? updateInvoiceType.isPending}
        okText="Сохранить"
        cancelText="Отмена"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
        >
          <Form.Item
            name="code"
            label="Системный код"
            rules={[
              { required: true, message: 'Укажите код' },
              {
                pattern: /^[a-zA-Z_]+$/,
                message: 'Только латинские буквы и символ подчеркивания'
              },
              {
                transform: (value) => value?.toUpperCase(),
                message: ''
              }
            ]}
            normalize={(value) => value?.toUpperCase()}
            help="Системный идентификатор на английском языке (автоматически преобразуется в верхний регистр)"
          >
            <Input
              placeholder="MATERIALS"
              onChange={(e) => {
                // Автоматически преобразуем в верхний регистр
                const uppercaseValue = e.target.value.toUpperCase();
                form.setFieldValue('code', uppercaseValue);
              }}
            />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[
              { required: true, message: 'Укажите название' },
              { max: 100, message: 'Не более 100 символов' }
            ]}
            help="Отображаемое название на русском языке"
          >
            <Input
              placeholder="Материалы"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
            rules={[
              { max: 500, message: 'Не более 500 символов' }
            ]}
          >
            <TextArea
              rows={4}
              placeholder="Подробное описание типа счета"
              showCount
              maxLength={500}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}