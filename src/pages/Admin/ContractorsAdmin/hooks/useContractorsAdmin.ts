/**
 * Custom hooks for ContractorsAdmin component
 */

import { useEffect, useState } from 'react'
import { message } from 'antd'
import { supabase } from '@/services/supabase'
import {
  useActivateContractor,
  useContractorsList,
  useCreateContractor,
  useDeactivateContractor,
  useDeleteContractor,
  useUpdateContractor
} from '@/services/hooks/useContractors'
import type { Contractor, ContractorType } from '../types'

export const useContractorsData = () => {
  const [contractorFilters, setContractorFilters] = useState<Record<string, any>>({})
  const [contractorPagination, setContractorPagination] = useState({ page: 1, limit: 50 })

  const {
    data: contractorsResponse,
    isLoading: loadingContractors,
    refetch: refetchContractors
  } = useContractorsList(contractorFilters, contractorPagination)

  const contractors = contractorsResponse?.data ?? []

  const createContractor = useCreateContractor()
  const updateContractor = useUpdateContractor()
  const deleteContractor = useDeleteContractor()
  const activateContractor = useActivateContractor()
  const deactivateContractor = useDeactivateContractor()

  // Logging for debugging supplier_code
  useEffect(() => {
    if (contractors.length > 0) {
      console.log('[ContractorsAdmin] Loaded contractors:', contractors)
      console.log('[ContractorsAdmin] First contractor supplier_code:', contractors[0]?.supplier_code)
    }
  }, [contractors])

  const handleCreateContractor = async (values: any) => {
    console.log('[ContractorsAdmin] Creating contractor with values:', values)
    try {
      const payload = {
        name: values.name,
        inn: values.inn,
        type_id: values.type_id,
        is_active: values.is_active ?? true
      }
      console.log('[ContractorsAdmin] Sending payload:', payload)

      const result = await createContractor.mutateAsync(payload)
      console.log('[ContractorsAdmin] Create contractor result:', result)

      message.success('Контрагент создан')
      return true
    } catch (error: any) {
      console.error('[ContractorsAdmin] Error creating contractor:', error)
      console.error('[ContractorsAdmin] Error details:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      })
      message.error('Ошибка создания контрагента')
      return false
    }
  }

  const handleUpdateContractor = async (id: number, values: any) => {
    try {
      const updates: any = {
        name: values.name,
        inn: values.inn,
        type_id: values.type_id,
        is_active: values.is_active
      }

      // Add supplier_code only if it was changed
      if (values.supplier_code !== undefined) {
        updates.supplier_code = values.supplier_code
      }

      await updateContractor.mutateAsync({
        id: String(id),
        updates
      })
      message.success('Контрагент обновлен')
      return true
    } catch (error) {
      message.error('Ошибка обновления контрагента')
      return false
    }
  }

  const handleDeleteContractor = async (id: number) => {
    try {
      await deleteContractor.mutateAsync(String(id))
      message.success('Контрагент удален')
      return true
    } catch (error) {
      message.error('Ошибка удаления контрагента')
      return false
    }
  }

  const handleToggleContractorStatus = async (contractor: Contractor) => {
    try {
      if (contractor.is_active) {
        await deactivateContractor.mutateAsync(String(contractor.id))
        message.success('Контрагент деактивирован')
      } else {
        await activateContractor.mutateAsync(String(contractor.id))
        message.success('Контрагент активирован')
      }
      return true
    } catch (error) {
      message.error('Ошибка изменения статуса')
      return false
    }
  }

  return {
    contractors,
    contractorsResponse,
    loadingContractors,
    refetchContractors,
    contractorFilters,
    setContractorFilters,
    contractorPagination,
    setContractorPagination,
    handleCreateContractor,
    handleUpdateContractor,
    handleDeleteContractor,
    handleToggleContractorStatus
  }
}

export const useContractorTypes = () => {
  const [contractorTypes, setContractorTypes] = useState<ContractorType[]>([])
  const [loadingTypes, setLoadingTypes] = useState(false)

  useEffect(() => {
    void loadContractorTypes()
  }, [])

  const loadContractorTypes = async () => {
    console.log('[ContractorsAdmin] Loading contractor types...')
    setLoadingTypes(true)
    try {
      const { data, error } = await supabase
        .from('contractor_types')
        .select('*')
        .order('name')

      console.log('[ContractorsAdmin] Loaded contractor types:', { data, error })

      if (error) {
        throw error
      }
      setContractorTypes(data ?? [])
    } catch (error) {
      console.error('[ContractorsAdmin] Error loading contractor types:', error)
      message.error('Ошибка загрузки типов контрагентов')
    } finally {
      setLoadingTypes(false)
    }
  }

  const handleCreateType = async (values: any) => {
    try {
      const { error } = await supabase
        .from('contractor_types')
        .insert({
          code: values.code,
          name: values.name,
          description: values.description
        })

      if (error) {
        throw error
      }

      message.success('Тип контрагента создан')
      void loadContractorTypes()
      return true
    } catch (error) {
      message.error('Ошибка создания типа')
      return false
    }
  }

  const handleUpdateType = async (id: number, values: any) => {
    try {
      const { error } = await supabase
        .from('contractor_types')
        .update({
          code: values.code,
          name: values.name,
          description: values.description
        })
        .eq('id', id)

      if (error) {
        throw error
      }

      message.success('Тип контрагента обновлен')
      void loadContractorTypes()
      return true
    } catch (error) {
      message.error('Ошибка обновления типа')
      return false
    }
  }

  const handleDeleteType = async (id: number) => {
    try {
      const { error } = await supabase
        .from('contractor_types')
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      message.success('Тип контрагента удален')
      void loadContractorTypes()
      return true
    } catch (error) {
      console.error('[ContractorsAdmin] Delete type failed:', error)
      message.error('Ошибка удаления типа. Возможно, есть связанные контрагенты.')
      return false
    }
  }

  return {
    contractorTypes,
    loadingTypes,
    loadContractorTypes,
    handleCreateType,
    handleUpdateType,
    handleDeleteType
  }
}