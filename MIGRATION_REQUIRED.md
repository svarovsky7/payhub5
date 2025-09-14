# ВАЖНО: Требуется выполнить миграцию в базе данных

## Что изменилось:
1. Статус платежей по умолчанию установлен 'draft' (Черновик)
2. Обновлена функция триггера для корректного подсчета оплаченной суммы
3. Удален check constraint для статусов платежей

## Необходимые действия:

### 1. Удалите check constraint для статусов платежей:

```sql
-- Выполните скрипт из файла: supabase/migrations/remove_payment_status_check.sql
-- Этот скрипт удалит проверку статусов, позволяя использовать 'draft'
```

### 2. Обновите функцию триггера:

```sql
-- Обновление функции fn_sync_invoice_payment для исключения платежей со статусами 'draft' и 'pending' из подсчета paid_amount
CREATE OR REPLACE FUNCTION public.fn_sync_invoice_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    total_paid numeric(15,2);
    invoice_total numeric(15,2);
    target_invoice_id integer;
BEGIN
    -- Determine which invoice to update
    IF TG_OP = 'DELETE' THEN
        target_invoice_id := OLD.invoice_id;
    ELSE
        target_invoice_id := NEW.invoice_id;
    END IF;

    -- Calculate total paid amount for the invoice
    -- Учитываем только платежи со статусами: paid, approved, scheduled
    SELECT COALESCE(SUM(total_amount), 0)
    INTO total_paid
    FROM payments
    WHERE invoice_id = target_invoice_id
    AND status IN ('paid', 'approved', 'scheduled');

    -- Get invoice total amount
    SELECT total_amount
    INTO invoice_total
    FROM invoices
    WHERE id = target_invoice_id;

    -- Update invoice paid_amount and status
    UPDATE invoices
    SET
        paid_amount = total_paid,
        status = CASE
            WHEN total_paid = 0 THEN
                CASE
                    WHEN status IN ('paid', 'partially_paid') THEN 'approved'
                    ELSE status
                END
            WHEN total_paid >= invoice_total THEN 'paid'
            WHEN total_paid > 0 THEN 'partially_paid'
            ELSE status
        END,
        paid_at = CASE
            WHEN total_paid >= invoice_total AND paid_at IS NULL THEN NOW()
            WHEN total_paid < invoice_total THEN NULL
            ELSE paid_at
        END,
        updated_at = NOW()
    WHERE id = target_invoice_id;

    RETURN NEW;
END;
$function$;
```

## Почему это важно:
- Платежи со статусами 'draft' и 'pending' НЕ будут учитываться при подсчете оплаченной суммы счета
- Это предотвратит автоматическое изменение статуса счета на 'paid' или 'partially_paid' при создании черновика платежа
- Счет изменит статус только когда платеж будет одобрен (статус изменится на 'paid', 'approved' или 'scheduled')

## Файлы миграций:
1. `supabase/migrations/remove_payment_status_check.sql` - удаление check constraint
2. `supabase/migrations/fix_payment_pending_status.sql` - обновление функции триггера

## Примечание о статусах платежей:
База данных поддерживает следующие статусы платежей:
- `draft` - Черновик (используется по умолчанию при создании)
- `pending` - На согласовании
- `approved` - Согласован
- `scheduled` - В графике на оплату
- `paid` - Оплачен
- `cancelled` - Отменён

Платежи учитываются в оплаченной сумме счета только в статусах: `paid`, `approved`, `scheduled`.