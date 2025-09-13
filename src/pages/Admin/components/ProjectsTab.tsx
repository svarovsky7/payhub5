/**
 * Projects management tab component
 */

import React, { useState } from 'react'
import {
  Button,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Tag,
  Typography
} from 'antd'
import { ProTable } from '@ant-design/pro-components'
import type { ProColumns } from '@ant-design/pro-components'
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import {
  useCreateProject,
  useDeleteProject,
  useProjectsList,
  useUpdateProject
} from '@/services/hooks/useProjects'
import { generateProjectCode } from '@/utils/project-code-generator'
import type { Project } from '../types'

const { Text } = Typography

export const ProjectsTab: React.FC = () => {
  const [projectModalVisible, setProjectModalVisible] = useState(false)
  const [projectForm] = Form.useForm()
  const { data: projects, isLoading, refetch } = useProjectsList()
  const createProjectMutation = useCreateProject()
  const updateProjectMutation = useUpdateProject()
  const deleteProjectMutation = useDeleteProject()
  const [projectModalMode, setProjectModalMode] = useState<'create' | 'edit'>('create')
  const [selectedProject, setSelectedProject] = useState<any>(null)

  const columns: ProColumns<Project>[] = [
    {
      title: 'Код',
      dataIndex: 'project_code',
      render: (text) => <Text code>{text || '—'}</Text>,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      ellipsis: true,
      render: (text) => text || '—',
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
            onClick={() => {
              console.log('[Admin/Projects] Edit button onClick triggered for record:', record)
              handleEditProject(record)
            }}
            title="Редактировать проект"
          />
          <Popconfirm
            title="Удалить проект?"
            description="Проект можно удалить только если по нему нет заявок"
            onConfirm={() => {
              console.log('[Admin/Projects] Delete confirmation triggered for record:', record)
              handleDeleteProject(record.id.toString())
            }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              title="Удалить проект"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const handleEditProject = (project: Project) => {
    console.log('[Admin/Projects] handleEditProject called with project:', project)
    setProjectModalMode('edit')
    setSelectedProject(project)
    projectForm.setFieldsValue({
      name: project.name,
      address: project.address,
      project_code: (project as any).project_code ?? generateProjectCode(project.name),
      is_active: project.is_active
    })
    console.log('[Admin/Projects] Form values set for editing')
    setProjectModalVisible(true)
    console.log('[Admin/Projects] Edit modal opened')
  }

  const handleDeleteProject = async (id: string) => {
    console.log('[Admin/Projects] handleDeleteProject called with id:', id)
    try {
      console.log('[Admin/Projects] Calling deleteProjectMutation...')
      const result = await deleteProjectMutation.mutateAsync(id)
      console.log('[Admin/Projects] Delete mutation result:', result)

      if (result?.data === null && result?.error === null) {
        console.log('[Admin/Projects] Project deleted successfully')
        message.success('Проект успешно удален')
        void refetch()
      } else if (result?.error) {
        console.log('[Admin/Projects] Delete blocked:', result.error)
        message.error(result.error)
      }
    } catch (error: any) {
      console.error('[Admin/Projects] Error deleting project:', error)
      message.error(error?.message || 'Ошибка при удалении проекта')
    }
  }

  const handleSubmit = async (values: any) => {
    console.log('[Admin/Projects] Form submitted with values:', values)
    console.log('[Admin/Projects] Modal mode:', projectModalMode)
    console.log('[Admin/Projects] Selected project:', selectedProject)

    try {
      if (projectModalMode === 'create') {
        console.log('[Admin/Projects] Creating new project...')
        // Генерируем код если он не задан
        const projectCode = values.project_code ?? generateProjectCode(values.name)
        const result = await createProjectMutation.mutateAsync({
          ...values,
          project_code: projectCode,
          is_active: values.is_active !== false
        })
        if (result.data) {
          console.log('[Admin/Projects] Project created successfully:', result.data)
          setProjectModalVisible(false)
          projectForm.resetFields()
          void refetch()
        }
      } else {
        console.log('[Admin/Projects] Updating project with id:', selectedProject?.id)
        // Генерируем код если он не задан
        const projectCode = values.project_code ?? generateProjectCode(values.name)
        const result = await updateProjectMutation.mutateAsync({
          id: selectedProject?.id,
          data: {
            ...values,
            project_code: projectCode,
            is_active: values.is_active !== false
          }
        })
        if (result.data) {
          console.log('[Admin/Projects] Project updated successfully:', result.data)
          setProjectModalVisible(false)
          projectForm.resetFields()
          setSelectedProject(null)
          void refetch()
        }
      }
    } catch (error) {
      console.error(`[Admin/Projects] Error ${projectModalMode === 'create' ? 'creating' : 'updating'} project:`, error)
    }
  }

  return (
    <>
      <ProTable
        dataSource={projects ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        search={false}
        scroll={{ x: 'max-content' }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              console.log('[Admin/Projects] Create project button clicked')
              setProjectModalMode('create')
              setSelectedProject(null)
              projectForm.resetFields()
              projectForm.setFieldsValue({
                is_active: true,
                project_code: ''
              })
              setProjectModalVisible(true)
            }}
          >
            Создать проект
          </Button>,
        ]}
      />

      <Modal
        title={projectModalMode === 'create' ? 'Создать проект' : 'Редактировать проект'}
        open={projectModalVisible}
        onCancel={() => {
          setProjectModalVisible(false)
          projectForm.resetFields()
          setSelectedProject(null)
        }}
        onOk={() => projectForm.submit()}
        confirmLoading={projectModalMode === 'create' ? createProjectMutation.isPending : updateProjectMutation.isPending}
      >
        <Form
          form={projectForm}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Название проекта"
            rules={[{ required: true, message: 'Введите название проекта' }]}
          >
            <Input placeholder="Например: Строительство офиса" />
          </Form.Item>

          <Form.Item
            label="Уникальный код проекта"
            extra="Код генерируется автоматически. Формат: 2-4 буквы + опциональная цифра (например, HRZ, CTB2, PRMV)"
          >
            <Space.Compact style={{ width: '100%' }}>
              <Form.Item
                name="project_code"
                noStyle
                rules={[
                  { pattern: /^[A-Z]{2,4}[0-9]?$/, message: 'Код должен состоять из 2-4 латинских букв и может заканчиваться цифрой' }
                ]}
              >
                <Input
                  placeholder="HRZ1"
                  style={{ fontFamily: 'monospace' }}
                  maxLength={5}
                  onChange={(e) => {
                    const upperValue = e.target.value.toUpperCase()
                    projectForm.setFieldsValue({ project_code: upperValue })
                  }}
                />
              </Form.Item>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  const name = projectForm.getFieldValue('name')
                  if (name) {
                    const newCode = generateProjectCode(name)
                    projectForm.setFieldsValue({ project_code: newCode })
                    message.success('Код проекта перегенерирован')
                  } else {
                    message.warning('Введите название проекта для генерации кода')
                  }
                }}
                title="Перегенерировать код"
              >
                Перегенерировать
              </Button>
            </Space.Compact>
          </Form.Item>

          <Form.Item
            name="address"
            label="Адрес"
          >
            <Input placeholder="Адрес объекта" />
          </Form.Item>

          <Form.Item
            name="is_active"
            label="Активный проект"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch defaultChecked />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}