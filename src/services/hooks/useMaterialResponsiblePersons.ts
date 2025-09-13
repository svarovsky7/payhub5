/**
 * React Query hooks for Material Responsible Persons (МОЛ)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  MaterialResponsiblePersonCrudService,
  type MaterialResponsiblePersonInsert,
  type MaterialResponsiblePersonUpdate
} from '../materialResponsiblePersons/crud'
import { queryKeys } from './queryKeys'

/**
 * Hook для получения списка МОЛ
 */
export function useMaterialResponsiblePersonsList(filters?: {
  is_active?: boolean
}) {
  return useQuery({
    queryKey: queryKeys.materialResponsiblePersons.list(filters),
    queryFn: async () => {
      console.log('[useMaterialResponsiblePersonsList] Загрузка списка МОЛ:', filters)
      const result = await MaterialResponsiblePersonCrudService.getList(filters)
      
      if (result.error) {
        console.error('[useMaterialResponsiblePersonsList] Ошибка:', result.error)
        throw new Error(result.error)
      }
      
      console.log('[useMaterialResponsiblePersonsList] Загружено МОЛ:', result.data?.length || 0)
      return result.data
    },
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}

/**
 * Hook для получения МОЛ по ID
 */
function useMaterialResponsiblePerson(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.materialResponsiblePersons.detail(id!),
    queryFn: async () => {
      if (!id) {throw new Error('ID не указан')}
      
      console.log('[useMaterialResponsiblePerson] Загрузка МОЛ:', id)
      const result = await MaterialResponsiblePersonCrudService.getById(id)
      
      if (result.error) {
        console.error('[useMaterialResponsiblePerson] Ошибка:', result.error)
        throw new Error(result.error)
      }
      
      return result.data
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 минут
  })
}

/**
 * Hook для создания МОЛ
 */
export function useCreateMaterialResponsiblePerson() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: MaterialResponsiblePersonInsert) => {
      console.log('[useCreateMaterialResponsiblePerson] Создание МОЛ:', data)
      const result = await MaterialResponsiblePersonCrudService.create(data)
      
      if (result.error) {
        console.error('[useCreateMaterialResponsiblePerson] Ошибка:', result.error)
        throw new Error(result.error)
      }
      
      return result.data
    },
    onSuccess: () => {
      console.log('[useCreateMaterialResponsiblePerson] МОЛ успешно создан')
      // Инвалидируем список МОЛ
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.materialResponsiblePersons.lists() 
      })
    },
    onError: (error) => {
      console.error('[useCreateMaterialResponsiblePerson] Ошибка создания:', error)
    }
  })
}

/**
 * Hook для обновления МОЛ
 */
export function useUpdateMaterialResponsiblePerson() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ 
      id, 
      updates 
    }: { 
      id: number
      updates: MaterialResponsiblePersonUpdate 
    }) => {
      console.log('[useUpdateMaterialResponsiblePerson] Обновление МОЛ:', { id, updates })
      const result = await MaterialResponsiblePersonCrudService.update(id, updates)
      
      if (result.error) {
        console.error('[useUpdateMaterialResponsiblePerson] Ошибка:', result.error)
        throw new Error(result.error)
      }
      
      return result.data
    },
    onSuccess: (data) => {
      console.log('[useUpdateMaterialResponsiblePerson] МОЛ успешно обновлен')
      // Инвалидируем список и детали
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.materialResponsiblePersons.lists() 
      })
      if (data?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.materialResponsiblePersons.detail(data.id) 
        })
      }
    },
    onError: (error) => {
      console.error('[useUpdateMaterialResponsiblePerson] Ошибка обновления:', error)
    }
  })
}

/**
 * Hook для полного удаления МОЛ
 */
export function useDeleteMaterialResponsiblePerson() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      console.log('[useDeleteMaterialResponsiblePerson] Удаление МОЛ:', id)
      const result = await MaterialResponsiblePersonCrudService.delete(id)
      
      if (result.error) {
        console.error('[useDeleteMaterialResponsiblePerson] Ошибка:', result.error)
        throw new Error(result.error)
      }
      
      return result.data
    },
    onSuccess: () => {
      console.log('[useDeleteMaterialResponsiblePerson] МОЛ успешно удален')
      // Инвалидируем список
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.materialResponsiblePersons.lists() 
      })
    },
    onError: (error) => {
      console.error('[useDeleteMaterialResponsiblePerson] Ошибка удаления:', error)
    }
  })
}

/**
 * Hook для деактивации МОЛ
 */
export function useDeactivateMaterialResponsiblePerson() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      console.log('[useDeactivateMaterialResponsiblePerson] Деактивация МОЛ:', id)
      const result = await MaterialResponsiblePersonCrudService.deactivate(id)
      
      if (result.error) {
        console.error('[useDeactivateMaterialResponsiblePerson] Ошибка:', result.error)
        throw new Error(result.error)
      }
      
      return result.data
    },
    onSuccess: () => {
      console.log('[useDeactivateMaterialResponsiblePerson] МОЛ успешно деактивирован')
      // Инвалидируем список
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.materialResponsiblePersons.lists() 
      })
    },
    onError: (error) => {
      console.error('[useDeactivateMaterialResponsiblePerson] Ошибка деактивации:', error)
    }
  })
}

/**
 * Hook для активации МОЛ
 */
export function useActivateMaterialResponsiblePerson() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: number) => {
      console.log('[useActivateMaterialResponsiblePerson] Активация МОЛ:', id)
      const result = await MaterialResponsiblePersonCrudService.activate(id)
      
      if (result.error) {
        console.error('[useActivateMaterialResponsiblePerson] Ошибка:', result.error)
        throw new Error(result.error)
      }
      
      return result.data
    },
    onSuccess: (data) => {
      console.log('[useActivateMaterialResponsiblePerson] МОЛ успешно активирован')
      // Инвалидируем список и детали
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.materialResponsiblePersons.lists() 
      })
      if (data?.id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.materialResponsiblePersons.detail(data.id) 
        })
      }
    },
    onError: (error) => {
      console.error('[useActivateMaterialResponsiblePerson] Ошибка активации:', error)
    }
  })
}