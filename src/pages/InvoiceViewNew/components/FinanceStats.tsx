import React from 'react'
import { Card, Col, Row, Statistic, Typography, Divider } from 'antd'
import {
  DollarOutlined,
  RiseOutlined,
  FallOutlined,
  BankOutlined,
  CreditCardOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import type { FinancialSummary } from '../types'

const { Text } = Typography

interface FinanceStatsProps {
  summary: FinancialSummary
  currency?: string
}

export const FinanceStats: React.FC<FinanceStatsProps> = ({ summary, currency = 'RUB' }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const getBalanceIcon = () => {
    if (summary.balance > 0) {
      return <FallOutlined style={{ color: '#faad14' }} />
    } else if (summary.balance === 0) {
      return <BankOutlined style={{ color: '#52c41a' }} />
    }
    return <RiseOutlined style={{ color: '#52c41a' }} />
  }

  const getBalanceColor = () => {
    if (summary.balance > 0) return '#faad14'
    return '#52c41a'
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DollarOutlined style={{ fontSize: 20, color: '#1890ff' }} />
          <span>Финансовая информация</span>
        </div>
      }
      style={{ marginBottom: 16 }}
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Statistic
            title="Сумма без НДС"
            value={summary.amountNet}
            formatter={(value) => formatCurrency(Number(value))}
            prefix={<DollarOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Statistic
            title="НДС"
            value={summary.vatAmount}
            formatter={(value) => formatCurrency(Number(value))}
            prefix={<DollarOutlined />}
          />
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Statistic
            title="Общая сумма"
            value={summary.totalAmount}
            formatter={(value) => formatCurrency(Number(value))}
            prefix={<DollarOutlined />}
            valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
          />
        </Col>
      </Row>

      <Divider />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Statistic
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <CreditCardOutlined style={{ color: '#52c41a' }} />
                Оплачено
              </span>
            }
            value={summary.paidAmount}
            formatter={(value) => formatCurrency(Number(value))}
            valueStyle={{ color: '#52c41a' }}
          />
          {summary.totalAmount > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {((summary.paidAmount / summary.totalAmount) * 100).toFixed(1)}% от общей суммы
            </Text>
          )}
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Statistic
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <ClockCircleOutlined style={{ color: '#1890ff' }} />
                В обработке
              </span>
            }
            value={summary.pendingAmount}
            formatter={(value) => formatCurrency(Number(value))}
            valueStyle={{ color: '#1890ff' }}
          />
          {summary.totalAmount > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {((summary.pendingAmount / summary.totalAmount) * 100).toFixed(1)}% от общей суммы
            </Text>
          )}
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Statistic
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {getBalanceIcon()}
                Остаток к оплате
              </span>
            }
            value={summary.balance}
            formatter={(value) => formatCurrency(Number(value))}
            valueStyle={{ color: getBalanceColor(), fontWeight: 'bold' }}
          />
          {summary.totalAmount > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {((summary.balance / summary.totalAmount) * 100).toFixed(1)}% от общей суммы
            </Text>
          )}
        </Col>
      </Row>
    </Card>
  )
}