/**
 * Invoices page with ProTable and filters
 */

import React, {useEffect, useMemo, useState} from 'react'
import {
    Button,
    message,
    Modal,
    Space
} from 'antd'
import {
    CloseCircleOutlined,
    DeleteOutlined,
    ExportOutlined,
    EyeOutlined,
    PlusOutlined,
    SendOutlined
} from '@ant-design/icons'
import {useNavigate} from 'react-router-dom'
import { calculateDeliveryDate } from '../InvoiceCreate/utils/calculations'

import {
    useDeleteInvoice,
    useInvoiceExport,
    useInvoicesList
} from '../../services/hooks/useInvoices'
import {useAuthStore} from '../../models/auth'
import {type InvoiceWithRelations} from '../../services/invoices/crud'
import {type InvoiceFilters} from '../../services/invoices/queries'
import {DataTable} from '../../components/table'
import type {BulkAction, DataTableColumn, FilterField} from '../../components/table'
import {DateCell, LinkCell, MoneyCell, StatusCell} from '../../components/table/TableCells'


interface InvoicesPageProps {
    companyId: string
}

export const InvoicesPage: React.FC<InvoicesPageProps> = ({companyId = '1'}) => {
    const navigate = useNavigate()
    const {profile} = useAuthStore()
    const [createModalVisible, setCreateModalVisible] = useState(false)
    const [filters, setFilters] = useState<InvoiceFilters>({})
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'desc' as 'asc' | 'desc'
    })
    const [invoicePayments, setInvoicePayments] = useState<Record<string, boolean>>({}) // Хранит информацию о наличии платежей для каждого счета

    // Подготавливаем фильтры с учетом прав пользователя
    const enhancedFilters = useMemo(() => {
        const baseFilters = {...filters}

        console.log('[InvoicesPage] Profile:', profile)
        console.log('[InvoicesPage] Role:', profile?.roles)
        console.log('[InvoicesPage] view_own_project_only:', profile?.roles?.view_own_project_only)
        console.log('[InvoicesPage] project_ids:', profile?.project_ids)

        // Если у пользователя есть ограничение по проектам
        if (profile?.roles?.view_own_project_only && profile?.project_ids && profile.project_ids.length > 0) {
            console.log('[InvoicesPage] Применяется фильтрация по проектам пользователя')
            baseFilters.viewOwnProjectsOnly = true
            // Убедимся, что project_ids - это массив чисел
            baseFilters.userProjectIds = Array.isArray(profile.project_ids)
                ? profile.project_ids.map(id => typeof id === 'string' ? parseInt(id) : id)
                : []
            console.log('[InvoicesPage] userProjectIds после преобразования:', baseFilters.userProjectIds)
        }

        return baseFilters
    }, [filters, profile])

    // Use real data from database
    const {data: invoicesData, isLoading, refetch} = useInvoicesList(
        companyId,
        enhancedFilters,
        pagination
    )

    console.log('[InvoicesPage] Current pagination:', pagination)

    // Добавляем логирование для отладки
    console.log('[InvoicesPage] invoicesData:', invoicesData)
    console.log('[InvoicesPage] isLoading:', isLoading)
    console.log('[InvoicesPage] dataSource:', invoicesData?.data)
    console.log('[InvoicesPage] total:', invoicesData?.total)

    // Загружаем информацию о платежах для всех счетов
    useEffect(() => {
        const checkPaymentsForInvoices = async () => {
            if (!invoicesData?.data || invoicesData.data.length === 0) {return}

            console.log('[InvoicesPage] Проверка наличия платежей для счетов')

            const { supabase } = await import('../../services/supabase')
            const paymentsMap: Record<string, boolean> = {}

            // Получаем все invoice_id которые имеют платежи
            const invoiceIds = invoicesData.data.map(inv => inv.id)
            const { data: payments, error } = await supabase
                .from('payments')
                .select('invoice_id')
                .in('invoice_id', invoiceIds)

            if (!error && payments) {
                // Создаем Set для быстрой проверки
                const invoicesWithPayments = new Set(payments.map(p => p.invoice_id))

                // Заполняем карту для каждого счета
                invoiceIds.forEach(id => {
                    paymentsMap[id] = invoicesWithPayments.has(id)
                })

                console.log('[InvoicesPage] Счета с платежами:', paymentsMap)
                setInvoicePayments(paymentsMap)
            }
        }

        checkPaymentsForInvoices()
    }, [invoicesData?.data])

    // Mutations
    const deleteInvoiceMutation = useDeleteInvoice()
    const exportMutation = useInvoiceExport()

    const handleView = (record: InvoiceWithRelations) => {
        navigate(`/invoices/${record.id}`)
    }

    const handleEdit = (record: InvoiceWithRelations) => {
        navigate(`/invoices/${record.id}/edit`)
    }

    const handleDelete = async (record: InvoiceWithRelations) => {
        console.log('[InvoicesPage.handleDelete] Проверка возможности удаления счета:', record.id)

        // Сначала проверяем наличие платежей
        try {
            // Загружаем платежи для этого счета
            const { supabase } = await import('../../services/supabase')
            const { data: payments, error } = await supabase
                .from('payments')
                .select('id')
                .eq('invoice_id', record.id)
                .limit(1)

            if (error) {
                console.error('[InvoicesPage.handleDelete] Ошибка проверки платежей:', error)
                message.error('Ошибка при проверке платежей')
                return
            }

            // Если есть платежи, не разрешаем удалить
            if (payments && payments.length > 0) {
                console.log('[InvoicesPage.handleDelete] Счет имеет платежи, удаление запрещено')
                Modal.warning({
                    title: 'Невозможно удалить счет',
                    content: 'Счет нельзя удалить, так как к нему привязаны платежи. Сначала удалите все платежи.',
                    okText: 'Понятно'
                })
                return
            }

            // Если платежей нет, спрашиваем подтверждение
            Modal.confirm({
                title: 'Удалить счет?',
                content: `Вы уверены, что хотите удалить счет ${record.invoice_number}?`,
                okText: 'Да, удалить',
                cancelText: 'Отмена',
                okButtonProps: {danger: true},
                onOk: async () => {
                    try {
                        console.log('[InvoicesPage.handleDelete] Удаление счета:', record.id)
                        await deleteInvoiceMutation.mutateAsync({
                            id: record.id,
                            companyId
                        })
                        message.success('Счет успешно удален')
                        void refetch()
                    } catch (error) {
                        console.error('[InvoicesPage.handleDelete] Ошибка удаления:', error)
                        message.error('Ошибка при удалении счета')
                    }
                }
            })
        } catch (error) {
            console.error('[InvoicesPage.handleDelete] Ошибка:', error)
            message.error('Произошла ошибка при проверке возможности удаления')
        }
    }

    const handleCancel = async (record: InvoiceWithRelations) => {
        Modal.confirm({
            title: 'Отменить счет?',
            content: 'Это действие нельзя отменить',
            okText: 'Да',
            cancelText: 'Нет',
            onOk: async () => {
                try {
                    // TODO: Implement cancel invoice
                    message.info('Отмена счета будет реализована')
                } catch (error) {
                    console.error('Cancel error:', error)
                }
            }
        })
    }

    const handleExport = async (exportFilters?: any) => {
        try {
            await exportMutation.mutateAsync({
                filters: exportFilters ?? filters,
                filename: 'invoices'
            })
        } catch (error) {
            console.error('Export error:', error)
        }
    }


    const columns: DataTableColumn<InvoiceWithRelations>[] = [
        {
            title: 'Внутренний №',
            dataIndex: 'internal_number',
            key: 'internal_number',
            width: 160,
            fixed: 'left',
            priority: 1,
            exportable: true,
            sorter: true,
            responsive: ['lg', 'md', 'sm', 'xs'],
            render: (text, record) => {
                if (!text) {
                    return '—'
                }

                // Проверяем разные форматы внутренних номеров
                let firstLine = '';
                let secondLine = '';

                // Формат с INV: PLT-CTB2-STM4567-INV-2509-003
                if (text.includes('-INV-')) {
                    const parts = text.split('-INV-')
                    firstLine = parts[0]
                    secondLine = 'INV-' + parts[1]
                }
                // Формат с MTRL или другими 4-буквенными кодами: MGS-PRM2-GLS3332-MTRL-2509-7630
                else if (text.match(/^(.+)-([A-Z]{4}-\d{4}-\d{4})$/)) {
                    const match = text.match(/^(.+)-([A-Z]{4}-\d{4}-\d{4})$/)
                    if (match) {
                        firstLine = match[1]
                        secondLine = match[2]
                    }
                }
                // Общий формат: разбиваем по последнему дефису перед 4 цифрами
                else {
                    const match = text.match(/^(.+)-(\d{4}-\d{4})$/)
                    if (match) {
                        firstLine = match[1]
                        secondLine = match[2]
                    } else {
                        // Если не подходит ни один формат, пробуем разбить по середине
                        const middle = Math.ceil(text.length / 2)
                        const lastDash = text.lastIndexOf('-', middle)
                        if (lastDash > 0) {
                            firstLine = text.substring(0, lastDash)
                            secondLine = text.substring(lastDash + 1)
                        } else {
                            // Если нет дефиса, показываем как есть
                            return (<LinkCell
                                    text={text}
                                    onClick={() => void handleView(record)}
                                />
                            )
                        }
                    }
                }

                return (<div
                        style={{cursor: 'pointer', fontSize: '12px', lineHeight: '1.3'}}
                        onClick={() => void handleView(record)}
                    >
                        <div>{firstLine}</div>
                        <div style={{color: '#1890ff'}}>{secondLine}</div>
                    </div>
                )
            },
        },
        {
            title: '№ счета',
            dataIndex: 'invoice_number',
            key: 'invoice_number',
            width: 100,
            priority: 2,
            exportable: true,
            sorter: true,
            responsive: ['lg', 'md'],
            render: (text) => text || '—',
        },
        {
            title: 'Дата',
            dataIndex: 'invoice_date',
            key: 'invoice_date',
            width: 90,
            priority: 3,
            exportable: true,
            responsive: ['lg', 'md'],
            sorter: true,
            render: (text) => (
                <DateCell date={text} format="DD.MM.YY"/>
            ),
        },
        {
            title: 'Поставщик',
            dataIndex: ['supplier', 'name'],
            key: 'supplier_name',
            width: 180,
            priority: 4,
            exportable: true,
            sorter: true,
            responsive: ['lg', 'md', 'sm'],
            ellipsis: true,
            render: (text, record) => {
                console.log('[InvoicesPage] Supplier data:', record.supplier)
                return record.supplier?.name || '—'
            },
        },
        {
            title: 'Проект',
            dataIndex: ['project', 'name'],
            key: 'project_name',
            width: 140,
            priority: 5,
            exportable: true,
            sorter: true,
            responsive: ['lg'],
            ellipsis: true,
            render: (text, record) => record.project?.name || '—',
        },
        {
            title: 'Итого',
            dataIndex: 'total_amount',
            key: 'total_amount',
            width: 120,
            align: 'right',
            priority: 2,
            exportable: true,
            responsive: ['lg', 'md', 'sm', 'xs'],
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
            width: 100,
            priority: 3,
            exportable: true,
            sorter: true,
            responsive: ['lg', 'md', 'sm', 'xs'],
            render: (text) => <StatusCell status={text} type="invoice"/>,
},
        {
            title: 'Предварительная дата поставки',
            dataIndex: 'delivery_date',
            key: 'delivery_date',
            width: 140,
            priority: 8,
            exportable: true,
            sorter: true,
            responsive: ['lg'],
            render: (text, record) => {
                // Calculate delivery date if we have delivery_days
                if (record.delivery_days && record.delivery_days > 0) {
                    // Use the proper calculation function that considers delivery_days_type
                    const deliveryDaysType = record.delivery_days_type || 'calendar'
                    const calculatedDate = calculateDeliveryDate(record.delivery_days, deliveryDaysType)

                    if (calculatedDate) {
                        // Determine the days type label
                        const daysTypeLabel = deliveryDaysType === 'working' ? 'р.д.' : 'к.д.'

                        return (
                            <div style={{ lineHeight: '1.2' }}>
                                <div>
                                    <DateCell
                                        date={calculatedDate.format('YYYY-MM-DD')}
                                        format="DD.MM.YY"
                                    />
                                </div>
                                <div style={{ fontSize: '11px', color: '#8c8c8c', marginTop: '2px' }}>
                                    {record.delivery_days} {daysTypeLabel}
                                </div>
                            </div>
                        )
                    }
                }

                // If delivery_date is stored in DB, use it
                if (text) {
                    return (
                        <DateCell
                            date={text}
                            format="DD.MM.YY"
                        />
                    )
                }

                return '—'
            },
        },
        {
            title: 'Создатель',
            dataIndex: ['creator', 'full_name'],
            key: 'creator_name',
            width: 140,
            priority: 10,
            exportable: true,
            sorter: true,
            responsive: ['lg'],
            ellipsis: true,
            render: (text, record) => {
                console.log('[InvoicesPage] Creator data:', record.creator)
                if (!record.creator) {
                    return '—'
                }
                // Отображаем ФИО или email если ФИО нет
                const displayName = record.creator.full_name ?? (record.creator.email || '—')
                return displayName
            },
        },
        {
            title: 'Действия',
            key: 'actions',
            width: 120,
            fixed: 'right',
            responsive: ['lg', 'md', 'sm', 'xs'],
            render: (_, record) => (<Space size={4}>
                    {/* Просмотр - всегда доступен */}
                    <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined/>}
                        onClick={() => void handleView(record)}
                        title="Просмотр"
                    />
                    {/* Отменить - для статусов draft, pending, approved */}
                    <Button
                        type="text"
                        size="small"
                        icon={<CloseCircleOutlined/>}
                        onClick={() => void handleCancel(record)}
                        title="Отменить"
                        danger
                        disabled={!['draft', 'pending', 'approved'].includes(record.status)}
                        style={{opacity: !['draft', 'pending', 'approved'].includes(record.status) ? 0.3 : 1}}
                    />
                    {/* Удалить - только для draft и cancelled и если нет платежей */}
                    <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined/>}
                        onClick={() => void handleDelete(record)}
                        title={
                            invoicePayments[record.id]
                                ? "Нельзя удалить - есть платежи"
                                : !['draft', 'cancelled'].includes(record.status)
                                    ? "Можно удалить только черновики и отмененные счета"
                                    : "Удалить"
                        }
                        danger
                        disabled={!['draft', 'cancelled'].includes(record.status) || invoicePayments[record.id]}
                        style={{opacity: (!['draft', 'cancelled'].includes(record.status) || invoicePayments[record.id]) ? 0.3 : 1}}
                    />
                </Space>
            ),
        },
    ]

    const filterFields: FilterField[] = [
        {
            key: 'search',
            type: 'text',
            label: 'Поиск',
            placeholder: 'Номер, название, поставщик...'
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
            key: 'project_id',
            type: 'select',
            label: 'Проект',
            options: [], // TODO: Load from projects hook
            showSearch: true,
        },
        {
            key: 'contractor_id',
            type: 'select',
            label: 'Поставщик',
            options: [], // TODO: Load from contractors hook
            showSearch: true,
        },
        {
            key: 'date_range',
            type: 'dateRange',
            label: 'Период создания',
        },
        {
            key: 'due_date_range',
            type: 'dateRange',
            label: 'Период оплаты',
        },
        {
            key: 'amount_range',
            type: 'numberRange',
            label: 'Сумма',
        },
    ]

    // Bulk actions
    const bulkActions: BulkAction<InvoiceWithRelations>[] = [
        {
            key: 'export-selected',
            label: 'Экспортировать выбранные',
            icon: <ExportOutlined/>,
            onClick: async (selectedRows) => {
                await handleExport({ids: selectedRows.map(row => row.id)})
            }
        },
        {
            key: 'delete-drafts',
            label: 'Удалить черновики',
            icon: <DeleteOutlined/>,
            danger: true,
            disabled: (selectedRows) => !selectedRows.every(row =>
                (row.status === 'draft' || row.status === 'cancelled') && !invoicePayments[row.id]
            ),
            onClick: async (selectedRows) => {
                for (const row of selectedRows) {
                    if ((row.status === 'draft' || row.status === 'cancelled') && !invoicePayments[row.id]) {
                        await handleDelete(row)
                    }
                }
            }
        },
        {
            key: 'submit-drafts',
            label: 'Отправить на согласование',
            icon: <SendOutlined/>,
            disabled: (selectedRows) => !selectedRows.every(row => row.status === 'draft'),
            onClick: async (selectedRows) => {
                // TODO: Implement bulk submit
                message.info('Функция будет реализована')
            }
        }
    ]

    return (<div style={{padding: '24px', width: '100%', overflowX: 'hidden'}}>
            <DataTable<InvoiceWithRelations>
                title="Счета на оплату"
                subtitle={`Всего счетов: ${invoicesData?.total || 0}`}
                dataSource={invoicesData?.data ?? []}
                columns={columns}
                loading={isLoading}
                total={invoicesData?.total}

                // Filtering
                filterFields={filterFields}
                filters={filters}
                onFiltersChange={(newFilters) => {
                    setFilters(newFilters)
                    setPagination({page: 1, limit: 50})
                }}
                defaultFiltersCollapsed

                // Actions
                onRefresh={refetch}
                bulkActions={bulkActions}

                // Export
                exportable
                exportFilename="invoices"
                onExport={handleExport}

                // Header actions
                headerActions={
                    <Button
                        type="primary"
                        icon={<PlusOutlined/>}
                        onClick={() => void navigate('/invoices/create')}
                    >
                        Создать счет
                    </Button>
                }

                // Pagination
                pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: invoicesData?.total || 0,
                    onChange: (page, pageSize) => {
                        console.log('[InvoicesPage] Pagination changed:', { page, pageSize })
                        setPagination(prev => ({...prev, page, limit: pageSize || 20}))
                    },
                }}

                // Sorting
                onSort={(sortBy, sortOrder) => {
                    console.log('[InvoicesPage] Sort changed:', { sortBy, sortOrder })
                    // Map column dataIndex to database field names
                    const fieldMapping: Record<string, string> = {
                        'invoice_number': 'invoice_number',
                        'invoice_date': 'invoice_date',
                        'supplier.name': 'supplier_id',
                        'payer.name': 'payer_id',
                        'project.name': 'project_id',
                        'description': 'description',
                        'total_amount': 'total_amount',
                        'currency': 'currency',
                        'status': 'status',
                        'priority': 'priority',
                        'payment_due_date': 'payment_due_date',
                        'estimated_delivery_date': 'delivery_days',
                        'created_at': 'created_at'
                    }
                    const dbField = fieldMapping[sortBy] || sortBy
                    console.log('[InvoicesPage] Mapped field:', dbField)
                    setPagination(prev => ({...prev, sortBy: dbField, sortOrder, page: 1}))
                }}

                // Selection and responsiveness
                selectable
                multiSelect
                responsive
                emptyText="Нет счетов на оплату"

                // Add horizontal scroll for table
                scroll={{x: 'max-content', y: 'calc(100vh - 350px)'}}
            />

            {/* Create Invoice Modal */}
            <Modal
                title="Создать счет"
                open={createModalVisible}
                onCancel={() => setCreateModalVisible(false)}
                footer={null}
                width={800}
                destroyOnHidden
            >
                {/* TODO: Implement InvoiceForm component */}
                <div>Форма создания счета</div>
            </Modal>
        </div>
    )
}

// Export the InvoicesPage component from this file
export default InvoicesPage