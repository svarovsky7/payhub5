import React, {useEffect, useState} from 'react';
import {Button, Card, Col, Divider, Form, Input, message, Row, Select, Space, Typography} from 'antd';
import {LockOutlined, MailOutlined, ProjectOutlined, UserAddOutlined, UserOutlined} from '@ant-design/icons';
import {Link, useNavigate} from 'react-router-dom';
import {useAuthStore} from '../../models/auth';
import {supabase} from '../../services/supabase';
import {useProjectsList} from '../../services/hooks/useProjects';

const {Title, Text} = Typography;

interface RegisterFormValues {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    projectIds?: number[];
}

const Register: React.FC = () => {
    const navigate = useNavigate();
    const signUp = useAuthStore((state) => state.signUp);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm<RegisterFormValues>();

    // Загружаем список проектов
    const {data: projectsData, isLoading: projectsLoading} = useProjectsList();
    const projects = Array.isArray(projectsData) ? projectsData : (projectsData?.data ?? []);

    // Если пользователь уже аутентифицирован, перенаправляем на главную
    useEffect(() => {
        if (isAuthenticated) {
            void navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (values: RegisterFormValues) => {
        setLoading(true);
        try {
            const result = await signUp({
                email: values.email,
                password: values.password,
                fullName: values.fullName,
                projectIds: values.projectIds
            });

            // Проверяем, создана ли сессия (автоматический вход выполнен)
            const {data: {session}} = await supabase.auth.getSession();

            if (session) {
                // Если сессия есть, значит пользователь уже вошел
                message.success('Регистрация успешна! Добро пожаловать!');
                navigate('/dashboard');
            } else {
                // Если сессии нет, требуется подтверждение email
                message.success('Регистрация успешна! Проверьте вашу почту для подтверждения.');
                navigate('/login');
            }
        } catch (error: any) {
            message.error(error.message || 'Ошибка регистрации');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                height: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
            }}
        >
            <Card
                style={{
                    width: '100%',
                    maxWidth: 550,
                    boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)',
                }}
            >
                <Space direction="vertical" size="large" style={{width: '100%'}}>
                    <div style={{textAlign: 'center'}}>
                        <Title level={2} style={{marginBottom: 8}}>
                            Регистрация в PayHub
                        </Title>
                        <Text type="secondary">
                            Создайте аккаунт для начала работы
                        </Text>
                    </div>

                    <Form
                        form={form}
                        name="register"
                        onFinish={handleSubmit}
                        layout="vertical"
                        size="large"
                        requiredMark={false}
                    >
                        <Form.Item
                            name="fullName"
                            label="ФИО"
                            rules={[
                                {required: true, message: 'Пожалуйста, введите ваше ФИО'},
                                {min: 3, message: 'ФИО должно содержать минимум 3 символа'},
                            ]}
                        >
                            <Input
                                prefix={<UserOutlined/>}
                                placeholder="Иванов Иван Иванович"
                                autoComplete="name"
                            />
                        </Form.Item>

                        <Form.Item
                            name="email"
                            label="Email"
                            rules={[
                                {required: true, message: 'Пожалуйста, введите email'},
                                {type: 'email', message: 'Пожалуйста, введите корректный email'},
                            ]}
                        >
                            <Input
                                prefix={<MailOutlined/>}
                                placeholder="email@example.com"
                                autoComplete="email"
                            />
                        </Form.Item>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="password"
                                    label="Пароль"
                                    rules={[
                                        {required: true, message: 'Пожалуйста, введите пароль'},
                                        {min: 6, message: 'Пароль должен содержать минимум 6 символов'},
                                    ]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined/>}
                                        placeholder="Введите пароль"
                                        autoComplete="new-password"
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="confirmPassword"
                                    label="Подтвердите пароль"
                                    dependencies={['password']}
                                    rules={[
                                        {required: true, message: 'Пожалуйста, подтвердите пароль'},
                                        ({getFieldValue}) => ({
                                            validator(_, _value) {
                                                if (!value || getFieldValue('password') === value) {
                                                    return Promise.resolve();
                                                }
                                                return Promise.reject(new Error('Пароли не совпадают'));
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password
                                        prefix={<LockOutlined/>}
                                        placeholder="Повторите пароль"
                                        autoComplete="new-password"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item
                            name="projectIds"
                            label="Проекты"
                            rules={[
                                {required: true, message: 'Пожалуйста, выберите хотя бы один проект'},
                            ]}
                        >
                            <Select
                                mode="multiple"
                                placeholder={projectsLoading ? "Загрузка проектов..." : "Выберите проекты"}
                                suffixIcon={<ProjectOutlined/>}
                                options={projects.map(project => ({
                                    label: project.name,
                                    value: project.id
                                }))}
                                loading={projectsLoading}
                                disabled={projectsLoading}
                                notFoundContent={projectsLoading ? "Загрузка проектов..." : (projects.length === 0 ? "Нет доступных проектов" : null)}
                            />
                        </Form.Item>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                loading={loading}
                                block
                                size="large"
                                icon={<UserAddOutlined/>}
                                style={{
                                    height: '48px',
                                    fontSize: '16px',
                                    fontWeight: 600,
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    border: 'none',
                                    boxShadow: '0 4px 6px rgba(102, 126, 234, 0.4)',
                                }}
                            >
                                Зарегистрироваться
                            </Button>
                        </Form.Item>
                    </Form>

                    <Divider style={{margin: '12px 0'}}>или</Divider>

                    <div style={{textAlign: 'center'}}>
                        <Text>
                            Уже есть аккаунт?{' '}
                            <Link to="/login">
                                Войти
                            </Link>
                        </Text>
                    </div>
                </Space>
            </Card>
        </div>
    );
};

export default Register;