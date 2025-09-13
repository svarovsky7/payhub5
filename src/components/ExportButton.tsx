/**
 * ExportButton - Excel export with progress
 */

import React, { useState } from 'react'
import { Button, DatePicker, Form, message, Modal, Progress, Select, Space, Typography } from 'antd'
import { DownloadOutlined, FileExcelOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'

const { RangePicker } = DatePicker
const { Text } = Typography

interface ExportButtonProps {
  data?: any[]
  onExport?: (filters?: any) => Promise<any[]>
  filename?: string
  columns?: Array<{
    key: string
    title: string
    dataIndex?: string
    render?: (value: any, record: any) => any
  }>
  filters?: Array<{
    key: string
    label: string
    type: 'select' | 'dateRange'
    options?: Array<{ value: any; label: string }>
  }>
  loading?: boolean
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
  type?: 'default' | 'primary' | 'text'
  icon?: boolean
  children?: React.ReactNode
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  data,
  onExport,
  filename = 'export',
  columns = [],
  filters = [],
  loading = false,
  disabled = false,
  size = 'middle',
  type = 'default',
  icon = true,
  children,
}) => {
  const [exporting, setExporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [modalVisible, setModalVisible] = useState(false)
  const [form] = Form.useForm()

  const formatCellValue = (value: any, render?: (value: any, record: any) => any, record?: any) => {
    if (render && record) {
      const rendered = render(value, record)
      // If rendered is JSX, try to extract text content
      if (React.isValidElement(rendered)) {
        return rendered.props.children || value
      }
      return rendered
    }
    
    if (value === null || value === undefined) {return ''}
    if (typeof value === 'boolean') {return value ? 'Да' : 'Нет'}
    if (Array.isArray(value)) {return value.join(', ')}
    if (typeof value === 'object') {return JSON.stringify(value)}
    return value
  }

  const createWorksheet = (exportData: any[]) => {
    // Create headers
    const headers = columns.map(col => col.title)
    
    // Create data rows
    const rows = exportData.map(record => 
      columns.map(col => {
        const value = col.dataIndex 
          ? record[col.dataIndex] 
          : record[col.key] || record[col.key]
        
        return formatCellValue(value, col.render, record)
      })
    )

    // Combine headers and rows
    const wsData = [headers, ...rows]
    
    return XLSX.utils.aoa_to_sheet(wsData)
  }

  const handleDirectExport = async () => {
    if (!data || data.length === 0) {
      message.error('Нет данных для экспорта')
      return
    }

    setExporting(true)
    setProgress(20)

    try {
      // Create workbook
      const wb = XLSX.utils.book_new()
      
      setProgress(50)
      
      // Create worksheet
      const ws = createWorksheet(data)
      
      setProgress(70)
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Data')
      
      setProgress(90)
      
      // Generate Excel file
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      
      // Save file
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const timestamp = dayjs().format('YYYY-MM-DD_HH-mm')
      saveAs(blob, `${filename}_${timestamp}.xlsx`)
      
      setProgress(100)
      
      setTimeout(() => {
        setProgress(0)
        setExporting(false)
      }, 1000)
      
    } catch (error) {
      console.error('Export error:', error)
      message.error('Ошибка экспорта данных')
      setExporting(false)
      setProgress(0)
    }
  }

  const handleModalExport = async () => {
    const formValues = form.getFieldsValue()
    
    if (!onExport) {return}
    
    setExporting(true)
    setProgress(10)
    
    try {
      // Fetch data with filters
      const exportData = await onExport(formValues)
      
      setProgress(40)
      
      if (!exportData || exportData.length === 0) {
        message.error('Нет данных для экспорта')
        return
      }
      
      // Create workbook
      const wb = XLSX.utils.book_new()
      
      setProgress(60)
      
      // Create worksheet
      const ws = createWorksheet(exportData)
      
      setProgress(80)
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Data')
      
      // Generate Excel file
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      
      // Save file
      const blob = new Blob([wbout], { type: 'application/octet-stream' })
      const timestamp = dayjs().format('YYYY-MM-DD_HH-mm')
      saveAs(blob, `${filename}_${timestamp}.xlsx`)
      
      setProgress(100)
      
      setTimeout(() => {
        setProgress(0)
        setExporting(false)
        setModalVisible(false)
        form.resetFields()
      }, 1000)
      
    } catch (error) {
      console.error('Export error:', error)
      message.error('Ошибка экспорта данных')
      setExporting(false)
      setProgress(0)
    }
  }

  const handleExport = () => {
    if (filters.length > 0 && onExport) {
      setModalVisible(true)
    } else {
      handleDirectExport()
    }
  }

  return (
    <>
      <Button
        type={type}
        size={size}
        icon={icon ? <DownloadOutlined /> : undefined}
        onClick={handleExport}
        loading={loading}
        disabled={disabled || exporting}
      >
        {children || 'Экспорт в Excel'}
      </Button>

      {exporting && progress > 0 && (
        <div style={{ marginTop: 8, maxWidth: 200 }}>
          <Progress 
            percent={progress} 
            size="small" 
            status={progress === 100 ? 'success' : 'active'}
            format={() => progress === 100 ? 'Готово!' : `${progress}%`}
          />
        </div>
      )}

      <Modal
        title={
          <Space>
            <FileExcelOutlined />
            <span>Экспорт в Excel</span>
          </Space>
        }
        open={modalVisible}
        onOk={handleModalExport}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
        }}
        okText="Экспортировать"
        cancelText="Отмена"
        confirmLoading={exporting}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          size="middle"
        >
          <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
            Настройте параметры экспорта:
          </Text>
          
          {filters.map(filter => (
            <Form.Item
              key={filter.key}
              name={filter.key}
              label={filter.label}
            >
              {filter.type === 'select' ? (
                <Select
                  placeholder={`Выберите ${filter.label.toLowerCase()}`}
                  allowClear
                  options={filter.options}
                />
              ) : filter.type === 'dateRange' ? (
                <RangePicker
                  placeholder={['Дата от', 'Дата до']}
                  style={{ width: '100%' }}
                />
              ) : null}
            </Form.Item>
          ))}
          
          {exporting && (
            <div style={{ marginTop: 16 }}>
              <Progress 
                percent={progress} 
                status={progress === 100 ? 'success' : 'active'}
                format={() => progress === 100 ? 'Готово!' : 'Экспорт...'}
              />
            </div>
          )}
        </Form>
      </Modal>
    </>
  )
}

export default ExportButton