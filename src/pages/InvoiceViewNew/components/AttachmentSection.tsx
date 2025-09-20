import React from 'react'
import { Button, Card, List, message, Space, Spin, Tooltip, Typography, Upload } from 'antd'
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  UploadOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text, Link } = Typography

interface AttachmentSectionProps {
  documents: any[]
  loading?: boolean
  uploading?: boolean
  onUpload: (file: any) => Promise<void>
  onPreview: (doc: any) => void
  onDownload: (doc: any) => void
  onDelete?: (doc: any) => void
  editable?: boolean
}

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  documents,
  loading,
  uploading,
  onUpload,
  onPreview,
  onDownload,
  onDelete,
  editable = false
}) => {
  const getFileIcon = (mimeType: string, fileName: string = '') => {
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (mimeType?.includes('pdf') || extension === 'pdf') {
      return <FilePdfOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
    }
    if (mimeType?.includes('word') || ['doc', 'docx'].includes(extension || '')) {
      return <FileWordOutlined style={{ fontSize: 32, color: '#1890ff' }} />
    }
    if (mimeType?.includes('excel') || ['xls', 'xlsx'].includes(extension || '')) {
      return <FileExcelOutlined style={{ fontSize: 32, color: '#52c41a' }} />
    }
    if (mimeType?.includes('image') || ['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      return <FileImageOutlined style={{ fontSize: 32, color: '#fa8c16' }} />
    }
    if (mimeType?.includes('text') || extension === 'txt') {
      return <FileTextOutlined style={{ fontSize: 32, color: '#722ed1' }} />
    }
    return <FileOutlined style={{ fontSize: 32, color: '#8c8c8c' }} />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {return '0 Bytes'}
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const uploadProps = {
    beforeUpload: async (file: any) => {
      try {
        await onUpload(file)
      } catch (error) {
        message.error(`Ошибка при загрузке файла ${file.name}`)
      }
      return false
    },
    showUploadList: false,
    multiple: true
  }

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Документы</span>
          {editable && (
            <Upload {...uploadProps}>
              <Button
                icon={<UploadOutlined />}
                loading={uploading}
              >
                Загрузить документы
              </Button>
            </Upload>
          )}
        </div>
      }
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin size="large" />
        </div>
      ) : documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: '#8c8c8c' }}>
          <FileOutlined style={{ fontSize: 48, marginBottom: 16 }} />
          <div>Документы не загружены</div>
        </div>
      ) : (
        <List
          dataSource={documents}
          renderItem={(doc) => (
            <List.Item
              actions={[
                <Tooltip title="Просмотр">
                  <Button
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => onPreview(doc)}
                  />
                </Tooltip>,
                <Tooltip title="Скачать">
                  <Button
                    type="link"
                    icon={<DownloadOutlined />}
                    onClick={() => onDownload(doc)}
                  />
                </Tooltip>,
                ...(editable && onDelete ? [
                  <Tooltip title="Удалить">
                    <Button
                      type="link"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => onDelete(doc)}
                    />
                  </Tooltip>
                ] : [])
              ]}
            >
              <List.Item.Meta
                avatar={getFileIcon(doc.mime_type, doc.original_name)}
                title={
                  <Link onClick={() => onPreview(doc)}>
                    {doc.original_name || doc.file_name || 'Документ'}
                  </Link>
                }
                description={
                  <Space direction="vertical" size={0}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatFileSize(doc.file_size || 0)}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Загружен: {dayjs(doc.uploaded_at || doc.created_at).format('DD.MM.YYYY HH:mm')}
                    </Text>
                    {doc.uploaded_by_name && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Пользователь: {doc.uploaded_by_name}
                      </Text>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      )}
    </Card>
  )
}