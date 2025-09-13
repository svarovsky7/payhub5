/**
 * Утилиты для форматирования телефонных номеров
 */

/**
 * Форматирует телефонный номер в формат +7 (999) 999-99-99
 */
export const formatPhoneNumber = (value: string): string => {
  // Удаляем все символы кроме цифр
  const numbers = value.replace(/\D/g, '')
  
  // Если номер начинается с 8, заменяем на 7
  const cleanNumbers = numbers.startsWith('8') ? '7' + numbers.slice(1) : numbers
  
  // Если номер не начинается с 7, добавляем
  const fullNumbers = cleanNumbers.startsWith('7') ? cleanNumbers : '7' + cleanNumbers
  
  // Ограничиваем длину до 11 цифр
  const limitedNumbers = fullNumbers.slice(0, 11)
  
  // Форматируем
  let formatted = ''
  for (let i = 0; i < limitedNumbers.length; i++) {
    if (i === 0) {
      formatted = '+' + limitedNumbers[i]
    } else if (i === 1) {
      formatted += ' (' + limitedNumbers[i]
    } else if (i === 4) {
      formatted += ') ' + limitedNumbers[i]
    } else if (i === 7) {
      formatted += '-' + limitedNumbers[i]
    } else if (i === 9) {
      formatted += '-' + limitedNumbers[i]
    } else {
      formatted += limitedNumbers[i]
    }
  }
  
  return formatted
}

/**
 * Проверяет, является ли строка валидным телефонным номером
 */
export const isValidPhoneNumber = (value: string): boolean => {
  const numbers = value.replace(/\D/g, '')
  return numbers.length === 11 && (numbers.startsWith('7') || numbers.startsWith('8'))
}

/**
 * Очищает телефонный номер от форматирования
 */
export const cleanPhoneNumber = (value: string): string => {
  const numbers = value.replace(/\D/g, '')
  // Если номер начинается с 8, заменяем на 7
  const cleanNumbers = numbers.startsWith('8') ? '7' + numbers.slice(1) : numbers
  // Если номер не начинается с 7, добавляем
  return cleanNumbers.startsWith('7') ? cleanNumbers : '7' + cleanNumbers
}