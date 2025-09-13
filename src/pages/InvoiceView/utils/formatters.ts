/**
 * Formatting utilities for InvoiceView
 */

import { ACTION_TYPE_LABELS, PRIORITY_LABELS } from '../constants'

const getActionTypeLabel = (actionType: string): string => {
  return ACTION_TYPE_LABELS[actionType] ?? actionType
}

export const getPriorityLabel = (priority: string | undefined): string => {
  if (!priority) {return 'Средний'}
  return PRIORITY_LABELS[priority] ?? priority
}

const formatPaymentNumber = (text: string | undefined, record: any): string => {
  const displayNumber = text ?? (record.reference || `PAY-${record.id}`)

  // Если номер содержит /PAY-, выделяем первую часть жирным
  const parts = displayNumber.split('/PAY-')
  if (parts.length > 1) {
    return parts[0] // Вернуть только первую часть для форматирования
  }

  return displayNumber
}

const getFileIcon = (fileName: string) => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  const iconMap: Record<string, any> = {
    'pdf': 'FilePdfOutlined',
    'doc': 'FileWordOutlined',
    'docx': 'FileWordOutlined',
    'xls': 'FileExcelOutlined',
    'xlsx': 'FileExcelOutlined',
    'png': 'FileImageOutlined',
    'jpg': 'FileImageOutlined',
    'jpeg': 'FileImageOutlined',
    'gif': 'FileImageOutlined',
    'txt': 'FileTextOutlined'
  }
  return iconMap[ext || ''] || 'FileOutlined'
}