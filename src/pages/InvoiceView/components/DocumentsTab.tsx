/**
 * Documents tab component
 */

import React from 'react'
import { Card } from 'antd'
import { InvoiceFileUpload } from '@/components/InvoiceFileUpload'

interface DocumentsTabProps {
  documents: any[] | undefined
  onDocumentsChange: () => void
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
  documents,
  onDocumentsChange
}) => {
  return (
    <Card title="Прикрепленные файлы">
      <InvoiceFileUpload
        value={documents?.map(doc => ({
          url: doc.url || doc.file_url,
          name: doc.file_name || doc.attachment?.original_name || 'Без названия'
        })) || []}
        onChange={(urls) => {
          console.log('[InvoiceView] Документы обновлены:', urls)
          // Обновление документов будет происходить через refetch после загрузки
          onDocumentsChange()
        }}
        disabled={false}
        maxFiles={10}
      />
    </Card>
  )
}