-- =====================================================
-- ИСПРАВЛЕНИЕ ФУНКЦИИ CASCADE_DELETE_INVOICE (версия 2)
-- =====================================================
-- Ошибка: column "payment_workflow_id" does not exist
-- Правильное имя колонки: workflow_id

-- Удаляем старую версию функции
DROP FUNCTION IF EXISTS public.cascade_delete_invoice(integer);

-- Создаем исправленную версию функции
CREATE OR REPLACE FUNCTION public.cascade_delete_invoice(p_invoice_id integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result jsonb;
    v_deleted_payments integer := 0;
    v_deleted_documents integer := 0;
    v_deleted_workflows integer := 0;
    v_deleted_history integer := 0;
    v_deleted_approval_progress integer := 0;
    v_error text;
BEGIN
    -- Начинаем транзакцию
    BEGIN
        -- 1. Удаляем записи прогресса согласования
        -- ВАЖНО: в таблице workflow_approval_progress колонка называется workflow_id, а не payment_workflow_id
        DELETE FROM public.workflow_approval_progress
        WHERE workflow_id IN (
            SELECT id FROM public.payment_workflows
            WHERE invoice_id = p_invoice_id
        );
        GET DIAGNOSTICS v_deleted_approval_progress = ROW_COUNT;

        -- 2. Удаляем workflow платежей
        DELETE FROM public.payment_workflows
        WHERE invoice_id = p_invoice_id;
        GET DIAGNOSTICS v_deleted_workflows = ROW_COUNT;

        -- 3. Удаляем платежи
        DELETE FROM public.payments
        WHERE invoice_id = p_invoice_id;
        GET DIAGNOSTICS v_deleted_payments = ROW_COUNT;

        -- 4. Удаляем документы счета
        DELETE FROM public.invoice_documents
        WHERE invoice_id = p_invoice_id;
        GET DIAGNOSTICS v_deleted_documents = ROW_COUNT;

        -- 5. Удаляем историю счета
        DELETE FROM public.invoice_history
        WHERE invoice_id = p_invoice_id;
        GET DIAGNOSTICS v_deleted_history = ROW_COUNT;

        -- 6. Удаляем сам счет
        DELETE FROM public.invoices
        WHERE id = p_invoice_id;

        -- Формируем результат
        v_result := jsonb_build_object(
            'success', true,
            'invoice_id', p_invoice_id,
            'deleted_payments', v_deleted_payments,
            'deleted_documents', v_deleted_documents,
            'deleted_workflows', v_deleted_workflows,
            'deleted_history', v_deleted_history,
            'deleted_approval_progress', v_deleted_approval_progress,
            'timestamp', now()
        );

        -- Логируем успешное удаление
        RAISE NOTICE 'Счет % успешно удален вместе со связанными записями', p_invoice_id;
        RAISE NOTICE 'Удалено: платежей=%, документов=%, workflow=%, истории=%, прогресса=%',
            v_deleted_payments, v_deleted_documents, v_deleted_workflows,
            v_deleted_history, v_deleted_approval_progress;

        RETURN v_result;

    EXCEPTION WHEN OTHERS THEN
        -- В случае ошибки откатываем транзакцию
        v_error := SQLERRM;

        -- Формируем результат с ошибкой
        v_result := jsonb_build_object(
            'success', false,
            'invoice_id', p_invoice_id,
            'error', v_error,
            'timestamp', now()
        );

        -- Логируем ошибку
        RAISE WARNING 'Ошибка при удалении счета %: %', p_invoice_id, v_error;

        RETURN v_result;
    END;
END;
$$;

-- Добавляем комментарий к функции
COMMENT ON FUNCTION public.cascade_delete_invoice IS 'Каскадное удаление счета и всех связанных записей с отчетом о результате';

-- Проверяем структуру таблиц для подтверждения правильности
SELECT
    t.table_name,
    c.column_name,
    c.data_type
FROM information_schema.tables t
JOIN information_schema.columns c ON c.table_name = t.table_name
WHERE t.table_schema = 'public'
    AND t.table_name IN ('workflow_approval_progress', 'payment_workflows')
    AND c.column_name IN ('id', 'workflow_id', 'payment_workflow_id', 'invoice_id')
ORDER BY t.table_name, c.ordinal_position;