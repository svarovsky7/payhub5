/**
 * Генератор уникальных номеров счетов
 */

/**
 * Получает текущий период в формате YYMM
 */
export function getCurrentYearMonth(): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2)
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return `${year}${month}`
}

interface InternalNumberParams {
  payerCode?: string      // Код плательщика (ORG) из supplier_code таблицы contractors
  projectCode?: string     // Код проекта (PROJ) из project_code таблицы projects
  supplierCode?: string    // Код поставщика (VEND) из supplier_code таблицы contractors
  supplierInn?: string     // ИНН поставщика для извлечения последних 4 цифр
  invoiceTypeCode?: string // Код типа счета из таблицы invoice_types (например: materials, services, rent)
  sequenceNumber?: string  // Порядковый номер в формате "0001" (если известен)
  suffix?: string         // Опциональный суффикс
}

/**
 * Генерирует уникальный внутренний номер счета (internal_number) в формате:
 * ORG-PROJ-VEND-TYPE-YYMM-SEQ[-S####]
 * 
 * Где:
 * ORG — код плательщика (из supplier_code таблицы contractors)
 * PROJ — код объекта (из project_code таблицы projects)
 * VEND — код поставщика + 4 последние цифры ИНН (из supplier_code таблицы contractors)
 * TYPE — код типа счета (из code таблицы invoice_types, например: materials, services, rent)
 * YYMM — год и месяц (например, 2509 = сентябрь 2025)
 * SEQ — порядковый номер (4-5 цифр с ведущими нулями)
 * S#### — опциональный суффикс
 */
function generateInternalNumber(params: InternalNumberParams = {}): string {
  const now = new Date()
  const year = now.getFullYear().toString().slice(-2) // последние 2 цифры года
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  
  // ORG - код плательщика (по умолчанию используем общий код)
  const orgCode = params.payerCode?.toUpperCase() || 'ORG'
  
  // PROJ - код проекта (по умолчанию используем общий код)
  const projectCode = params.projectCode?.toUpperCase() || 'PROJ'
  
  // VEND - код поставщика + последние 4 цифры ИНН
  let vendorCode = params.supplierCode?.toUpperCase() || 'VEND'
  if (params.supplierInn) {
    // Извлекаем последние 4 цифры ИНН
    const innDigits = params.supplierInn.replace(/\D/g, '') // убираем все не-цифры
    const last4Digits = innDigits.slice(-4).padStart(4, '0')
    vendorCode = `${vendorCode}${last4Digits}`
  }
  
  // TYPE - код типа счета (по умолчанию используем INV)
  const typeCode = params.invoiceTypeCode?.toUpperCase() || 'INV'
  
  // YYMM - год и месяц
  const yearMonth = `${year}${month}`
  
  // SEQ - порядковый номер (4 цифры минимум)
  // Если не передан, используем "0001" как заглушку (должен быть передан из сервиса)
  const seqCode = params.sequenceNumber || '0001'
  
  // Собираем полный номер
  let invoiceNumber = `${orgCode}-${projectCode}-${vendorCode}-${typeCode}-${yearMonth}-${seqCode}`
  
  // Добавляем суффикс если есть
  if (params.suffix) {
    invoiceNumber += `-${params.suffix}`
  }
  
  return invoiceNumber
}

