import React, { useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import {
  useCreatePaymentType,
  useDeletePaymentType,
  usePaymentTypes,
  useUpdatePaymentType,
  useUpdatePaymentTypesOrder,
} from '@/services/hooks/usePaymentTypes'
import type { Database } from '@/types/database'
// Drag and drop temporarily disabled due to import issues
// import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
// import { DndContext } from '@dnd-kit/core'
// import type { DragEndEvent } from '@dnd-kit/core'

const { Title, Text } = Typography

type PaymentType = Database['public']['Tables']['payment_types']['Row']

const PaymentTypesManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingType, setEditingType] = useState<PaymentType | null>(null)
  const [includeInactive, setIncludeInactive] = useState(false)
  const [form] = Form.useForm()

  // Hooks
  const { data: paymentTypes = [], isLoading } = usePaymentTypes(includeInactive)
  const createMutation = useCreatePaymentType()
  const updateMutation = useUpdatePaymentType()
  const deleteMutation = useDeletePaymentType()
  const updateOrderMutation = useUpdatePaymentTypesOrder()

  // Handlers
  const handleAdd = () => {
    setEditingType(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: PaymentType) => {
    console.log('[PaymentTypesManagement.handleEdit] Editing type:', record)
    setEditingType(record)
    form.setFieldsValue({
      name: record.name,
      code: record.code,
      description: record.description,
      is_active: record.is_active,
      display_order: record.display_order,
    })
    setIsModalVisible(true)
  }

  const handleDelete = async (id: string) => {
    console.log('[PaymentTypesManagement.handleDelete] Deleting type:', id)
    await deleteMutation.mutateAsync(id)
  }

  const handleSubmit = async (values: any) => {
    console.log('[PaymentTypesManagement.handleSubmit] Form values:', values)

    try {
      if (editingType) {
        await updateMutation.mutateAsync({
          id: editingType.id,
          data: values,
        })
      } else {
        await createMutation.mutateAsync(values)
      }
      setIsModalVisible(false)
      form.resetFields()
      setEditingType(null)
    } catch (error) {
      console.error('[PaymentTypesManagement.handleSubmit] Error:', error)
    }
  }

  // Drag and drop temporarily disabled
  // const handleDragEnd = async (event: DragEndEvent) => {
  //   const { active, over } = event
  //
  //   if (!over || active.id === over.id) {
  //     return
  //   }
  //
  //   const oldIndex = paymentTypes.findIndex((item) => item.id === active.id)
  //   const newIndex = paymentTypes.findIndex((item) => item.id === over.id)
  //
  //   if (oldIndex === -1 || newIndex === -1) {
  //     return
  //   }
  //
  //   // Create new order array
  //   const newOrder = [...paymentTypes]
  //   const [movedItem] = newOrder.splice(oldIndex, 1)
  //   newOrder.splice(newIndex, 0, movedItem)
  //
  //   // Update display_order for all affected items
  //   const updates = newOrder.map((item, index) => ({
  //     id: item.id,
  //     display_order: index + 1,
  //   }))
  //
  //   console.log('[PaymentTypesManagement.handleDragEnd] Updating order:', updates)
  //   await updateOrderMutation.mutateAsync(updates)
  // }

  const columns: ColumnsType<PaymentType> = [
    // Drag handle column temporarily disabled
    // {
    //   title: '',
    //   dataIndex: 'drag',
    //   width: 50,
    //   render: () => <MenuOutlined style={{ cursor: 'move' }} />,
    // },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      render: (code) => <Tag>{code}</Tag>,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Порядок',
      dataIndex: 'display_order',
      key: 'display_order',
      width: 100,
      align: 'center',
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (is_active) => (
        <Tag color={is_active ? 'green' : 'red'}>
          {is_active ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          />
          <Popconfirm
            title="Удалить тип платежа?"
            description="Это действие нельзя отменить"
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Отмена"
          >
            <Button
              danger
              icon={<DeleteOutlined />}
              size="small"
              disabled={['advance', 'debt_repayment', 'refund', 'full_payment', 'partial_payment'].includes(record.code)}
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Card>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3}>Управление типами платежей</Title>
          <Space>
            <Text>Показать неактивные</Text>
            <Switch
              checked={includeInactive}
              onChange={setIncludeInactive}
            />
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              Добавить тип платежа
            </Button>
          </Space>
        </div>

        {/* Drag and drop temporarily disabled */}
        <Table
          columns={columns}
          dataSource={paymentTypes}
          rowKey="id"
          loading={isLoading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
        />
      </Space>

      <Modal
        title={editingType ? 'Редактировать тип платежа' : 'Добавить тип платежа'}
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false)
          form.resetFields()
          setEditingType(null)
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            is_active: true,
            display_order: paymentTypes.length + 1,
          }}
        >
          <Form.Item
            label="Название"
            name="name"
            rules={[
              { required: true, message: 'Введите название типа платежа' },
              { max: 100, message: 'Максимум 100 символов' },
            ]}
          >
            <Input placeholder="Например: Аванс" />
          </Form.Item>

          <Form.Item
            label="Код"
            name="code"
            rules={[
              { required: true, message: 'Введите код типа платежа' },
              { max: 50, message: 'Максимум 50 символов' },
              {
                pattern: /^[a-z_]+$/,
                message: 'Только строчные латинские буквы и подчеркивание',
              },
            ]}
          >
            <Input
              placeholder="Например: advance"
              disabled={editingType && ['advance', 'debt_repayment', 'refund', 'full_payment', 'partial_payment'].includes(editingType.code)}
            />
          </Form.Item>

          <Form.Item
            label="Описание"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="Описание типа платежа"
              maxLength={500}
            />
          </Form.Item>

          <Form.Item
            label="Порядок отображения"
            name="display_order"
            rules={[
              { required: true, message: 'Введите порядок отображения' },
              { type: 'number', min: 0, message: 'Должно быть положительным числом' },
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Активен"
            name="is_active"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button
                onClick={() => {
                  setIsModalVisible(false)
                  form.resetFields()
                  setEditingType(null)
                }}
              >
                Отмена
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {editingType ? 'Сохранить' : 'Создать'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

export default PaymentTypesManagement