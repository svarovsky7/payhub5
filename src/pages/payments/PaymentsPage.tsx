/**
 * Страница со списком всех платежей
 */

import React, {useMemo, useState} from 'react'
import {
    Button,
    DatePicker,
    Form,
    Input,
    message,
    Modal,
    Space,
    Tag,
    Typography,
} from 'antd'
import {
    PageContainer,
    ProCard,
    ProColumns,
    ProTable,
} from '@ant-design/pro-components'
import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    ExportOutlined,
    FileTextOutlined,
} from '@ant-design/icons'
import {useNavigate} from 'react-router-dom'
import {useQuery, useQueryClient} from '@tanstack/react-query'
import {MoneyCell} from '../../components/MoneyCell'
import {StatusTag} from '../../components/StatusTag'
import {formatDate} from '../../utils/format'
import {PaymentQueryService} from '../../services/payments'
import {queryKeys} from '../../services/hooks/queryKeys'
import {useCancelPayment, useConfirmPayment} from '../../services/hooks/usePayments'
import {useAuthStore} from '../../models/auth'

const {Title, Text} = Typography
const {RangePicker} = DatePicker

interface PaymentsPageProps {
    userId: string
    companyId: string
}

export const PaymentsPage: React.FC<PaymentsPageProps> = ({userId, companyId}) => {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const {profile} = useAuthStore()
    const [loading, setLoading] = useState(false)
    const [filters, setFilters] = useState<any>({})
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
    const [confirmModalVisible, setConfirmModalVisible] = useState(false)
    const [cancelModalVisible, setCancelModalVisible] = useState(false)
    const [selectedPayment, setSelectedPayment] = useState<any>(null)
    const [cancelReason, setCancelReason] = useState('')

    // Mutations
    const confirmPaymentMutation = useConfirmPayment()
    const cancelPaymentMutation = useCancelPayment()

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

        return baseFilters
    }, [filters, profile])

    // Загрузка данных платежей с информацией о счетах
    const {data: paymentsData, isLoading, refetch} = useQuery({
        queryKey: queryKeys.payments.list(enhancedFilters),
        queryFn: async () => {
            console.log('[PaymentsPage] Загрузка платежей с фильтрами:', enhancedFilters)
            const result = await PaymentQueryService.getListWithInvoices(enhancedFilters)
            console.log('[PaymentsPage] Загружено платежей:', result.data?.length || 0)
            return result
        },
        staleTime: 30000,
    })

    const handleConfirmPayment = async () => {
        if (!selectedPayment) {
            return
        }

        try {
            await confirmPaymentMutation.mutateAsync(selectedPayment.id)
            message.success('Платеж подтвержден')
            setConfirmModalVisible(false)
            setSelectedPayment(null)
            void refetch()
        } catch (error) {
            console.error('[PaymentsPage] Ошибка подтверждения платежа:', error)
        }
    }

    const handleCancelPayment = async () => {
        if (!selectedPayment || !cancelReason) {
            message.error('Укажите причину отмены')
            return
        }

        try {
            await cancelPaymentMutation.mutateAsync({
                id: selectedPayment.id,
                reason: cancelReason
            })
            message.success('Платеж отменен')
            setCancelModalVisible(false)
            setSelectedPayment(null)
            setCancelReason('')
            void refetch()
        } catch (error) {
            console.error('[PaymentsPage] Ошибка отмены платежа:', error)
        }
    }

    const handleExport = async () => {
        try {
            setLoading(true)
            await PaymentQueryService.exportToExcel(filters)
            message.success('Данные экспортированы')
        } catch (error) {
            message.error('Ошибка экспорта данных')
        } finally {
            setLoading(false)
        }
    }

    const columns: ProColumns[] = [
        {
            title: 'Референс',
            dataIndex: 'reference',
            key: 'reference',
            // width: 150,
            fixed: 'left',
            render: (text, record: any) => (<a onClick={() => void navigate(`/payments/${record.id}`)}>
                    {text}
                </a>
            ),
        },
        {
            title: 'Внутренний №',
            dataIndex: 'internal_number',
            key: 'internal_number',
            // width: 280,
            render: (text) => text || '—',
        },
        {
            title: 'Дата платежа',
            dataIndex: 'payment_date',
            key: 'payment_date',
            // width: 120,
            valueType: 'date',
            render: (_, record) => formatDate(record.payment_date),
            sorter: true,
        },
        {
            title: 'Счет',
            dataIndex: ['invoice', 'invoice_number'],
            key: 'invoice_number',
            // width: 150,
            render: (text, record: any) => (<Space>
                    <FileTextOutlined/>
                    <a onClick={() => void navigate(`/invoices/${record.invoice_id}`)}>
                        {record.invoice?.invoice_number || '-'}
                    </a>
                </Space>
            ),
        },
        {
            title: 'Поставщик',
            dataIndex: ['invoice', 'supplier', 'name'],
            key: 'supplier_name',
            // width: 200,
            ellipsis: true,
            render: (_, record: any) => record.invoice?.supplier?.name || '-',
        },
        {
            title: 'Плательщик',
            dataIndex: ['invoice', 'payer', 'name'],
            key: 'payer_name',
            // width: 200,
            ellipsis: true,
            render: (_, record: any) => record.invoice?.payer?.name || '-',
        },
        {
            title: 'Сумма платежа',
            dataIndex: 'amount',
            key: 'amount',
            // width: 150,
            align: 'right',
            render: (text, record: any) => (
                <MoneyCell
                    amount={text}
                    currency={record.invoice?.currency || 'RUB'}
                />
            ),
            sorter: true,
        },
        {
            title: 'Сумма счета',
            dataIndex: ['invoice', 'total_amount'],
            key: 'invoice_amount',
            // width: 150,
            align: 'right',
            render: (_, record: any) => (
                <MoneyCell
                    amount={record.invoice?.total_amount || 0}
                    currency={record.invoice?.currency || 'RUB'}
                />
            ),
        },
        {
            title: 'Статус',
            dataIndex: 'status',
            key: 'status',
            // width: 120,
            filters: [
                {text: 'Ожидает', value: 'pending'},
                {text: 'Подтвержден', value: 'completed'},
                {text: 'Отменен', value: 'cancelled'},
            ],
            render: (text) => <StatusTag status={text} type="payment"/>,
        },
        {
            title: 'Комментарий',
            dataIndex: 'comment',
            key: 'comment',
            // width: 200,
            ellipsis: true,
            render: (text) => text || '-',
        },
        {
            title: 'Создан',
            dataIndex: 'created_at',
            key: 'created_at',
            // width: 150,
            valueType: 'dateTime',
            render: (_, record) => formatDate(record.created_at),
            sorter: true,
        },
        {
            title: 'Действия',
            key: 'actions',
            // width: 200,
            fixed: 'right',
            render: (_, record: any) => (<Space>
                    {record.status === 'pending' && (
                        <>
                            <Button
                                type="link"
                                size="small"
                                icon={<CheckCircleOutlined/>}
                                onClick={() => {
                                    setSelectedPayment(record)
                                    setConfirmModalVisible(true)
                                }}
                            >
                                Подтвердить
                            </Button>
                            <Button
                                type="link"
                                size="small"
                                danger
                                icon={<CloseCircleOutlined/>}
                                onClick={() => {
                                    setSelectedPayment(record)
                                    setCancelModalVisible(true)
                                }}
                            >
                                Отменить
                            </Button>
                        </>
                    )}
                    {record.status === 'completed' && (
                        <Tag color="success">Подтвержден</Tag>
                    )}
                    {record.status === 'cancelled' && (
                        <Tag color="error">Отменен</Tag>
                    )}
                </Space>
            ),
        },
    ]

    // Статистика по платежам
    const stats = React.useMemo(() => {
        const payments = paymentsData?.data ?? []
        const total = payments.length
        const totalAmount = payments.reduce((sum, p) => sum + (p.total_amount || 0), 0)
        const pending = payments.filter(p => p.status === 'pending').length
        const completed = payments.filter(p => p.status === 'completed').length
        const cancelled = payments.filter(p => p.status === 'cancelled').length

        return {
            total,
            totalAmount,
            pending,
            completed,
            cancelled,
        }
    }, [paymentsData])

    return (<PageContainer
            title="Платежи"
            extra={[
                <Button
                    key="export"
                    icon={<ExportOutlined/>}
                    onClick={() => void handleExport()}
                    loading={loading}
                >
                    Экспорт
                </Button>,
            ]}
        >
            {/* Статистика */}
            <ProCard.Group style={{marginBottom: 16}}>
                <ProCard>
                    <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: 24, fontWeight: 'bold'}}>
                            {stats.total}
                        </div>
                        <div style={{color: '#999'}}>Всего платежей</div>
                    </div>
                </ProCard>
                <ProCard>
                    <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: 24, fontWeight: 'bold', color: '#1890ff'}}>
                            {stats.totalAmount.toLocaleString()} ₽
                        </div>
                        <div style={{color: '#999'}}>Общая сумма</div>
                    </div>
                </ProCard>
                <ProCard>
                    <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: 24, fontWeight: 'bold', color: '#faad14'}}>
                            {stats.pending}
                        </div>
                        <div style={{color: '#999'}}>Ожидают подтверждения</div>
                    </div>
                </ProCard>
                <ProCard>
                    <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: 24, fontWeight: 'bold', color: '#52c41a'}}>
                            {stats.completed}
                        </div>
                        <div style={{color: '#999'}}>Подтверждены</div>
                    </div>
                </ProCard>
                <ProCard>
                    <div style={{textAlign: 'center'}}>
                        <div style={{fontSize: 24, fontWeight: 'bold', color: '#ff4d4f'}}>
                            {stats.cancelled}
                        </div>
                        <div style={{color: '#999'}}>Отменены</div>
                    </div>
                </ProCard>
            </ProCard.Group>

            {/* Таблица платежей */}
            <ProTable
                columns={columns}
                dataSource={paymentsData?.data ?? []}
                loading={isLoading}
                rowKey="id"
                search={{
                    labelWidth: 'auto',
                    filterType: 'light',
                }}
                pagination={{
                    defaultPageSize: 20,
                    showSizeChanger: true,
                    showTotal: (total) => `Всего: ${total}`,
                }}
                scroll={{x: 1500}}
                rowSelection={{
                    selectedRowKeys,
                    onChange: setSelectedRowKeys,
                }}
                toolbar={{
                    title: 'Список платежей',
                }}
                onChange={(pagination, filters, sorter) => {
                    console.log('[PaymentsPage] Изменение фильтров:', {pagination, filters, sorter})
                    setFilters({...filters, ...pagination})
                }}
            />

            {/* Модалка подтверждения платежа */}
            <Modal
                title="Подтвердить платеж"
                open={confirmModalVisible}
                onOk={handleConfirmPayment}
                onCancel={() => {
                    setConfirmModalVisible(false)
                    setSelectedPayment(null)
                }}
                confirmLoading={confirmPaymentMutation.isPending}
            >
                <p>
                    Вы уверены, что хотите подтвердить платеж{' '}
                    <strong>{selectedPayment?.reference}</strong> на сумму{' '}
                    <strong>
                        {selectedPayment?.total_amount.toLocaleString()} {selectedPayment?.invoice?.currency || 'RUB'}
                    </strong>?
                </p>
            </Modal>

            {/* Модалка отмены платежа */}
            <Modal
                title="Отменить платеж"
                open={cancelModalVisible}
                onOk={handleCancelPayment}
                onCancel={() => {
                    setCancelModalVisible(false)
                    setSelectedPayment(null)
                    setCancelReason('')
                }}
                confirmLoading={cancelPaymentMutation.isPending}
            >
                <p>
                    Вы уверены, что хотите отменить платеж{' '}
                    <strong>{selectedPayment?.reference}</strong>?
                </p>
                <Form.Item
                    label="Причина отмены"
                    required
                >
                    <Input.TextArea
                        value={cancelReason}
                        onChange={(_e) => setCancelReason(e.target.value)}
                        placeholder="Укажите причину отмены платежа"
                        rows={3}
                    />
                </Form.Item>
            </Modal>
        </PageContainer>
    )
}

export default PaymentsPage