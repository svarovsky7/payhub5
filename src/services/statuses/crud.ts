/**
 * CRUD операции для работы со статусами
 */

import { supabase } from '../supabase'
import type { Database } from '@/types/database'

export type Status = Database['public']['Tables']['statuses']['Row']
export type StatusInsert = Database['public']['Tables']['statuses']['Insert']
export type StatusUpdate = Database['public']['Tables']['statuses']['Update']

interface StatusWithMeta extends Status {
  // Additional computed fields if needed
  isInvoiceStatus?: boolean
  isPaymentStatus?: boolean
}

export class StatusCRUD {
  /**
   * Получить все статусы
   */
  static async getAll() {
    return supabase
      .from('statuses')
      .select('*')
      .order('entity_type', { ascending: true })
      .order('order_index', { ascending: true })
  }

  /**
   * Получить статусы по типу сущности
   */
  static async getByEntityType(entityType: 'invoice' | 'payment' | 'project') {
    return supabase
      .from('statuses')
      .select('*')
      .eq('entity_type', entityType)
      .eq('is_active', true)
      .order('order_index', { ascending: true })
  }

  /**
   * Получить статус по коду и типу сущности
   */
  static async getByCode(entityType: 'invoice' | 'payment' | 'project', code: string) {
    return supabase
      .from('statuses')
      .select('*')
      .eq('entity_type', entityType)
      .eq('code', code)
      .single()
  }

  /**
   * Получить статус по ID
   */
  static async getById(id: number) {
    return supabase
      .from('statuses')
      .select('*')
      .eq('id', id)
      .single()
  }

  /**
   * Создать новый статус
   */
  static async create(data: StatusInsert) {
    return supabase
      .from('statuses')
      .insert(data)
      .select()
      .single()
  }

  /**
   * Обновить статус
   */
  static async update(id: number, data: StatusUpdate) {
    return supabase
      .from('statuses')
      .update(data)
      .eq('id', id)
      .select()
      .single()
  }

  /**
   * Удалить статус (мягкое удаление через is_active)
   */
  static async delete(id: number) {
    return supabase
      .from('statuses')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single()
  }

  /**
   * Получить все активные статусы для выпадающих списков
   */
  static async getActiveStatuses() {
    return supabase
      .from('statuses')
      .select('*')
      .eq('is_active', true)
      .order('entity_type', { ascending: true })
      .order('order_index', { ascending: true })
  }

  /**
   * Получить начальный статус для типа сущности
   */
  static async getInitialStatus(entityType: 'invoice' | 'payment' | 'project') {
    return supabase
      .from('statuses')
      .select('*')
      .eq('entity_type', entityType)
      .eq('is_active', true)
      .order('order_index', { ascending: true })
      .limit(1)
      .single()
  }

  /**
   * Получить финальные статусы для типа сущности
   */
  static async getFinalStatuses(entityType: 'invoice' | 'payment' | 'project') {
    return supabase
      .from('statuses')
      .select('*')
      .eq('entity_type', entityType)
      .eq('is_final', true)
      .eq('is_active', true)
      .order('order_index', { ascending: true })
  }
}