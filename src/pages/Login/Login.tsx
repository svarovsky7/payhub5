import React, {useEffect, useState} from 'react';
import {LoginForm, ProFormText} from '@ant-design/pro-components';
import {LockOutlined, UserOutlined} from '@ant-design/icons';
import {message, Space, Typography} from 'antd';
import {Link, useNavigate} from 'react-router-dom';
import {useAuthStore} from '@/models/auth';

const {Text} = Typography;

const Login: React.FC = () => {
    const navigate = useNavigate();
    const signIn = useAuthStore((state) => state.signIn);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const [loading, setLoading] = useState(false);

    // Если пользователь уже аутентифицирован, перенаправляем на главную
    useEffect(() => {
        if (isAuthenticated) {
            void navigate('/invoices');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (values: { email: string; password: string }) => {
        setLoading(true);
        try {
            await signIn(values.email, values.password);
            message.success('Вход выполнен успешно');
            // Используем window.location.href для полной перезагрузки страницы
            setTimeout(() => {
                window.location.href = '/invoices';
            }, 500);
        } catch (error: any) {
            message.error(error.message || 'Произошла ошибка при входе');
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
            }}
        >
            <LoginForm
                logo="/payhub-logo.svg"
                title="PayHub"
                subTitle="Система управления закупками и платежами"
                onFinish={handleSubmit}
                loading={loading}
                initialValues={{
                    email: '',
                    password: '',
                }}
                actions={
                    <Space direction="vertical" style={{width: '100%', marginTop: 24}}>
                        <Text>
                            Нет аккаунта?{' '}
                            <Link to="/register">Зарегистрироваться</Link>
                        </Text>
                    </Space>
                }
            >
                <ProFormText
                    name="email"
                    fieldProps={{
                        size: 'large',
                        prefix: <UserOutlined/>,
                    }}
                    placeholder="Email"
                    rules={[
                        {
                            required: true,
                            message: 'Введите email',
                        },
                        {
                            type: 'email',
                            message: 'Введите корректный email',
                        },
                    ]}
                />
                <ProFormText.Password
                    name="password"
                    fieldProps={{
                        size: 'large',
                        prefix: <LockOutlined/>,
                    }}
                    placeholder="Пароль"
                    rules={[
                        {
                            required: true,
                            message: 'Введите пароль',
                        },
                    ]}
                />
            </LoginForm>
        </div>
    );
};

export default Login;