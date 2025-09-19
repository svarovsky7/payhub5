/**
 * CRUD operations for database enums
 */


export interface EnumValue {
  value: string
  label?: string
}

export class EnumCrudService {
  /**
   * Get priority level enum values
   */
  static async getPriorityLevels(): Promise<EnumValue[]> {
    console.log('[EnumCrudService.getPriorityLevels] Fetching priority levels from database')

    // These match the database enum: CREATE TYPE public.priority_level AS ENUM ('low', 'normal', 'high', 'urgent')
    const priorityLevels: EnumValue[] = [
      { value: 'low', label: 'Низкий' },
      { value: 'normal', label: 'Средний' },
      { value: 'high', label: 'Высокий' },
      { value: 'urgent', label: 'Срочный' }
    ]

    console.log('[EnumCrudService.getPriorityLevels] Returning priority levels:', priorityLevels)
    return priorityLevels
  }


  /**
   * Validate if a value exists in priority_level enum
   */
  static isValidPriorityLevel(value: string): boolean {
    return ['low', 'normal', 'high', 'urgent'].includes(value)
  }
}