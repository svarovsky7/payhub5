import React, { useRef, useState } from 'react'
import { 
  Button,
  Card,
  Dropdown,
  Empty,
  Menu,
  message,
  Skeleton,
  Space,
  Tooltip,
  Typography
} from 'antd'
import { 
  DownloadOutlined,
  ExportOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { ProTable } from '@ant-design/pro-components'
import type { ActionType, ProColumns, ProTableProps } from '@ant-design/pro-components'
import { ExportButton } from '../ExportButton'
import { FilterPanel } from '../FilterPanel'

const { Text } = Typography

export interface DataTableColumn<T = any> extends ProColumns<T> {
  exportable?: boolean
  mobile?: boolean
  desktop?: boolean
  priority?: number // 1-5, lower numbers show first on mobile
}

export interface FilterField {
  key: string
  type: 'text' | 'select' | 'multiSelect' | 'dateRange' | 'numberRange' | 'date'
  label: string
  placeholder?: string
  options?: { value: any; label: string }[]
  showSearch?: boolean
  allowClear?: boolean
  defaultValue?: any
}

export interface BulkAction<T = any> {
  key: string
  label: string
  icon?: React.ReactNode
  danger?: boolean
  disabled?: (selectedRows: T[]) => boolean
  onClick: (selectedRows: T[], selectedRowKeys: React.Key[]) => Promise<void> | void
}

export interface DataTableProps<T = any> extends Omit<ProTableProps<T, any>, 'columns'> {
  // Data
  dataSource: T[]
  loading?: boolean
  total?: number
  
  // Columns
  columns: DataTableColumn<T>[]
  
  // Filtering
  filterFields?: FilterField[]
  filters?: Record<string, any>
  onFiltersChange?: (filters: Record<string, any>) => void
  defaultFiltersCollapsed?: boolean
  
  // Actions
  onRefresh?: () => void
  bulkActions?: BulkAction<T>[]
  
  // Export
  exportable?: boolean
  exportFilename?: string
  onExport?: (filters?: Record<string, any>) => Promise<void>
  
  // Customization
  title?: React.ReactNode
  subtitle?: React.ReactNode
  headerActions?: React.ReactNode
  emptyText?: string
  
  // Responsive
  responsive?: boolean
  mobileBreakpoint?: number
  
  // Selection
  selectable?: boolean
  multiSelect?: boolean
  
  // Pagination
  pagination?: {
    current: number
    pageSize: number
    total: number
    onChange: (page: number, pageSize: number) => void
  }
}

export const DataTable = <T extends Record<string, any>>({
  dataSource,
  loading = false,
  total,
  columns,
  filterFields = [],
  filters = {},
  onFiltersChange,
  defaultFiltersCollapsed = true,
  onRefresh,
  bulkActions = [],
  exportable = true,
  exportFilename = 'export',
  onExport,
  title,
  subtitle,
  headerActions,
  emptyText,
  responsive = true,
  mobileBreakpoint = 768,
  selectable = true,
  multiSelect = true,
  pagination,
  ...tableProps
}: DataTableProps<T>) => {
  const actionRef = useRef<ActionType>()
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())
  const [isMobile, setIsMobile] = useState(window.innerWidth < mobileBreakpoint)

  // Handle window resize for responsive behavior
  React.useEffect(() => {
    if (!responsive) {return}
    
    const handleResize = () => {
      setIsMobile(window.innerWidth < mobileBreakpoint)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [responsive, mobileBreakpoint])

  // Filter columns based on visibility and responsive settings
  const visibleColumns = columns.filter(col => {
    if (hiddenColumns.has(col.key as string)) {return false}
    if (isMobile && col.mobile === false) {return false}
    if (!isMobile && col.desktop === false) {return false}
    return true
  }).sort((a, b) => {
    // Sort by priority on mobile
    if (isMobile) {
      const priorityA = a.priority || 999
      const priorityB = b.priority || 999
      return priorityA - priorityB
    }
    return 0
  })

  // Handle bulk actions
  const handleBulkAction = async (action: BulkAction<T>) => {
    const selectedRows = dataSource.filter(row => 
      selectedRowKeys.includes(row.id || row.key)
    )
    
    if (selectedRows.length === 0) {
      message.warning('Выберите строки для выполнения действия')
      return
    }
    
    try {
      await action.onClick(selectedRows, selectedRowKeys)
      setSelectedRowKeys([])
    } catch (error) {
      console.error('Bulk action error:', error)
      message.error('Ошибка выполнения действия')
    }
  }

  // Handle export
  const handleExport = async () => {
    if (onExport) {
      try {
        await onExport(filters)
      } catch (error) {
        console.error('Export error:', error)
        message.error('Ошибка экспорта данных')
      }
    }
  }

  // Column visibility menu
  const getColumnVisibilityMenuItems = () => [
    ...columns.map(col => ({
      key: col.key,
      icon: hiddenColumns.has(col.key as string) ? <EyeInvisibleOutlined /> : <EyeOutlined />,
      label: col.title as string,
      onClick: () => {
        const newHidden = new Set(hiddenColumns)
        if (newHidden.has(col.key as string)) {
          newHidden.delete(col.key as string)
        } else {
          newHidden.add(col.key as string)
        }
        setHiddenColumns(newHidden)
      },
    })),
    { type: 'divider' as const },
    {
      key: 'reset',
      label: 'Показать все',
      onClick: () => setHiddenColumns(new Set()),
    },
  ]

  // Bulk actions menu
  const getBulkActionsMenuItems = () =>
    bulkActions.map(action => ({
      key: action.key,
      icon: action.icon,
      danger: action.danger,
      disabled: action.disabled ? action.disabled(
        dataSource.filter(row => selectedRowKeys.includes(row.id || row.key))
      ) : false,
      label: action.label,
      onClick: () => handleBulkAction(action),
    }))

  const selectedRows = dataSource.filter(row => 
    selectedRowKeys.includes(row.id || row.key)
  )

  return (
    <div>
      {/* Header */}
      <div style={{ 
        marginBottom: 16, 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          {title && <h2 style={{ margin: 0, marginBottom: 4 }}>{title}</h2>}
          {subtitle && <Text type="secondary">{subtitle}</Text>}
        </div>
        
        <Space wrap>
          {headerActions}
          
          {/* Column Visibility */}
          <Dropdown menu={{ items: getColumnVisibilityMenuItems() }} placement="bottomRight">
            <Button icon={<SettingOutlined />} />
          </Dropdown>
          
          {/* Export */}
          {exportable && (
            <Button
              icon={<ExportOutlined />}
              onClick={handleExport}
              loading={loading}
            >
              {!isMobile && 'Экспорт'}
            </Button>
          )}
          
          {/* Refresh */}
          {onRefresh && (
            <Button
              icon={<ReloadOutlined />}
              onClick={onRefresh}
              loading={loading}
            >
              {!isMobile && 'Обновить'}
            </Button>
          )}
        </Space>
      </div>

      {/* Filters */}
      {filterFields.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <FilterPanel
            fields={filterFields}
            value={filters}
            onChange={onFiltersChange}
            onSearch={onFiltersChange}
            onClear={() => onFiltersChange?.({})}
            collapsible
            defaultCollapsed={defaultFiltersCollapsed}
            responsive={responsive}
          />
        </Card>
      )}

      {/* Bulk Actions Bar */}
      {selectedRowKeys.length > 0 && bulkActions.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16
          }}>
            <Text>
              Выбрано записей: <Text strong>{selectedRowKeys.length}</Text>
            </Text>
            
            <Space wrap>
              <Button 
                size="small" 
                onClick={() => setSelectedRowKeys([])}
              >
                Отменить выбор
              </Button>
              
              {bulkActions.length === 1 ? (
                <Button
                  type="primary"
                  size="small"
                  icon={bulkActions[0].icon}
                  danger={bulkActions[0].danger}
                  disabled={bulkActions[0].disabled?.(selectedRows)}
                  onClick={() => handleBulkAction(bulkActions[0])}
                >
                  {bulkActions[0].label}
                </Button>
              ) : (
                <Dropdown menu={{ items: getBulkActionsMenuItems() }}>
                  <Button type="primary" size="small">
                    Действия
                  </Button>
                </Dropdown>
              )}
            </Space>
          </div>
        </Card>
      )}

      {/* Table */}
      <ProTable<T>
        actionRef={actionRef}
        rowKey="id"
        loading={loading}
        dataSource={dataSource}
        columns={visibleColumns}
        search={false}
        toolbar={false}
        
        pagination={pagination ? {
          current: pagination.current,
          pageSize: pagination.pageSize || 50,
          total: pagination.total,
          showSizeChanger: true,
          pageSizeOptions: ['50', '100', '200'],
          defaultPageSize: 50,
          showQuickJumper: !isMobile,
          showTotal: (total, range) => 
            isMobile 
              ? `${range[0]}-${range[1]}/${total}`
              : `${range[0]}-${range[1]} из ${total} записей`,
          onChange: pagination.onChange,
          size: isMobile ? 'small' : 'default'
        } : false}
        
        rowSelection={selectable ? {
          selectedRowKeys,
          onChange: setSelectedRowKeys,
          type: multiSelect ? 'checkbox' : 'radio',
          selections: multiSelect ? [
            {
              key: 'select-all-page',
              text: 'Выбрать всю страницу',
              onSelect: () => {
                setSelectedRowKeys(dataSource.map(row => row.id || row.key))
              },
            },
            {
              key: 'clear-selection',
              text: 'Очистить выбор',
              onSelect: () => {
                setSelectedRowKeys([])
              },
            },
          ] : undefined,
        } : false}
        
        locale={{
          emptyText: loading ? (
            <div style={{ padding: 40 }}>
              <Skeleton active paragraph={{ rows: 3 }} />
            </div>
          ) : (
            <Empty 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={emptyText || 'Нет данных'}
            />
          )
        }}
        
        size={isMobile ? 'small' : 'middle'}
        scroll={{ x: isMobile ? 'max-content' : undefined }}
        
        {...tableProps}
      />
    </div>
  )
}

export default DataTable