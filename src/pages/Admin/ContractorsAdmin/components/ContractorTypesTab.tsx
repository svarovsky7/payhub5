/**
 * Contractor types tab component
 */

import React, { useState } from 'react'
import { Button, Form, Input, Modal, Space, Typography } from 'antd'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { DataTable } from '@/components/table'
import type { DataTableColumn } from '@/components/table'
import { DateCell } from '@/components/table/TableCells'
import type { ContractorType } from '../types'
import { getTypeFilterFields } from '../constants'

const { Text, TextArea } = Typography

interface ContractorTypesTabProps {
  contractorTypes: ContractorType[]
  loadingTypes: boolean
  onRefresh: () => void
  onCreateType: (values: any) => Promise<boolean>
  onUpdateType: (id: number, values: any) => Promise<boolean>
  onDeleteType: (id: number) => Promise<boolean>
}

export const ContractorTypesTab: React.FC<ContractorTypesTabProps> = ({
  contractorTypes,
  loadingTypes,
  onRefresh,
  onCreateType,
  onUpdateType,
  onDeleteType
}) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingType, setEditingType] = useState<ContractorType | null>(null)
  const [typeFilters, setTypeFilters] = useState<Record<string, any>>({})
  const [typePagination, setTypePagination] = useState({ page: 1, limit: 50 })
  const [form] = Form.useForm()

  const handleEdit = (record: ContractorType) => {
    console.log('[ContractorsAdmin] Editing type:', record.id)
    setEditingType(record)
    form.setFieldsValue({
      code: record.code,
      name: record.name,
      description: record.description
    })
    setModalVisible(true)
  }

  const handleDelete = (record: ContractorType) => {
    Modal.confirm({
      title: 'Удалить тип контрагента?',
      content: 'Это действие нельзя отменить. Убедитесь, что нет контрагентов с этим типом.',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => onDeleteType(record.id)
    })
  }

  const handleSubmit = async (values: any) => {
    const success = editingType
      ? await onUpdateType(editingType.id, values)
      : await onCreateType(values)

    if (success) {
      setModalVisible(false)
      setEditingType(null)
      form.resetFields()
    }
  }

  const columns: DataTableColumn<ContractorType>[] = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      priority: 1,
      exportable: true,
      sorter: (a, b) => (a.code || '').localeCompare(b.code || ''),
      render: (text) => <Text code>{text}</Text>
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      priority: 2,
      exportable: true,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '')
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      exportable: true,
      mobile: false,
      ellipsis: true,
      render: (text) => text || '—'
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      exportable: true,
      mobile: false,
      sorter: (a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime(),
      render: (date) => <DateCell date={date} format="DD.MM.YYYY" />
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      exportable: false,
      fixed: 'right',
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          />
        </Space>
      )
    }
  ]

  // Filter contractor types based on search
  const filteredTypes = contractorTypes.filter(type => {
    if (!typeFilters.search) {return true}
    const search = typeFilters.search.toLowerCase()
    return (
      type.code?.toLowerCase().includes(search) ||
      type.name?.toLowerCase().includes(search) ||
      type.description?.toLowerCase().includes(search)
    )
  })

  return (
    <>
      <DataTable<ContractorType>
        title=""
        subtitle={`Всего типов: ${contractorTypes.length}`}
        dataSource={filteredTypes}
        columns={columns}
        loading={loadingTypes}
        total={filteredTypes.length}
        filterFields={getTypeFilterFields()}
        filters={typeFilters}
        onFiltersChange={(newFilters) => {
          console.log('[ContractorsAdmin] Type filters changed:', newFilters)
          setTypeFilters(newFilters)
          setTypePagination({ page: 1, limit: 50 })
        }}
        defaultFiltersCollapsed
        onRefresh={onRefresh}
        exportable
        exportFilename="contractor_types"
        headerActions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              console.log('[ContractorsAdmin] Adding new type')
              setEditingType(null)
              form.resetFields()
              setModalVisible(true)
            }}
          >
            Добавить тип
          </Button>
        }
        pagination={{
          current: typePagination.page,
          pageSize: typePagination.limit,
          total: filteredTypes.length,
          onChange: (page, pageSize) => {
            setTypePagination({ page, limit: pageSize || 50 })
          }
        }}
        responsive
        compact
      />

      <Modal
        title={editingType ? 'Редактировать тип контрагента' : 'Добавить тип контрагента'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingType(null)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="code"
            label="Код"
            rules={[
              { required: true, message: 'Введите код типа' },
              { pattern: /^[a-zA-Z_]+$/, message: 'Только латинские буквы и символ подчеркивания' }
            ]}
          >
            <Input placeholder="supplier" />
          </Form.Item>

          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название типа' }]}
          >
            <Input placeholder="Поставщик" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Описание"
          >
            <TextArea
              rows={3}
              placeholder="Описание типа контрагента"
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}