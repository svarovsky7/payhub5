/**
 * Query layer for database enums with error handling
 */

import { EnumCrudService, type EnumValue } from './crud'

export class EnumQueryService {
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