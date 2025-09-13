/**
 * Contractors list tab component
 */

import React, { useState } from 'react'
import { Button, Form, Input, Modal, Select, Switch } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { DataTable } from '@/components/table'
import { generateFullSupplierCode } from '@/utils/supplier-code-generator'
import type { Contractor, ContractorType } from '../types'
import {
  getContractorColumns,
  getContractorFilterFields,
  getContractorBulkActions
} from '../constants'

interface ContractorsListTabProps {
  contractors: Contractor[]
  contractorsResponse: any
  loadingContractors: boolean
  refetchContractors: () => void
  contractorFilters: Record<string, any>
  setContractorFilters: (filters: Record<string, any>) => void
  contractorPagination: { page: number; limit: number }
  setContractorPagination: (pagination: { page: number; limit: number }) => void
  contractorTypes: ContractorType[]
  onCreateContractor: (values: any) => Promise<boolean>
  onUpdateContractor: (id: number, values: any) => Promise<boolean>
  onDeleteContractor: (id: number) => Promise<boolean>
  onToggleStatus: (contractor: Contractor) => Promise<boolean>
}

export const ContractorsListTab: React.FC<ContractorsListTabProps> = ({
  contractors,
  contractorsResponse,
  loadingContractors,
  refetchContractors,
  contractorFilters,
  setContractorFilters,
  contractorPagination,
  setContractorPagination,
  contractorTypes,
  onCreateContractor,
  onUpdateContractor,
  onDeleteContractor,
  onToggleStatus
}) => {
  const [modalVisible, setModalVisible] = useState(false)
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null)
  const [form] = Form.useForm()

  const handleEdit = (record: Contractor) => {
    console.log('[ContractorsAdmin] Editing contractor:', record.id)
    setEditingContractor(record)

    // Check supplier_code format and generate new if needed
    let supplierCode = record.supplier_code
    if (!supplierCode || !/^[A-Z]{3}\d{4}$/.test(supplierCode)) {
      supplierCode = generateFullSupplierCode(record.name, record.inn || '')
      console.log('[ContractorsAdmin] Generated new supplier_code:', supplierCode)
    }

    form.setFieldsValue({
      name: record.name,
      inn: record.inn,
      supplier_code: supplierCode,
      type_id: record.type_id,
      is_active: record.is_active
    })
    setModalVisible(true)
  }

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: 'Удалить контрагента?',
      content: 'Это действие нельзя отменить',
      okText: 'Удалить',
      cancelText: 'Отмена',
      okButtonProps: { danger: true },
      onOk: () => onDeleteContractor(id)
    })
  }

  const getActionsMenuItems = (record: Contractor) => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: 'Редактировать',
      onClick: () => handleEdit(record)
    },
    {
      key: 'toggle-status',
      icon: record.is_active ? <StopOutlined /> : <CheckCircleOutlined />,
      label: record.is_active ? 'Деактивировать' : 'Активировать',
      onClick: () => onToggleStatus(record)
    },
    { type: 'divider' as const },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Удалить',
      danger: true,
      onClick: () => handleDelete(record.id)
    }
  ]

  const handleSubmit = async (values: any) => {
    const success = editingContractor
      ? await onUpdateContractor(editingContractor.id, values)
      : await onCreateContractor(values)

    if (success) {
      setModalVisible(false)
      setEditingContractor(null)
      form.resetFields()
    }
  }

  return (
    <>
      <DataTable<Contractor>
        title=""
        subtitle={`Всего контрагентов: ${contractorsResponse?.total || 0}`}
        dataSource={contractors}
        columns={getContractorColumns(contractorTypes, getActionsMenuItems)}
        loading={loadingContractors}
        total={contractorsResponse?.total}
        filterFields={getContractorFilterFields(contractorTypes)}
        filters={contractorFilters}
        onFiltersChange={(newFilters) => {
          console.log('[ContractorsAdmin] Contractor filters changed:', newFilters)
          setContractorFilters(newFilters)
          setContractorPagination({ page: 1, limit: 50 })
        }}
        defaultFiltersCollapsed
        onRefresh={refetchContractors}
        bulkActions={getContractorBulkActions(onToggleStatus)}
        exportable
        exportFilename="contractors"
        headerActions={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              console.log('[ContractorsAdmin] Adding new contractor')
              setEditingContractor(null)
              form.resetFields()
              setModalVisible(true)
            }}
          >
            Добавить контрагента
          </Button>
        }
        pagination={{
          current: contractorPagination.page,
          pageSize: contractorPagination.limit,
          total: contractorsResponse?.total || 0,
          onChange: (page, pageSize) => {
            setContractorPagination({ page, limit: pageSize || 50 })
          }
        }}
        selectable
        multiSelect
        responsive
      />

      <Modal
        title={editingContractor ? 'Редактировать контрагента' : 'Добавить контрагента'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingContractor(null)
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
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название контрагента' }]}
          >
            <Input placeholder="ООО Поставщик" />
          </Form.Item>

          <Form.Item
            name="inn"
            label="ИНН"
            rules={[
              { pattern: /^\d{10}$|^\d{12}$/, message: 'ИНН должен содержать 10 или 12 цифр' }
            ]}
          >
            <Input placeholder="1234567890" />
          </Form.Item>

          {editingContractor && (
            <Form.Item
              name="supplier_code"
              label="Код поставщика"
              rules={[
                { required: true, message: 'Введите код поставщика' },
                { pattern: /^[A-Z]{3}\d{4}$/, message: 'Код должен быть в формате XXX0000' }
              ]}
            >
              <Input placeholder="ABC1234" />
            </Form.Item>
          )}

          <Form.Item
            name="type_id"
            label="Тип контрагента"
          >
            <Select
              placeholder="Выберите тип"
              allowClear
              options={contractorTypes.map(type => ({
                label: type.name,
                value: type.id
              }))}
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активный"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

// Import missing icons
import { CheckCircleOutlined, DeleteOutlined, EditOutlined, StopOutlined } from '@ant-design/icons'