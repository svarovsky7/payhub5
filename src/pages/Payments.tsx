import React, {useEffect, useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {
    Button,
    Card,
    Checkbox,
    Col,
    List,
    message,
    Modal,
    Select,
    Space,
    Tag,
    Typography
} from 'antd'

const {Text} = Typography
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    EyeOutlined,
    FileTextOutlined,
    PlusOutlined,
    SendOutlined,
    SyncOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {useCancelPayment, useConfirmPayment, useDeletePayment, usePaymentsList} from '../services/hooks/usePayments'
import {DataTable} from '../components/table'
import type {BulkAction, DataTableColumn, FilterField} from '../components/table'
import {DateCell, LinkCell, MoneyCell, StatusCell, TextCell, UserCell} from '../components/table/TableCells'
import {PaymentWorkflowService} from '../services/admin/payment-workflow'
import {useAuthStore} from '../models/auth'
import {PaymentType, PaymentTypeColors, PaymentTypeLabels} from '../types/payment'


interface Payment {
    id: number
    reference?: string // это payment_number в UI
    internal_number?: string // Уникальный внутренний номер платежа
    payment_type?: PaymentType
    invoice_id: number
    invoice?: {
        invoice_number: string
        invoice_date?: string
        title?: string
        total_amount?: number
        type_id?: number
        contractor?: {
            name: string
        }
        supplier?: {
            name: string
        }
        payer?: {
            name: string
        }
        project?: {
            name: string
        }
    }
    amount: number
    currency?: string
    status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
    payment_date: string
    approved_at?: string
    created_at?: string
    comment?: string
    workflow_status?: 'not_started' | 'in_approval' | 'approved' | 'rejected' | 'cancelled'
    workflow?: {
        id: number
        status: string
        stages_completed: number
        stages_total: number
        current_stage_position: number
    }
    created_by?: string
    creator?: {
        id?: string
        full_name?: string
        email?: string
    }
    confirmed_by?: {
        name?: string
        email?: string
    }
    approved_by?: {
        name?: string
        email?: string
    }
    created_at: string
    updated_at: string
}


const statusConfig = {
    pending: 'В ожидании',
    processing: 'Обработка',
    completed: 'Завершен',
    failed: 'Отклонен',
    cancelled: 'Отменен'
}

interface PaymentsPageProps {
    invoiceId?: string
}

const PaymentsPage: React.FC<PaymentsPageProps> = ({invoiceId}) => {
    const navigate = useNavigate()
    const [filters, setFilters] = useState<Record<string, any>>({})
    const [pagination, setPagination] = useState({page: 1, limit: 50})
    const [sorter, setSorter] = useState<{ field?: string; order?: 'ascend' | 'descend' } | null>(null)
    const [workflowModalVisible, setWorkflowModalVisible] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
    const [availableWorkflows, setAvailableWorkflows] = useState<any[]>([])
    const [selectedWorkflow, setSelectedWorkflow] = useState<number | null>(null)
    const [loadingWorkflows, setLoadingWorkflows] = useState(false)
    const [hideCompleted, setHideCompleted] = useState(false)

    const {user, profile} = useAuthStore()

    // Подготавливаем фильтры с учетом прав пользователя
    const enhancedFilters = useMemo(() => {
        const baseFilters = {...filters}

        console.log('[PaymentsPage] Profile:', profile)
        console.log('[PaymentsPage] Role:', profile?.roles)
        console.log('[PaymentsPage] view_own_project_only:', profile?.roles?.view_own_project_only)
        console.log('[PaymentsPage] project_ids:', profile?.project_ids)

        // Если у пользователя есть ограничение по проектам
        if (profile?.roles?.view_own_project_only && profile?.project_ids && profile.project_ids.length > 0) {
            console.log('[PaymentsPage] Применяется фильтрация по проектам пользователя')
            baseFilters.viewOwnProjectsOnly = true
            // Убедимся, что project_ids - это массив чисел
            baseFilters.userProjectIds = Array.isArray(profile.project_ids)
                ? profile.project_ids.map(id => typeof id === 'string' ? parseInt(id) : id)
                : []
            console.log('[PaymentsPage] userProjectIds после преобразования:', baseFilters.userProjectIds)
        }

        // Добавляем фильтр для скрытия завершенных платежей
        if (hideCompleted) {
            baseFilters.excludeStatuses = ['completed']
            console.log('[PaymentsPage] Скрываем завершенные платежи, передаем фильтры:', baseFilters)
        } else {
            console.log('[PaymentsPage] Показываем все платежи, фильтры:', baseFilters)
        }

        return baseFilters
    }, [filters, profile, hideCompleted])

    // Hooks
    const {data: paymentsData, isLoading, refetch} = usePaymentsList(
        invoiceId ? parseInt(invoiceId) : undefined,
        enhancedFilters,
        pagination
    )
    const confirmPaymentMutation = useConfirmPayment()
    const cancelPaymentMutation = useCancelPayment()
    const deletePaymentMutation = useDeletePayment()

    const payments = paymentsData?.data ?? []

    // Handlers
    const handleView = (record: Payment) => {
        console.log('[PaymentsPage.handleView] Просмотр платежа:', record)
        // Переход на страницу счета на вкладку Платежи с выделением конкретного платежа
        if (record.invoice_id) {
            navigate(`/invoices/${record.invoice_id}?tab=payments&paymentId=${record.id}`)
        } else {
            message.warning('Счет не найден для этого платежа')
        }
    }

    const handleEdit = (record: Payment) => {
        console.log('[PaymentsPage.handleEdit] Редактирование платежа:', record)
        message.info(`Редактирование платежа ${record.reference ?? `PAY-${record.id}`}`)
    }

    const handleDelete = async (record: Payment) => {
        Modal.confirm({
            title: 'Удалить платеж?',
            content: `Вы уверены, что хотите удалить платеж ${record.reference ?? `PAY-${record.id}`}?`,
            okText: 'Да, удалить',
            cancelText: 'Отмена',
            okButtonProps: {danger: true},
            onOk: async () => {
                try {
                    console.log('[PaymentsPage.handleDelete] Удаление платежа:', record.id)
                    await deletePaymentMutation.mutateAsync(record.id.toString())
                    void refetch()
                } catch (error) {
                    console.error('[PaymentsPage.handleDelete] Ошибка:', error)
                    // Error message handled by the mutation hook
                }
            }
        })
    }

    const handleConfirm = async (record: Payment) => {
        try {
            console.log('[PaymentsPage.handleConfirm] Подтверждение платежа:', record.id)
            await confirmPaymentMutation.mutateAsync(record.id)
            message.success('Платеж подтвержден')
        } catch (error) {
            console.error('[PaymentsPage.handleConfirm] Ошибка:', error)
        }
    }

    const handleCancel = async (record: Payment) => {
        Modal.confirm({
            title: 'Отменить платеж?',
            content: 'Это действие нельзя отменить',
            okText: 'Да',
            cancelText: 'Нет',
            onOk: async () => {
                try {
                    await cancelPaymentMutation.mutateAsync({
                        id: record.id,
                        reason: 'Отменен пользователем'
                    })
                } catch (error) {
                    console.error('Cancel error:', error)
                }
            }
        })
    }

    // Обработчик отправки на согласование
    const handleSendToApproval = async (record: Payment) => {
        console.log('[PaymentsPage.handleSendToApproval] Payment:', record)

        if (!record.invoice?.type_id) {
            message.warning('Невозможно определить тип счета для платежа')
            return
        }

        setSelectedPayment(record)
        setLoadingWorkflows(true)
        setWorkflowModalVisible(true)

        try {
            // Получаем доступные workflow для типа счета
            const workflows = await PaymentWorkflowService.getAvailableWorkflows(
                '1', // TODO: получить company_id из контекста
                record.invoice.type_id
            )

            console.log('[PaymentsPage] Available workflows:', workflows)
            setAvailableWorkflows(workflows)

            // Если есть только один workflow, выбираем его автоматически
            if (workflows.length === 1) {
                setSelectedWorkflow(workflows[0].id)
            }
        } catch (error) {
            console.error('[PaymentsPage] Error loading workflows:', error)
            message.error('Ошибка загрузки процессов согласования')
            setWorkflowModalVisible(false)
        } finally {
            setLoadingWorkflows(false)
        }
    }

    // Подтверждение отправки на согласование
    const handleConfirmSendToApproval = async () => {
        if (!selectedPayment || !selectedWorkflow) {
            message.warning('Выберите процесс согласования')
            return
        }

        try {
            console.log('[PaymentsPage] Starting workflow:', {
                paymentId: selectedPayment.id,
                workflowId: selectedWorkflow,
                userId: user?.id
            })

            await PaymentWorkflowService.startPaymentWorkflow(
                selectedPayment.id,
                selectedWorkflow,
                user?.id || '1'
            )

            message.success('Платеж отправлен на согласование')
            setWorkflowModalVisible(false)
            setSelectedPayment(null)
            setSelectedWorkflow(null)
            void refetch() // Обновляем таблицу
        } catch (error) {
            console.error('[PaymentsPage] Error starting workflow:', error)
            message.error('Ошибка отправки на согласование')
        }
    }

    const handleExport = async (exportFilters?: any) => {
        // TODO: Implement payment export
        message.info('Экспорт будет реализован')
    }

    const columns: DataTableColumn<Payment>[] = [
        {
            title: 'Уникальный №',
            dataIndex: 'internal_number',
            key: 'internal_number',
            priority: 1,
            exportable: true,
            width: 200,
            render: (text, record) => {
                // Используем internal_number если есть, иначе reference
                const displayNumber = text ?? (record.reference || `PAY-${record.id}`)

                // Разбиваем номер на две части если есть /PAY-
                const parts = displayNumber.split('/PAY-')
                if (parts.length === 2) {
                    return (
                        <div style={{fontSize: '12px', lineHeight: '1.3'}}>
                            <div>{parts[0]}</div>
                            <div style={{color: '#1890ff'}}>PAY-{parts[1]}</div>
                            <div style={{color: '#999', fontSize: '11px'}}>
                                {dayjs(record.payment_date).format('DD.MM.YYYY')}
                            </div>
                        </div>
                    )
                }
                return (
                    <TextCell
                        lines={[
                            displayNumber,
                            dayjs(record.payment_date).format('DD.MM.YYYY')
                        ]}
                    />
                )
            },
        },
        {
            title: 'Счет',
            dataIndex: ['invoice', 'invoice_number'],
            key: 'invoice_number',
            priority: 2,
            exportable: true,
            sorter: (a, b) => (a.invoice?.invoice_number || '').localeCompare(b.invoice?.invoice_number || ''),
            render: (_, record) => {
                if (!record.invoice) {
                    return '—'
                }
                return (
                    <TextCell lines={[
                        record.invoice.invoice_number,
                        record.invoice.invoice_date
                            ? dayjs(record.invoice.invoice_date).format('DD.MM.YYYY')
                            : '—'
                    ]}/>
                )
            },
        },
        {
            title: 'Контрагент',
            dataIndex: ['invoice', 'contractor', 'name'],
            key: 'contractor_name',
            priority: 3,
            exportable: true,
            ellipsis: true,
            sorter: (a, b) => {
                const aName = a.invoice?.contractor?.name ?? a.invoice?.supplier?.name ?? (a.invoice?.payer?.name || '')
                const bName = b.invoice?.contractor?.name ?? b.invoice?.supplier?.name ?? (b.invoice?.payer?.name || '')
                return aName.localeCompare(bName)
            },
            render: (_, record) => {
                const contractor = record.invoice?.contractor ?? record.invoice?.supplier ?? record.invoice?.payer
                if (!contractor) {
                    return '—'
                }
                return (
                    <TextCell lines={[
                        contractor.name,
                        record.invoice?.project?.name || '—'
                    ]}/>
                )
            },
        },
        {
            title: 'Тип платежа',
            dataIndex: 'payment_type',
            key: 'payment_type',
            priority: 4,
            exportable: true,
            sorter: (a, b) => (a.payment_type || '').localeCompare(b.payment_type || ''),
            render: (type: PaymentType) => {
                if (!type) {
                    return <Tag>Не указан</Tag>
                }
                return (
                    <Tag color={PaymentTypeColors[type]}>
                        {PaymentTypeLabels[type]}
                    </Tag>
                )
            },
        },
        {
            title: 'Сумма',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            priority: 5,
            exportable: true,
            sorter: (a, b) => a.amount - b.amount,
            render: (amount, record) => (
                <MoneyCell amount={amount} currency={record.currency || 'RUB'} strong/>
            ),
        },
        {
            title: 'Статус',
            dataIndex: 'status',
            key: 'status',
            priority: 6,
            exportable: true,
            sorter: (a, b) => a.status.localeCompare(b.status),
            render: (status, record) => (
                <Space direction="vertical" size={0}>
                    <StatusCell status={status} type="payment"/>
                    {record.workflow && (
                        <>
                            {record.workflow.status === 'in_progress' && (
                                <Text type="secondary" style={{fontSize: 12}}>
                                    Этап {record.workflow.stages_completed + 1} из {record.workflow.stages_total}
                                </Text>
                            )}
                            {record.workflow.status === 'completed' && (
                                <Tag color="success" icon={<CheckCircleOutlined/>}>
                                    Согласован ({record.workflow.stages_completed}/{record.workflow.stages_total})
                                </Tag>
                            )}
                            {record.workflow.status === 'rejected' && (
                                <Tag color="error" icon={<CloseCircleOutlined/>}>
                                    Отклонен ({record.workflow.stages_completed}/{record.workflow.stages_total})
                                </Tag>
                            )}
                        </>
                    )}
                </Space>
            ),
        },
        {
            title: 'Дата платежа',
            dataIndex: 'payment_date',
            key: 'payment_date',
            priority: 6,
            exportable: true,
            mobile: false,
            sorter: (a, b) => dayjs(a.payment_date).unix() - dayjs(b.payment_date).unix(),
            render: (date, record) => (
                <TextCell lines={[
                    <DateCell date={date} format="DD.MM.YY"/>,
                    record.approved_at ? `Подтв.: ${dayjs(record.approved_at).format('DD.MM.YY')}` : '—'
                ]}/>
            ),
        },
        {
            title: 'Комментарий',
            dataIndex: 'comment',
            key: 'comment',
            exportable: true,
            mobile: false,
            ellipsis: true,
            render: (text) => text || '—',
        },
        {
            title: 'Создал',
            dataIndex: ['creator', 'full_name'],
            key: 'creator',
            width: 150,
            exportable: true,
            mobile: false,
            render: (_, record) => {
                if (!record.creator) {
                    return '—'
                }
                return (
                    <UserCell
                        user={{
                            name: record.creator.full_name ?? (record.creator.email || 'Неизвестно'),
                            email: record.creator.email || ''
                        }}
                    />
                )
            },
        },
        {
            title: 'Дата создания',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 150,
            exportable: true,
            mobile: false,
            render: (date) => <DateCell date={date} format="DD.MM.YYYY HH:mm"/>,
        },
        {
            title: 'Действия',
            key: 'actions',
            width: 160,
            fixed: 'right',
            render: (_, record) => {
                return (<Space size={4}>
                        {/* Просмотр - всегда доступен */}
                        <Button
                            type="text"
                            size="small"
                            icon={<EyeOutlined/>}
                            onClick={() => void handleView(record)}
                            title="Просмотр"
                        />
                        {/* Отправить на согласование - для pending без workflow */}
                        <Button
                            type="text"
                            size="small"
                            icon={<SendOutlined/>}
                            onClick={() => void handleSendToApproval(record)}
                            title="Отправить на согласование"
                            disabled={record.status !== 'pending' || !!record.workflow_status}
                            style={{opacity: (record.status !== 'pending' || !!record.workflow_status) ? 0.3 : 1}}
                        />
                        {/* Отменить - для pending или processing */}
                        <Button
                            type="text"
                            size="small"
                            icon={<CloseCircleOutlined/>}
                            onClick={() => void handleCancel(record)}
                            title="Отменить"
                            danger
                            disabled={record.status !== 'pending' && record.status !== 'processing'}
                            style={{opacity: (record.status !== 'pending' && record.status !== 'processing') ? 0.3 : 1}}
                        />
                        {/* Удалить - не для cancelled */}
                        <Button
                            type="text"
                            size="small"
                            icon={<DeleteOutlined/>}
                            onClick={() => void handleDelete(record)}
                            title="Удалить"
                            danger
                            disabled={record.status === 'cancelled'}
                            style={{opacity: record.status === 'cancelled' ? 0.3 : 1}}
                        />
                    </Space>
                )
            },
        },
    ]

    // Filter fields
    const filterFields: FilterField[] = [
        {
            key: 'search',
            type: 'text',
            label: 'Поиск',
            placeholder: 'Номер платежа, контрагент...'
        },
        {
            key: 'status',
            type: 'multiSelect',
            label: 'Статус',
            options: [
                {value: 'pending', label: 'В ожидании'},
                {value: 'processing', label: 'Обработка'},
                {value: 'completed', label: 'Завершен'},
                {value: 'failed', label: 'Не удался'},
                {value: 'cancelled', label: 'Отменен'}
            ]
        },
        {
            key: 'method',
            type: 'multiSelect',
            label: 'Способ оплаты',
            options: [
                {value: 'bank_transfer', label: 'Банковский перевод'},
                {value: 'cash', label: 'Наличные'},
                {value: 'card', label: 'Банковская карта'},
                {value: 'check', label: 'Чек'}
            ]
        },
        {
            key: 'date_range',
            type: 'dateRange',
            label: 'Период платежа'
        },
        {
            key: 'amount_range',
            type: 'numberRange',
            label: 'Сумма'
        }
    ]

    // Bulk actions
    const bulkActions: BulkAction<Payment>[] = [
        {
            key: 'confirm-selected',
            label: 'Подтвердить выбранные',
            icon: <CheckCircleOutlined/>,
            disabled: (selectedRows) => !selectedRows.every(row => row.status === 'pending'),
            onClick: async (selectedRows) => {
                for (const row of selectedRows) {
                    if (row.status === 'pending') {
                        await handleConfirm(row)
                    }
                }
            }
        },
        {
            key: 'export-selected',
            label: 'Экспортировать выбранные',
            icon: <FileTextOutlined/>,
            onClick: async (selectedRows) => {
                await handleExport({ids: selectedRows.map(row => row.id)})
            }
        }
    ]

    return (<div style={{padding: 24}}>

            <DataTable<Payment>
                title={invoiceId ? "Платежи по счету" : "Платежи"}
                subtitle={`Всего платежей: ${paymentsData?.total || 0}`}
                dataSource={payments}
                columns={columns}
                loading={isLoading}
                total={paymentsData?.total}

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
                exportFilename="payments"
                onExport={handleExport}

                // Header actions
                headerActions={
                    <Checkbox
                        checked={hideCompleted}
                        onChange={(e) => {
                            setHideCompleted(e.target.checked)
                            console.log('[PaymentsPage] Скрыть завершенные платежи:', e.target.checked)
                        }}
                    >
                        Скрыть завершенные платежи
                    </Checkbox>
                }

                // Pagination
                pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: paymentsData?.total || 0,
                    onChange: (page, pageSize) => {
                        setPagination({page, limit: pageSize || 50})
                    },
                }}

                // Sorting
                onChange={(paginationInfo, filtersInfo, sorterInfo: any) => {
                    console.log('[PaymentsPage] Изменение сортировки:', sorterInfo)
                    if (sorterInfo?.field) {
                        setSorter({
                            field: sorterInfo.field,
                            order: sorterInfo.order
                        })
                    } else {
                        setSorter(null)
                    }
                }}

                // Selection and responsiveness
                selectable
                multiSelect
                responsive
                emptyText="Нет платежей"

                // Table layout
                scroll={{x: 'max-content'}}
                tableLayout="auto"
            />

            {/* Модальное окно выбора процесса согласования */}
            <Modal
                title="Отправить платеж на согласование"
                open={workflowModalVisible}
                onOk={handleConfirmSendToApproval}
                onCancel={() => {
                    setWorkflowModalVisible(false)
                    setSelectedPayment(null)
                    setSelectedWorkflow(null)
                }}
                okText="Отправить"
                cancelText="Отмена"
                confirmLoading={loadingWorkflows}
                width={600}
            >
                {selectedPayment && (
                    <Space direction="vertical" style={{width: '100%'}} size="large">
                        <div>
                            <Text strong>Платеж:</Text> {selectedPayment.reference ?? `PAY-${selectedPayment.id}`}
                            <br/>
                            <Text strong>Сумма:</Text> {selectedPayment.amount.toLocaleString('ru-RU')} ₽
                            <br/>
                            <Text strong>Счет:</Text> {selectedPayment.invoice?.invoice_number || '—'}
                        </div>

                        <div>
                            <Text strong style={{display: 'block', marginBottom: 8}}>
                                Выберите процесс согласования:
                            </Text>
                            {loadingWorkflows ? (
                                <div>Загрузка процессов...</div>
                            ) : availableWorkflows.length === 0 ? (
                                <div>
                                    <Text type="warning">
                                        Нет доступных процессов согласования для данного типа счета.
                                    </Text>
                                    <br/>
                                    <Text type="secondary">
                                        Создайте процесс согласования в разделе Администрирование.
                                    </Text>
                                </div>
                            ) : (<Select
                                    style={{width: '100%'}}
                                    placeholder="Выберите процесс"
                                    value={selectedWorkflow}
                                    onChange={() => void setSelectedWorkflow()}
                                    options={availableWorkflows.map(wf => ({
                                        value: wf.id,
                                        label: wf.name
                                    }))}
                                />
                            )}
                        </div>

                        {selectedWorkflow && (
                            <div>
                                <Text strong style={{display: 'block', marginBottom: 8}}>
                                    Этапы согласования:
                                </Text>
                                <List
                                    size="small"
                                    dataSource={availableWorkflows.find(wf => wf.id === selectedWorkflow)?.stages ?? []}
                                    renderItem={(stage: any, index: number) => (
                                        <List.Item>
                                            <Space>
                                                <Tag>{index + 1}</Tag>
                                                <Text>{stage.name}</Text>
                                                {stage.timeout_days && (
                                                    <Text type="secondary">({stage.timeout_days} дн.)</Text>
                                                )}
                                            </Space>
                                        </List.Item>
                                    )}
                                />
                            </div>
                        )}
                    </Space>
                )}
            </Modal>
        </div>
    )
}

// Fixed nullish coalescing operator issues
export default PaymentsPage
