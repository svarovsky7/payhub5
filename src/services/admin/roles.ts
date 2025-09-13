/**
 * Service for managing user roles
 */

import {handleSupabaseError, supabase} from '../supabase'

export interface Role {
    id: number
    code: string
    name: string
    description?: string
    is_active: boolean
    view_own_project_only?: boolean
    created_at: string
    updated_at: string
}

export interface CreateRoleData {
    code: string
    name: string
    description?: string
    is_active?: boolean
    view_own_project_only?: boolean
}

export interface UpdateRoleData {
    name?: string
    description?: string
    is_active?: boolean
    view_own_project_only?: boolean
}

export class RolesService {
    /**
     * Get all roles
     */
    static async getRoles(): Promise<Role[]> {
        console.log('[RolesService.getRoles] Fetching all roles')

        const {data, error} = await supabase
            .from('roles')
            .select('*')
            .order('name', {ascending: true})

        if (error) {
            console.error('[RolesService.getRoles] Error:', error)
            throw handleSupabaseError(error)
        }

        console.log('[RolesService.getRoles] Fetched roles:', data)
        return data ?? []
    }

    /**
     * Get role by ID
     */
    static async getRole(id: number): Promise<Role> {
        console.log('[RolesService.getRole] Fetching role:', id)

        const {data, error} = await supabase
            .from('roles')
            .select('*')
            .eq('id', id)
            .single()

        if (error) {
            console.error('[RolesService.getRole] Error:', error)
            throw handleSupabaseError(error)
        }

        console.log('[RolesService.getRole] Fetched role:', data)
        return data
    }

    /**
     * Create new role
     */
    static async createRole(roleData: CreateRoleData): Promise<Role> {
        console.log('[RolesService.createRole] Creating role:', roleData)

        try {
            console.log('[RolesService.createRole] Preparing insert data...')
            const insertData = {
                ...roleData,
                is_active: roleData.is_active !== false,
                view_own_project_only: roleData.view_own_project_only ?? false
            }
            console.log('[RolesService.createRole] Insert data:', insertData)

            console.log('[RolesService.createRole] Calling supabase insert...')
            const {data, error} = await supabase
                .from('roles')
                .insert(insertData)
                .select()
                .single()

            console.log('[RolesService.createRole] Supabase response:', {data, error})

            if (error) {
                console.error('[RolesService.createRole] Error:', error)
                throw handleSupabaseError(error)
            }

            console.log('[RolesService.createRole] Created role successfully:', data)
            return data
        } catch (err) {
            console.error('[RolesService.createRole] Caught error:', err)
            throw err
        }
    }

    /**
     * Update role
     */
    static async updateRole(id: number, updates: UpdateRoleData): Promise<Role> {
        console.log('[RolesService.updateRole] Updating role:', id, updates)

        const {data, error} = await supabase
            .from('roles')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single()

        if (error) {
            console.error('[RolesService.updateRole] Error:', error)
            throw handleSupabaseError(error)
        }

        console.log('[RolesService.updateRole] Updated role:', data)
        return data
    }

    /**
     * Delete role
     */
    static async deleteRole(id: number): Promise<void> {
        console.log('[RolesService.deleteRole] Deleting role:', id)

        try {
            // Delete the role directly - database will handle foreign key constraints
            const {error} = await supabase
                .from('roles')
                .delete()
                .eq('id', id)

            if (error) {
                console.error('[RolesService.deleteRole] Error:', error)
                // Check if error is due to foreign key constraint
                if (error.message?.includes('foreign key') || error.message?.includes('constraint')) {
                    throw new Error('Невозможно удалить роль, так как она используется пользователями')
                }
                throw handleSupabaseError(error)
            }

            console.log('[RolesService.deleteRole] Successfully deleted role:', id)
        } catch (err) {
            console.error('[RolesService.deleteRole] Caught error:', err)
            throw err
        }
    }

}