import {supabase} from '../supabase'
import {storageService} from '../storage/storage.service'
import {useAuthStore} from '@/models/auth'

export interface Attachment {
    id: number
    original_name: string
    storage_path: string
    size_bytes: number
    mime_type: string
    created_by: string
    created_at: string
    creator?: {
        id: string
        email: string
        full_name?: string
    }
}

export interface InvoiceDocument {
    id: number
    invoice_id: number
    attachment_id: number
    created_at: string
    attachment?: Attachment
}

interface PaymentDocument {
    id: number
    payment_id: number
    attachment_id: number
    created_at: string
    attachment?: Attachment
}

export interface CreateDocumentData {
    invoice_id: number
    file: File
    onProgress?: (progress: number) => void
}

export interface CreatePaymentDocumentData {
    payment_id: number
    file: File
    onProgress?: (progress: number) => void
}

export interface DocumentWithDetails extends InvoiceDocument {
    attachment: Attachment
    url: string
    file_name?: string
    created_at: string
}

class DocumentsCrud {
    // Create attachment record and link to invoice
    async createInvoiceDocument(data: CreateDocumentData): Promise<DocumentWithDetails> {
        console.log('[DocumentsCrud.createInvoiceDocument] Создание документа для счета:', {
            invoiceId: data.invoice_id,
            fileName: data.file.name,
            fileSize: data.file.size
        })

        try {
            // Get current user
            const user = useAuthStore.getState().user
            if (!user) {
                throw new Error('Пользователь не авторизован')
            }

            // Upload file to storage
            let storageFile;
            try {
                storageFile = await storageService.uploadInvoiceFile(
                    data.file,
                    data.invoice_id,
                    data.onProgress
                )
                console.log('[DocumentsCrud.createInvoiceDocument] Файл загружен в Storage:', storageFile)
            } catch (_uploadError) {
                console.error('[DocumentsCrud.createInvoiceDocument] Ошибка загрузки в Storage:', uploadError)
                throw new Error(`Ошибка загрузки файла в хранилище: ${uploadError.message}`)
            }

            // Create attachment record
            const {data: attachment, error: attachmentError} = await supabase
                .from('attachments')
                .insert({
                    original_name: data.file.name,
                    storage_path: storageFile.storagePath,
                    size_bytes: data.file.size,
                    mime_type: data.file.type || 'application/octet-stream',
                    created_by: user.id
                })
                .select()
                .single()

            if (attachmentError) {
                console.error('[DocumentsCrud.createInvoiceDocument] Ошибка создания attachment:', attachmentError)
                // Try to delete uploaded file
                await storageService.deleteInvoiceFile(storageFile.storagePath).catch(console.error)
                throw attachmentError
            }

            // Link attachment to invoice
            const {data: invoiceDocument, error: linkError} = await supabase
                .from('invoice_documents')
                .insert({
                    invoice_id: data.invoice_id,
                    attachment_id: attachment.id
                })
                .select('*, attachment:attachments(*)')
                .single()

            if (linkError) {
                console.error('[DocumentsCrud.createInvoiceDocument] Ошибка связывания с счетом:', linkError)
                // Try to delete attachment and file
                await supabase.from('attachments').delete().eq('id', attachment.id)
                await storageService.deleteInvoiceFile(storageFile.storagePath).catch(console.error)
                throw linkError
            }

            console.log('[DocumentsCrud.createInvoiceDocument] Документ успешно создан:', invoiceDocument)

            return {
                ...invoiceDocument,
                url: storageFile.url
            }
        } catch (error) {
            console.error('[DocumentsCrud.createInvoiceDocument] Ошибка:', error)
            throw error
        }
    }

    // Get all documents for invoice
    async getInvoiceDocuments(invoiceId: number): Promise<DocumentWithDetails[]> {
        console.log('[DocumentsCrud.getInvoiceDocuments] Получение документов для счета:', invoiceId)

        try {
            const {data, error} = await supabase
                .from('invoice_documents')
                .select('*, attachment:attachments(*)')
                .eq('invoice_id', invoiceId)
                .order('created_at', {ascending: false})

            if (error) {
                console.error('[DocumentsCrud.getInvoiceDocuments] Ошибка получения документов:', error)
                throw error
            }

            // Add public URLs and file names
            const documentsWithUrls = (data ?? []).map(doc => {
                console.log('[DocumentsCrud.getInvoiceDocuments] Обработка документа:', doc)
                return {
                    ...doc,
                    url: storageService.getInvoiceFileUrl(doc.attachment?.storage_path || ''),
                    file_name: doc.attachment?.original_name || 'Без названия'
                }
            })

            console.log('[DocumentsCrud.getInvoiceDocuments] Получено документов:', documentsWithUrls.length, documentsWithUrls)

            return documentsWithUrls
        } catch (error) {
            console.error('[DocumentsCrud.getInvoiceDocuments] Ошибка:', error)
            throw error
        }
    }

    // Delete document
    async deleteInvoiceDocument(documentId: number): Promise<void> {
        console.log('[DocumentsCrud.deleteInvoiceDocument] Удаление документа:', documentId)

        try {
            // Get document details first
            const {data: document, error: fetchError} = await supabase
                .from('invoice_documents')
                .select('*, attachment:attachments(*)')
                .eq('id', documentId)
                .single()

            if (fetchError) {
                console.error('[DocumentsCrud.deleteInvoiceDocument] Ошибка получения документа:', fetchError)
                throw fetchError
            }

            // Delete from invoice_documents
            const {error: deleteDocError} = await supabase
                .from('invoice_documents')
                .delete()
                .eq('id', documentId)

            if (deleteDocError) {
                console.error('[DocumentsCrud.deleteInvoiceDocument] Ошибка удаления из invoice_documents:', deleteDocError)
                throw deleteDocError
            }

            // Delete from attachments
            const {error: deleteAttachError} = await supabase
                .from('attachments')
                .delete()
                .eq('id', document.attachment_id)

            if (deleteAttachError) {
                console.error('[DocumentsCrud.deleteInvoiceDocument] Ошибка удаления из attachments:', deleteAttachError)
                throw deleteAttachError
            }

            // Delete file from storage
            await storageService.deleteInvoiceFile(document.attachment.storage_path)
                .catch(_err => {
                    console.warn('[DocumentsCrud.deleteInvoiceDocument] Ошибка удаления файла из storage:', err)
                    // Don't throw - file might already be deleted
                })

            console.log('[DocumentsCrud.deleteInvoiceDocument] Документ успешно удален')
        } catch (error) {
            console.error('[DocumentsCrud.deleteInvoiceDocument] Ошибка:', error)
            throw error
        }
    }

    // Delete all documents for invoice
    async deleteAllInvoiceDocuments(invoiceId: number): Promise<void> {
        console.log('[DocumentsCrud.deleteAllInvoiceDocuments] Удаление всех документов для счета:', invoiceId)

        try {
            // Get all documents
            const documents = await this.getInvoiceDocuments(invoiceId)

            // Delete each document
            for (const doc of documents) {
                await this.deleteInvoiceDocument(doc.id)
            }

            console.log('[DocumentsCrud.deleteAllInvoiceDocuments] Все документы удалены')
        } catch (error) {
            console.error('[DocumentsCrud.deleteAllInvoiceDocuments] Ошибка:', error)
            throw error
        }
    }

    // Download document
    async downloadDocument(documentId: number): Promise<void> {
        console.log('[DocumentsCrud.downloadDocument] Скачивание документа:', documentId)

        try {
            // Get document details
            const {data: document, error} = await supabase
                .from('invoice_documents')
                .select('*, attachment:attachments(*)')
                .eq('id', documentId)
                .single()

            if (error) {
                console.error('[DocumentsCrud.downloadDocument] Ошибка получения документа:', error)
                throw error
            }

            const url = storageService.getInvoiceFileUrl(document.attachment.storage_path)
            await storageService.downloadFile(url, document.attachment.original_name)

            console.log('[DocumentsCrud.downloadDocument] Документ успешно скачан')
        } catch (error) {
            console.error('[DocumentsCrud.downloadDocument] Ошибка:', error)
            throw error
        }
    }

    // ============ PAYMENT DOCUMENTS METHODS ============

    // Get all documents for payment
    async getPaymentDocuments(paymentId: number): Promise<DocumentWithDetails[]> {
        console.log('[DocumentsCrud.getPaymentDocuments] Получение документов для платежа:', paymentId)

        try {
            const {data, error} = await supabase
                .from('payment_documents')
                .select('*, attachment:attachments(*)')
                .eq('payment_id', paymentId)
                .order('created_at', {ascending: false})

            if (error) {
                console.error('[DocumentsCrud.getPaymentDocuments] Ошибка:', error)
                throw error
            }

            // Add URLs to documents
            const documentsWithUrls = (data ?? []).map(doc => ({
                ...doc,
                url: storageService.getPaymentFileUrl(doc.attachment?.storage_path || '')
            }))

            console.log('[DocumentsCrud.getPaymentDocuments] Получено документов:', documentsWithUrls.length)
            return documentsWithUrls as DocumentWithDetails[]
        } catch (error) {
            console.error('[DocumentsCrud.getPaymentDocuments] Ошибка:', error)
            throw error
        }
    }

    // Create attachment record and link to payment
    async createPaymentDocument(data: CreatePaymentDocumentData): Promise<DocumentWithDetails> {
        console.log('[DocumentsCrud.createPaymentDocument] Создание документа для платежа:', {
            paymentId: data.payment_id,
            fileName: data.file.name,
            fileSize: data.file.size
        })

        try {
            // Get current user
            const user = useAuthStore.getState().user
            if (!user) {
                throw new Error('Пользователь не авторизован')
            }

            // Upload file to storage
            let storageFile;
            try {
                storageFile = await storageService.uploadPaymentFile(
                    data.file,
                    data.payment_id,
                    data.onProgress
                )
                console.log('[DocumentsCrud.createPaymentDocument] Файл загружен в Storage:', storageFile)
            } catch (_uploadError) {
                console.error('[DocumentsCrud.createPaymentDocument] Ошибка загрузки в Storage:', uploadError)
                throw new Error(`Ошибка загрузки файла в хранилище: ${uploadError.message}`)
            }

            // Create attachment record
            const {data: attachment, error: attachmentError} = await supabase
                .from('attachments')
                .insert({
                    original_name: data.file.name,
                    storage_path: storageFile.storagePath,
                    size_bytes: data.file.size,
                    mime_type: data.file.type || 'application/octet-stream',
                    created_by: user.id
                })
                .select()
                .single()

            if (attachmentError) {
                console.error('[DocumentsCrud.createPaymentDocument] Ошибка создания attachment:', attachmentError)
                // Try to delete uploaded file
                await storageService.deletePaymentFile(storageFile.storagePath).catch(console.error)
                throw attachmentError
            }

            // Link attachment to payment
            const {data: paymentDocument, error: linkError} = await supabase
                .from('payment_documents')
                .insert({
                    payment_id: data.payment_id,
                    attachment_id: attachment.id
                })
                .select('*, attachment:attachments(*)')
                .single()

            if (linkError) {
                console.error('[DocumentsCrud.createPaymentDocument] Ошибка связывания с платежом:', linkError)
                // Try to delete attachment and file
                await supabase.from('attachments').delete().eq('id', attachment.id).catch(console.error)
                await storageService.deletePaymentFile(storageFile.storagePath).catch(console.error)
                throw linkError
            }

            const documentWithUrl = {
                ...paymentDocument,
                url: storageService.getPaymentFileUrl(storageFile.storagePath)
            }

            console.log('[DocumentsCrud.createPaymentDocument] Документ успешно создан:', documentWithUrl)
            return documentWithUrl as DocumentWithDetails
        } catch (error) {
            console.error('[DocumentsCrud.createPaymentDocument] Ошибка:', error)
            throw error
        }
    }

    // Delete payment document
    async deletePaymentDocument(documentId: number): Promise<void> {
        console.log('[DocumentsCrud.deletePaymentDocument] Удаление документа платежа:', documentId)

        try {
            // Get document details
            const {data: document, error: getError} = await supabase
                .from('payment_documents')
                .select('*, attachment:attachments(*)')
                .eq('id', documentId)
                .single()

            if (getError) {
                console.error('[DocumentsCrud.deletePaymentDocument] Ошибка получения документа:', getError)
                throw getError
            }

            // Delete from payment_documents
            const {error: unlinkError} = await supabase
                .from('payment_documents')
                .delete()
                .eq('id', documentId)

            if (unlinkError) {
                console.error('[DocumentsCrud.deletePaymentDocument] Ошибка удаления связи:', unlinkError)
                throw unlinkError
            }

            // Delete attachment
            const {error: attachmentError} = await supabase
                .from('attachments')
                .delete()
                .eq('id', document.attachment_id)

            if (attachmentError) {
                console.error('[DocumentsCrud.deletePaymentDocument] Ошибка удаления attachment:', attachmentError)
            }

            // Delete file from storage
            await storageService.deletePaymentFile(document.attachment.storage_path)
                .catch(_err => {
                    console.error('[DocumentsCrud.deletePaymentDocument] Ошибка удаления файла из Storage:', err)
                })

            console.log('[DocumentsCrud.deletePaymentDocument] Документ успешно удален')
        } catch (error) {
            console.error('[DocumentsCrud.deletePaymentDocument] Ошибка:', error)
            throw error
        }
    }

    // Download payment document
    async downloadPaymentDocument(documentId: number): Promise<void> {
        console.log('[DocumentsCrud.downloadPaymentDocument] Скачивание документа платежа:', documentId)

        try {
            // Get document details
            const {data: document, error} = await supabase
                .from('payment_documents')
                .select('*, attachment:attachments(*)')
                .eq('id', documentId)
                .single()

            if (error) {
                console.error('[DocumentsCrud.downloadPaymentDocument] Ошибка получения документа:', error)
                throw error
            }

            const url = storageService.getPaymentFileUrl(document.attachment.storage_path)
            await storageService.downloadFile(url, document.attachment.original_name)

            console.log('[DocumentsCrud.downloadPaymentDocument] Документ успешно скачан')
        } catch (error) {
            console.error('[DocumentsCrud.downloadPaymentDocument] Ошибка:', error)
            throw error
        }
    }
}

export const documentsCrud = new DocumentsCrud()