/**
 * Hook for payment modal logic
 */

import { useState } from 'react'
import { Form, message } from 'antd'
import dayjs from 'dayjs'
import { useCreatePayment } from '@/services/hooks/usePayments'
import type { PaymentModalFormValues } from '../types'
import { DEFAULT_CURRENCY, DEFAULT_VAT_RATE } from '../constants'

export const usePaymentModal = (
  invoice: any,
  userId: string,
  refetchInvoice: () => void
) => {
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [paymentForm] = Form.useForm<PaymentModalFormValues>()
  const [paymentFiles, setPaymentFiles] = useState<File[]>([])

  const createPaymentMutation = useCreatePayment()

  // Расчет сумм НДС
  const calculateAmounts = () => {
    const totalAmount = paymentForm.getFieldValue('amount_with_vat') || 0
    const vatRate = paymentForm.getFieldValue('vat_rate') || 0

    console.log('[InvoiceView.calculateAmounts] Расчет сумм: Сумма с НДС =', totalAmount, 'Ставка НДС =', vatRate, '%')

    // Calculate net amount from gross (total with VAT)
    const amountNet = Number((totalAmount / (1 + vatRate / 100)).toFixed(2))
    const vatAmount = Number((totalAmount - amountNet).toFixed(2))

    console.log('[InvoiceView.calculateAmounts] Результат: Сумма без НДС =', amountNet, 'Сумма НДС =', vatAmount)
    paymentForm.setFieldsValue({
      amount_net: amountNet,
      vat_amount: vatAmount
    })
  }

  // Обработка добавления платежа
  const handleAddPayment = async (values: PaymentModalFormValues) => {
    try {
      console.log('[InvoiceView.handleAddPayment] Добавление платежа:', values)
      console.log('[InvoiceView.handleAddPayment] Файлы для загрузки:', paymentFiles)
      console.log('[InvoiceView.handleAddPayment] userId:', userId)

      if (!userId) {
        console.error('[InvoiceView.handleAddPayment] userId не определен')
        message.error('Ошибка: пользователь не определен')
        return
      }

      // Используем значения из формы
      const amountWithVat = parseFloat(values.amount_with_vat.toString())
      const amountWithoutVat = parseFloat(values.amount_net.toString())
      const vatAmount = parseFloat(values.vat_amount.toString())
      const vatRate = parseFloat(values.vat_rate.toString()) || 0

      const newPayment = await createPaymentMutation.mutateAsync({
        invoice_id: invoice?.id,
        amount_with_vat: amountWithVat,
        amount_net: amountWithoutVat,
        vat_amount: vatAmount,
        vat_rate: vatRate,
        payment_date: values.payment_date?.format('YYYY-MM-DD'),
        currency: values.currency || DEFAULT_CURRENCY,
        type: values.type,
        reference: values.reference,
        comment: values.comment,
        created_by: userId,
        payer_id: invoice?.payer_id,
        status: 'pending'
      })

      console.log('[InvoiceView.handleAddPayment] Платеж добавлен:', newPayment)

      // Загружаем файлы если они есть
      if (paymentFiles.length > 0 && newPayment?.id) {
        console.log('[InvoiceView.handleAddPayment] Загрузка файлов для платежа:', newPayment.id)
        const { documentsCrud } = await import('@/services/documents/crud')

        for (const file of paymentFiles) {
          try {
            await documentsCrud.createPaymentDocument({
              payment_id: newPayment.id,
              file,
              onProgress: (progress) => {
                console.log(`[InvoiceView.handleAddPayment] Прогресс загрузки ${file.name}:`, progress)
              }
            })
            console.log(`[InvoiceView.handleAddPayment] Файл ${file.name} успешно загружен`)
          } catch (fileError) {
            console.error(`[InvoiceView.handleAddPayment] Ошибка загрузки файла ${file.name}:`, fileError)
            message.error(`Ошибка загрузки файла ${file.name}`)
          }
        }
        message.success(`Загружено файлов: ${paymentFiles.length}`)
      }

      console.log('[InvoiceView.handleAddPayment] Платеж и файлы добавлены, обновляем счет')
      setPaymentModalVisible(false)
      paymentForm.resetFields()
      setPaymentFiles([])
      refetchInvoice()
      message.success('Платеж успешно добавлен')
    } catch (error) {
      console.error('[InvoiceView.handleAddPayment] Ошибка добавления платежа:', error)
      message.error('Ошибка при добавлении платежа')
    }
  }

  // Открытие модалки
  const openPaymentModal = (balance: number) => {
    console.log('[InvoiceView] Открытие модального окна добавления платежа')
    console.log('[InvoiceView] Текущий счет:', invoice)
    console.log('[InvoiceView] Баланс к оплате:', balance)

    paymentForm.setFieldsValue({
      payment_date: dayjs(),
      currency: invoice?.currency || DEFAULT_CURRENCY,
      vat_rate: invoice?.tax_rate || DEFAULT_VAT_RATE
    })

    setPaymentModalVisible(true)
  }

  return {
    paymentModalVisible,
    setPaymentModalVisible,
    paymentForm,
    paymentFiles,
    setPaymentFiles,
    createPaymentMutation,
    calculateAmounts,
    handleAddPayment,
    openPaymentModal
  }
}