import React from 'react'
import { Badge, Tag } from 'antd'
import { formatStatus, getStatusColor } from '@/utils/format'

interface StatusBadgeProps {
  status: string
  variant?: 'badge' | 'tag'
  size?: 'small' | 'default'
  showText?: boolean
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'tag',
  size = 'default',
  showText = true,
}) => {
  const color = getStatusColor(status)
  const text = formatStatus(status)

  if (variant === 'badge') {
    return (
      <Badge 
        status={color as any} 
        text={showText ? text : undefined}
        size={size}
      />
    )
  }

  return (
    <Tag 
      color={color} 
      style={{ 
        margin: 0,
        fontSize: size === 'small' ? '12px' : '14px',
        padding: size === 'small' ? '2px 6px' : '4px 8px',
        borderRadius: '4px',
        border: 'none',
      }}
    >
      {text}
    </Tag>
  )
}