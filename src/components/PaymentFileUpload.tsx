/**
 * PaymentFileUpload - специализированный компонент загрузки файлов для платежей
 */

import React from 'react'
import { FileUpload } from './FileUpload'

interface PaymentFileUploadProps {
  value?: string[]
  onChange?: (fileUrls: string[]) => void
  disabled?: boolean
  maxFiles?: number
}

export const PaymentFileUpload: React.FC<PaymentFileUploadProps> = ({
  value = [],
  onChange,
  disabled = false,
  maxFiles = 5,
}) => {
  console.log('[PaymentFileUpload] Rendering with files:', value?.length || 0)
  
  return (
    <FileUpload
      value={value}
      onChange={onChange}
      bucket="documents"
      folder="payments"
      maxFiles={maxFiles}
      maxSize={10}
      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
      disabled={disabled}
      showDownload={true}
      showPreview={true}
    />
  )
}

export default PaymentFileUpload