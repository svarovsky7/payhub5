import React, { useEffect, useState } from 'react'
import { Button, Modal, Space, Spin, Typography } from 'antd'
import { DownloadOutlined, FileOutlined } from '@ant-design/icons'

const { Text } = Typography

interface FilePreviewModalProps {
  visible: boolean
  file: any
  onCancel: () => void
  onDownload: () => void
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  visible,
  file,
  onCancel,
  onDownload
}) => {
  const [previewContent, setPreviewContent] = useState<React.ReactNode>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible && file) {
      loadPreview()
    }
  }, [visible, file])

  const loadPreview = async () => {
    if (!file?.storage_path) {
      setPreviewContent(
        <div style={{ textAlign: 'center', padding: 32 }}>
          <FileOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />
          <div style={{ marginTop: 16, color: '#8c8c8c' }}>
            Предпросмотр недоступен
          </div>
        </div>
      )
      return
    }

    setLoading(true)
    try {
      const { supabase } = await import('@/services/supabase')
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(file.storage_path, 300) // 5 minutes

      if (!error && data?.signedUrl) {
        const fileExtension = file.original_name?.split('.').pop()?.toLowerCase()

        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension || '')) {
          // Image preview
          setPreviewContent(
            <div style={{ textAlign: 'center' }}>
              <img
                src={data.signedUrl}
                alt={file.original_name}
                style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
              />
            </div>
          )
        } else if (fileExtension === 'pdf') {
          // PDF preview
          setPreviewContent(
            <iframe
              src={data.signedUrl}
              title={file.original_name}
              style={{ width: '100%', height: '600px', border: 'none' }}
            />
          )
        } else if (['txt', 'md', 'json', 'xml', 'csv'].includes(fileExtension || '')) {
          // Text file preview
          const response = await fetch(data.signedUrl)
          const text = await response.text()
          setPreviewContent(
            <div style={{
              padding: 16,
              background: '#f5f5f5',
              borderRadius: 4,
              maxHeight: '600px',
              overflow: 'auto'
            }}>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {text}
              </pre>
            </div>
          )
        } else {
          // Unsupported file type
          setPreviewContent(
            <div style={{ textAlign: 'center', padding: 32 }}>
              <FileOutlined style={{ fontSize: 48, color: '#8c8c8c' }} />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">
                  Предпросмотр недоступен для файлов типа .{fileExtension}
                </Text>
              </div>
              <div style={{ marginTop: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Вы можете скачать файл для просмотра
                </Text>
              </div>
            </div>
          )
        }
      } else {
        throw new Error('Failed to create signed URL')
      }
    } catch (error) {
      console.error('[FilePreviewModal] Preview error:', error)
      setPreviewContent(
        <div style={{ textAlign: 'center', padding: 32 }}>
          <FileOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
          <div style={{ marginTop: 16, color: '#ff4d4f' }}>
            Ошибка загрузки предпросмотра
          </div>
        </div>
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title={
        <Space>
          <FileOutlined />
          {file?.original_name || 'Просмотр документа'}
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button
          key="download"
          icon={<DownloadOutlined />}
          onClick={onDownload}
        >
          Скачать
        </Button>,
        <Button key="close" onClick={onCancel}>
          Закрыть
        </Button>
      ]}
      width={800}
      centered
      destroyOnClose
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>Загрузка предпросмотра...</div>
        </div>
      ) : (
        previewContent
      )}
    </Modal>
  )
}