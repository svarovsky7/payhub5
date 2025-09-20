-- Отключаем проблемные триггеры, которые используют auth.uid() и вызывают ошибку прав доступа
-- Эти триггеры обращаются к таблице auth.users и вызывают "permission denied for table users"

-- Отключаем все триггеры связанные с track_payment_changes
ALTER TABLE public.payments DISABLE TRIGGER payment_history_trigger;
ALTER TABLE public.payments DISABLE TRIGGER payment_history_trigger_after_insert;
ALTER TABLE public.payments DISABLE TRIGGER payment_history_trigger_after_update;
ALTER TABLE public.payments DISABLE TRIGGER payment_history_trigger_before_delete;

-- Для включения обратно используйте:
-- ALTER TABLE public.payments ENABLE TRIGGER payment_history_trigger;
-- ALTER TABLE public.payments ENABLE TRIGGER payment_history_trigger_after_insert;
-- ALTER TABLE public.payments ENABLE TRIGGER payment_history_trigger_after_update;
-- ALTER TABLE public.payments ENABLE TRIGGER payment_history_trigger_before_delete;