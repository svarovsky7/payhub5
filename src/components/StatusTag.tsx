/**
 * StatusTag - colored status badges using database statuses
 */

import React from 'react'
import { Skeleton, Tag } from 'antd'
import type { TagProps } from 'antd'
import { useInvoiceStatuses, usePaymentStatuses, useProjectStatuses } from '../services/hooks/useStatuses'

interface StatusTagProps extends Omit<TagProps, 'color'> {
  status: string
  type?: 'invoice' | 'payment' | 'project' | 'generic'
}

export const StatusTag: React.FC<StatusTagProps> = ({
  status,
  type = 'generic',
  ...props
}) => {
  console.log('[StatusTag] Rendering status tag:', { status, type })

  // Load statuses from database based on type
  const invoiceQuery = useInvoiceStatuses()
  const paymentQuery = usePaymentStatuses()
  const projectQuery = useProjectStatuses()

  // Select the appropriate query based on type
  const query =
    type === 'invoice' ? invoiceQuery :
    type === 'payment' ? paymentQuery :
    type === 'project' ? projectQuery :
    null

  const statuses = query?.data
  const isLoading = query?.isLoading

  // Show skeleton while loading
  if (query && isLoading) {
    return <Skeleton.Input active size="small" style={{ width: 80 }} />
  }

  // Find status from database
  let statusConfig = null
  if (statuses) {
    statusConfig = statuses.find(s => s.code === status)
    console.log('[StatusTag] Found status in database:', statusConfig)
  }

  // Use database configuration if found
  if (statusConfig) {
    return (
      <Tag color={statusConfig.color || 'default'} {...props}>
        {statusConfig.name}
      </Tag>
    )
  }

  // Fallback for project and generic types (not in database yet)
  const fallbackConfigs: Record<string, Record<string, { color: string; text: string }>> = {
    project: {
      planning: { color: 'default', text: 'Планирование' },
      active: { color: 'processing', text: 'Активный' },
      completed: { color: 'success', text: 'Завершен' },
      on_hold: { color: 'warning', text: 'Приостановлен' },
      cancelled: { color: 'error', text: 'Отменен' },
    },
    generic: {
      active: { color: 'success', text: 'Активный' },
      inactive: { color: 'default', text: 'Неактивный' },
      blocked: { color: 'error', text: 'Заблокирован' },
      pending: { color: 'processing', text: 'В ожидании' },
      completed: { color: 'success', text: 'Завершено' },
      failed: { color: 'error', text: 'Ошибка' },
      cancelled: { color: 'default', text: 'Отменено' },
    }
  }

  const typeConfigs = fallbackConfigs[type] || fallbackConfigs.generic
  const config = typeConfigs[status] || { color: 'default', text: status }

  return (
    <Tag color={config.color} {...props}>
      {config.text}
    </Tag>
  )
}

export default StatusTag