/**
 * CRUD operations for payments
 */

import { 
  type ApiResponse, 
  handleSupabaseError,
  type Payment, 
  type PaymentInsert,
  type PaymentUpdate,
  supabase
} from '../supabase'
import { PaymentType } from '../../types/payment'

export interface PaymentWithRelations extends Payment {
  invoice?: {
    id: string
    invoice_number: string
  }
  payment_type?: PaymentType
}

export interface PaymentInsertWithType extends PaymentInsert {
  payment_type: PaymentType
}

interface PaymentUpdateWithType extends PaymentUpdate {
  payment_type?: PaymentType
}

export class PaymentCrudService {
  
  /**
   * Создать новый платеж
   */
  static async create(payment: PaymentInsertWithType): Promise<ApiResponse<Payment>> {
    try {
      
      // Проверяем, что заявка существует и готова к оплате
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, invoice_number, internal_number, total_amount, status, payer_id, type_id')
        .eq('id', payment.invoice_id)
        .single()

      if (invoiceError || !invoice) {
        return { data: null, error: 'Заявка не найдена' }
      }


      // Разрешаем добавлять платежи к счетам в статусах draft, approved, paid
      if (!['draft', 'approved', 'paid'].includes(invoice.status)) {
        return { data: null, error: 'Нельзя добавлять платежи к счетам в статусе: ' + invoice.status }
      }

      // Получаем сумму всех существующих платежей
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('total_amount')
        .eq('invoice_id', payment.invoice_id)
        .neq('status', 'cancelled')

      const totalPaid = existingPayments?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0
      const remainingAmount = invoice.total_amount - totalPaid

      // Проверяем, не превышает ли новый платеж остаток к оплате
      if (payment.total_amount > remainingAmount) {
        return {
          data: null,
          error: `Сумма платежа (${payment.total_amount}) превышает остаток к оплате (${remainingAmount})`
        }
      }

      // Генерируем internal_number если не указан
      let generatedInternalNumber: string | undefined
      if (!(payment as any).internal_number) {
        // Получаем последние платежи по этому счету
        const { data: existingInvoicePayments } = await supabase
          .from('payments')
          .select('internal_number')
          .eq('invoice_id', payment.invoice_id)
          .order('created_at', { ascending: false })
          .limit(1)

        let nextNumber = 1
        if (existingInvoicePayments && existingInvoicePayments.length > 0 && existingInvoicePayments[0]?.internal_number) {
          // Парсим номер из формата /PAY-NN-TYPE
          const match = existingInvoicePayments[0].internal_number.match(/PAY-(\d+)-/)
          if (match) {
            nextNumber = parseInt(match[1]) + 1
          }
        }

        // Генерируем internal_number в формате {номер счета}/PAY-NN-TYPE
        const typeStr = payment.payment_type === 'ADV' ? 'ADV' : payment.payment_type === 'RET' ? 'RET' : 'DEBT'
        const invoiceNum = invoice.internal_number || invoice.invoice_number || invoice.id
        generatedInternalNumber = `${invoiceNum}/PAY-${nextNumber.toString().padStart(2, '0')}-${typeStr}`
      }

      // Подготавливаем данные для вставки в соответствии со схемой БД
      const paymentData: any = {
        invoice_id: payment.invoice_id,
        payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
        total_amount: payment.total_amount,
        payment_type: payment.payment_type, // Добавляем тип платежа
        payer_id: payment.payer_id || invoice.payer_id, // Используем payer_id из invoice если не указан
        type_id: invoice.type_id, // Наследуем тип счета от связанного счета
        internal_number: generatedInternalNumber || (payment as any).internal_number,
        comment: payment.comment || (payment as any).description || (payment as any).notes,
        created_by: payment.created_by,
        status: payment.status || 'draft', // По умолчанию используем статус 'draft' (Черновик)
        // VAT поля
        vat_rate: (payment as any).vat_rate || 20,
        vat_amount: (payment as any).vat_amount || 0,
        amount_net: (payment as any).amount_net || payment.total_amount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      
      const { data, error } = await supabase
        .from('payments')
        .insert([paymentData])
        .select()
        .single()

      if (error) {throw error}

      return { data: data as Payment, error: null }
    } catch (error) {
      console.error('Ошибка создания платежа:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Получить платеж по ID с связанными данными
   */
  static async getById(id: string): Promise<ApiResponse<PaymentWithRelations>> {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoice:invoices!invoice_id(
            id, 
            invoice_number
          )
        `)
        .eq('id', id)
        .single()

      if (error) {throw error}

      return { data: data as PaymentWithRelations, error: null }
    } catch (error) {
      console.error('Ошибка получения платежа:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Обновить платеж
   */
  static async update(
    id: string, 
    updates: PaymentUpdate
  ): Promise<ApiResponse<Payment>> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return { data: data as Payment, error: null }
    } catch (error) {
      console.error('Ошибка обновления платежа:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Удалить платеж (только в статусе pending)
   */
  static async delete(id: string): Promise<ApiResponse<null>> {
    try {
      // Проверяем статус платежа
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('status')
        .eq('id', id)
        .single()

      if (fetchError) {throw fetchError}

      if (payment.status !== 'pending') {
        return {
          data: null,
          error: 'Можно удалять только платежи в статусе "В ожидании"'
        }
      }

      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)

      if (error) {throw error}

      return { data: null, error: null }
    } catch (error) {
      console.error('Ошибка удаления платежа:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Подтвердить платеж
   */
  static async confirmPayment(
    id: string,
    processedBy: string,
    data?: {
      processed_date?: string
      reference_number?: string
      comment?: string
    }
  ): Promise<ApiResponse<Payment>> {
    try {
      // Получаем платеж для проверки статуса
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('*, invoice:invoices!invoice_id(id, status)')
        .eq('id', id)
        .single()

      if (fetchError || !payment) {
        return { data: null, error: 'Платеж не найден' }
      }

      if (payment.status === 'completed') {
        return { data: null, error: 'Платеж уже подтвержден' }
      }

      if (payment.status === 'cancelled' || payment.status === 'failed') {
        return { data: null, error: 'Нельзя подтвердить отмененный или провалившийся платеж' }
      }

      const updateData: PaymentUpdate = {
        status: 'completed',
        approved_by: processedBy,
        approved_at: data?.processed_date || new Date().toISOString(),
        internal_number: data?.reference_number,
        comment: data?.comment,
        updated_at: new Date().toISOString(),
      }

      // Обновляем платеж
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) {throw updateError}

      // Обновляем статус заявки на "оплачена"
      const { error: invoiceUpdateError } = await supabase
        .from('invoices')
        .update({
          status: 'paid',
          updated_at: new Date().toISOString(),
        })
        .eq('id', payment.invoice_id)

      if (invoiceUpdateError) {
        console.error('Ошибка обновления статуса заявки:', invoiceUpdateError)
        // Не возвращаем ошибку, так как платеж уже подтвержден
      }

      return { data: updatedPayment as Payment, error: null }
    } catch (error) {
      console.error('Ошибка подтверждения платежа:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Отклонить платеж
   */
  static async rejectPayment(
    id: string,
    processedBy: string,
    reason: string
  ): Promise<ApiResponse<Payment>> {
    try {
      const updateData: PaymentUpdate = {
        status: 'failed',
        approved_by: processedBy,
        approved_at: new Date().toISOString(),
        comment: reason,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return { data: data as Payment, error: null }
    } catch (error) {
      console.error('Ошибка отклонения платежа:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Отменить платеж
   */
  static async cancelPayment(
    id: string,
    userId: string,
    reason?: string
  ): Promise<ApiResponse<Payment>> {
    try {
      // Проверяем, что платеж можно отменить
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('status, created_by')
        .eq('id', id)
        .single()

      if (fetchError || !payment) {
        return { data: null, error: 'Платеж не найден' }
      }

      if (payment.status === 'completed') {
        return { data: null, error: 'Нельзя отменить завершенный платеж' }
      }

      // Проверяем права (только автор может отменить)
      if (payment.created_by !== userId) {
        return { data: null, error: 'Отменить можно только свой платеж' }
      }

      const updateData: PaymentUpdate = {
        status: 'cancelled',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        comment: reason || 'Платеж отменен пользователем',
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      return { data: data as Payment, error: null }
    } catch (error) {
      console.error('Ошибка отмены платежа:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Загрузить файл для платежа
   */
  static async uploadFile(
    paymentId: string,
    file: File
  ): Promise<ApiResponse<string>> {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `payments/${paymentId}/${fileName}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {throw uploadError}

      // Файл загружен успешно
      // В будущем можно добавить запись в таблицу attachments,
      // если потребуется отслеживание вложений

      return { data: filePath, error: null }
    } catch (error) {
      console.error('Ошибка загрузки файла для платежа:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

  /**
   * Получить URL для скачивания файла
   */
  static getFileUrl(filePath: string): string {
    const { data } = supabase.storage
      .from('documents')
      .getPublicUrl(filePath)
    
    return data.publicUrl
  }

  /**
   * Удалить платеж
   */
  static async deletePayment(id: string): Promise<ApiResponse<void>> {
    try {
      console.log('[PaymentCrudService.deletePayment] Удаление платежа:', id)
      
      // Проверяем существование платежа и его статус
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('status, invoice_id')
        .eq('id', id)
        .single()

      if (fetchError || !payment) {
        return { data: null, error: 'Платеж не найден' }
      }

      if (payment.status === 'completed') {
        return { data: null, error: 'Нельзя удалить завершенный платеж' }
      }

      // Удаляем платеж
      const { error: deleteError } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('[PaymentCrudService.deletePayment] Ошибка удаления:', deleteError)
        throw deleteError
      }

      console.log('[PaymentCrudService.deletePayment] Платеж удален успешно')
      return { data: null, error: null }
    } catch (error) {
      console.error('[PaymentCrudService.deletePayment] Ошибка:', error)
      return {
        data: null,
        error: handleSupabaseError(error)
      }
    }
  }

}