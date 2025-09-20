import React from 'react'
import type { FilterField } from '@/components/table'
import { statusConfig } from '../types'

export const getPaymentsFilters = (
  suppliers: any[],
  payers: any[],
  projects: any[],
  paymentTypes: any[]
): FilterField[] => {
  return [
    {
      type: 'search',
      name: 'search',
      label: 'Поиск',
      placeholder: 'Номер платежа, счета или комментарий'
    },
    {
      type: 'select',
      name: 'status',
      label: 'Статус',
      placeholder: 'Все статусы',
      options: Object.entries(statusConfig).map(([value, label]) => ({ value, label }))
    },
    {
      type: 'select',
      name: 'supplier_id',
      label: 'Поставщик',
      placeholder: 'Все поставщики',
      options: suppliers.map(s => ({ value: s.id, label: s.name }))
    },
    {
      type: 'select',
      name: 'payer_id',
      label: 'Плательщик',
      placeholder: 'Все плательщики',
      options: payers.map(p => ({ value: p.id, label: p.name }))
    },
    {
      type: 'select',
      name: 'project_id',
      label: 'Проект',
      placeholder: 'Все проекты',
      options: projects.map(p => ({ value: p.id, label: p.name }))
    },
    {
      type: 'select',
      name: 'payment_type_id',
      label: 'Тип платежа',
      placeholder: 'Все типы',
      options: paymentTypes.map(t => ({ value: t.id, label: t.name }))
    },
    {
      type: 'dateRange',
      name: 'payment_date',
      label: 'Дата платежа',
      placeholder: ['От', 'До']
    },
    {
      type: 'numberRange',
      name: 'amount',
      label: 'Сумма',
      placeholder: ['От', 'До']
    }
  ]
}