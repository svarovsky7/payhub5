import React, {useState} from 'react'
import {
    Alert,
    Avatar,
    Badge,
    Button,
    Card,
    Col,
    Input,
    Popconfirm,
    Progress,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Tooltip,
    Typography
} from 'antd'
import {
    CalendarOutlined,
    CheckOutlined,
    ClockCircleOutlined,
    DollarOutlined,
    ExclamationCircleOutlined,
    SearchOutlined,
    StopOutlined,
    WarningOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const {Title, Text} = Typography
const {Option} = Select

interface PendingPayment {
    id: string
    paymentNumber: string
    invoiceNumber: string
    contractor: string
    amount: number
    currency: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    dueDate: string
    createdDate: string
    project: string
    category: string
    description: string
    approvalStatus: 'pending' | 'partial' | 'approved'
    approvers: {
        name: string
        role: string
        status: 'pending' | 'approved' | 'rejected'
        date?: string
    }[]
    requiredBy?: string
    estimatedProcessingTime: number // в часах
}

// Данные будут загружаться из базы данных
const pendingPayments: PendingPayment[] = []

const priorityConfig = {
    low: {color: 'default', text: 'Низкий', urgency: 1},
    medium: {color: 'blue', text: 'Средний', urgency: 2},
    high: {color: 'orange', text: 'Высокий', urgency: 3},
    urgent: {color: 'red', text: 'Срочный', urgency: 4}
}

const approvalStatusConfig = {
    pending: {color: 'orange', text: 'Ожидает', progress: 0},
    partial: {color: 'blue', text: 'Частично', progress: 50},
    approved: {color: 'green', text: 'Одобрен', progress: 100}
}

const PaymentsPendingPage: React.FC = () => {
    const [searchText, setSearchText] = useState('')
    const [priorityFilter, setPriorityFilter] = useState<string>('')
    const [approvalFilter, setApprovalFilter] = useState<string>('')

    const filteredPayments = pendingPayments.filter(payment => {
        const matchesSearch = searchText === '' ||
            payment.contractor.toLowerCase().includes(searchText.toLowerCase()) ||
            payment.paymentNumber.toLowerCase().includes(searchText.toLowerCase()) ||
            payment.invoiceNumber.toLowerCase().includes(searchText.toLowerCase()) ||
            payment.project.toLowerCase().includes(searchText.toLowerCase())

        const matchesPriority = priorityFilter === '' || payment.priority === priorityFilter
        const matchesApproval = approvalFilter === '' || payment.approvalStatus === approvalFilter

        return matchesSearch && matchesPriority && matchesApproval
    })

    // Статистика
    const totalAmount = pendingPayments.reduce((sum, payment) => sum + payment.amount, 0)
    const urgentCount = pendingPayments.filter(p => p.priority === 'urgent').length
    const overdueCount = pendingPayments.filter(p =>
        dayjs(p.dueDate).isBefore(dayjs()) || dayjs(p.dueDate).diff(dayjs(), 'day') <= 1
    ).length
    const readyToPayCount = pendingPayments.filter(p => p.approvalStatus === 'approved').length

    const handleApprove = (paymentId: string) => {
        console.log('Одобрить платеж:', paymentId)
        // Здесь будет логика одобрения
    }

    const handleReject = (paymentId: string) => {
        console.log('Отклонить платеж:', paymentId)
        // Здесь будет логика отклонения
    }

    const handleProcessPayment = (paymentId: string) => {
        console.log('Обработать платеж:', paymentId)
        // Здесь будет логика обработки платежа
    }

    const columns = [
        {
            title: 'Номер платежа',
            dataIndex: 'paymentNumber',
            key: 'paymentNumber',
            render: (text: string, record: PendingPayment) => {
                const isOverdue = dayjs(record.dueDate).isBefore(dayjs())
                const isDueSoon = dayjs(record.dueDate).diff(dayjs(), 'day') <= 1

                return (
                    <Space direction="vertical" size={0}>
                        <Space>
                            <Text strong>{text}</Text>
                            {isOverdue && <Badge status="error"/>}
                            {isDueSoon && !isOverdue && <Badge status="warning"/>}
                        </Space>
                        <Text type="secondary" style={{fontSize: 12}}>
                            Счет: {record.invoiceNumber}
                        </Text>
                    </Space>
                )
            },
        },
        {
            title: 'Контрагент',
            dataIndex: 'contractor',
            key: 'contractor',
            render: (text: string, record: PendingPayment) => (
                <Space>
                    <Avatar size="small" style={{backgroundColor: '#722ed1'}}>
                        {text.charAt(0)}
                    </Avatar>
                    <Space direction="vertical" size={0}>
                        <Text strong>{text}</Text>
                        <Text type="secondary" style={{fontSize: 12}}>
                            {record.project}
                        </Text>
                    </Space>
                </Space>
            ),
        },
        {
            title: 'Сумма',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount: number, record: PendingPayment) => (
                <Text strong>
                    {amount.toLocaleString('ru-RU')} {record.currency}
                </Text>
            ),
            sorter: (a, b) => a.amount - b.amount,
        },
        {
            title: 'Приоритет',
            dataIndex: 'priority',
            key: 'priority',
            render: (priority: keyof typeof priorityConfig) => {
                const config = priorityConfig[priority]
                return (
                    <Tag color={config.color}>
                        {config.text}
                    </Tag>
                )
            },
            sorter: (a, b) => priorityConfig[b.priority].urgency - priorityConfig[a.priority].urgency,
        },
        {
            title: 'Одобрение',
            dataIndex: 'approvalStatus',
            key: 'approvalStatus',
            render: (status: keyof typeof approvalStatusConfig, record: PendingPayment) => {
                const config = approvalStatusConfig[status]
                const approvedCount = record.approvers.filter(a => a.status === 'approved').length
                const totalCount = record.approvers.length
                const progressPercent = (approvedCount / totalCount) * 100

                return (
                    <Space direction="vertical" size={4} style={{width: '100%'}}>
                        <Space>
                            <Tag color={config.color}>{config.text}</Tag>
                            <Text style={{fontSize: 12}}>
                                {approvedCount}/{totalCount}
                            </Text>
                        </Space>
                        <Progress
                            percent={progressPercent}
                            size="small"
                            showInfo={false}
                            strokeColor={config.color === 'green' ? '#52c41a' : config.color === 'blue' ? '#1890ff' : '#faad14'}
                        />
                    </Space>
                )
            },
        },
        {
            title: 'Срок оплаты',
            dataIndex: 'dueDate',
            key: 'dueDate',
            render: (date: string) => {
                const dueDate = dayjs(date)
                const isOverdue = dueDate.isBefore(dayjs())
                const daysDiff = dueDate.diff(dayjs(), 'day')

                return (
                    <Space direction="vertical" size={0}>
                        <Text type={isOverdue ? 'danger' : daysDiff <= 1 ? 'warning' : undefined}>
                            {dueDate.format('DD.MM.YYYY')}
                        </Text>
                        <Text type="secondary" style={{fontSize: 12}}>
                            {isOverdue ? 'Просрочен' : daysDiff === 0 ? 'Сегодня' : daysDiff === 1 ? 'Завтра' : `Через ${daysDiff} дн.`}
                        </Text>
                    </Space>
                )
            },
            sorter: (a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf(),
        },
        {
            title: 'Время обработки',
            dataIndex: 'estimatedProcessingTime',
            key: 'estimatedProcessingTime',
            render: (hours: number) => (
                <Tooltip title="Расчетное время обработки">
                    <Space>
                        <ClockCircleOutlined/>
                        <Text>{hours}ч</Text>
                    </Space>
                </Tooltip>
            ),
        },
        {
            title: 'Действия',
            key: 'actions',
            render: (_, record: PendingPayment) => (<Space direction="vertical" size={4}>
                    <Space>
                        <Button type="link" size="small">
                            Подробнее
                        </Button>
                        {record.approvalStatus === 'pending' || record.approvalStatus === 'partial' ? (
                            <Popconfirm
                                title="Одобрить платеж?"
                                onConfirm={() => handleApprove(record.id)}
                                okText="Да"
                                cancelText="Нет"
                            >
                                <Button type="link" size="small" icon={<CheckOutlined/>}>
                                    Одобрить
                                </Button>
                            </Popconfirm>
                        ) : (<Button
                                type="primary"
                                size="small"
                                icon={<DollarOutlined/>}
                                onClick={() => void handleProcessPayment(record.id)}
                            >
                                Оплатить
                            </Button>
                        )}
                    </Space>
                    {(record.approvalStatus === 'pending' || record.approvalStatus === 'partial') && (<Popconfirm
                            title="Отклонить платеж?"
                            onConfirm={() => handleReject(record.id)}
                            okText="Да"
                            cancelText="Нет"
                        >
                            <Button type="link" size="small" danger icon={<StopOutlined/>}>
                                Отклонить
                            </Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ]

    const expandedRowRender = (record: PendingPayment) => {
        return (
            <div style={{padding: 16}}>
                <Row gutter={16}>
                    <Col span={12}>
                        <Card size="small" title="Описание">
                            <Text>{record.description}</Text>
                            {record.requiredBy && (
                                <>
                                    <br/>
                                    <Text type="secondary">Необходимо для: {record.requiredBy}</Text>
                                </>
                            )}
                        </Card>
                    </Col>
                    <Col span={12}>
                        <Card size="small" title="Процесс одобрения">
                            <Space direction="vertical" style={{width: '100%'}}>
                                {record.approvers.map((approver, index) => (
                                    <div key={index} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}>
                                        <Space>
                                            <Avatar size="small">
                                                {approver.name.split(' ').map(n => n.charAt(0)).join('')}
                                            </Avatar>
                                            <div>
                                                <Text strong>{approver.name}</Text>
                                                <br/>
                                                <Text type="secondary" style={{fontSize: 12}}>{approver.role}</Text>
                                            </div>
                                        </Space>
                                        <Space direction="vertical" align="end" size={0}>
                                            <Tag
                                                color={approver.status === 'approved' ? 'green' : approver.status === 'rejected' ? 'red' : 'orange'}
                                            >
                                                {approver.status === 'approved' ? 'Одобрено' : approver.status === 'rejected' ? 'Отклонено' : 'Ожидает'}
                                            </Tag>
                                            {approver.date && (
                                                <Text type="secondary" style={{fontSize: 11}}>
                                                    {dayjs(approver.date).format('DD.MM.YY HH:mm')}
                                                </Text>
                                            )}
                                        </Space>
                                    </div>
                                ))}
                            </Space>
                        </Card>
                    </Col>
                </Row>
            </div>
        )
    }

    return (
        <div style={{padding: 24}}>
            <div style={{marginBottom: 24}}>
                <Title level={2} style={{margin: 0}}>
                    <ClockCircleOutlined style={{marginRight: 8}}/>
                    Ожидающие платежи
                </Title>
                <Text type="secondary">Платежи, ожидающие одобрения и обработки</Text>
            </div>

            {/* Предупреждения */}
            {urgentCount > 0 && (
                <Alert
                    message={`${urgentCount} срочных платежей требуют немедленного внимания`}
                    type="error"
                    showIcon
                    icon={<ExclamationCircleOutlined/>}
                    style={{marginBottom: 16}}
                    action={
                        <Button size="small" type="text">
                            Показать срочные
                        </Button>
                    }
                />
            )}

            {overdueCount > 0 && (
                <Alert
                    message={`${overdueCount} платежей просрочены или истекают сегодня`}
                    type="warning"
                    showIcon
                    icon={<WarningOutlined/>}
                    style={{marginBottom: 16}}
                    action={
                        <Button size="small" type="text">
                            Показать просроченные
                        </Button>
                    }
                />
            )}

            {/* Статистика */}
            <Row gutter={16} style={{marginBottom: 24}}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Общая сумма"
                            value={totalAmount}
                            precision={0}
                            valueStyle={{color: '#faad14'}}
                            prefix={<DollarOutlined/>}
                            suffix="₽"
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Срочных платежей"
                            value={urgentCount}
                            valueStyle={{color: '#ff4d4f'}}
                            prefix={<ExclamationCircleOutlined/>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Просроченных"
                            value={overdueCount}
                            valueStyle={{color: '#ff7a45'}}
                            prefix={<WarningOutlined/>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Готовы к оплате"
                            value={readyToPayCount}
                            valueStyle={{color: '#52c41a'}}
                            prefix={<CheckOutlined/>}
                        />
                    </Card>
                </Col>
            </Row>

            {/* Фильтры */}
            <Card style={{marginBottom: 16}}>
                <Row gutter={16}>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Input
                            placeholder="Поиск платежей..."
                            prefix={<SearchOutlined/>}
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Select
                            placeholder="Приоритет"
                            style={{width: '100%'}}
                            value={priorityFilter ?? undefined}
                            onChange={(value) => setPriorityFilter(value)}
                            allowClear
                        >
                            <Option value="urgent">Срочный</Option>
                            <Option value="high">Высокий</Option>
                            <Option value="medium">Средний</Option>
                            <Option value="low">Низкий</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={8} lg={6}>
                        <Select
                            placeholder="Статус одобрения"
                            style={{width: '100%'}}
                            value={approvalFilter ?? undefined}
                            onChange={(value) => setApprovalFilter(value)}
                            allowClear
                        >
                            <Option value="pending">Ожидает</Option>
                            <Option value="partial">Частично одобрен</Option>
                            <Option value="approved">Одобрен</Option>
                        </Select>
                    </Col>
                </Row>
            </Card>

            {/* Таблица */}
            <Card>
                <Table
                    columns={columns}
                    dataSource={filteredPayments}
                    rowKey="id"
                    expandable={{
                        expandedRowRender,
                        expandRowByClick: true,
                    }}
                    pagination={{
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total, range) =>
                            `${range[0]}-${range[1]} из ${total} ожидающих платежей`,
                    }}
                    scroll={{x: 1400}}
                    rowClassName={(record) => {
                        if (record.priority === 'urgent') {
                            return 'urgent-row'
                        }
                        if (dayjs(record.dueDate).isBefore(dayjs())) {
                            return 'overdue-row'
                        }
                        return ''
                    }}
                />
            </Card>

            <style>{`
        .urgent-row {
          background-color: #fff2f0;
        }
        .overdue-row {
          background-color: #fff7e6;
        }
      `}</style>
        </div>
    )
}

export default PaymentsPendingPage