import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { UserManagementService } from '../admin/users';
import { queryKeys } from './queryKeys';
import type { User } from '../../types/database';

// Получить пользователя
export const useUser = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => UserManagementService.getById(userId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Список пользователей
export const useUsersList = () => {
  return useQuery({
    queryKey: queryKeys.users.list(),
    queryFn: async () => {
      const result = await UserManagementService.getList();
      return result.data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Создание пользователя
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userData, password }: { userData: any; password: string }) => {
      console.log('[useCreateUser] Creating user with data:', userData);
      return UserManagementService.create(userData, password);
    },
    onSuccess: (data, variables) => {
      console.log('[useCreateUser] User created successfully:', data);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      message.success('Пользователь создан');
    },
    onError: (error: any, variables) => {
      console.error('[useCreateUser] Error creating user:', variables, error);
      message.error(error.message || 'Ошибка создания пользователя');
    },
  });
};

// Обновление пользователя
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<User> }) => {
      console.log('[useUpdateUser] Updating user:', id, 'with data:', data);
      return UserManagementService.update(id, data);
    },
    onSuccess: (data, variables) => {
      console.log('[useUpdateUser] User updated successfully:', variables);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      message.success('Пользователь обновлен');
    },
    onError: (error: any, variables) => {
      console.error('[useUpdateUser] Error updating user:', variables, error);
      message.error(error.message || 'Ошибка обновления пользователя');
    },
  });
};

// Удаление пользователя
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => {
      console.log('[useDeleteUser] Deleting user with id:', id);
      return UserManagementService.deactivate(id);
    },
    onSuccess: (data, variables) => {
      console.log('[useDeleteUser] User deleted successfully:', variables);
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      message.success('Пользователь удален');
    },
    onError: (error: any, variables) => {
      console.error('[useDeleteUser] Error deleting user:', variables, error);
      message.error(error.message || 'Ошибка удаления пользователя');
    },
  });
};

