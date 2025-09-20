/**
 * CRUD operations for payments
 */

import {
  type ApiResponse,
  handleSupabaseError,
  type Payment,
  type PaymentUpdate,
  supabase
} from '../supabase'
import type { PaymentInsertWithType } from '@/types/payment'
import { HistoryService } from '../history/HistoryService'
import { InvoicePaymentSyncService } from '../sync/InvoicePaymentSync'
import { VATCalculator } from '../calculations/VATCalculator'

export interface PaymentWithRelations extends Payment {
  invoice?: {
    id: string
    invoice_number: string
  }
}


export class PaymentCrudService {
  
  /**
   * Создать новый платеж
   */
  static async create(payment: PaymentInsertWithType): Promise<ApiResponse<Payment>> {
    try {
      console.log('[PaymentCrudService.create] Создание платежа:', {
        invoice_id: payment.invoice_id,
        total_amount: payment.total_amount,
        status: payment.status || 'draft'
      })

      // Получаем текущего пользователя
      console.log('[PaymentCrudService.create] Получение текущего пользователя...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.warn('[PaymentCrudService.create] Не удалось получить текущего пользователя:', userError)
      } else {
        console.log('[PaymentCrudService.create] Пользователь получен:', user.id)
      }

      // Проверяем, что заявка существует и готова к оплате
      console.log('[PaymentCrudService.create] Загрузка заявки:', payment.invoice_id)
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .select('id, invoice_number, internal_number, total_amount, status, payer_id, type_id')
        .eq('id', payment.invoice_id)
        .single()

      if (invoiceError || !invoice) {
        console.error('[PaymentCrudService.create] Ошибка загрузки заявки:', invoiceError)
        return { data: null, error: 'Заявка не найдена' }
      }

      console.log('[PaymentCrudService.create] Заявка загружена:', invoice)

      // Разрешаем добавлять платежи к счетам в статусах draft, approved, paid
      if (!['draft', 'approved', 'paid'].includes(invoice.status)) {
        console.error('[PaymentCrudService.create] Недопустимый статус заявки:', invoice.status)
        return { data: null, error: 'Нельзя добавлять платежи к счетам в статусе: ' + invoice.status }
      }

      // Получаем сумму всех существующих платежей
      console.log('[PaymentCrudService.create] Загрузка существующих платежей...')
      const { data: existingPayments } = await supabase
        .from('payments')
        .select('total_amount')
        .eq('invoice_id', payment.invoice_id)
        .neq('status', 'cancelled')

      console.log('[PaymentCrudService.create] Существующие платежи загружены:', existingPayments)
      const totalPaid = existingPayments?.reduce((sum, p) => sum + (p.total_amount || 0), 0) || 0
      const remainingAmount = invoice.total_amount - totalPaid
      console.log('[PaymentCrudService.create] Расчет остатка:', { totalPaid, remainingAmount })

      // Проверяем, не превышает ли новый платеж остаток к оплате
      if (payment.total_amount > remainingAmount) {
        console.error('[PaymentCrudService.create] Превышение остатка:', { payment_amount: payment.total_amount, remaining: remainingAmount })
        return {
          data: null,
          error: `Сумма платежа (${payment.total_amount}) превышает остаток к оплате (${remainingAmount})`
        }
      }

      // Генерируем internal_number если не указан
      let generatedInternalNumber: string | undefined
      if (!(payment as any).internal_number) {
        console.log('[PaymentCrudService.create] Генерация internal_number...')
        // Получаем ВСЕ платежи по этому счету для определения максимального номера
        const { data: existingInvoicePayments, error: fetchError } = await supabase
          .from('payments')
          .select('internal_number')
          .eq('invoice_id', payment.invoice_id)
          .not('internal_number', 'is', null)

        if (fetchError) {
          console.error('[PaymentCrudService.create] Ошибка при загрузке платежей для генерации номера:', fetchError)
        }

        let nextNumber = 1
        if (existingInvoicePayments && existingInvoicePayments.length > 0) {
          // Находим максимальный номер среди всех платежей
          let maxNumber = 0
          for (const payment of existingInvoicePayments) {
            if (payment.internal_number) {
              // Парсим номер из формата /PAY-NN (где NN - двухзначное число)
              const match = payment.internal_number.match(/\/PAY-(\d+)$/i)
              if (match) {
                const num = parseInt(match[1])
                if (num > maxNumber) {
                  maxNumber = num
                }
              }
            }
          }
          nextNumber = maxNumber + 1
        }

        // Генерируем internal_number в формате {номер счета}/PAY-NN
        const invoiceNum = invoice.internal_number || invoice.invoice_number || invoice.id
        generatedInternalNumber = `${invoiceNum}/PAY-${nextNumber.toString().padStart(2, '0')}`

        console.log(`[PaymentCrudService.create] Генерация номера платежа: ${generatedInternalNumber} (следующий номер: ${nextNumber})`)
      }

      // Calculate VAT if total amount is provided
      const vatRate = (payment as any).vat_rate || 20
      const vatCalculation = VATCalculator.calculateFromGross(
        payment.total_amount,
        vatRate
      )

      // Подготавливаем данные для вставки в соответствии со схемой БД
      const paymentData: any = {
        invoice_id: payment.invoice_id,
        payment_date: payment.payment_date || new Date().toISOString().split('T')[0],
        total_amount: vatCalculation.totalAmount,
        payer_id: payment.payer_id || invoice.payer_id, // Используем payer_id из invoice если не указан
        payment_type_id: payment.payment_type_id || (payment as any).payment_type_id, // Используем тип платежа
        internal_number: generatedInternalNumber || (payment as any).internal_number,
        comment: payment.comment || (payment as any).description || (payment as any).notes,
        // Временно убираем created_by, так как вызывает ошибку прав доступа к таблице users
        // created_by: payment.created_by,
        status: payment.status || 'draft', // По умолчанию используем статус 'draft' (Черновик)
        // VAT поля
        vat_rate: vatCalculation.vatRate,
        vat_amount: vatCalculation.vatAmount,
        amount_net: vatCalculation.netAmount,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }


      console.log('[PaymentCrudService.create] Подготовленные данные для вставки:', paymentData)

      // Вставляем платеж в базу данных
      // Теперь поле created_by добавлено в таблицу payments
      const insertData = {
        invoice_id: paymentData.invoice_id,
        payment_date: paymentData.payment_date,
        total_amount: paymentData.total_amount,
        payer_id: paymentData.payer_id,
        payment_type_id: paymentData.payment_type_id,
        internal_number: paymentData.internal_number,
        comment: paymentData.comment,
        status: paymentData.status,
        vat_rate: paymentData.vat_rate,
        vat_amount: paymentData.vat_amount,
        amount_net: paymentData.amount_net,
        created_by: user?.id // Записываем ID текущего пользователя
      }

      console.log('[PaymentCrudService.create] Вставка платежа в БД:', insertData)

      // ПРИМЕЧАНИЕ О ТРИГГЕРАХ:
      // После добавления поля created_by в таблицу payments:
      // 1. Функция fn_sync_invoice_payment теперь работает корректно
      // 2. Функция track_payment_changes все еще может вызывать проблемы с auth.uid()
      // См. database/add-created-by-to-payments.sql для деталей миграции

      const { data, error } = await supabase
        .from('payments')
        .insert(insertData)
        .select()
        .single()

      if (error) {
        console.error('[PaymentCrudService.create] Ошибка при вставке платежа:', error)
        throw error
      }

      console.log('[PaymentCrudService.create] Платеж успешно создан:', data)

      // Track history
      if (user?.id) {
        await HistoryService.trackPaymentChange(
          data.id,
          payment.invoice_id,
          'created',
          [],
          user.id,
          { source: 'payment_crud' }
        )
      }

      // Sync invoice status
      await InvoicePaymentSyncService.syncInvoiceStatus(
        payment.invoice_id,
        user?.id
      )

      return { data: data as Payment, error: null }
    } catch (error) {
      console.error('Ошибка создания платежа:', error)
      return {
        data: null,
        error: handleSupabaseError(error).error
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
        error: handleSupabaseError(error).error
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
      console.log('[PaymentCrudService.update] Обновление платежа:', { id, updates })

      // Get current data for history tracking
      const { data: oldData } = await supabase
        .from('payments')
        .select('*')
        .eq('id', id)
        .single()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()

      // Recalculate VAT if total amount changed
      let updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      }

      if ('total_amount' in updates && updates.total_amount) {
        const vatRate = (updates as any).vat_rate || oldData?.vat_rate || 20
        const vatCalculation = VATCalculator.calculateFromGross(
          Number(updates.total_amount),
          vatRate
        )
        updateData = {
          ...updateData,
          amount_net: vatCalculation.netAmount,
          vat_amount: vatCalculation.vatAmount,
          vat_rate: vatCalculation.vatRate,
          total_amount: vatCalculation.totalAmount
        }
      }

      console.log('[PaymentCrudService.update] Данные для обновления:', updateData)

      const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {throw error}

      // Track history
      if (user?.id && oldData) {
        const changes = HistoryService.calculateChanges(oldData, data)
        if (changes.length > 0) {
          await HistoryService.trackPaymentChange(
            data.id,
            oldData.invoice_id,
            'updated',
            changes,
            user.id,
            { source: 'payment_crud' }
          )
        }
      }

      // Sync invoice status
      if (oldData?.invoice_id) {
        await InvoicePaymentSyncService.syncInvoiceStatus(
          oldData.invoice_id,
          user?.id
        )
      }

      return { data: data as Payment, error: null }
    } catch (error) {
      console.error('Ошибка обновления платежа:', error)
      return {
        data: null,
        error: handleSupabaseError(error).error
      }
    }
  }

  /**
   * Удалить платеж (только в статусе draft или pending)
   */
  static async delete(id: string): Promise<ApiResponse<null>> {
    try {
      console.log('[PaymentCrudService.delete] Удаление платежа:', id)

      // Проверяем статус платежа
      const { data: payment, error: fetchError } = await supabase
        .from('payments')
        .select('status, invoice_id')
        .eq('id', id)
        .single()

      if (fetchError) {
        console.error('[PaymentCrudService.delete] Ошибка получения платежа:', fetchError)
        throw fetchError
      }

      if (payment.status !== 'draft' && payment.status !== 'pending') {
        return {
          data: null,
          error: 'Можно удалять только платежи в статусе "Черновик" или "На согласовании"'
        }
      }

      // Получаем дополнительную информацию о платеже для записи в историю
      const { data: fullPayment } = await supabase
        .from('payments')
        .select('internal_number, total_amount')
        .eq('id', id)
        .single()

      // Сначала обнуляем ссылки на платеж в существующих записях истории
      console.log('[PaymentCrudService.delete] Обнуление ссылок в истории на платеж:', id)
      const { error: historyUpdateError } = await supabase
        .from('invoice_history')
        .update({ payment_id: null })
        .eq('payment_id', id)

      if (historyUpdateError) {
        console.error('[PaymentCrudService.delete] Ошибка обновления истории:', historyUpdateError)
        // Не прерываем процесс, продолжаем удаление
      }

      // Теперь удаляем сам платеж
      console.log('[PaymentCrudService.delete] Удаление платежа из таблицы payments')
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('[PaymentCrudService.delete] Ошибка удаления платежа:', error)
        throw error
      }

      // После успешного удаления добавляем запись в историю
      console.log('[PaymentCrudService.delete] Добавление записи в историю об удалении')
      const { error: historyInsertError } = await supabase
        .from('invoice_history')
        .insert({
          invoice_id: payment.invoice_id,
          event_type: 'PAYMENT_DELETED',
          event_date: new Date().toISOString(),
          action: 'Платеж удален',
          description: `Удален платеж ${fullPayment?.internal_number || `#${id}`} на сумму ${fullPayment?.total_amount || 0}`,
          payment_id: null, // Платеж уже удален, поэтому null
          user_id: (await supabase.auth.getUser()).data.user?.id
        })

      if (historyInsertError) {
        console.error('[PaymentCrudService.delete] Ошибка добавления в историю:', historyInsertError)
        // Не критично, платеж уже удален
      }

      console.log('[PaymentCrudService.delete] Платеж успешно удален')

      // Sync invoice status after deletion
      if (payment.invoice_id) {
        await InvoicePaymentSyncService.syncInvoiceStatus(
          payment.invoice_id,
          (await supabase.auth.getUser()).data.user?.id
        )
      }

      return { data: null, error: null }
    } catch (error) {
      console.error('Ошибка удаления платежа:', error)
      return {
        data: null,
        error: handleSupabaseError(error).error
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

      if (payment.status === 'completed' || payment.status === 'paid') {
        return { data: null, error: 'Платеж уже подтвержден' }
      }

      if (payment.status === 'cancelled' || payment.status === 'failed') {
        return { data: null, error: 'Нельзя подтвердить отмененный или провалившийся платеж' }
      }

      // Разрешаем подтверждение платежей в статусах draft, pending, approved, scheduled
      if (!['draft', 'pending', 'approved', 'scheduled'].includes(payment.status)) {
        return { data: null, error: `Нельзя подтвердить платеж в статусе "${payment.status}"` }
      }

      const updateData: PaymentUpdate = {
        status: 'completed',
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
        error: handleSupabaseError(error).error
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
        error: handleSupabaseError(error).error
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
        .select('status')
        .eq('id', id)
        .single()

      if (fetchError || !payment) {
        return { data: null, error: 'Платеж не найден' }
      }

      if (payment.status === 'completed' || payment.status === 'paid') {
        return { data: null, error: 'Нельзя отменить оплаченный платеж' }
      }

      // Проверка прав убрана, так как поле created_by не существует в БД
      // if (payment.created_by !== userId) {
      //   return { data: null, error: 'Отменить можно только свой платеж' }
      // }

      const updateData: PaymentUpdate = {
        status: 'cancelled',
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
        error: handleSupabaseError(error).error
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
        error: handleSupabaseError(error).error
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

      // Track deletion in history
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id && payment) {
        await HistoryService.trackPaymentChange(
          Number(id),
          payment.invoice_id,
          'deleted',
          [],
          user.id,
          { source: 'payment_crud' }
        )
      }

      // Sync invoice status after deletion
      if (payment.invoice_id) {
        await InvoicePaymentSyncService.syncInvoiceStatus(
          payment.invoice_id,
          user?.id
        )
      }

      return { data: null, error: null }
    } catch (error) {
      console.error('[PaymentCrudService.deletePayment] Ошибка:', error)
      return {
        data: null,
        error: handleSupabaseError(error).error
      }
    }
  }

}