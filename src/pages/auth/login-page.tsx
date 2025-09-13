import React, {useState} from 'react'
import {Button, Card, Form, Input, message, theme, Typography} from 'antd'
import {LockOutlined, MailOutlined} from '@ant-design/icons'
import {useNavigate} from 'react-router-dom'

import {useAuth} from '@/models/auth'
import {validationRules} from '@/utils/validation'

const {Title, Text, Link} = Typography

interface LoginForm {
    email: string
    password: string
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate()
    const {signIn, isLoading} = useAuth()
    const {token} = theme.useToken()
    const [form] = Form.useForm<LoginForm>()
    const [isResetMode, setIsResetMode] = useState(false)

    const handleSubmit = async (values: LoginForm) => {
        try {
            await signIn(values.email, values.password)
            message.success('Вход выполнен успешно')
            navigate('/dashboard')
        } catch (error) {
            message.error('Неверный email или пароль')
        }
    }

    const handleForgotPassword = async () => {
        try {
            const email = await form.validateFields(['email'])
            // Здесь будет логика восстановления пароля
            message.info('Инструкции по восстановлению пароля отправлены на email')
            setIsResetMode(false)
        } catch (error) {
            message.error('Введите корректный email')
        }
    }

    return (
        <div
            style={{
                minHeight: '100vh',
                background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimaryBorder} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
            }}
        >
            <Card
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                    borderRadius: '12px',
                    border: 'none',
                }}
                styles={{body: {padding: '40px'}}}
            >
                <div style={{textAlign: 'center', marginBottom: '32px'}}>
                    <Title level={1} style={{color: token.colorPrimary, marginBottom: '8px'}}>
                        PayHub
                    </Title>
                    <Text type="secondary" style={{fontSize: '16px'}}>
                        Система управления закупками и платежами
                    </Text>
                </div>

                <Form
                    form={form}
                    onFinish={handleSubmit}
                    layout="vertical"
                    size="large"
                    autoComplete="off"
                >
                    <Form.Item
                        name="email"
                        label="Email"
                        rules={[validationRules.required, validationRules.email]}
                    >
                        <Input
                            prefix={<MailOutlined/>}
                            placeholder="Введите ваш email"
                            autoComplete="username"
                        />
                    </Form.Item>

                    {!isResetMode && (
                        <Form.Item
                            name="password"
                            label="Пароль"
                            rules={[validationRules.required]}
                        >
                            <Input.Password
                                prefix={<LockOutlined/>}
                                placeholder="Введите ваш пароль"
                                autoComplete="current-password"
                            />
                        </Form.Item>
                    )}

                    <Form.Item style={{marginBottom: '16px'}}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={isLoading}
                            block
                            style={{height: '48px', fontSize: '16px'}}
                        >
                            {isResetMode ? 'Восстановить пароль' : 'Войти в систему'}
                        </Button>
                    </Form.Item>

                    <div style={{textAlign: 'center'}}>
                        {isResetMode ? (<Link onClick={() => void setIsResetMode(false)}>
                                Вернуться к входу
                            </Link>
                        ) : (<Link onClick={() => void setIsResetMode(true)}>
                                Забыли пароль?
                            </Link>
                        )}
                    </div>
                </Form>

                <div
                    style={{
                        marginTop: '24px',
                        padding: '16px',
                        backgroundColor: token.colorBgContainer,
                        borderRadius: '8px',
                        textAlign: 'center',
                    }}
                >
                    <Text type="secondary" style={{fontSize: '12px'}}>
                        Демо-доступ:
                        <br/>
                        Email: admin@example.com
                        <br/>
                        Пароль: password123
                    </Text>
                </div>
            </Card>
        </div>
    )
}

export default LoginPage