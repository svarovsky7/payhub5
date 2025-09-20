/**
 * React Query hooks for database enums
 */

import { useQuery } from '@tanstack/react-query'
import { EnumQueryService } from '../enums/queries'
import { queryKeys } from './queryKeys'


/**
 * Hook for fetching currency options
 */
export const useCurrencies = () => {
  return useQuery({
    queryKey: queryKeys.enums.currencies(),
    queryFn: () => EnumQueryService.getCurrencyOptions(),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

/**
 * Hook for fetching priority options
 */
export const usePriorities = () => {
  return useQuery({
    queryKey: queryKeys.enums.priorities(),
    queryFn: () => EnumQueryService.getPriorityOptions(),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  })
}

// Export helper functions from query service
export {
  EnumQueryService
} from '../enums/queries'

// Export types
export type { EnumValue } from '../enums/crud'