-- RPC функция для создания платежа без проверки прав на таблицу users
CREATE OR REPLACE FUNCTION public.create_payment_without_auth(
    p_invoice_id INTEGER,
    p_payment_date DATE,
    p_total_amount NUMERIC(15,2),
    p_payer_id INTEGER,
    p_type_id INTEGER DEFAULT NULL,
    p_internal_number VARCHAR(80) DEFAULT NULL,
    p_comment TEXT DEFAULT NULL,
    p_status VARCHAR(50) DEFAULT 'draft',
    p_vat_rate NUMERIC(5,2) DEFAULT 20,
    p_vat_amount NUMERIC(15,2) DEFAULT NULL,
    p_amount_net NUMERIC(15,2) DEFAULT NULL
)
RETURNS payments
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment payments;
    v_calculated_internal_number VARCHAR(80);
BEGIN
    -- Генерируем internal_number если не передан
    IF p_internal_number IS NULL THEN
        SELECT internal_number || '/PAY-' || LPAD((COALESCE(MAX(
            CASE
                WHEN internal_number LIKE internal_number || '/PAY-%' THEN
                    SUBSTRING(internal_number FROM LENGTH(internal_number || '/PAY-') + 1 FOR 2)::INTEGER
                ELSE 0
            END
        ), 0) + 1)::TEXT, 2, '0')
        INTO v_calculated_internal_number
        FROM invoices i
        LEFT JOIN payments p ON p.invoice_id = i.id
        WHERE i.id = p_invoice_id
        GROUP BY i.internal_number;

        IF v_calculated_internal_number IS NULL THEN
            v_calculated_internal_number := 'PAY-' || p_invoice_id || '-01';
        END IF;
    ELSE
        v_calculated_internal_number := p_internal_number;
    END IF;

    -- Вставляем платеж с явным указанием created_by как системный UUID
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
        created_by,
        created_at,
        updated_at
    )
    VALUES (
        p_invoice_id,
        p_payment_date,
        p_total_amount,
        p_payer_id,
        p_type_id,
        v_calculated_internal_number,
        p_comment,
        p_status,
        p_vat_rate,
        COALESCE(p_vat_amount, p_total_amount * p_vat_rate / (100 + p_vat_rate)),
        COALESCE(p_amount_net, p_total_amount - COALESCE(p_vat_amount, p_total_amount * p_vat_rate / (100 + p_vat_rate))),
        '00000000-0000-0000-0000-000000000000'::uuid, -- Системный UUID вместо auth.uid()
        NOW(),
        NOW()
    )
    RETURNING * INTO v_payment;

    RETURN v_payment;
END;
$$;

-- Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION public.create_payment_without_auth TO anon;
GRANT EXECUTE ON FUNCTION public.create_payment_without_auth TO authenticated;