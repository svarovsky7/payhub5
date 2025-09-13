import React from 'react'
import {Button, Card, Col, Row, Space, Spin, Statistic, Typography} from 'antd'
import {
    ArrowDownOutlined,
    ArrowUpOutlined,
    CreditCardOutlined,
    ProjectOutlined,
    ShoppingCartOutlined,
    TeamOutlined,
} from '@ant-design/icons'
import {useNavigate} from 'react-router-dom'

import {PageHeader} from '@/components/ui/page-header'
import {formatCurrency, formatNumber} from '@/utils/format'
import {useDashboardStats} from '@/services/hooks/useDashboard'

const {Title, Text} = Typography

const DashboardPage: React.FC = () => {
    const navigate = useNavigate()

    // Load optimized dashboard statistics
    const {data: dashboardStats, isLoading} = useDashboardStats()

    // Calculate statistics from optimized data
    const stats = React.useMemo(() => {
        if (!dashboardStats) {
            return {
                totalBudget: 0,
                spentAmount: 0,
                pendingRequests: 0,
                draftInvoices: 0,
                activeProjects: 0,
                approvedPayments: 0,
                totalVendors: 0,
                savingsPercent: 0
            }
        }

        const totalBudget = dashboardStats.projects.totalBudget || 5250000
        const spentAmount = dashboardStats.invoices.paidAmount || 0
        const savingsPercent = totalBudget > 0 ? ((totalBudget - spentAmount) / totalBudget * 100) : 0

        return {
            totalBudget,
            spentAmount,
            pendingRequests: dashboardStats.invoices.pending,
            draftInvoices: dashboardStats.invoices.draft,
            activeProjects: dashboardStats.projects.active,
            approvedPayments: dashboardStats.payments.confirmed,
            totalVendors: dashboardStats.contractors.active,
            savingsPercent: Math.max(0, Math.min(100, savingsPercent))
        }
    }, [dashboardStats])

    const budgetUsedPercent = stats.totalBudget > 0
        ? (stats.spentAmount / stats.totalBudget) * 100
        : 0

    if (isLoading) {
        return (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh'}}>
                <Spin size="large"/>
            </div>
        )
    }

    return (<div>
            <PageHeader
                title="Панель управления"
                subtitle="Обзор финансовых показателей и активности системы"
            />

            {/* Основные метрики */}
            <Row gutter={[16, 16]} style={{marginBottom: 24}}>
                <Col xs={24} sm={12} lg={6}>
                    <Card hoverable onClick={() => void navigate('/projects')}>
                        <Statistic
                            title="Общий бюджет"
                            value={stats.totalBudget}
                            formatter={(value) => formatCurrency(value as number)}
                            prefix={<CreditCardOutlined style={{color: '#52c41a'}}/>}
                        />
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card hoverable onClick={() => void navigate('/invoices')}>
                        <Statistic
                            title="Потрачено"
                            value={stats.spentAmount}
                            formatter={(value) => formatCurrency(value as number)}
                            prefix={<ArrowUpOutlined style={{color: '#faad14'}}/>}
                        />
                        <Text type="secondary" style={{fontSize: '12px'}}>
                            {budgetUsedPercent.toFixed(1)}% от бюджета
                        </Text>
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card hoverable onClick={() => void navigate('/invoices')}>
                        <Statistic
                            title="Заявки на рассмотрении"
                            value={stats.pendingRequests}
                            formatter={formatNumber}
                            prefix={<ShoppingCartOutlined style={{color: '#1890ff'}}/>}
                        />
                        {stats.draftInvoices > 0 && (
                            <Text type="secondary" style={{fontSize: '12px'}}>
                                +{stats.draftInvoices} черновиков
                            </Text>
                        )}
                    </Card>
                </Col>

                <Col xs={24} sm={12} lg={6}>
                    <Card hoverable onClick={() => void navigate('/projects')}>
                        <Statistic
                            title="Активные проекты"
                            value={stats.activeProjects}
                            formatter={formatNumber}
                            prefix={<ProjectOutlined style={{color: '#722ed1'}}/>}
                        />
                        <Text type="secondary" style={{fontSize: '12px'}}>
                            Всего: {dashboardStats?.projects.total || 0}
                        </Text>
                    </Card>
                </Col>
            </Row>

            {/* Дополнительные показатели */}
            <Row gutter={[16, 16]} style={{marginBottom: 24}}>
                <Col xs={24} md={8}>
                    <Card hoverable onClick={() => void navigate('/payments')}>
                        <Statistic
                            title="Одобренные платежи"
                            value={stats.approvedPayments}
                            formatter={formatNumber}
                            prefix={<ArrowUpOutlined style={{color: '#52c41a'}}/>}
                            suffix="шт"
                        />
                        <Text type="secondary" style={{fontSize: '12px'}}>
                            Всего платежей: {dashboardStats?.payments.total || 0}
                        </Text>
                    </Card>
                </Col>

                <Col xs={24} md={8}>
                    <Card hoverable onClick={() => void navigate('/contractors')}>
                        <Statistic
                            title="Поставщики"
                            value={stats.totalVendors}
                            formatter={formatNumber}
                            prefix={<TeamOutlined style={{color: '#fa8c16'}}/>}
                            suffix="компаний"
                        />
                        <Text type="secondary" style={{fontSize: '12px'}}>
                            Активные контрагенты
                        </Text>
                    </Card>
                </Col>

                <Col xs={24} md={8}>
                    <Card>
                        <Statistic
                            title="Экономия"
                            value={stats.savingsPercent}
                            precision={1}
                            prefix={<ArrowDownOutlined style={{color: '#52c41a'}}/>}
                            suffix="%"
                        />
                        <Text type="secondary" style={{fontSize: '12px'}}>
                            От планового бюджета
                        </Text>
                    </Card>
                </Col>
            </Row>

            {/* Быстрые действия */}
            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title="Быстрые действия" size="small">
                        <Space direction="vertical" style={{width: '100%'}}>
                            <Button
                                type="primary"
                                block
                                icon={<ShoppingCartOutlined/>}
                                onClick={() => void navigate('/invoices/create')}
                            >
                                Создать заявку на закупку
                            </Button>
                            <Button
                                block
                                icon={<CreditCardOutlined/>}
                                onClick={() => void navigate('/payments/create')}
                            >
                                Добавить счет к оплате
                            </Button>
                            <Button
                                block
                                icon={<ProjectOutlined/>}
                                onClick={() => void navigate('/projects/create')}
                            >
                                Создать новый проект
                            </Button>
                            <Button
                                block
                                icon={<TeamOutlined/>}
                                onClick={() => void navigate('/contractors/create')}
                            >
                                Добавить поставщика
                            </Button>
                        </Space>
                    </Card>
                </Col>

                <Col xs={24} lg={12}>
                    <Card title="Уведомления" size="small">
                        <Space direction="vertical" style={{width: '100%'}}>
                            {stats.pendingRequests > 0 ? (
                                <>
                                    <Text type="warning">
                                        У вас {stats.pendingRequests} заявок ожидают рассмотрения
                                    </Text>
                                    {stats.draftInvoices > 0 && (
                                        <Text>
                                            {stats.draftInvoices} черновиков требуют завершения
                                        </Text>
                                    )}
                                </>
                            ) : (
                                <Text type="secondary">Новых уведомлений нет</Text>
                            )}
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    )
}

export default DashboardPage