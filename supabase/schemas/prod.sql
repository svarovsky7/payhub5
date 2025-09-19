-- Database Schema SQL Export
-- Generated: 2025-09-19T07:58:22.795662
-- Database: postgres
-- Host: 31.128.51.210

-- ============================================
-- TABLES
-- ============================================

-- Table: _realtime.extensions
CREATE TABLE IF NOT EXISTS _realtime.extensions (
    id uuid NOT NULL,
    type text,
    settings jsonb,
    tenant_external_id text,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL
);

-- Table: _realtime.schema_migrations
-- Description: Auth: Manages updates to the auth system.
CREATE TABLE IF NOT EXISTS _realtime.schema_migrations (
    version bigint(64) NOT NULL,
    inserted_at timestamp without time zone
);
COMMENT ON TABLE _realtime.schema_migrations IS 'Auth: Manages updates to the auth system.';

-- Table: _realtime.tenants
CREATE TABLE IF NOT EXISTS _realtime.tenants (
    id uuid NOT NULL,
    name text,
    external_id text,
    jwt_secret text,
    max_concurrent_users integer(32) NOT NULL DEFAULT 200,
    inserted_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    max_events_per_second integer(32) NOT NULL DEFAULT 100,
    postgres_cdc_default text DEFAULT 'postgres_cdc_rls'::text,
    max_bytes_per_second integer(32) NOT NULL DEFAULT 100000,
    max_channels_per_client integer(32) NOT NULL DEFAULT 100,
    max_joins_per_second integer(32) NOT NULL DEFAULT 500,
    suspend boolean DEFAULT false,
    jwt_jwks jsonb,
    notify_private_alpha boolean DEFAULT false,
    private_only boolean NOT NULL DEFAULT false
);

-- Table: auth.audit_log_entries
-- Description: Auth: Audit trail for user actions.
CREATE TABLE IF NOT EXISTS auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) NOT NULL DEFAULT ''::character varying,
    CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';

-- Table: auth.flow_state
-- Description: stores metadata for pkce logins
CREATE TABLE IF NOT EXISTS auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method USER-DEFINED NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone,
    CONSTRAINT flow_state_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';

-- Table: auth.identities
-- Description: Auth: Stores identities associated to a user.
CREATE TABLE IF NOT EXISTS auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text,
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT identities_pkey PRIMARY KEY (id),
    CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider),
    CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id),
    CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';
COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';

-- Table: auth.instances
-- Description: Auth: Manages users across multiple sites.
CREATE TABLE IF NOT EXISTS auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT instances_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';

-- Table: auth.mfa_amr_claims
-- Description: auth: stores authenticator method reference claims for multi factor authentication
CREATE TABLE IF NOT EXISTS auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL,
    CONSTRAINT amr_id_pk PRIMARY KEY (id),
    CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (authentication_method),
    CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id),
    CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';

-- Table: auth.mfa_challenges
-- Description: auth: stores metadata about challenge requests made
CREATE TABLE IF NOT EXISTS auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb,
    CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES None.None(None),
    CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';

-- Table: auth.mfa_factors
-- Description: auth: stores metadata about factors
CREATE TABLE IF NOT EXISTS auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type USER-DEFINED NOT NULL,
    status USER-DEFINED NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid,
    CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at),
    CONSTRAINT mfa_factors_pkey PRIMARY KEY (id),
    CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';

-- Table: auth.one_time_tokens
CREATE TABLE IF NOT EXISTS auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type USER-DEFINED NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);

-- Table: auth.refresh_tokens
-- Description: Auth: Store of tokens used to refresh JWT tokens once they expire.
CREATE TABLE IF NOT EXISTS auth.refresh_tokens (
    instance_id uuid,
    id bigint(64) NOT NULL DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass),
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid,
    CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id),
    CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES None.None(None),
    CONSTRAINT refresh_tokens_token_unique UNIQUE (token)
);
COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';

-- Table: auth.saml_providers
-- Description: Auth: Manages SAML Identity Provider connections.
CREATE TABLE IF NOT EXISTS auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id),
    CONSTRAINT saml_providers_pkey PRIMARY KEY (id),
    CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';

-- Table: auth.saml_relay_states
-- Description: Auth: Contains SAML Relay State information for each Service Provider initiated login.
CREATE TABLE IF NOT EXISTS auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES None.None(None),
    CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id),
    CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';

-- Table: auth.schema_migrations
-- Description: Auth: Manages updates to the auth system.
CREATE TABLE IF NOT EXISTS auth.schema_migrations (
    version character varying(255) NOT NULL,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';

-- Table: auth.sessions
-- Description: Auth: Stores session data associated to a user.
CREATE TABLE IF NOT EXISTS auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal USER-DEFINED,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text,
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';
COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';

-- Table: auth.sso_domains
-- Description: Auth: Manages SSO email address domain mapping to an SSO Identity Provider.
CREATE TABLE IF NOT EXISTS auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT sso_domains_pkey PRIMARY KEY (id),
    CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES None.None(None)
);
COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';

-- Table: auth.sso_providers
-- Description: Auth: Manages SSO identity provider information; see saml_providers for SAML.
CREATE TABLE IF NOT EXISTS auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT sso_providers_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';
COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';

-- Table: auth.users
-- Description: Auth: Stores user login data within a secure schema.
CREATE TABLE IF NOT EXISTS auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint(16) DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean NOT NULL DEFAULT false,
    deleted_at timestamp with time zone,
    is_anonymous boolean NOT NULL DEFAULT false,
    CONSTRAINT users_phone_key UNIQUE (phone),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';
COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';

-- Table: public.attachments
-- Description: File attachments storage metadata
CREATE TABLE IF NOT EXISTS public.attachments (
    id integer(32) NOT NULL DEFAULT nextval('attachments_id_seq'::regclass),
    original_name character varying(255) NOT NULL,
    storage_path character varying(500) NOT NULL,
    size_bytes integer(32) NOT NULL,
    mime_type character varying(100) NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT attachments_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.attachments IS 'File attachments storage metadata';

-- Table: public.contractor_types
-- Description: Types of contractors (suppliers, clients, etc.)
CREATE TABLE IF NOT EXISTS public.contractor_types (
    id integer(32) NOT NULL DEFAULT nextval('contractor_types_id_seq'::regclass),
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT contractor_types_code_key UNIQUE (code),
    CONSTRAINT contractor_types_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.contractor_types IS 'Types of contractors (suppliers, clients, etc.)';

-- Table: public.contractors
-- Description: Contractors (suppliers and payers) information
CREATE TABLE IF NOT EXISTS public.contractors (
    id integer(32) NOT NULL DEFAULT nextval('contractors_id_seq'::regclass),
    name character varying(255) NOT NULL,
    inn character varying(12),
    type_id integer(32),
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    contractor_search tsvector,
    supplier_code character varying(10),
    CONSTRAINT contractors_pkey PRIMARY KEY (id),
    CONSTRAINT contractors_type_id_fkey FOREIGN KEY (type_id) REFERENCES None.None(None)
);
COMMENT ON TABLE public.contractors IS 'Contractors (suppliers and payers) information';
COMMENT ON COLUMN public.contractors.supplier_code IS 'Уникальный код поставщика (3 буквы + 4 цифры ИНН)';

-- Table: public.invoice_documents
-- Description: Таблица связи документов со счетами. РАЗРЕШЕНО множество документов на один счет!
CREATE TABLE IF NOT EXISTS public.invoice_documents (
    id integer(32) NOT NULL DEFAULT nextval('invoice_documents_id_seq'::regclass),
    invoice_id integer(32),
    attachment_id integer(32),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoice_documents_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES None.None(None),
    CONSTRAINT invoice_documents_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES None.None(None),
    CONSTRAINT invoice_documents_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.invoice_documents IS 'Таблица связи документов со счетами. РАЗРЕШЕНО множество документов на один счет!';

-- Table: public.invoice_history
-- Description: История всех изменений счетов, платежей и связанных документов
CREATE TABLE IF NOT EXISTS public.invoice_history (
    id bigint(64) NOT NULL DEFAULT nextval('invoice_history_id_seq'::regclass),
    invoice_id integer(32),
    event_type character varying(50) NOT NULL,
    event_date timestamp with time zone NOT NULL DEFAULT now(),
    action character varying(100) NOT NULL,
    description text,
    payment_id integer(32),
    document_id integer(32),
    attachment_id integer(32),
    status_from character varying(50),
    status_to character varying(50),
    amount_from numeric(15,2),
    amount_to numeric(15,2),
    changed_fields jsonb,
    old_values jsonb,
    new_values jsonb,
    user_id uuid,
    user_name character varying(255),
    user_role character varying(100),
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now(),
    currency character varying(10) DEFAULT 'RUB'::character varying,
    CONSTRAINT invoice_history_attachment_id_fkey FOREIGN KEY (attachment_id) REFERENCES None.None(None),
    CONSTRAINT invoice_history_document_id_fkey FOREIGN KEY (document_id) REFERENCES None.None(None),
    CONSTRAINT invoice_history_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES None.None(None),
    CONSTRAINT invoice_history_pkey PRIMARY KEY (id),
    CONSTRAINT invoice_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);
COMMENT ON TABLE public.invoice_history IS 'История всех изменений счетов, платежей и связанных документов';
COMMENT ON COLUMN public.invoice_history.event_type IS 'Тип события: INVOICE_CREATED, INVOICE_UPDATED, STATUS_CHANGED, PAYMENT_CREATED, etc.';
COMMENT ON COLUMN public.invoice_history.action IS 'Человекочитаемое описание действия';
COMMENT ON COLUMN public.invoice_history.changed_fields IS 'JSON объект с полями, которые были изменены';
COMMENT ON COLUMN public.invoice_history.old_values IS 'Старые значения измененных полей';
COMMENT ON COLUMN public.invoice_history.new_values IS 'Новые значения измененных полей';
COMMENT ON COLUMN public.invoice_history.metadata IS 'Дополнительные данные события в формате JSON';

-- Table: public.invoice_types
-- Description: Types of invoices (goods, works, rent, utilities)
CREATE TABLE IF NOT EXISTS public.invoice_types (
    id integer(32) NOT NULL DEFAULT nextval('invoice_types_id_seq'::regclass),
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT invoice_types_code_key UNIQUE (code),
    CONSTRAINT invoice_types_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.invoice_types IS 'Types of invoices (goods, works, rent, utilities)';

-- Table: public.invoices
-- Description: Invoices table - estimated_delivery_date field removed, delivery calculations now done in application layer
CREATE TABLE IF NOT EXISTS public.invoices (
    id integer(32) NOT NULL DEFAULT nextval('invoices_id_seq'::regclass),
    invoice_number character varying(100) NOT NULL,
    invoice_date date NOT NULL,
    project_id integer(32),
    type_id integer(32) NOT NULL,
    supplier_id integer(32) NOT NULL,
    payer_id integer(32) NOT NULL,
    amount_net numeric(15,2) NOT NULL,
    vat_rate numeric(5,2) NOT NULL,
    vat_amount numeric(15,2) NOT NULL DEFAULT 0,
    total_amount numeric(15,2) NOT NULL DEFAULT 0,
    paid_amount numeric(15,2) NOT NULL DEFAULT 0,
    description text,
    priority USER-DEFINED NOT NULL DEFAULT 'normal'::priority_level,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status character varying(50) NOT NULL DEFAULT 'draft'::character varying,
    delivery_days integer(32),
    material_responsible_person_id integer(32),
    internal_number character varying(50),
    delivery_days_type character varying(20) DEFAULT 'calendar'::character varying,
    paid_at timestamp with time zone,
    CONSTRAINT invoices_material_responsible_person_id_fkey FOREIGN KEY (material_responsible_person_id) REFERENCES None.None(None),
    CONSTRAINT invoices_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES None.None(None),
    CONSTRAINT invoices_pkey PRIMARY KEY (id),
    CONSTRAINT invoices_project_id_fkey FOREIGN KEY (project_id) REFERENCES None.None(None),
    CONSTRAINT invoices_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES None.None(None),
    CONSTRAINT invoices_type_id_fkey FOREIGN KEY (type_id) REFERENCES None.None(None)
);
COMMENT ON TABLE public.invoices IS 'Invoices table - estimated_delivery_date field removed, delivery calculations now done in application layer';
COMMENT ON COLUMN public.invoices.amount_net IS 'Invoice amount excluding VAT';
COMMENT ON COLUMN public.invoices.vat_rate IS 'VAT rate as percentage (0, 5, 7, 10, or 20)';
COMMENT ON COLUMN public.invoices.vat_amount IS 'Calculated VAT amount';
COMMENT ON COLUMN public.invoices.total_amount IS 'Total amount including VAT';
COMMENT ON COLUMN public.invoices.paid_amount IS 'Total amount paid so far';
COMMENT ON COLUMN public.invoices.status IS 'Invoice status (migrated from enum to VARCHAR)';
COMMENT ON COLUMN public.invoices.delivery_days IS 'Количество дней до поставки после оплаты (календарные или рабочие в зависимости от delivery_days_type)';
COMMENT ON COLUMN public.invoices.material_responsible_person_id IS 'МОЛ на которого придет материал';
COMMENT ON COLUMN public.invoices.internal_number IS 'Внутренний номер счета (автоматически генерируется). Формат: ORG-PROJ-VEND-TYPE-YYMM-SEQ';
COMMENT ON COLUMN public.invoices.delivery_days_type IS 'Тип дней для доставки: calendar - календарные, working - рабочие';
COMMENT ON COLUMN public.invoices.paid_at IS 'Timestamp when the invoice was fully paid';

-- Table: public.material_responsible_persons
-- Description: Материально ответственные лица (МОЛ) - сотрудники, на которых приходят материалы
CREATE TABLE IF NOT EXISTS public.material_responsible_persons (
    id integer(32) NOT NULL DEFAULT nextval('material_responsible_persons_id_seq'::regclass),
    full_name character varying(255) NOT NULL,
    phone character varying(50),
    position character varying(255),
    email character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT material_responsible_persons_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.material_responsible_persons IS 'Материально ответственные лица (МОЛ) - сотрудники, на которых приходят материалы';
COMMENT ON COLUMN public.material_responsible_persons.full_name IS 'ФИО сотрудника';
COMMENT ON COLUMN public.material_responsible_persons.phone IS 'Телефон сотрудника';
COMMENT ON COLUMN public.material_responsible_persons.position IS 'Должность сотрудника';
COMMENT ON COLUMN public.material_responsible_persons.email IS 'Email сотрудника';
COMMENT ON COLUMN public.material_responsible_persons.is_active IS 'Активен ли МОЛ (доступен для выбора)';
COMMENT ON COLUMN public.material_responsible_persons.created_at IS 'Дата и время создания записи';
COMMENT ON COLUMN public.material_responsible_persons.updated_at IS 'Дата и время последнего обновления';
COMMENT ON COLUMN public.material_responsible_persons.created_by IS 'ID пользователя, создавшего запись';

-- Table: public.payment_workflows
CREATE TABLE IF NOT EXISTS public.payment_workflows (
    id integer(32) NOT NULL DEFAULT nextval('payment_workflows_id_seq'::regclass),
    payment_id integer(32) NOT NULL,
    invoice_id integer(32),
    workflow_id integer(32) NOT NULL,
    current_stage_id integer(32),
    current_stage_position integer(32) DEFAULT 1,
    status character varying(50) DEFAULT 'pending'::character varying,
    amount numeric(15,2) NOT NULL,
    description text,
    contractor_id integer(32),
    project_id integer(32),
    payment_date date,
    stages_total integer(32) NOT NULL DEFAULT 0,
    stages_completed integer(32) DEFAULT 0,
    approval_progress jsonb,
    started_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    started_by uuid,
    completed_at timestamp with time zone,
    completed_by uuid,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    cancelled_reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT payment_workflows_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES None.None(None),
    CONSTRAINT payment_workflows_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES None.None(None),
    CONSTRAINT payment_workflows_payment_id_key UNIQUE (payment_id),
    CONSTRAINT payment_workflows_pkey PRIMARY KEY (id)
);

-- Table: public.payments
-- Description: Платежи по счетам
CREATE TABLE IF NOT EXISTS public.payments (
    id integer(32) NOT NULL DEFAULT nextval('payments_id_seq'::regclass),
    invoice_id integer(32) NOT NULL,
    payment_date date NOT NULL,
    payer_id integer(32) NOT NULL,
    comment text,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    status character varying(50) NOT NULL DEFAULT 'pending'::character varying,
    type_id integer(32),
    internal_number character varying(80),
    vat_amount numeric(15,2),
    vat_rate numeric(5,2) DEFAULT 20,
    total_amount numeric(15,2) NOT NULL,
    amount_net numeric(15,2),
    CONSTRAINT payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES None.None(None),
    CONSTRAINT payments_payer_id_fkey FOREIGN KEY (payer_id) REFERENCES None.None(None),
    CONSTRAINT payments_pkey PRIMARY KEY (id),
    CONSTRAINT payments_type_id_fkey FOREIGN KEY (type_id) REFERENCES None.None(None)
);
COMMENT ON TABLE public.payments IS 'Платежи по счетам';
COMMENT ON COLUMN public.payments.id IS 'Уникальный идентификатор платежа';
COMMENT ON COLUMN public.payments.invoice_id IS 'ID связанного счета';
COMMENT ON COLUMN public.payments.payment_date IS 'Дата платежа';
COMMENT ON COLUMN public.payments.payer_id IS 'ID плательщика (contractor)';
COMMENT ON COLUMN public.payments.comment IS 'Комментарий к платежу';
COMMENT ON COLUMN public.payments.created_by IS 'ID пользователя, создавшего платеж';
COMMENT ON COLUMN public.payments.created_at IS 'Дата и время создания платежа';
COMMENT ON COLUMN public.payments.updated_at IS 'Дата и время последнего обновления';
COMMENT ON COLUMN public.payments.status IS 'Статус платежа';
COMMENT ON COLUMN public.payments.type_id IS 'Тип счета, унаследованный от связанного счета';
COMMENT ON COLUMN public.payments.internal_number IS 'Внутренний номер платежа (автоматически генерируется)';
COMMENT ON COLUMN public.payments.vat_amount IS 'Сумма НДС';
COMMENT ON COLUMN public.payments.vat_rate IS 'Ставка НДС в процентах';
COMMENT ON COLUMN public.payments.total_amount IS 'Общая сумма платежа с НДС';
COMMENT ON COLUMN public.payments.amount_net IS 'Сумма платежа без НДС';

-- Table: public.projects
-- Description: Project records - simplified without company isolation
CREATE TABLE IF NOT EXISTS public.projects (
    id integer(32) NOT NULL DEFAULT nextval('projects_id_seq'::regclass),
    name character varying(255) NOT NULL,
    address text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_code character varying(4),
    CONSTRAINT projects_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.projects IS 'Project records - simplified without company isolation';
COMMENT ON COLUMN public.projects.project_code IS 'Уникальный код проекта (3-4 латинские буквы)';

-- Table: public.roles
-- Description: User roles - simplified without permissions, hierarchy, or company isolation
CREATE TABLE IF NOT EXISTS public.roles (
    id integer(32) NOT NULL DEFAULT nextval('roles_id_seq'::regclass),
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    view_own_project_only boolean DEFAULT false,
    CONSTRAINT roles_code_key UNIQUE (code),
    CONSTRAINT roles_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.roles IS 'User roles - simplified without permissions, hierarchy, or company isolation';
COMMENT ON COLUMN public.roles.code IS 'Unique role identifier code';
COMMENT ON COLUMN public.roles.name IS 'Display name of the role';
COMMENT ON COLUMN public.roles.description IS 'Optional role description';
COMMENT ON COLUMN public.roles.is_active IS 'Whether the role is active';
COMMENT ON COLUMN public.roles.view_own_project_only IS 'If true, users with this role can only see projects specified in their project_ids field';

-- Table: public.statuses
-- Description: Справочник статусов для счетов и платежей
CREATE TABLE IF NOT EXISTS public.statuses (
    id bigint(64) NOT NULL DEFAULT nextval('statuses_id_seq'::regclass),
    entity_type text NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    color text DEFAULT 'default'::text,
    is_final boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    order_index integer(32) NOT NULL DEFAULT 0,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT statuses_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.statuses IS 'Справочник статусов для счетов и платежей';
COMMENT ON COLUMN public.statuses.entity_type IS 'Тип сущности: invoice или payment';
COMMENT ON COLUMN public.statuses.code IS 'Уникальный код статуса в рамках типа сущности';
COMMENT ON COLUMN public.statuses.name IS 'Отображаемое название статуса';
COMMENT ON COLUMN public.statuses.color IS 'Цвет для отображения в UI (Ant Design tag colors)';
COMMENT ON COLUMN public.statuses.is_final IS 'Финальный статус (не может быть изменен)';
COMMENT ON COLUMN public.statuses.is_active IS 'Активен ли статус для использования';
COMMENT ON COLUMN public.statuses.order_index IS 'Порядок сортировки в списках';

-- Table: public.themes
-- Description: Theme configurations for PayHub application
CREATE TABLE IF NOT EXISTS public.themes (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name character varying(100) NOT NULL,
    description text,
    config jsonb NOT NULL,
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    is_global boolean DEFAULT false,
    user_id uuid,
    shared_with_roles ARRAY,
    version integer(32) DEFAULT 1,
    parent_theme_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    CONSTRAINT themes_created_by_fkey FOREIGN KEY (created_by) REFERENCES None.None(None),
    CONSTRAINT themes_parent_theme_id_fkey FOREIGN KEY (parent_theme_id) REFERENCES None.None(None),
    CONSTRAINT themes_pkey PRIMARY KEY (id),
    CONSTRAINT themes_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES None.None(None),
    CONSTRAINT themes_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);
COMMENT ON TABLE public.themes IS 'Theme configurations for PayHub application';
COMMENT ON COLUMN public.themes.id IS 'Primary key for theme';
COMMENT ON COLUMN public.themes.name IS 'Human readable name for the theme';
COMMENT ON COLUMN public.themes.description IS 'Optional description of the theme';
COMMENT ON COLUMN public.themes.config IS 'JSON configuration for theme colors, typography, layout etc.';
COMMENT ON COLUMN public.themes.is_default IS 'Whether this is the default theme for the user or globally';
COMMENT ON COLUMN public.themes.is_active IS 'Whether this theme is active (soft delete flag)';
COMMENT ON COLUMN public.themes.is_global IS 'Whether this theme is available to all users';
COMMENT ON COLUMN public.themes.user_id IS 'User who owns this theme (NULL for system themes)';
COMMENT ON COLUMN public.themes.shared_with_roles IS 'Array of role IDs that can use this theme';
COMMENT ON COLUMN public.themes.version IS 'Version number for theme (for future versioning support)';
COMMENT ON COLUMN public.themes.parent_theme_id IS 'Parent theme if this is derived from another theme';

-- Table: public.users
-- Description: Auth: Stores user login data within a secure schema.
CREATE TABLE IF NOT EXISTS public.users (
    id uuid NOT NULL,
    email character varying(255) NOT NULL,
    full_name character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    role_id integer(32),
    project_ids ARRAY,
    CONSTRAINT users_email_key UNIQUE (email),
    CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES None.None(None),
    CONSTRAINT users_pkey PRIMARY KEY (id),
    CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES None.None(None)
);
COMMENT ON TABLE public.users IS 'Auth: Stores user login data within a secure schema.';

-- Table: public.workflow_approval_progress
-- Description: История всех действий по согласованию платежей
CREATE TABLE IF NOT EXISTS public.workflow_approval_progress (
    id integer(32) NOT NULL DEFAULT nextval('workflow_approval_progress_id_seq'::regclass),
    workflow_id integer(32) NOT NULL,
    stage_id integer(32),
    stage_name character varying(255),
    action character varying(50) NOT NULL,
    user_id uuid,
    user_name character varying(255),
    comment text,
    reason text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT workflow_approval_progress_pkey PRIMARY KEY (id),
    CONSTRAINT workflow_approval_progress_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES None.None(None),
    CONSTRAINT workflow_approval_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES None.None(None)
);
COMMENT ON TABLE public.workflow_approval_progress IS 'История всех действий по согласованию платежей';
COMMENT ON COLUMN public.workflow_approval_progress.workflow_id IS 'ID процесса согласования';
COMMENT ON COLUMN public.workflow_approval_progress.stage_id IS 'ID этапа согласования';
COMMENT ON COLUMN public.workflow_approval_progress.stage_name IS 'Название этапа согласования';
COMMENT ON COLUMN public.workflow_approval_progress.action IS 'Действие: approved, rejected, cancelled, started';
COMMENT ON COLUMN public.workflow_approval_progress.user_id IS 'ID пользователя, выполнившего действие';
COMMENT ON COLUMN public.workflow_approval_progress.user_name IS 'Имя пользователя на момент действия';
COMMENT ON COLUMN public.workflow_approval_progress.comment IS 'Комментарий при одобрении';
COMMENT ON COLUMN public.workflow_approval_progress.reason IS 'Причина при отклонении или отмене';

-- Table: public.workflow_stages
CREATE TABLE IF NOT EXISTS public.workflow_stages (
    id integer(32) NOT NULL DEFAULT nextval('workflow_stages_id_seq'::regclass),
    workflow_id integer(32) NOT NULL,
    position integer(32) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    stage_type character varying(50) NOT NULL DEFAULT 'approval'::character varying,
    assigned_roles ARRAY DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    timeout_days integer(32) DEFAULT 3,
    CONSTRAINT workflow_stages_pkey PRIMARY KEY (id),
    CONSTRAINT workflow_stages_workflow_id_fkey FOREIGN KEY (workflow_id) REFERENCES None.None(None)
);
COMMENT ON COLUMN public.workflow_stages.description IS 'Описание этапа согласования';
COMMENT ON COLUMN public.workflow_stages.assigned_roles IS 'Массив ID ролей, назначенных на этот этап';

-- Table: public.workflows
-- Description: Workflow configurations - simplified without company isolation
CREATE TABLE IF NOT EXISTS public.workflows (
    id integer(32) NOT NULL DEFAULT nextval('workflows_id_seq'::regclass),
    name character varying(255) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    invoice_type_ids ARRAY DEFAULT '{}'::integer[],
    CONSTRAINT workflows_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE public.workflows IS 'Workflow configurations - simplified without company isolation';
COMMENT ON COLUMN public.workflows.invoice_type_ids IS 'Массив ID типов заявок из таблицы invoice_types';

-- Table: realtime.messages
CREATE TABLE IF NOT EXISTS realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone NOT NULL DEFAULT now(),
    inserted_at timestamp without time zone NOT NULL DEFAULT now(),
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    CONSTRAINT messages_pkey PRIMARY KEY (id),
    CONSTRAINT messages_pkey PRIMARY KEY (inserted_at)
);

-- Table: realtime.schema_migrations
-- Description: Auth: Manages updates to the auth system.
CREATE TABLE IF NOT EXISTS realtime.schema_migrations (
    version bigint(64) NOT NULL,
    inserted_at timestamp without time zone,
    CONSTRAINT schema_migrations_pkey PRIMARY KEY (version)
);
COMMENT ON TABLE realtime.schema_migrations IS 'Auth: Manages updates to the auth system.';

-- Table: realtime.subscription
CREATE TABLE IF NOT EXISTS realtime.subscription (
    id bigint(64) NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters ARRAY NOT NULL DEFAULT '{}'::realtime.user_defined_filter[],
    claims jsonb NOT NULL,
    claims_role regrole NOT NULL,
    created_at timestamp without time zone NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT pk_subscription PRIMARY KEY (id)
);

-- Table: storage.buckets
-- Description: Таблица buckets для организации файлов
CREATE TABLE IF NOT EXISTS storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint(64),
    allowed_mime_types ARRAY,
    owner_id text,
    type USER-DEFINED NOT NULL DEFAULT 'STANDARD'::storage.buckettype,
    CONSTRAINT buckets_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE storage.buckets IS 'Таблица buckets для организации файлов';
COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';

-- Table: storage.buckets_analytics
CREATE TABLE IF NOT EXISTS storage.buckets_analytics (
    id text NOT NULL,
    type USER-DEFINED NOT NULL DEFAULT 'ANALYTICS'::storage.buckettype,
    format text NOT NULL DEFAULT 'ICEBERG'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT buckets_analytics_pkey PRIMARY KEY (id)
);

-- Table: storage.iceberg_namespaces
CREATE TABLE IF NOT EXISTS storage.iceberg_namespaces (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bucket_id text NOT NULL,
    name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT iceberg_namespaces_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT iceberg_namespaces_pkey PRIMARY KEY (id)
);

-- Table: storage.iceberg_tables
CREATE TABLE IF NOT EXISTS storage.iceberg_tables (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    namespace_id uuid NOT NULL,
    bucket_id text NOT NULL,
    name text NOT NULL,
    location text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT iceberg_tables_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT iceberg_tables_namespace_id_fkey FOREIGN KEY (namespace_id) REFERENCES None.None(None),
    CONSTRAINT iceberg_tables_pkey PRIMARY KEY (id)
);

-- Table: storage.migrations
CREATE TABLE IF NOT EXISTS storage.migrations (
    id integer(32) NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT migrations_name_key UNIQUE (name),
    CONSTRAINT migrations_pkey PRIMARY KEY (id)
);

-- Table: storage.objects
-- Description: Таблица объектов (файлов) в Storage
CREATE TABLE IF NOT EXISTS storage.objects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens ARRAY,
    version text,
    owner_id text,
    user_metadata jsonb,
    level integer(32),
    CONSTRAINT objects_bucketId_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT objects_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE storage.objects IS 'Таблица объектов (файлов) в Storage';
COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';

-- Table: storage.prefixes
CREATE TABLE IF NOT EXISTS storage.prefixes (
    bucket_id text NOT NULL,
    name text NOT NULL,
    level integer(32) NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT prefixes_bucketId_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT prefixes_pkey PRIMARY KEY (bucket_id),
    CONSTRAINT prefixes_pkey PRIMARY KEY (level),
    CONSTRAINT prefixes_pkey PRIMARY KEY (name)
);

-- Table: storage.s3_multipart_uploads
CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint(64) NOT NULL DEFAULT 0,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL,
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_metadata jsonb,
    CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id)
);

-- Table: storage.s3_multipart_uploads_parts
CREATE TABLE IF NOT EXISTS storage.s3_multipart_uploads_parts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    upload_id text NOT NULL,
    size bigint(64) NOT NULL DEFAULT 0,
    part_number integer(32) NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL,
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES None.None(None),
    CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id),
    CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES None.None(None)
);

-- Table: supabase_functions.hooks
-- Description: Supabase Functions Hooks: Audit trail for triggered hooks.
CREATE TABLE IF NOT EXISTS supabase_functions.hooks (
    id bigint(64) NOT NULL DEFAULT nextval('supabase_functions.hooks_id_seq'::regclass),
    hook_table_id integer(32) NOT NULL,
    hook_name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    request_id bigint(64),
    CONSTRAINT hooks_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE supabase_functions.hooks IS 'Supabase Functions Hooks: Audit trail for triggered hooks.';

-- Table: supabase_functions.migrations
CREATE TABLE IF NOT EXISTS supabase_functions.migrations (
    version text NOT NULL,
    inserted_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT migrations_pkey PRIMARY KEY (version)
);

-- Table: vault.secrets
-- Description: Table with encrypted `secret` column for storing sensitive information on disk.
CREATE TABLE IF NOT EXISTS vault.secrets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text,
    description text NOT NULL DEFAULT ''::text,
    secret text NOT NULL,
    key_id uuid,
    nonce bytea DEFAULT vault._crypto_aead_det_noncegen(),
    created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT secrets_pkey PRIMARY KEY (id)
);
COMMENT ON TABLE vault.secrets IS 'Table with encrypted `secret` column for storing sensitive information on disk.';


-- ============================================
-- ENUM TYPES
-- ============================================

CREATE TYPE auth.aal_level AS ENUM ('aal1', 'aal2', 'aal3');

CREATE TYPE auth.code_challenge_method AS ENUM ('s256', 'plain');

CREATE TYPE auth.factor_status AS ENUM ('unverified', 'verified');

CREATE TYPE auth.factor_type AS ENUM ('totp', 'webauthn', 'phone');

CREATE TYPE auth.one_time_token_type AS ENUM ('confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token');

CREATE TYPE public.priority_level AS ENUM ('low', 'normal', 'high', 'urgent');
COMMENT ON TYPE public.priority_level IS 'Priority levels for invoices';

CREATE TYPE realtime.action AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'ERROR');

CREATE TYPE realtime.equality_op AS ENUM ('eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'in');

CREATE TYPE storage.buckettype AS ENUM ('STANDARD', 'ANALYTICS');


-- ============================================
-- VIEWS
-- ============================================

-- View: vault.decrypted_secrets
CREATE OR REPLACE VIEW vault.decrypted_secrets AS
 SELECT s.id,
    s.name,
    s.description,
    s.secret,
    convert_from(vault._crypto_aead_det_decrypt(message => decode(s.secret, 'base64'::text), additional => convert_to((s.id)::text, 'utf8'::name), key_id => (0)::bigint, context => '\x7067736f6469756d'::bytea, nonce => s.nonce), 'utf8'::name) AS decrypted_secret,
    s.key_id,
    s.nonce,
    s.created_at,
    s.updated_at
   FROM vault.secrets s;


-- ============================================
-- FUNCTIONS
-- ============================================

-- Function: auth.email
-- Description: Deprecated. Use auth.jwt() -> 'email' instead.
CREATE OR REPLACE FUNCTION auth.email()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$function$


-- Function: auth.jwt
CREATE OR REPLACE FUNCTION auth.jwt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$function$


-- Function: auth.role
-- Description: Deprecated. Use auth.jwt() -> 'role' instead.
CREATE OR REPLACE FUNCTION auth.role()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$function$


-- Function: auth.uid
-- Description: Deprecated. Use auth.jwt() -> 'sub' instead.
CREATE OR REPLACE FUNCTION auth.uid()
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Return current user ID from context or default for testing
    RETURN COALESCE(
        current_setting('app.current_user_id', true)::UUID,
        (SELECT id FROM users LIMIT 1)
    );
END;
$function$


-- Function: extensions.algorithm_sign
CREATE OR REPLACE FUNCTION extensions.algorithm_sign(signables text, secret text, algorithm text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
WITH
  alg AS (
    SELECT CASE
      WHEN algorithm = 'HS256' THEN 'sha256'
      WHEN algorithm = 'HS384' THEN 'sha384'
      WHEN algorithm = 'HS512' THEN 'sha512'
      ELSE '' END AS id)  -- hmac throws error
SELECT extensions.url_encode(extensions.hmac(signables, secret, alg.id)) FROM alg;
$function$


-- Function: extensions.armor
CREATE OR REPLACE FUNCTION extensions.armor(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$


-- Function: extensions.armor
CREATE OR REPLACE FUNCTION extensions.armor(bytea, text[], text[])
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_armor$function$


-- Function: extensions.crypt
CREATE OR REPLACE FUNCTION extensions.crypt(text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_crypt$function$


-- Function: extensions.dearmor
CREATE OR REPLACE FUNCTION extensions.dearmor(text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_dearmor$function$


-- Function: extensions.decrypt
CREATE OR REPLACE FUNCTION extensions.decrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt$function$


-- Function: extensions.decrypt_iv
CREATE OR REPLACE FUNCTION extensions.decrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_decrypt_iv$function$


-- Function: extensions.digest
CREATE OR REPLACE FUNCTION extensions.digest(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$


-- Function: extensions.digest
CREATE OR REPLACE FUNCTION extensions.digest(text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_digest$function$


-- Function: extensions.encrypt
CREATE OR REPLACE FUNCTION extensions.encrypt(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt$function$


-- Function: extensions.encrypt_iv
CREATE OR REPLACE FUNCTION extensions.encrypt_iv(bytea, bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_encrypt_iv$function$


-- Function: extensions.gen_random_bytes
CREATE OR REPLACE FUNCTION extensions.gen_random_bytes(integer)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_random_bytes$function$


-- Function: extensions.gen_random_uuid
CREATE OR REPLACE FUNCTION extensions.gen_random_uuid()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE
AS '$libdir/pgcrypto', $function$pg_random_uuid$function$


-- Function: extensions.gen_salt
CREATE OR REPLACE FUNCTION extensions.gen_salt(text)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt$function$


-- Function: extensions.gen_salt
CREATE OR REPLACE FUNCTION extensions.gen_salt(text, integer)
 RETURNS text
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_gen_salt_rounds$function$


-- Function: extensions.grant_pg_cron_access
-- Description: Grants access to pg_cron
CREATE OR REPLACE FUNCTION extensions.grant_pg_cron_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$function$


-- Function: extensions.grant_pg_graphql_access
-- Description: Grants access to pg_graphql
CREATE OR REPLACE FUNCTION extensions.grant_pg_graphql_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$function$


-- Function: extensions.grant_pg_net_access
-- Description: Grants access to pg_net
CREATE OR REPLACE FUNCTION extensions.grant_pg_net_access()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$function$


-- Function: extensions.hmac
CREATE OR REPLACE FUNCTION extensions.hmac(text, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$


-- Function: extensions.hmac
CREATE OR REPLACE FUNCTION extensions.hmac(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pg_hmac$function$


-- Function: extensions.pgp_armor_headers
CREATE OR REPLACE FUNCTION extensions.pgp_armor_headers(text, OUT key text, OUT value text)
 RETURNS SETOF record
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_armor_headers$function$


-- Function: extensions.pgp_key_id
CREATE OR REPLACE FUNCTION extensions.pgp_key_id(bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_key_id_w$function$


-- Function: extensions.pgp_pub_decrypt
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$


-- Function: extensions.pgp_pub_decrypt
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$


-- Function: extensions.pgp_pub_decrypt
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt(bytea, bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_text$function$


-- Function: extensions.pgp_pub_decrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$


-- Function: extensions.pgp_pub_decrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$


-- Function: extensions.pgp_pub_decrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_pub_decrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_decrypt_bytea$function$


-- Function: extensions.pgp_pub_encrypt
CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$


-- Function: extensions.pgp_pub_encrypt
CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt(text, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_text$function$


-- Function: extensions.pgp_pub_encrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$


-- Function: extensions.pgp_pub_encrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_pub_encrypt_bytea(bytea, bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_pub_encrypt_bytea$function$


-- Function: extensions.pgp_sym_decrypt
CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$


-- Function: extensions.pgp_sym_decrypt
CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt(bytea, text)
 RETURNS text
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_text$function$


-- Function: extensions.pgp_sym_decrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$


-- Function: extensions.pgp_sym_decrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_sym_decrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_decrypt_bytea$function$


-- Function: extensions.pgp_sym_encrypt
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$


-- Function: extensions.pgp_sym_encrypt
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt(text, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_text$function$


-- Function: extensions.pgp_sym_encrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$


-- Function: extensions.pgp_sym_encrypt_bytea
CREATE OR REPLACE FUNCTION extensions.pgp_sym_encrypt_bytea(bytea, text, text)
 RETURNS bytea
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/pgcrypto', $function$pgp_sym_encrypt_bytea$function$


-- Function: extensions.pgrst_ddl_watch
CREATE OR REPLACE FUNCTION extensions.pgrst_ddl_watch()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $function$


-- Function: extensions.pgrst_drop_watch
CREATE OR REPLACE FUNCTION extensions.pgrst_drop_watch()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $function$


-- Function: extensions.set_graphql_placeholder
-- Description: Reintroduces placeholder function for graphql_public.graphql
CREATE OR REPLACE FUNCTION extensions.set_graphql_placeholder()
 RETURNS event_trigger
 LANGUAGE plpgsql
AS $function$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$function$


-- Function: extensions.sign
CREATE OR REPLACE FUNCTION extensions.sign(payload json, secret text, algorithm text DEFAULT 'HS256'::text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
WITH
  header AS (
    SELECT extensions.url_encode(convert_to('{"alg":"' || algorithm || '","typ":"JWT"}', 'utf8')) AS data
    ),
  payload AS (
    SELECT extensions.url_encode(convert_to(payload::text, 'utf8')) AS data
    ),
  signables AS (
    SELECT header.data || '.' || payload.data AS data FROM header, payload
    )
SELECT
    signables.data || '.' ||
    extensions.algorithm_sign(signables.data, secret, algorithm) FROM signables;
$function$


-- Function: extensions.try_cast_double
CREATE OR REPLACE FUNCTION extensions.try_cast_double(inp text)
 RETURNS double precision
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
  BEGIN
    BEGIN
      RETURN inp::double precision;
    EXCEPTION
      WHEN OTHERS THEN RETURN NULL;
    END;
  END;
$function$


-- Function: extensions.url_decode
CREATE OR REPLACE FUNCTION extensions.url_decode(data text)
 RETURNS bytea
 LANGUAGE sql
 IMMUTABLE
AS $function$
WITH t AS (SELECT translate(data, '-_', '+/') AS trans),
     rem AS (SELECT length(t.trans) % 4 AS remainder FROM t) -- compute padding size
    SELECT decode(
        t.trans ||
        CASE WHEN rem.remainder > 0
           THEN repeat('=', (4 - rem.remainder))
           ELSE '' END,
    'base64') FROM t, rem;
$function$


-- Function: extensions.url_encode
CREATE OR REPLACE FUNCTION extensions.url_encode(data bytea)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
    SELECT translate(encode(data, 'base64'), E'+/=\n', '-_');
$function$


-- Function: extensions.uuid_generate_v1
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$


-- Function: extensions.uuid_generate_v1mc
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v1mc()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$


-- Function: extensions.uuid_generate_v3
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v3(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$


-- Function: extensions.uuid_generate_v4
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$


-- Function: extensions.uuid_generate_v5
CREATE OR REPLACE FUNCTION extensions.uuid_generate_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$


-- Function: extensions.uuid_nil
CREATE OR REPLACE FUNCTION extensions.uuid_nil()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$


-- Function: extensions.uuid_ns_dns
CREATE OR REPLACE FUNCTION extensions.uuid_ns_dns()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$


-- Function: extensions.uuid_ns_oid
CREATE OR REPLACE FUNCTION extensions.uuid_ns_oid()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$


-- Function: extensions.uuid_ns_url
CREATE OR REPLACE FUNCTION extensions.uuid_ns_url()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$


-- Function: extensions.uuid_ns_x500
CREATE OR REPLACE FUNCTION extensions.uuid_ns_x500()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$


-- Function: extensions.verify
CREATE OR REPLACE FUNCTION extensions.verify(token text, secret text, algorithm text DEFAULT 'HS256'::text)
 RETURNS TABLE(header json, payload json, valid boolean)
 LANGUAGE sql
 IMMUTABLE
AS $function$
  SELECT
    jwt.header AS header,
    jwt.payload AS payload,
    jwt.signature_ok AND tstzrange(
      to_timestamp(extensions.try_cast_double(jwt.payload->>'nbf')),
      to_timestamp(extensions.try_cast_double(jwt.payload->>'exp'))
    ) @> CURRENT_TIMESTAMP AS valid
  FROM (
    SELECT
      convert_from(extensions.url_decode(r[1]), 'utf8')::json AS header,
      convert_from(extensions.url_decode(r[2]), 'utf8')::json AS payload,
      r[3] = extensions.algorithm_sign(r[1] || '.' || r[2], secret, algorithm) AS signature_ok
    FROM regexp_split_to_array(token, '\.') r
  ) jwt
$function$


-- Function: graphql_public.graphql
CREATE OR REPLACE FUNCTION graphql_public.graphql("operationName" text DEFAULT NULL::text, query text DEFAULT NULL::text, variables jsonb DEFAULT NULL::jsonb, extensions jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
AS $function$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $function$


-- Function: pgbouncer.get_auth
CREATE OR REPLACE FUNCTION pgbouncer.get_auth(p_usename text)
 RETURNS TABLE(username text, password text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RAISE WARNING 'PgBouncer auth request: %', p_usename;

    RETURN QUERY
    SELECT usename::TEXT, passwd::TEXT FROM pg_catalog.pg_shadow
    WHERE usename = p_usename;
END;
$function$


-- Function: public.add_invoice_history_entry
-- Description: Функция для ручного добавления записей в историю счетов
CREATE OR REPLACE FUNCTION public.add_invoice_history_entry(p_invoice_id integer, p_event_type character varying, p_action character varying, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID;
    v_user_name VARCHAR(255);
    v_user_role VARCHAR(100);
BEGIN
    -- Получаем информацию о пользователе
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL THEN
        SELECT u.full_name, r.name
        INTO v_user_name, v_user_role
        FROM public.users u
        LEFT JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = v_user_id;
    END IF;

    -- Добавляем запись в историю
    INSERT INTO public.invoice_history (
        invoice_id, event_type, action,
        user_id, user_name, user_role,
        description, metadata
    ) VALUES (
        p_invoice_id,
        p_event_type,
        p_action,
        v_user_id,
        COALESCE(v_user_name, 'Система'),
        v_user_role,
        p_description,
        p_metadata
    );
END;
$function$


-- Function: public.calculate_payment_vat
CREATE OR REPLACE FUNCTION public.calculate_payment_vat()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Если указана общая сумма и ставка НДС, но не указаны детали НДС
    IF NEW.total_amount IS NOT NULL
       AND NEW.vat_rate IS NOT NULL
       AND NEW.amount_net IS NULL
       AND NEW.vat_amount IS NULL THEN

        -- Рассчитываем НДС и сумму без НДС (обратный расчет от суммы с НДС)
        IF NEW.vat_rate > 0 THEN
            NEW.vat_amount := ROUND(NEW.total_amount * NEW.vat_rate / (100 + NEW.vat_rate), 2);
            NEW.amount_net := NEW.total_amount - NEW.vat_amount;
        ELSE
            NEW.vat_amount := 0;
            NEW.amount_net := NEW.total_amount;
        END IF;

    -- Если указана сумма без НДС и ставка НДС
    ELSIF NEW.amount_net IS NOT NULL
          AND NEW.vat_rate IS NOT NULL
          AND NEW.total_amount IS NULL THEN

        -- Рассчитываем НДС и общую сумму (прямой расчет)
        IF NEW.vat_rate > 0 THEN
            NEW.vat_amount := ROUND(NEW.amount_net * NEW.vat_rate / 100, 2);
            NEW.total_amount := NEW.amount_net + NEW.vat_amount;
        ELSE
            NEW.vat_amount := 0;
            NEW.total_amount := NEW.amount_net;
        END IF;

    -- Если указаны все суммы, проверяем корректность
    ELSIF NEW.total_amount IS NOT NULL
          AND NEW.amount_net IS NOT NULL
          AND NEW.vat_amount IS NOT NULL THEN

        -- Проверяем, что total_amount = amount_net + vat_amount
        IF ABS(NEW.total_amount - (NEW.amount_net + NEW.vat_amount)) > 0.01 THEN
            RAISE EXCEPTION 'Некорректные суммы НДС: total_amount (%) != amount_net (%) + vat_amount (%)',
                            NEW.total_amount, NEW.amount_net, NEW.vat_amount;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$


-- Function: public.cascade_delete_invoice
CREATE OR REPLACE FUNCTION public.cascade_delete_invoice(p_invoice_id integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_cleared_history integer := 0;
    v_deleted_history integer := 0;
    v_deleted_documents integer := 0;
    v_deleted_workflow_progress integer := 0;
    v_deleted_workflows integer := 0;
    v_deleted_payments integer := 0;
    v_deleted_invoice integer := 0;
    v_invoice_number text;
BEGIN
    SELECT invoice_number INTO v_invoice_number
    FROM public.invoices
    WHERE id = p_invoice_id;

    IF v_invoice_number IS NULL THEN
        RAISE EXCEPTION 'Invoice with id % not found', p_invoice_id;
    END IF;

    UPDATE public.invoice_history
    SET payment_id = NULL
    WHERE invoice_id = p_invoice_id;
    GET DIAGNOSTICS v_cleared_history = ROW_COUNT;

    DELETE FROM public.invoice_history
    WHERE invoice_id = p_invoice_id;
    GET DIAGNOSTICS v_deleted_history = ROW_COUNT;

    DELETE FROM public.invoice_documents
    WHERE invoice_id = p_invoice_id;
    GET DIAGNOSTICS v_deleted_documents = ROW_COUNT;

    DELETE FROM public.workflow_approval_progress
    WHERE workflow_id IN (
        SELECT workflow_id
        FROM public.payment_workflows
        WHERE invoice_id = p_invoice_id
    );
    GET DIAGNOSTICS v_deleted_workflow_progress = ROW_COUNT;

    DELETE FROM public.payment_workflows
    WHERE invoice_id = p_invoice_id;
    GET DIAGNOSTICS v_deleted_workflows = ROW_COUNT;

    DELETE FROM public.payments
    WHERE invoice_id = p_invoice_id;
    GET DIAGNOSTICS v_deleted_payments = ROW_COUNT;

    DELETE FROM public.invoices
    WHERE id = p_invoice_id;
    GET DIAGNOSTICS v_deleted_invoice = ROW_COUNT;

    IF v_deleted_invoice = 0 THEN
        RAISE EXCEPTION 'Invoice with id % could not be deleted', p_invoice_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', p_invoice_id,
        'invoice_number', v_invoice_number,
        'cleared_history_links', v_cleared_history,
        'deleted', jsonb_build_object(
            'history', v_deleted_history,
            'documents', v_deleted_documents,
            'workflow_progress', v_deleted_workflow_progress,
            'workflows', v_deleted_workflows,
            'payments', v_deleted_payments,
            'invoice', v_deleted_invoice
        ),
        'timestamp', now()
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'invoice_id', p_invoice_id,
            'timestamp', now()
        );
END;
$function$


-- Function: public.fn_recalc_invoice_amounts
-- Description: Recalculates VAT and total amounts before invoice insert/update
CREATE OR REPLACE FUNCTION public.fn_recalc_invoice_amounts()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Calculate VAT amount based on net amount and VAT rate
    NEW.vat_amount = ROUND(NEW.amount_net * NEW.vat_rate / 100, 2);
    
    -- Calculate total amount (net + VAT)
    NEW.total_amount = NEW.amount_net + NEW.vat_amount;
    
    -- Ensure paid amount doesn't exceed total amount
    IF NEW.paid_amount > NEW.total_amount THEN
        NEW.paid_amount = NEW.total_amount;
    END IF;
    
    -- Update payment status based on paid amount
    IF NEW.paid_amount = 0 THEN
        -- Status remains as is (could be draft, approved, etc.)
        NULL;
    ELSIF NEW.paid_amount >= NEW.total_amount THEN
        NEW.status = 'paid';
        IF NEW.paid_at IS NULL THEN
            NEW.paid_at = NOW();
        END IF;
    ELSIF NEW.paid_amount > 0 THEN
        NEW.status = 'partially_paid';
    END IF;
    
    RETURN NEW;
END;
$function$


-- Function: public.fn_sync_invoice_payment
-- Description: Синхронизирует оплаченную сумму счета. Работает ТОЛЬКО с реальными статусами: completed, processing
CREATE OR REPLACE FUNCTION public.fn_sync_invoice_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    target_invoice_id integer;
    total_paid numeric(15,2);
    invoice_total numeric(15,2);
    v_last_payment_date timestamp with time zone;
    v_old_status character varying(50);
BEGIN
    -- Определяем целевой счет
    IF TG_OP = 'DELETE' THEN
        target_invoice_id := OLD.invoice_id;
    ELSE
        target_invoice_id := NEW.invoice_id;
    END IF;

    -- Получаем старый статус счета
    SELECT status INTO v_old_status
    FROM invoices
    WHERE id = target_invoice_id;

    -- Суммируем платежи с РЕАЛЬНЫМИ статусами из приложения
    -- completed и processing - это статусы, которые реально используются
    SELECT
        COALESCE(SUM(total_amount), 0),
        MAX(CASE
            WHEN status = 'completed' THEN updated_at
            ELSE NULL
        END)
    INTO total_paid, v_last_payment_date
    FROM payments
    WHERE invoice_id = target_invoice_id
    AND status IN (
        'completed',   -- Основной статус завершенного платежа
        'processing'   -- Платеж в обработке (тоже считаем)
        -- НЕ включаем: 'pending', 'draft', 'failed', 'cancelled'
        -- НЕ включаем устаревшие: 'paid', 'approved', 'scheduled'
    );

    -- Получаем общую сумму счета
    SELECT total_amount
    INTO invoice_total
    FROM invoices
    WHERE id = target_invoice_id;

    -- Обновляем счет
    UPDATE invoices
    SET
        paid_amount = total_paid,
        -- Устанавливаем paid_at когда полностью оплачено
        paid_at = CASE
            WHEN total_paid >= invoice_total AND paid_at IS NULL
                THEN COALESCE(v_last_payment_date, NOW())
            WHEN total_paid < invoice_total
                THEN NULL
            ELSE paid_at
        END,
        -- Автоматически обновляем статус счета
        status = CASE
            WHEN total_paid = 0 THEN 'draft'
            WHEN total_paid > 0 AND total_paid < invoice_total THEN 'partially_paid'
            WHEN total_paid >= invoice_total THEN 'paid'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = target_invoice_id;

    -- Логирование для отладки
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        RAISE NOTICE 'Синхронизация счета #%: paid=% of %, status=%',
            target_invoice_id, total_paid, invoice_total, NEW.status;

        -- Записываем в историю в правильном формате
        INSERT INTO public.invoice_history (
            invoice_id,
            payment_id,
            event_type,
            event_date,
            action,
            description,
            status_from,
            status_to,
            amount_from,
            amount_to,
            changed_fields,
            user_id,
            created_at
        ) VALUES (
            target_invoice_id,
            NEW.id,
            'payment',
            NOW(),
            'payment_sync',
            format('Синхронизация платежей: %s из %s', total_paid::money, invoice_total::money),
            v_old_status,
            (SELECT status FROM invoices WHERE id = target_invoice_id),
            (SELECT paid_amount FROM invoices WHERE id = target_invoice_id) - NEW.total_amount,
            total_paid,
            jsonb_build_object(
                'payment_status', NEW.status,
                'payment_amount', NEW.total_amount,
                'total_paid', total_paid
            ),
            NEW.created_by,
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$function$


-- Function: public.get_current_user_profile
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
 RETURNS SETOF users
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
    SELECT * FROM public.users WHERE id = auth.uid();
$function$


-- Function: public.get_invoice_history
CREATE OR REPLACE FUNCTION public.get_invoice_history(p_invoice_id integer)
 RETURNS TABLE(id bigint, action character varying, action_description text, user_name character varying, user_role character varying, changed_fields text[], comment text, created_at timestamp with time zone, status_from character varying, status_to character varying, workflow_stage_from character varying, workflow_stage_to character varying, invoice_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        ial.id,
        ial.action,
        CASE
            WHEN ial.action = 'CREATE' THEN 'Создан счет'
            WHEN ial.action = 'STATUS_CHANGE' THEN 'Изменен статус: ' || COALESCE(ial.status_from, 'нет') || ' → ' || COALESCE(ial.status_to, 'нет')
            WHEN ial.action = 'UPDATE' THEN 'Изменены поля: ' || COALESCE(array_to_string(ial.changed_fields, ', '), '')
            WHEN ial.action = 'DELETE' THEN 'Удален счет'
            WHEN ial.action = 'COMMENT' THEN 'Добавлен комментарий'
            ELSE ial.action
        END::TEXT as action_description,
        ial.user_name,
        COALESCE(r.name, 'Неизвестная роль')::VARCHAR(255) as user_role,
        ial.changed_fields,
        ial.comment,
        ial.created_at,
        ial.status_from,
        ial.status_to,
        ial.workflow_stage_from,
        ial.workflow_stage_to,
        ial.invoice_id
    FROM invoice_audit_log ial
    LEFT JOIN users u ON ial.user_id = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE ial.invoice_id = p_invoice_id
    ORDER BY ial.created_at DESC;
END;
$function$


-- Function: public.get_next_invoice_sequence
CREATE OR REPLACE FUNCTION public.get_next_invoice_sequence(p_org_code character varying, p_proj_code character varying, p_year_month character varying)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_max_seq INTEGER;
  v_pattern VARCHAR;
BEGIN
  -- Формируем паттерн для поиска
  v_pattern := p_org_code || '-' || p_proj_code || '-%%-INV-' || p_year_month || '-%';
  
  -- Находим максимальный sequence для данного паттерна
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(internal_number FROM '[0-9]{3}$') AS INTEGER
      )
    ), 
    0
  ) INTO v_max_seq
  FROM invoices
  WHERE internal_number LIKE v_pattern;
  
  -- Возвращаем следующий номер
  RETURN v_max_seq + 1;
END;
$function$


-- Function: public.get_next_payment_sequence
CREATE OR REPLACE FUNCTION public.get_next_payment_sequence(p_invoice_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_max_seq INTEGER;
  v_invoice_internal_number VARCHAR;
  v_pattern VARCHAR;
BEGIN
  -- Получаем внутренний номер счета
  SELECT internal_number INTO v_invoice_internal_number
  FROM invoices
  WHERE id = p_invoice_id;
  
  -- Если у счета нет внутреннего номера, возвращаем 1
  IF v_invoice_internal_number IS NULL THEN
    RETURN 1;
  END IF;
  
  -- Формируем паттерн для поиска
  v_pattern := v_invoice_internal_number || '/PAY-%';
  
  -- Находим максимальный sequence для данного счета
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(internal_number FROM '.*PAY-([0-9]{2})-.*') AS INTEGER
      )
    ), 
    0
  ) INTO v_max_seq
  FROM payments
  WHERE internal_number LIKE v_pattern;
  
  -- Возвращаем следующий номер
  RETURN v_max_seq + 1;
END;
$function$


-- Function: public.get_payment_history
CREATE OR REPLACE FUNCTION public.get_payment_history(p_payment_id integer)
 RETURNS TABLE(id bigint, action character varying, action_description text, user_name character varying, user_role character varying, changed_fields text[], comment text, created_at timestamp with time zone, status_from character varying, status_to character varying, amount_from numeric, amount_to numeric, payment_id integer, invoice_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        pal.id,
        pal.action,
        CASE
            WHEN pal.action = 'CREATE' THEN 'Создан платеж на сумму ' || COALESCE(pal.amount_to::TEXT, '0')
            WHEN pal.action = 'STATUS_CHANGE' THEN 'Изменен статус: ' || COALESCE(pal.status_from, 'нет') || ' → ' || COALESCE(pal.status_to, 'нет')
            WHEN pal.action = 'AMOUNT_CHANGE' THEN 'Изменена сумма: ' || COALESCE(pal.amount_from::TEXT, '0') || ' → ' || COALESCE(pal.amount_to::TEXT, '0')
            WHEN pal.action = 'UPDATE' THEN 'Изменены поля: ' || COALESCE(array_to_string(pal.changed_fields, ', '), '')
            WHEN pal.action = 'DELETE' THEN 'Удален платеж'
            WHEN pal.action = 'COMMENT' THEN 'Добавлен комментарий'
            ELSE pal.action
        END::TEXT as action_description,
        pal.user_name,
        COALESCE(r.name, 'Неизвестная роль')::VARCHAR(255) as user_role,
        pal.changed_fields,
        pal.comment,
        pal.created_at,
        pal.status_from,
        pal.status_to,
        pal.amount_from,
        pal.amount_to,
        pal.payment_id,
        pal.invoice_id
    FROM payment_audit_log pal
    LEFT JOIN users u ON pal.user_id = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE pal.payment_id = p_payment_id
    ORDER BY pal.created_at DESC;
END;
$function$


-- Function: public.get_payment_history_by_invoice
CREATE OR REPLACE FUNCTION public.get_payment_history_by_invoice(p_invoice_id integer)
 RETURNS TABLE(id bigint, action character varying, action_description text, user_name character varying, user_role character varying, changed_fields text[], comment text, created_at timestamp with time zone, status_from character varying, status_to character varying, amount_from numeric, amount_to numeric, payment_id integer, invoice_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        pal.id,
        pal.action,
        CASE
            WHEN pal.action = 'CREATE' THEN 'Создан платеж на сумму ' || COALESCE(pal.amount_to::TEXT, '0')
            WHEN pal.action = 'STATUS_CHANGE' THEN 'Изменен статус: ' || COALESCE(pal.status_from, 'нет') || ' → ' || COALESCE(pal.status_to, 'нет')
            WHEN pal.action = 'AMOUNT_CHANGE' THEN 'Изменена сумма: ' || COALESCE(pal.amount_from::TEXT, '0') || ' → ' || COALESCE(pal.amount_to::TEXT, '0')
            WHEN pal.action = 'UPDATE' THEN 'Изменены поля: ' || COALESCE(array_to_string(pal.changed_fields, ', '), '')
            WHEN pal.action = 'DELETE' THEN 'Удален платеж'
            WHEN pal.action = 'COMMENT' THEN 'Добавлен комментарий'
            ELSE pal.action
        END::TEXT as action_description,
        pal.user_name,
        COALESCE(r.name, 'Неизвестная роль')::VARCHAR(255) as user_role,
        pal.changed_fields,
        pal.comment,
        pal.created_at,
        pal.status_from,
        pal.status_to,
        pal.amount_from,
        pal.amount_to,
        pal.payment_id,
        pal.invoice_id
    FROM payment_audit_log pal
    LEFT JOIN users u ON pal.user_id = u.id
    LEFT JOIN roles r ON u.role_id = r.id
    WHERE pal.invoice_id = p_invoice_id
    ORDER BY pal.created_at DESC;
END;
$function$


-- Function: public.get_statuses_by_entity_type
CREATE OR REPLACE FUNCTION public.get_statuses_by_entity_type(p_entity_type text)
 RETURNS TABLE(id bigint, code text, name text, color text, is_final boolean, is_active boolean, order_index integer, description text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  return query
  select 
    s.id,
    s.code,
    s.name,
    s.color,
    s.is_final,
    s.is_active,
    s.order_index,
    s.description
  from public.statuses s
  where s.entity_type = p_entity_type
    and s.is_active = true
  order by s.order_index, s.name;
end;
$function$


-- Function: public.get_workflow_for_invoice
CREATE OR REPLACE FUNCTION public.get_workflow_for_invoice(p_invoice_type_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_workflow_id integer;
BEGIN
    -- Получаем первый активный workflow для данного типа заявки
    SELECT id INTO v_workflow_id
    FROM public.workflows
    WHERE is_active = true
      AND (
        invoice_type_ids IS NULL
        OR p_invoice_type_id = ANY(invoice_type_ids)
      )
    ORDER BY id ASC
    LIMIT 1;

    RETURN v_workflow_id;
END;
$function$


-- Function: public.handle_new_user
-- Description: Creates user record when new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  BEGIN
      -- Создаем профиль пользователя
      INSERT INTO public.users (id, email, full_name, role_id, is_active)
      VALUES (
          NEW.id,
          NEW.email,
          COALESCE(
              NEW.raw_user_meta_data->>'full_name',
              NEW.raw_user_meta_data->>'name',
              SPLIT_PART(NEW.email, '@', 1)
          ),
          (SELECT id FROM roles WHERE code = 'user' LIMIT 1), -- Получаем role_id для роли 'user'
          true
      )
      ON CONFLICT (id) DO UPDATE
      SET
          email = EXCLUDED.email,
          full_name = COALESCE(EXCLUDED.full_name, users.full_name),
          updated_at = now();

      RETURN NEW;
  EXCEPTION
      WHEN OTHERS THEN
          RAISE WARNING 'Error creating user profile: %', SQLERRM;
          RETURN NEW;
  END;
  $function$


-- Function: public.is_status_final
CREATE OR REPLACE FUNCTION public.is_status_final(p_entity_type text, p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
declare
  v_is_final boolean;
begin
  select s.is_final into v_is_final
  from public.statuses s
  where s.entity_type = p_entity_type
    and s.code = p_code
    and s.is_active = true;
  
  return coalesce(v_is_final, false);
end;
$function$


-- Function: public.set_default_user_role
CREATE OR REPLACE FUNCTION public.set_default_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  default_role_id INTEGER;
BEGIN
  -- Получаем ID роли 'user'
  SELECT id INTO default_role_id 
  FROM roles 
  WHERE code = 'user' 
  LIMIT 1;
  
  -- Если роль не найдена, используем ID = 1
  IF default_role_id IS NULL THEN
    default_role_id := 1;
  END IF;
  
  -- Устанавливаем роль по умолчанию, если она не указана
  IF NEW.role_id IS NULL THEN
    NEW.role_id := default_role_id;
  END IF;
  
  -- Устанавливаем is_active = true по умолчанию
  IF NEW.is_active IS NULL THEN
    NEW.is_active := true;
  END IF;
  
  RETURN NEW;
END;
$function$


-- Function: public.start_payment_workflow_simple
-- Description: Запускает процесс согласования платежа. Все ID теперь INTEGER
CREATE OR REPLACE FUNCTION public.start_payment_workflow_simple(p_payment_id integer, p_invoice_id integer, p_workflow_id integer, p_user_id uuid, p_amount numeric, p_description text DEFAULT NULL::text, p_supplier_id integer DEFAULT NULL::integer, p_project_id integer DEFAULT NULL::integer, p_payment_date date DEFAULT CURRENT_DATE)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_workflow_id integer;
    v_first_stage_id integer;
    v_stages_total integer;
BEGIN
    -- Валидация обязательных параметров
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'Сумма платежа должна быть больше 0';
    END IF;

    -- Получаем первый этап workflow
    SELECT id INTO v_first_stage_id
    FROM public.workflow_stages
    WHERE workflow_id = p_workflow_id
    ORDER BY position ASC
    LIMIT 1;

    IF v_first_stage_id IS NULL THEN
        RAISE EXCEPTION 'Не найдены этапы для workflow_id = %', p_workflow_id;
    END IF;

    -- Получаем общее количество этапов
    SELECT COUNT(*) INTO v_stages_total
    FROM public.workflow_stages
    WHERE workflow_id = p_workflow_id;

    -- Создаем запись payment_workflow
    INSERT INTO public.payment_workflows (
        payment_id,          -- INTEGER
        invoice_id,          -- INTEGER
        workflow_id,
        current_stage_id,
        current_stage_position,
        status,
        amount,
        description,
        contractor_id,
        project_id,
        payment_date,
        stages_total,
        stages_completed,
        started_by,
        started_at
    ) VALUES (
        p_payment_id,        -- Прямо передаем INTEGER
        p_invoice_id,        -- Прямо передаем INTEGER
        p_workflow_id,
        v_first_stage_id,
        1,
        'in_progress',
        p_amount,
        p_description,
        p_supplier_id,
        p_project_id,
        p_payment_date,
        v_stages_total,
        0,
        p_user_id,
        NOW()
    )
    RETURNING id INTO v_workflow_id;

    -- Логирование в правильном формате для invoice_history
    INSERT INTO public.invoice_history (
        invoice_id,
        event_type,
        event_date,
        action,
        description,
        payment_id,
        user_id,
        new_values,
        created_at
    ) VALUES (
        p_invoice_id,
        'workflow',
        NOW(),
        'workflow_started',
        format('Запущен workflow для платежа #%s на сумму %s', p_payment_id, p_amount::money),
        p_payment_id,
        p_user_id,
        jsonb_build_object(
            'workflow_id', v_workflow_id,
            'payment_id', p_payment_id,
            'amount', p_amount,
            'supplier_id', p_supplier_id,
            'project_id', p_project_id
        ),
        NOW()
    );

    RETURN v_workflow_id;
END;
$function$


-- Function: public.track_document_changes
CREATE OR REPLACE FUNCTION public.track_document_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID;
    v_user_name VARCHAR(255);
    v_user_role VARCHAR(100);
    v_invoice_id INTEGER;
    v_attachment_info RECORD;
BEGIN
    -- Получаем информацию о текущем пользователе
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL THEN
        SELECT u.full_name, r.name
        INTO v_user_name, v_user_role
        FROM public.users u
        LEFT JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = v_user_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;

        -- Получаем информацию о файле из таблицы attachments
        SELECT original_name, size_bytes, mime_type
        INTO v_attachment_info
        FROM public.attachments
        WHERE id = OLD.attachment_id;

        INSERT INTO public.invoice_history (
            invoice_id,
            document_id,
            attachment_id,
            event_type,
            action,
            user_id,
            user_name,
            user_role,
            old_values,
            description,
            metadata
        ) VALUES (
            v_invoice_id,
            OLD.id,
            OLD.attachment_id,
            'DOCUMENT_REMOVED',
            'Документ удален',
            v_user_id,
            COALESCE(v_user_name, 'Система'),
            v_user_role,
            to_jsonb(OLD),
            'Удален документ: ' || COALESCE(v_attachment_info.original_name, 'без имени'),
            jsonb_build_object(
                'file_name', v_attachment_info.original_name,
                'file_size', v_attachment_info.size_bytes,
                'mime_type', v_attachment_info.mime_type,
                'attachment_id', OLD.attachment_id,
                'deleted_at', NOW()
            )
        );
        RETURN OLD;

    ELSIF TG_OP = 'INSERT' THEN
        -- Получаем информацию о файле из таблицы attachments
        SELECT original_name, size_bytes, mime_type
        INTO v_attachment_info
        FROM public.attachments
        WHERE id = NEW.attachment_id;

        INSERT INTO public.invoice_history (
            invoice_id,
            document_id,
            attachment_id,
            event_type,
            action,
            user_id,
            user_name,
            user_role,
            new_values,
            description,
            metadata
        ) VALUES (
            NEW.invoice_id,
            NEW.id,
            NEW.attachment_id,
            'DOCUMENT_ADDED',
            'Документ добавлен',
            v_user_id,
            COALESCE(v_user_name, 'Система'),
            v_user_role,
            to_jsonb(NEW),
            'Добавлен документ: ' || COALESCE(v_attachment_info.original_name, 'без имени'),
            jsonb_build_object(
                'file_name', v_attachment_info.original_name,
                'file_size', v_attachment_info.size_bytes,
                'mime_type', v_attachment_info.mime_type,
                'attachment_id', NEW.attachment_id
            )
        );
        RETURN NEW;
    END IF;

    RETURN NULL;
END;
$function$


-- Function: public.track_invoice_changes
CREATE OR REPLACE FUNCTION public.track_invoice_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_user_id UUID;
    v_user_name VARCHAR(255);
    v_user_role VARCHAR(100);
    v_changed_fields JSONB;
    v_old_values JSONB;
    v_new_values JSONB;
    v_invoice_id INTEGER;
    v_field_names TEXT;
    v_temp_name VARCHAR(255);
BEGIN
    -- Получаем информацию о текущем пользователе
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL THEN
        SELECT u.full_name, r.name
        INTO v_user_name, v_user_role
        FROM public.users u
        LEFT JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = v_user_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        -- При удалении записываем ID счета
        v_invoice_id := OLD.id;

        -- Записываем в историю перед удалением
        INSERT INTO public.invoice_history (
            invoice_id,
            event_type,
            action,
            user_id,
            user_name,
            user_role,
            status_from,
            amount_from,
            old_values,
            description,
            metadata,
            created_at
        ) VALUES (
            v_invoice_id,
            'INVOICE_DELETED',
            'Счет удален',
            v_user_id,
            COALESCE(v_user_name, 'Система'),
            v_user_role,
            OLD.status,
            OLD.total_amount,
            to_jsonb(OLD),
            'Удален счет №' || OLD.invoice_number,
            jsonb_build_object(
                'invoice_number', OLD.invoice_number,
                'internal_number', OLD.internal_number,
                'supplier_id', OLD.supplier_id,
                'payer_id', OLD.payer_id,
                'project_id', OLD.project_id,
                'material_responsible_person_id', OLD.material_responsible_person_id,
                'deleted_at', NOW()
            ),
            NOW()
        );

        -- Возвращаем OLD для продолжения удаления
        RETURN OLD;

    ELSIF TG_OP = 'INSERT' THEN
        -- Запись о создании счета
        -- Проверяем существование колонки currency в invoice_history
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'invoice_history'
            AND column_name = 'currency'
        ) THEN
            INSERT INTO public.invoice_history (
                invoice_id,
                event_type,
                action,
                user_id,
                user_name,
                user_role,
                status_to,
                amount_to,
                currency,  -- Всегда RUB
                new_values,
                description,
                metadata
            ) VALUES (
                NEW.id,
                'INVOICE_CREATED',
                'Счет создан',
                v_user_id,
                COALESCE(v_user_name, 'Система'),
                v_user_role,
                NEW.status,
                NEW.total_amount,
                'RUB',  -- Жёстко закодированная валюта
                to_jsonb(NEW),
                'Создан новый счет №' || NEW.invoice_number,
                jsonb_build_object(
                    'material_responsible_person_id', NEW.material_responsible_person_id
                )
            );
        ELSE
            -- Если колонки currency нет, вставляем без неё
            INSERT INTO public.invoice_history (
                invoice_id,
                event_type,
                action,
                user_id,
                user_name,
                user_role,
                status_to,
                amount_to,
                new_values,
                description,
                metadata
            ) VALUES (
                NEW.id,
                'INVOICE_CREATED',
                'Счет создан',
                v_user_id,
                COALESCE(v_user_name, 'Система'),
                v_user_role,
                NEW.status,
                NEW.total_amount,
                to_jsonb(NEW),
                'Создан новый счет №' || NEW.invoice_number,
                jsonb_build_object(
                    'material_responsible_person_id', NEW.material_responsible_person_id
                )
            );
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Проверяем изменение статуса
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.invoice_history (
                invoice_id,
                event_type,
                action,
                user_id,
                user_name,
                user_role,
                status_from,
                status_to,
                description
            ) VALUES (
                NEW.id,
                'STATUS_CHANGED',
                'Изменен статус счета',
                v_user_id,
                COALESCE(v_user_name, 'Система'),
                v_user_role,
                OLD.status,
                NEW.status,
                'Статус изменен с "' || COALESCE(OLD.status, 'нет') || '" на "' || NEW.status || '"'
            );
        END IF;

        -- Собираем информацию об измененных полях
        v_changed_fields := '{}';
        v_old_values := '{}';
        v_new_values := '{}';

        -- Проверяем важные поля и собираем старые/новые значения
        IF OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('total_amount', true);
            v_old_values := v_old_values || jsonb_build_object('total_amount', OLD.total_amount);
            v_new_values := v_new_values || jsonb_build_object('total_amount', NEW.total_amount);
        END IF;

        IF OLD.amount_net IS DISTINCT FROM NEW.amount_net THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('amount_net', true);
            v_old_values := v_old_values || jsonb_build_object('amount_net', OLD.amount_net);
            v_new_values := v_new_values || jsonb_build_object('amount_net', NEW.amount_net);
        END IF;

        IF OLD.vat_amount IS DISTINCT FROM NEW.vat_amount THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('vat_amount', true);
            v_old_values := v_old_values || jsonb_build_object('vat_amount', OLD.vat_amount);
            v_new_values := v_new_values || jsonb_build_object('vat_amount', NEW.vat_amount);
        END IF;

        IF OLD.vat_rate IS DISTINCT FROM NEW.vat_rate THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('vat_rate', true);
            v_old_values := v_old_values || jsonb_build_object('vat_rate', OLD.vat_rate);
            v_new_values := v_new_values || jsonb_build_object('vat_rate', NEW.vat_rate);
        END IF;

        IF OLD.supplier_id IS DISTINCT FROM NEW.supplier_id THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('supplier_id', true);
            v_old_values := v_old_values || jsonb_build_object('supplier_id', OLD.supplier_id);
            v_new_values := v_new_values || jsonb_build_object('supplier_id', NEW.supplier_id);
        END IF;

        IF OLD.payer_id IS DISTINCT FROM NEW.payer_id THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('payer_id', true);
            v_old_values := v_old_values || jsonb_build_object('payer_id', OLD.payer_id);
            v_new_values := v_new_values || jsonb_build_object('payer_id', NEW.payer_id);
        END IF;

        IF OLD.project_id IS DISTINCT FROM NEW.project_id THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('project_id', true);
            v_old_values := v_old_values || jsonb_build_object('project_id', OLD.project_id);
            v_new_values := v_new_values || jsonb_build_object('project_id', NEW.project_id);
        END IF;

        IF OLD.description IS DISTINCT FROM NEW.description THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('description', true);
            v_old_values := v_old_values || jsonb_build_object('description', OLD.description);
            v_new_values := v_new_values || jsonb_build_object('description', NEW.description);
        END IF;

        -- ВАЖНО: Проверка изменения МОЛ (материально ответственного лица)
        IF OLD.material_responsible_person_id IS DISTINCT FROM NEW.material_responsible_person_id THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('material_responsible_person_id', true);
            v_old_values := v_old_values || jsonb_build_object('material_responsible_person_id', OLD.material_responsible_person_id);
            v_new_values := v_new_values || jsonb_build_object('material_responsible_person_id', NEW.material_responsible_person_id);

            -- Получаем имена МОЛ из правильной таблицы
            IF OLD.material_responsible_person_id IS NOT NULL THEN
                SELECT full_name INTO v_temp_name
                FROM public.material_responsible_persons
                WHERE id = OLD.material_responsible_person_id;
                IF v_temp_name IS NOT NULL THEN
                    v_old_values := v_old_values || jsonb_build_object('material_responsible_person_name', v_temp_name);
                END IF;
            END IF;

            IF NEW.material_responsible_person_id IS NOT NULL THEN
                SELECT full_name INTO v_temp_name
                FROM public.material_responsible_persons
                WHERE id = NEW.material_responsible_person_id;
                IF v_temp_name IS NOT NULL THEN
                    v_new_values := v_new_values || jsonb_build_object('material_responsible_person_name', v_temp_name);
                END IF;
            END IF;
        END IF;

        -- Проверяем дополнительные поля
        IF OLD.invoice_number IS DISTINCT FROM NEW.invoice_number THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('invoice_number', true);
            v_old_values := v_old_values || jsonb_build_object('invoice_number', OLD.invoice_number);
            v_new_values := v_new_values || jsonb_build_object('invoice_number', NEW.invoice_number);
        END IF;

        IF OLD.internal_number IS DISTINCT FROM NEW.internal_number THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('internal_number', true);
            v_old_values := v_old_values || jsonb_build_object('internal_number', OLD.internal_number);
            v_new_values := v_new_values || jsonb_build_object('internal_number', NEW.internal_number);
        END IF;

        IF OLD.invoice_date IS DISTINCT FROM NEW.invoice_date THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('invoice_date', true);
            v_old_values := v_old_values || jsonb_build_object('invoice_date', OLD.invoice_date);
            v_new_values := v_new_values || jsonb_build_object('invoice_date', NEW.invoice_date);
        END IF;

        -- УДАЛЕНА проверка OLD.currency IS DISTINCT FROM NEW.currency
        -- так как поля currency больше нет в таблице invoices

        IF OLD.priority IS DISTINCT FROM NEW.priority THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('priority', true);
            v_old_values := v_old_values || jsonb_build_object('priority', OLD.priority);
            v_new_values := v_new_values || jsonb_build_object('priority', NEW.priority);
        END IF;

        IF OLD.delivery_days IS DISTINCT FROM NEW.delivery_days THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('delivery_days', true);
            v_old_values := v_old_values || jsonb_build_object('delivery_days', OLD.delivery_days);
            v_new_values := v_new_values || jsonb_build_object('delivery_days', NEW.delivery_days);
        END IF;

        IF OLD.delivery_days_type IS DISTINCT FROM NEW.delivery_days_type THEN
            v_changed_fields := v_changed_fields || jsonb_build_object('delivery_days_type', true);
            v_old_values := v_old_values || jsonb_build_object('delivery_days_type', OLD.delivery_days_type);
            v_new_values := v_new_values || jsonb_build_object('delivery_days_type', NEW.delivery_days_type);
        END IF;

        -- Если были изменения полей (кроме статуса)
        IF v_changed_fields != '{}' THEN
            -- Формируем список измененных полей
            SELECT string_agg(field_name, ', ')
            INTO v_field_names
            FROM jsonb_object_keys(v_changed_fields) AS field_name;

            -- Проверяем существование колонки currency в invoice_history
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'invoice_history'
                AND column_name = 'currency'
            ) THEN
                INSERT INTO public.invoice_history (
                    invoice_id,
                    event_type,
                    action,
                    user_id,
                    user_name,
                    user_role,
                    changed_fields,
                    old_values,
                    new_values,
                    amount_from,
                    amount_to,
                    currency,  -- Всегда RUB
                    description
                ) VALUES (
                    NEW.id,
                    'INVOICE_UPDATED',
                    'Счет изменен',
                    v_user_id,
                    COALESCE(v_user_name, 'Система'),
                    v_user_role,
                    v_changed_fields,
                    v_old_values,
                    v_new_values,
                    OLD.total_amount,
                    NEW.total_amount,
                    'RUB',  -- Жёстко закодированная валюта
                    'Изменены поля: ' || COALESCE(v_field_names, 'нет')
                );
            ELSE
                -- Если колонки currency нет, вставляем без неё
                INSERT INTO public.invoice_history (
                    invoice_id,
                    event_type,
                    action,
                    user_id,
                    user_name,
                    user_role,
                    changed_fields,
                    old_values,
                    new_values,
                    amount_from,
                    amount_to,
                    description
                ) VALUES (
                    NEW.id,
                    'INVOICE_UPDATED',
                    'Счет изменен',
                    v_user_id,
                    COALESCE(v_user_name, 'Система'),
                    v_user_role,
                    v_changed_fields,
                    v_old_values,
                    v_new_values,
                    OLD.total_amount,
                    NEW.total_amount,
                    'Изменены поля: ' || COALESCE(v_field_names, 'нет')
                );
            END IF;
        END IF;
    END IF;

    -- Для INSERT и UPDATE возвращаем NEW
    IF TG_OP != 'DELETE' THEN
        RETURN NEW;
    END IF;

    -- Этот код не должен выполняться, но на всякий случай
    RETURN NULL;
END;
$function$


-- Function: public.track_payment_changes
CREATE OR REPLACE FUNCTION public.track_payment_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id uuid;
    v_user_email varchar(255);
    v_user_role varchar(50);
BEGIN
    -- Получаем текущего пользователя
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_user_email
        FROM auth.users
        WHERE id = v_user_id;

        SELECT role INTO v_user_role
        FROM public.user_profiles
        WHERE id = v_user_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        -- При удалении платежа
        IF v_user_id IS NOT NULL THEN
            INSERT INTO public.invoice_history (
                invoice_id,
                event_type,
                event_data,
                user_id,
                user_email,
                user_role,
                status,
                amount,
                currency,
                old_data,
                description,
                metadata
            ) VALUES (
                OLD.invoice_id,
                'payment_deleted',
                to_jsonb(OLD),
                v_user_id,
                v_user_email,
                v_user_role,
                OLD.status,
                OLD.total_amount,
                'RUB',
                to_jsonb(OLD),
                'Платеж удален',
                jsonb_build_object(
                    'payment_id', OLD.id,
                    'internal_number', OLD.internal_number,
                    'deleted_at', NOW()
                )
            );
        ELSE
            INSERT INTO public.invoice_history (
                invoice_id,
                event_type,
                event_data,
                status,
                amount,
                description,
                metadata
            ) VALUES (
                OLD.invoice_id,
                'payment_deleted',
                to_jsonb(OLD),
                OLD.status,
                OLD.total_amount,
                'Платеж удален',
                jsonb_build_object(
                    'payment_id', OLD.id,
                    'internal_number', OLD.internal_number,
                    'deleted_at', NOW()
                )
            );
        END IF;

    ELSIF TG_OP = 'INSERT' THEN
        -- При создании платежа
        IF v_user_id IS NOT NULL THEN
            INSERT INTO public.invoice_history (
                invoice_id,
                event_type,
                event_data,
                user_id,
                user_email,
                user_role,
                status,
                amount,
                currency,
                new_data,
                description,
                metadata
            ) VALUES (
                NEW.invoice_id,
                'payment_created',
                to_jsonb(NEW),
                v_user_id,
                v_user_email,
                v_user_role,
                NEW.status,
                NEW.total_amount,
                'RUB',
                to_jsonb(NEW),
                'Создан платеж на сумму ' || NEW.total_amount || ' RUB',
                jsonb_build_object(
                    'payment_id', NEW.id,
                    'internal_number', NEW.internal_number,
                    'payer_id', NEW.payer_id
                )
            );
        ELSE
            INSERT INTO public.invoice_history (
                invoice_id,
                event_type,
                event_data,
                status,
                amount,
                new_data,
                description,
                metadata
            ) VALUES (
                NEW.invoice_id,
                'payment_created',
                to_jsonb(NEW),
                NEW.status,
                NEW.total_amount,
                to_jsonb(NEW),
                'Создан платеж на сумму ' || NEW.total_amount || ' RUB',
                jsonb_build_object(
                    'payment_id', NEW.id,
                    'internal_number', NEW.internal_number,
                    'payer_id', NEW.payer_id
                )
            );
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- При обновлении платежа

        -- Проверяем изменение статуса
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            IF v_user_id IS NOT NULL THEN
                INSERT INTO public.invoice_history (
                    invoice_id,
                    event_type,
                    event_data,
                    user_id,
                    user_email,
                    user_role,
                    old_status,
                    new_status,
                    amount,
                    currency,
                    description,
                    metadata
                ) VALUES (
                    NEW.invoice_id,
                    'payment_status_changed',
                    to_jsonb(NEW),
                    v_user_id,
                    v_user_email,
                    v_user_role,
                    OLD.status,
                    NEW.status,
                    NEW.total_amount,
                    'RUB',
                    'Статус платежа изменен с "' || COALESCE(OLD.status, 'нет') || '" на "' || NEW.status || '"',
                    jsonb_build_object(
                        'payment_id', NEW.id,
                        'internal_number', NEW.internal_number
                    )
                );
            ELSE
                INSERT INTO public.invoice_history (
                    invoice_id,
                    event_type,
                    event_data,
                    old_status,
                    new_status,
                    amount,
                    description,
                    metadata
                ) VALUES (
                    NEW.invoice_id,
                    'payment_status_changed',
                    to_jsonb(NEW),
                    OLD.status,
                    NEW.status,
                    NEW.total_amount,
                    'Статус платежа изменен с "' || COALESCE(OLD.status, 'нет') || '" на "' || NEW.status || '"',
                    jsonb_build_object(
                        'payment_id', NEW.id,
                        'internal_number', NEW.internal_number
                    )
                );
            END IF;
        END IF;

        -- Проверяем изменение суммы
        IF OLD.total_amount IS DISTINCT FROM NEW.total_amount THEN
            IF v_user_id IS NOT NULL THEN
                INSERT INTO public.invoice_history (
                    invoice_id,
                    event_type,
                    event_data,
                    user_id,
                    user_email,
                    user_role,
                    status,
                    old_amount,
                    amount,
                    currency,
                    description,
                    metadata
                ) VALUES (
                    NEW.invoice_id,
                    'payment_amount_changed',
                    to_jsonb(NEW),
                    v_user_id,
                    v_user_email,
                    v_user_role,
                    NEW.status,
                    OLD.total_amount,
                    NEW.total_amount,
                    'RUB',
                    'Сумма платежа изменена с ' || OLD.total_amount || ' на ' || NEW.total_amount || ' RUB',
                    jsonb_build_object(
                        'payment_id', NEW.id,
                        'internal_number', NEW.internal_number,
                        'difference', NEW.total_amount - OLD.total_amount
                    )
                );
            ELSE
                INSERT INTO public.invoice_history (
                    invoice_id,
                    event_type,
                    event_data,
                    status,
                    old_amount,
                    amount,
                    description,
                    metadata
                ) VALUES (
                    NEW.invoice_id,
                    'payment_amount_changed',
                    to_jsonb(NEW),
                    NEW.status,
                    OLD.total_amount,
                    NEW.total_amount,
                    'Сумма платежа изменена с ' || OLD.total_amount || ' на ' || NEW.total_amount || ' RUB',
                    jsonb_build_object(
                        'payment_id', NEW.id,
                        'internal_number', NEW.internal_number,
                        'difference', NEW.total_amount - OLD.total_amount
                    )
                );
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$function$


-- Function: public.track_payment_history
CREATE OR REPLACE FUNCTION public.track_payment_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id UUID;
    v_user_name VARCHAR(255);
    v_user_role VARCHAR(100);
    v_invoice_id INTEGER;
BEGIN
    -- Получаем информацию о текущем пользователе
    v_user_id := auth.uid();

    IF v_user_id IS NOT NULL THEN
        SELECT full_name INTO v_user_name FROM public.users WHERE id = v_user_id;
        SELECT r.code INTO v_user_role
        FROM public.user_profiles up
        JOIN public.roles r ON up.role_id = r.id
        WHERE up.user_id = v_user_id;
    END IF;

    -- Определяем invoice_id
    IF TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    ELSE
        v_invoice_id := NEW.invoice_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        -- Создание платежа
        INSERT INTO public.invoice_history (
            invoice_id,
            event_type,
            event_date,
            user_id,
            user_name,
            user_role,
            event_description,
            field_changes,
            payment_id,
            payment_status,
            payment_amount
        ) VALUES (
            v_invoice_id,
            'payment_created',
            NOW(),
            v_user_id,
            v_user_name,
            v_user_role,
            format('Создан платеж на сумму %s руб.', NEW.total_amount),
            jsonb_build_object(
                'payment_id', NEW.id,
                'amount', NEW.total_amount,
                'status', NEW.status,
                'payment_type', NEW.payment_type
            ),
            NEW.id,
            NEW.status,
            NEW.total_amount
        );

    ELSIF TG_OP = 'UPDATE' THEN
        -- Обновление платежа
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.invoice_history (
                invoice_id,
                event_type,
                event_date,
                user_id,
                user_name,
                user_role,
                event_description,
                field_changes,
                payment_id,
                payment_status,
                payment_amount
            ) VALUES (
                v_invoice_id,
                'payment_status_changed',
                NOW(),
                v_user_id,
                v_user_name,
                v_user_role,
                format('Статус платежа изменен: %s → %s', OLD.status, NEW.status),
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'amount', NEW.total_amount
                ),
                NEW.id,
                NEW.status,
                NEW.total_amount
            );
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        -- Удаление платежа
        INSERT INTO public.invoice_history (
            invoice_id,
            event_type,
            event_date,
            user_id,
            user_name,
            user_role,
            event_description,
            field_changes,
            payment_id,
            payment_status,
            payment_amount
        ) VALUES (
            v_invoice_id,
            'payment_deleted',
            NOW(),
            v_user_id,
            v_user_name,
            v_user_role,
            format('Удален платеж на сумму %s руб.', OLD.total_amount),
            jsonb_build_object(
                'payment_id', OLD.id,
                'amount', OLD.total_amount,
                'status', OLD.status
            ),
            OLD.id,
            OLD.status,
            OLD.total_amount
        );
    END IF;

    RETURN NEW;
END;
$function$


-- Function: public.update_updated_at
-- Description: Updates updated_at timestamp to current time
CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$


-- Function: public.user_has_role
CREATE OR REPLACE FUNCTION public.user_has_role(check_role text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() 
        AND role = check_role
        AND is_active = true
    );
$function$


-- Function: realtime.apply_rls
CREATE OR REPLACE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024))
 RETURNS SETOF realtime.wal_rls
 LANGUAGE plpgsql
AS $function$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$function$


-- Function: realtime.broadcast_changes
CREATE OR REPLACE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$function$


-- Function: realtime.build_prepared_statement_sql
CREATE OR REPLACE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[])
 RETURNS text
 LANGUAGE sql
AS $function$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $function$


-- Function: realtime.cast
CREATE OR REPLACE FUNCTION realtime."cast"(val text, type_ regtype)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $function$


-- Function: realtime.check_equality_op
CREATE OR REPLACE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $function$


-- Function: realtime.is_visible_through_filters
CREATE OR REPLACE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[])
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $function$


-- Function: realtime.list_changes
CREATE OR REPLACE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer)
 RETURNS SETOF realtime.wal_rls
 LANGUAGE sql
 SET log_min_messages TO 'fatal'
AS $function$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $function$


-- Function: realtime.quote_wal2json
CREATE OR REPLACE FUNCTION realtime.quote_wal2json(entity regclass)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $function$


-- Function: realtime.send
CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      PERFORM pg_notify(
          'realtime:system',
          jsonb_build_object(
              'error', SQLERRM,
              'function', 'realtime.send',
              'event', event,
              'topic', topic,
              'private', private
          )::text
      );
  END;
END;
$function$


-- Function: realtime.subscription_check_filters
CREATE OR REPLACE FUNCTION realtime.subscription_check_filters()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $function$


-- Function: realtime.to_regrole
CREATE OR REPLACE FUNCTION realtime.to_regrole(role_name text)
 RETURNS regrole
 LANGUAGE sql
 IMMUTABLE
AS $function$ select role_name::regrole $function$


-- Function: realtime.topic
CREATE OR REPLACE FUNCTION realtime.topic()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
select nullif(current_setting('realtime.topic', true), '')::text;
$function$


-- Function: storage.add_prefixes
CREATE OR REPLACE FUNCTION storage.add_prefixes(_bucket_id text, _name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    prefixes text[];
BEGIN
    prefixes := "storage"."get_prefixes"("_name");

    IF array_length(prefixes, 1) > 0 THEN
        INSERT INTO storage.prefixes (name, bucket_id)
        SELECT UNNEST(prefixes) as name, "_bucket_id" ON CONFLICT DO NOTHING;
    END IF;
END;
$function$


-- Function: storage.can_insert_object
CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$function$


-- Function: storage.delete_prefix
CREATE OR REPLACE FUNCTION storage.delete_prefix(_bucket_id text, _name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Check if we can delete the prefix
    IF EXISTS(
        SELECT FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name") + 1
          AND "prefixes"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    )
    OR EXISTS(
        SELECT FROM "storage"."objects"
        WHERE "objects"."bucket_id" = "_bucket_id"
          AND "storage"."get_level"("objects"."name") = "storage"."get_level"("_name") + 1
          AND "objects"."name" COLLATE "C" LIKE "_name" || '/%'
        LIMIT 1
    ) THEN
    -- There are sub-objects, skip deletion
    RETURN false;
    ELSE
        DELETE FROM "storage"."prefixes"
        WHERE "prefixes"."bucket_id" = "_bucket_id"
          AND level = "storage"."get_level"("_name")
          AND "prefixes"."name" = "_name";
        RETURN true;
    END IF;
END;
$function$


-- Function: storage.delete_prefix_hierarchy_trigger
CREATE OR REPLACE FUNCTION storage.delete_prefix_hierarchy_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    prefix text;
BEGIN
    prefix := "storage"."get_prefix"(OLD."name");

    IF coalesce(prefix, '') != '' THEN
        PERFORM "storage"."delete_prefix"(OLD."bucket_id", prefix);
    END IF;

    RETURN OLD;
END;
$function$


-- Function: storage.enforce_bucket_name_length
CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$function$


-- Function: storage.extension
CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    SELECT _parts[array_length(_parts,1)] INTO _filename;
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$function$


-- Function: storage.filename
CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$function$


-- Function: storage.foldername
CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$function$


-- Function: storage.get_level
CREATE OR REPLACE FUNCTION storage.get_level(name text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
SELECT array_length(string_to_array("name", '/'), 1);
$function$


-- Function: storage.get_prefix
CREATE OR REPLACE FUNCTION storage.get_prefix(name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
AS $function$
SELECT
    CASE WHEN strpos("name", '/') > 0 THEN
             regexp_replace("name", '[\/]{1}[^\/]+\/?$', '')
         ELSE
             ''
        END;
$function$


-- Function: storage.get_prefixes
CREATE OR REPLACE FUNCTION storage.get_prefixes(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE STRICT
AS $function$
DECLARE
    parts text[];
    prefixes text[];
    prefix text;
BEGIN
    -- Split the name into parts by '/'
    parts := string_to_array("name", '/');
    prefixes := '{}';

    -- Construct the prefixes, stopping one level below the last part
    FOR i IN 1..array_length(parts, 1) - 1 LOOP
            prefix := array_to_string(parts[1:i], '/');
            prefixes := array_append(prefixes, prefix);
    END LOOP;

    RETURN prefixes;
END;
$function$


-- Function: storage.get_size_by_bucket
CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()
 RETURNS TABLE(size bigint, bucket_id text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    return query
        select sum((metadata->>'size')::bigint) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$function$


-- Function: storage.list_multipart_uploads_with_delimiter
CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)
 RETURNS TABLE(key text, id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$function$


-- Function: storage.list_objects_with_delimiter
CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text)
 RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$function$


-- Function: storage.objects_insert_prefix_trigger
CREATE OR REPLACE FUNCTION storage.objects_insert_prefix_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    NEW.level := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$function$


-- Function: storage.objects_update_prefix_trigger
CREATE OR REPLACE FUNCTION storage.objects_update_prefix_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    old_prefixes TEXT[];
BEGIN
    -- Ensure this is an update operation and the name has changed
    IF TG_OP = 'UPDATE' AND (NEW."name" <> OLD."name" OR NEW."bucket_id" <> OLD."bucket_id") THEN
        -- Retrieve old prefixes
        old_prefixes := "storage"."get_prefixes"(OLD."name");

        -- Remove old prefixes that are only used by this object
        WITH all_prefixes as (
            SELECT unnest(old_prefixes) as prefix
        ),
        can_delete_prefixes as (
             SELECT prefix
             FROM all_prefixes
             WHERE NOT EXISTS (
                 SELECT 1 FROM "storage"."objects"
                 WHERE "bucket_id" = OLD."bucket_id"
                   AND "name" <> OLD."name"
                   AND "name" LIKE (prefix || '%')
             )
         )
        DELETE FROM "storage"."prefixes" WHERE name IN (SELECT prefix FROM can_delete_prefixes);

        -- Add new prefixes
        PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    END IF;
    -- Set the new level
    NEW."level" := "storage"."get_level"(NEW."name");

    RETURN NEW;
END;
$function$


-- Function: storage.operation
CREATE OR REPLACE FUNCTION storage.operation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$function$


-- Function: storage.prefixes_insert_trigger
CREATE OR REPLACE FUNCTION storage.prefixes_insert_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    PERFORM "storage"."add_prefixes"(NEW."bucket_id", NEW."name");
    RETURN NEW;
END;
$function$


-- Function: storage.search
CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
AS $function$
declare
    can_bypass_rls BOOLEAN;
begin
    SELECT rolbypassrls
    INTO can_bypass_rls
    FROM pg_roles
    WHERE rolname = coalesce(nullif(current_setting('role', true), 'none'), current_user);

    IF can_bypass_rls THEN
        RETURN QUERY SELECT * FROM storage.search_v1_optimised(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    ELSE
        RETURN QUERY SELECT * FROM storage.search_legacy_v1(prefix, bucketname, limits, levels, offsets, search, sortcolumn, sortorder);
    END IF;
end;
$function$


-- Function: storage.search_legacy_v1
CREATE OR REPLACE FUNCTION storage.search_legacy_v1(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select path_tokens[$1] as folder
           from storage.objects
             where objects.name ilike $2 || $3 || ''%''
               and bucket_id = $4
               and array_length(objects.path_tokens, 1) <> $1
           group by folder
           order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$function$


-- Function: storage.search_v1_optimised
CREATE OR REPLACE FUNCTION storage.search_v1_optimised(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
declare
    v_order_by text;
    v_sort_order text;
begin
    case
        when sortcolumn = 'name' then
            v_order_by = 'name';
        when sortcolumn = 'updated_at' then
            v_order_by = 'updated_at';
        when sortcolumn = 'created_at' then
            v_order_by = 'created_at';
        when sortcolumn = 'last_accessed_at' then
            v_order_by = 'last_accessed_at';
        else
            v_order_by = 'name';
        end case;

    case
        when sortorder = 'asc' then
            v_sort_order = 'asc';
        when sortorder = 'desc' then
            v_sort_order = 'desc';
        else
            v_sort_order = 'asc';
        end case;

    v_order_by = v_order_by || ' ' || v_sort_order;

    return query execute
        'with folders as (
           select (string_to_array(name, ''/''))[level] as name
           from storage.prefixes
             where lower(prefixes.name) like lower($2 || $3) || ''%''
               and bucket_id = $4
               and level = $1
           order by name ' || v_sort_order || '
     )
     (select name,
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[level] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where lower(objects.name) like lower($2 || $3) || ''%''
       and bucket_id = $4
       and level = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$function$


-- Function: storage.search_v2
CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN query EXECUTE
        $sql$
        SELECT * FROM (
            (
                SELECT
                    split_part(name, '/', $4) AS key,
                    name || '/' AS name,
                    NULL::uuid AS id,
                    NULL::timestamptz AS updated_at,
                    NULL::timestamptz AS created_at,
                    NULL::jsonb AS metadata
                FROM storage.prefixes
                WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
                ORDER BY prefixes.name COLLATE "C" LIMIT $3
            )
            UNION ALL
            (SELECT split_part(name, '/', $4) AS key,
                name,
                id,
                updated_at,
                created_at,
                metadata
            FROM storage.objects
            WHERE name COLLATE "C" LIKE $1 || '%'
                AND bucket_id = $2
                AND level = $4
                AND name COLLATE "C" > $5
            ORDER BY name COLLATE "C" LIMIT $3)
        ) obj
        ORDER BY name COLLATE "C" LIMIT $3;
        $sql$
        USING prefix, bucket_name, limits, levels, start_after;
END;
$function$


-- Function: storage.update_updated_at_column
CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$function$


-- Function: supabase_functions.http_request
CREATE OR REPLACE FUNCTION supabase_functions.http_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'supabase_functions'
AS $function$
    DECLARE
      request_id bigint;
      payload jsonb;
      url text := TG_ARGV[0]::text;
      method text := TG_ARGV[1]::text;
      headers jsonb DEFAULT '{}'::jsonb;
      params jsonb DEFAULT '{}'::jsonb;
      timeout_ms integer DEFAULT 1000;
    BEGIN
      IF url IS NULL OR url = 'null' THEN
        RAISE EXCEPTION 'url argument is missing';
      END IF;

      IF method IS NULL OR method = 'null' THEN
        RAISE EXCEPTION 'method argument is missing';
      END IF;

      IF TG_ARGV[2] IS NULL OR TG_ARGV[2] = 'null' THEN
        headers = '{"Content-Type": "application/json"}'::jsonb;
      ELSE
        headers = TG_ARGV[2]::jsonb;
      END IF;

      IF TG_ARGV[3] IS NULL OR TG_ARGV[3] = 'null' THEN
        params = '{}'::jsonb;
      ELSE
        params = TG_ARGV[3]::jsonb;
      END IF;

      IF TG_ARGV[4] IS NULL OR TG_ARGV[4] = 'null' THEN
        timeout_ms = 1000;
      ELSE
        timeout_ms = TG_ARGV[4]::integer;
      END IF;

      CASE
        WHEN method = 'GET' THEN
          SELECT http_get INTO request_id FROM net.http_get(
            url,
            params,
            headers,
            timeout_ms
          );
        WHEN method = 'POST' THEN
          payload = jsonb_build_object(
            'old_record', OLD,
            'record', NEW,
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'schema', TG_TABLE_SCHEMA
          );

          SELECT http_post INTO request_id FROM net.http_post(
            url,
            payload,
            params,
            headers,
            timeout_ms
          );
        ELSE
          RAISE EXCEPTION 'method argument % is invalid', method;
      END CASE;

      INSERT INTO supabase_functions.hooks
        (hook_table_id, hook_name, request_id)
      VALUES
        (TG_RELID, TG_NAME, request_id);

      RETURN NEW;
    END
  $function$


-- Function: vault._crypto_aead_det_decrypt
CREATE OR REPLACE FUNCTION vault._crypto_aead_det_decrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_decrypt_by_id$function$


-- Function: vault._crypto_aead_det_encrypt
CREATE OR REPLACE FUNCTION vault._crypto_aead_det_encrypt(message bytea, additional bytea, key_id bigint, context bytea DEFAULT '\x7067736f6469756d'::bytea, nonce bytea DEFAULT NULL::bytea)
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_encrypt_by_id$function$


-- Function: vault._crypto_aead_det_noncegen
CREATE OR REPLACE FUNCTION vault._crypto_aead_det_noncegen()
 RETURNS bytea
 LANGUAGE c
 IMMUTABLE
AS '$libdir/supabase_vault', $function$pgsodium_crypto_aead_det_noncegen$function$


-- Function: vault.create_secret
CREATE OR REPLACE FUNCTION vault.create_secret(new_secret text, new_name text DEFAULT NULL::text, new_description text DEFAULT ''::text, new_key_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  rec record;
BEGIN
  INSERT INTO vault.secrets (secret, name, description)
  VALUES (
    new_secret,
    new_name,
    new_description
  )
  RETURNING * INTO rec;
  UPDATE vault.secrets s
  SET secret = encode(vault._crypto_aead_det_encrypt(
    message := convert_to(rec.secret, 'utf8'),
    additional := convert_to(s.id::text, 'utf8'),
    key_id := 0,
    context := 'pgsodium'::bytea,
    nonce := rec.nonce
  ), 'base64')
  WHERE id = rec.id;
  RETURN rec.id;
END
$function$


-- Function: vault.update_secret
CREATE OR REPLACE FUNCTION vault.update_secret(secret_id uuid, new_secret text DEFAULT NULL::text, new_name text DEFAULT NULL::text, new_description text DEFAULT NULL::text, new_key_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  decrypted_secret text := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = secret_id);
BEGIN
  UPDATE vault.secrets s
  SET
    secret = CASE WHEN new_secret IS NULL THEN s.secret
                  ELSE encode(vault._crypto_aead_det_encrypt(
                    message := convert_to(new_secret, 'utf8'),
                    additional := convert_to(s.id::text, 'utf8'),
                    key_id := 0,
                    context := 'pgsodium'::bytea,
                    nonce := s.nonce
                  ), 'base64') END,
    name = coalesce(new_name, s.name),
    description = coalesce(new_description, s.description),
    updated_at = now()
  WHERE s.id = secret_id;
END
$function$



-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: on_auth_user_created on auth.users
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user()

-- Trigger: update_contractors_updated_at on public.contractors
CREATE TRIGGER update_contractors_updated_at BEFORE UPDATE ON public.contractors FOR EACH ROW EXECUTE FUNCTION update_updated_at()

-- Trigger: document_history_trigger_after_insert on public.invoice_documents
CREATE TRIGGER document_history_trigger_after_insert AFTER INSERT ON public.invoice_documents FOR EACH ROW EXECUTE FUNCTION track_document_changes()

-- Trigger: document_history_trigger_before_delete on public.invoice_documents
CREATE TRIGGER document_history_trigger_before_delete BEFORE DELETE ON public.invoice_documents FOR EACH ROW EXECUTE FUNCTION track_document_changes()

-- Trigger: invoice_history_trigger on public.invoices
CREATE TRIGGER invoice_history_trigger AFTER INSERT OR DELETE OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION track_invoice_changes()

-- Trigger: invoice_history_trigger_after_insert on public.invoices
CREATE TRIGGER invoice_history_trigger_after_insert AFTER INSERT ON public.invoices FOR EACH ROW EXECUTE FUNCTION track_invoice_changes()

-- Trigger: invoice_history_trigger_after_update on public.invoices
CREATE TRIGGER invoice_history_trigger_after_update AFTER UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION track_invoice_changes()

-- Trigger: invoice_history_trigger_before_delete on public.invoices
CREATE TRIGGER invoice_history_trigger_before_delete BEFORE DELETE ON public.invoices FOR EACH ROW EXECUTE FUNCTION track_invoice_changes()

-- Trigger: trigger_recalc_invoice_amounts on public.invoices
CREATE TRIGGER trigger_recalc_invoice_amounts BEFORE INSERT OR UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION fn_recalc_invoice_amounts()

-- Trigger: update_invoices_updated_at on public.invoices
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at()

-- Trigger: calculate_payment_vat_trigger on public.payments
CREATE TRIGGER calculate_payment_vat_trigger BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION calculate_payment_vat()

-- Trigger: payment_history_trigger on public.payments
CREATE TRIGGER payment_history_trigger AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION track_payment_changes()

-- Trigger: payment_history_trigger_after_insert on public.payments
CREATE TRIGGER payment_history_trigger_after_insert AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION track_payment_changes()

-- Trigger: payment_history_trigger_after_update on public.payments
CREATE TRIGGER payment_history_trigger_after_update AFTER UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION track_payment_changes()

-- Trigger: payment_history_trigger_before_delete on public.payments
CREATE TRIGGER payment_history_trigger_before_delete BEFORE DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION track_payment_changes()

-- Trigger: tr_sync_invoice_payment_on_delete on public.payments
CREATE TRIGGER tr_sync_invoice_payment_on_delete AFTER DELETE ON public.payments FOR EACH ROW EXECUTE FUNCTION fn_sync_invoice_payment()

-- Trigger: tr_sync_invoice_payment_on_insert on public.payments
CREATE TRIGGER tr_sync_invoice_payment_on_insert AFTER INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION fn_sync_invoice_payment()

-- Trigger: tr_sync_invoice_payment_on_update on public.payments
CREATE TRIGGER tr_sync_invoice_payment_on_update AFTER UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION fn_sync_invoice_payment()

-- Trigger: trg_sync_invoice_payment on public.payments
CREATE TRIGGER trg_sync_invoice_payment AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION fn_sync_invoice_payment()

-- Trigger: update_payments_updated_at on public.payments
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at()

-- Trigger: update_projects_updated_at on public.projects
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION update_updated_at()

-- Trigger: update_roles_updated_at on public.roles
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION update_updated_at()

-- Trigger: update_statuses_updated_at on public.statuses
CREATE TRIGGER update_statuses_updated_at BEFORE UPDATE ON public.statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at()

-- Trigger: update_themes_updated_at on public.themes
CREATE TRIGGER update_themes_updated_at BEFORE UPDATE ON public.themes FOR EACH ROW EXECUTE FUNCTION update_updated_at()

-- Trigger: set_user_defaults_trigger on public.users
CREATE TRIGGER set_user_defaults_trigger BEFORE INSERT ON public.users FOR EACH ROW EXECUTE FUNCTION set_default_user_role()

-- Trigger: update_users_updated_at on public.users
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at()

-- Trigger: update_workflow_stages_updated_at on public.workflow_stages
CREATE TRIGGER update_workflow_stages_updated_at BEFORE UPDATE ON public.workflow_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at()

-- Trigger: update_workflows_updated_at on public.workflows
CREATE TRIGGER update_workflows_updated_at BEFORE UPDATE ON public.workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at()

-- Trigger: tr_check_filters on realtime.subscription
CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters()

-- Trigger: update_objects_updated_at on storage.objects
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column()


-- ============================================
-- INDEXES
-- ============================================

-- Index on _realtime.extensions
CREATE INDEX extensions_tenant_external_id_index ON _realtime.extensions USING btree (tenant_external_id);

-- Index on _realtime.extensions
CREATE UNIQUE INDEX extensions_tenant_external_id_type_index ON _realtime.extensions USING btree (tenant_external_id, type);

-- Index on _realtime.tenants
CREATE UNIQUE INDEX tenants_external_id_index ON _realtime.tenants USING btree (external_id);

-- Index on auth.audit_log_entries
CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);

-- Index on auth.flow_state
CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);

-- Index on auth.flow_state
CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);

-- Index on auth.flow_state
CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);

-- Index on auth.identities
CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);

-- Index on auth.identities
CREATE UNIQUE INDEX identities_provider_id_provider_unique ON auth.identities USING btree (provider_id, provider);

-- Index on auth.identities
CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);

-- Index on auth.mfa_amr_claims
CREATE UNIQUE INDEX amr_id_pk ON auth.mfa_amr_claims USING btree (id);

-- Index on auth.mfa_challenges
CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);

-- Index on auth.mfa_factors
CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);

-- Index on auth.mfa_factors
CREATE UNIQUE INDEX mfa_factors_last_challenged_at_key ON auth.mfa_factors USING btree (last_challenged_at);

-- Index on auth.mfa_factors
CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);

-- Index on auth.mfa_factors
CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);

-- Index on auth.mfa_factors
CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);

-- Index on auth.one_time_tokens
CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);

-- Index on auth.one_time_tokens
CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);

-- Index on auth.one_time_tokens
CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);

-- Index on auth.refresh_tokens
CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);

-- Index on auth.refresh_tokens
CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);

-- Index on auth.refresh_tokens
CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);

-- Index on auth.refresh_tokens
CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);

-- Index on auth.refresh_tokens
CREATE UNIQUE INDEX refresh_tokens_token_unique ON auth.refresh_tokens USING btree (token);

-- Index on auth.refresh_tokens
CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);

-- Index on auth.saml_providers
CREATE UNIQUE INDEX saml_providers_entity_id_key ON auth.saml_providers USING btree (entity_id);

-- Index on auth.saml_providers
CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);

-- Index on auth.saml_relay_states
CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);

-- Index on auth.saml_relay_states
CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);

-- Index on auth.saml_relay_states
CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);

-- Index on auth.sessions
CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);

-- Index on auth.sessions
CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);

-- Index on auth.sessions
CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);

-- Index on auth.sso_domains
CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));

-- Index on auth.sso_domains
CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);

-- Index on auth.sso_providers
CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));

-- Index on auth.users
CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);

-- Index on auth.users
CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);

-- Index on auth.users
CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);

-- Index on auth.users
CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);

-- Index on auth.users
CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);

-- Index on auth.users
CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);

-- Index on auth.users
CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));

-- Index on auth.users
CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);

-- Index on auth.users
CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);

-- Index on auth.users
CREATE UNIQUE INDEX users_phone_key ON auth.users USING btree (phone);

-- Index on public.attachments
CREATE INDEX idx_attachments_created_by ON public.attachments USING btree (created_by);

-- Index on public.attachments
CREATE INDEX idx_attachments_mime_type ON public.attachments USING btree (mime_type);

-- Index on public.contractor_types
CREATE UNIQUE INDEX contractor_types_code_key ON public.contractor_types USING btree (code);

-- Index on public.contractors
CREATE INDEX idx_contractors_active_name ON public.contractors USING btree (name) WHERE (is_active = true);

-- Index on public.contractors
CREATE INDEX idx_contractors_created_by ON public.contractors USING btree (created_by);

-- Index on public.contractors
CREATE INDEX idx_contractors_inn ON public.contractors USING btree (inn);

-- Index on public.contractors
CREATE UNIQUE INDEX idx_contractors_inn_unique ON public.contractors USING btree (inn) WHERE (inn IS NOT NULL);

-- Index on public.contractors
CREATE INDEX idx_contractors_is_active ON public.contractors USING btree (is_active);

-- Index on public.contractors
CREATE INDEX idx_contractors_name_active ON public.contractors USING btree (name, is_active) WHERE (is_active = true);

-- Index on public.contractors
CREATE INDEX idx_contractors_search_vector ON public.contractors USING gin (contractor_search);

-- Index on public.contractors
CREATE INDEX idx_contractors_supplier_code ON public.contractors USING btree (supplier_code);

-- Index on public.contractors
CREATE INDEX idx_contractors_type_id ON public.contractors USING btree (type_id);

-- Index on public.invoice_documents
CREATE INDEX idx_invoice_documents_attachment_id ON public.invoice_documents USING btree (attachment_id);

-- Index on public.invoice_documents
CREATE INDEX idx_invoice_documents_invoice_id ON public.invoice_documents USING btree (invoice_id);

-- Index on public.invoice_documents
CREATE UNIQUE INDEX invoice_documents_composite_key ON public.invoice_documents USING btree (invoice_id, attachment_id);

-- Index on public.invoice_history
CREATE INDEX idx_invoice_history_created_at ON public.invoice_history USING btree (created_at DESC);

-- Index on public.invoice_history
CREATE INDEX idx_invoice_history_event_date ON public.invoice_history USING btree (event_date DESC);

-- Index on public.invoice_history
CREATE INDEX idx_invoice_history_event_type ON public.invoice_history USING btree (event_type);

-- Index on public.invoice_history
CREATE INDEX idx_invoice_history_invoice_id ON public.invoice_history USING btree (invoice_id);

-- Index on public.invoice_history
CREATE INDEX idx_invoice_history_payment_id ON public.invoice_history USING btree (payment_id) WHERE (payment_id IS NOT NULL);

-- Index on public.invoice_history
CREATE INDEX idx_invoice_history_user_id ON public.invoice_history USING btree (user_id) WHERE (user_id IS NOT NULL);

-- Index on public.invoice_types
CREATE UNIQUE INDEX invoice_types_code_key ON public.invoice_types USING btree (code);

-- Index on public.invoices
CREATE INDEX idx_invoices_created_at ON public.invoices USING btree (created_at DESC);

-- Index on public.invoices
CREATE INDEX idx_invoices_created_by ON public.invoices USING btree (created_by);

-- Index on public.invoices
CREATE INDEX idx_invoices_internal_number ON public.invoices USING btree (internal_number);

-- Index on public.invoices
CREATE INDEX idx_invoices_internal_number_pattern ON public.invoices USING btree (internal_number) WHERE (internal_number IS NOT NULL);

-- Index on public.invoices
CREATE INDEX idx_invoices_invoice_date ON public.invoices USING btree (invoice_date);

-- Index on public.invoices
CREATE INDEX idx_invoices_invoice_number ON public.invoices USING btree (invoice_number);

-- Index on public.invoices
CREATE INDEX idx_invoices_material_responsible_person_id ON public.invoices USING btree (material_responsible_person_id);

-- Index on public.invoices
CREATE INDEX idx_invoices_payer_id ON public.invoices USING btree (payer_id);

-- Index on public.invoices
CREATE INDEX idx_invoices_payer_status ON public.invoices USING btree (payer_id, status) WHERE (payer_id IS NOT NULL);

-- Index on public.invoices
CREATE INDEX idx_invoices_priority ON public.invoices USING btree (priority);

-- Index on public.invoices
CREATE INDEX idx_invoices_project_id ON public.invoices USING btree (project_id);

-- Index on public.invoices
CREATE INDEX idx_invoices_project_status ON public.invoices USING btree (project_id, status) WHERE (project_id IS NOT NULL);

-- Index on public.invoices
CREATE INDEX idx_invoices_status ON public.invoices USING btree (status);

-- Index on public.invoices
CREATE INDEX idx_invoices_supplier_id ON public.invoices USING btree (supplier_id);

-- Index on public.invoices
CREATE INDEX idx_invoices_supplier_status ON public.invoices USING btree (supplier_id, status) WHERE (supplier_id IS NOT NULL);

-- Index on public.invoices
CREATE INDEX idx_invoices_total_amount ON public.invoices USING btree (total_amount) WHERE (total_amount IS NOT NULL);

-- Index on public.invoices
CREATE INDEX idx_invoices_type_id ON public.invoices USING btree (type_id);

-- Index on public.material_responsible_persons
CREATE INDEX idx_mrp_full_name ON public.material_responsible_persons USING btree (full_name);

-- Index on public.material_responsible_persons
CREATE INDEX idx_mrp_is_active ON public.material_responsible_persons USING btree (is_active);

-- Index on public.payment_workflows
CREATE INDEX idx_payment_workflows_invoice_id ON public.payment_workflows USING btree (invoice_id);

-- Index on public.payment_workflows
CREATE INDEX idx_payment_workflows_payment_id ON public.payment_workflows USING btree (payment_id);

-- Index on public.payment_workflows
CREATE INDEX idx_payment_workflows_payment_invoice ON public.payment_workflows USING btree (payment_id, invoice_id);

-- Index on public.payment_workflows
CREATE INDEX idx_payment_workflows_status ON public.payment_workflows USING btree (status);

-- Index on public.payment_workflows
CREATE INDEX idx_payment_workflows_workflow_id ON public.payment_workflows USING btree (workflow_id);

-- Index on public.payment_workflows
CREATE UNIQUE INDEX payment_workflows_payment_id_key ON public.payment_workflows USING btree (payment_id);

-- Index on public.payments
CREATE INDEX idx_payments_created_at ON public.payments USING btree (created_at DESC);

-- Index on public.payments
CREATE INDEX idx_payments_created_by ON public.payments USING btree (created_by);

-- Index on public.payments
CREATE INDEX idx_payments_internal_number ON public.payments USING btree (internal_number);

-- Index on public.payments
CREATE INDEX idx_payments_internal_number_pattern ON public.payments USING btree (internal_number) WHERE (internal_number IS NOT NULL);

-- Index on public.payments
CREATE INDEX idx_payments_invoice_id ON public.payments USING btree (invoice_id);

-- Index on public.payments
CREATE INDEX idx_payments_payer_id ON public.payments USING btree (payer_id);

-- Index on public.payments
CREATE INDEX idx_payments_payment_date ON public.payments USING btree (payment_date);

-- Index on public.payments
CREATE INDEX idx_payments_status ON public.payments USING btree (status);

-- Index on public.payments
CREATE INDEX idx_payments_status_invoice ON public.payments USING btree (status, invoice_id);

-- Index on public.payments
CREATE INDEX idx_payments_status_invoice_id ON public.payments USING btree (status, invoice_id);

-- Index on public.payments
CREATE INDEX idx_payments_total_amount ON public.payments USING btree (total_amount);

-- Index on public.payments
CREATE INDEX idx_payments_type_id ON public.payments USING btree (type_id);

-- Index on public.payments
CREATE INDEX idx_payments_vat_rate ON public.payments USING btree (vat_rate);

-- Index on public.projects
CREATE INDEX idx_projects_active_name ON public.projects USING btree (name) WHERE (is_active = true);

-- Index on public.projects
CREATE INDEX idx_projects_is_active ON public.projects USING btree (is_active);

-- Index on public.projects
CREATE INDEX idx_projects_project_code ON public.projects USING btree (project_code);

-- Index on public.roles
CREATE INDEX idx_roles_active ON public.roles USING btree (is_active);

-- Index on public.roles
CREATE INDEX idx_roles_code ON public.roles USING btree (code);

-- Index on public.roles
CREATE INDEX idx_roles_view_own_project_only ON public.roles USING btree (view_own_project_only);

-- Index on public.roles
CREATE UNIQUE INDEX roles_code_key ON public.roles USING btree (code);

-- Index on public.statuses
CREATE INDEX statuses_active_idx ON public.statuses USING btree (is_active) WHERE (is_active = true);

-- Index on public.statuses
CREATE UNIQUE INDEX statuses_entity_code_ux ON public.statuses USING btree (entity_type, code);

-- Index on public.statuses
CREATE INDEX statuses_entity_idx ON public.statuses USING btree (entity_type);

-- Index on public.statuses
CREATE INDEX statuses_order_idx ON public.statuses USING btree (order_index);

-- Index on public.themes
CREATE INDEX idx_themes_created_at ON public.themes USING btree (created_at);

-- Index on public.themes
CREATE INDEX idx_themes_is_active ON public.themes USING btree (is_active);

-- Index on public.themes
CREATE INDEX idx_themes_is_default ON public.themes USING btree (is_default) WHERE (is_default = true);

-- Index on public.themes
CREATE INDEX idx_themes_is_global ON public.themes USING btree (is_global) WHERE (is_global = true);

-- Index on public.themes
CREATE INDEX idx_themes_name ON public.themes USING btree (name);

-- Index on public.themes
CREATE UNIQUE INDEX idx_themes_unique_default_per_user ON public.themes USING btree (user_id) WHERE ((is_default = true) AND (is_active = true) AND (is_global = false));

-- Index on public.themes
CREATE UNIQUE INDEX idx_themes_unique_global_default ON public.themes USING btree (is_global) WHERE ((is_global = true) AND (is_default = true) AND (is_active = true));

-- Index on public.themes
CREATE INDEX idx_themes_user_id ON public.themes USING btree (user_id);

-- Index on public.users
CREATE INDEX idx_users_email ON public.users USING btree (email);

-- Index on public.users
CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);

-- Index on public.users
CREATE INDEX idx_users_project_ids ON public.users USING gin (project_ids);

-- Index on public.users
CREATE INDEX idx_users_role_id ON public.users USING btree (role_id) WHERE (role_id IS NOT NULL);

-- Index on public.users
CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

-- Index on public.workflow_approval_progress
CREATE INDEX idx_workflow_approval_progress_created_at ON public.workflow_approval_progress USING btree (created_at);

-- Index on public.workflow_approval_progress
CREATE INDEX idx_workflow_approval_progress_user_created ON public.workflow_approval_progress USING btree (user_id, created_at DESC);

-- Index on public.workflow_approval_progress
CREATE INDEX idx_workflow_approval_progress_user_id ON public.workflow_approval_progress USING btree (user_id);

-- Index on public.workflow_approval_progress
CREATE INDEX idx_workflow_approval_progress_workflow_action ON public.workflow_approval_progress USING btree (workflow_id, action);

-- Index on public.workflow_approval_progress
CREATE INDEX idx_workflow_approval_progress_workflow_id ON public.workflow_approval_progress USING btree (workflow_id);

-- Index on public.workflow_stages
CREATE INDEX idx_workflow_stages_position ON public.workflow_stages USING btree (workflow_id, "position");

-- Index on public.workflow_stages
CREATE INDEX idx_workflow_stages_type ON public.workflow_stages USING btree (stage_type);

-- Index on public.workflow_stages
CREATE INDEX idx_workflow_stages_workflow_id ON public.workflow_stages USING btree (workflow_id);

-- Index on public.workflows
CREATE INDEX idx_workflows_invoice_types ON public.workflows USING gin (invoice_type_ids);

-- Index on public.workflows
CREATE INDEX idx_workflows_is_active ON public.workflows USING btree (is_active);

-- Index on realtime.subscription
CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);

-- Index on realtime.subscription
CREATE UNIQUE INDEX pk_subscription ON realtime.subscription USING btree (id);

-- Index on realtime.subscription
CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);

-- Index on storage.buckets
CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);

-- Index on storage.iceberg_namespaces
CREATE UNIQUE INDEX idx_iceberg_namespaces_bucket_id ON storage.iceberg_namespaces USING btree (bucket_id, name);

-- Index on storage.iceberg_tables
CREATE UNIQUE INDEX idx_iceberg_tables_namespace_id ON storage.iceberg_tables USING btree (namespace_id, name);

-- Index on storage.migrations
CREATE UNIQUE INDEX migrations_name_key ON storage.migrations USING btree (name);

-- Index on storage.objects
CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);

-- Index on storage.objects
CREATE UNIQUE INDEX idx_name_bucket_level_unique ON storage.objects USING btree (name COLLATE "C", bucket_id, level);

-- Index on storage.objects
CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");

-- Index on storage.objects
CREATE INDEX idx_objects_lower_name ON storage.objects USING btree ((path_tokens[level]), lower(name) text_pattern_ops, bucket_id, level);

-- Index on storage.objects
CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);

-- Index on storage.objects
CREATE UNIQUE INDEX objects_bucket_id_level_idx ON storage.objects USING btree (bucket_id, level, name COLLATE "C");

-- Index on storage.prefixes
CREATE INDEX idx_prefixes_lower_name ON storage.prefixes USING btree (bucket_id, level, ((string_to_array(name, '/'::text))[level]), lower(name) text_pattern_ops);

-- Index on storage.s3_multipart_uploads
CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);

-- Index on supabase_functions.hooks
CREATE INDEX supabase_functions_hooks_h_table_id_h_name_idx ON supabase_functions.hooks USING btree (hook_table_id, hook_name);

-- Index on supabase_functions.hooks
CREATE INDEX supabase_functions_hooks_request_id_idx ON supabase_functions.hooks USING btree (request_id);

-- Index on vault.secrets
CREATE UNIQUE INDEX secrets_name_idx ON vault.secrets USING btree (name) WHERE (name IS NOT NULL);


-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Storage Bucket: documents
-- Public: True
-- File Size Limit: 10485760 bytes
-- Allowed MIME Types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, image/jpeg, image/jpg, image/png, image/gif, image/bmp, text/plain, text/html, text/csv
-- INSERT INTO storage.buckets (name, public, file_size_limit, allowed_mime_types)
-- VALUES ('documents', True, 10485760, 
--        ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'text/plain', 'text/html', 'text/csv']::text[]);
