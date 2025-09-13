/**
 * Roles management component for admin page
 */

import React, {useState} from 'react'
import {
    Button,
    Card,
    Col,
    Form,
    Input,
    Modal,
    Popconfirm,
    Row,
    Space,
    Switch,
    Table,
    Tag,
    Typography
} from 'antd'
import {
    DeleteOutlined,
    EditOutlined,
    PlusOutlined,
    SafetyOutlined
} from '@ant-design/icons'
import {
    useCreateRole,
    useDeleteRole,
    useRolesList,
    useUpdateRole
} from '../../services/hooks/useRoles'
import type {Role} from '../../services/admin/roles'

const {Text} = Typography
const {TextArea} = Input


export const RolesTab: React.FC = () => {
    const [modalVisible, setModalVisible] = useState(false)
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
    const [selectedRole, setSelectedRole] = useState<Role | null>(null)
    const [form] = Form.useForm()

    const {data: roles, isLoading} = useRolesList()
    const createRoleMutation = useCreateRole()
    const updateRoleMutation = useUpdateRole()
    const deleteRoleMutation = useDeleteRole()

    const handleCreate = () => {
        console.log('[RolesTab.handleCreate] Opening create modal')
        setModalMode('create')
        setSelectedRole(null)
        form.resetFields()
        form.setFieldsValue({
            is_active: true,
            view_own_project_only: false
        })
        setModalVisible(true)
    }

    const handleEdit = (role: Role) => {
        console.log('[RolesTab.handleEdit] Opening edit modal for role:', role)
        setModalMode('edit')
        setSelectedRole(role)
        form.setFieldsValue({
            code: role.code,
            name: role.name,
            description: role.description,
            is_active: role.is_active,
            view_own_project_only: role.view_own_project_only ?? false
        })
        setModalVisible(true)
    }

    const handleDelete = async (id: number) => {
        console.log('[RolesTab.handleDelete] Deleting role:', id)
        try {
            await deleteRoleMutation.mutateAsync(id)
        } catch (error) {
            console.error('[RolesTab.handleDelete] Error:', error)
        }
    }

    const handleSubmit = async () => {
        console.log('[RolesTab.handleSubmit] Submitting form')
        try {
            const values = await form.validateFields()
            console.log('[RolesTab.handleSubmit] Form values:', values)

            if (modalMode === 'create') {
                console.log('[RolesTab.handleSubmit] Mode is CREATE, calling mutation...')
                const mutationData = {
                    code: values.code,
                    name: values.name,
                    description: values.description,
                    is_active: values.is_active,
                    view_own_project_only: values.view_own_project_only ?? false
                }
                console.log('[RolesTab.handleSubmit] Mutation data:', mutationData)

                const result = await createRoleMutation.mutateAsync(mutationData)
                console.log('[RolesTab.handleSubmit] Mutation completed with result:', result)
            } else if (selectedRole) {
                console.log('[RolesTab.handleSubmit] Mode is EDIT, calling mutation...')
                const result = await updateRoleMutation.mutateAsync({
                    id: selectedRole.id,
                    data: {
                        name: values.name,
                        description: values.description,
                        is_active: values.is_active,
                        view_own_project_only: values.view_own_project_only ?? false
                    }
                })
                console.log('[RolesTab.handleSubmit] Update mutation completed with result:', result)
            }

            console.log('[RolesTab.handleSubmit] Closing modal and resetting form...')
            setModalVisible(false)
            form.resetFields()
            setSelectedRole(null)
            console.log('[RolesTab.handleSubmit] Form submission completed successfully')
        } catch (error) {
            console.error('[RolesTab.handleSubmit] Caught error:', error)
        }
    }

    const columns = [
        {
            title: 'Код',
            dataIndex: 'code',
            key: 'code',
            render: (text: string) => <Text code>{text}</Text>
        },
        {
            title: 'Название',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Описание',
            dataIndex: 'description',
            key: 'description',
            ellipsis: true,
            render: (text: string) => text || '—'
        },
        {
            title: 'Видимость проектов',
            dataIndex: 'view_own_project_only',
            key: 'view_own_project_only',
            render: (viewOwnOnly: boolean) => (
                <Tag color={viewOwnOnly ? 'orange' : 'blue'}>
                    {viewOwnOnly ? 'Только свои проекты' : 'Все проекты'}
                </Tag>
            )
        },
        {
            title: 'Статус',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (active: boolean) => (
                <Tag color={active ? 'success' : 'default'}>
                    {active ? 'Активна' : 'Неактивна'}
                </Tag>
            )
        },
        {
            title: 'Действия',
            key: 'actions',
            width: 120,
            render: (_: any, record: Role) => (<Space size={0}>
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined/>}
                        onClick={() => void handleEdit(record)}
                    />
                    <Popconfirm
                        title="Удалить роль?"
                        description="Это действие нельзя отменить"
                        onConfirm={() => handleDelete(record.id)}
                    >
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined/>}
                        />
                    </Popconfirm>
                </Space>
            )
        }
    ]

    return (<>
            <Card
                title={
                    <Space>
                        <SafetyOutlined/>
                        <span>Управление ролями</span>
                    </Space>
                }
                extra={
                    <Button
                        type="primary"
                        icon={<PlusOutlined/>}
                        onClick={() => void handleCreate()}
                    >
                        Создать роль
                    </Button>
                }
            >
                <Table
                    dataSource={roles}
                    columns={columns}
                    rowKey="id"
                    loading={isLoading}
                    scroll={{x: 'max-content'}}
                    pagination={{
                        defaultPageSize: 20,
                        showSizeChanger: true
                    }}
                />
            </Card>

            <Modal
                title={
                    <Space>
                        <SafetyOutlined/>
                        <span>{modalMode === 'create' ? 'Создать роль' : 'Редактировать роль'}</span>
                    </Space>
                }
                open={modalVisible}
                onOk={handleSubmit}
                onCancel={() => {
                    setModalVisible(false)
                    form.resetFields()
                    setSelectedRole(null)
                }}
                width={800}
                confirmLoading={createRoleMutation.isPending ?? updateRoleMutation.isPending}
                okText={modalMode === 'create' ? 'Создать' : 'Сохранить'}
                cancelText="Отмена"
            >
                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{
                        is_active: true
                    }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="code"
                                label="Код роли"
                                rules={[
                                    {required: true, message: 'Введите код роли'},
                                    {
                                        pattern: /^[a-z_]+$/,
                                        message: 'Только латинские буквы в нижнем регистре и подчеркивание'
                                    }
                                ]}
                                extra="Уникальный идентификатор роли (только латиница)"
                            >
                                <Input
                                    placeholder="например: finance_manager"
                                    disabled={modalMode === 'edit'}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="name"
                                label="Название роли"
                                rules={[{required: true, message: 'Введите название роли'}]}
                            >
                                <Input placeholder="например: Финансовый менеджер"/>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="description"
                        label="Описание"
                    >
                        <TextArea
                            rows={2}
                            placeholder="Краткое описание роли и её обязанностей"
                        />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="is_active"
                                label="Статус"
                                valuePropName="checked"
                            >
                                <Switch checkedChildren="Активна" unCheckedChildren="Неактивна"/>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="view_own_project_only"
                                label="Видимость проектов"
                                valuePropName="checked"
                                extra="Если включено, пользователи с этой ролью видят только свои проекты"
                            >
                                <Switch checkedChildren="Только свои" unCheckedChildren="Все проекты"/>
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </>
    )
}