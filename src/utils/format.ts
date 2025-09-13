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


// Форматирование дат
export const formatDate = (
  date: string | Date | dayjs.Dayjs,
  format = 'DD.MM.YYYY'
): string => {
  if (!date) {return ''}
  return dayjs(date).format(format)
}


// Создание инициалов из имени
export const createInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || ''
  const last = lastName?.charAt(0)?.toUpperCase() || ''
  
  return first + last
}