/**
 * Enum list viewer component for Admin page
 * Read-only display of database enum types
 */

import React, {useState} from 'react'
import {
    Alert,
    Card,
    Space,
    Table,
    Tabs,
    Tag,
    Typography
} from 'antd'
import {
    DollarOutlined,
    InfoCircleOutlined
} from '@ant-design/icons'
import {usePaymentTypes, useCurrencies, usePriorities, EnumQueryService} from '../../services/hooks/useEnums'

const {Text, Title, Paragraph} = Typography

// Define all enum types matching database schema
// Database enum types from supabase/schemas/prod.sql
const ENUM_DEFINITIONS = {
    // Database type: priority_level
    priorityLevel: {
        name: 'Уровни приоритета',
        description: 'Приоритеты для счетов (priority_level)',
        items: [
            {value: 'low', label: 'Низкий', color: 'default', order: 1},
            {value: 'normal', label: 'Обычный', color: 'blue', order: 2},
            {value: 'high', label: 'Высокий', color: 'orange', order: 3},
            {value: 'urgent', label: 'Срочный', color: 'red', order: 4}
        ]
    },
    // Database type: currency_code (только 4 валюты согласно миграции)
    currencyCode: {
        name: 'Коды валют',
        description: 'Валютные коды ISO 4217 (currency_code)',
        items: [
            {value: 'RUB', label: '₽ Российский рубль', color: 'blue', order: 1},
            {value: 'USD', label: '$ Доллар США', color: 'green', order: 2},
            {value: 'EUR', label: '€ Евро', color: 'gold', order: 3},
            {value: 'CNY', label: '¥ Китайский юань', color: 'red', order: 4}
        ]
    }
}

interface EnumItem {
    value: string
    label: string
    color: string
    order: number
    isActive?: boolean
}

interface EnumEditorProps {
    enumType?: keyof typeof ENUM_DEFINITIONS
}

export const EnumEditor: React.FC<EnumEditorProps> = ({enumType: initialEnumType}) => {
    // Set default to first enum if not specified
    const defaultEnum = initialEnumType ?? Object.keys(ENUM_DEFINITIONS)[0] as keyof typeof ENUM_DEFINITIONS

    const [selectedEnum, setSelectedEnum] = useState<keyof typeof ENUM_DEFINITIONS | null>(defaultEnum)

    const columns = [
        {
            title: 'Значение',
            dataIndex: 'value',
            key: 'value',
            render: (text: string) => <Text code>{text}</Text>
        },
        {
            title: 'Название',
            dataIndex: 'label',
            key: 'label'
        },
        {
            title: 'Цвет',
            dataIndex: 'color',
            key: 'color',
            render: (color: string, record: EnumItem) => (
                <Tag color={color}>{record.label}</Tag>
            )
        },
        {
            title: 'Порядок',
            dataIndex: 'order',
            key: 'order',
            width: 100
        }
    ]

    // Данные для таблицы типов платежей
    const paymentTypesData = [
        {
            key: 'ADV',
            code: 'ADV',
            name: 'Аванс',
            description: 'Предварительная оплата за товары или услуги до их получения',
            usage: 'Используется при внесении предоплаты поставщикам или подрядчикам'
        },
        {
            key: 'RET',
            code: 'RET',
            name: 'Возврат удержаний',
            description: 'Возврат ранее удержанных средств (гарантийные удержания, штрафы и т.д.)',
            usage: 'Применяется при возврате гарантийных сумм после выполнения всех обязательств'
        },
        {
            key: 'DEBT',
            code: 'DEBT',
            name: 'Погашение долга',
            description: 'Оплата существующей задолженности по счетам',
            usage: 'Стандартный тип платежа для погашения выставленных счетов'
        }
    ]

    const paymentTypeColumns = [
        {
            title: 'Код',
            dataIndex: 'code',
            key: 'code',
            width: 100,
            render: (code: string) => (
                <Tag color={EnumQueryService.getPaymentTypeColor(code)} style={{fontFamily: 'monospace'}}>
                    {code}
                </Tag>
            )
        },
        {
            title: 'Название',
            dataIndex: 'name',
            key: 'name',
            render: (text: string) => <strong>{text}</strong>
        },
        {
            title: 'Описание',
            dataIndex: 'description',
            key: 'description'
        },
        {
            title: 'Использование',
            dataIndex: 'usage',
            key: 'usage'
        }
    ]

    const tabItems = [
        // Existing enum definitions
        ...Object.entries(ENUM_DEFINITIONS).map(([key, data]) => ({
            key,
            label: data.name,
            children: (
                <Card variant="borderless">
                    <Space direction="vertical" style={{width: '100%'}} size="large">
                        <Alert
                            message="Информация"
                            description="Это системные типы, заданные в базе данных. Они не подлежат редактированию через интерфейс администратора."
                            type="info"
                            icon={<InfoCircleOutlined/>}
                            showIcon
                        />

                        <Text type="secondary">{data.description}</Text>

                        <Table
                            dataSource={data.items}
                            columns={columns}
                            rowKey="value"
                            pagination={false}
                            size="small"
                        />
                    </Space>
                </Card>
            )
        })),
        // Payment Types tab
        {
            key: 'paymentTypes',
            label: (
                <Space>
                    <DollarOutlined/>
                    Типы платежей
                </Space>
            ),
            children: (
                <Card variant="borderless">
                    <Space direction="vertical" style={{width: '100%'}} size="large">
                        <Alert
                            message="Информация о типах платежей"
                            description="Каждый платеж в системе должен быть классифицирован по одному из типов. Это позволяет правильно учитывать движение денежных средств и формировать отчетность."
                            type="info"
                            showIcon
                            icon={<InfoCircleOutlined/>}
                        />

                        <Table
                            dataSource={paymentTypesData}
                            columns={paymentTypeColumns}
                            pagination={false}
                            bordered
                        />

                        <Card type="inner">
                            <Title level={5}>
                                <InfoCircleOutlined/> Дополнительная информация
                            </Title>
                            <Paragraph>
                                <Text strong>Обязательность указания типа:</Text> При создании нового платежа
                                обязательно необходимо указать его тип. Это требование системы для корректного
                                учета и отчетности.
                            </Paragraph>
                            <Paragraph>
                                <Text strong>Изменение типа:</Text> После создания платежа его тип может быть
                                изменен только администратором системы при наличии соответствующих прав доступа.
                            </Paragraph>
                            <Paragraph>
                                <Text strong>Отчетность:</Text> Типы платежей используются для формирования
                                аналитических отчетов и группировки платежей в финансовых документах.
                            </Paragraph>
                        </Card>
                    </Space>
                </Card>
            )
        }
    ]

    return (
        <Tabs
            activeKey={selectedEnum ?? Object.keys(ENUM_DEFINITIONS)[0]}
            onChange={(key) => {
                setSelectedEnum(key as keyof typeof ENUM_DEFINITIONS)
            }}
            items={tabItems}
        />
    )
}

export default EnumEditor