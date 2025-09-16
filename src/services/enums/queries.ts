/**
 * Query layer for database enums with error handling
 */

import { EnumCrudService, type EnumValue } from './crud'

export class EnumQueryService {
  /**
   * Get payment type options for dropdowns
   */
  static async getPaymentTypeOptions(): Promise<EnumValue[]> {
    try {
      console.log('[EnumQueryService.getPaymentTypeOptions] Getting payment type options')
      const types = await EnumCrudService.getPaymentTypes()
      console.log('[EnumQueryService.getPaymentTypeOptions] Retrieved payment types:', types)
      return types
    } catch (error) {
      console.error('[EnumQueryService.getPaymentTypeOptions] Error:', error)
      // Return default values as fallback
      return [
        { value: 'ADV', label: 'Аванс' },
        { value: 'RET', label: 'Возврат удержаний' },
        { value: 'DEBT', label: 'Погашение долга' }
      ]
    }
  }

  /**
   * Get priority level options for dropdowns
   */
  static async getPriorityOptions(): Promise<EnumValue[]> {
    try {
      console.log('[EnumQueryService.getPriorityOptions] Getting priority options')
      const priorities = await EnumCrudService.getPriorityLevels()
      console.log('[EnumQueryService.getPriorityOptions] Retrieved priorities:', priorities)
      return priorities
    } catch (error) {
      console.error('[EnumQueryService.getPriorityOptions] Error:', error)
      // Return default values as fallback
      return [
        { value: 'low', label: 'Низкий' },
        { value: 'normal', label: 'Средний' },
        { value: 'high', label: 'Высокий' },
        { value: 'urgent', label: 'Срочный' }
      ]
    }
  }

  /**
   * Get payment type label
   */
  static getPaymentTypeLabel(paymentType: string): string {
    const labels: Record<string, string> = {
      'ADV': 'Аванс',
      'RET': 'Возврат удержаний',
      'DEBT': 'Погашение долга'
    }
    return labels[paymentType] || paymentType
  }

  /**
   * Get payment type color for UI
   */
  static getPaymentTypeColor(paymentType: string): string {
    const colors: Record<string, string> = {
      'ADV': 'blue',
      'RET': 'green',
      'DEBT': 'orange'
    }
    return colors[paymentType] || 'default'
  }

  /**
   * Get priority level color for UI
   */
  static getPriorityColor(priority: string): string {
    const colors: Record<string, string> = {
      'low': 'default',
      'normal': 'blue',
      'high': 'orange',
      'urgent': 'red'
    }
    return colors[priority] || 'default'
  }
}