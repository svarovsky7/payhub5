/**
 * Constants for InvoiceView components
 */

export const ACTION_TYPE_LABELS: Record<string, string> = {
  'created': 'Создан счет',
  'submitted': 'Отправлен на согласование',
  'approved': 'Согласован',
  'rejected': 'Отклонен',
  'cancelled': 'Отменен',
  'updated': 'Обновлен',
  'payment_added': 'Добавлен платеж',
  'comment_added': 'Добавлен комментарий',
  'status_changed': 'Изменен статус'
}

export const PRIORITY_LABELS: Record<string, string> = {
  'low': 'Низкий',
  'normal': 'Средний',
  'high': 'Высокий',
  'urgent': 'Срочный'
}

const VAT_RATES = [
  { value: 0, label: 'Без НДС (0%)' },
  { value: 5, label: '5%' },
  { value: 7, label: '7%' },
  { value: 10, label: '10%' },
  { value: 20, label: '20%' }
]

export const DEFAULT_VAT_RATE = 20
export const DEFAULT_CURRENCY = 'RUB'