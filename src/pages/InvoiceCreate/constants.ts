/**
 * Constants for InvoiceCreate
 */

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024 // 50MB

export const DEFAULT_CURRENCY = 'RUB'
export const DEFAULT_VAT_RATE = 20

// Unused export - removed
// export const CURRENCY_OPTIONS = [
//   { value: 'RUB', label: '₽ (RUB)' },
//   { value: 'USD', label: '$ (USD)' },
//   { value: 'EUR', label: '€ (EUR)' },
//   { value: 'CNY', label: '¥ (CNY)' },
//   { value: 'GBP', label: '£ (GBP)' }
// ]

// Unused export - removed
// const CURRENCY_SYMBOLS: Record<string, string> = {
//   'RUB': '₽',
//   'USD': '$',
//   'EUR': '€',
//   'CNY': '¥',
//   'GBP': '£'
// }

// Unused export - removed
// export const getCurrencySymbol = (currency: string): string => {
//   return CURRENCY_SYMBOLS[currency] || currency
// }

export const VAT_RATE_OPTIONS = [
  { value: 0, label: 'Без НДС (0%)' },
  { value: 5, label: '5%' },
  { value: 7, label: '7%' },
  { value: 10, label: '10%' },
  { value: 20, label: '20%' }
]

// Unused export - removed
// export const PRIORITY_OPTIONS = [
//   { value: 'low', label: 'Низкий' },
//   { value: 'normal', label: 'Средний' },
//   { value: 'high', label: 'Высокий' },
//   { value: 'urgent', label: 'Срочный' }
// ]

export const ACCEPTED_FILE_TYPES = [
  'image/*',
  'application/pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt'
].join(',')

const FILE_ICONS: Record<string, any> = {
  'pdf': 'FilePdfOutlined',
  'doc': 'FileWordOutlined',
  'docx': 'FileWordOutlined',
  'xls': 'FileExcelOutlined',
  'xlsx': 'FileExcelOutlined',
  'png': 'FileImageOutlined',
  'jpg': 'FileImageOutlined',
  'jpeg': 'FileImageOutlined',
  'gif': 'FileImageOutlined'
}