# План переноса логики из триггеров БД в код приложения

## Анализ текущей ситуации

### Триггеры и функции в БД:
1. **История изменений** (track_invoice_changes, track_payment_history, track_document_changes)
2. **Расчеты НДС** (fn_recalc_invoice_amounts, calculate_payment_vat)
3. **Синхронизация статусов** (fn_sync_invoice_payment)
4. **Workflow** (start_payment_workflow_simple)
5. **Обновление timestamps** (universal_update_updated_at)
6. **Дефолтные значения** (set_default_user_role)

## Этап 1: Перенос истории изменений (Приоритет: ВЫСОКИЙ)

### Что переносим:
- `track_invoice_changes()` - история изменений счетов
- `track_payment_history()` - история изменений платежей
- `track_document_changes()` - история документов

### План реализации:

#### 1.1. Создать сервис истории в коде:

```typescript
// src/services/history/HistoryService.ts
export class HistoryService {
  static async trackInvoiceChange(
    invoiceId: number,
    action: 'created' | 'updated' | 'deleted',
    changes: Record<string, { old: any; new: any }>,
    userId: string,
    metadata?: any
  ) {
    // Записать в invoice_history
  }

  static async trackPaymentChange(
    paymentId: number,
    invoiceId: number,
    action: 'created' | 'updated' | 'deleted',
    changes: Record<string, { old: any; new: any }>,
    userId: string
  ) {
    // Записать в invoice_history с event_type = 'payment'
  }
}
```

#### 1.2. Интегрировать в CRUD операции:

```typescript
// src/services/invoices/crud.ts
export async function updateInvoice(id: number, data: any, userId: string) {
  // Получить старые данные
  const oldData = await getInvoice(id)

  // Обновить счет
  const newData = await supabase
    .from('invoices')
    .update(data)
    .eq('id', id)
    .select()
    .single()

  // Записать историю
  await HistoryService.trackInvoiceChange(
    id,
    'updated',
    calculateChanges(oldData, newData),
    userId
  )

  return newData
}
```

#### 1.3. Отключить триггеры после миграции:

```sql
-- После проверки работоспособности
DROP TRIGGER IF EXISTS invoice_history_trigger ON invoices;
DROP TRIGGER IF EXISTS payment_history_trigger ON payments;
DROP TRIGGER IF EXISTS track_document_changes_trigger ON invoice_documents;
```

### Выгоды:
- ✅ Больше контроля над логированием
- ✅ Можно добавить асинхронную запись через очередь
- ✅ Легче тестировать и дебажить
- ✅ Можно добавить фильтрацию нежелательных изменений

## Этап 2: Перенос расчетов НДС и сумм (Приоритет: ВЫСОКИЙ)

### Что переносим:
- `fn_recalc_invoice_amounts()` - пересчет сумм счета
- `calculate_payment_vat()` - расчет НДС платежа

### План реализации:

#### 2.1. Создать утилиты расчета:

```typescript
// src/utils/calculations/vat.ts
export class VATCalculator {
  static calculateFromGross(grossAmount: number, vatRate: number) {
    const vatAmount = grossAmount * vatRate / (100 + vatRate)
    const netAmount = grossAmount - vatAmount
    return {
      netAmount: Math.round(netAmount * 100) / 100,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: grossAmount
    }
  }

  static calculateFromNet(netAmount: number, vatRate: number) {
    const vatAmount = netAmount * vatRate / 100
    const totalAmount = netAmount + vatAmount
    return {
      netAmount,
      vatAmount: Math.round(vatAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100
    }
  }
}
```

#### 2.2. Добавить расчеты в сервисный слой:

```typescript
// src/services/invoices/crud.ts
export async function createInvoice(data: InvoiceInput) {
  // Расчет сумм
  const amounts = VATCalculator.calculateFromGross(
    data.total_amount,
    data.vat_rate || 20
  )

  const invoiceData = {
    ...data,
    amount_net: amounts.netAmount,
    vat_amount: amounts.vatAmount,
    total_amount: amounts.totalAmount
  }

  // Создание счета
  const invoice = await supabase
    .from('invoices')
    .insert(invoiceData)
    .select()
    .single()

  return invoice
}
```

#### 2.3. Добавить CHECK constraints в БД:

```sql
-- Добавить проверки целостности данных
ALTER TABLE invoices
ADD CONSTRAINT check_invoice_amounts
CHECK (
  ROUND(total_amount, 2) = ROUND(amount_net + COALESCE(vat_amount, 0), 2)
);

ALTER TABLE payments
ADD CONSTRAINT check_payment_amounts
CHECK (
  ROUND(total_amount, 2) = ROUND(amount_net + COALESCE(vat_amount, 0), 2)
);

-- Отключить триггеры
DROP TRIGGER IF EXISTS trigger_recalc_invoice_amounts ON invoices;
DROP TRIGGER IF EXISTS calculate_payment_vat_trigger ON payments;
```

### Выгоды:
- ✅ Бизнес-логика в коде, легче менять правила
- ✅ CHECK constraints защищают от некорректных данных
- ✅ Можно добавить разные схемы расчета НДС
- ✅ Проще unit-тестировать

## Этап 3: Перенос синхронизации статусов (Приоритет: СРЕДНИЙ)

### Что переносим:
- `fn_sync_invoice_payment()` - синхронизация статуса счета при изменении платежей

### План реализации:

#### 3.1. Создать сервис синхронизации:

```typescript
// src/services/sync/InvoicePaymentSync.ts
export class InvoicePaymentSyncService {
  static async syncInvoiceStatus(invoiceId: number) {
    // Получить все платежи
    const payments = await getPaymentsByInvoice(invoiceId)
    const invoice = await getInvoice(invoiceId)

    // Рассчитать суммы
    const paidAmount = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.total_amount, 0)

    const pendingAmount = payments
      .filter(p => ['pending', 'approved'].includes(p.status))
      .reduce((sum, p) => sum + p.total_amount, 0)

    // Определить новый статус
    let newStatus = 'draft'
    if (paidAmount >= invoice.total_amount) {
      newStatus = 'paid'
    } else if (paidAmount > 0) {
      newStatus = 'partially_paid'
    } else if (pendingAmount > 0) {
      newStatus = 'pending'
    }

    // Обновить статус если изменился
    if (invoice.status !== newStatus) {
      await updateInvoice(invoiceId, { status: newStatus })
    }
  }
}
```

#### 3.2. Вызывать при операциях с платежами:

```typescript
// src/services/payments/crud.ts
export async function createPayment(data: PaymentInput, userId: string) {
  const payment = await supabase
    .from('payments')
    .insert(data)
    .select()
    .single()

  // Синхронизировать статус счета
  await InvoicePaymentSyncService.syncInvoiceStatus(data.invoice_id)

  // Записать историю
  await HistoryService.trackPaymentChange(payment.id, 'created', {}, userId)

  return payment
}
```

### Выгоды:
- ✅ Прозрачная логика статусов
- ✅ Можно добавить дополнительные проверки
- ✅ Легче отлаживать проблемы со статусами

## Этап 4: Перенос Workflow логики (Приоритет: НИЗКИЙ)

### Что переносим:
- `start_payment_workflow_simple()` - запуск процесса согласования

### План реализации:

#### 4.1. Создать Workflow сервис:

```typescript
// src/services/workflow/WorkflowService.ts
export class WorkflowService {
  static async startPaymentWorkflow(
    paymentId: number,
    workflowId: number,
    userId: string
  ) {
    // Создать экземпляр workflow
    const instance = await supabase
      .from('payment_workflows')
      .insert({
        payment_id: paymentId,
        workflow_id: workflowId,
        status: 'active',
        current_stage_id: null,
        started_by: userId,
        started_at: new Date()
      })
      .select()
      .single()

    // Запустить первый этап
    const firstStage = await this.getFirstStage(workflowId)
    await this.startStage(instance.id, firstStage.id)

    return instance
  }

  static async processStageTransition(
    instanceId: number,
    action: 'approve' | 'reject',
    userId: string,
    comment?: string
  ) {
    // Логика перехода между этапами
  }
}
```

### Выгоды:
- ✅ Гибкая настройка процессов
- ✅ Можно добавить условные переходы
- ✅ Интеграция с внешними системами

## Этап 5: Оптимизация производительности

### Меры для сохранения производительности:

#### 5.1. Использование транзакций:

```typescript
export async function createInvoiceWithPayments(
  invoice: InvoiceInput,
  payments: PaymentInput[]
) {
  const client = await supabase.rpc('begin_transaction')

  try {
    // Создать счет
    const newInvoice = await createInvoice(invoice)

    // Создать платежи
    for (const payment of payments) {
      await createPayment({ ...payment, invoice_id: newInvoice.id })
    }

    // Синхронизировать статус
    await InvoicePaymentSyncService.syncInvoiceStatus(newInvoice.id)

    await supabase.rpc('commit_transaction')
    return newInvoice
  } catch (error) {
    await supabase.rpc('rollback_transaction')
    throw error
  }
}
```

#### 5.2. Батчинг операций:

```typescript
export async function bulkUpdatePaymentStatuses(
  paymentIds: number[],
  newStatus: string
) {
  // Одним запросом обновить все
  await supabase
    .from('payments')
    .update({ status: newStatus })
    .in('id', paymentIds)

  // Получить уникальные invoice_id для синхронизации
  const invoiceIds = [...new Set(payments.map(p => p.invoice_id))]

  // Синхронизировать статусы параллельно
  await Promise.all(
    invoiceIds.map(id => InvoicePaymentSyncService.syncInvoiceStatus(id))
  )
}
```

#### 5.3. Кэширование:

```typescript
export class InvoiceCache {
  private static cache = new Map<number, any>()

  static async get(id: number) {
    if (!this.cache.has(id)) {
      const invoice = await getInvoice(id)
      this.cache.set(id, invoice)
    }
    return this.cache.get(id)
  }

  static invalidate(id: number) {
    this.cache.delete(id)
  }
}
```

## Порядок миграции

### Фаза 1 (1-2 недели):
1. ✅ Реализовать HistoryService
2. ✅ Добавить вызовы в CRUD операции
3. ✅ Запустить параллельно с триггерами
4. ✅ Сравнить результаты

### Фаза 2 (1 неделя):
1. ✅ Реализовать VATCalculator
2. ✅ Обновить создание/редактирование счетов
3. ✅ Добавить CHECK constraints
4. ✅ Отключить триггеры расчета

### Фаза 3 (1 неделя):
1. ✅ Реализовать InvoicePaymentSyncService
2. ✅ Интегрировать в платежные операции
3. ✅ Тестирование синхронизации
4. ✅ Отключить fn_sync_invoice_payment

### Фаза 4 (2 недели):
1. ✅ Реализовать WorkflowService
2. ✅ Перенести логику переходов
3. ✅ Тестирование процессов
4. ✅ Отключить workflow функции

## Метрики успеха

1. **Производительность**: Время выполнения операций не увеличилось более чем на 10%
2. **Надежность**: Нет потери данных истории
3. **Целостность**: CHECK constraints не нарушаются
4. **Тестируемость**: 90%+ покрытие unit-тестами новой логики

## Риски и митигация

| Риск | Вероятность | Влияние | Митигация |
|------|------------|---------|-----------|
| Потеря истории при миграции | Низкая | Высокое | Параллельная работа старой и новой логики |
| Снижение производительности | Средняя | Среднее | Батчинг, кэширование, оптимизация запросов |
| Ошибки в расчетах | Низкая | Высокое | CHECK constraints, unit-тесты |
| Несогласованность данных | Низкая | Высокое | Транзакции, retry логика |

## Заключение

План обеспечивает постепенный перенос логики из БД в код с минимальными рисками. Каждый этап может быть реализован независимо, что позволяет контролировать процесс и откатываться при необходимости.