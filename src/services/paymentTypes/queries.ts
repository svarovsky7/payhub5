import { paymentTypesCrud } from './crud'
import type { Database } from '@/types/database'

type PaymentType = Database['public']['Tables']['payment_types']['Row']
type PaymentTypeInsert = Database['public']['Tables']['payment_types']['Insert']
type PaymentTypeUpdate = Database['public']['Tables']['payment_types']['Update']

export const paymentTypesQueries = {
  async getAll(includeInactive = false): Promise<PaymentType[]> {
    try {
      console.log('[paymentTypesQueries.getAll] Fetching payment types:', { includeInactive })

      const data = includeInactive
        ? await paymentTypesCrud.getAllIncludingInactive()
        : await paymentTypesCrud.getAll()

      return data || []
    } catch (error) {
      console.error('[paymentTypesQueries.getAll] Error:', error)
      throw new Error('Не удалось загрузить типы платежей')
    }
  },

  async getById(id: string): Promise<PaymentType> {
    try {
      console.log('[paymentTypesQueries.getById] Fetching payment type:', id)
      const data = await paymentTypesCrud.getById(id)

      if (!data) {
        throw new Error('Тип платежа не найден')
      }

      return data
    } catch (error) {
      console.error('[paymentTypesQueries.getById] Error:', error)
      throw error
    }
  },

  async create(paymentType: PaymentTypeInsert): Promise<PaymentType> {
    try {
      console.log('[paymentTypesQueries.create] Creating payment type:', paymentType)

      // Validate required fields
      if (!paymentType.name?.trim()) {
        throw new Error('Название типа платежа обязательно')
      }

      if (!paymentType.code?.trim()) {
        throw new Error('Код типа платежа обязателен')
      }

      const data = await paymentTypesCrud.create(paymentType)
      return data
    } catch (error: any) {
      console.error('[paymentTypesQueries.create] Error:', error)

      // Handle unique constraint violations
      if (error?.code === '23505') {
        if (error.message.includes('name')) {
          throw new Error('Тип платежа с таким названием уже существует')
        }
        if (error.message.includes('code')) {
          throw new Error('Тип платежа с таким кодом уже существует')
        }
      }

      throw error
    }
  },

  async update(id: string, updates: PaymentTypeUpdate): Promise<PaymentType> {
    try {
      console.log('[paymentTypesQueries.update] Updating payment type:', { id, updates })

      // Validate if updating name or code
      if (updates.name !== undefined && !updates.name?.trim()) {
        throw new Error('Название типа платежа не может быть пустым')
      }

      if (updates.code !== undefined && !updates.code?.trim()) {
        throw new Error('Код типа платежа не может быть пустым')
      }

      const data = await paymentTypesCrud.update(id, updates)
      return data
    } catch (error: any) {
      console.error('[paymentTypesQueries.update] Error:', error)

      // Handle unique constraint violations
      if (error?.code === '23505') {
        if (error.message.includes('name')) {
          throw new Error('Тип платежа с таким названием уже существует')
        }
        if (error.message.includes('code')) {
          throw new Error('Тип платежа с таким кодом уже существует')
        }
      }

      throw error
    }
  },

  async delete(id: string): Promise<void> {
    try {
      console.log('[paymentTypesQueries.delete] Deleting payment type:', id)
      await paymentTypesCrud.delete(id)
    } catch (error) {
      console.error('[paymentTypesQueries.delete] Error:', error)
      throw new Error('Не удалось удалить тип платежа')
    }
  },

  async updateOrder(items: Array<{ id: string; display_order: number }>): Promise<void> {
    try {
      console.log('[paymentTypesQueries.updateOrder] Updating order:', items)
      await paymentTypesCrud.updateOrder(items)
    } catch (error) {
      console.error('[paymentTypesQueries.updateOrder] Error:', error)
      throw new Error('Не удалось обновить порядок типов платежей')
    }
  }
}