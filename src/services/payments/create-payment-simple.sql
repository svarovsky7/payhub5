-- Простая функция для создания платежа без обращения к auth.uid()
CREATE OR REPLACE FUNCTION public.create_payment_simple(
    invoice_id_param INTEGER,
    payment_date_param DATE,
    total_amount_param NUMERIC,
    payer_id_param INTEGER,
    type_id_param INTEGER,
    internal_number_param VARCHAR,
    comment_param TEXT,
    status_param VARCHAR,
    vat_rate_param NUMERIC,
    vat_amount_param NUMERIC,
    amount_net_param NUMERIC
)
RETURNS TABLE (
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
AS $$
BEGIN
    RETURN QUERY
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
        created_by
    )
    VALUES (
        invoice_id_param,
        payment_date_param,
        total_amount_param,
        payer_id_param,
        type_id_param,
        internal_number_param,
        comment_param,
        status_param,
        vat_rate_param,
        vat_amount_param,
        amount_net_param,
        '00000000-0000-0000-0000-000000000000'::uuid
    )
    RETURNING
        payments.id,
        payments.invoice_id,
        payments.payment_date,
        payments.total_amount,
        payments.payer_id,
        payments.type_id,
        payments.internal_number,
        payments.comment,
        payments.status,
        payments.vat_rate,
        payments.vat_amount,
        payments.amount_net,
        payments.created_at,
        payments.updated_at;
END;
$$;