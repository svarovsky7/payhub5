/**
 * Users management tab component
 */

import React, { useRef, useState } from 'react'
import {
  Avatar,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Tag
} from 'antd'
import { ProTable } from '@ant-design/pro-components'
import type { ActionType, ProColumns } from '@ant-design/pro-components'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UserOutlined
} from '@ant-design/icons'
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsersList
} from '@/services/hooks/useUsers'
import { useProjectsList } from '@/services/hooks/useProjects'
import { useRolesList } from '@/services/hooks/useRoles'
import type { User } from '../types'

export const UsersTab: React.FC = () => {
  const actionRef = useRef<ActionType>()
  const [form] = Form.useForm()
  const [modalVisible, setModalVisible] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [selectedRecord, setSelectedRecord] = useState<any>(null)

  const { data: users, isLoading } = useUsersList()
  const { data: projects } = useProjectsList()
  const { data: roles } = useRolesList()
  const createUserMutation = useCreateUser()
  const updateUserMutation = useUpdateUser()
  const deleteUserMutation = useDeleteUser()

  const columns: ProColumns<User>[] = [
    {
      title: 'Аватар',
      dataIndex: 'avatar_url',
      render: (_, record) => (
        <Avatar
          src={record.avatar_url}
          icon={<UserOutlined />}
          size="small"
        />
      ),
    },
    {
      title: 'Имя',
      dataIndex: 'full_name',
      render: (text) => text || '—',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      copyable: true,
    },
    {
      title: 'Роль',
      dataIndex: 'role_id',
      render: (roleId) => {
        const role = roles?.find(r => r.id === roleId)
        return role ? (
          <Tag color="blue">{role.name}</Tag>
        ) : (
          <Tag color="default">Не назначена</Tag>
        )
      },
    },
    {
      title: 'Проекты',
      dataIndex: 'project_ids',
      render: (projectIds: number[]) => {
        if (!projectIds || projectIds.length === 0) {
          return <Tag color="blue">Все проекты</Tag>
        }
        const userProjects = projects?.filter(p => projectIds.includes(p.id)) || []
        return (
          <Space size={[0, 4]} wrap>
            {userProjects.map(p => (
              <Tag key={p.id} color="green">{p.name}</Tag>
            ))}
          </Space>
        )
      },
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      render: (active) => (
        <Tag color={active ? 'success' : 'default'}>
          {active ? 'Активный' : 'Неактивный'}
        </Tag>
      ),
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
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Удалить пользователя?"
            onConfirm={() => handleDelete(record.id)}
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

  const handleCreate = () => {
    setModalMode('create')
    setSelectedRecord(null)
    setModalVisible(true)
    form.resetFields()
    form.setFieldsValue({
      is_active: true,
      project_ids: []
    })
  }

  const handleEdit = (record: User) => {
    setModalMode('edit')
    setSelectedRecord(record)
    setModalVisible(true)
    form.setFieldsValue({
      ...record,
      project_ids: (record as any).project_ids ?? [],
      role_id: record.role_id ?? undefined
    })
  }

  const handleDelete = async (id: string) => {
    console.log('[Admin] Deleting user:', id)
    try {
      await deleteUserMutation.mutateAsync(id)
      console.log('[Admin] User deleted successfully')
      actionRef.current?.reload()
    } catch (error) {
      console.error('[Admin] Delete user error:', error)
    }
  }

  const handleSubmit = async (values: any) => {
    console.log('[Admin] Submit user form:', values, 'mode:', modalMode)
    try {
      if (modalMode === 'create') {
        // Generate random password for new user
        const password = Math.random().toString(36).slice(-8) + 'A1'
        console.log('[Admin] Creating user with generated password')
        await createUserMutation.mutateAsync({
          userData: values,
          password
        })
      } else {
        console.log('[Admin] Updating user:', selectedRecord.id)
        await updateUserMutation.mutateAsync({
          id: selectedRecord.id,
          data: values
        })
      }
      console.log('[Admin] User operation successful')
      setModalVisible(false)
      form.resetFields()
      actionRef.current?.reload()
    } catch (error) {
      console.error('[Admin] Submit user error:', error)
    }
  }

  return (
    <>
      <ProTable
        actionRef={actionRef}
        dataSource={users ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        search={false}
        scroll={{ x: 'max-content' }}
        pagination={{
          defaultPageSize: 20,
          showSizeChanger: true,
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Добавить пользователя
          </Button>,
        ]}
      />

      <Modal
        title={modalMode === 'create' ? 'Добавить пользователя' : 'Редактировать пользователя'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={createUserMutation.isPending || updateUserMutation.isPending}
      >
        <Form
          form={form}
          onFinish={handleSubmit}
          layout="vertical"
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Укажите email' },
              { type: 'email', message: 'Некорректный email' },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="full_name"
            label="ФИО"
            rules={[{ required: true, message: 'Укажите ФИО' }]}
          >
            <Input placeholder="Фамилия Имя Отчество" />
          </Form.Item>

          <Form.Item
            name="role_id"
            label="Роль"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select
              placeholder="Выберите роль"
              allowClear
              options={roles?.map(r => ({
                label: r.name,
                value: r.id
              })) || []}
            />
          </Form.Item>

          <Form.Item
            name="project_ids"
            label="Проекты"
            extra="Не выбрано - доступ ко всем проектам"
          >
            <Select
              mode="multiple"
              placeholder="Выберите проекты"
              allowClear
              options={projects?.map(p => ({
                label: p.name,
                value: p.id
              })) || []}
            />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активный пользователь"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}