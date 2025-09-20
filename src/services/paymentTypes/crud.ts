import { supabase } from '@/services/supabase'
import type { Database } from '@/types/database'

type PaymentType = Database['public']['Tables']['payment_types']['Row']
type PaymentTypeInsert = Database['public']['Tables']['payment_types']['Insert']
type PaymentTypeUpdate = Database['public']['Tables']['payment_types']['Update']

export const paymentTypesCrud = {
  async getAll() {
    console.log('[paymentTypesCrud.getAll] Fetching all payment types')

    const { data, error } = await supabase
      .from('payment_types')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[paymentTypesCrud.getAll] Error fetching payment types:', error)
      throw error
    }

    console.log('[paymentTypesCrud.getAll] Fetched payment types:', data)
    return data
  },

  async getAllIncludingInactive() {
    console.log('[paymentTypesCrud.getAllIncludingInactive] Fetching all payment types including inactive')

    const { data, error } = await supabase
      .from('payment_types')
      .select('*')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('[paymentTypesCrud.getAllIncludingInactive] Error:', error)
      throw error
    }

    console.log('[paymentTypesCrud.getAllIncludingInactive] Fetched:', data)
    return data
  },

  async getById(id: string) {
    console.log('[paymentTypesCrud.getById] Fetching payment type:', id)

    const { data, error } = await supabase
      .from('payment_types')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('[paymentTypesCrud.getById] Error:', error)
      throw error
    }

    console.log('[paymentTypesCrud.getById] Fetched:', data)
    return data
  },

  async create(paymentType: PaymentTypeInsert) {
    console.log('[paymentTypesCrud.create] Creating payment type:', paymentType)

    const { data, error } = await supabase
      .from('payment_types')
      .insert(paymentType)
      .select()
      .single()

    if (error) {
      console.error('[paymentTypesCrud.create] Error:', error)
      throw error
    }

    console.log('[paymentTypesCrud.create] Created:', data)
    return data
  },

  async update(id: string, updates: PaymentTypeUpdate) {
    console.log('[paymentTypesCrud.update] Updating payment type:', { id, updates })

    const { data, error } = await supabase
      .from('payment_types')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[paymentTypesCrud.update] Error:', error)
      throw error
    }

    console.log('[paymentTypesCrud.update] Updated:', data)
    return data
  },

  async delete(id: string) {
    console.log('[paymentTypesCrud.delete] Soft deleting payment type:', id)

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from('payment_types')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[paymentTypesCrud.delete] Error:', error)
      throw error
    }

    console.log('[paymentTypesCrud.delete] Deleted:', data)
    return data
  },

  async updateOrder(items: Array<{ id: string; display_order: number }>) {
    console.log('[paymentTypesCrud.updateOrder] Updating order:', items)

    const updates = items.map(item =>
      supabase
        .from('payment_types')
        .update({ display_order: item.display_order })
        .eq('id', item.id)
    )

    const results = await Promise.all(updates)
    const hasError = results.some(result => result.error)

    if (hasError) {
      console.error('[paymentTypesCrud.updateOrder] Error updating order')
      throw new Error('Failed to update payment types order')
    }

    console.log('[paymentTypesCrud.updateOrder] Order updated successfully')
    return true
  }
}