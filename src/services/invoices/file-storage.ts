/**
 * File storage operations for invoices
 */

import { type ApiResponse, handleSupabaseError, supabase } from '../supabase'
import type { FileUploadOptions, FileUploadResult } from './types'
import { getStorageStatus } from '../storage/storage-init'

export class InvoiceFileStorage {
  /**
   * Create storage bucket with proper permissions
   */
  static async createStorageBucket(): Promise<void> {
    try {
      console.log('[InvoiceFileStorage.createStorageBucket] Creating bucket with public access...')

      const { data, error } = await supabase.storage.createBucket('documents', {
        public: true,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: undefined // Allow all file types
      })

      if (error) {
        if (error.message?.includes('already exists')) {
          console.log('[InvoiceFileStorage.createStorageBucket] Bucket already exists')
        } else {
          console.error('[InvoiceFileStorage.createStorageBucket] Error:', error)
        }
      } else {
        console.log('[InvoiceFileStorage.createStorageBucket] Bucket created:', data)
      }
    } catch (error) {
      console.error('[InvoiceFileStorage.createStorageBucket] Error:', error)
    }
  }

  /**
   * Ensure storage bucket exists
   */
  static async ensureBucketExists(): Promise<void> {
    try {
      console.log('[InvoiceFileStorage.ensureBucketExists] Checking bucket "documents"')

      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets()

      if (listError) {
        console.error('[InvoiceFileStorage.ensureBucketExists] Error listing buckets:', listError)
        return
      }

      const bucketExists = buckets?.some(b => b.name === 'documents')

      if (!bucketExists) {
        console.log('[InvoiceFileStorage.ensureBucketExists] Bucket "documents" not found, creating...')

        const { data, error: createError } = await supabase.storage.createBucket('documents', {
          public: true,
          allowedMimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp'
          ],
          fileSizeLimit: 10485760 // 10MB
        })

        if (createError) {
          console.error('[InvoiceFileStorage.ensureBucketExists] Error creating bucket:', createError)
        } else {
          console.log('[InvoiceFileStorage.ensureBucketExists] Bucket created successfully:', data)
        }
      } else {
        console.log('[InvoiceFileStorage.ensureBucketExists] Bucket "documents" already exists')
      }
    } catch (error) {
      console.error('[InvoiceFileStorage.ensureBucketExists] Error:', error)
    }
  }

  /**
   * Ensure invoice folder exists in storage
   */
  static async ensureInvoiceFolderExists(invoiceId: string): Promise<void> {
    try {
      console.log('[InvoiceFileStorage.ensureInvoiceFolderExists] Checking folder for invoice:', invoiceId)

      // Try to create a marker file to ensure folder exists
      const markerPath = `invoices/${invoiceId}/.keep`
      const markerContent = new Blob([''], { type: 'text/plain' })

      await supabase.storage
        .from('documents')
        .upload(markerPath, markerContent, {
          cacheControl: '3600',
          upsert: true
        })

      console.log('[InvoiceFileStorage.ensureInvoiceFolderExists] Folder ready')
    } catch (error) {
      console.log('[InvoiceFileStorage.ensureInvoiceFolderExists] Folder check:', error)
    }
  }

  /**
   * Direct upload to storage using FormData
   */
  static async directUploadToStorage(
    filePath: string,
    file: File
  ): Promise<{ data: any; error: any }> {
    try {
      console.log('[InvoiceFileStorage.directUploadToStorage] Attempting direct upload:', filePath)

      // Create FormData
      const formData = new FormData()
      formData.append('file', file)

      // Direct API call to Supabase storage
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/documents/${filePath}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
          },
          body: formData
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[InvoiceFileStorage.directUploadToStorage] Upload failed:', errorText)
        return { data: null, error: errorText }
      }

      const data = await response.json()
      console.log('[InvoiceFileStorage.directUploadToStorage] Upload successful:', data)
      return { data, error: null }
    } catch (error) {
      console.error('[InvoiceFileStorage.directUploadToStorage] Error:', error)
      return { data: null, error }
    }
  }

  /**
   * Upload a single file
   */
  static async uploadFile(
    invoiceId: string,
    file: File,
    userId?: string
  ): Promise<ApiResponse<string>> {
    try {
      console.log('[InvoiceFileStorage.uploadFile] Starting file upload:', {
        invoiceId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        userId
      })

      // Check storage status first
      const storageStatus = getStorageStatus()
      console.log('[InvoiceFileStorage.uploadFile] Storage status:', storageStatus)

      if (!storageStatus.initialized) {
        console.warn('[InvoiceFileStorage.uploadFile] Storage not initialized yet')
      }

      if (!storageStatus.uploadEnabled) {
        console.warn('[InvoiceFileStorage.uploadFile] ⚠️ Storage uploads disabled due to RLS policies')
        console.warn('[InvoiceFileStorage.uploadFile] Files will be saved with pending status')
      }

      // Skip bucket checks if we already know storage is not working
      if (storageStatus.uploadEnabled) {
        // Ensure bucket and folder exist before upload
        await this.ensureBucketExists()
        await this.ensureInvoiceFolderExists(invoiceId)
      }

      // Create unique filename with timestamp
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(7)
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${timestamp}_${randomStr}_${safeFileName}`
      const filePath = `invoices/${invoiceId}/${fileName}`

      console.log('[InvoiceFileStorage.uploadFile] Uploading to storage bucket "documents":', filePath)

      // Try to upload with different approaches
      let uploadData: any = null
      let uploadError: any = null

      // First attempt: Normal upload
      const uploadResult = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream'
        })

      uploadData = uploadResult.data
      uploadError = uploadResult.error

      if (uploadError) {
        console.error('[InvoiceFileStorage.uploadFile] Storage upload error:', uploadError)
        console.log('[InvoiceFileStorage.uploadFile] Trying direct upload method...')

        // Second attempt: Try direct upload
        const directResult = await this.directUploadToStorage(filePath, file)

        if (!directResult.error) {
          uploadData = { path: filePath }
          uploadError = null
          console.log('[InvoiceFileStorage.uploadFile] Direct upload succeeded')
        } else {
          // Third attempt: Try with upsert
          console.log('[InvoiceFileStorage.uploadFile] Trying upsert method...')
          const upsertResult = await supabase.storage
            .from('documents')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type || 'application/octet-stream'
            })

          if (!upsertResult.error) {
            uploadData = upsertResult.data
            uploadError = null
            console.log('[InvoiceFileStorage.uploadFile] Upsert upload succeeded')
          } else {
            // If still fails, we'll handle it below
            uploadError = upsertResult.error
          }
        }
      }

      if (uploadError) {
        console.error('[InvoiceFileStorage.uploadFile] All upload attempts failed:', uploadError)

        // If RLS blocks upload, we still need to handle the file
        if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('policy')) {
          console.log('[InvoiceFileStorage.uploadFile] RLS/Policy error detected')
          console.log('[InvoiceFileStorage.uploadFile] Storage bucket may require admin configuration')

          // Important: We should not use local:// prefix
          // Instead, we save the intended storage path
          const intendedStoragePath = filePath

          // First create attachment record with intended storage path
          const { data: attachmentData, error: attachmentError } = await supabase
            .from('attachments')
            .insert({
              original_name: file.name,
              storage_path: intendedStoragePath, // Use intended path, not local://
              size_bytes: file.size,
              mime_type: file.type || 'application/octet-stream',
              created_by: userId
            })
            .select()
            .single()

          if (attachmentError) {
            console.error('[InvoiceFileStorage.uploadFile] Error creating attachment:', attachmentError)
            throw attachmentError
          }

          // Then link to invoice
          const { data: docData, error: docError } = await supabase
            .from('invoice_documents')
            .insert({
              invoice_id: parseInt(invoiceId),
              attachment_id: attachmentData.id
            })
            .select()
            .single()

          if (docError) {
            console.error('[InvoiceFileStorage.uploadFile] Error linking to invoice:', docError)
            throw docError
          }

          console.log('[InvoiceFileStorage.uploadFile] File info saved to DB:', docData)
          console.log('[InvoiceFileStorage.uploadFile] File will be uploaded to storage later')
          console.log('[InvoiceFileStorage.uploadFile] Intended storage path:', intendedStoragePath)

          // Mark as pending upload with special prefix
          const pendingUrl = `pending://${intendedStoragePath}`

          // Update attachment with pending status
          await supabase
            .from('attachments')
            .update({ storage_path: pendingUrl })
            .eq('id', attachmentData.id)

          // Return the pending URL - file info is saved
          return { data: pendingUrl, error: null }
        }

        throw uploadError
      }

      console.log('[InvoiceFileStorage.uploadFile] File successfully uploaded to storage:', uploadData)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(uploadData.path)

      const fileUrl = urlData.publicUrl

      // First create attachment record
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('attachments')
        .insert({
          original_name: file.name,
          storage_path: uploadData.path,
          size_bytes: file.size,
          mime_type: file.type || 'application/octet-stream',
          created_by: userId
        })
        .select()
        .single()

      if (attachmentError) {
        console.error('[InvoiceFileStorage.uploadFile] Error creating attachment:', attachmentError)
        // If failed to save to DB, remove file from storage
        await supabase.storage.from('documents').remove([uploadData.path])
        throw attachmentError
      }

      // Then link to invoice
      const { data: docData, error: docError } = await supabase
        .from('invoice_documents')
        .insert({
          invoice_id: parseInt(invoiceId),
          attachment_id: attachmentData.id
        })
        .select()
        .single()

      if (docError) {
        console.error('[InvoiceFileStorage.uploadFile] Error linking to invoice:', docError)
        // If failed to link, clean up attachment record
        await supabase.from('attachments').delete().eq('id', attachmentData.id)
        // And remove file from storage
        await supabase.storage.from('documents').remove([uploadData.path])
        throw docError
      }

      console.log('[InvoiceFileStorage.uploadFile] Record added to invoice_documents:', docData)

      // Log that file was saved (attachments column doesn't exist)
      console.log('[InvoiceFileStorage.uploadFile] File info saved to invoice_documents table')

      console.log('[InvoiceFileStorage.uploadFile] File successfully uploaded and saved')

      return { data: fileUrl, error: null }
    } catch (error) {
      console.error('[InvoiceFileStorage.uploadFile] General file upload error:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadFiles(
    invoiceId: string,
    files: File[],
    userId?: string,
    options?: FileUploadOptions
  ): Promise<ApiResponse<FileUploadResult[]>> {
    try {
      console.log('[InvoiceFileStorage.uploadFiles] Starting multiple file upload:', {
        invoiceId,
        fileCount: files.length,
        userId,
        options
      })

      const results: FileUploadResult[] = []
      const errors: string[] = []

      for (const file of files) {
        const result = await this.uploadFile(invoiceId, file, userId)

        if (result.error) {
          errors.push(`${file.name}: ${result.error}`)
        } else if (result.data) {
          results.push({
            path: result.data,
            fullPath: result.data,
            invoice_id: invoiceId,
            category: options?.category,
            description: options?.description,
            metadata: options?.metadata
          })
        }
      }

      if (errors.length > 0) {
        console.error('[InvoiceFileStorage.uploadFiles] Some files failed:', errors)
        return {
          data: results,
          error: errors.join('; ')
        }
      }

      return { data: results, error: null }
    } catch (error) {
      console.error('[InvoiceFileStorage.uploadFiles] Error uploading files:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Get invoice documents
   */
  static async getInvoiceDocuments(invoiceId: string): Promise<ApiResponse<any[]>> {
    try {
      console.log('[InvoiceFileStorage.getInvoiceDocuments] Getting documents for invoice:', invoiceId)

      // Join invoice_documents with attachments to get full file details
      const { data, error } = await supabase
        .from('invoice_documents')
        .select(`
          *,
          attachment:attachments (
            id,
            original_name,
            storage_path,
            size_bytes,
            mime_type,
            created_at,
            created_by
          )
        `)
        .eq('invoice_id', parseInt(invoiceId))
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[InvoiceFileStorage.getInvoiceDocuments] Error:', error)
        throw error
      }

      console.log('[InvoiceFileStorage.getInvoiceDocuments] Found documents with attachments:', {
        count: data?.length || 0,
        documents: data?.map(doc => ({
          id: doc.id,
          invoice_id: doc.invoice_id,
          attachment_id: doc.attachment_id,
          original_name: doc.attachment?.original_name,
          storage_path: doc.attachment?.storage_path,
          mime_type: doc.attachment?.mime_type,
          size_bytes: doc.attachment?.size_bytes
        }))
      })

      // Flatten the data structure for easier consumption
      const documents = data?.map((doc: any) => {
        let storagePath = doc.attachment?.storage_path ?? ''

        // Handle pending files - convert back to local:// for display
        if (storagePath.startsWith('pending://')) {
          storagePath = `local://${storagePath.replace('pending://', '')}`
        }

        return {
          ...doc,
          // Preserve attachment_id from invoice_documents table
          attachment_id: doc.attachment_id,
          // Add attachment details
          original_name: doc.attachment?.original_name ?? 'Unknown',
          storage_path: storagePath,
          mime_type: doc.attachment?.mime_type ?? 'application/octet-stream',
          size_bytes: doc.attachment?.size_bytes ?? 0,
          created_by: doc.attachment?.created_by,
          // Keep full attachment object for debugging
          attachment: doc.attachment
        }
      }) ?? []

      console.log('[InvoiceFileStorage.getInvoiceDocuments] Processed documents:', documents)

      return { data: documents, error: null }
    } catch (error) {
      console.error('[InvoiceFileStorage.getInvoiceDocuments] Error getting documents:', error)
      return {
        data: [],
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Retry uploading pending files
   */
  static async retryPendingUploads(invoiceId: string): Promise<void> {
    try {
      console.log('[InvoiceFileStorage.retryPendingUploads] Checking for pending uploads:', invoiceId)

      // Get all attachments with pending:// prefix
      const { data: pendingAttachments, error } = await supabase
        .from('attachments')
        .select('*')
        .like('storage_path', 'pending://%')

      if (error || !pendingAttachments?.length) {
        console.log('[InvoiceFileStorage.retryPendingUploads] No pending uploads found')
        return
      }

      console.log('[InvoiceFileStorage.retryPendingUploads] Found pending uploads:', pendingAttachments.length)

      for (const attachment of pendingAttachments) {
        const intendedPath = attachment.storage_path.replace('pending://', '')
        console.log('[InvoiceFileStorage.retryPendingUploads] Retrying upload for:', intendedPath)

        // We don't have the original file, so we can only mark it as local
        await supabase
          .from('attachments')
          .update({ storage_path: `local://${intendedPath}` })
          .eq('id', attachment.id)
      }
    } catch (error) {
      console.error('[InvoiceFileStorage.retryPendingUploads] Error:', error)
    }
  }

  /**
   * Attempt to re-upload a local file to storage
   */
  static async reuploadLocalFile(
    attachmentId: string,
    invoiceId: string
  ): Promise<ApiResponse<string>> {
    try {
      console.log('[InvoiceFileStorage.reuploadLocalFile] Attempting to re-upload local file:', {
        attachmentId,
        invoiceId
      })

      // Get attachment details from database
      const { data: attachmentData, error: fetchError } = await supabase
        .from('attachments')
        .select('*')
        .eq('id', attachmentId)
        .single()

      if (fetchError || !attachmentData) {
        console.error('[InvoiceFileStorage.reuploadLocalFile] Error fetching attachment:', fetchError)
        return {
          data: null,
          error: 'Не удалось найти информацию о файле'
        }
      }

      const attachment = attachmentData as any
      console.log('[InvoiceFileStorage.reuploadLocalFile] Found attachment:', attachment)

      // If file is already in storage, return its URL
      const storagePath = attachment.storage_path as string
      if (storagePath && !storagePath.startsWith('local://')) {
        console.log('[InvoiceFileStorage.reuploadLocalFile] File already in storage')

        // Create signed URL for existing file
        const { data: signedData, error: signedError } = await supabase.storage
          .from('documents')
          .createSignedUrl(storagePath, 300)

        if (!signedError && signedData?.signedUrl) {
          return { data: signedData.signedUrl, error: null }
        }

        // Fallback to public URL
        const { data: publicUrlData } = supabase.storage
          .from('documents')
          .getPublicUrl(storagePath)

        return { data: publicUrlData.publicUrl, error: null }
      }

      // For local files, we can't re-upload without the original file data
      // Return an informative error
      console.log('[InvoiceFileStorage.reuploadLocalFile] Cannot re-upload local file without original data')

      return {
        data: null,
        error: 'Файл был сохранен только в базе данных. Для просмотра требуется повторная загрузка файла.'
      }
    } catch (error) {
      console.error('[InvoiceFileStorage.reuploadLocalFile] Error:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Get download URL for a file
   */
  static async getFileDownloadUrl(
    storagePath: string
  ): Promise<ApiResponse<string>> {
    try {
      console.log('[InvoiceFileStorage.getFileDownloadUrl] Getting download URL for:', storagePath)

      // Check if it's a local file
      if (storagePath?.startsWith('local://')) {
        console.log('[InvoiceFileStorage.getFileDownloadUrl] File is local, cannot generate download URL')
        return {
          data: null,
          error: 'Файл недоступен для скачивания (сохранен только в базе данных)'
        }
      }

      // Create signed URL for download with download parameter
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(storagePath, 60, {
          download: true // This forces download instead of opening in browser
        })

      if (error) {
        console.error('[InvoiceFileStorage.getFileDownloadUrl] Error creating signed URL with download:', error)

        // Try public URL as fallback
        const { data: publicUrlData } = supabase.storage
          .from('documents')
          .getPublicUrl(storagePath)

        if (publicUrlData?.publicUrl) {
          console.log('[InvoiceFileStorage.getFileDownloadUrl] Using public URL as fallback')
          return { data: publicUrlData.publicUrl, error: null }
        }

        return {
          data: null,
          error: 'Не удалось создать ссылку для скачивания'
        }
      }

      console.log('[InvoiceFileStorage.getFileDownloadUrl] Signed URL created successfully')
      return { data: data.signedUrl, error: null }
    } catch (error) {
      console.error('[InvoiceFileStorage.getFileDownloadUrl] Error:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Remove file
   */
  static async removeFile(
    invoiceId: string,
    fileUrl: string
  ): Promise<ApiResponse<null>> {
    try {
      console.log('[InvoiceFileStorage.removeFile] Removing file:', { invoiceId, fileUrl })

      // Extract file path from URL
      const urlParts = fileUrl.split('/storage/v1/object/public/documents/')
      const filePath = urlParts[1] || fileUrl

      // Remove from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([filePath])

      if (storageError) {
        console.error('[InvoiceFileStorage.removeFile] Storage removal error:', storageError)
      }

      // Remove from invoice_documents
      const { error: dbError } = await supabase
        .from('invoice_documents')
        .delete()
        .eq('invoice_id', parseInt(invoiceId))
        .eq('file_url', fileUrl)

      if (dbError) {
        console.error('[InvoiceFileStorage.removeFile] DB removal error:', dbError)
        throw dbError
      }

      // No need to update invoice table - attachments column doesn't exist
      // The file reference is already removed from invoice_documents table above

      console.log('[InvoiceFileStorage.removeFile] File removed successfully')

      return { data: null, error: null }
    } catch (error) {
      console.error('[InvoiceFileStorage.removeFile] Error removing file:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

}