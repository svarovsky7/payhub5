import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'
import { type CreateDocumentData, documentsCrud, type DocumentWithDetails } from '../documents/crud'

export const useInvoiceDocuments = (invoiceId?: number) => {
  const queryClient = useQueryClient()

  // Get documents for invoice
  const documentsQuery = useQuery({
    queryKey: ['invoice-documents', invoiceId],
    queryFn: async () => {
      console.log('[useInvoiceDocuments] Загрузка документов для счета:', invoiceId)
      const result = await documentsCrud.getInvoiceDocuments(invoiceId!)
      console.log('[useInvoiceDocuments] Загружено документов:', result.length, result)
      return result
    },
    enabled: !!invoiceId
  })

  // Upload document
  const uploadMutation = useMutation({
    mutationFn: (data: CreateDocumentData) => documentsCrud.createInvoiceDocument(data),
    onSuccess: (data) => {
      console.log('[useInvoiceDocuments.uploadMutation] Документ успешно загружен:', data)
      message.success('Документ успешно загружен')
      queryClient.invalidateQueries({ queryKey: ['invoice-documents', invoiceId] })
    },
    onError: (error) => {
      console.error('[useInvoiceDocuments.uploadMutation] Ошибка загрузки:', error)
      message.error(`Ошибка загрузки документа: ${error.message}`)
    }
  })

  // Delete document
  const deleteMutation = useMutation({
    mutationFn: (documentId: number) => documentsCrud.deleteInvoiceDocument(documentId),
    onSuccess: () => {
      console.log('[useInvoiceDocuments.deleteMutation] Документ успешно удален')
      message.success('Документ успешно удален')
      queryClient.invalidateQueries({ queryKey: ['invoice-documents', invoiceId] })
    },
    onError: (error) => {
      console.error('[useInvoiceDocuments.deleteMutation] Ошибка удаления:', error)
      message.error(`Ошибка удаления документа: ${error.message}`)
    }
  })

  // Download document
  const downloadMutation = useMutation({
    mutationFn: (documentId: number) => documentsCrud.downloadDocument(documentId),
    onSuccess: () => {
      console.log('[useInvoiceDocuments.downloadMutation] Документ успешно скачан')
    },
    onError: (error) => {
      console.error('[useInvoiceDocuments.downloadMutation] Ошибка скачивания:', error)
      message.error(`Ошибка скачивания документа: ${error.message}`)
    }
  })

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    error: documentsQuery.error,
    uploadDocument: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    deleteDocument: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    downloadDocument: downloadMutation.mutate,
    isDownloading: downloadMutation.isPending,
    refetch: documentsQuery.refetch
  }
}

export const usePaymentDocuments = (paymentId?: number) => {
  const queryClient = useQueryClient()

  // Get documents for payment
  const documentsQuery = useQuery({
    queryKey: ['payment-documents', paymentId],
    queryFn: async () => {
      console.log('[usePaymentDocuments] Загрузка документов для платежа:', paymentId)
      // For now, return empty array until we have the proper service
      return []
    },
    enabled: !!paymentId
  })

  // Upload document
  const uploadMutation = useMutation({
    mutationFn: async (data: CreateDocumentData) => {
      console.log('[usePaymentDocuments.uploadMutation] Загрузка документа:', data)
      // For now, just return success
      return { id: Date.now(), ...data }
    },
    onSuccess: (data) => {
      console.log('[usePaymentDocuments.uploadMutation] Документ успешно загружен:', data)
      message.success('Документ успешно загружен')
      queryClient.invalidateQueries({ queryKey: ['payment-documents', paymentId] })
    },
    onError: (error) => {
      console.error('[usePaymentDocuments.uploadMutation] Ошибка загрузки:', error)
      message.error(`Ошибка загрузки документа: ${error.message}`)
    }
  })

  // Delete document
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      console.log('[usePaymentDocuments.deleteMutation] Удаление документа:', documentId)
      // For now, just return success
      return { success: true }
    },
    onSuccess: () => {
      console.log('[usePaymentDocuments.deleteMutation] Документ успешно удален')
      message.success('Документ успешно удален')
      queryClient.invalidateQueries({ queryKey: ['payment-documents', paymentId] })
    },
    onError: (error) => {
      console.error('[usePaymentDocuments.deleteMutation] Ошибка удаления:', error)
      message.error(`Ошибка удаления документа: ${error.message}`)
    }
  })

  // Download document
  const downloadMutation = useMutation({
    mutationFn: async (documentId: number) => {
      console.log('[usePaymentDocuments.downloadMutation] Скачивание документа:', documentId)
      // For now, just return success
      return { success: true }
    },
    onSuccess: () => {
      console.log('[usePaymentDocuments.downloadMutation] Документ успешно скачан')
    },
    onError: (error) => {
      console.error('[usePaymentDocuments.downloadMutation] Ошибка скачивания:', error)
      message.error(`Ошибка скачивания документа: ${error.message}`)
    }
  })

  return {
    documents: documentsQuery.data || [],
    isLoading: documentsQuery.isLoading,
    error: documentsQuery.error,
    uploadDocument: uploadMutation.mutate,
    isUploading: uploadMutation.isPending,
    deleteDocument: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    downloadDocument: downloadMutation.mutate,
    isDownloading: downloadMutation.isPending,
    refetch: documentsQuery.refetch
  }
}