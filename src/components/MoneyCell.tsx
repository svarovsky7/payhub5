/**
 * MoneyCell - formatted money display with currency
 */

import React from 'react'
import { Typography } from 'antd'
import { formatCurrency } from '../utils/format'

const { Text } = Typography

interface MoneyCellProps {
  amount: number | null | undefined
  currency?: string
  showZero?: boolean
  precision?: number
  type?: 'default' | 'success' | 'warning' | 'danger' | 'secondary'
  size?: 'small' | 'default' | 'large'
  strong?: boolean
  className?: string
}

export const MoneyCell: React.FC<MoneyCellProps> = ({
  amount,
  currency = 'RUB',
  showZero = true,
  precision = 2,
  type = 'default',
  size = 'default',
  strong = false,
  className,
}) => {
  if (amount === null || amount === undefined) {
    return <Text type="secondary" className={className}>—</Text>
  }

  if (amount === 0 && !showZero) {
    return <Text type="secondary" className={className}>—</Text>
  }

  const textType = type === 'default' ? undefined : type

  return (
    <Text
      type={textType}
      strong={strong}
      className={className}
      style={{
        fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
        fontFamily: 'monospace',
      }}
    >
      {formatCurrency(amount, currency, precision)}
    </Text>
  )
}

interface MoneyWithVATProps {
  netAmount: number
  vatRate: number
  currency?: string
  layout?: 'vertical' | 'horizontal'
  showLabels?: boolean
}

export const MoneyWithVAT: React.FC<MoneyWithVATProps> = ({
  netAmount,
  vatRate,
  currency = 'RUB',
  layout = 'vertical',
  showLabels = true,
}) => {
  const vatAmount = netAmount * (vatRate / 100)
  const totalAmount = netAmount + vatAmount

  if (layout === 'horizontal') {
    return (
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <div>
          {showLabels && <Text type="secondary" style={{ fontSize: 12 }}>Без НДС: </Text>}
          <MoneyCell amount={netAmount} currency={currency} />
        </div>
        <div>
          {showLabels && <Text type="secondary" style={{ fontSize: 12 }}>НДС: </Text>}
          <MoneyCell amount={vatAmount} currency={currency} type="secondary" />
        </div>
        <div>
          {showLabels && <Text type="secondary" style={{ fontSize: 12 }}>Итого: </Text>}
          <MoneyCell amount={totalAmount} currency={currency} strong />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 4 }}>
        {showLabels && <Text type="secondary" style={{ fontSize: 12 }}>Без НДС: </Text>}
        <MoneyCell amount={netAmount} currency={currency} />
      </div>
      <div style={{ marginBottom: 4 }}>
        {showLabels && <Text type="secondary" style={{ fontSize: 12 }}>НДС ({vatRate}%): </Text>}
        <MoneyCell amount={vatAmount} currency={currency} type="secondary" />
      </div>
      <div>
        {showLabels && <Text type="secondary" style={{ fontSize: 12 }}>Итого: </Text>}
        <MoneyCell amount={totalAmount} currency={currency} strong />
      </div>
    </div>
  )
}

export default MoneyCell