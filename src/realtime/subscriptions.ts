/**
 * Сервис управления real-time подписками через Supabase
 */

import {supabase} from '@/services/supabase'
import type {RealtimeChannel} from '@supabase/supabase-js'

type SubscriptionCallback<T = any> = (payload: {
    eventType: 'INSERT' | 'UPDATE' | 'DELETE'
    new?: T
    old?: T
}) => void

class RealtimeService {
    private channels = new Map<string, RealtimeChannel>()

    /**
     * Подписка на изменения в таблице
     */
    subscribeToTable<T>(
        tableName: string,
        callback: SubscriptionCallback<T>,
        filter?: { column: string; value: string | number }
    ): () => void {
        const channelName = `${tableName}${filter ? `_${filter.column}_${filter.value}` : ''}`

        if (this.channels.has(channelName)) {
            console.warn(`Подписка на канал ${channelName} уже существует`)
            return () => {
            }
        }

        const channel = supabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: tableName,
                    ...(filter && {filter: `${filter.column}=eq.${filter.value}`}),
                },
                (payload) => {
                    callback({
                        eventType: payload.eventType as any,
                        new: payload.new as T,
                        old: payload.old as T,
                    })
                }
            )
            .subscribe()

        this.channels.set(channelName, channel)

        // Возвращаем функцию отписки
        return () => {
            this.unsubscribe(channelName)
        }
    }

    /**
     * Подписка на изменения заявок на закупку
     */
    subscribeToProcurementRequests(
        callback: SubscriptionCallback,
        companyId?: string
    ): () => void {
        return this.subscribeToTable(
            'procurement_requests',
            callback,
            companyId ? {column: 'company_id', value: companyId} : undefined
        )
    }

    /**
     * Подписка на изменения платежей
     */
    subscribeToPayments(
        callback: SubscriptionCallback,
        companyId?: string
    ): () => void {
        return this.subscribeToTable(
            'payments',
            callback,
            companyId ? {column: 'company_id', value: companyId} : undefined
        )
    }

    /**
     * Подписка на изменения проектов
     */
    subscribeToProjects(
        callback: SubscriptionCallback,
        companyId?: string
    ): () => void {
        return this.subscribeToTable(
            'projects',
            callback,
            companyId ? {column: 'company_id', value: companyId} : undefined
        )
    }

    /**
     * Подписка на уведомления для пользователя
     */
    subscribeToNotifications(
        userId: string,
        callback: SubscriptionCallback
    ): () => void {
        return this.subscribeToTable(
            'notifications',
            callback,
            {column: 'user_id', value: userId}
        )
    }

    /**
     * Отписка от канала
     */
    unsubscribe(channelName: string): void {
        const channel = this.channels.get(channelName)
        if (channel) {
            void supabase.removeChannel(channel)
            this.channels.delete(channelName)
        }
    }

    /**
     * Отписка от всех каналов
     */
    unsubscribeAll(): void {
        for (const [channelName] of this.channels) {
            this.unsubscribe(channelName)
        }
    }

    /**
     * Получение активных подписок
     */
    getActiveChannels(): string[] {
        return Array.from(this.channels.keys())
    }
}

export const realtimeService = new RealtimeService()

// Хук для использования в React компонентах
import React from 'react'

export const useRealtimeSubscription = <T>(tableName: string, callback: SubscriptionCallback<T>, filter?: {
    column: string;
    value: string | number
}, deps: any[] = []) => {
    React.useEffect(() => {
        const unsubscribe = realtimeService.subscribeToTable(tableName, callback, filter)

        return () => {
            void unsubscribe()
        }
    }, deps)
}

// Хуки для конкретных сущностей
export const useProcurementSubscription = (callback: SubscriptionCallback, companyId?: string, deps: any[] = []) => {
    React.useEffect(() => {
        const unsubscribe = realtimeService.subscribeToProcurementRequests(callback, companyId)

        return () => {
            void unsubscribe()
        }
    }, deps)
}

export const usePaymentsSubscription = (callback: SubscriptionCallback, companyId?: string, deps: any[] = []) => {
    React.useEffect(() => {
        const unsubscribe = realtimeService.subscribeToPayments(callback, companyId)

        return () => {
            void unsubscribe()
        }
    }, deps)
}

export const useNotificationsSubscription = (userId: string, callback: SubscriptionCallback, deps: any[] = []) => {
    React.useEffect(() => {
        if (!userId) {
            return
        }

        const unsubscribe = realtimeService.subscribeToNotifications(userId, callback)

        return () => {
            unsubscribe()
        }
    }, [userId, ...deps])
}