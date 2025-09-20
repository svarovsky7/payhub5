-- Простая RPC функция для создания платежа без обращения к auth.uid()
-- v2: работает напрямую с таблицей payments без триггеров
CREATE OR REPLACE FUNCTION public.insert_payment_simple(
    p_invoice_id INTEGER,
    p_payment_date DATE DEFAULT CURRENT_DATE,
    p_total_amount NUMERIC DEFAULT 0,
    p_payer_id INTEGER DEFAULT NULL,
    p_type_id INTEGER DEFAULT NULL,
    p_internal_number VARCHAR DEFAULT NULL,
    p_comment TEXT DEFAULT NULL,
    p_status VARCHAR DEFAULT 'draft',
    p_vat_rate NUMERIC DEFAULT 20,
    p_vat_amount NUMERIC DEFAULT NULL,
    p_amount_net NUMERIC DEFAULT NULL
)
RETURNS TABLE(
    id INTEGER,
    invoice_id INTEGER,
    payment_date DATE,
    total_amount NUMERIC,
    payer_id INTEGER,
    type_id INTEGER,
    internal_number VARCHAR,
    comment TEXT,
    status VARCHAR,
    vat_rate NUMERIC,
    vat_amount NUMERIC,
    amount_net NUMERIC,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new_id INTEGER;
    v_calc_internal_number VARCHAR;
    v_calc_vat_amount NUMERIC;
    v_calc_amount_net NUMERIC;
BEGIN
    -- Генерируем internal_number если не передан
    IF p_internal_number IS NULL THEN
        -- Получаем номер счета для формирования internal_number
        SELECT
            COALESCE(i.internal_number, i.invoice_number, i.id::text) || '/PAY-' ||
            LPAD(
                (COALESCE(MAX(
                    CASE
                        WHEN p2.internal_number LIKE COALESCE(i.internal_number, i.invoice_number, i.id::text) || '/PAY-%'
                        THEN SUBSTRING(p2.internal_number FROM LENGTH(COALESCE(i.internal_number, i.invoice_number, i.id::text) || '/PAY-') + 1 FOR 2)::INTEGER
                        ELSE 0
                    END
                ), 0) + 1)::text, 2, '0'
            )
        INTO v_calc_internal_number
        FROM invoices i
        LEFT JOIN payments p2 ON p2.invoice_id = i.id
        WHERE i.id = p_invoice_id
        GROUP BY i.id, i.internal_number, i.invoice_number;
    ELSE
        v_calc_internal_number := p_internal_number;
    END IF;

    -- Рассчитываем НДС если не передан
    IF p_vat_amount IS NULL THEN
        v_calc_vat_amount := p_total_amount * p_vat_rate / (100 + p_vat_rate);
    ELSE
        v_calc_vat_amount := p_vat_amount;
    END IF;

    -- Рассчитываем сумму без НДС если не передана
    IF p_amount_net IS NULL THEN
        v_calc_amount_net := p_total_amount - v_calc_vat_amount;
    ELSE
        v_calc_amount_net := p_amount_net;
    END IF;

    -- Вставляем платеж напрямую в таблицу
    INSERT INTO payments (
        invoice_id,
        payment_date,
        total_amount,
        payer_id,
        type_id,
        internal_number,
        comment,
        status,
        vat_rate,
        vat_amount,
        amount_net,
        created_at,
        updated_at
    )
    VALUES (
        p_invoice_id,
        p_payment_date,
        p_total_amount,
        p_payer_id,
        p_type_id,
        v_calc_internal_number,
        p_comment,
        p_status,
        p_vat_rate,
        v_calc_vat_amount,
        v_calc_amount_net,
        NOW(),
        NOW()
    )
    RETURNING payments.id INTO v_new_id;

    -- Возвращаем вставленную запись
    RETURN QUERY
    SELECT
        p.id,
        p.invoice_id,
        p.payment_date,
        p.total_amount,
        p.payer_id,
        p.type_id,
        p.internal_number,
        p.comment,
        p.status,
        p.vat_rate,
        p.vat_amount,
        p.amount_net,
        p.created_at,
        p.updated_at
    FROM payments p
    WHERE p.id = v_new_id;
END;
$$;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION public.insert_payment_simple TO anon;
GRANT EXECUTE ON FUNCTION public.insert_payment_simple TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_payment_simple TO service_role;