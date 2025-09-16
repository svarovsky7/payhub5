/**
 * CRUD operations for database enums
 */


export interface EnumValue {
  value: string
  label?: string
}

export class EnumCrudService {
  /**
   * Get payment type enum values from database
   */
  static async getPaymentTypes(): Promise<EnumValue[]> {
    console.log('[EnumCrudService.getPaymentTypes] Fetching payment types from database')

    // Since we can't directly query enum values, we'll return the known values
    // These match the database enum: CREATE TYPE public.payment_type AS ENUM ('ADV', 'RET', 'DEBT')
    const paymentTypes: EnumValue[] = [
      { value: 'ADV', label: 'Аванс' },
      { value: 'RET', label: 'Возврат удержаний' },
      { value: 'DEBT', label: 'Погашение долга' }
    ]

    console.log('[EnumCrudService.getPaymentTypes] Returning payment types:', paymentTypes)
    return paymentTypes
  }

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
   * Validate if a value exists in payment_type enum
   */
  static isValidPaymentType(value: string): boolean {
    return ['ADV', 'RET', 'DEBT'].includes(value)
  }

  /**
   * Validate if a value exists in priority_level enum
   */
  static isValidPriorityLevel(value: string): boolean {
    return ['low', 'normal', 'high', 'urgent'].includes(value)
  }
}