/**
 * Constants for ContractorsAdmin component
 */

import { Space, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  MoreOutlined,
  StopOutlined
} from '@ant-design/icons'
import type { BulkAction, DataTableColumn, FilterField } from '@/components/table'
import { DateCell, StatusCell, TextCell } from '@/components/table/TableCells'
import type { Contractor, ContractorType } from './types'

const { Text } = Typography

export const getContractorColumns = (
  contractorTypes: ContractorType[],
  getActionsMenuItems: (record: Contractor) => any[]
): DataTableColumn<Contractor>[] => [
  {
    title: 'Название',
    dataIndex: 'name',
    key: 'name',
    width: 200,
    priority: 1,
    exportable: true,
    sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    render: (text, record) => (
      <TextCell
        lines={[
          <Space>
            {record.is_active ? (
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
            ) : (
              <StopOutlined style={{ color: '#ff4d4f' }} />
            )}
            <Text strong={record.is_active}>{text}</Text>
          </Space>,
          `ID: ${record.id}`
        ]}
      />
    )
  },
  {
    title: 'Код',
    dataIndex: 'supplier_code',
    key: 'supplier_code',
    width: 100,
    priority: 2,
    exportable: true,
    sorter: (a, b) => (a.supplier_code || '').localeCompare(b.supplier_code || ''),
    render: (text) => text ? <Tag color="purple" style={{ fontFamily: 'monospace' }}>{text}</Tag> : '—'
  },
  {
    title: 'ИНН',
    dataIndex: 'inn',
    key: 'inn',
    width: 150,
    priority: 3,
    exportable: true,
    sorter: (a, b) => (a.inn || '').localeCompare(b.inn || ''),
    render: (text) => text || '—'
  },
  {
    title: 'Тип',
    dataIndex: 'type_id',
    key: 'type_id',
    width: 120,
    priority: 4,
    exportable: true,
    mobile: false,
    render: (typeId) => {
      const type = contractorTypes.find(t => t.id === typeId)
      return type ? <Tag color="blue">{type.name}</Tag> : '—'
    }
  },
  {
    title: 'Статус',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 100,
    priority: 5,
    exportable: true,
    mobile: false,
    render: (isActive) => (
      <StatusCell
        text={isActive ? 'Активный' : 'Неактивный'}
        type={isActive ? 'success' : 'error'}
      />
    )
  },
  {
    title: 'Дата создания',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 120,
    priority: 6,
    exportable: true,
    mobile: false,
    sorter: (a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateA - dateB
    },
    render: (text) => text ? <DateCell value={text} /> : '—'
  },
  {
    title: '',
    key: 'actions',
    width: 60,
    priority: 999,
    exportable: false,
    fixed: 'right',
    render: (_, record) => (
      <Dropdown
        menu={{ items: getActionsMenuItems(record) }}
        trigger={['click']}
        placement="bottomLeft"
      >
        <Button
          type="text"
          size="small"
          icon={<MoreOutlined />}
        />
      </Dropdown>
    )
  }
]

export const getContractorFilterFields = (
  contractorTypes: ContractorType[]
): FilterField[] => [
  {
    key: 'name',
    type: 'text',
    label: 'Название',
    placeholder: 'Введите название контрагента'
  },
  {
    key: 'inn',
    type: 'text',
    label: 'ИНН',
    placeholder: 'Введите ИНН'
  },
  {
    key: 'type_id',
    type: 'select',
    label: 'Тип контрагента',
    options: contractorTypes.map(type => ({
      value: type.id,
      label: type.name
    })),
    allowClear: true
  },
  {
    key: 'is_active',
    type: 'select',
    label: 'Статус',
    options: [
      { value: true, label: 'Активные' },
      { value: false, label: 'Неактивные' }
    ],
    allowClear: true
  }
]

export const getContractorBulkActions = (
  handleToggleStatus: (contractor: Contractor) => Promise<boolean>
): BulkAction<Contractor>[] => [
  {
    key: 'activate-selected',
    label: 'Активировать выбранные',
    icon: <CheckCircleOutlined />,
    disabled: (selectedRows) => !selectedRows.some(row => !row.is_active),
    onClick: async (selectedRows) => {
      for (const row of selectedRows) {
        if (!row.is_active) {
          await handleToggleStatus(row)
        }
      }
    }
  },
  {
    key: 'deactivate-selected',
    label: 'Деактивировать выбранные',
    icon: <StopOutlined />,
    disabled: (selectedRows) => !selectedRows.some(row => row.is_active),
    onClick: async (selectedRows) => {
      for (const row of selectedRows) {
        if (row.is_active) {
          await handleToggleStatus(row)
        }
      }
    }
  }
]

export const getTypeFilterFields = (): FilterField[] => [
  {
    key: 'search',
    type: 'text',
    label: 'Поиск',
    placeholder: 'Код, название, описание...'
  }
]

// Re-export Button for consistency
import { Button, Dropdown } from 'antd'