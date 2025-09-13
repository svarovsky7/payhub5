/**
 * Theme Management Hooks
 * TanStack Query hooks for theme operations with caching and real-time updates
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'

import {
  cloneThemeQuery,
  type CreateThemeData,
  createThemeQuery,
  deleteThemeQuery,
  getDefaultThemeQuery,
  getThemeByIdQuery,
  getThemesQuery,
  saveThemeConfigQuery,
  setDefaultThemeQuery,
  updateThemeConfigQuery,
  updateThemeQuery
} from '../themes/queries'
import type { CustomThemeConfig } from '@/models/theme'

// Query keys for caching
export const themeQueryKeys = {
  all: ['themes'] as const,
  lists: () => [...themeQueryKeys.all, 'list'] as const,
  list: (companyId?: string, userId?: string) => [...themeQueryKeys.lists(), companyId, userId] as const,
  details: () => [...themeQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...themeQueryKeys.details(), id] as const,
  default: (companyId?: string) => [...themeQueryKeys.all, 'default', companyId] as const,
}

// Default stale time for theme queries (5 minutes)
const STALE_TIME = 5 * 60 * 1000

/**
 * Hook to get all themes
 */
export const useThemesList = (companyId?: string, userId?: string) => {
  return useQuery({
    queryKey: themeQueryKeys.list(companyId, userId),
    queryFn: () => getThemesQuery(companyId, userId),
    staleTime: STALE_TIME,
    select: (result) => {
      if (result.error) {
        console.error('[useThemesList] Query error:', result.error)
        throw new Error(result.error)
      }
      return result.data
    }
  })
}

/**
 * Hook to get theme by ID
 */
export const useTheme = (id: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: themeQueryKeys.detail(id),
    queryFn: () => getThemeByIdQuery(id),
    enabled: enabled && !!id,
    staleTime: STALE_TIME,
    select: (result) => {
      if (result.error) {
        console.error('[useTheme] Query error:', result.error)
        throw new Error(result.error)
      }
      return result.data
    }
  })
}

/**
 * Hook to get default theme
 */
export const useDefaultTheme = (companyId?: string) => {
  return useQuery({
    queryKey: themeQueryKeys.default(companyId),
    queryFn: () => getDefaultThemeQuery(companyId),
    staleTime: STALE_TIME,
    select: (result) => {
      if (result.error) {
        console.error('[useDefaultTheme] Query error:', result.error)
        throw new Error(result.error)
      }
      return result.data
    }
  })
}

/**
 * Hook to create theme
 */
export const useCreateTheme = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: createThemeQuery,
    onSuccess: (result, variables) => {
      if (result.error) {
        console.error('[useCreateTheme] Creation error:', result.error)
        message.error(result.error)
        return
      }

      console.log('[useCreateTheme] Theme created successfully:', result.data?.id)
      message.success(`Тема "${result.data?.name}" создана`)
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.lists() })
    },
    onError: (error: Error) => {
      console.error('[useCreateTheme] Mutation error:', error)
      message.error(error.message || 'Ошибка создания темы')
    }
  })
}

/**
 * Hook to update theme
 */
export const useUpdateTheme = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string, data: any }) => 
      updateThemeQuery(id, data),
    onSuccess: (result, variables) => {
      if (result.error) {
        console.error('[useUpdateTheme] Update error:', result.error)
        message.error(result.error)
        return
      }

      console.log('[useUpdateTheme] Theme updated successfully:', result.data?.id)
      message.success(`Тема "${result.data?.name}" обновлена`)
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.detail(variables.id) })
    },
    onError: (error: Error) => {
      console.error('[useUpdateTheme] Mutation error:', error)
      message.error(error.message || 'Ошибка обновления темы')
    }
  })
}

/**
 * Hook to delete theme
 */
export const useDeleteTheme = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: deleteThemeQuery,
    onSuccess: (result, themeId) => {
      if (result.error) {
        console.error('[useDeleteTheme] Delete error:', result.error)
        message.error(result.error)
        return
      }

      console.log('[useDeleteTheme] Theme deleted successfully:', themeId)
      message.success('Тема удалена')
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.lists() })
      queryClient.removeQueries({ queryKey: themeQueryKeys.detail(themeId) })
    },
    onError: (error: Error) => {
      console.error('[useDeleteTheme] Mutation error:', error)
      message.error(error.message || 'Ошибка удаления темы')
    }
  })
}

/**
 * Hook to clone theme
 */
export const useCloneTheme = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ sourceId, newName, userId, companyId }: {
      sourceId: string
      newName: string
      userId?: string
      companyId?: string
    }) => cloneThemeQuery(sourceId, newName, userId, companyId),
    onSuccess: (result) => {
      if (result.error) {
        console.error('[useCloneTheme] Clone error:', result.error)
        message.error(result.error)
        return
      }

      console.log('[useCloneTheme] Theme cloned successfully:', result.data?.id)
      message.success(`Тема "${result.data?.name}" скопирована`)
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.lists() })
    },
    onError: (error: Error) => {
      console.error('[useCloneTheme] Mutation error:', error)
      message.error(error.message || 'Ошибка копирования темы')
    }
  })
}

/**
 * Hook to set default theme
 */
export const useSetDefaultTheme = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ themeId, companyId }: { themeId: string, companyId: string }) =>
      setDefaultThemeQuery(themeId, companyId),
    onSuccess: (result, variables) => {
      if (result.error) {
        console.error('[useSetDefaultTheme] Set default error:', result.error)
        message.error(result.error)
        return
      }

      console.log('[useSetDefaultTheme] Default theme set successfully:', result.data?.id)
      message.success(`Тема "${result.data?.name}" установлена по умолчанию`)
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.default(variables.companyId) })
    },
    onError: (error: Error) => {
      console.error('[useSetDefaultTheme] Mutation error:', error)
      message.error(error.message || 'Ошибка установки темы по умолчанию')
    }
  })
}

/**
 * Hook to save theme configuration
 */
export const useSaveThemeConfig = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({
      name,
      config,
      description,
      userId,
      companyId
    }: {
      name: string
      config: CustomThemeConfig
      description?: string
      userId?: string
      companyId?: string
    }) => saveThemeConfigQuery(name, config, description, userId, companyId),
    onSuccess: (result) => {
      if (result.error) {
        console.error('[useSaveThemeConfig] Save error:', result.error)
        message.error(result.error)
        return
      }

      console.log('[useSaveThemeConfig] Theme config saved successfully:', result.data?.id)
      message.success(`Тема "${result.data?.name}" сохранена`)
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.lists() })
    },
    onError: (error: Error) => {
      console.error('[useSaveThemeConfig] Mutation error:', error)
      message.error(error.message || 'Ошибка сохранения конфигурации темы')
    }
  })
}

/**
 * Hook to update theme configuration
 */
export const useUpdateThemeConfig = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({
      id,
      config,
      name,
      description
    }: {
      id: string
      config: CustomThemeConfig
      name?: string
      description?: string
    }) => updateThemeConfigQuery(id, config, name, description),
    onSuccess: (result, variables) => {
      if (result.error) {
        console.error('[useUpdateThemeConfig] Update error:', result.error)
        message.error(result.error)
        return
      }

      console.log('[useUpdateThemeConfig] Theme config updated successfully:', result.data?.id)
      message.success(`Конфигурация темы обновлена`)
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: themeQueryKeys.detail(variables.id) })
    },
    onError: (error: Error) => {
      console.error('[useUpdateThemeConfig] Mutation error:', error)
      message.error(error.message || 'Ошибка обновления конфигурации темы')
    }
  })
}