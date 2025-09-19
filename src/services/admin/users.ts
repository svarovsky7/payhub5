/**
 * User management service for admin
 */

import {
    type ApiResponse,
    exportToExcel,
    type FilterParams,
    formatDate,
    handleSupabaseError,
    type PaginatedResponse,
    type PaginationParams,
    supabase,
    type User,
    type UserInsert,
    type UserUpdate
} from '../supabase'

export interface UserWithRelations extends User {
    company: {
        id: string
        name: string
    }
    stats: {
        invoicesCreated: number
        invoicesAmount: number
        paymentsProcessed: number
        paymentsAmount: number
        lastActivity?: string
    }
}

export interface UserFilters extends FilterParams {
    isActive?: boolean
    lastLoginFrom?: string
    lastLoginTo?: string
}

export interface UserStats {
    total: number
    active: number
    inactive: number
    newUsersThisMonth: number
    activeUsersThisWeek: number
}

export class UserManagementService {

    /**
     * Получить пользователя по ID
     */
    static async getById(id: string): Promise<ApiResponse<User>> {
        console.log('[UserService] getById called with id:', id)
        try {
            const {data, error} = await supabase
                .from('users')
                .select('*')
                .eq('id', id)
                .eq('is_active', true)
                .single()

            if (error) {
                console.error('[UserService] getById error:', error)
                throw error
            }

            console.log('[UserService] getById success:', data)
            return {data: data as User, error: null}
        } catch (error) {
            console.error('[UserService] getById exception:', error)
            return {
                data: null,
                error: handleSupabaseError(error).error
            }
        }
    }

    /**
     * Получить список пользователей с фильтрацией
     */
    static async getList(
        filters: UserFilters = {},
        pagination: PaginationParams = {}
    ): Promise<PaginatedResponse<UserWithRelations>> {
        console.log('[UserService] getList called with filters:', filters, 'pagination:', pagination)
        try {
            const {page = 1, limit = 20, sortBy = 'created_at', sortOrder = 'desc'} = pagination
            const from = (page - 1) * limit
            const to = from + limit - 1

            console.log('[UserService] Query params - from:', from, 'to:', to, 'sortBy:', sortBy, 'sortOrder:', sortOrder)

            // Simplified query without joins first
            let query = supabase
                .from('users')
                .select('*', {count: 'exact'})

            // Применяем фильтры
            if (filters.isActive !== undefined) {
                query = query.eq('is_active', filters.isActive)
            } else {
                // По умолчанию показываем всех пользователей (и активных, и неактивных)
                // Если нужно показать только активных, это должно быть явно указано в фильтрах
            }

            if (filters.lastLoginFrom) {
                query = query.gte('last_login', filters.lastLoginFrom)
            }

            if (filters.lastLoginTo) {
                query = query.lte('last_login', filters.lastLoginTo)
            }

            if (filters.dateFrom) {
                query = query.gte('created_at', filters.dateFrom)
            }

            if (filters.dateTo) {
                query = query.lte('created_at', filters.dateTo)
            }

            // Поиск
            if (filters.search) {
                query = query.or(
                    `full_name.ilike.%${filters.search}%,` +
                    `email.ilike.%${filters.search}%,` +
                    `position.ilike.%${filters.search}%`
                )
            }

            // Сортировка и пагинация
            query = query
                .order(sortBy, {ascending: sortOrder === 'asc'})
                .range(from, to)

            const {data, error, count} = await query

            console.log('[UserService] Query result - data:', data, 'count:', count, 'error:', error)

            if (error) {
                throw error
            }

            // Преобразуем данные в нужный формат
            const usersWithStats = (data ?? []).map((user) => ({
                ...user,
                company: {
                    id: '',
                    name: 'Company'
                },
                stats: {
                    invoicesCreated: 0,
                    invoicesAmount: 0,
                    paymentsProcessed: 0,
                    paymentsAmount: 0,
                    lastActivity: user.updated_at
                }
            } as UserWithRelations))

            const totalPages = Math.ceil((count || 0) / limit)

            console.log('[UserService] Returning users:', usersWithStats.length, 'total pages:', totalPages)

            return {
                data: usersWithStats,
                error: null,
                count: count || 0,
                page,
                limit,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
            }
        } catch (error) {
            console.error('[UserService] getList exception:', error)
            return {
                data: [],
                error: handleSupabaseError(error).error,
                count: 0,
                page: pagination.page || 1,
                limit: pagination.limit || 20,
                totalPages: 0,
                hasNextPage: false,
                hasPrevPage: false,
            }
        }
    }

    /**
     * Создать нового пользователя
     */
    static async create(
        userData: UserInsert,
        password: string
    ): Promise<ApiResponse<User>> {
        try {
            // Проверяем уникальность email среди активных пользователей
            const {data: existingUser} = await supabase
                .from('users')
                .select('id')
                .eq('email', userData.email)
                .eq('is_active', true)
                .single()

            if (existingUser) {
                return {
                    data: null,
                    error: 'Пользователь с таким email уже существует'
                }
            }

            // Создаем пользователя через Supabase Auth
            const {data: authData, error: authError} = await supabase.auth.admin.createUser({
                email: userData.email,
                password,
                email_confirm: true,
                user_metadata: {
                    first_name: userData.first_name,
                    last_name: userData.last_name,
                    middle_name: userData.middle_name,
                }
            })

            if (authError) {
                throw authError
            }

            // Создаем запись в таблице users
            const userRecord: UserInsert = {
                ...userData,
                id: authData.user.id,
                is_active: userData.is_active ?? true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }

            const {data, error} = await supabase
                .from('users')
                .insert([userRecord])
                .select()
                .single()

            if (error) {
                // Если создание записи в таблице failed, удаляем auth пользователя
                await supabase.auth.admin.deleteUser(authData.user.id)
                throw error
            }

            return {data: data as User, error: null}
        } catch (error) {
            console.error('Ошибка создания пользователя:', error)
            return {
                data: null,
                error: handleSupabaseError(error).error
            }
        }
    }

    /**
     * Обновить пользователя
     */
    static async update(
        id: string,
        updates: UserUpdate
    ): Promise<ApiResponse<User>> {
        try {
            // Проверяем уникальность email если он изменился
            if (updates.email) {
                const {data: currentUser} = await supabase
                    .from('users')
                    .select('email')
                    .eq('id', id)
                    .single()

                if (currentUser && updates.email !== currentUser.email) {
                    const {data: existingUser} = await supabase
                        .from('users')
                        .select('id')
                        .eq('email', updates.email)
                        .neq('id', id)
                        .single()

                    if (existingUser) {
                        return {
                            data: null,
                            error: 'Пользователь с таким email уже существует'
                        }
                    }

                    // Обновляем email в Supabase Auth
                    const {error: authError} = await supabase.auth.admin.updateUserById(id, {
                        email: updates.email
                    })

                    if (authError) {
                        throw authError
                    }
                }
            }

            const updateData = {
                ...updates,
                updated_at: new Date().toISOString(),
            }

            const {data, error} = await supabase
                .from('users')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw error
            }

            return {data: data as User, error: null}
        } catch (error) {
            console.error('Ошибка обновления пользователя:', error)
            return {
                data: null,
                error: handleSupabaseError(error).error
            }
        }
    }

    /**
     * Деактивировать пользователя
     */
    static async deactivate(
        id: string,
        reason?: string
    ): Promise<ApiResponse<User>> {
        console.log('[UserService] deactivate called with id:', id, 'reason:', reason)

        try {
            const updateData: UserUpdate = {
                is_active: false,
                updated_at: new Date().toISOString(),
            }

            console.log('[UserService] Update data prepared:', updateData)

            if (reason) {
                // Сохраняем причину в настройках пользователя
                const {data: currentUser, error: fetchError} = await supabase
                    .from('users')
                    .select('settings')
                    .eq('id', id)
                    .single()

                console.log('[UserService] Current user settings fetch:', {currentUser, fetchError})

                const settings = currentUser?.settings ?? {}
                settings.deactivation_reason = reason
                settings.deactivated_at = new Date().toISOString()
                updateData.settings = settings
            }

            console.log('[UserService] Executing update with data:', updateData)

            const {data, error} = await supabase
                .from('users')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            console.log('[UserService] Update result:', {data, error})

            if (error) {
                throw error
            }

            console.log('[UserService] User deactivated successfully:', id)
            return {data: data as User, error: null}
        } catch (error) {
            console.error('[UserService] Error deactivating user:', error)
            return {
                data: null,
                error: handleSupabaseError(error).error
            }
        }
    }

    /**
     * Активировать пользователя
     */
    static async activate(id: string): Promise<ApiResponse<User>> {
        try {
            // Очищаем информацию о деактивации
            const {data: currentUser} = await supabase
                .from('users')
                .select('settings')
                .eq('id', id)
                .single()

            const settings = currentUser?.settings ?? {}
            delete settings.deactivation_reason
            delete settings.deactivated_at
            settings.reactivated_at = new Date().toISOString()

            const updateData: UserUpdate = {
                is_active: true,
                settings,
                updated_at: new Date().toISOString(),
            }

            const {data, error} = await supabase
                .from('users')
                .update(updateData)
                .eq('id', id)
                .select()
                .single()

            if (error) {
                throw error
            }

            return {data: data as User, error: null}
        } catch (error) {
            console.error('Ошибка активации пользователя:', error)
            return {
                data: null,
                error: handleSupabaseError(error).error
            }
        }
    }

    /**
     * Сбросить пароль пользователя
     */
    static async resetPassword(
        id: string,
        newPassword: string
    ): Promise<ApiResponse<null>> {
        try {
            const {error} = await supabase.auth.admin.updateUserById(id, {
                password: newPassword
            })

            if (error) {
                throw error
            }

            // Обновляем время изменения пароля в настройках
            const {data: currentUser} = await supabase
                .from('users')
                .select('settings')
                .eq('id', id)
                .single()

            const settings = currentUser?.settings ?? {}
            settings.password_reset_at = new Date().toISOString()

            await supabase
                .from('users')
                .update({
                    settings,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)

            return {data: null, error: null}
        } catch (error) {
            console.error('Ошибка сброса пароля:', error)
            return {
                data: null,
                error: handleSupabaseError(error).error
            }
        }
    }


    /**
     * Получить статистику пользователей
     */
    static async getStats(): Promise<UserStats> {
        try {
            const {data: users, error} = await supabase
                .from('users')
                .select(`
          id, is_active, created_at, last_login
        `)

            if (error) {
                throw error
            }

            const usersList = users ?? []
            const total = usersList.length
            const active = usersList.filter(u => u.is_active).length
            const inactive = total - active


            // Новые пользователи за месяц
            const monthAgo = new Date()
            monthAgo.setMonth(monthAgo.getMonth() - 1)
            const newUsersThisMonth = usersList.filter(
                u => new Date(u.created_at) >= monthAgo
            ).length

            // Активные за неделю
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            const activeUsersThisWeek = usersList.filter(
                u => u.last_login && new Date(u.last_login) >= weekAgo
            ).length

            return {
                total,
                active,
                inactive,
                newUsersThisMonth,
                activeUsersThisWeek,
            }
        } catch (error) {
            console.error('Ошибка получения статистики пользователей:', error)
            return {
                total: 0,
                active: 0,
                inactive: 0,
                newUsersThisMonth: 0,
                activeUsersThisWeek: 0,
            }
        }
    }

    /**
     * Получить статистику активности пользователя
     */
    private static async getUserStats(userId: string) {
        try {
            const [invoicesData, paymentsData] = await Promise.all([
                supabase
                    .from('invoices')
                    .select('id, amount, created_at')
                    .eq('created_by', userId),
                supabase
                    .from('payments')
                    .select('id, amount, processed_date')
                    .eq('processed_by', userId)
                    .not('processed_date', 'is', null)
            ])

            const invoices = invoicesData.data ?? []
            const payments = paymentsData.data ?? []

            const invoicesCreated = invoices.length
            const invoicesAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)
            const paymentsProcessed = payments.length
            const paymentsAmount = payments.reduce((sum, pay) => sum + pay.amount, 0)

            // Последняя активность
            const allActivities = [
                ...invoices.map(i => i.created_at),
                ...payments.map(p => p.processed_date)
            ].filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

            const lastActivity = allActivities[0]

            return {
                invoicesCreated,
                invoicesAmount,
                paymentsProcessed,
                paymentsAmount,
                lastActivity,
            }
        } catch (error) {
            console.error('Ошибка получения статистики пользователя:', error)
            return {
                invoicesCreated: 0,
                invoicesAmount: 0,
                paymentsProcessed: 0,
                paymentsAmount: 0,
            }
        }
    }

    /**
     * Экспорт пользователей в Excel
     */
    static async exportToExcel(
        filters: UserFilters = {},
        filename = 'users'
    ): Promise<void> {
        try {
            const result = await this.getList(filters, {limit: 10000})

            if (result.error ?? !result.data?.length) {
                throw new Error('Нет данных для экспорта')
            }

            const columns = [
                {key: 'fullName', label: 'ФИО'},
                {key: 'email', label: 'Email'},
                {key: 'position', label: 'Должность'},
                {key: 'phone', label: 'Телефон'},
                {key: 'isActiveLabel', label: 'Статус'},
                {key: 'formattedLastLogin', label: 'Последний вход'},
                {key: 'formattedCreatedAt', label: 'Дата создания'},
                {key: 'invoicesCreated', label: 'Создано заявок'},
                {key: 'paymentsProcessed', label: 'Обработано платежей'},
            ]

            const exportData = result.data.map(user => ({
                ...user,
                fullName: `${user.last_name} ${user.first_name}${user.middle_name ? ` ${user.middle_name}` : ''}`,
                isActiveLabel: user.is_active ? 'Активный' : 'Неактивный',
                formattedLastLogin: user.last_login
                    ? formatDate(user.last_login)
                    : 'Никогда',
                formattedCreatedAt: formatDate(user.created_at),
                invoicesCreated: user.stats.invoicesCreated,
                paymentsProcessed: user.stats.paymentsProcessed,
            }))

            await exportToExcel(exportData, filename, columns)
        } catch (error) {
            console.error('Ошибка экспорта пользователей:', error)
            throw new Error(handleSupabaseError(error).error || 'Ошибка экспорта пользователей')
        }
    }

    /**
     * Поиск пользователей
     */
    static async search(
        query: string,
        limit = 10
    ): Promise<UserWithRelations[]> {
        try {
            const result = await this.getList(
                {search: query},
                {limit}
            )

            return result.data
        } catch (error) {
            console.error('Ошибка поиска пользователей:', error)
            return []
        }
    }

    /**
     * Получить активных пользователей для назначения
     */
    static async getActiveUsersForAssignment(): Promise<User[]> {
        try {
            const {data, error} = await supabase
                .from('users')
                .select('id, first_name, last_name, email, position')
                .eq('is_active', true)
                .order('last_name', {ascending: true})

            if (error) {
                throw error
            }

            return (data as User[]) || []
        } catch (error) {
            console.error('Ошибка получения активных пользователей:', error)
            return []
        }
    }

}