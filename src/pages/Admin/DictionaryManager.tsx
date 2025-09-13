/**
 * Dictionary management component for Admin page
 */

import React, {useState} from 'react'
import {
    Button,
    Card,
    Col,
    DatePicker,
    Form,
    Input,
    InputNumber,
    message,
    Modal,
    Popconfirm,
    Row,
    Select,
    Space,
    Statistic,
    Switch,
    Table,
    Tabs,
    Tag,
    Typography
} from 'antd'
import {
    BankOutlined,
    CalendarOutlined,
    DeleteOutlined,
    DollarOutlined,
    EditOutlined,
    EnvironmentOutlined,
    FileTextOutlined,
    PlusOutlined,
    ProjectOutlined,
    ShoppingCartOutlined,
    TeamOutlined
} from '@ant-design/icons'
import type {ColumnsType} from 'antd/es/table'
import dayjs from 'dayjs'

const {Text, Title} = Typography
const {TextArea} = Input

// Dictionary types definition
const DICTIONARIES = {
    payment_terms: {
        name: 'Условия оплаты',
        icon: <CalendarOutlined/>,
        description: 'Стандартные условия оплаты для договоров',
        fields: [
            {key: 'name', label: 'Название', type: 'text', required: true},
            {key: 'days', label: 'Количество дней', type: 'number', required: true},
            {
                key: 'type',
                label: 'Тип',
                type: 'select',
                options: ['Предоплата', 'Постоплата', 'По факту'],
                required: true
            },
            {key: 'discount_percent', label: 'Скидка %', type: 'number', required: false},
            {key: 'penalty_percent', label: 'Пени %', type: 'number', required: false},
            {key: 'description', label: 'Описание', type: 'textarea', required: false},
            {key: 'is_default', label: 'По умолчанию', type: 'switch', required: false}
        ]
    },
    cost_centers: {
        name: 'Центры затрат',
        icon: <BankOutlined/>,
        description: 'Центры финансовой ответственности',
        fields: [
            {key: 'name', label: 'Название', type: 'text', required: true},
            {key: 'code', label: 'Код ЦЗ', type: 'text', required: true},
            {key: 'responsible_person', label: 'Ответственный', type: 'select', required: true},
            {key: 'budget_year', label: 'Годовой бюджет', type: 'number', required: false},
            {key: 'budget_quarter', label: 'Квартальный бюджет', type: 'number', required: false},
            {key: 'is_active', label: 'Активен', type: 'switch', required: false}
        ]
    },
    expense_categories: {
        name: 'Категории расходов',
        icon: <ShoppingCartOutlined/>,
        description: 'Классификация расходов компании',
        fields: [
            {key: 'name', label: 'Название', type: 'text', required: true},
            {key: 'code', label: 'Код категории', type: 'text', required: true},
            {key: 'parent_category', label: 'Родительская категория', type: 'select', required: false},
            {key: 'account_code', label: 'Счет учета', type: 'text', required: false},
            {key: 'vat_rate', label: 'Ставка НДС %', type: 'select', options: ['0', '10', '20'], required: false},
            {key: 'requires_approval', label: 'Требует согласования', type: 'switch', required: false},
            {key: 'max_amount', label: 'Макс. сумма без согласования', type: 'number', required: false},
            {key: 'is_active', label: 'Активна', type: 'switch', required: false}
        ]
    },
    banks: {
        name: 'Банки',
        icon: <BankOutlined/>,
        description: 'Справочник банков для платежей',
        fields: [
            {key: 'name', label: 'Название банка', type: 'text', required: true},
            {key: 'bic', label: 'БИК', type: 'text', required: true},
            {key: 'correspondent_account', label: 'Корр. счет', type: 'text', required: true},
            {key: 'swift', label: 'SWIFT код', type: 'text', required: false},
            {key: 'city', label: 'Город', type: 'text', required: false},
            {key: 'is_active', label: 'Активен', type: 'switch', required: false}
        ]
    },
    document_templates: {
        name: 'Шаблоны документов',
        icon: <FileTextOutlined/>,
        description: 'Шаблоны для генерации документов',
        fields: [
            {key: 'name', label: 'Название шаблона', type: 'text', required: true},
            {
                key: 'type',
                label: 'Тип документа',
                type: 'select',
                options: ['Счет', 'Акт', 'Договор', 'Накладная'],
                required: true
            },
            {key: 'version', label: 'Версия', type: 'text', required: true},
            {key: 'file_path', label: 'Путь к файлу', type: 'text', required: false},
            {key: 'variables', label: 'Переменные', type: 'textarea', required: false},
            {key: 'is_default', label: 'По умолчанию', type: 'switch', required: false},
            {key: 'is_active', label: 'Активен', type: 'switch', required: false}
        ]
    },
    locations: {
        name: 'Локации',
        icon: <EnvironmentOutlined/>,
        description: 'Адреса и местоположения',
        fields: [
            {key: 'name', label: 'Название', type: 'text', required: true},
            {
                key: 'type',
                label: 'Тип',
                type: 'select',
                options: ['Офис', 'Склад', 'Производство', 'Магазин'],
                required: true
            },
            {key: 'address', label: 'Адрес', type: 'text', required: true},
            {key: 'city', label: 'Город', type: 'text', required: true},
            {key: 'postal_code', label: 'Индекс', type: 'text', required: false},
            {key: 'contact_person', label: 'Контактное лицо', type: 'select', required: false},
            {key: 'phone', label: 'Телефон', type: 'text', required: false},
            {key: 'working_hours', label: 'Часы работы', type: 'text', required: false},
            {key: 'is_active', label: 'Активна', type: 'switch', required: false}
        ]
    },
    vat_rates: {
        name: 'Ставки НДС',
        icon: <DollarOutlined/>,
        description: 'Налоговые ставки',
        fields: [
            {key: 'name', label: 'Название', type: 'text', required: true},
            {key: 'rate', label: 'Ставка %', type: 'number', required: true},
            {key: 'code', label: 'Код', type: 'text', required: true},
            {key: 'account_code', label: 'Счет учета НДС', type: 'text', required: false},
            {key: 'description', label: 'Описание', type: 'textarea', required: false},
            {key: 'effective_date', label: 'Дата начала действия', type: 'date', required: false},
            {key: 'is_default', label: 'По умолчанию', type: 'switch', required: false},
            {key: 'is_active', label: 'Активна', type: 'switch', required: false}
        ]
    }
}

interface DictionaryManagerProps {
    dictionaryType?: keyof typeof DICTIONARIES
    companyId: string
}

interface DictionaryItem {
    id: string

    [key: string]: any
}

export const DictionaryManager: React.FC<DictionaryManagerProps> = ({
                                                                        dictionaryType: initialType, companyId
                                                                    }) => {
    const [selectedDictionary, setSelectedDictionary] = useState<keyof typeof DICTIONARIES | null>(
        initialType ?? null
    )
    const [data, setData] = useState<Record<string, DictionaryItem[]>>({})
    const [isModalVisible, setIsModalVisible] = useState(false)
    const [editingItem, setEditingItem] = useState<DictionaryItem | null>(null)
    const [form] = Form.useForm()

    // Data will be loaded from database
    React.useEffect(() => {
        // Initialize with empty data
        void setData({})
    }, [])

    const handleAdd = () => {
        setEditingItem(null)
        form.resetFields()
        setIsModalVisible(true)
    }

    const handleEdit = (item: DictionaryItem) => {
        setEditingItem(item)
        form.setFieldsValue(item)
        setIsModalVisible(true)
    }

    const handleDelete = (id: string) => {
        if (!selectedDictionary) {
            return
        }

        const updatedData = data[selectedDictionary].filter(item => item.id !== id)
        setData({
            ...data,
            [selectedDictionary]: updatedData
        })
        message.success('Запись удалена')
    }

    const handleSave = async () => {
        try {
            const values = await form.validateFields()

            if (!selectedDictionary) {
                return
            }

            let updatedData: DictionaryItem[]

            if (editingItem) {
                updatedData = data[selectedDictionary]?.map(item =>
                    item.id === editingItem.id ? {...item, ...values} : item
                ) || []
            } else {
                const newItem: DictionaryItem = {
                    id: Date.now().toString(),
                    ...values
                }
                updatedData = [...(data[selectedDictionary] ?? []), newItem]
            }

            setData({
                ...data,
                [selectedDictionary]: updatedData
            })

            setIsModalVisible(false)
            message.success(editingItem ? 'Запись обновлена' : 'Запись добавлена')
        } catch (error) {
            console.error('Validation failed:', error)
        }
    }

    const renderFormField = (field: any) => {
        const commonProps = {
            name: field.key,
            label: field.label,
            rules: field.required ? [{required: true, message: `Введите ${field.label}`}] : []
        }

        switch (field.type) {
            case 'text':
                return <Form.Item {...commonProps}><Input/></Form.Item>
            case 'textarea':
                return <Form.Item {...commonProps}><TextArea rows={3}/></Form.Item>
            case 'number':
                return <Form.Item {...commonProps}><InputNumber style={{width: '100%'}}/></Form.Item>
            case 'select':
                return (<Form.Item {...commonProps}>
                        <Select>
                            {field.options?.map((opt: string) => (
                                <Select.Option key={opt} value={opt}>{opt}</Select.Option>
                            ))}
                        </Select>
                    </Form.Item>
                )
            case 'date':
                return <Form.Item {...commonProps}><DatePicker style={{width: '100%'}}/></Form.Item>
            case 'switch':
                return (
                    <Form.Item {...commonProps} valuePropName="checked">
                        <Switch/>
                    </Form.Item>
                )
            default:
                return null
        }
    }

    const generateColumns = (dictionary: keyof typeof DICTIONARIES): ColumnsType<DictionaryItem> => {
        const fields = DICTIONARIES[dictionary].fields
        const columns: ColumnsType<DictionaryItem> = fields.slice(0, 4).map(field => ({
            title: field.label, dataIndex: field.key, _key: field.key, render: (value: any) => {
                if (field.type === 'switch') {
                    return <Switch checked={value} disabled size="small"/>
                }
                if (field.type === 'number' && value) {
                    return new Intl.NumberFormat('ru-RU').format(value)
                }
                return value || '—'
            }
        }))

        columns.push({
            title: 'Действия', _key: 'actions', width: 120, render: (_, record) => (<Space size="small">
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined/>}
                        onClick={() => void handleEdit(record)}
                    />
                    <Popconfirm
                        title="Удалить запись?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Удалить"
                        cancelText="Отмена"
                    >
                        <Button
                            type="text"
                            size="small"
                            danger
                            icon={<DeleteOutlined/>}
                        />
                    </Popconfirm>
                </Space>
            )
        })

        return columns
    }

    const tabItems = Object.entries(DICTIONARIES).map(([key, dict]) => ({
        key,
        label: (
            <Space>
                {dict.icon}
                {dict.name}
            </Space>
        ),
        children: (
            <Card bordered={false}>
                <Space direction="vertical" style={{width: '100%'}} size="large">
                    <Row gutter={16}>
                        <Col span={16}>
                            <Text type="secondary">{dict.description}</Text>
                        </Col>
                        <Col span={8} style={{textAlign: 'right'}}>
                            <Statistic
                                title="Всего записей"
                                value={data[key]?.length || 0}
                            />
                        </Col>
                    </Row>

                    <Table
                        dataSource={data[key] ?? []}
                        columns={generateColumns(key as keyof typeof DICTIONARIES)}
                        rowKey="id"
                        size="small"
                        pagination={{pageSize: 10}}
                    />

                    <Button
                        type="primary"
                        icon={<PlusOutlined/>}
                        onClick={() => void handleAdd()}
                    >
                        Добавить запись
                    </Button>
                </Space>
            </Card>
        )
    }))

    return (<>
            <Tabs
                activeKey={selectedDictionary ?? undefined}
                onChange={(key) => setSelectedDictionary(key as keyof typeof DICTIONARIES)}
                items={tabItems}
            />

            <Modal
                title={editingItem ? 'Редактировать запись' : 'Добавить запись'}
                open={isModalVisible}
                onOk={handleSave}
                onCancel={() => setIsModalVisible(false)}
                okText="Сохранить"
                cancelText="Отмена"
                width={600}
            >
                <Form
                    form={form}
                    layout="vertical"
                >
                    {selectedDictionary && DICTIONARIES[selectedDictionary].fields.map(field =>
                        <React.Fragment key={field.key}>
                            {renderFormField(field)}
                        </React.Fragment>
                    )}
                </Form>
            </Modal>
        </>
    )
}

export default DictionaryManager