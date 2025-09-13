import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { 
  ContractorCrudService,
  type ContractorFilters,
  ContractorQueryService
} from '../contractors';
import { queryKeys } from './queryKeys';
import type { ContractorInsert, ContractorUpdate, PaginationParams } from '../supabase';

// Список контрагентов
export const useContractorsList = (
  filters?: ContractorFilters,
  pagination?: PaginationParams
) => {
  return useQuery({
    queryKey: queryKeys.contractors.list(filters),
    queryFn: () => ContractorQueryService.getList(filters, pagination),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Получить контрагента по ID
const useContractor = (id: string) => {
  return useQuery({
    queryKey: queryKeys.contractors.detail(id),
    queryFn: () => ContractorCrudService.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Получить контрагента со статистикой
const useContractorWithStats = (id: string) => {
  return useQuery({
    queryKey: queryKeys.contractors.detailWithStats(id),
    queryFn: () => ContractorCrudService.getByIdWithStats(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Создание контрагента
export const useCreateContractor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: ContractorInsert) => {
      console.log('[useCreateContractor] Calling create with data:', data);
      return ContractorCrudService.create(data);
    },
    onSuccess: (result) => {
      console.log('[useCreateContractor] Success result:', result);
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors.all });
      message.success('Контрагент создан');
    },
    onError: (error: any) => {
      console.error('[useCreateContractor] Mutation error:', error);
      message.error(error.message || 'Ошибка создания контрагента');
    },
  });
};

// Обновление контрагента
export const useUpdateContractor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: ContractorUpdate }) => 
      ContractorCrudService.update(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors.detail(variables.id) });
      message.success('Контрагент обновлен');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка обновления контрагента');
    },
  });
};

// Удаление контрагента
export const useDeleteContractor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => ContractorCrudService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors.all });
      message.success('Контрагент удален');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка удаления контрагента');
    },
  });
};

// Деактивация контрагента
export const useDeactivateContractor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => ContractorCrudService.deactivate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors.detail(id) });
      message.success('Контрагент деактивирован');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка деактивации контрагента');
    },
  });
};

// Активация контрагента
export const useActivateContractor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => ContractorCrudService.activate(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.contractors.detail(id) });
      message.success('Контрагент активирован');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка активации контрагента');
    },
  });
};

// Поиск контрагентов
const useSearchContractors = (query: string, limit = 10) => {
  return useQuery({
    queryKey: queryKeys.contractors.search(query),
    queryFn: () => ContractorQueryService.search(query, '', limit),
    enabled: query.length > 2,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Статистика контрагентов
const useContractorsStats = (filters?: ContractorFilters) => {
  return useQuery({
    queryKey: queryKeys.contractors.stats(filters),
    queryFn: () => ContractorQueryService.getStats(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Проверка доступности контрагента
const useCheckContractorAvailability = (contractorId: string) => {
  return useQuery({
    queryKey: queryKeys.contractors.availability(contractorId),
    queryFn: () => ContractorCrudService.checkAvailability(contractorId),
    enabled: !!contractorId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};