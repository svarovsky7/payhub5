import React, {useState} from 'react'
import {
    Badge,
    Button,
    Card,
    Descriptions,
    Drawer,
    Form,
    Input,
    message,
    Modal,
    Progress,
    Space,
    Tag,
    Timeline,
    Tooltip,
    Typography
} from 'antd'
import {
    CheckOutlined,
    ClockCircleOutlined,
    CloseOutlined,
    EyeOutlined,
    FileTextOutlined
} from '@ant-design/icons'
import {useApprovePayment, useMyApprovals, useRejectPayment} from '../../services/hooks/useApprovals'
import {useAuth} from '../../models/auth'
import type {ApprovalItem} from '../../services/approvals/queries'
import dayjs from 'dayjs'
import {DataTable} from '../../components/table'
import type {BulkAction, DataTableColumn, FilterField} from '../../components/table'
import {DateCell, MoneyCell, TextCell} from '../../components/table/TableCells'

const {Text} = Typography
const {TextArea} = Input

export const ApprovalsPage: React.FC = () => {
    const {} = useAuth()
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [selectedApproval, setSelectedApproval] = useState<ApprovalItem | null>(null)
    const [drawerVisible, setDrawerVisible] = useState(false)
    const [rejectModalVisible, setRejectModalVisible] = useState(false)
    const [rejectForm] = Form.useForm()
    const [filters, setFilters] = useState<Record<string, any>>({})

    // Загрузка данных
    const {data: approvalsData, isLoading, refetch} = useMyApprovals({
        page: currentPage,
        limit: pageSize
    })
    const approvePaymentMutation = useApprovePayment()
    const rejectPaymentMutation = useRejectPayment()

    // Обработчики
    const handleViewDetails = (record: ApprovalItem) => {
        console.log('[ApprovalsPage] Просмотр деталей согласования:', record)

        // Если есть invoice_id, переходим на страницу счета с выбранным платежом
        if (record.invoice_id) {
            // Сохраняем текущий URL для возврата
            const returnUrl = window.location.pathname + window.location.search
            // Переходим на страницу счета, передавая ID платежа для подсветки и URL для возврата
            window.location.href = `/invoices/${record.invoice_id}?tab=payments&payment_id=${record.payment_id}&return_url=${encodeURIComponent(returnUrl)}`
        } else {
            // Если нет связанного счета, показываем детали в drawer
            setSelectedApproval(record)
            setDrawerVisible(true)
        }
    }

    const handleApprove = async (record: ApprovalItem) => {
        console.log('[ApprovalsPage] Одобрение платежа:', record)

        try {
            await approvePaymentMutation.mutateAsync({
                workflowId: record.payment_workflow_id,
                comment: ''
            })

            message.success('Счет успешно Вами согласован')

            // Закрываем drawer если он открыт
            if (drawerVisible) {
                setDrawerVisible(false)
                setSelectedApproval(null)
            }
        } catch (error) {
            console.error('[ApprovalsPage] Ошибка одобрения:', error)
        }
    }

    const handleReject = (record: ApprovalItem) => {
        console.log('[ApprovalsPage] Начало отклонения платежа:', record)
        setSelectedApproval(record)
        setRejectModalVisible(true)
        rejectForm.resetFields()
    }

    const handleConfirmReject = async () => {
        try {
            const values = await rejectForm.validateFields()
            if (!selectedApproval) {
                return
            }

            console.log('[ApprovalsPage] Отклонение платежа:', {
                workflowId: selectedApproval.payment_workflow_id,
                reason: values.reason
            })

            await rejectPaymentMutation.mutateAsync({
                workflowId: selectedApproval.payment_workflow_id,
                reason: values.reason
            })

            message.success('Платеж отклонен')
            setRejectModalVisible(false)
            setSelectedApproval(null)
            rejectForm.resetFields()
        } catch (error) {
            console.error('[ApprovalsPage] Ошибка отклонения:', error)
        }
    }

    const handleExport = async (exportFilters?: any) => {
        message.info('Экспорт согласований будет реализован')
    }

    // Колонки таблицы
    const columns: DataTableColumn<ApprovalItem>[] = [
        {
            title: 'Внутр. №',
            dataIndex: ['invoice', 'internal_number'],
            key: 'internal_number',
            priority: 1,
            exportable: true,
            width: 100,
            sorter: (a: ApprovalItem, b: ApprovalItem) => {
                const aNum = a.invoice?.internal_number || ''
                const bNum = b.invoice?.internal_number || ''
                return aNum.localeCompare(bNum)
            },
            render: (_, record: ApprovalItem) => {
                return record.invoice?.internal_number || '—'
            },
        },
        {
            title: '№ Платежа',
            dataIndex: 'payment_id',
            key: 'payment_number',
            priority: 2,
            exportable: true,
            sorter: (a: ApprovalItem, b: ApprovalItem) => {
                const aNum = a.payment_number || `PAY-${a.payment_id}`
                const bNum = b.payment_number || `PAY-${b.payment_id}`
                return aNum.localeCompare(bNum)
            },
            render: (_: any, record: ApprovalItem) => (
                <TextCell
                    lines={[
                        record.payment_number || `PAY-${record.payment_id}`,
                        dayjs(record.started_at).format('DD.MM.YYYY')
                    ]}
                />
            ),
        },
        {
            title: 'Счет',
            dataIndex: ['invoice', 'invoice_number'],
            key: 'invoice',
            priority: 3,
            exportable: true,
            render: (_, record) => {
                if (!record.invoice) {
                    return '—'
                }
                return (
                    <TextCell lines={[
                        record.invoice.invoice_number || '—',
                        record.invoice.invoice_date ? dayjs(record.invoice.invoice_date).format('DD.MM.YYYY') : '—'
                    ]}/>
                )
            },
        },
        {
            title: 'Проект',
            dataIndex: ['invoice', 'project', 'name'],
            key: 'project',
            priority: 4,
            exportable: true,
            ellipsis: true,
            sorter: (a: ApprovalItem, b: ApprovalItem) => {
                const aName = a.invoice?.project?.name || ''
                const bName = b.invoice?.project?.name || ''
                return aName.localeCompare(bName)
            },
            render: (_, record) => {
                return record.invoice?.project?.name || '—'
            },
        },
        {
            title: 'Контрагент',
            dataIndex: ['invoice', 'supplier', 'name'],
            key: 'supplier',
            priority: 5,
            exportable: true,
            ellipsis: true,
            sorter: (a: ApprovalItem, b: ApprovalItem) => {
                const aName = a.invoice?.supplier?.name || ''
                const bName = b.invoice?.supplier?.name || ''
                return aName.localeCompare(bName)
            },
            render: (_, record) => {
                const supplier = record.invoice?.supplier
                if (!supplier) {
                    return '—'
                }
                return supplier.name
            },
        },
        {
            title: 'Сумма',
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            priority: 6,
            exportable: true,
            sorter: (a: ApprovalItem, b: ApprovalItem) => a.amount - b.amount,
            render: (amount: number) => (
                <MoneyCell amount={amount} strong/>
            ),
        },
        {
            title: 'Статус',
            key: 'stage',
            priority: 7,
            exportable: true,
            render: (record: ApprovalItem) => (
                <Space direction="vertical" size={0}>
                    <Tag color="processing" icon={<ClockCircleOutlined/>}>
                        {record.current_stage?.name || 'Неизвестный этап'}
                    </Tag>
                    <Progress
                        percent={Math.round((record.stages_completed / record.stages_total) * 100)}
                        size="small"
                        showInfo={false}
                        strokeColor="#1890ff"
                        style={{width: 100}}
                    />
                </Space>
            ),
        },
        {
            title: 'Дата подачи',
            dataIndex: 'started_at',
            key: 'started_at',
            priority: 8,
            exportable: true,
            mobile: false,
            sorter: (a: ApprovalItem, b: ApprovalItem) =>
                dayjs(a.started_at).unix() - dayjs(b.started_at).unix(),
            render: (date: string) => (
                <DateCell date={date} format="DD.MM.YYYY HH:mm"/>
            ),
        },
        {
            title: 'Инициатор',
            key: 'started_by',
            exportable: true,
            mobile: false,
            render: (_, record: ApprovalItem) => {
                if (record.started_by_user?.full_name) {
                    return record.started_by_user.full_name
                } else if (record.started_by_user?.email) {
                    return record.started_by_user.email
                }
                return '—'
            },
        },
        {
            title: 'Процесс',
            dataIndex: ['workflow', 'name'],
            key: 'workflow',
            exportable: true,
            mobile: false,
            render: (text: string) => text || '—',
        },
        {
            title: 'Действия',
            key: 'actions',
            width: 120,
            fixed: 'right',
            render: (record: ApprovalItem) => {
                return (<Space size={4}>
                        <Tooltip title="Просмотр">
                            <Button
                                type="text"
                                size="small"
                                icon={<EyeOutlined/>}
                                onClick={() => void handleViewDetails(record)}
                            />
                        </Tooltip>
                        <Tooltip title="Одобрить">
                            <Button
                                type="text"
                                size="small"
                                icon={<CheckOutlined/>}
                                style={{color: '#52c41a'}}
                                onClick={() => void handleApprove(record)}
                                loading={approvePaymentMutation.isPending}
                            />
                        </Tooltip>
                        <Tooltip title="Отклонить">
                            <Button
                                type="text"
                                size="small"
                                danger
                                icon={<CloseOutlined/>}
                                onClick={() => void handleReject(record)}
                                loading={rejectPaymentMutation.isPending}
                            />
                        </Tooltip>
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
            placeholder: 'Номер платежа, поставщик...'
        },
        {
            key: 'stage',
            type: 'multiSelect',
            label: 'Этап',
            options: [] // TODO: загрузить динамически
        },
        {
            key: 'date_range',
            type: 'dateRange',
            label: 'Период подачи'
        },
        {
            key: 'amount_range',
            type: 'numberRange',
            label: 'Сумма'
        }
    ]

    // Bulk actions
    const bulkActions: BulkAction<ApprovalItem>[] = [
        {
            key: 'approve-selected',
            label: 'Одобрить выбранные',
            icon: <CheckOutlined/>,
            onClick: async (selectedRows) => {
                for (const row of selectedRows) {
                    await approvePaymentMutation.mutateAsync({
                        workflowId: row.payment_workflow_id,
                        comment: 'Массовое одобрение'
                    })
                }
                message.success(`Одобрено платежей: ${selectedRows.length}`)
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

    return (<>
            <DataTable<ApprovalItem>
                title="Согласование платежей"
                subtitle="Платежи, ожидающие вашего согласования"
                dataSource={approvalsData?.data ?? []}
                columns={columns}
                loading={isLoading}
                total={approvalsData?.count || 0}

                // Filtering
                filterFields={filterFields}
                filters={filters}
                onFiltersChange={(newFilters) => {
                    setFilters(newFilters)
                    setCurrentPage(1)
                }}
                defaultFiltersCollapsed

                // Actions
                onRefresh={() => void refetch()}
                bulkActions={bulkActions}

                // Export
                exportable
                exportFilename="approvals"
                onExport={handleExport}

                // Header badge
                headerActions={
                    <Badge count={approvalsData?.count || 0} showZero>
                        <Tag icon={<ClockCircleOutlined/>} color="processing">
                            Ожидают решения
                        </Tag>
                    </Badge>
                }

                // Pagination
                pagination={{
                    current: currentPage,
                    pageSize: pageSize,
                    total: approvalsData?.count || 0,
                    onChange: (page, size) => {
                        setCurrentPage(page)
                        setPageSize(size || 20)
                    },
                }}

                // Selection and responsiveness
                selectable
                multiSelect
                responsive
                emptyText="Нет платежей на согласовании"

                // Table layout
                scroll={{x: 'max-content'}}
                tableLayout="auto"
            />

            {/* Drawer с деталями */}
            <Drawer
                title={`Детали платежа ${selectedApproval?.invoice?.invoice_number || ''}`}
                placement="right"
                width={720}
                open={drawerVisible}
                onClose={() => {
                    setDrawerVisible(false)
                    setSelectedApproval(null)
                }}
                extra={
                    <Space>
                        <Button
                            type="primary"
                            icon={<CheckOutlined/>}
                            onClick={() => handleApprove(selectedApproval)}
                        >
                            Одобрить
                        </Button>
                        <Button
                            danger
                            icon={<CloseOutlined/>}
                            onClick={() => {
                                setDrawerVisible(false)
                                handleReject(selectedApproval)
                            }}
                        >
                            Отклонить
                        </Button>
                    </Space>
                }
            >
                {selectedApproval && (
                    <Space direction="vertical" style={{width: '100%'}} size="large">
                        {/* Информация о счете */}
                        <Card title="Информация о счете">
                            <Descriptions column={2}>
                                <Descriptions.Item label="Номер счета">
                                    {selectedApproval.invoice?.invoice_number || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Дата счета">
                                    {selectedApproval.payment_date ?
                                        dayjs(selectedApproval.payment_date).format('DD.MM.YYYY') : '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Поставщик">
                                    {selectedApproval.invoice?.supplier?.name || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Плательщик">
                                    {selectedApproval.invoice?.payer?.name || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Проект">
                                    {selectedApproval.invoice?.project?.name || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Тип счета">
                                    {selectedApproval.invoice?.invoice_type?.name || '—'}
                                </Descriptions.Item>
                                <Descriptions.Item label="Сумма" span={2}>
                                    <Text strong style={{fontSize: 18}}>
                                        {new Intl.NumberFormat('ru-RU', {
                                            style: 'currency',
                                            currency: 'RUB'
                                        }).format(selectedApproval.amount)}
                                    </Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Описание" span={2}>
                                    {selectedApproval.invoice?.description || '—'}
                                </Descriptions.Item>
                            </Descriptions>
                        </Card>

                        {/* Процесс согласования */}
                        <Card title="Процесс согласования">
                            <Space direction="vertical" style={{width: '100%'}}>
                                <Progress
                                    percent={Math.round((selectedApproval.stages_completed / selectedApproval.stages_total) * 100)}
                                    status="active"
                                    format={() => `Этап ${selectedApproval.stages_completed + 1} из ${selectedApproval.stages_total}`}
                                />
                                <Descriptions column={2}>
                                    <Descriptions.Item label="Текущий этап">
                                        <Tag color="processing">
                                            {selectedApproval.current_stage?.name || 'Неизвестный этап'}
                                        </Tag>
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Процесс">
                                        {selectedApproval.workflow?.name || '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Инициатор">
                                        {selectedApproval.started_by_user?.full_name ??
                                            selectedApproval.started_by_user?.email ?? '—'}
                                    </Descriptions.Item>
                                    <Descriptions.Item label="Дата подачи">
                                        {dayjs(selectedApproval.started_at).format('DD.MM.YYYY HH:mm')}
                                    </Descriptions.Item>
                                </Descriptions>
                            </Space>
                        </Card>

                        {/* История согласования */}
                        {selectedApproval.workflow_status && (
                            <Card title="История согласования">
                                <Timeline
                                    items={[
                                        // Начало - создание счета
                                        {
                                            color: 'gray',
                                            children: (
                                                <>
                                                    <Text
                                                        strong>Счет {selectedApproval.invoice?.invoice_number} создан</Text>
                                                    <br/>
                                                    {selectedApproval.invoice?.supplier?.name && (
                                                        <>
                                                            <Text
                                                                type="secondary">Поставщик: {selectedApproval.invoice.supplier.name}</Text>
                                                            <br/>
                                                        </>
                                                    )}
                                                    <Text type="secondary">
                                                        Сумма: {new Intl.NumberFormat('ru-RU', {
                                                        style: 'currency',
                                                        currency: 'RUB'
                                                    }).format(selectedApproval.amount)}
                                                    </Text>
                                                    <br/>
                                                    <Text type="secondary" style={{fontSize: 12}}>
                                                        {selectedApproval.payment_date ?
                                                            dayjs(selectedApproval.payment_date).format('DD.MM.YYYY HH:mm') :
                                                            'Дата не указана'}
                                                    </Text>
                                                </>
                                            ),
                                        },
                                        // Начало процесса согласования
                                        {
                                            color: 'green',
                                            children: (
                                                <>
                                                    <Text strong>Процесс согласования начат</Text>
                                                    <br/>
                                                    <Text type="secondary">
                                                        Инициатор: {selectedApproval.started_by_user?.full_name ??
                                                        selectedApproval.started_by_user?.email ?? 'Неизвестно'}
                                                    </Text>
                                                    <br/>
                                                    <Text type="secondary" style={{fontSize: 12}}>
                                                        {dayjs(selectedApproval.started_at).format('DD.MM.YYYY HH:mm')}
                                                    </Text>
                                                </>
                                            ),
                                        },
                                        // История согласования из approval_progress
                                        ...(selectedApproval.approval_progress?.map((progress) => ({
                                            color: progress.action === 'approved' ? 'green' as const : 'red' as const,
                                            children: (
                                                <>
                                                    <Text strong>
                                                        {progress.action === 'approved' ?
                                                            `Этап "${progress.stage_name}" одобрен` :
                                                            `Этап "${progress.stage_name}" отклонен`}
                                                    </Text>
                                                    <br/>
                                                    <Text type="secondary">
                                                        {progress.action === 'approved' ? 'Одобрил: ' : 'Отклонил: '}
                                                        {progress.approver?.full_name ?? progress.approver?.email ?? 'Неизвестно'}
                                                    </Text>
                                                    {(progress.comment ?? progress.reason) && (
                                                        <>
                                                            <br/>
                                                            <Text type="secondary" italic>
                                                                {progress.action === 'approved' ? 'Комментарий: ' : 'Причина: '}
                                                                {progress.comment ?? progress.reason}
                                                            </Text>
                                                        </>
                                                    )}
                                                    <br/>
                                                    <Text type="secondary" style={{fontSize: 12}}>
                                                        {progress.approved_at ?
                                                            dayjs(progress.approved_at).format('DD.MM.YYYY HH:mm') :
                                                            progress.rejected_at ?
                                                                dayjs(progress.rejected_at).format('DD.MM.YYYY HH:mm') :
                                                                'Время не указано'}
                                                    </Text>
                                                </>
                                            ),
                                        })) || []),
                                        // Текущий этап
                                        {
                                            color: 'blue',
                                            children: (
                                                <>
                                                    <Text strong>Текущий
                                                        этап: {selectedApproval.current_stage?.name}</Text>
                                                    <br/>
                                                    <Text type="secondary">Ожидает вашего решения</Text>
                                                </>
                                            ),
                                        },
                                    ]}
                                />
                            </Card>
                        )}
                    </Space>
                )}
            </Drawer>

            {/* Модальное окно отклонения */}
            <Modal
                title="Отклонение платежа"
                open={rejectModalVisible}
                onOk={handleConfirmReject}
                onCancel={() => {
                    setRejectModalVisible(false)
                    rejectForm.resetFields()
                }}
                confirmLoading={rejectPaymentMutation.isPending}
                okText="Отклонить"
                cancelText="Отмена"
                okButtonProps={{danger: true}}
            >
                <Form form={rejectForm} layout="vertical">
                    <Form.Item label="Счет">
                        <Input value={selectedApproval?.invoice?.invoice_number || ''} disabled/>
                    </Form.Item>
                    <Form.Item label="Сумма">
                        <Input
                            value={new Intl.NumberFormat('ru-RU', {
                                style: 'currency',
                                currency: 'RUB'
                            }).format(selectedApproval?.amount || 0)}
                            disabled
                        />
                    </Form.Item>
                    <Form.Item
                        name="reason"
                        label="Причина отклонения"
                        rules={[{required: true, message: 'Укажите причину отклонения'}]}
                    >
                        <TextArea
                            rows={3}
                            placeholder="Укажите причину отклонения платежа..."
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    )
}

export default ApprovalsPage