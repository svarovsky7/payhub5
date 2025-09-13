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
    Statistic,
    Tag
} from 'antd'
import {
    CalendarOutlined,
    CheckCircleOutlined,
    DeleteOutlined,
    DollarOutlined,
    EditOutlined,
    EyeOutlined,
    FileTextOutlined,
    MoreOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
    PlusOutlined,
    ProjectOutlined,
    SettingOutlined,
    TeamOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {useDeleteProject, useProjectsList, useUpdateProject} from '../../services/hooks/useProjects'
import {DataTable} from '../../components/table'
import type {BulkAction, DataTableColumn, FilterField} from '../../components/table'
import {
    DateCell,
    LinkCell,
    MoneyCell,
    ProgressCell,
    StatusCell,
    TextCell,
    UserCell
} from '../../components/table/TableCells'


interface Project {
    id: string
    name: string
    code: string
    description?: string
    status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled'
    start_date: string
    end_date: string
    estimated_end_date?: string
    budget: number
    spent_amount: number
    currency: string
    progress_percent: number
    manager?: {
        name: string
        email: string
        avatar?: string
    }
    location?: string
    client?: string
    category: 'residential' | 'commercial' | 'industrial' | 'infrastructure'
    contractor_count: number
    invoice_count: number
    payment_count: number
    created_at: string
    updated_at: string
    created_by?: {
        name: string
        email: string
    }
}

// Data will be loaded from database

const categoryConfig = {
    residential: {text: 'Жилое строительство', color: 'green'},
    commercial: {text: 'Коммерческое', color: 'blue'},
    industrial: {text: 'Промышленное', color: 'orange'},
    infrastructure: {text: 'Инфраструктура', color: 'purple'}
}

const ProjectsPage: React.FC = () => {
    const [filters, setFilters] = useState<Record<string, any>>({})
    const [pagination, setPagination] = useState({page: 1, limit: 50})

    // Hooks
    const {data: projectsData, isLoading, refetch} = useProjectsList(filters)
    const updateProjectMutation = useUpdateProject()
    const deleteProjectMutation = useDeleteProject()

    // Статистика
    const projects = projectsData?.data ?? []
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.status === 'in_progress').length
    const completedProjects = projects.filter(p => p.status === 'completed').length
    const totalBudget = projects.reduce((sum, project) => sum + project.budget, 0)
    const totalSpent = projects.reduce((sum, project) => sum + project.spent_amount, 0)

    // Handlers
    const handleView = (record: Project) => {
        // TODO: Navigate to project details
        message.info(`Просмотр проекта ${record.name}`)
    }

    const handleEdit = (record: Project) => {
        // TODO: Navigate to project edit
        message.info(`Редактирование проекта ${record.name}`)
    }

    const handleUpdateStatus = async (record: Project, newStatus: Project['status']) => {
        try {
            await updateProjectMutation.mutateAsync({
                id: record.id,
                data: {status: newStatus}
            })
            message.success('Статус проекта обновлен')
        } catch (error) {
            console.error('Update status error:', error)
        }
    }

    const handleDelete = async (record: Project) => {
        Modal.confirm({
            title: 'Удалить проект?',
            content: 'Это действие нельзя отменить',
            okText: 'Да',
            cancelText: 'Нет',
            onOk: async () => {
                try {
                    await deleteProjectMutation.mutateAsync(record.id)
                } catch (error) {
                    console.error('Delete error:', error)
                }
            }
        })
    }

    const handleExport = async (exportFilters?: any) => {
        // TODO: Implement project export
        message.info('Экспорт будет реализован')
    }

    // Get actions menu items for each record
    const getActionMenuItems = (record: Project) => {
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
                onClick: () => handleEdit(record),
            },
            {type: 'divider' as const},
        ]

        if (record.status === 'planning') {
            items.push({
                key: 'start',
                icon: <PlayCircleOutlined/>,
                label: 'Запустить проект',
                onClick: () => handleUpdateStatus(record, 'in_progress'),
            })
        }

        if (record.status === 'in_progress') {
            items.push({
                key: 'pause',
                icon: <PauseCircleOutlined/>,
                label: 'Приостановить',
                onClick: () => handleUpdateStatus(record, 'on_hold'),
            })
        }

        if (record.status === 'on_hold') {
            items.push({
                key: 'resume',
                icon: <PlayCircleOutlined/>,
                label: 'Возобновить',
                onClick: () => handleUpdateStatus(record, 'in_progress'),
            })
        }

        if (record.status === 'in_progress') {
            items.push({
                key: 'complete',
                icon: <CheckCircleOutlined/>,
                label: 'Завершить',
                onClick: () => handleUpdateStatus(record, 'completed'),
            })
        }

        items.push({type: 'divider' as const}, {
                key: 'settings', icon: <SettingOutlined/>, label: 'Настройки',
            }, {
                key: 'delete', icon: <DeleteOutlined/>, label: 'Удалить', danger: true, onClick: () => handleDelete(record),
            }
        )

        return items
    }

    const columns: DataTableColumn<Project>[] = [
        {
            title: 'Проект',
            dataIndex: 'name',
            key: 'name',
            width: 300,
            priority: 1,
            exportable: true,
            render: (text, record) => (<TextCell lines={[
                    <Space>
                        <LinkCell text={text} onClick={() => void handleView(record)}/>
                        <Tag color={categoryConfig[record.category]?.color || 'default'} size="small">
                            {categoryConfig[record.category]?.text ?? record.category}
                        </Tag>
                    </Space>,
                    `${record.code}${record.client ? ' • ' + record.client : ''}`,
                    record.location || ''
                ]}/>
            ),
        },
        {
            title: 'Статус',
            dataIndex: 'status',
            key: 'status',
            width: 120,
            priority: 2,
            exportable: true,
            render: (status) => <StatusCell status={status} type="project"/>,
        },
        {
            title: 'Прогресс',
            dataIndex: 'progress_percent',
            key: 'progress_percent',
            width: 100,
            priority: 3,
            exportable: true,
            mobile: false,
            sorter: true,
            render: (progress) => <ProgressCell percent={progress}/>,
        },
        {
            title: 'Бюджет',
            dataIndex: 'budget',
            key: 'budget',
            width: 180,
            align: 'right',
            priority: 4,
            exportable: true,
            mobile: false,
            sorter: true,
            render: (budget, record) => {
                const spentPercent = (record.spent_amount / budget) * 100
                return (
                    <TextCell lines={[
                        <MoneyCell amount={budget} currency={record.currency} strong/>,
                        `Потрачено: ${spentPercent.toFixed(0)}%`
                    ]}/>
                )
            },
        },
        {
            title: 'Руководитель',
            dataIndex: ['manager', 'name'],
            key: 'manager_name',
            width: 160,
            priority: 5,
            exportable: true,
            mobile: false,
            render: (_, record) => {
                if (!record.manager) {
                    return '—'
                }
                return (
                    <UserCell
                        user={{
                            name: record.manager.name,
                            email: record.manager.email,
                            avatar: record.manager.avatar
                        }}
                    />
                )
            },
        },
        {
            title: 'Сроки',
            dataIndex: 'end_date',
            key: 'end_date',
            width: 140,
            exportable: true,
            mobile: false,
            sorter: true,
            render: (endDate, record) => {
                const end = dayjs(endDate)
                const estimated = record.estimated_end_date ? dayjs(record.estimated_end_date) : null
                const isDelayed = estimated && estimated.isAfter(end) && record.status !== 'completed'
                const daysLeft = record.status !== 'completed' ? end.diff(dayjs(), 'day') : null

                const lines = [
                    <DateCell date={endDate} format="DD.MM.YYYY"/>
                ]

                if (isDelayed) {
                    lines.push(`Задержка до ${estimated.format('DD.MM.YYYY')}`)
                } else if (daysLeft !== null) {
                    lines.push(`${daysLeft} дней до дедлайна`)
                }

                return <TextCell lines={lines}/>
            },
        },
        {
            title: 'Операции',
            key: 'operations',
            width: 120,
            exportable: true,
            mobile: false,
            render: (_, record) => (
                <TextCell lines={[
                    `Контрагенты: ${record.contractor_count}`,
                    `Счета: ${record.invoice_count}`,
                    `Платежи: ${record.payment_count}`
                ]}/>
            ),
        },
        {
            title: 'Действия',
            key: 'actions',
            width: 60,
            fixed: 'right',
            render: (_, record) => (
                <Dropdown menu={{items: getActionMenuItems(record)}} trigger={['click']}>
                    <Button
                        type="text"
                        size="small"
                        icon={<MoreOutlined/>}
                    />
                </Dropdown>
            ),
        },
    ]

    // Filter fields
    const filterFields: FilterField[] = [
        {
            key: 'search',
            type: 'text',
            label: 'Поиск',
            placeholder: 'Название, код, клиент, локация...'
        },
        {
            key: 'status',
            type: 'multiSelect',
            label: 'Статус',
            options: [
                {value: 'planning', label: 'Планирование'},
                {value: 'in_progress', label: 'В работе'},
                {value: 'on_hold', label: 'Приостановлен'},
                {value: 'completed', label: 'Завершен'},
                {value: 'cancelled', label: 'Отменен'}
            ]
        },
        {
            key: 'category',
            type: 'multiSelect',
            label: 'Категория',
            options: [
                {value: 'residential', label: 'Жилое'},
                {value: 'commercial', label: 'Коммерческое'},
                {value: 'industrial', label: 'Промышленное'},
                {value: 'infrastructure', label: 'Инфраструктура'}
            ]
        },
        {
            key: 'date_range',
            type: 'dateRange',
            label: 'Период завершения'
        },
        {
            key: 'budget_range',
            type: 'numberRange',
            label: 'Бюджет'
        }
    ]

    // Bulk actions
    const bulkActions: BulkAction<Project>[] = [
        {
            key: 'export-selected',
            label: 'Экспортировать выбранные',
            icon: <FileTextOutlined/>,
            onClick: async (selectedRows) => {
                await handleExport({ids: selectedRows.map(row => row.id)})
            }
        },
        {
            key: 'start-selected',
            label: 'Запустить проекты',
            icon: <PlayCircleOutlined/>,
            disabled: (selectedRows) => !selectedRows.every(row => row.status === 'planning'),
            onClick: async (selectedRows) => {
                for (const row of selectedRows) {
                    if (row.status === 'planning') {
                        await handleUpdateStatus(row, 'in_progress')
                    }
                }
            }
        },
        {
            key: 'pause-selected',
            label: 'Приостановить проекты',
            icon: <PauseCircleOutlined/>,
            disabled: (selectedRows) => !selectedRows.every(row => row.status === 'in_progress'),
            onClick: async (selectedRows) => {
                for (const row of selectedRows) {
                    if (row.status === 'in_progress') {
                        await handleUpdateStatus(row, 'on_hold')
                    }
                }
            }
        }
    ]

    return (<div style={{padding: 24}}>
            {/* Статистика */}
            <Row gutter={16} style={{marginBottom: 24}}>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Всего проектов"
                            value={totalProjects}
                            prefix={<ProjectOutlined/>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Активных"
                            value={activeProjects}
                            valueStyle={{color: '#3f8600'}}
                            prefix={<CalendarOutlined/>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Завершено"
                            value={completedProjects}
                            valueStyle={{color: '#52c41a'}}
                            prefix={<CheckCircleOutlined/>}
                        />
                    </Card>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <Card>
                        <Statistic
                            title="Общий бюджет"
                            value={totalBudget}
                            precision={0}
                            valueStyle={{color: '#1890ff'}}
                            prefix={<DollarOutlined/>}
                            suffix="₽"
                        />
                    </Card>
                </Col>
            </Row>

            <DataTable<Project>
                title="Проекты"
                subtitle={`Всего проектов: ${totalProjects}`}
                dataSource={projects}
                columns={columns}
                loading={isLoading}
                total={projectsData?.total}

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
                exportFilename="projects"
                onExport={handleExport}

                // Header actions
                headerActions={
                    <Button
                        type="primary"
                        icon={<PlusOutlined/>}
                        onClick={() => message.info('Создание проекта будет реализовано')}
                    >
                        Новый проект
                    </Button>
                }

                // Pagination
                pagination={{
                    current: pagination.page,
                    pageSize: pagination.limit,
                    total: projectsData?.total || 0,
                    onChange: (page, pageSize) => {
                        setPagination({page, limit: pageSize || 50})
                    },
                }}

                // Selection and responsiveness
                selectable
                multiSelect
                responsive
                emptyText="Нет проектов"
            />
        </div>
    )
}

export default ProjectsPage