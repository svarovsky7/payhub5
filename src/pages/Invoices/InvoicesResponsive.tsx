/**
 * Invoices page with responsive table
 */

import React, {useState} from 'react'
import {
    Button,
    Card,
    Col,
    Dropdown,
    message,
    Modal,
    Row,
    Space,
    Typography
} from 'antd'
import {
    CopyOutlined,
    DeleteOutlined,
    EditOutlined,
    ExportOutlined,
    EyeOutlined,
    FileTextOutlined,
    MoreOutlined,
    PlusOutlined,
    ReloadOutlined,
    SendOutlined
} from '@ant-design/icons'
import {useNavigate} from 'react-router-dom'

import {
    useCloneInvoice,
    useDeleteInvoice,
    useInvoiceExport,
    useInvoicesList
} from '../../services/hooks/useInvoices'
import {type InvoiceWithRelations} from '../../services/invoices/crud'
import {type InvoiceFilters} from '../../services/invoices/queries'
import {ResponsiveTable} from '../../components/table/ResponsiveTable'
import type {ResponsiveTableColumn} from '../../components/table/ResponsiveTable'
import {FilterPanel} from '../../components/FilterPanel'
import type {FilterField} from '../../components/table'
import {DateCell, LinkCell, MoneyCell, StatusCell, UserCell} from '../../components/table/TableCells'

const {Title} = Typography

interface InvoicesPageProps {
    companyId: string
}

export const InvoicesPageResponsive: React.FC<InvoicesPageProps> = ({companyId = '1'}) => {
    const navigate = useNavigate()
    const [filters, setFilters] = useState<InvoiceFilters>({})
    const [pagination, setPagination] = useState({page: 1, limit: 50})
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

    // Use real data from database
    const {data: invoicesData, isLoading, refetch} = useInvoicesList(
        companyId,
        filters,
        pagination
    )

    // Mutations
    const deleteInvoiceMutation = useDeleteInvoice()
    const cloneInvoiceMutation = useCloneInvoice()
    const exportMutation = useInvoiceExport()

    const handleView = (record: InvoiceWithRelations) => {
        navigate(`/invoices/${record.id}`)
    }

    const handleEdit = (record: InvoiceWithRelations) => {
        navigate(`/invoices/${record.id}/edit`)
    }

    const handleDelete = async (record: InvoiceWithRelations) => {
        try {
            await deleteInvoiceMutation.mutateAsync({
                id: record.id,
                companyId
            })
            void refetch()
        } catch (error) {
            console.error('Delete error:', error)
        }
    }

    const handleClone = async (record: InvoiceWithRelations) => {
        try {
            const cloned = await cloneInvoiceMutation.mutateAsync({
                id: record.id,
                companyId
            })
            message.success('Счет скопирован')
            navigate(`/invoices/${cloned.id}/edit`)
        } catch (error) {
            console.error('Clone error:', error)
        }
    }

    const handleExport = async () => {
        try {
            await exportMutation.mutateAsync({
                filters: filters,
                filename: 'invoices'
            })
        } catch (error) {
            console.error('Export error:', error)
        }
    }

    // Get actions menu for each record
    const getActionsMenuItems = (record: InvoiceWithRelations) => {
        const items = [
            {
                key: 'view',
                icon: <EyeOutlined/>,
                label: 'Просмотр',
                onClick: () => handleView(record),
            },
            {
                key: 'edit',
                icon: <EditOutlined/>,
                label: 'Редактировать',
                disabled: !['draft', 'rejected'].includes(record.status),
                onClick: () => handleEdit(record),
            },
            {
                key: 'clone',
                icon: <CopyOutlined/>,
                label: 'Копировать',
                onClick: () => handleClone(record),
            },
            {type: 'divider' as const},
        ]

        if (record.status === 'draft') {
            items.push({
                key: 'submit',
                icon: <SendOutlined/>,
                label: 'Отправить на согласование',
                onClick: () => message.info('Функция будет реализована')
            })
        }

        if (record.status === 'approved') {
            items.push({
                key: 'create-payment',
                icon: <FileTextOutlined/>,
                label: 'Создать платеж',
                onClick: () => message.info('Функция будет реализована')
            })
        }

        items.push({type: 'divider' as const}, {
                key: 'delete',
                icon: <DeleteOutlined/>,
                label: 'Удалить',
                danger: true,
                disabled: record.status !== 'draft',
                onClick: () => {
                    Modal.confirm({
                        title: 'Удалить счет?',
                        content: 'Это действие нельзя отменить',
                        okText: 'Да',
                        cancelText: 'Нет',
                        onOk: () => handleDelete(record)
                    })
                },
            }
        )

        return items
    }

    const columns: ResponsiveTableColumn<InvoiceWithRelations>[] = [
        {
            title: '№',
            dataIndex: 'invoice_number',
            key: 'invoice_number',
            priority: 1,
            render: (text, record) => (<LinkCell
                    text={text}
                    onClick={() => void handleView(record)}
                />
            ),
        },
        {
            title: 'Дата',
            dataIndex: 'invoice_date',
            key: 'invoice_date',
            priority: 2,
            sorter: true,
            render: (text) => (
                <DateCell date={text} format="DD.MM.YY"/>
            ),
        },
        {
            title: 'Поставщик',
            dataIndex: ['contractor', 'name'],
            key: 'contractor_name',
            priority: 4,
            ellipsis: true,
            render: (text, record) => record.contractor?.name || '—',
        },
        {
            title: 'Проект',
            dataIndex: ['project', 'name'],
            key: 'project_name',
            priority: 5,
            ellipsis: true,
            render: (text, record) => record.project?.name || '—',
        },
        {
            title: 'Сумма без НДС',
            dataIndex: 'amount_net',
            key: 'amount_net',
            align: 'right',
            priority: 6,
            sorter: true,
            render: (text, record) => (
                <MoneyCell amount={text} currency={record.currency}/>
            ),
        },
        {
            title: 'НДС',
            dataIndex: 'vat_amount',
            key: 'vat_amount',
            align: 'right',
            render: (text, record) => (
                <MoneyCell
                    amount={text}
                    currency={record.currency}
                    type="secondary"
                />
            ),
        },
        {
            title: 'Итого',
            dataIndex: 'total_amount',
            key: 'total_amount',
            align: 'right',
            priority: 7,
            sorter: true,
            render: (text, record) => (
                <MoneyCell
                    amount={text}
                    currency={record.currency}
                    strong
                />
            ),
        },
        {
            title: 'Статус',
            dataIndex: 'status',
            key: 'status',
            priority: 8,
            render: (text) => <StatusCell status={text} type="invoice"/>,
        },
        {
            title: 'Баланс',
            key: 'balance',
            align: 'right',
            render: (_, record) => {
                const paidAmount = record.paid_amount || 0
                const balance = record.total_amount - paidAmount
                return (
                    <MoneyCell
                        amount={balance}
                        currency={record.currency}
                        type={balance > 0 ? 'warning' : balance < 0 ? 'danger' : 'success'}
                    />
                )
            },
        },
        {
            title: 'Срок оплаты',
            dataIndex: 'payment_due_date',
            key: 'payment_due_date',
            render: (text) => {
                if (!text) {
                    return '—'
                }
                return (
                    <DateCell
                        date={text}
                        format="DD.MM.YY"
                        highlightOverdue
                    />
                )
            },
        },
        {
            title: 'Создатель',
            dataIndex: ['creator', 'name'],
            key: 'creator_name',
            render: (text, record) => {
                if (!record.creator) {
                    return '—'
                }
                return (
                    <UserCell
                        user={{
                            name: record.creator.name,
                            email: record.creator.email,
                            position: record.creator.position
                        }}
                        showPosition
                    />
                )
            },
        },
        {
            title: 'Действия',
            key: 'actions',
            render: (_, record) => (
                <Dropdown menu={{items: getActionsMenuItems(record)}} trigger={['click']}>
                    <Button
                        type="text"
                        size="small"
                        icon={<MoreOutlined/>}
                    />
                </Dropdown>
            ),
        },
    ]

    const filterFields: FilterField[] = [
        {
            key: 'search',
            type: 'text',
            label: 'Поиск',
            placeholder: 'Номер, поставщик...'
        },
        {
            key: 'status',
            type: 'multiSelect',
            label: 'Статус',
            options: [
                {value: 'draft', label: 'Черновик'},
                {value: 'pending', label: 'На согласовании'},
                {value: 'approved', label: 'Согласован'},
                {value: 'paid', label: 'Оплачен'},
                {value: 'rejected', label: 'Отклонен'},
                {value: 'cancelled', label: 'Отменен'},
            ],
        },
        {
            key: 'date_range',
            type: 'dateRange',
            label: 'Период создания',
        },
        {
            key: 'amount_range',
            type: 'numberRange',
            label: 'Сумма',
        },
    ]

    return (<div style={{padding: '24px'}}>
            {/* Header */}
            <Row gutter={[16, 16]} align="middle" style={{marginBottom: 24}}>
                <Col flex="auto">
                    <Title level={2} style={{margin: 0}}>Счета на оплату</Title>
                    <Typography.Text type="secondary">
                        Всего счетов: {invoicesData?.total || 0}
                    </Typography.Text>
                </Col>
                <Col>
                    <Space>
                        <Button
                            icon={<ExportOutlined/>}
                            onClick={() => void handleExport()}
                            loading={exportMutation.isLoading}
                        >
                            Экспорт
                        </Button>
                        <Button
                            icon={<ReloadOutlined/>}
                            onClick={() => void refetch()}
                            loading={isLoading}
                        >
                            Обновить
                        </Button>
                        <Button
                            type="primary"
                            icon={<PlusOutlined/>}
                            onClick={() => void navigate('/invoices/create')}
                        >
                            Создать счет
                        </Button>
                    </Space>
                </Col>
            </Row>

            {/* Filters */}
            {filterFields.length > 0 && (<Card style={{marginBottom: 16}}>
                    <FilterPanel
                        fields={filterFields}
                        value={filters}
                        onChange={(newFilters) => {
                            setFilters(newFilters)
                            setPagination({page: 1, limit: 50})
                        }}
                        onSearch={(newFilters) => {
                            setFilters(newFilters)
                            setPagination({page: 1, limit: 50})
                        }}
                        onClear={() => {
                            setFilters({})
                            setPagination({page: 1, limit: 50})
                        }}
                        collapsible
                        defaultCollapsed
                    />
                </Card>
            )}

            {/* Table */}
            <ResponsiveTable<InvoiceWithRelations>
                dataSource={invoicesData?.data ?? []}
                columns={columns}
                loading={isLoading}
                rowKey="id"
                rowSelection={{
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                }}
                pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: invoicesData?.total || 0,
                    onChange: (page, pageSize) => {
                        setPagination({page, limit: pageSize || 20})
                    },
                }}
                responsive
            />
        </div>
    )
}

export default InvoicesPageResponsive