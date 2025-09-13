import React from 'react';
import {ProCard, StatisticCard} from '@ant-design/pro-components';
import {Button, Col, Progress, Row, Space, Table, Tag} from 'antd';
import {
    ClockCircleOutlined,
    DollarOutlined,
    FallOutlined,
    FileTextOutlined,
    PlusOutlined,
    RiseOutlined,
} from '@ant-design/icons';
import {useNavigate} from 'react-router-dom';
import dayjs from 'dayjs';
import {formatCurrency} from '@/utils/format';

// Данные будут загружаться из базы данных
const stats = {
    totalInvoices: 0,
    pendingApproval: 0,
    awaitingPayment: 0,
    totalAmount: 0,
    monthlyGrowth: 0,
    overdueInvoices: 0,
};

const recentInvoices: any[] = [];
const recentPayments: any[] = [];

const statusColors: Record<string, string> = {
    draft: 'default',
    in_review: 'processing',
    approved: 'success',
    rejected: 'error',
    paid: 'green',
    partially_paid: 'orange',
    cancelled: 'default',
    completed: 'success',
    processing: 'processing',
    pending: 'warning',
};

const statusTexts: Record<string, string> = {
    draft: 'Черновик',
    in_review: 'На рассмотрении',
    approved: 'Утвержден',
    rejected: 'Отклонен',
    paid: 'Оплачен',
    partially_paid: 'Частично оплачен',
    cancelled: 'Отменен',
    completed: 'Завершен',
    processing: 'В обработке',
    pending: 'Ожидает',
};

const Dashboard: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div>
            {/* Статистика */}
            <ProCard ghost gutter={[16, 16]}>
                <ProCard colSpan={{xs: 24, sm: 12, md: 6}}>
                    <StatisticCard
                        statistic={{
                            title: 'Всего счетов',
                            value: stats.totalInvoices,
                            icon: <FileTextOutlined style={{color: '#1890ff'}}/>,
                        }}
                    />
                </ProCard>

                <ProCard colSpan={{xs: 24, sm: 12, md: 6}}>
                    <StatisticCard
                        statistic={{
                            title: 'На согласовании',
                            value: stats.pendingApproval,
                            icon: <ClockCircleOutlined style={{color: '#faad14'}}/>,
                            description: (
                                <Space>
                                    <span>Требуют внимания</span>
                                    {stats.overdueInvoices > 0 && (
                                        <Tag color="red">{stats.overdueInvoices} просрочено</Tag>
                                    )}
                                </Space>
                            ),
                        }}
                    />
                </ProCard>

                <ProCard colSpan={{xs: 24, sm: 12, md: 6}}>
                    <StatisticCard
                        statistic={{
                            title: 'К оплате',
                            value: stats.awaitingPayment,
                            icon: <DollarOutlined style={{color: '#52c41a'}}/>,
                        }}
                    />
                </ProCard>

                <ProCard colSpan={{xs: 24, sm: 12, md: 6}}>
                    <StatisticCard
                        statistic={{
                            title: 'Общая сумма',
                            value: formatCurrency(stats.totalAmount),
                            icon: stats.monthlyGrowth > 0 ?
                                <RiseOutlined style={{color: '#52c41a'}}/> :
                                <FallOutlined style={{color: '#ff4d4f'}}/>,
                            description: (
                                <Space>
                  <span style={{
                      color: stats.monthlyGrowth > 0 ? '#52c41a' : '#ff4d4f'
                  }}>
                    {stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth}%
                  </span>
                                    <span>за месяц</span>
                                </Space>
                            ),
                        }}
                    />
                </ProCard>
            </ProCard>

            {/* Быстрые действия */}
            <ProCard
                title="Быстрые действия"
                style={{marginTop: 16}}
                ghost
            >
                <Space size="middle">
                    <Button
                        type="primary"
                        icon={<PlusOutlined/>}
                        onClick={() => void navigate('/invoices/create')}
                    >
                        Создать счет
                    </Button>
                    <Button onClick={() => void navigate('/invoices?status=in_review')}>
                        Счета на рассмотрении
                    </Button>
                    <Button onClick={() => void navigate('/payments/pending')}>
                        Платежи к подтверждению
                    </Button>
                    <Button onClick={() => void navigate('/reports')}>
                        Отчеты
                    </Button>
                </Space>
            </ProCard>

            <Row gutter={[16, 16]} style={{marginTop: 16}}>
                {/* Последние счета */}
                <Col xs={24} lg={14}>
                    <ProCard
                        title="Последние счета"
                        extra={
                            <Button type="link" onClick={() => void navigate('/invoices')}>
                                Все счета →
                            </Button>
                        }
                    >
                        <Table
                            dataSource={recentInvoices}
                            columns={[
                                {
                                    title: 'Номер',
                                    dataIndex: 'invoice_number',
                                    key: 'invoice_number',
                                    render: (text, record) => (
                                        <a onClick={() => void navigate(`/invoices/${record.id}`)}>
                                            {text}
                                        </a>
                                    ),
                                },
                                {
                                    title: 'Поставщик',
                                    dataIndex: 'supplier',
                                    key: 'supplier',
                                    ellipsis: true,
                                },
                                {
                                    title: 'Сумма',
                                    dataIndex: 'amount',
                                    key: 'amount',
                                    render: (_value) => formatCurrency(value),
                                    align: 'right',
                                },
                                {
                                    title: 'Статус',
                                    dataIndex: 'status',
                                    key: 'status',
                                    render: (status) => (
                                        <Tag color={statusColors[status]}>
                                            {statusTexts[status]}
                                        </Tag>
                                    ),
                                },
                                {
                                    title: 'Дата',
                                    dataIndex: 'created_at',
                                    key: 'created_at',
                                    render: (date) => dayjs(date).format('DD.MM.YYYY'),
                                },
                            ]}
                            pagination={false}
                            size="small"
                        />
                    </ProCard>
                </Col>

                {/* Последние платежи */}
                <Col xs={24} lg={10}>
                    <ProCard
                        title="Последние платежи"
                        extra={
                            <Button type="link" onClick={() => void navigate('/payments')}>
                                Все платежи →
                            </Button>
                        }
                    >
                        <Table
                            dataSource={recentPayments}
                            columns={[
                                {
                                    title: 'Счет',
                                    dataIndex: 'invoice_number',
                                    key: 'invoice_number',
                                },
                                {
                                    title: 'Сумма',
                                    dataIndex: 'amount',
                                    key: 'amount',
                                    render: (_value) => formatCurrency(value),
                                    align: 'right',
                                },
                                {
                                    title: 'Статус',
                                    dataIndex: 'status',
                                    key: 'status',
                                    render: (status) => (
                                        <Tag color={statusColors[status]}>
                                            {statusTexts[status]}
                                        </Tag>
                                    ),
                                },
                                {
                                    title: 'Дата',
                                    dataIndex: 'payment_date',
                                    key: 'payment_date',
                                    render: (date) => dayjs(date).format('DD.MM'),
                                },
                            ]}
                            pagination={false}
                            size="small"
                        />
                    </ProCard>

                    {/* Прогресс бюджета */}
                    <ProCard title="Использование бюджета" style={{marginTop: 16}}>
                        <Space direction="vertical" style={{width: '100%'}}>
                            <div>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                                    <span>Проект "Новый офис"</span>
                                    <span>75%</span>
                                </div>
                                <Progress percent={75} status="active"/>
                            </div>
                            <div>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                                    <span>Проект "Реконструкция"</span>
                                    <span>45%</span>
                                </div>
                                <Progress percent={45} status="active"/>
                            </div>
                            <div>
                                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 8}}>
                                    <span>Проект "Склад №3"</span>
                                    <span>92%</span>
                                </div>
                                <Progress percent={92} status="exception"/>
                            </div>
                        </Space>
                    </ProCard>
                </Col>
            </Row>
        </div>
    );
};

export default Dashboard;