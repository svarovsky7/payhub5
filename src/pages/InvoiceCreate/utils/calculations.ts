/**
 * Calculation utilities for InvoiceCreate
 */

import dayjs from 'dayjs'

/**
 * Calculate VAT amounts from total amount and VAT rate
 */
export const calculateVATAmounts = (
  amountWithVat: number,
  vatRate: number
): { amountNet: number; vatAmount: number } => {
  if (!amountWithVat || amountWithVat <= 0) {
    return { amountNet: 0, vatAmount: 0 }
  }

  // When VAT rate is 0 (Без НДС), amount without VAT equals amount with VAT
  if (vatRate === 0) {
    console.log('[InvoiceCreate.calculateAmounts] Расчет без НДС:', {
      amountWithVat,
      vatRate: 0,
      amountNet: amountWithVat,
      vatAmount: 0
    })
    return { amountNet: amountWithVat, vatAmount: 0 }
  }

  const amountNet = Number((amountWithVat / (1 + vatRate / 100)).toFixed(2))
  const vatAmount = Number((amountWithVat - amountNet).toFixed(2))

  console.log('[InvoiceCreate.calculateAmounts] Расчет НДС:', {
    amountWithVat,
    vatRate,
    amountNet,
    vatAmount
  })

  return { amountNet, vatAmount }
}

/**
 * Calculate delivery date based on delivery days
 * @param days - Number of days to add
 * @param daysType - 'calendar' or 'working' days
 */
export const calculateDeliveryDate = (days: number, daysType: 'calendar' | 'working' = 'working'): dayjs.Dayjs | null => {
  if (!days || days <= 0) {
    return null
  }

  // Start from next working day
  let deliveryDate = dayjs().add(1, 'day')

  // Skip to next working day if current is weekend
  while (deliveryDate.day() === 0 || deliveryDate.day() === 6) {
    deliveryDate = deliveryDate.add(1, 'day')
  }

  if (daysType === 'calendar') {
    // Add calendar days
    deliveryDate = deliveryDate.add(days, 'day')
  } else {
    // Add working days (skip weekends)
    let workingDaysAdded = 0
    while (workingDaysAdded < days) {
      deliveryDate = deliveryDate.add(1, 'day')
      // If not weekend, count as working day
      if (deliveryDate.day() !== 0 && deliveryDate.day() !== 6) {
        workingDaysAdded++
      }
    }
  }

  console.log('[InvoiceCreate.calculateDeliveryDate] Расчет даты поставки:', {
    days,
    daysType,
    deliveryDate: deliveryDate.format('YYYY-MM-DD')
  })

  return deliveryDate
}

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename: string): string => {
  return filename.split('.').pop()?.toLowerCase() || ''
}