/**
 * Сервис для работы с последовательными номерами счетов
 */

import { supabase } from '../supabase'

/**
 * Получает последний порядковый номер счета за текущий день
 * @param yearMonthDay - строка в формате YYMMDD (например, "250913" для 13 сентября 2025)
 * @returns последний использованный порядковый номер или 0 если счетов нет
 */
export async function getLastSequenceNumber(yearMonthDay: string): Promise<number> {
  try {
    console.log('[SequenceService] Получение последнего номера для дня:', yearMonthDay)
    
    // Получаем начало и конец текущего дня
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // Ищем счета созданные сегодня
    const { data, error } = await supabase
      .from('invoices')
      .select('internal_number')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .order('created_at', { ascending: false })
      .limit(50) // Берем последние 50 записей за день для анализа
    
    if (error) {
      console.error('[SequenceService] Ошибка получения последнего номера:', error)
      return 0
    }
    
    if (!data || data.length === 0) {
      console.log('[SequenceService] Счетов за период не найдено, начинаем с 0001')
      return 0
    }
    
    // Извлекаем максимальный порядковый номер за текущий день
    let maxSequence = 0
    
    for (const invoice of data) {
      if (invoice.internal_number) {
        // Формат: ORG-PROJ-VEND-TYPE-YYMM-XXXX или ORG-PROJ-VEND-TYPE-YYMM-XXXX-SUFFIX
        // где TYPE может быть любым кодом типа счета (materials, services, rent, INV и т.д.)
        const parts = invoice.internal_number.split('-')
        
        // Проверяем, что номер состоит минимум из 6 частей (ORG-PROJ-VEND-TYPE-YYMM-SEQ)
        if (parts.length >= 6) {
          // YYMM должен быть в позиции 4 (индекс 4)
          // SEQ должен быть в позиции 5 (индекс 5)
          const yearMonthPart = parts[4]
          const seqPart = parts[5]
          
          // Проверяем что YYMM - это 4 цифры
          if (/^\d{4}$/.test(yearMonthPart)) {
            const seqNumber = parseInt(seqPart, 10)
            
            if (!isNaN(seqNumber) && seqNumber > maxSequence) {
              maxSequence = seqNumber
            }
          }
        }
      }
    }
    
    console.log('[SequenceService] Последний использованный номер:', maxSequence)
    return maxSequence
  } catch (error) {
    console.error('[SequenceService] Ошибка:', error)
    return 0
  }
}

/**
 * Получает следующий порядковый номер для текущего дня
 * @returns следующий порядковый номер (например, 1 станет "0001")
 */
export async function getNextSequenceNumber(): Promise<string> {
  // Не используем yearMonthDay, так как функция сама определяет текущий день
  const lastNumber = await getLastSequenceNumber('')
  const nextNumber = lastNumber + 1
  
  // Форматируем с ведущими нулями (минимум 4 цифры)
  const formatted = nextNumber.toString().padStart(4, '0')
  
  console.log('[SequenceService] Следующий номер для сегодня:', formatted)
  return formatted
}