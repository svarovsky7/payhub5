/**
 * Утилиты для форматирования данных
 */

import dayjs from 'dayjs'
import 'dayjs/locale/ru'

// Установка русской локали по умолчанию
dayjs.locale('ru')

// Форматирование валюты
export const formatCurrency = (
  amount: number,
  currency = 'RUB',
  locale = 'ru-RU'
): string => {
  if (isNaN(amount)) {return '0 ₽'}
  
  // Handle null/undefined currency
  const validCurrency = currency || 'RUB'
  
  // Map currency codes to symbols for fallback
  const currencySymbols: Record<string, string> = {
    'RUB': '₽',
    'USD': '$',
    'EUR': '€',
    'CNY': '¥'
  }
  
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: validCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch (error) {
    // Fallback to manual formatting if currency code is invalid
    const symbol = currencySymbols[validCurrency] || validCurrency
    return `${formatNumber(amount)} ${symbol}`
  }
}

// Форматирование чисел
export const formatNumber = (
  value: number,
  options?: Intl.NumberFormatOptions
): string => {
  if (isNaN(value)) {return '0'}
  
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  }).format(value)
}

// Форматирование процентов
const formatPercent = (value: number, decimals = 1): string => {
  if (isNaN(value)) {return '0%'}
  
  return new Intl.NumberFormat('ru-RU', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

// Форматирование дат
export const formatDate = (
  date: string | Date | dayjs.Dayjs,
  format = 'DD.MM.YYYY'
): string => {
  if (!date) {return ''}
  return dayjs(date).format(format)
}

const formatDateTime = (
  date: string | Date | dayjs.Dayjs,
  format = 'DD.MM.YYYY HH:mm'
): string => {
  if (!date) {return ''}
  return dayjs(date).format(format)
}

const formatTime = (
  date: string | Date | dayjs.Dayjs,
  format = 'HH:mm'
): string => {
  if (!date) {return ''}
  return dayjs(date).format(format)
}

// Относительное время
const formatRelativeTime = (date: string | Date | dayjs.Dayjs): string => {
  if (!date) {return ''}
  return dayjs(date).fromNow()
}

// Форматирование размера файлов
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) {return '0 Б'}
  
  const k = 1024
  const sizes = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Форматирование телефона
const formatPhone = (phone: string): string => {
  if (!phone) {return ''}
  
  // Удаляем все не цифры
  const digits = phone.replace(/\D/g, '')
  
  // Если начинается с 8, заменяем на +7
  const normalizedDigits = digits.startsWith('8') 
    ? '7' + digits.slice(1) 
    : digits
  
  // Форматируем как +7 (xxx) xxx-xx-xx
  if (normalizedDigits.length === 11 && normalizedDigits.startsWith('7')) {
    return normalizedDigits.replace(
      /^7(\d{3})(\d{3})(\d{2})(\d{2})$/,
      '+7 ($1) $2-$3-$4'
    )
  }
  
  return phone
}

// Форматирование имени файла
const formatFileName = (fileName: string, maxLength = 30): string => {
  if (!fileName) {return ''}
  
  if (fileName.length <= maxLength) {return fileName}
  
  const ext = fileName.split('.').pop() || ''
  const name = fileName.substring(0, fileName.lastIndexOf('.'))
  const truncatedName = name.substring(0, maxLength - ext.length - 4) + '...'
  
  return `${truncatedName}.${ext}`
}

// Форматирование статуса
const formatStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    draft: 'Черновик',
    pending: 'Ожидает',
    approved: 'Одобрено',
    rejected: 'Отклонено',
    completed: 'Завершено',
    cancelled: 'Отменено',
    active: 'Активно',
    inactive: 'Неактивно',
    paid: 'Оплачено',
    unpaid: 'Не оплачено',
    overdue: 'Просрочено',
  }
  
  return statusMap[status] || status
}

// Получение цвета статуса для Ant Design
const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    draft: 'default',
    pending: 'processing',
    approved: 'success',
    rejected: 'error',
    completed: 'success',
    cancelled: 'error',
    active: 'success',
    inactive: 'default',
    paid: 'success',
    unpaid: 'warning',
    overdue: 'error',
  }
  
  return colorMap[status] || 'default'
}

// Форматирование текста для поиска
const normalizeSearchText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, '')
}

// Подсветка текста в поиске
const highlightSearchText = (text: string, search: string): string => {
  if (!search) {return text}
  
  const regex = new RegExp(`(${search})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

// Сокращение текста
const truncateText = (text: string, maxLength: number): string => {
  if (!text || text.length <= maxLength) {return text}
  
  return text.substring(0, maxLength) + '...'
}

// Создание инициалов из имени
export const createInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  
  return first + last
}