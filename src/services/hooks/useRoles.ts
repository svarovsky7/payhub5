/**
 * React Query hooks for roles management
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import { type CreateRoleData, type Role, RolesService, type UpdateRoleData } from '../admin/roles'

const ROLES_QUERY_KEY = 'roles'

/**
 * Hook for fetching roles list
 */
export const useRolesList = () => {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY],
    queryFn: () => RolesService.getRoles(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}

/**
 * Hook for fetching single role
 */
export const useRole = (id: number | undefined) => {
  return useQuery({
    queryKey: [ROLES_QUERY_KEY, id],
    queryFn: () => id ? RolesService.getRole(id) : null,
    enabled: !!id,
  })
}

/**
 * Hook for creating role
 */
export const useCreateRole = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (data: CreateRoleData) => {
      console.log('[useCreateRole] Starting mutation with data:', data)
      try {
        const result = await RolesService.createRole(data)
        console.log('[useCreateRole] Service returned:', result)
        return result
      } catch (error) {
        console.error('[useCreateRole] Service threw error:', error)
        throw error
      }
    },
    onSuccess: (data) => {
      console.log('[useCreateRole] onSuccess called with data:', data)
      message.success('Роль успешно создана')
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] })
    },
    onError: (error: any) => {
      console.error('[useCreateRole] onError called with error:', error)
      message.error(error?.message || 'Ошибка при создании роли')
    },
  })
}

/**
 * Hook for updating role
 */
export const useUpdateRole = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateRoleData }) => 
      RolesService.updateRole(id, data),
    onSuccess: (data) => {
      console.log('[useUpdateRole] Role updated:', data)
      message.success('Роль успешно обновлена')
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] })
    },
    onError: (error: any) => {
      console.error('[useUpdateRole] Error:', error)
      message.error(error?.message || 'Ошибка при обновлении роли')
    },
  })
}

/**
 * Hook for deleting role
 */
export const useDeleteRole = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: number) => RolesService.deleteRole(id),
    onSuccess: (_, id) => {
      console.log('[useDeleteRole] Role deleted:', id)
      message.success('Роль успешно удалена')
      queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] })
    },
    onError: (error: any) => {
      console.error('[useDeleteRole] Error:', error)
      message.error(error?.message || 'Ошибка при удалении роли')
    },
  })
}

