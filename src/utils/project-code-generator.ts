/**
 * Генератор уникальных кодов проектов
 */

/**
 * Генерирует уникальный код проекта на основе названия
 * @param projectName - Название проекта
 * @returns Код проекта в формате 2-4 заглавных букв + опциональная цифра
 */
export function generateProjectCode(projectName: string): string {
  console.log('[generateProjectCode] Generating code for:', projectName)
  
  if (!projectName || projectName.trim().length === 0) {
    console.log('[generateProjectCode] Empty project name, returning default')
    return 'PRJ'
  }

  // Очищаем название от специальных символов и разбиваем на слова
  const words = projectName
    .toUpperCase()
    .replace(/[^A-ZА-Я0-9\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 0)

  console.log('[generateProjectCode] Words extracted:', words)

  let code = ''

  if (words.length === 0) {
    console.log('[generateProjectCode] No valid words found, returning default')
    return 'PRJ'
  }

  if (words.length === 1) {
    // Если одно слово, берем первые 3-4 буквы
    const word = words[0].replace(/[^A-Z]/g, '')
    code = word.slice(0, Math.min(4, Math.max(3, word.length)))
  } else {
    // Если несколько слов, берем первые буквы каждого слова
    code = words
      .map(word => word.replace(/[^A-Z]/g, '')[0])
      .filter(Boolean)
      .join('')
      .slice(0, 4)
  }

  // Если код получился короче 2 символов, дополняем
  if (code.length < 2) {
    code = 'PR' + code
  }

  // Убеждаемся, что код содержит только латинские буквы
  code = code.replace(/[^A-Z]/g, '')

  // Если после всех преобразований код пустой, используем дефолтный
  if (code.length === 0) {
    code = 'PRJ'
  }

  console.log('[generateProjectCode] Generated code:', code)
  return code
}

/**
 * Проверяет валидность кода проекта
 * @param code - Код проекта для проверки
 * @returns true если код валиден
 */
function isValidProjectCode(code: string): boolean {
  // Код должен состоять из 2-4 заглавных латинских букв и может заканчиваться одной цифрой
  return /^[A-Z]{2,4}[0-9]?$/.test(code)
}

/**
 * Добавляет числовой суффикс к коду проекта для уникальности
 * @param baseCode - Базовый код проекта
 * @param existingCodes - Массив существующих кодов
 * @returns Уникальный код проекта
 */
function makeProjectCodeUnique(baseCode: string, existingCodes: string[]): string {
  console.log('[makeProjectCodeUnique] Base code:', baseCode, 'Existing codes:', existingCodes)
  
  // Убираем числовой суффикс если есть
  const cleanCode = baseCode.replace(/[0-9]+$/, '')
  
  // Если базовый код уникален, возвращаем его
  if (!existingCodes.includes(cleanCode)) {
    return cleanCode
  }
  
  // Иначе добавляем числовой суффикс
  let counter = 1
  let uniqueCode = `${cleanCode}${counter}`
  
  while (existingCodes.includes(uniqueCode) && counter < 100) {
    counter++
    uniqueCode = `${cleanCode}${counter}`
  }
  
  console.log('[makeProjectCodeUnique] Unique code generated:', uniqueCode)
  return uniqueCode
}