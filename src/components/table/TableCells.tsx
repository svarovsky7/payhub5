import React from 'react'
import { 
  Button, 
  Space, 
  Tag, 
  Tooltip,
  Typography
} from 'antd'
import { 
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { formatCurrency } from '../../utils/format'

const { Text, Link } = Typography

// Money Cell Component - всегда показываем в рублях
interface MoneyCellProps {
  amount: number
  type?: 'default' | 'success' | 'warning' | 'danger' | 'secondary'
  strong?: boolean
}

export const MoneyCell: React.FC<MoneyCellProps> = ({
  amount,
  type = 'default',
  strong = false
}) => {
  const getColor = () => {
    switch (type) {
      case 'success': return '#52c41a'
      case 'warning': return '#faad14'
      case 'danger': return '#ff4d4f'
      case 'secondary': return '#8c8c8c'
      default: return undefined
    }
  }

  return (
    <Text
      strong={strong}
      style={{ color: getColor() }}
    >
      {formatCurrency(amount, 'RUB')}
    </Text>
  )
}

// Status Cell Component
interface StatusConfig {
  color: string
  text: string
  icon?: React.ReactNode
}

const defaultStatusConfigs: Record<string, StatusConfig> = {
  // Invoice statuses
  draft: { color: 'default', text: 'Черновик', icon: <ClockCircleOutlined /> },
  pending: { color: 'processing', text: 'На согласовании', icon: <ExclamationCircleOutlined /> },
  approved: { color: 'success', text: 'Согласован', icon: <CheckCircleOutlined /> },
  paid: { color: 'success', text: 'Оплачен', icon: <CheckCircleOutlined /> },
  rejected: { color: 'error', text: 'Отклонен', icon: <CloseCircleOutlined /> },
  cancelled: { color: 'default', text: 'Отменен', icon: <CloseCircleOutlined /> },
  
  // Payment statuses
  created: { color: 'default', text: 'Создан', icon: <ClockCircleOutlined /> },
  confirmed: { color: 'success', text: 'Подтвержден', icon: <CheckCircleOutlined /> },
  failed: { color: 'error', text: 'Не удался', icon: <CloseCircleOutlined /> },
  
  // Project statuses
  planning: { color: 'blue', text: 'Планирование', icon: <ClockCircleOutlined /> },
  in_progress: { color: 'processing', text: 'В работе', icon: <ExclamationCircleOutlined /> },
  on_hold: { color: 'warning', text: 'Приостановлен', icon: <ExclamationCircleOutlined /> },
  completed: { color: 'success', text: 'Завершен', icon: <CheckCircleOutlined /> },
  
  // Contractor statuses
  active: { color: 'success', text: 'Активный', icon: <CheckCircleOutlined /> },
  inactive: { color: 'default', text: 'Неактивный', icon: <ClockCircleOutlined /> },
  blacklisted: { color: 'error', text: 'В черном списке', icon: <CloseCircleOutlined /> },
}

interface StatusCellProps {
  status: string
  type?: 'invoice' | 'payment' | 'project' | 'contractor'
  customConfigs?: Record<string, StatusConfig>
}

export const StatusCell: React.FC<StatusCellProps> = ({
  status,
  type,
  customConfigs = {}
}) => {
  const configs = { ...defaultStatusConfigs, ...customConfigs }
  const config = configs[status] || { color: 'default', text: status }
  
  return (
    <Tag color={config.color} icon={config.icon}>
      {config.text}
    </Tag>
  )
}


// Date Cell Component
interface DateCellProps {
  date: string | Date
  format?: string
  relative?: boolean
  showTime?: boolean
  highlightOverdue?: boolean
}

export const DateCell: React.FC<DateCellProps> = ({
  date,
  format = 'DD.MM.YYYY',
  relative = false,
  showTime = false,
  highlightOverdue = false
}) => {
  if (!date) {return <Text type="secondary">—</Text>}
  
  const dateObj = dayjs(date)
  
  // Check if date is valid
  if (!dateObj.isValid()) {
    return <Text type="secondary">—</Text>
  }
  
  const now = dayjs()
  const isOverdue = highlightOverdue && dateObj.isBefore(now, 'day')
  
  const formatString = showTime ? `${format} HH:mm` : format
  
  return (
    <Tooltip title={relative ? dateObj.format(formatString) : dateObj.fromNow()}>
      <Text type={isOverdue ? 'danger' : 'default'}>
        {relative ? dateObj.fromNow() : dateObj.format(formatString)}
      </Text>
    </Tooltip>
  )
}


// Link Cell Component
interface LinkCellProps {
  text: string
  onClick?: () => void
  href?: string
  type?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

export const LinkCell: React.FC<LinkCellProps> = ({
  text,
  onClick,
  href,
  type = 'primary'
}) => {
  if (href) {
    return (
      <Link href={href} target="_blank" type={type}>
        {text}
      </Link>
    )
  }
  
  return (
    <Button
      type="link"
      onClick={onClick}
      style={{ 
        padding: 0, 
        height: 'auto',
        fontWeight: type === 'primary' ? 500 : 400
      }}
    >
      {text}
    </Button>
  )
}


// Multi-line Text Cell
interface TextCellProps {
  lines: string[]
  maxLines?: number
  ellipsis?: boolean
}

export const TextCell: React.FC<TextCellProps> = ({
  lines,
  maxLines = 3,
  ellipsis = true
}) => {
  const visibleLines = maxLines ? lines.slice(0, maxLines) : lines
  const hasMore = maxLines && lines.length > maxLines
  
  return (
    <Space direction="vertical" size={2}>
      {visibleLines.map((line, index) => (
        <Text 
          key={index} 
          ellipsis={ellipsis}
          style={{ 
            fontSize: index === 0 ? 14 : 12,
            color: index === 0 ? undefined : '#8c8c8c'
          }}
        >
          {line}
        </Text>
      ))}
      {hasMore && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          +{lines.length - maxLines} еще
        </Text>
      )}
    </Space>
  )
}

