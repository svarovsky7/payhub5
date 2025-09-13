/**
 * Страница информации о типах платежей
 */

import React from 'react'
import {Alert, Card, Space, Table, Tag, Typography} from 'antd'
import {
    DollarOutlined,
    InfoCircleOutlined
} from '@ant-design/icons'
import {PaymentType, PaymentTypeColors, PaymentTypeLabels} from '../../types/payment'

const {Title, Text, Paragraph} = Typography

export const PaymentTypesInfoPage: React.FC = () => {
    // Данные для таблицы типов платежей
    const paymentTypesData = [
        {
            key: PaymentType.ADV,
            code: PaymentType.ADV,
            name: PaymentTypeLabels[PaymentType.ADV],
            description: 'Предварительная оплата за товары или услуги до их получения',
            usage: 'Используется при внесении предоплаты поставщикам или подрядчикам'
        },
        {
            key: PaymentType.RET,
            code: PaymentType.RET,
            name: PaymentTypeLabels[PaymentType.RET],
            description: 'Возврат ранее удержанных средств (гарантийные удержания, штрафы и т.д.)',
            usage: 'Применяется при возврате гарантийных сумм после выполнения всех обязательств'
        },
        {
            key: PaymentType.DEBT,
            code: PaymentType.DEBT,
            name: PaymentTypeLabels[PaymentType.DEBT],
            description: 'Оплата существующей задолженности по счетам',
            usage: 'Стандартный тип платежа для погашения выставленных счетов'
        }
    ]

    const columns = [
        {
            title: 'Код',
            dataIndex: 'code',
            key: 'code',
            width: 100,
            render: (code: PaymentType) => (
                <Tag color={PaymentTypeColors[code]} style={{fontFamily: 'monospace'}}>
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

    return (
        <Card
            title={
                <Space>
                    <DollarOutlined/>
                    <Title level={4} style={{margin: 0}}>
                        Типы платежей
                    </Title>
                </Space>
            }
        >
            <Alert
                message="Информация о типах платежей"
                description="Каждый платеж в системе должен быть классифицирован по одному из типов. Это позволяет правильно учитывать движение денежных средств и формировать отчетность."
                type="info"
                showIcon
                icon={<InfoCircleOutlined/>}
                style={{marginBottom: 24}}
            />

            <Table
                dataSource={paymentTypesData}
                columns={columns}
                pagination={false}
                bordered
            />

            <Card style={{marginTop: 24}} type="inner">
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

            <Card style={{marginTop: 16}} type="inner" title="SQL-миграция для базы данных">
                <Paragraph>
                    <Text type="secondary">
                        Для добавления типов платежей в существующую базу данных выполните следующий SQL-скрипт:
                    </Text>
                </Paragraph>
                <pre style={{
                    background: '#f5f5f5',
                    padding: 16,
                    borderRadius: 4,
                    overflow: 'auto',
                    fontSize: 12
                }}>
{`-- Создание типа для типов платежей
CREATE TYPE payment_type AS ENUM ('ADV', 'RET', 'DEBT');

-- Добавление колонки payment_type в таблицу payments
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS payment_type payment_type;

-- Обновление существующих записей (по умолчанию ставим DEBT)
UPDATE payments 
SET payment_type = 'DEBT'
WHERE payment_type IS NULL;

-- Делаем поле обязательным
ALTER TABLE payments 
ALTER COLUMN payment_type SET NOT NULL;

-- Добавляем комментарии
COMMENT ON TYPE payment_type IS 'Типы платежей: ADV - аванс, RET - возврат удержаний, DEBT - погашение долга';
COMMENT ON COLUMN payments.payment_type IS 'Тип платежа';

-- Создаем индекс для быстрой фильтрации
CREATE INDEX IF NOT EXISTS idx_payments_payment_type ON payments(payment_type);`}
        </pre>
            </Card>
        </Card>
    )
}

export default PaymentTypesInfoPage