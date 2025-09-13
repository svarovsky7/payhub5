/**
 * FilterPanel - reusable filter panel
 */

import React, { useEffect, useState } from 'react'
import { 
  Badge, 
  Button, 
  Card, 
  Collapse, 
  DatePicker, 
  Form, 
  Input, 
  InputNumber,
  Select,
  Space,
  Typography
} from 'antd'
import { 
  ClearOutlined, 
  FilterOutlined, 
  SaveOutlined,
  SearchOutlined 
} from '@ant-design/icons'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Text } = Typography

interface FilterOption {
  value: string | number
  label: string
  color?: string
}

interface FilterField {
  key: string
  type: 'select' | 'multiSelect' | 'dateRange' | 'numberRange' | 'text'
  label: string
  options?: FilterOption[]
  placeholder?: string
  allowClear?: boolean
  showSearch?: boolean
}

interface FilterValue {
  [key: string]: any
}

interface FilterPanelProps {
  fields: FilterField[]
  value?: FilterValue
  onChange?: (filters: FilterValue) => void
  onSearch?: (filters: FilterValue) => void
  onClear?: () => void
  onSave?: (name: string, filters: FilterValue) => void
  savedFilters?: Array<{ name: string; filters: FilterValue }>
  onLoadFilter?: (filters: FilterValue) => void
  loading?: boolean
  collapsible?: boolean
  defaultCollapsed?: boolean
  showSaveButton?: boolean
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  fields,
  value = {},
  onChange,
  onSearch,
  onClear,
  onSave,
  savedFilters = [],
  onLoadFilter,
  loading = false,
  collapsible = true,
  defaultCollapsed = false,
  showSaveButton = false,
}) => {
  const [form] = Form.useForm()
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)
  const [saveFilterName, setSaveFilterName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)

  useEffect(() => {
    // Count active filters
    const count = Object.entries(value).filter(([_, val]) => {
      if (Array.isArray(val)) {return val.length > 0}
      if (val === null || val === undefined || val === '') {return false}
      return true
    }).length
    setActiveFiltersCount(count)
  }, [value])

  useEffect(() => {
    form.setFieldsValue(value)
  }, [value, form])

  const handleFieldChange = (field: string, val: any) => {
    const newValue = { ...value, [field]: val }
    onChange?.(newValue)
  }

  const handleSearch = () => {
    const formValues = form.getFieldsValue()
    onSearch?.(formValues)
  }

  const handleClear = () => {
    form.resetFields()
    const clearedValues = {}
    fields.forEach(field => {
      clearedValues[field.key] = field.type === 'multiSelect' ? [] : undefined
    })
    onChange?.(clearedValues)
    onClear?.()
  }

  const handleSaveFilter = () => {
    if (!saveFilterName.trim()) {return}
    onSave?.(saveFilterName, value)
    setSaveFilterName('')
    setShowSaveInput(false)
  }

  const renderField = (field: FilterField) => {
    switch (field.type) {
      case 'select':
        return (
          <Select
            placeholder={field.placeholder}
            allowClear={field.allowClear}
            showSearch={field.showSearch}
            options={field.options}
            value={value[field.key]}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        )
      
      case 'multiSelect':
        return (
          <Select
            mode="multiple"
            placeholder={field.placeholder}
            allowClear={field.allowClear}
            showSearch={field.showSearch}
            options={field.options}
            value={value[field.key] || []}
            onChange={(val) => handleFieldChange(field.key, val)}
          />
        )
      
      case 'dateRange':
        return (
          <RangePicker
            placeholder={['Дата от', 'Дата до']}
            value={value[field.key] as [Dayjs, Dayjs]}
            onChange={(val) => handleFieldChange(field.key, val)}
            style={{ width: '100%' }}
          />
        )
      
      case 'numberRange':
        return (
          <Space.Compact style={{ width: '100%' }}>
            <InputNumber
              placeholder="От"
              value={value[field.key]?.from}
              onChange={(val) => handleFieldChange(field.key, { 
                ...value[field.key], 
                from: val 
              })}
              style={{ width: '50%' }}
            />
            <InputNumber
              placeholder="До"
              value={value[field.key]?.to}
              onChange={(val) => handleFieldChange(field.key, { 
                ...value[field.key], 
                to: val 
              })}
              style={{ width: '50%' }}
            />
          </Space.Compact>
        )
      
      case 'text':
        return (
          <Input
            placeholder={field.placeholder}
            allowClear={field.allowClear}
            value={value[field.key]}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
          />
        )
      
      default:
        return null
    }
  }

  const filterContent = (
    <Form form={form} layout="vertical" size="small">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {fields.map((field) => (
          <Form.Item
            key={field.key}
            name={field.key}
            label={field.label}
            style={{ marginBottom: 16 }}
          >
            {renderField(field)}
          </Form.Item>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <Space>
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={handleSearch}
            loading={loading}
          >
            Применить
          </Button>
          
          <Button
            icon={<ClearOutlined />}
            onClick={handleClear}
          >
            Сбросить
          </Button>
          
          {showSaveButton && (
            <Button
              icon={<SaveOutlined />}
              onClick={() => setShowSaveInput(!showSaveInput)}
            >
              Сохранить
            </Button>
          )}
        </Space>

        {savedFilters.length > 0 && (
          <Select
            placeholder="Загрузить фильтр"
            style={{ minWidth: 150 }}
            allowClear
            onSelect={(name) => {
              const filter = savedFilters.find(f => f.name === name)
              if (filter && onLoadFilter) {
                onLoadFilter(filter.filters)
              }
            }}
          >
            {savedFilters.map(filter => (
              <Select.Option key={filter.name} value={filter.name}>
                {filter.name}
              </Select.Option>
            ))}
          </Select>
        )}
      </div>

      {showSaveInput && (
        <div style={{ marginTop: 12 }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="Название фильтра"
              value={saveFilterName}
              onChange={(e) => setSaveFilterName(e.target.value)}
            />
            <Button
              type="primary"
              onClick={handleSaveFilter}
              disabled={!saveFilterName.trim()}
            >
              Сохранить
            </Button>
          </Space.Compact>
        </div>
      )}
    </Form>
  )

  if (!collapsible) {
    return <Card size="small">{filterContent}</Card>
  }

  return (
    <Card size="small" styles={{ body: { padding: 0 } }}>
      <Collapse
        defaultActiveKey={defaultCollapsed ? [] : ['filters']}
        ghost
        expandIconPosition="end"
        items={[
          {
            key: 'filters',
            label: (
              <Space>
                <FilterOutlined />
                <Text>Фильтры</Text>
                {activeFiltersCount > 0 && (
                  <Badge count={activeFiltersCount} size="small" />
                )}
              </Space>
            ),
            children: (
              <div style={{ padding: '0 24px 12px' }}>
                {filterContent}
              </div>
            ),
          },
        ]}
      />
    </Card>
  )
}

export default FilterPanel