-- Seed basic directory values
INSERT INTO public.contractor_types (code, name, description)
VALUES ('SUPP', 'Supplier', 'Material supplier directory entry')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.invoice_types (code, name, description)
VALUES ('MATERIAL', 'Material delivery', 'Invoices for construction material shipments')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO public.payment_types (id, code, name, description, created_by)
VALUES (gen_random_uuid(), 'BANK', 'Wire transfer', 'Non-cash payment', gen_random_uuid())
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
RETURNING id AS payment_type_id;

-- Register contractor and project
WITH contractor AS (
  INSERT INTO public.contractors (name, inn, type_id, created_by)
  VALUES ('LLC Monolith', '7701234567', (SELECT id FROM public.contractor_types WHERE code = 'SUPP'), gen_random_uuid())
  RETURNING id AS contractor_id
),
project AS (
  INSERT INTO public.projects (name, project_code)
  VALUES ('Building 7, North Residence', 'B7N')
  RETURNING id AS project_id
),
responsible AS (
  INSERT INTO public.material_responsible_persons (full_name, phone, email, created_by)
  VALUES ('Ivan Ivanov', '+7-900-000-00-00', 'ivanov@example.com', gen_random_uuid())
  RETURNING id AS mrp_id
),
app_user AS (
  INSERT INTO public.users (id, email, full_name)
  VALUES (gen_random_uuid(), 'pm@example.com', 'Project Manager')
  RETURNING id AS user_id
)
INSERT INTO public.invoices (
  invoice_number,
  invoice_date,
  project_id,
  type_id,
  supplier_id,
  payer_id,
  amount_net,
  vat_rate,
  total_amount,
  description,
  created_by,
  material_responsible_person_id
)
SELECT
  'INV-2025-0001',
  CURRENT_DATE,
  project.project_id,
  (SELECT id FROM public.invoice_types WHERE code = 'MATERIAL'),
  contractor.contractor_id,
  contractor.contractor_id,
  100000,
  20,
  120000,
  'Steel rebar purchase for structural work',
  app_user.user_id,
  responsible.mrp_id
FROM contractor, project, responsible, app_user
RETURNING id AS invoice_id;

-- Attach a scanned invoice file (triggers log document change)
WITH inv AS (
  SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001'
), author AS (
  SELECT id FROM public.users WHERE email = 'pm@example.com'
), file_asset AS (
  INSERT INTO public.attachments (original_name, storage_path, size_bytes, mime_type, created_by)
  VALUES ('invoice-0001.pdf', 'invoices/INV-2025-0001/invoice-0001.pdf', 524288, 'application/pdf', (SELECT id FROM author))
  RETURNING id AS attachment_id
)
INSERT INTO public.invoice_documents (invoice_id, attachment_id)
SELECT inv.id, file_asset.attachment_id FROM inv, file_asset;

-- Record a payment and let calculate_payment_vat / fn_sync_invoice_payment adjust totals
WITH payment_type AS (
  SELECT id FROM public.payment_types WHERE code = 'BANK'
), invoice_row AS (
  SELECT id, payer_id, created_by FROM public.invoices WHERE invoice_number = 'INV-2025-0001'
)
INSERT INTO public.payments (
  invoice_id,
  payment_date,
  payer_id,
  total_amount,
  vat_rate,
  status,
  payment_type_id,
  created_by
)
SELECT
  invoice_row.id,
  CURRENT_DATE,
  invoice_row.payer_id,
  60000,
  20,
  'processing',
  payment_type.id,
  invoice_row.created_by
FROM invoice_row, payment_type
RETURNING id AS payment_id, amount_net, vat_amount;

-- Update payment status to completed (track_payment_history + fn_sync_invoice_payment fire)
UPDATE public.payments
SET status = 'completed', updated_at = NOW()
WHERE invoice_id = (SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001')
RETURNING id, status;

-- Inspect invoice totals after trigger adjustments
SELECT
  inv.invoice_number,
  inv.total_amount,
  inv.paid_amount,
  inv.status,
  inv.paid_at
FROM public.invoices AS inv
WHERE inv.invoice_number = 'INV-2025-0001';

-- Read detailed invoice history assembled by triggers
SELECT
  h.event_date,
  h.event_type,
  h.action,
  h.description,
  h.user_name
FROM public.get_invoice_history((SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001')) AS h
ORDER BY h.event_date DESC;

-- Launch a simple payment workflow instance for approval
SELECT public.start_payment_workflow_simple(
  p.id,
  p.invoice_id,
  (SELECT id FROM public.workflows WHERE is_active LIMIT 1),
  p.created_by,
  p.total_amount,
  COALESCE(p.comment, 'Material payment'),
  p.payer_id,
  (SELECT project_id FROM public.invoices WHERE id = p.invoice_id),
  p.payment_date
) AS workflow_instance
FROM public.payments AS p
WHERE p.invoice_id = (SELECT id FROM public.invoices WHERE invoice_number = 'INV-2025-0001')
LIMIT 1;

-- Check whether an invoice status is final using helper
SELECT public.is_status_final('invoice', 'paid') AS is_invoice_paid_final;
