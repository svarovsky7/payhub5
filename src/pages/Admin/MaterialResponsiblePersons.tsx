/**
 * Страница управления материально ответственными лицами (МОЛ)
 */

import React, {useState} from 'react'
import {
    Button,
    Card,
    Divider,
    Form,
    Input,
    message,
    Modal,
    Popconfirm,
    Space,
    Switch,
    Table,
    Tag,
    Typography
} from 'antd'
import {
    DeleteOutlined,
    EditOutlined,
    PhoneOutlined,
    PlusOutlined,
    UserOutlined
} from '@ant-design/icons'
import {
    useActivateMaterialResponsiblePerson,
    useCreateMaterialResponsiblePerson,
    useDeactivateMaterialResponsiblePerson,
    useDeleteMaterialResponsiblePerson,
    useMaterialResponsiblePersonsList,
    useUpdateMaterialResponsiblePerson
} from '../../services/hooks/useMaterialResponsiblePersons'
import {useAuthStore} from '../../models/auth'
import type {MaterialResponsiblePerson} from '../../services/materialResponsiblePersons/crud'
import {formatPhoneNumber} from '../../utils/phone-formatter'

const {Title} = Typography

// Предустановленные должности для быстрого выбора
const QUICK_POSITIONS = [
    'Начальник участка',
    'Прораб',
    'Технический руководитель',
    'Кладовщик'
]

export const MaterialResponsiblePersonsPage: React.FC = () => {
    const [form] = Form.useForm()
    const [modalVisible, setModalVisible] = useState(false)
    const [editingPerson, setEditingPerson] = useState<MaterialResponsiblePerson | null>(null)
    const {user} = useAuthStore()

    // Hooks
    const {data: persons, isLoading} = useMaterialResponsiblePersonsList()
    const createMutation = useCreateMaterialResponsiblePerson()
    const updateMutation = useUpdateMaterialResponsiblePerson()
    const deleteMutation = useDeleteMaterialResponsiblePerson()
    const deactivateMutation = useDeactivateMaterialResponsiblePerson()
    const activateMutation = useActivateMaterialResponsiblePerson()

    const handleCreate = () => {
        form.resetFields()
        setEditingPerson(null)
        setModalVisible(true)
    }

    const handleEdit = (person: MaterialResponsiblePerson) => {
        setEditingPerson(person)
        form.setFieldsValue({
            full_name: person.full_name,
            phone: person.phone,
            position: person.position,
            email: person.email
        })
        setModalVisible(true)
    }

    const handleSubmit = async (values: any) => {
        console.log('[MaterialResponsiblePersonsPage.handleSubmit] Отправка формы:', values)

        try {
            if (editingPerson) {
                // Обновление
                await updateMutation.mutateAsync({
                    id: editingPerson.id,
                    updates: values
                })
                message.success('МОЛ успешно обновлен')
            } else {
                // Создание
                await createMutation.mutateAsync({
                    ...values,
                    created_by: user?.id
                })
                message.success('МОЛ успешно создан')
            }

            setModalVisible(false)
            form.resetFields()
            setEditingPerson(null)
        } catch (error: any) {
            console.error('[MaterialResponsiblePersonsPage.handleSubmit] Ошибка:', error)
            const errorMessage = (error?.message ?? error?.toString()) || 'Неизвестная ошибка'

            // Check for specific database errors
            if (errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
                message.error('Таблица МОЛ не существует в базе данных. Необходимо выполнить миграцию.')
            } else if (errorMessage.includes('duplicate')) {
                message.error('МОЛ с такими данными уже существует')
            } else {
                message.error(`${editingPerson ? 'Ошибка обновления' : 'Ошибка создания'} МОЛ: ${errorMessage}`)
            }
        }
    }

    const handleDelete = async (id: number) => {
        console.log('[MaterialResponsiblePersonsPage.handleDelete] Удаление МОЛ:', id)

        try {
            await deleteMutation.mutateAsync(id)
            message.success('МОЛ успешно удален')
        } catch (error) {
            console.error('[MaterialResponsiblePersonsPage.handleDelete] Ошибка:', error)
            message.error('Ошибка удаления МОЛ')
        }
    }

    const handleToggleActive = async (person: MaterialResponsiblePerson) => {
        console.log('[MaterialResponsiblePersonsPage.handleToggleActive] Переключение статуса:', person)

        try {
            if (person.is_active) {
                // For toggle, we still want to deactivate, not delete
                // We need to call the deactivate method instead
                await deactivateMutation.mutateAsync(person.id)
                message.success('МОЛ деактивирован')
            } else {
                await activateMutation.mutateAsync(person.id)
                message.success('МОЛ активирован')
            }
        } catch (error) {
            console.error('[MaterialResponsiblePersonsPage.handleToggleActive] Ошибка:', error)
            message.error('Ошибка изменения статуса МОЛ')
        }
    }

    const columns = [
        {
            title: 'ФИО',
            dataIndex: 'full_name',
            key: 'full_name',
            render: (text: string) => (
                <Space>
                    <UserOutlined/>
                    <strong>{text}</strong>
                </Space>
            )
        },
        {
            title: 'Телефон',
            dataIndex: 'phone',
            key: 'phone',
            render: (text: string) => text ? (
                <Space>
                    <PhoneOutlined/>
                    {text}
                </Space>
            ) : '—'
        },
        {
            title: 'Должность',
            dataIndex: 'position',
            key: 'position',
            render: (text: string) => text || '—'
        },
        {
            title: 'Email',
            dataIndex: 'email',
            key: 'email',
            render: (text: string) => text || '—'
        },
        {
            title: 'Статус',
            dataIndex: 'is_active',
            key: 'is_active',
            render: (is_active: boolean) => (
                <Tag color={is_active ? 'green' : 'red'}>
                    {is_active ? 'Активен' : 'Неактивен'}
                </Tag>
            )
        },
        {
            title: 'Действия',
            key: 'actions',
            width: 200,
            render: (_: any, record: MaterialResponsiblePerson) => (<Space>
                    <Button
                        type="link"
                        icon={<EditOutlined/>}
                        onClick={() => void handleEdit(record)}
                    >
                        Редактировать
                    </Button>
                    <Switch
                        checked={record.is_active}
                        onChange={() => void handleToggleActive(record)}
                        checkedChildren="Активен"
                        unCheckedChildren="Неактивен"
                        loading={deactivateMutation.isPending ?? activateMutation.isPending}
                    />
                    <Popconfirm
                        title="Удалить МОЛ?"
                        description="МОЛ будет полностью удален из базы данных. Это действие необратимо."
                        onConfirm={() => handleDelete(record.id)}
                        okText="Да, удалить"
                        cancelText="Отмена"
                        okButtonProps={{danger: true}}
                    >
                        <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined/>}
                        >
                            Удалить
                        </Button>
                    </Popconfirm>
                </Space>
            )
        }
    ]

    return (
        <Card
            title={
                <Space>
                    <UserOutlined/>
                    <Title level={4} style={{margin: 0}}>
                        Материально ответственные лица (МОЛ)
                    </Title>
                </Space>
            }
            extra={
                <Button
                    type="primary"
                    icon={<PlusOutlined/>}
                    onClick={() => void handleCreate()}
                >
                    Добавить МОЛ
                </Button>
            }
        >
            <Table
                dataSource={persons ?? []}
                columns={columns}
                rowKey="id"
                loading={isLoading}
                pagination={{
                    defaultPageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `Всего: ${total}`
                }}
            />

            <Modal
                title={editingPerson ? 'Редактировать МОЛ' : 'Создать МОЛ'}
                open={modalVisible}
                onCancel={() => {
                    setModalVisible(false)
                    form.resetFields()
                    setEditingPerson(null)
                }}
                footer={null}
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleSubmit}
                >
                    <Form.Item
                        label="ФИО *"
                        name="full_name"
                        rules={[
                            {required: true, message: 'Введите ФИО'},
                            {min: 3, message: 'ФИО должно содержать минимум 3 символа'}
                        ]}
                    >
                        <Input
                            prefix={<UserOutlined/>}
                            placeholder="Иванов Иван Иванович"
                        />
                    </Form.Item>

                    <Form.Item
                        label="Телефон"
                        name="phone"
                        normalize={(_value) => formatPhoneNumber(value || '')}
                    >
                        <Input
                            prefix={<PhoneOutlined/>}
                            placeholder="+7 (999) 123-45-67"
                            onChange={(_e) => {
                                const formatted = formatPhoneNumber(e.target.value)
                                e.target.value = formatted
                            }}
                        />
                    </Form.Item>

                    <Form.Item
                        label="Должность"
                        name="position"
                    >
                        <Input
                            placeholder="Например: Начальник склада"
                        />
                    </Form.Item>

                    {/* Быстрый выбор должности */}
                    <div style={{marginTop: -16, marginBottom: 24}}>
                        <Space wrap>
                            <span style={{fontSize: 12, color: '#888'}}>Быстрый выбор:</span>
                            {QUICK_POSITIONS.map(position => (
                                <Tag
                                    key={position}
                                    style={{cursor: 'pointer'}}
                                    color="blue"
                                    onClick={() => form.setFieldsValue({position})}
                                >
                                    {position}
                                </Tag>
                            ))}
                        </Space>
                    </div>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            {type: 'email', message: 'Неверный формат email'}
                        ]}
                    >
                        <Input
                            placeholder="example@company.ru"
                        />
                    </Form.Item>

                    <Form.Item style={{marginTop: 24, marginBottom: 0}}>
                        <Space style={{width: '100%', justifyContent: 'flex-end'}}>
                            <Button
                                onClick={() => {
                                    setModalVisible(false)
                                    form.resetFields()
                                    setEditingPerson(null)
                                }}
                            >
                                Отмена
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={createMutation.isPending ?? updateMutation.isPending}
                            >
                                {editingPerson ? 'Сохранить' : 'Создать'}
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </Card>
    )
}

export default MaterialResponsiblePersonsPage