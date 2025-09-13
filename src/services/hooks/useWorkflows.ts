import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { WorkflowConfigService } from '../admin/workflow-config';
import { queryKeys } from './queryKeys';

// Список workflow
export const useWorkflowsList = () => {
  return useQuery({
    queryKey: queryKeys.workflows.all,
    queryFn: () => WorkflowConfigService.getWorkflows(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Получить workflow
export const useWorkflow = (id: number) => {
  return useQuery({
    queryKey: queryKeys.workflows.item(String(id)),
    queryFn: () => WorkflowConfigService.getWorkflow(id),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Создание workflow
export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: WorkflowConfigService.createWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
      message.success('Процесс создан');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка создания процесса');
    },
  });
};

// Обновление workflow
export const useUpdateWorkflow = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      WorkflowConfigService.updateWorkflow(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
      message.success('Процесс обновлен');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка обновления процесса');
    },
  });
};

// Удаление workflow
export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: WorkflowConfigService.deleteWorkflow,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.workflows.all });
      message.success('Процесс удален');
    },
    onError: (error: any) => {
      message.error(error.message || 'Ошибка удаления процесса');
    },
  });
};