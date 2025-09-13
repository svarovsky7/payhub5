/**
 * File upload logic hook
 */

import { useCallback, useState } from 'react'
import type { RcFile, UploadFile } from 'antd/es/upload/interface'
import { getFileExtension } from '../utils/calculations'
import {
  FileExcelOutlined,
  FileImageOutlined,
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined
} from '@ant-design/icons'

export const useFileUpload = () => {
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewFile, setPreviewFile] = useState<UploadFile | null>(null)
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'other'>('other')
  const [totalFileSize, setTotalFileSize] = useState(0)

  // Calculate total file size
  const calculateTotalSize = useCallback((files: UploadFile[]) => {
    const total = files.reduce((sum, file) => sum + (file.size ?? 0), 0)
    setTotalFileSize(total)
    return total
  }, [])

  // Handle file before upload
  const beforeUpload = useCallback((file: RcFile, _fileList: RcFile[]): boolean => {
    console.log('[InvoiceCreate.beforeUpload] Вызван beforeUpload для файла:', {
      name: file.name,
      size: file.size,
      type: file.type,
      uid: file.uid
    })

    // Check file size (10MB limit)
    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      console.error('[InvoiceCreate.beforeUpload] Файл слишком большой:', file.size)
      return false
    }

    console.log('[InvoiceCreate.beforeUpload] Файл прошел проверку, возвращаем false для ручной загрузки')
    // Return false to prevent auto upload - we'll upload files when form is submitted
    return false
  }, [])

  // Handle file change
  const handleFileChange = useCallback(({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    console.log('[InvoiceCreate.handleFileChange] Вызван handleFileChange:', {
      filesCount: newFileList.length,
      files: newFileList.map(f => ({ name: f.name, uid: f.uid, status: f.status }))
    })
    setFileList(newFileList)
    calculateTotalSize(newFileList)
  }, [calculateTotalSize])

  // Get file icon based on extension
  const getFileIcon = useCallback((filename: string) => {
    const ext = getFileExtension(filename)
    switch (ext) {
      case 'pdf':
        return <FilePdfOutlined />
      case 'doc':
      case 'docx':
        return <FileWordOutlined />
      case 'xls':
      case 'xlsx':
        return <FileExcelOutlined />
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <FileImageOutlined />
      default:
        return <FileOutlined />
    }
  }, [])

  // Handle preview
  const handlePreview = useCallback((file: UploadFile) => {
    console.log('[InvoiceCreate.handlePreview] Предпросмотр файла:', file)

    // Определяем тип файла
    const fileName = file.name || ''
    const fileExt = getFileExtension(fileName).toLowerCase()

    // Устанавливаем тип предпросмотра
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(fileExt)) {
      setPreviewType('image')
    } else if (fileExt === 'pdf') {
      setPreviewType('pdf')
    } else {
      setPreviewType('other')
    }

    setPreviewFile(file)
    setPreviewTitle(fileName ?? 'Предпросмотр')

    // Для изображений читаем как data URL
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(fileExt)) {
      if (!file.url && !file.preview && file.originFileObj) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const preview = e.target?.result as string
          setPreviewImage(preview)
          setPreviewOpen(true)
        }
        reader.readAsDataURL(file.originFileObj)
      } else {
        setPreviewImage(file.url ?? file.preview ?? '')
        setPreviewOpen(true)
      }
    } else if (fileExt === 'pdf') {
      // Для PDF создаем blob URL
      if (file.originFileObj) {
        const blobUrl = URL.createObjectURL(file.originFileObj as Blob)
        setPreviewImage(blobUrl)
        setPreviewOpen(true)
      } else if (file.url) {
        setPreviewImage(file.url)
        setPreviewOpen(true)
      }
    } else {
      // Для других типов файлов просто открываем модальное окно с информацией
      setPreviewOpen(true)
    }
  }, [])

  // Handle remove
  const handleRemove = useCallback((file: UploadFile) => {
    console.log('[InvoiceCreate.handleRemove] Удаление файла:', file)
    const newList = fileList.filter(f => f.uid !== file.uid)
    setFileList(newList)
    calculateTotalSize(newList)
  }, [fileList, calculateTotalSize])

  // Cancel preview
  const handleCancelPreview = useCallback(() => {
    // Очищаем blob URL для PDF, если он был создан
    if (previewType === 'pdf' && previewImage?.startsWith('blob:')) {
      URL.revokeObjectURL(previewImage)
    }
    setPreviewOpen(false)
    setPreviewImage('')
    setPreviewFile(null)
  }, [previewType, previewImage])

  return {
    // State
    fileList,
    previewOpen,
    previewImage,
    previewTitle,
    previewFile,
    previewType,
    totalFileSize,

    // Actions
    setFileList,
    beforeUpload,
    handleFileChange,
    handlePreview,
    handleRemove,
    handleCancelPreview,
    getFileIcon
  }
}