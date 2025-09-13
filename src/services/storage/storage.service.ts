import { supabase } from '../supabase'
import { v4 as uuidv4 } from 'uuid'

export interface UploadFileOptions {
  bucket: string
  folder: string
  file: File
  onProgress?: (progress: number) => void
}

export interface StorageFile {
  id: string
  name: string
  url: string
  size: number
  mimeType: string
  storagePath: string
}

class StorageService {
  private readonly DOCUMENTS_BUCKET = 'documents'
  private readonly INVOICES_FOLDER = 'invoices'

  async uploadFile(options: UploadFileOptions): Promise<StorageFile> {
    const { bucket, folder, file, onProgress } = options
    
    console.log('[StorageService.uploadFile] Начало загрузки файла:', {
      bucket,
      folder,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    })

    // Generate unique file name
    const fileExt = file.name.split('.').pop()
    const uniqueId = uuidv4().substring(0, 8)
    const timestamp = Date.now()
    const fileName = `${timestamp}_${uniqueId}_${file.name}`
    const storagePath = `${folder}/${fileName}`

    try {
      // Check if bucket exists and is accessible
      console.log('[StorageService.uploadFile] Проверка bucket:', bucket)
      
      // Upload file to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'application/octet-stream',
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total!) * 100)
            console.log('[StorageService.uploadFile] Прогресс загрузки:', percent)
            onProgress?.(percent)
          }
        })

      if (error) {
        console.error('[StorageService.uploadFile] Ошибка загрузки в Storage:', {
          error,
          bucket,
          storagePath,
          fileSize: file.size,
          fileType: file.type
        })
        
        // Проверяем специфичные ошибки
        if (error.message?.includes('bucket')) {
          throw new Error(`Bucket "${bucket}" не существует или недоступен`)
        }
        if (error.message?.includes('storage')) {
          throw new Error('Сервис хранения недоступен. Проверьте подключение к Supabase Storage')
        }
        
        throw error
      }

      if (!data) {
        throw new Error('Файл не был загружен в Storage: не получен путь к файлу')
      }

      console.log('[StorageService.uploadFile] Результат загрузки в Storage:', data)

      // Get public URL using our custom method for self-hosted Supabase
      const publicUrl = this.getPublicUrl(bucket, storagePath)

      console.log('[StorageService.uploadFile] Файл успешно загружен:', {
        storagePath,
        publicUrl
      })

      return {
        id: uuidv4(),
        name: file.name,
        url: publicUrl,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        storagePath
      }
    } catch (error) {
      console.error('[StorageService.uploadFile] Ошибка:', error)
      throw new Error(`Ошибка загрузки файла: ${error.message}`)
    }
  }

  async uploadInvoiceFile(file: File, invoiceId: number, onProgress?: (progress: number) => void): Promise<StorageFile> {
    const folder = `${this.INVOICES_FOLDER}/${invoiceId}`
    return this.uploadFile({
      bucket: this.DOCUMENTS_BUCKET,
      folder,
      file,
      onProgress
    })
  }

  async deleteFile(bucket: string, storagePath: string): Promise<void> {
    console.log('[StorageService.deleteFile] Удаление файла:', {
      bucket,
      storagePath
    })

    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([storagePath])

      if (error) {
        console.error('[StorageService.deleteFile] Ошибка удаления:', error)
        throw error
      }

      console.log('[StorageService.deleteFile] Файл успешно удален')
    } catch (error) {
      console.error('[StorageService.deleteFile] Ошибка:', error)
      throw new Error(`Ошибка удаления файла: ${error.message}`)
    }
  }

  async deleteInvoiceFile(storagePath: string): Promise<void> {
    return this.deleteFile(this.DOCUMENTS_BUCKET, storagePath)
  }

  async downloadFile(url: string, originalFileName: string): Promise<void> {
    console.log('[StorageService.downloadFile] Скачивание файла:', {
      url,
      originalFileName
    })

    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      
      // Используем оригинальное имя файла для скачивания
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = originalFileName // Используем оригинальное имя
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(downloadUrl)

      console.log('[StorageService.downloadFile] Файл успешно скачан с именем:', originalFileName)
    } catch (error) {
      console.error('[StorageService.downloadFile] Ошибка:', error)
      throw new Error(`Ошибка скачивания файла: ${error.message}`)
    }
  }

  getPublicUrl(bucket: string, path: string): string {
    // Для self-hosted Supabase используем прямой URL к storage
    const baseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://31.128.51.210:8002'
    const storageUrl = `${baseUrl}/storage/v1/object/public/${bucket}/${path}`
    
    console.log('[StorageService.getPublicUrl] Генерация URL:', {
      bucket,
      path,
      resultUrl: storageUrl
    })
    
    return storageUrl
  }

  getInvoiceFileUrl(storagePath: string): string {
    return this.getPublicUrl(this.DOCUMENTS_BUCKET, storagePath)
  }
}

export const storageService = new StorageService()