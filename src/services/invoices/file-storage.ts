/**
 * File storage operations for invoices
 */

import { supabase, handleSupabaseError, type ApiResponse } from '../supabase'
import type { FileUploadOptions, FileUploadResult } from './types'

export class InvoiceFileStorage {
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

      // Create unique filename with timestamp
      const timestamp = Date.now()
      const randomStr = Math.random().toString(36).substring(7)
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const fileName = `${timestamp}_${randomStr}_${safeFileName}`
      const filePath = `invoices/${invoiceId}/${fileName}`

      console.log('[InvoiceFileStorage.uploadFile] Uploading to storage bucket "documents":', filePath)

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type || 'application/octet-stream'
        })

      if (uploadError) {
        console.error('[InvoiceFileStorage.uploadFile] Storage upload error:', uploadError)

        // If RLS blocks upload, save only info to DB
        if (uploadError.message?.includes('row-level security')) {
          console.log('[InvoiceFileStorage.uploadFile] RLS error, saving only to DB')

          const fallbackUrl = `local://invoices/${invoiceId}/${fileName}`

          const { data: docData, error: docError } = await supabase
            .from('invoice_documents')
            .insert({
              invoice_id: parseInt(invoiceId),
              file_name: file.name,
              file_path: fallbackUrl,
              file_url: fallbackUrl,
              file_size: file.size,
              file_type: file.type || 'application/octet-stream',
              uploaded_by: userId,
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (docError) {
            console.error('[InvoiceFileStorage.uploadFile] Error saving to invoice_documents:', docError)
            throw docError
          }

          console.log('[InvoiceFileStorage.uploadFile] File saved to DB (fallback):', docData)

          // Update attachments in invoice
          await this.updateInvoiceAttachments(invoiceId, fallbackUrl)

          return { data: fallbackUrl, error: null }
        }

        throw uploadError
      }

      console.log('[InvoiceFileStorage.uploadFile] File successfully uploaded to storage:', uploadData)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(uploadData.path)

      const fileUrl = urlData.publicUrl

      // Add record to invoice_documents table
      const { data: docData, error: docError } = await supabase
        .from('invoice_documents')
        .insert({
          invoice_id: parseInt(invoiceId),
          file_name: file.name,
          file_path: uploadData.path,
          file_url: fileUrl,
          file_size: file.size,
          file_type: file.type || 'application/octet-stream',
          uploaded_by: userId,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (docError) {
        console.error('[InvoiceFileStorage.uploadFile] Error saving to invoice_documents:', docError)
        // If failed to save to DB, remove file from storage
        await supabase.storage.from('documents').remove([uploadData.path])
        throw docError
      }

      console.log('[InvoiceFileStorage.uploadFile] Record added to invoice_documents:', docData)

      // Update attachments in invoice
      await this.updateInvoiceAttachments(invoiceId, fileUrl)

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

      const { data, error } = await supabase
        .from('invoice_documents')
        .select('*')
        .eq('invoice_id', parseInt(invoiceId))
        .order('created_at', { ascending: false })

      if (error) {
        console.error('[InvoiceFileStorage.getInvoiceDocuments] Error:', error)
        throw error
      }

      console.log('[InvoiceFileStorage.getInvoiceDocuments] Found documents:', data?.length || 0)

      return { data: data || [], error: null }
    } catch (error) {
      console.error('[InvoiceFileStorage.getInvoiceDocuments] Error getting documents:', error)
      return {
        data: [],
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

      // Update attachments in invoice
      const { data: invoice } = await supabase
        .from('invoices')
        .select('attachments')
        .eq('id', invoiceId)
        .single()

      if (invoice?.attachments) {
        const updatedAttachments = invoice.attachments.filter(url => url !== fileUrl)

        await supabase
          .from('invoices')
          .update({
            attachments: updatedAttachments,
            updated_at: new Date().toISOString()
          })
          .eq('id', invoiceId)
      }

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

  /**
   * Helper method to update invoice attachments
   */
  private static async updateInvoiceAttachments(
    invoiceId: string,
    fileUrl: string
  ): Promise<void> {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('attachments')
      .eq('id', invoiceId)
      .single()

    const currentAttachments = invoice?.attachments || []
    const updatedAttachments = [...currentAttachments, fileUrl]

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        attachments: updatedAttachments,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    if (updateError) {
      console.error('[InvoiceFileStorage.updateInvoiceAttachments] Error updating attachments:', updateError)
      throw updateError
    }
  }
}