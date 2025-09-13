import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { ProjectCrudService, ProjectQueryService } from '../projects';
import { queryKeys } from './queryKeys';

// Список проектов
export const useProjectsList = (filters?: any) => {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => ProjectQueryService.listProjects(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Создание проекта
export const useCreateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => {
      console.log('[useCreateProject] Creating project with data:', data);
      return ProjectCrudService.createProject(data);
    },
    onSuccess: (data) => {
      console.log('[useCreateProject] Project created successfully:', data);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      message.success('Проект создан');
    },
    onError: (error: any) => {
      console.error('[useCreateProject] Error creating project:', error);
      message.error(error.message || 'Ошибка создания проекта');
    },
  });
};

// Обновление проекта
export const useUpdateProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      console.log('[useUpdateProject] Updating project with id:', id, 'data:', data);
      return ProjectCrudService.updateProject(id, data);
    },
    onSuccess: (data) => {
      console.log('[useUpdateProject] Project updated successfully:', data);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      message.success('Проект обновлен');
    },
    onError: (error: any) => {
      console.error('[useUpdateProject] Error updating project:', error);
      message.error(error.message || 'Ошибка обновления проекта');
    },
  });
};

// Удаление проекта
export const useDeleteProject = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      console.log('[useDeleteProject] Deleting project with id:', id);
      const result = await ProjectCrudService.deleteProject(id);
      console.log('[useDeleteProject] Delete service result:', result);
      
      // Если есть ошибка от сервиса, возвращаем результат как есть
      if (result.error) {
        return result;
      }
      
      // Если удаление успешно
      return result;
    },
    onSuccess: (data) => {
      console.log('[useDeleteProject] Mutation onSuccess, data:', data);
      
      // Только инвалидируем кэш если удаление прошло успешно
      if (data.error === null) {
        queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
        // Не показываем сообщение здесь - пусть компонент решает
      }
    },
    onError: (error: any) => {
      console.error('[useDeleteProject] Mutation onError:', error);
      // Не показываем сообщение здесь - пусть компонент решает
    },
  });
};