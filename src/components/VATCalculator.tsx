/**
 * VATCalculator - VAT calculation component
 */

import React, { useEffect, useState } from 'react'
import { Alert, Card, Divider, Form, InputNumber, Select, Space, Typography } from 'antd'
import { MoneyCell } from './MoneyCell'

const { Text, Title } = Typography

interface VATCalculatorProps {
  value?: {
    netAmount: number
    vatRate: number
    totalAmount: number
    vatAmount: number
  }
  onChange?: (value: {
    netAmount: number
    vatRate: number
    totalAmount: number
    vatAmount: number
  }) => void
  currency?: string
  defaultVatRate?: number
  disabled?: boolean
  precision?: number
}

const VAT_RATES = [
  { value: 0, label: 'Без НДС (0%)' },
  { value: 10, label: '10%' },
  { value: 20, label: '20%' },
]

export const VATCalculator: React.FC<VATCalculatorProps> = ({
  value,
  onChange,
  currency = 'RUB',
  defaultVatRate = 20,
  disabled = false,
  precision = 2,
}) => {
  const [mode, setMode] = useState<'net' | 'total'>('net')
  const [netAmount, setNetAmount] = useState<number>(value?.netAmount || 0)
  const [vatRate, setVatRate] = useState<number>(value?.vatRate || defaultVatRate)
  const [totalAmount, setTotalAmount] = useState<number>(value?.totalAmount || 0)

  // Calculate derived values
  const vatAmount = mode === 'net' 
    ? netAmount * (vatRate / 100)
    : totalAmount - (totalAmount / (1 + vatRate / 100))

  const calculatedTotal = mode === 'net' 
    ? netAmount + vatAmount
    : totalAmount

  const calculatedNet = mode === 'net' 
    ? netAmount
    : totalAmount / (1 + vatRate / 100)

  // Update parent component
  useEffect(() => {
    if (onChange) {
      onChange({
        netAmount: Number(calculatedNet.toFixed(precision)),
        vatRate,
        totalAmount: Number(calculatedTotal.toFixed(precision)),
        vatAmount: Number(vatAmount.toFixed(precision)),
      })
    }
  }, [calculatedNet, vatRate, calculatedTotal, vatAmount, onChange, precision])

  const handleNetAmountChange = (val: number | null) => {
    setNetAmount(val || 0)
    setMode('net')
  }

  const handleTotalAmountChange = (val: number | null) => {
    setTotalAmount(val || 0)
    setMode('total')
  }

  const handleVatRateChange = (val: number) => {
    setVatRate(val)
  }

  return (
    <Card size="small">
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={5} style={{ margin: 0 }}>Расчет НДС</Title>
        
        <Form layout="vertical" size="small">
          <Space wrap style={{ width: '100%' }}>
            <Form.Item label="Сумма без НДС" style={{ marginBottom: 8 }}>
              <InputNumber
                value={mode === 'net' ? netAmount : calculatedNet}
                onChange={handleNetAmountChange}
                placeholder="0.00"
                min={0}
                precision={precision}
                style={{ width: 150 }}
                disabled={disabled}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={(value) => value!.replace(/\s?/g, '')}
              />
            </Form.Item>

            <Form.Item label="Ставка НДС" style={{ marginBottom: 8 }}>
              <Select
                value={vatRate}
                onChange={handleVatRateChange}
                style={{ width: 120 }}
                disabled={disabled}
                options={VAT_RATES}
              />
            </Form.Item>

            <Form.Item label="Сумма с НДС" style={{ marginBottom: 8 }}>
              <InputNumber
                value={mode === 'total' ? totalAmount : calculatedTotal}
                onChange={handleTotalAmountChange}
                placeholder="0.00"
                min={0}
                precision={precision}
                style={{ width: 150 }}
                disabled={disabled}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                parser={(value) => value!.replace(/\s?/g, '')}
              />
            </Form.Item>
          </Space>
        </Form>

        <Divider style={{ margin: '12px 0' }} />
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">Сумма без НДС:</Text>
            <MoneyCell amount={calculatedNet} currency={currency} precision={precision} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text type="secondary">НДС ({vatRate}%):</Text>
            <MoneyCell 
              amount={vatAmount} 
              currency={currency} 
              precision={precision}
              type={vatRate === 0 ? 'secondary' : 'default'}
            />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text strong>Итого с НДС:</Text>
            <MoneyCell 
              amount={calculatedTotal} 
              currency={currency} 
              precision={precision} 
              strong 
            />
          </div>
        </Space>

        {vatRate === 0 && (
          <Alert
            message="Внимание"
            description="Выбран режим без НДС. Убедитесь, что поставщик работает без НДС."
            type="info"
            showIcon
            size="small"
          />
        )}
      </Space>
    </Card>
  )
}

export default VATCalculator