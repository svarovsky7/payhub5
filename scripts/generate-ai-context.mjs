import fs from "fs";
import path from "path";
import crypto from "crypto";

const root = process.cwd();
const exportsDir = path.join(root, "supabase", "exports");
const migrationsDir = path.join(root, "supabase", "migrations");
const aiDir = path.join(root, "supabase", "ai_context");

if (!fs.existsSync(aiDir)) {
  fs.mkdirSync(aiDir, { recursive: true });
}

const tables = JSON.parse(fs.readFileSync(path.join(exportsDir, "tables.json"), "utf8"));
const indexes = JSON.parse(fs.readFileSync(path.join(exportsDir, "indexes.json"), "utf8"));
const triggers = JSON.parse(fs.readFileSync(path.join(exportsDir, "triggers.json"), "utf8"));
const functionsData = JSON.parse(fs.readFileSync(path.join(exportsDir, "functions.json"), "utf8"));
const enums = JSON.parse(fs.readFileSync(path.join(exportsDir, "enums.json"), "utf8"));

const publicTableKeys = Object.keys(tables).filter((key) => key.startsWith("public."));

const shorten = (text, max = 160) => {
  if (!text) return null;
  const trimmed = text.trim().replace(/\s+/g, " ");
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
};

const columnTypeOverrides = {
  "public.users.project_ids": "integer[]",
  "public.themes.shared_with_roles": "integer[]",
  "public.workflows.invoice_type_ids": "integer[]",
  "public.payments.payment_type_id": "uuid",
  "public.payments.type_id": "integer",
  "public.invoices.priority": "priority_level",
  "public.attachments.storage_path": "varchar(500)"
};

const fkOverrides = {
  "public.attachments": {
    created_by: { references: "public.users.id", description: "Attachment metadata links to the authoring user" }
  },
  "public.contractors": {
    type_id: { references: "public.contractor_types.id", description: "Contractor is categorized by contractor_types" },
    created_by: { references: "public.users.id", description: "Audit trail to the user who created the contractor" }
  },
  "public.invoice_documents": {
    invoice_id: { references: "public.invoices.id", description: "Document row belongs to invoice" },
    attachment_id: { references: "public.attachments.id", description: "Links to stored attachment metadata" }
  },
  "public.invoice_history": {
    invoice_id: { references: "public.invoices.id", description: "History rows reference the invoice" },
    payment_id: { references: "public.payments.id", description: "Optional link to payment that produced the entry" },
    document_id: { references: "public.invoice_documents.id", description: "Optional link to related document" },
    attachment_id: { references: "public.attachments.id", description: "Optional link to attachment file" },
    user_id: { references: "public.users.id", description: "User who caused the history event" }
  },
  "public.invoices": {
    project_id: { references: "public.projects.id", description: "Invoice belongs to project" },
    type_id: { references: "public.invoice_types.id", description: "Invoice typed by invoice_types directory" },
    supplier_id: { references: "public.contractors.id", description: "Supplier contractor" },
    payer_id: { references: "public.contractors.id", description: "Paying contractor" },
    material_responsible_person_id: { references: "public.material_responsible_persons.id", description: "Assigned material responsible person" },
    created_by: { references: "public.users.id", description: "User who created the invoice" }
  },
  "public.material_responsible_persons": {
    created_by: { references: "public.users.id", description: "User who added the material responsible person" }
  },
  "public.payment_types": {
    created_by: { references: "public.users.id", description: "User who added the payment type" },
    updated_by: { references: "public.users.id", description: "User who last updated the payment type" }
  },
  "public.payments": {
    invoice_id: { references: "public.invoices.id", description: "Payment settles invoice" },
    payer_id: { references: "public.contractors.id", description: "Payer contractor" },
    created_by: { references: "public.users.id", description: "User who created payment" },
    payment_type_id: { references: "public.payment_types.id", description: "Payment classified by payment_types" }
  },
  "public.payment_workflows": {
    payment_id: { references: "public.payments.id", description: "Workflow instance tracks a payment" },
    invoice_id: { references: "public.invoices.id", description: "Payment workflow keeps invoice context" },
    workflow_id: { references: "public.workflows.id", description: "Workflow definition used for the payment" },
    current_stage_id: { references: "public.workflow_stages.id", description: "Current workflow stage" },
    contractor_id: { references: "public.contractors.id", description: "Target contractor" },
    project_id: { references: "public.projects.id", description: "Project in which payment occurs" },
    started_by: { references: "public.users.id", description: "User who launched the workflow" },
    completed_by: { references: "public.users.id", description: "User who marked workflow complete" },
    cancelled_by: { references: "public.users.id", description: "User who cancelled workflow" }
  },
  "public.themes": {
    user_id: { references: "public.users.id", description: "Theme owner" },
    parent_theme_id: { references: "public.themes.id", description: "Theme clones another theme" },
    created_by: { references: "public.users.id", description: "User who created the theme" },
    updated_by: { references: "public.users.id", description: "User who last updated the theme" }
  },
  "public.users": {
    role_id: { references: "public.roles.id", description: "Assigned application role" }
  },
  "public.workflow_approval_progress": {
    workflow_id: { references: "public.payment_workflows.id", description: "Progress row references payment workflow" },
    stage_id: { references: "public.workflow_stages.id", description: "Stage for which progress was recorded" },
    user_id: { references: "public.users.id", description: "Approver handling this stage" }
  },
  "public.workflow_stages": {
    workflow_id: { references: "public.workflows.id", description: "Stage belongs to workflow" }
  }
};

const relationSet = new Set();
const relations = [];

const formatType = (tableKey, column) => {
  const overrideKey = `${tableKey}.${column.name}`;
  if (columnTypeOverrides[overrideKey]) {
    return columnTypeOverrides[overrideKey];
  }
  const type = column.data_type ? column.data_type.toLowerCase() : "";
  if (type === "character varying") {
    return column.max_length ? `varchar(${column.max_length})` : "varchar";
  }
  if (type === "numeric") {
    if (column.numeric_precision && column.numeric_scale != null) {
      return `numeric(${column.numeric_precision},${column.numeric_scale})`;
    }
    return "numeric";
  }
  if (type === "timestamp with time zone") {
    return "timestamptz";
  }
  if (type === "timestamp without time zone") {
    return "timestamp";
  }
  if (type === "user-defined") {
    if (column.default) {
      const match = column.default.match(/::([\w\.]+)/);
      if (match) {
        return match[1];
      }
    }
    return "user-defined";
  }
  if (type === "array") {
    return "array";
  }
  if (!type) {
    return "unknown";
  }
  return type;
};

const cleanDefault = (value) => {
  if (!value) return null;
  return value
    .replace(/^nextval\('[^']+'::regclass\)$/i, "nextval")
    .replace(/::[\w\.]+/g, "")
    .trim() || null;
};

const extractForeignKeys = (tableKey, table) => {
  const entries = [];
  const constraintList = table.constraints || [];
  const overrides = fkOverrides[tableKey] || {};

  for (const constraint of constraintList) {
    if (constraint.type !== "FOREIGN KEY") continue;
    const column = constraint.column;
    if (!column) continue;
    let target = null;
    let description = null;
    if (constraint.foreign_table && constraint.foreign_column) {
      const schema = constraint.foreign_table_schema || table.schema;
      target = `${schema}.${constraint.foreign_table}.${constraint.foreign_column}`;
    }
    if (!target && overrides[column]) {
      target = overrides[column].references;
      description = overrides[column].description;
    }
    if (!target) continue;
    entries.push({ column, references: target });
    const relKey = `${tableKey}.${column}->${target}`;
    if (!relationSet.has(relKey)) {
      relationSet.add(relKey);
      relations.push({
        from: `${tableKey}.${column}`,
        to: target,
        description: description || `Foreign key from ${tableKey}.${column} to ${target}`
      });
    }
  }

  if (overrides) {
    for (const [column, meta] of Object.entries(overrides)) {
      if (!entries.find((item) => item.column === column)) {
        entries.push({ column, references: meta.references });
        const relKey = `${tableKey}.${column}->${meta.references}`;
        if (!relationSet.has(relKey)) {
          relationSet.add(relKey);
          relations.push({
            from: `${tableKey}.${column}`,
            to: meta.references,
            description: meta.description || `Foreign key from ${tableKey}.${column} to ${meta.references}`
          });
        }
      }
    }
  }

  return entries.sort((a, b) => a.column.localeCompare(b.column));
};

const parseIndexDefinition = (sql) => {
  if (!sql) return [];
  const match = sql.match(/\(([^;]+)\)\s*$/s);
  if (!match) return [];
  return match[1]
    .split(",")
    .map((segment) => segment.trim())
    .map((segment) => segment.replace(/::[\w\.]+/g, ""))
    .map((segment) => segment.replace(/"/g, ""));
};

const buildTableSummaries = () => {
  const minSummary = {};
  const fullSummary = {};

  for (const tableKey of publicTableKeys) {
    const table = tables[tableKey];
    const pkColumns = new Set(
      (table.constraints || [])
        .filter((c) => c.type === "PRIMARY KEY" && c.column)
        .map((c) => c.column)
    );

    const fkEntries = extractForeignKeys(tableKey, table);

    const columnsMin = table.columns.map((column) => ({
      name: column.name,
      type: formatType(tableKey, column),
      nullable: column.is_nullable === "YES",
      pk: pkColumns.has(column.name),
      fk: fkEntries.find((fk) => fk.column === column.name)?.references || null
    }));

    const columnsFull = table.columns.map((column) => ({
      name: column.name,
      type: formatType(tableKey, column),
      nullable: column.is_nullable === "YES",
      default: cleanDefault(column.default),
      pk: pkColumns.has(column.name),
      fk: fkEntries.find((fk) => fk.column === column.name)?.references || null,
      comment: shorten(column.comment, 200)
    }));

    const uniqueConstraints = (table.constraints || [])
      .filter((c) => c.type === "UNIQUE" && c.column)
      .map((c) => ({ name: c.name, column: c.column }));

    const checkConstraints = (table.constraints || [])
      .filter((c) => c.type === "CHECK")
      .map((c) => c.name);

    const indexEntries = Object.entries(indexes)
      .filter(([key]) => key.startsWith(`${tableKey}.`))
      .map(([_, idx]) => ({
        name: idx.name,
        unique: !!idx.is_unique,
        columns: parseIndexDefinition(idx.sql)
      }));

    minSummary[tableKey] = {
      summary: shorten(table.comment) || `Table ${table.name}`,
      columns: columnsMin
    };

    fullSummary[tableKey] = {
      summary: shorten(table.comment) || `Table ${table.name}`,
      columns: columnsFull,
      primaryKey: Array.from(pkColumns),
      foreignKeys: fkEntries,
      unique: uniqueConstraints,
      checks: checkConstraints,
      indexes: indexEntries
    };
  }

  return { minSummary, fullSummary };
};

const functionDescriptions = {
  "public.add_invoice_history_entry": {
    summary: "Append a structured row into invoice_history with metadata supplied by application logic.",
    details: {
      sideEffects: ["Inserts into public.invoice_history"],
      usedBy: ["Application services"],
      notes: "Returns void; callers manage transactional context."
    }
  },
  "public.calculate_payment_vat": {
    summary: "Before-insert/update trigger helper that derives VAT amount and net amount from provided totals.",
    details: {
      sideEffects: ["Mutates NEW rows for public.payments"],
      usedBy: ["Trigger public.payments.calculate_payment_vat_trigger"],
      notes: "Raises exception when totals and VAT fields are inconsistent (>1 kopeck deviation)."
    }
  },
  "public.cascade_delete_invoice": {
    summary: "Recursively delete invoice-related data (documents, history, payments) and return a JSON summary payload.",
    details: {
      sideEffects: ["Deletes across invoices, payments, invoice_documents, invoice_history"],
      usedBy: ["Invoice CRUD cascade delete"],
      notes: "Returns {success, deleted, invoice_ref}; ensure caller checks success." }
  },
  "public.fn_recalc_invoice_amounts": {
    summary: "Normalise invoice monetary fields before write, recalculating totals and VAT for consistency.",
    details: {
      sideEffects: ["Mutates NEW rows for public.invoices"],
      usedBy: ["Trigger public.invoices.trigger_recalc_invoice_amounts"],
      notes: "Guarantees amount_net + vat_amount equals total_amount." }
  },
  "public.fn_sync_invoice_payment": {
    summary: "Synchronise invoice balance after payment change and append a history entry.",
    details: {
      sideEffects: ["Updates public.invoices", "Inserts into public.invoice_history"],
      usedBy: ["Trigger public.payments.trg_sync_invoice_payment"],
      notes: "Calculates paid_amount and status from non-cancelled payments." }
  },
  "public.get_current_user_profile": {
    summary: "Return current auth user's profile row from public.users (SECURITY DEFINER).",
    details: {
      sideEffects: [],
      usedBy: ["Database RPCs"],
      notes: "Respects auth.uid() to fetch one row; rely on RLS for data isolation." }
  },
  "public.get_invoice_history": {
    summary: "Retrieve ordered invoice history entries with actor metadata for a given invoice.",
    details: {
      sideEffects: [],
      usedBy: ["History timelines"],
      notes: "RETURNS TABLE with action, status deltas and monetary amounts." }
  },
  "public.get_next_invoice_sequence": {
    summary: "Generate sequential internal invoice number using org/project/period segments.",
    details: {
      sideEffects: [],
      usedBy: ["Invoice number builders"],
      notes: "Returns integer to embed into formatted internal_number." }
  },
  "public.get_next_payment_sequence": {
    summary: "Produce next payment ordinal per invoice to support PAY-XX numbering.",
    details: {
      sideEffects: [],
      usedBy: ["Payment creation flows"],
      notes: "Counts existing payments excluding cancelled ones." }
  },
  "public.get_payment_history": {
    summary: "Return audit trail for a single payment including status changes and comments.",
    details: {
      sideEffects: [],
      usedBy: ["Payment history UI"],
      notes: "Aggregates entries produced by track_payment_history trigger." }
  },
  "public.get_payment_history_by_invoice": {
    summary: "Aggregate payment history entries for all payments within an invoice.",
    details: {
      sideEffects: [],
      usedBy: ["Invoice timeline"],
      notes: "Joined view of payment history grouped by payments." }
  },
  "public.get_statuses_by_entity_type": {
    summary: "Fetch status catalog entries for a particular entity type (invoice, payment, etc.).",
    details: {
      sideEffects: [],
      usedBy: ["Status pickers"],
      notes: "Orders by order_index and filters active statuses." }
  },
  "public.get_workflow_for_invoice": {
    summary: "Find active workflow id matching invoice type when launching approval.",
    details: {
      sideEffects: [],
      usedBy: ["Workflow bootstrap"],
      notes: "Returns NULL when no active workflow is configured." }
  },
  "public.handle_new_user": {
    summary: "Provision public.users profile when a new auth.users row appears.",
    details: {
      sideEffects: ["Inserts into public.users"],
      usedBy: ["Trigger auth.users.on_auth_user_created"],
      notes: "Pairs with set_default_user_role before insert." }
  },
  "public.is_status_final": {
    summary: "Check if a status code for an entity type is marked final (non-transitional).",
    details: {
      sideEffects: [],
      usedBy: ["Workflow decision rules"],
      notes: "Looks up public.statuses by entity_type/code." }
  },
  "public.set_default_user_role": {
    summary: "Assign default role_id and activation flags before inserting into public.users.",
    details: {
      sideEffects: ["Mutates NEW role_id, is_active"],
      usedBy: ["Trigger public.users.set_user_defaults_trigger"],
      notes: "Falls back to role with code 'user' when available." }
  },
  "public.start_payment_workflow_simple": {
    summary: "Create payment workflow instance and seed first stage progress in a single call.",
    details: {
      sideEffects: ["Inserts into public.payment_workflows", "Inserts into public.workflow_approval_progress"],
      usedBy: ["Payment approval start"],
      notes: "Returns payment workflow id for tracking." }
  },
  "public.track_document_changes": {
    summary: "Log invoice document attachments lifecycle into invoice_history.",
    details: {
      sideEffects: ["Writes to public.invoice_history"],
      usedBy: ["Trigger public.invoice_documents.track_document_changes_trigger"],
      notes: "Captures insert/delete operations with attachment data." }
  },
  "public.track_invoice_changes": {
    summary: "Record invoice field changes into invoice_history including before/after snapshots.",
    details: {
      sideEffects: ["Writes to public.invoice_history"],
      usedBy: ["Trigger public.invoices.invoice_history_trigger"],
      notes: "Builds JSON diff of changed columns." }
  },
  "public.track_invoice_changes_optimized": {
    summary: "Alternative change tracker focused on batch operations with lean payload.",
    details: {
      sideEffects: ["Writes to public.invoice_history"],
      usedBy: ["Manual utilities"],
      notes: "Use when full diff payload is not required." }
  },
  "public.track_payment_history": {
    summary: "Persist payment lifecycle events (status/comment changes) to invoice_history.",
    details: {
      sideEffects: ["Writes to public.invoice_history"],
      usedBy: ["Trigger public.payments.payment_history_trigger"],
      notes: "Stores previous and new status with actor info." }
  },
  "public.universal_update_updated_at": {
    summary: "Generic trigger that refreshes updated_at to NOW() on row change.",
    details: {
      sideEffects: ["Mutates NEW.updated_at"],
      usedBy: ["Multiple BEFORE UPDATE triggers"],
      notes: "Keep as BEFORE trigger to avoid double updates." }
  },
  "public.user_has_role": {
    summary: "Utility to check whether current auth uid has the specified role code.",
    details: {
      sideEffects: [],
      usedBy: ["Policies", "RPC validation"],
      notes: "Returns boolean, joining public.users and public.roles." }
  }
};

const buildFunctionSummaries = () => {
  const min = [];
  const full = [];

  for (const meta of Object.values(functionsData)) {
    if (meta.schema !== "public") continue;
    const nameKey = `${meta.schema}.${meta.name}`;
    const info = functionDescriptions[nameKey] || {
      summary: `Function ${nameKey}`,
      details: { sideEffects: [], usedBy: [], notes: "" }
    };
    const returnMatch = meta.sql.match(/RETURNS\s+([^\n]+)/i);
    const returns = returnMatch ? returnMatch[1].trim() : "";
    const signature = `${nameKey}(${meta.arguments || ""})`;

    min.push({
      name: nameKey,
      signature,
      returns,
      summary: info.summary
    });

    full.push({
      name: nameKey,
      signature,
      returns,
      summary: info.summary,
      sideEffects: info.details.sideEffects,
      usedBy: info.details.usedBy,
      notes: info.details.notes
    });
  }

  return { min, full };
};

const parseTriggerSql = (sql) => {
  if (!sql) return null;
  const pattern = /CREATE TRIGGER\s+(\w+)\s+(BEFORE|AFTER|INSTEAD OF)\s+([A-Z\sOR]+)\s+ON\s+([\w\.]+)\s+FOR EACH\s+(ROW|STATEMENT)\s+EXECUTE FUNCTION\s+([\w\.]+\([^)]*\))/i;
  const match = sql.match(pattern);
  if (!match) return null;
  return {
    name: match[1],
    timing: match[2].toUpperCase(),
    events: match[3].split(/\s+OR\s+/i).map((evt) => evt.trim().toUpperCase()),
    table: match[4],
    level: match[5].toUpperCase(),
    function: match[6]
  };
};

const buildTriggerSummary = () => {
  const grouped = {};
  for (const trigger of Object.values(triggers)) {
    if (trigger.schema !== "public") continue;
    const parsed = parseTriggerSql(trigger.sql);
    if (!parsed) continue;
    if (!grouped[parsed.table]) {
      grouped[parsed.table] = [];
    }
    grouped[parsed.table].push({
      name: parsed.name,
      timing: parsed.timing,
      events: parsed.events,
      level: parsed.level,
      function: parsed.function
    });
  }
  return grouped;
};

const buildEnumSummary = () => {
  const result = {};
  for (const [key, value] of Object.entries(enums)) {
    if (value.schema !== "public") continue;
    result[key] = {
      values: value.values,
      comment: shorten(value.comment)
    };
  }
  return result;
};

const formatJson = (data) => JSON.stringify(data, null, 2) + "\n";

const writeJson = (fileName, data) => {
  fs.writeFileSync(path.join(aiDir, fileName), formatJson(data), "utf8");
};

const examplesSql = `-- Seed basic directory values
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
`;

const { minSummary, fullSummary } = buildTableSummaries();
const { min: functionsMin, full: functionsFull } = buildFunctionSummaries();
const triggersSummary = buildTriggerSummary();
const enumsSummary = buildEnumSummary();

writeJson("ai_tables_min.json", minSummary);
writeJson("ai_tables_full.json", fullSummary);
writeJson("ai_relations.json", relations);
writeJson("ai_functions_min.json", functionsMin);
writeJson("ai_functions_full.json", functionsFull);
writeJson("ai_triggers_min.json", triggersSummary);
writeJson("ai_enums_min.json", enumsSummary);
fs.writeFileSync(path.join(aiDir, "ai_examples.sql"), examplesSql.trim() + "\n", "utf8");

const manifestSources = [
  path.join("supabase", "migrations", "prod.sql"),
  path.join("supabase", "exports", "tables.json"),
  path.join("supabase", "exports", "indexes.json"),
  path.join("supabase", "exports", "triggers.json"),
  path.join("supabase", "exports", "functions.json"),
  path.join("supabase", "exports", "enums.json")
];

const sourceFiles = {};
for (const relative of manifestSources) {
  const absolute = path.join(root, relative);
  const content = fs.readFileSync(absolute);
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  const stats = fs.statSync(absolute);
  sourceFiles[relative.replace(/\\/g, "/")] = {
    sha256: hash,
    bytes: stats.size
  };
}

const manifest = {
  generated_at: new Date().toISOString(),
  source_files: sourceFiles,
  tool: "scripts/generate-ai-context.mjs"
};

writeJson("ai_manifest.json", manifest);
