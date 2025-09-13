/**
 * Profile page for user settings
 */

import React, {useEffect, useState} from 'react'
import {
    Avatar,
    Button,
    Card,
    Col,
    Divider,
    Form,
    Input,
    message,
    Row,
    Select,
    Space,
    Spin,
    Tabs,
    Tag,
    Typography
} from 'antd'
import {
    ProCard,
    ProForm,
    ProFormSelect,
    ProFormText
} from '@ant-design/pro-components'
import {PageContainer} from '@ant-design/pro-layout'
import {
    ProjectOutlined,
    SaveOutlined,
    TeamOutlined,
    UserOutlined
} from '@ant-design/icons'
import {useNavigate} from 'react-router-dom'
import {useAuthStore} from '../../models/auth'
import {useProjectsList} from '../../services/hooks/useProjects'
import {useRolesList} from '../../services/hooks/useRoles'
import {supabase} from '../../services/supabase'

const {Text, Title} = Typography
const {Password} = Input

const ProfilePage: React.FC = () => {
    const navigate = useNavigate()
    const [activeTab, setActiveTab] = useState('profile')
    const [loading, setLoading] = useState(false)
    const [profileData, setProfileData] = useState<any>(null)
    const [form] = Form.useForm()
    const [passwordForm] = Form.useForm()

    // Получаем данные из хранилища авторизации
    const {user, profile, isAuthenticated} = useAuthStore()

    // Загружаем списки проектов и ролей
    const {data: projectsData} = useProjectsList()
    const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? [])
    const {data: roles} = useRolesList()

    // Загружаем полные данные пользователя из БД
    useEffect(() => {
        const loadUserProfile = async () => {
            if (!user?.id) {
                return
            }

            setLoading(true)
            console.log('[Profile] Loading user profile for ID:', user.id)

            try {
                const {data, error} = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', user.id)
                    .single()

                if (error) {
                    console.error('[Profile] Error loading profile:', error)
                    message.error('Ошибка загрузки профиля')
                } else {
                    console.log('[Profile] Profile loaded:', data)
                    setProfileData(data)

                    // Устанавливаем значения формы
                    form.setFieldsValue({
                        full_name: data.full_name,
                        email: data.email,
                        role_id: data.role_id,
                        project_ids: data.project_ids ?? []
                    })
                }
            } catch (error) {
                console.error('[Profile] Exception loading profile:', error)
                message.error('Ошибка загрузки профиля')
            } finally {
                setLoading(false)
            }
        }

        void loadUserProfile()
    }, [user?.id, form])

    // Проверяем авторизацию
    useEffect(() => {
        if (!isAuthenticated) {
            void navigate('/login')
        }
    }, [isAuthenticated, navigate])

    // Обработка сохранения профиля
    const handleProfileSave = async (values: any) => {
        try {
            setLoading(true)
            console.log('[Profile] Saving profile with values:', values)

            const {data, error} = await supabase
                .from('users')
                .update({
                    full_name: values.full_name,
                    email: values.email,
                    role_id: values.role_id,
                    project_ids: values.project_ids ?? [],
                    updated_at: new Date().toISOString()
                })
                .eq('id', user?.id)
                .select()
                .single()

            if (error) {
                console.error('[Profile] Error updating profile:', error)
                message.error('Ошибка обновления профиля')
            } else {
                console.log('[Profile] Profile updated successfully:', data)
                setProfileData(data)
                message.success('Профиль успешно обновлен')
            }
        } catch (error) {
            console.error('[Profile] Exception updating profile:', error)
            message.error('Ошибка обновления профиля')
        } finally {
            setLoading(false)
        }
    }

    // Обработка смены пароля
    const handlePasswordChange = async (values: any) => {
        try {
            setLoading(true)
            console.log('[Profile] Changing password...')

            const {error} = await supabase.auth.updateUser({
                password: values.new_password
            })

            if (error) {
                console.error('[Profile] Error changing password:', error)
                message.error('Ошибка смены пароля: ' + error.message)
            } else {
                console.log('[Profile] Password changed successfully')
                message.success('Пароль успешно изменен')
                passwordForm.resetFields()
            }
        } catch (error) {
            console.error('[Profile] Exception changing password:', error)
            message.error('Ошибка смены пароля')
        } finally {
            setLoading(false)
        }
    }

    // Вкладка профиля
    const ProfileTab = () => (
        <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
                <ProCard title="Информация">
                    <div style={{textAlign: 'center'}}>
                        <Avatar
                            size={120}
                            icon={<UserOutlined/>}
                            style={{marginBottom: 16, backgroundColor: '#1890ff'}}
                        />
                        <div>
                            <Title level={4} style={{marginBottom: 4}}>
                                {profileData?.full_name || 'Пользователь'}
                            </Title>
                            <Text type="secondary">{profileData?.email}</Text>
                        </div>
                        <Divider/>
                        <Space direction="vertical" style={{width: '100%', textAlign: 'left'}}>
                            <div>
                                <Text type="secondary">ID пользователя:</Text>
                                <br/>
                                <Text copyable>{user?.id}</Text>
                            </div>
                            <div>
                                <Text type="secondary">Дата регистрации:</Text>
                                <br/>
                                <Text>
                                    {profileData?.created_at
                                        ? new Date(profileData.created_at).toLocaleDateString('ru-RU')
                                        : '—'}
                                </Text>
                            </div>
                            <div>
                                <Text type="secondary">Статус:</Text>
                                <br/>
                                <Tag color={profileData?.is_active ? 'green' : 'red'}>
                                    {profileData?.is_active ? 'Активен' : 'Неактивен'}
                                </Tag>
                            </div>
                        </Space>
                    </div>
                </ProCard>
            </Col>

            <Col xs={24} md={16}>
                <ProCard title="Редактирование профиля" loading={loading}>
                    <ProForm
                        form={form}
                        onFinish={handleProfileSave}
                        submitter={{
                            render: (props) => (<Button
                                    type="primary"
                                    icon={<SaveOutlined/>}
                                    loading={loading}
                                    onClick={() => props.form?.submit()}
                                >
                                    Сохранить изменения
                                </Button>
                            ),
                        }}
                    >
                        <ProFormText
                            name="full_name"
                            label="ФИО"
                            rules={[{required: true, message: 'Укажите ФИО'}]}
                            width="lg"
                            placeholder="Иванов Иван Иванович"
                        />

                        <ProFormText
                            name="email"
                            label="Email"
                            rules={[
                                {required: true, message: 'Укажите email'},
                                {type: 'email', message: 'Некорректный email'},
                            ]}
                            width="lg"
                            disabled
                            extra="Email нельзя изменить"
                        />

                        <ProFormSelect
                            name="role_id"
                            label="Роль"
                            width="md"
                            disabled
                            options={roles?.map(role => ({
                                label: role.name,
                                value: role.id
                            })) || []}
                            extra="Роль может изменить только администратор"
                        />

                        <Form.Item
                            name="project_ids"
                            label="Проекты"
                            rules={[{required: true, message: 'Выберите хотя бы один проект'}]}
                        >
                            <Select
                                mode="multiple"
                                placeholder="Выберите проекты"
                                loading={!projectsData}
                                style={{width: '100%'}}
                                suffixIcon={<ProjectOutlined/>}
                            >
                                {projects.map(project => (
                                    <Select.Option key={project.id} value={project.id}>
                                        {project.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </ProForm>
                </ProCard>

                <ProCard title="Смена пароля" style={{marginTop: 24}}>
                    <Form
                        form={passwordForm}
                        layout="vertical"
                        style={{maxWidth: 400}}
                        onFinish={handlePasswordChange}
                    >
                        <Form.Item
                            name="new_password"
                            label="Новый пароль"
                            rules={[
                                {required: true, message: 'Укажите новый пароль'},
                                {min: 6, message: 'Минимум 6 символов'},
                            ]}
                        >
                            <Password placeholder="Введите новый пароль"/>
                        </Form.Item>

                        <Form.Item
                            name="confirm_password"
                            label="Подтвердите пароль"
                            dependencies={['new_password']}
                            rules={[
                                {required: true, message: 'Подтвердите пароль'},
                                ({getFieldValue}) => ({
                                    validator(_, value) {
                                        if (!value || getFieldValue('new_password') === value) {
                                            return Promise.resolve()
                                        }
                                        return Promise.reject(new Error('Пароли не совпадают'))
                                    },
                                }),
                            ]}
                        >
                            <Password placeholder="Подтвердите новый пароль"/>
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                Изменить пароль
                            </Button>
                        </Form.Item>
                    </Form>
                </ProCard>
            </Col>
        </Row>
    )

    // Вкладка с информацией о системе
    const SystemInfoTab = () => (
        <ProCard>
            <Space direction="vertical" size="large" style={{width: '100%'}}>
                <div>
                    <Title level={4}>
                        <TeamOutlined/> Роль и права доступа
                    </Title>
                    <Space direction="vertical">
                        <div>
                            <Text type="secondary">Текущая роль:</Text>{' '}
                            <Tag color="blue">
                                {roles?.find(r => r.id === profileData?.role_id)?.name || 'Не определена'}
                            </Tag>
                        </div>
                        <div>
                            <Text type="secondary">Описание роли:</Text>{' '}
                            <Text>
                                {roles?.find(r => r.id === profileData?.role_id)?.description || 'Нет описания'}
                            </Text>
                        </div>
                    </Space>
                </div>

                <Divider/>

                <div>
                    <Title level={4}>
                        <ProjectOutlined/> Доступные проекты
                    </Title>
                    <Space wrap>
                        {profileData?.project_ids?.length > 0 ? (profileData.project_ids.map((projectId: number) => {
                                const project = projects.find(p => p.id === projectId)
                                return project ? (
                                    <Tag key={projectId} color="green">
                                        {project.name}
                                    </Tag>
                                ) : (
                                    <Tag key={projectId} color="red">
                                        Проект #{projectId} (не найден)
                                    </Tag>
                                )
                            })
                        ) : (
                            <Text type="secondary">Нет доступных проектов</Text>
                        )}
                    </Space>
                </div>
            </Space>
        </ProCard>
    )

    const tabItems = [
        {
            key: 'profile',
            label: (
                <Space>
                    <UserOutlined/>
                    Профиль
                </Space>
            ),
            children: <ProfileTab/>,
        },
        {
            key: 'system',
            label: (
                <Space>
                    <TeamOutlined/>
                    Система
                </Space>
            ),
            children: <SystemInfoTab/>,
        },
    ]

    if (loading && !profileData) {
        return (
            <PageContainer>
                <Card>
                    <div style={{textAlign: 'center', padding: '50px 0'}}>
                        <Spin size="large"/>
                        <div style={{marginTop: 16}}>
                            <Text type="secondary">Загрузка профиля...</Text>
                        </div>
                    </div>
                </Card>
            </PageContainer>
        )
    }

    return (<PageContainer
            title="Профиль пользователя"
            subTitle={profileData?.full_name ?? user?.email}
        >
            <Tabs
                activeKey={activeTab}
                onChange={setActiveTab}
                items={tabItems}
                size="large"
            />
        </PageContainer>
    )
}

export default ProfilePage