/**
 * InvoiceFileUpload - Специализированный компонент загрузки файлов для счетов
 */

import React from 'react'
import { FileUpload } from './FileUpload'

interface FileInfo {
  url: string
  name: string
}

interface InvoiceFileUploadProps {
  value?: FileInfo[] | string[]
  onChange?: (fileUrls: string[]) => void
  disabled?: boolean
  maxFiles?: number
}

export const InvoiceFileUpload: React.FC<InvoiceFileUploadProps> = ({
  value = [],
  onChange,
  disabled = false,
  maxFiles = 10,
}) => {
  console.log('[InvoiceFileUpload] Rendering with files:', value?.length || 0)
  
  // Преобразуем value в формат для FileUpload
  const fileUrls = value.map(item => {
    if (typeof item === 'string') {
      return item
    }
    return item.url
  })
  
  // Создаем мапу с именами файлов
  const fileNames = value.reduce((acc, item) => {
    if (typeof item !== 'string' && item.name) {
      acc[item.url] = item.name
    }
    return acc
  }, {} as Record<string, string>)
  
  return (
    <FileUpload
      value={fileUrls}
      onChange={onChange}
      bucket="documents"
      folder="invoices"
      maxFiles={maxFiles}
      maxSize={10}
      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
      disabled={disabled}
      showDownload={true}
      showPreview={true}
      fileNames={fileNames}
    />
  )
}

export default InvoiceFileUpload