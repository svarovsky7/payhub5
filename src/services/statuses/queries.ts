/**
 * Query layer для работы со статусами
 */

import { StatusCRUD, type Status } from './crud'
import { handleSupabaseError } from '../supabase'

export class StatusQueryService {
  /**
   * Получить все статусы
   */
  static async getAll(): Promise<Status[]> {
    try {
      console.log('[StatusQueryService.getAll] Загрузка всех статусов')
      const { data, error } = await StatusCRUD.getAll()

      if (error) throw error

      console.log('[StatusQueryService.getAll] Загружено статусов:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('[StatusQueryService.getAll] Ошибка загрузки статусов:', error)
      throw handleSupabaseError(error)
    }
  }

  /**
   * Получить статусы для счетов
   */
  static async getInvoiceStatuses(): Promise<Status[]> {
    try {
      console.log('[StatusQueryService.getInvoiceStatuses] Загрузка статусов счетов')
      const { data, error } = await StatusCRUD.getByEntityType('invoice')

      if (error) throw error

      console.log('[StatusQueryService.getInvoiceStatuses] Загружено статусов:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('[StatusQueryService.getInvoiceStatuses] Ошибка загрузки статусов счетов:', error)
      throw handleSupabaseError(error)
    }
  }

  /**
   * Получить статусы для платежей
   */
  static async getPaymentStatuses(): Promise<Status[]> {
    try {
      console.log('[StatusQueryService.getPaymentStatuses] Загрузка статусов платежей')
      const { data, error } = await StatusCRUD.getByEntityType('payment')

      if (error) throw error

      console.log('[StatusQueryService.getPaymentStatuses] Загружено статусов:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('[StatusQueryService.getPaymentStatuses] Ошибка загрузки статусов платежей:', error)
      throw handleSupabaseError(error)
    }
  }

  /**
   * Получить статусы для проектов
   */
  static async getProjectStatuses(): Promise<Status[]> {
    try {
      console.log('[StatusQueryService.getProjectStatuses] Загрузка статусов проектов')
      const { data, error } = await StatusCRUD.getByEntityType('project')

      if (error) throw error

      console.log('[StatusQueryService.getProjectStatuses] Загружено статусов:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('[StatusQueryService.getProjectStatuses] Ошибка загрузки статусов проектов:', error)
      throw handleSupabaseError(error)
    }
  }

  /**
   * Получить статус по коду
   */
  static async getByCode(entityType: 'invoice' | 'payment' | 'project', code: string): Promise<Status | null> {
    try {
      console.log('[StatusQueryService.getByCode] Загрузка статуса:', { entityType, code })
      const { data, error } = await StatusCRUD.getByCode(entityType, code)

      if (error && error.code !== 'PGRST116') throw error

      console.log('[StatusQueryService.getByCode] Статус загружен:', data?.name)
      return data || null
    } catch (error) {
      console.error('[StatusQueryService.getByCode] Ошибка загрузки статуса:', error)
      throw handleSupabaseError(error)
    }
  }

  /**
   * Получить статус по ID
   */
  static async getById(id: number): Promise<Status | null> {
    try {
      console.log('[StatusQueryService.getById] Загрузка статуса по ID:', id)
      const { data, error } = await StatusCRUD.getById(id)

      if (error && error.code !== 'PGRST116') throw error

      console.log('[StatusQueryService.getById] Статус загружен:', data?.name)
      return data || null
    } catch (error) {
      console.error('[StatusQueryService.getById] Ошибка загрузки статуса:', error)
      throw handleSupabaseError(error)
    }
  }

  /**
   * Получить начальный статус для типа сущности
   */
  static async getInitialStatus(entityType: 'invoice' | 'payment' | 'project'): Promise<Status | null> {
    try {
      console.log('[StatusQueryService.getInitialStatus] Загрузка начального статуса для:', entityType)
      const { data, error } = await StatusCRUD.getInitialStatus(entityType)

      if (error && error.code !== 'PGRST116') throw error

      console.log('[StatusQueryService.getInitialStatus] Начальный статус:', data?.code)
      return data || null
    } catch (error) {
      console.error('[StatusQueryService.getInitialStatus] Ошибка загрузки начального статуса:', error)
      throw handleSupabaseError(error)
    }
  }

  /**
   * Получить финальные статусы для типа сущности
   */
  static async getFinalStatuses(entityType: 'invoice' | 'payment' | 'project'): Promise<Status[]> {
    try {
      console.log('[StatusQueryService.getFinalStatuses] Загрузка финальных статусов для:', entityType)
      const { data, error } = await StatusCRUD.getFinalStatuses(entityType)

      if (error) throw error

      console.log('[StatusQueryService.getFinalStatuses] Загружено финальных статусов:', data?.length || 0)
      return data || []
    } catch (error) {
      console.error('[StatusQueryService.getFinalStatuses] Ошибка загрузки финальных статусов:', error)
      throw handleSupabaseError(error)
    }
  }

  /**
   * Создать новый статус
   */
  static async create(data: Parameters<typeof StatusCRUD.create>[0]): Promise<Status> {
    try {
      console.log('[StatusQueryService.create] Создание статуса:', data)
      const { data: status, error } = await StatusCRUD.create(data)

      if (error) throw error
      if (!status) throw new Error('Статус не создан')

      console.log('[StatusQueryService.create] Статус создан:', status.id)
      return status
    } catch (error) {
      console.error('[StatusQueryService.create] Ошибка создания статуса:', error)
      throw handleSupabaseError(error)
    }
  }

  /**
   * Обновить статус
   */
  static async update(id: number, data: Parameters<typeof StatusCRUD.update>[1]): Promise<Status> {
    try {
      console.log('[StatusQueryService.update] Обновление статуса:', { id, data })
      const { data: status, error } = await StatusCRUD.update(id, data)

      if (error) throw error
      if (!status) throw new Error('Статус не обновлен')

      console.log('[StatusQueryService.update] Статус обновлен:', status.id)
      return status
    } catch (error) {
      console.error('[StatusQueryService.update] Ошибка обновления статуса:', error)
      throw handleSupabaseError(error)
    }
  }

  /**
   * Удалить статус
   */
  static async delete(id: number): Promise<Status> {
    try {
      console.log('[StatusQueryService.delete] Удаление статуса:', id)
      const { data: status, error } = await StatusCRUD.delete(id)

      if (error) throw error
      if (!status) throw new Error('Статус не удален')

      console.log('[StatusQueryService.delete] Статус удален:', status.id)
      return status
    } catch (error) {
      console.error('[StatusQueryService.delete] Ошибка удаления статуса:', error)
      throw handleSupabaseError(error)
    }
  }
}