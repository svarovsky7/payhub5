/**
 * FileUpload - multiple file upload to Storage
 */

import React, { useState } from 'react'
import { Button, List, message, Progress, Space, Tooltip, Typography, Upload } from 'antd'
import { 
  DeleteOutlined, 
  DownloadOutlined, 
  EyeOutlined,
  FileOutlined,
  UploadOutlined 
} from '@ant-design/icons'
import type { UploadFile, UploadProps } from 'antd'
import { supabase } from '../services/supabase'

const { Text } = Typography

interface FileUploadProps {
  value?: string[]
  onChange?: (fileUrls: string[]) => void
  bucket?: string
  folder?: string
  maxFiles?: number
  maxSize?: number // MB
  accept?: string
  disabled?: boolean
  showDownload?: boolean
  showPreview?: boolean
  fileNames?: Record<string, string> // Мапа URL -> имя файла
}

interface FileInfo {
  url: string
  name: string
  size: number
  type: string
  uploadedAt: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  value = [],
  onChange,
  bucket = 'attachments',
  folder = 'invoices',
  maxFiles = 10,
  maxSize = 10,
  accept,
  disabled = false,
  showDownload = true,
  showPreview = false,
  fileNames = {},
}) => {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const handleUpload = async (file: File): Promise<boolean> => {
    const fileName = `${folder}/${Date.now()}_${file.name}`
    
    try {
      setUploading(true)
      setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total!) * 100)
            setUploadProgress(prev => ({ ...prev, [file.name]: percent }))
          },
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      const newUrls = [...value, publicUrl]
      onChange?.(newUrls)

      message.success(`Файл ${file.name} загружен успешно`)
      
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[file.name]
        return newProgress
      })

      return true
    } catch (error) {
      message.error(`Ошибка загрузки файла ${file.name}: ${error.message}`)
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[file.name]
        return newProgress
      })
      return false
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async (url: string) => {
    try {
      // Extract file path from URL
      const urlParts = url.split('/')
      const fileName = urlParts[urlParts.length - 1]
      const filePath = `${folder}/${fileName}`

      const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath])

      if (error) {
        console.warn('Error deleting file from storage:', error)
        // Don't throw error, still remove from list
      }

      const newUrls = value.filter(u => u !== url)
      onChange?.(newUrls)
      message.success('Файл удален')
    } catch (error) {
      message.error('Ошибка удаления файла')
    }
  }

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      message.error('Ошибка скачивания файла')
    }
  }

  const getFileNameFromUrl = (url: string): string => {
    // Если есть сохраненное имя файла, используем его
    if (fileNames[url]) {
      return fileNames[url]
    }
    // Иначе извлекаем из URL
    const urlParts = url.split('/')
    const fileName = urlParts[urlParts.length - 1]
    return decodeURIComponent(fileName.split('_').slice(1).join('_'))
  }

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    showUploadList: false,
    beforeUpload: (file) => {
      const isValidSize = file.size / 1024 / 1024 < maxSize
      if (!isValidSize) {
        message.error(`Размер файла ${file.name} превышает ${maxSize}MB`)
        return false
      }

      if (value.length >= maxFiles) {
        message.error(`Максимальное количество файлов: ${maxFiles}`)
        return false
      }

      handleUpload(file)
      return false // Prevent automatic upload
    },
    accept,
    disabled: disabled || uploading,
    fileList,
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Upload {...uploadProps}>
        <Button 
          icon={<UploadOutlined />} 
          loading={uploading}
          disabled={disabled || value.length >= maxFiles}
        >
          Загрузить файлы
        </Button>
      </Upload>

      {Object.keys(uploadProgress).length > 0 && (
        <div>
          {Object.entries(uploadProgress).map(([fileName, progress]) => (
            <div key={fileName} style={{ marginBottom: 8 }}>
              <Text ellipsis style={{ width: 200, display: 'inline-block' }}>
                {fileName}
              </Text>
              <Progress percent={progress} size="small" />
            </div>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <List
          size="small"
          dataSource={value}
          renderItem={(url) => {
            const fileName = getFileNameFromUrl(url)
            return (
              <List.Item
                actions={[
                  showDownload && (
                    <Tooltip title="Скачать">
                      <Button
                        type="text"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={() => handleDownload(url, fileName)}
                      />
                    </Tooltip>
                  ),
                  showPreview && (
                    <Tooltip title="Предпросмотр">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => window.open(url, '_blank')}
                      />
                    </Tooltip>
                  ),
                  !disabled && (
                    <Tooltip title="Удалить">
                      <Button
                        type="text"
                        size="small"
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemove(url)}
                      />
                    </Tooltip>
                  ),
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  avatar={<FileOutlined />}
                  title={
                    <Text ellipsis style={{ maxWidth: 200 }}>
                      {fileName}
                    </Text>
                  }
                />
              </List.Item>
            )
          }}
        />
      )}

      <Text type="secondary" style={{ fontSize: 12 }}>
        Максимум {maxFiles} файлов, размер до {maxSize}MB каждый
      </Text>
    </Space>
  )
}

export default FileUpload