-- =====================================================
-- DATABASE SCHEMA - Budget Tracking Application
-- Using Supabase Auth (built-in)
-- =====================================================

-- =====================================================
-- UUID HELPER FUNCTIONS
-- =====================================================

-- Create UUID with custom prefix (up to 8 chars) replacing first 8 chars of gen_random_uuid()
-- Example: make_id('01aaaaaa') → 01aaaaaa-xxxx-xxxx-xxxx-xxxxxxxxxxxx
-- UUID Prefix Convention (by table creation order):
-- 01aaaaaa = user_profiles
-- 02aaaaaa = categories
-- 03aaaaaa = receipt_images
-- 04aaaaaa = receipts
-- 05aaaaaa = (reserved for ocr_results - uses receipt_id as FK)
-- 06aaaaaa = receipt_line_items
-- 07aaaaaa = budgets
-- 08aaaaaa = budget_category_allocations
-- 09aaaaaa = recommendation_runs
-- 10aaaaaa = recommended_allocations
-- 11aaaaaa = ai_recommendation_history
-- 12aaaaaa = transactions
-- 13aaaaaa = savings_goals
-- 14aaaaaa = notifications
-- 15aaaaaa = budget_warnings
-- 16aaaaaa = scan_logs
-- 17aaaaaa = feedbacks
-- 18aaaaaa = push_tokens
-- 19aaaaaa = notification_campaigns
-- 20aaaaaa = audit_logs
-- 21aaaaaa = otps
-- 22aaaaaa = report_exports

CREATE OR REPLACE FUNCTION make_id(prefix TEXT)
RETURNS UUID AS $$
BEGIN
    -- gen_random_uuid() = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 chars total)
    -- Replace first 8 chars with prefix, then append rest of UUID
    RETURN (
        LOWER(SUBSTR(prefix, 1, 8)) ||
        SUBSTR(gen_random_uuid()::TEXT, 9)
    )::UUID;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Alias for compatibility (same function, different name)
CREATE OR REPLACE FUNCTION prefixed_id(prefix TEXT)
RETURNS UUID AS $$
    SELECT make_id(prefix);
$$ LANGUAGE sql IMMUTABLE;

-- =====================================================
-- NOTE: auth.users, auth.sessions, auth.refresh_tokens
-- are provided by Supabase Auth - NO NEED TO CREATE
-- =====================================================

-- =====================================================
-- 1. USER_PROFILES
-- =====================================================
CREATE TABLE user_profiles (
    user_id uuid NOT NULL,
    full_name character varying NOT NULL,
    date_of_birth date,
    job text,
    initial_income integer,
    currency_code character DEFAULT 'VND'::bpchar,
    locale character varying NOT NULL DEFAULT 'vi-VN'::character varying,
    time_zone character varying NOT NULL DEFAULT 'Asia/Ho_Chi_Minh'::character varying,
    avatar_url text,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    is_admin boolean NOT NULL DEFAULT false,
    account_status character varying NOT NULL DEFAULT 'active'::character varying CHECK (account_status::text = ANY (ARRAY['active'::character varying, 'inactive'::character varying, 'banned'::character varying]::text[])),
    CONSTRAINT user_profiles_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE user_profiles IS 'Extended user profile information linked to Supabase auth.users';

-- =====================================================
-- 2. CATEGORIES (prefix: 02aaaaaa)
-- =====================================================
CREATE TABLE categories (
    category_id uuid NOT NULL DEFAULT make_id('02aaaaaa'),
    user_id uuid,
    name character varying NOT NULL,
    type character varying NOT NULL CHECK (type::text = ANY (ARRAY['expense'::character varying, 'income'::character varying]::text[])),
    icon character varying,
    color character varying,
    is_default boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    parent_id uuid,
    sort_order integer,
    CONSTRAINT categories_pkey PRIMARY KEY (category_id),
    CONSTRAINT categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT categories_parent_category_id_fkey FOREIGN KEY (parent_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

COMMENT ON TABLE categories IS 'Budget categories for income and expenses';

-- =====================================================
-- 3. RECEIPT_IMAGES (prefix: 03aaaaaa)
-- =====================================================
CREATE TABLE receipt_images (
    receipt_image_id uuid NOT NULL DEFAULT make_id('03aaaaaa'),
    user_id uuid NOT NULL,
    storage_url text NOT NULL,
    content_type character varying,
    file_size_bytes integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT receipt_images_pkey PRIMARY KEY (receipt_image_id),
    CONSTRAINT receipt_images_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE receipt_images IS 'Uploaded receipt images stored in object storage';

-- =====================================================
-- 4. RECEIPTS (prefix: 04aaaaaa)
-- =====================================================
CREATE TABLE receipts (
    receipt_id uuid NOT NULL DEFAULT make_id('04aaaaaa'),
    user_id uuid NOT NULL,
    receipt_image_id uuid,
    merchant_name text,
    purchase_date date NOT NULL,
    total_amount numeric NOT NULL,
    currency_code character NOT NULL DEFAULT 'VND'::bpchar,
    payment_method character varying,
    status character varying NOT NULL DEFAULT 'parsed'::character varying CHECK (status::text = ANY (ARRAY['parsed'::character varying, 'confirmed'::character varying, 'ignored'::character varying]::text[])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT receipts_pkey PRIMARY KEY (receipt_id),
    CONSTRAINT receipts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT receipts_receipt_image_id_fkey FOREIGN KEY (receipt_image_id) REFERENCES receipt_images(receipt_image_id) ON DELETE SET NULL
);

COMMENT ON TABLE receipts IS 'Receipt records extracted from images or entered manually';

-- =====================================================
-- 5. OCR_RESULTS (no prefix - PK is receipt_id FK)
-- =====================================================
CREATE TABLE ocr_results (
    receipt_id uuid NOT NULL,
    ocr_engine character varying NOT NULL,
    ocr_version character varying,
    extracted_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
    raw_text text,
    processed_at timestamp with time zone NOT NULL DEFAULT now(),
    confidence numeric CHECK (confidence >= 0::numeric AND confidence <= 1::numeric),
    completed_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT ocr_results_pkey PRIMARY KEY (receipt_id),
    CONSTRAINT ocr_results_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id) ON DELETE CASCADE
);

COMMENT ON TABLE ocr_results IS 'OCR processing results for receipts';

-- =====================================================
-- 6. RECEIPT_LINE_ITEMS (prefix: 06aaaaaa)
-- =====================================================
CREATE TABLE receipt_line_items (
    receipt_line_item_id uuid NOT NULL DEFAULT make_id('06aaaaaa'),
    receipt_id uuid NOT NULL,
    line_number integer NOT NULL,
    item_name text NOT NULL,
    quantity numeric NOT NULL DEFAULT 1,
    unit_price numeric NOT NULL,
    line_total numeric NOT NULL,
    CONSTRAINT receipt_line_items_pkey PRIMARY KEY (receipt_line_item_id),
    CONSTRAINT receipt_line_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id) ON DELETE CASCADE
);

COMMENT ON TABLE receipt_line_items IS 'Individual line items parsed from receipts';

-- =====================================================
-- 7. BUDGETS (prefix: 07aaaaaa)
-- =====================================================
CREATE TABLE budgets (
    budget_id uuid NOT NULL DEFAULT make_id('07aaaaaa'),
    user_id uuid NOT NULL,
    year integer NOT NULL,
    month integer NOT NULL CHECK (month >= 1 AND month <= 12),
    total_budget_amount numeric NOT NULL DEFAULT 0 CHECK (total_budget_amount >= 0::numeric),
    currency_code character NOT NULL DEFAULT 'VND'::bpchar,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    expected_income_amount numeric,
    expected_income_currency_code character,
    income_frequency character varying CHECK (income_frequency::text = ANY (ARRAY['monthly'::character varying, 'biweekly'::character varying, 'weekly'::character varying, 'one_off'::character varying]::text[])),
    CONSTRAINT budgets_pkey PRIMARY KEY (budget_id),
    CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_year_month UNIQUE (user_id, year, month)
);

COMMENT ON TABLE budgets IS 'Monthly budget plans with expected income';

-- =====================================================
-- 8. BUDGET_CATEGORY_ALLOCATIONS (prefix: 08aaaaaa)
-- =====================================================
CREATE TABLE budget_category_allocations (
    budget_category_allocation_id uuid NOT NULL DEFAULT make_id('08aaaaaa'),
    budget_id uuid NOT NULL,
    category_id uuid NOT NULL,
    allocated_amount numeric NOT NULL DEFAULT 0 CHECK (allocated_amount >= 0::numeric),
    spent_amount numeric NOT NULL DEFAULT 0 CHECK (spent_amount >= 0::numeric),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT budget_category_allocations_pkey PRIMARY KEY (budget_category_allocation_id),
    CONSTRAINT budget_category_allocations_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES budgets(budget_id) ON DELETE CASCADE,
    CONSTRAINT budget_category_allocations_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT uq_budget_category UNIQUE (budget_id, category_id)
);

COMMENT ON TABLE budget_category_allocations IS 'Budget allocation per category with spent tracking';

-- =====================================================
-- 9. RECOMMENDATION_RUNS (prefix: 09aaaaaa)
-- =====================================================
CREATE TABLE recommendation_runs (
    recommendation_run_id uuid NOT NULL DEFAULT make_id('09aaaaaa'),
    user_id uuid NOT NULL,
    budget_id uuid NOT NULL,
    model_name character varying NOT NULL,
    model_version character varying,
    input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
    status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying]::text[])),
    failure_reason text,
    started_at timestamp with time zone NOT NULL DEFAULT now(),
    completed_at timestamp with time zone,
    CONSTRAINT recommendation_runs_pkey PRIMARY KEY (recommendation_run_id),
    CONSTRAINT recommendation_runs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT recommendation_runs_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES budgets(budget_id) ON DELETE CASCADE
);

COMMENT ON TABLE recommendation_runs IS 'AI recommendation model execution logs';

-- =====================================================
-- 10. RECOMMENDED_ALLOCATIONS (prefix: 10aaaaaa)
-- =====================================================
CREATE TABLE recommended_allocations (
    recommended_allocation_id uuid NOT NULL DEFAULT make_id('10aaaaaa'),
    recommendation_run_id uuid NOT NULL,
    category_id uuid NOT NULL,
    recommended_amount numeric NOT NULL,
    confidence numeric CHECK (confidence >= 0::numeric AND confidence <= 1::numeric),
    CONSTRAINT recommended_allocations_pkey PRIMARY KEY (recommended_allocation_id),
    CONSTRAINT recommended_allocations_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT recommended_allocations_recommendation_run_id_fkey FOREIGN KEY (recommendation_run_id) REFERENCES recommendation_runs(recommendation_run_id) ON DELETE CASCADE
);

COMMENT ON TABLE recommended_allocations IS 'AI-suggested budget allocations per category';

-- =====================================================
-- 11. AI_RECOMMENDATION_HISTORY (prefix: 11aaaaaa)
-- =====================================================
CREATE TABLE ai_recommendation_history (
    ai_recommendation_history_id uuid NOT NULL DEFAULT make_id('11aaaaaa'),
    recommendation_run_id uuid NOT NULL,
    event_type character varying NOT NULL CHECK (event_type::text = ANY (ARRAY['created'::character varying, 'updated'::character varying, 'accepted'::character varying, 'rejected'::character varying]::text[])),
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT ai_recommendation_history_pkey PRIMARY KEY (ai_recommendation_history_id),
    CONSTRAINT ai_recommendation_history_recommendation_run_id_fkey FOREIGN KEY (recommendation_run_id) REFERENCES recommendation_runs(recommendation_run_id) ON DELETE CASCADE
);

COMMENT ON TABLE ai_recommendation_history IS 'Event log for recommendation lifecycle';

-- =====================================================
-- 12. TRANSACTIONS (prefix: 12aaaaaa)
-- =====================================================
CREATE TABLE transactions (
    transaction_id uuid NOT NULL DEFAULT make_id('12aaaaaa'),
    user_id uuid NOT NULL,
    category_id uuid NOT NULL,
    receipt_id uuid,
    receipt_line_item_id uuid,
    name text,
    description text NOT NULL,
    note text,
    amount numeric NOT NULL,
    currency_code character NOT NULL DEFAULT 'VND'::bpchar,
    type character varying NOT NULL DEFAULT 'expense'::character varying CHECK (type::text = ANY (ARRAY['income'::character varying, 'expense'::character varying]::text[])),
    transaction_date timestamp with time zone NOT NULL,
    payment_method character varying,
    source character varying NOT NULL CHECK (source::text = ANY (ARRAY['manual'::character varying, 'ocr'::character varying]::text[])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT transactions_pkey PRIMARY KEY (transaction_id),
    CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT expenses_category_id_fkey FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT,
    CONSTRAINT expenses_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id) ON DELETE SET NULL,
    CONSTRAINT expenses_receipt_line_item_id_fkey FOREIGN KEY (receipt_line_item_id) REFERENCES receipt_line_items(receipt_line_item_id) ON DELETE SET NULL
);

COMMENT ON TABLE transactions IS 'Individual transaction records (income and expenses)';

-- =====================================================
-- 13. SAVINGS_GOALS (prefix: 13aaaaaa)
-- =====================================================
CREATE TABLE savings_goals (
    savings_goal_id uuid NOT NULL DEFAULT make_id('13aaaaaa'),
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    target_amount numeric NOT NULL,
    current_amount numeric NOT NULL DEFAULT 0,
    currency_code character NOT NULL DEFAULT 'VND'::bpchar,
    target_date date,
    status character varying NOT NULL DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'paused'::character varying, 'achieved'::character varying, 'cancelled'::character varying]::text[])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT savings_goals_pkey PRIMARY KEY (savings_goal_id),
    CONSTRAINT savings_goals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE savings_goals IS 'Savings goals with progress tracking';

-- =====================================================
-- 14. NOTIFICATION_CAMPAIGNS (prefix: 19aaaaaa)
-- Note: Created before notifications due to FK dependency
-- =====================================================
CREATE TABLE notification_campaigns (
    campaign_id uuid NOT NULL DEFAULT make_id('19aaaaaa'),
    title text NOT NULL,
    body text NOT NULL,
    target_audience character varying NOT NULL CHECK (target_audience::text = ANY (ARRAY['all_users'::character varying, 'specific_users'::character varying]::text[])),
    status character varying NOT NULL DEFAULT 'draft'::character varying CHECK (status::text = ANY (ARRAY['sent'::character varying, 'scheduled'::character varying, 'failed'::character varying, 'canceled'::character varying]::text[])),
    scheduled_at timestamp with time zone,
    sent_at timestamp with time zone,
    created_by uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT notification_campaigns_pkey PRIMARY KEY (campaign_id),
    CONSTRAINT notification_campaigns_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE notification_campaigns IS 'Admin push notification campaigns';

-- =====================================================
-- 15. NOTIFICATIONS (prefix: 14aaaaaa)
-- =====================================================
CREATE TABLE notifications (
    notification_id uuid NOT NULL DEFAULT make_id('14aaaaaa'),
    user_id uuid NOT NULL,
    type character varying NOT NULL,
    title character varying NOT NULL,
    body text,
    data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    read_at timestamp with time zone,
    is_read boolean NOT NULL DEFAULT false,
    campaign_id uuid,
    deleted_at timestamp with time zone,
    CONSTRAINT notifications_pkey PRIMARY KEY (notification_id),
    CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT notifications_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(campaign_id) ON DELETE SET NULL
);

COMMENT ON TABLE notifications IS 'User notifications for budget alerts and updates';

-- =====================================================
-- 16. BUDGET_WARNINGS (prefix: 15aaaaaa)
-- =====================================================
CREATE TABLE budget_warnings (
    warning_id uuid NOT NULL DEFAULT make_id('15aaaaaa'),
    user_id uuid NOT NULL,
    budget_category_allocation_id uuid,
    triggered_by_transaction_id uuid,
    warning_type character varying NOT NULL CHECK (warning_type::text = ANY (ARRAY['80%'::character varying, '100%'::character varying, 'over'::character varying]::text[])),
    message text,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT budget_warnings_pkey PRIMARY KEY (warning_id),
    CONSTRAINT budget_warnings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT budget_warnings_budget_category_allocation_id_fkey FOREIGN KEY (budget_category_allocation_id) REFERENCES budget_category_allocations(budget_category_allocation_id) ON DELETE SET NULL,
    CONSTRAINT budget_warnings_triggered_by_transaction_id_fkey FOREIGN KEY (triggered_by_transaction_id) REFERENCES transactions(transaction_id) ON DELETE SET NULL
);

COMMENT ON TABLE budget_warnings IS 'Budget threshold warning notifications';

-- =====================================================
-- 17. SCAN_LOGS (prefix: 16aaaaaa)
-- =====================================================
CREATE TABLE scan_logs (
    scan_log_id uuid NOT NULL DEFAULT make_id('16aaaaaa'),
    user_id uuid NOT NULL,
    receipt_id uuid,
    ocr_result_id uuid,
    status character varying NOT NULL CHECK (status::text = ANY (ARRAY['success'::character varying, 'failed'::character varying, 'reviewed'::character varying]::text[])),
    extracted_amount numeric,
    extracted_merchant text,
    suggested_category_id uuid,
    final_category_id uuid,
    confidence_score numeric,
    error_code text,
    error_message text,
    is_reviewed boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    raw_receipt_image_url text,
    raw_text text,
    extracted_fields jsonb DEFAULT '{}'::jsonb,
    model_name character varying,
    processing_time_ms integer CHECK (processing_time_ms IS NULL OR processing_time_ms >= 0),
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    relabeled_category_id uuid,
    relabel_notes text,
    CONSTRAINT scan_logs_pkey PRIMARY KEY (scan_log_id),
    CONSTRAINT scan_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT scan_logs_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES receipts(receipt_id) ON DELETE SET NULL,
    CONSTRAINT scan_logs_ocr_result_id_fkey FOREIGN KEY (ocr_result_id) REFERENCES ocr_results(receipt_id) ON DELETE SET NULL,
    CONSTRAINT scan_logs_suggested_category_id_fkey FOREIGN KEY (suggested_category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    CONSTRAINT scan_logs_final_category_id_fkey FOREIGN KEY (final_category_id) REFERENCES categories(category_id) ON DELETE SET NULL,
    CONSTRAINT scan_logs_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT scan_logs_relabeled_category_id_fkey FOREIGN KEY (relabeled_category_id) REFERENCES categories(category_id) ON DELETE SET NULL
);

COMMENT ON TABLE scan_logs IS 'OCR scan logs for auditing and AI improvement';

-- =====================================================
-- 18. FEEDBACKS (prefix: 17aaaaaa)
-- =====================================================
CREATE TABLE feedbacks (
    feedback_id uuid NOT NULL DEFAULT make_id('17aaaaaa'),
    user_id uuid NOT NULL,
    category character varying NOT NULL CHECK (category IS NULL OR length(btrim(category::text)) >= 1 AND length(btrim(category::text)) <= 100),
    subject text NOT NULL,
    content text NOT NULL,
    attachment_url text,
    status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (lower(replace(status::text, ' '::text, '_'::text)) = ANY (ARRAY['pending'::text, 'in_progress'::text, 'resolved'::text, 'closed'::text, 'open'::text, 'new'::text, 'done'::text])),
    admin_response text,
    responded_at timestamp with time zone,
    responded_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    user_email text,
    priority character varying DEFAULT 'medium'::character varying CHECK (priority IS NULL OR (lower(priority::text) = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    internal_notes text,
    technical_notes text,
    related_module character varying,
    dev_status character varying,
    dev_email text,
    dev_tracking_id text,
    forwarded_to_dev_at timestamp with time zone,
    forwarded_to_dev_by uuid,
    CONSTRAINT feedbacks_pkey PRIMARY KEY (feedback_id),
    CONSTRAINT feedbacks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT feedbacks_responded_by_fkey FOREIGN KEY (responded_by) REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT feedbacks_forwarded_to_dev_by_fkey FOREIGN KEY (forwarded_to_dev_by) REFERENCES user_profiles(user_id) ON DELETE SET NULL
);

COMMENT ON TABLE feedbacks IS 'User feedback and support requests with developer tracking';

-- =====================================================
-- 19. PUSH_TOKENS (prefix: 18aaaaaa)
-- =====================================================
CREATE TABLE push_tokens (
    push_token_id uuid NOT NULL DEFAULT make_id('18aaaaaa'),
    user_id uuid NOT NULL,
    token text NOT NULL UNIQUE,
    device_type character varying NOT NULL CHECK (device_type::text = ANY (ARRAY['ios'::character varying, 'android'::character varying, 'web'::character varying]::text[])),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT push_tokens_pkey PRIMARY KEY (push_token_id),
    CONSTRAINT push_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE push_tokens IS 'Device push notification tokens';

-- =====================================================
-- 20. AUDIT_LOGS (prefix: 20aaaaaa)
-- =====================================================
CREATE TABLE audit_logs (
    audit_log_id uuid NOT NULL DEFAULT make_id('20aaaaaa'),
    admin_id uuid NOT NULL,
    action text NOT NULL,
    target_type text,
    target_id uuid,
    metadata jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_log_id),
    CONSTRAINT audit_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE audit_logs IS 'Admin action audit trail';

-- =====================================================
-- 21. OTPS (prefix: 21aaaaaa)
-- =====================================================
CREATE TABLE otps (
    otp_id uuid NOT NULL DEFAULT make_id('21aaaaaa'),
    email text NOT NULL,
    code text NOT NULL,
    purpose character varying NOT NULL CHECK (purpose::text = ANY (ARRAY['register'::character varying, 'reset_password'::character varying, 'change_password'::character varying]::text[])),
    expires_at timestamp with time zone NOT NULL,
    is_used boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT otps_pkey PRIMARY KEY (otp_id)
);

COMMENT ON TABLE otps IS 'One-time passwords for authentication';

-- =====================================================
-- 22. REPORT_EXPORTS (prefix: 22aaaaaa)
-- =====================================================
CREATE TABLE report_exports (
    report_export_id uuid NOT NULL DEFAULT make_id('22aaaaaa'),
    user_id uuid NOT NULL,
    export_type character varying NOT NULL CHECK (export_type::text = ANY (ARRAY['excel'::character varying, 'xlsx'::character varying, 'report'::character varying, 'monthly_report'::character varying, 'transactions'::character varying, 'csv'::character varying, 'pdf'::character varying]::text[])),
    period_start date NOT NULL,
    period_end date NOT NULL,
    file_url text,
    status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['success'::character varying, 'completed'::character varying, 'ready'::character varying, 'done'::character varying, 'generated'::character varying, 'finished'::character varying, 'pending'::character varying, 'failed'::character varying]::text[])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT report_exports_pkey PRIMARY KEY (report_export_id),
    CONSTRAINT report_exports_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

COMMENT ON TABLE report_exports IS 'Financial report export requests';

-- =====================================================
-- 23. USER_NOTIFICATION_SETTINGS
-- =====================================================
CREATE TABLE user_notification_settings (
    user_id uuid NOT NULL,
    push_enabled boolean NOT NULL DEFAULT true,
    daily_reminder_enabled boolean NOT NULL DEFAULT false,
    reminder_frequency character varying NOT NULL DEFAULT 'everyday'::character varying CHECK (reminder_frequency::text = ANY (ARRAY['everyday'::character varying, 'fixed_date'::character varying]::text[])),
    reminder_time time without time zone,
    reminder_date timestamp with time zone,
    expo_push_token text,
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_notification_settings_pkey PRIMARY KEY (user_id),
    CONSTRAINT user_notification_settings_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

COMMENT ON TABLE user_notification_settings IS 'User notification preferences';

-- =====================================================
-- 24. NOTIFICATION_CAMPAIGN_TARGETS
-- =====================================================
CREATE TABLE notification_campaign_targets (
    campaign_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT notification_campaign_targets_pkey PRIMARY KEY (campaign_id, user_id),
    CONSTRAINT notification_campaign_targets_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES notification_campaigns(campaign_id) ON DELETE CASCADE,
    CONSTRAINT notification_campaign_targets_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

COMMENT ON TABLE notification_campaign_targets IS 'Target users for notification campaigns';

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_purchase_date ON receipts(purchase_date);
CREATE INDEX idx_receipt_line_items_receipt_id ON receipt_line_items(receipt_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_category_id ON transactions(category_id);
CREATE INDEX idx_transactions_transaction_date ON transactions(transaction_date);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_budgets_year_month ON budgets(year, month);
CREATE INDEX idx_categories_user_id ON categories(user_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read_at) WHERE read_at IS NULL;
CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = false;
CREATE INDEX idx_savings_goals_user_id ON savings_goals(user_id);
CREATE INDEX idx_savings_goals_status ON savings_goals(status);
CREATE INDEX idx_recommendation_runs_user_id ON recommendation_runs(user_id);
CREATE INDEX idx_recommendation_runs_status ON recommendation_runs(status);
CREATE INDEX idx_budget_warnings_user_id ON budget_warnings(user_id);
CREATE INDEX idx_budget_warnings_is_read ON budget_warnings(is_read) WHERE is_read = false;
CREATE INDEX idx_scan_logs_user_id ON scan_logs(user_id);
CREATE INDEX idx_scan_logs_status ON scan_logs(status);
CREATE INDEX idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX idx_feedbacks_status ON feedbacks(status);
CREATE INDEX idx_push_tokens_user_id ON push_tokens(user_id);
CREATE INDEX idx_notification_campaigns_status ON notification_campaigns(status);
CREATE INDEX idx_audit_logs_admin_id ON audit_logs(admin_id);
CREATE INDEX idx_otps_email ON otps(email);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at
    BEFORE UPDATE ON receipts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
    BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_category_allocations_updated_at
    BEFORE UPDATE ON budget_category_allocations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_savings_goals_updated_at
    BEFORE UPDATE ON savings_goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_push_tokens_updated_at
    BEFORE UPDATE ON push_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_notification_settings_updated_at
    BEFORE UPDATE ON user_notification_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_category_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommended_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_recommendation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_campaign_targets ENABLE ROW LEVEL SECURITY;

-- Policies - Users can only see their own data
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own categories" ON categories
    FOR SELECT USING (user_id IS NULL OR auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON categories
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own receipt images" ON receipt_images
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own receipts" ON receipts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own ocr results" ON ocr_results
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM receipts WHERE receipts.receipt_id = ocr_results.receipt_id AND receipts.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage own receipt line items" ON receipt_line_items
    FOR ALL USING (EXISTS (
        SELECT 1 FROM receipts WHERE receipts.receipt_id = receipt_line_items.receipt_id AND receipts.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage own budgets" ON budgets
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own budget allocations" ON budget_category_allocations
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM budgets WHERE budgets.budget_id = budget_category_allocations.budget_id AND budgets.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage own budget allocations" ON budget_category_allocations
    FOR ALL USING (EXISTS (
        SELECT 1 FROM budgets WHERE budgets.budget_id = budget_category_allocations.budget_id AND budgets.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage own recommendation runs" ON recommendation_runs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own recommended allocations" ON recommended_allocations
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM recommendation_runs WHERE recommendation_runs.recommendation_run_id = recommended_allocations.recommendation_run_id AND recommendation_runs.user_id = auth.uid()
    ));

CREATE POLICY "Users can view own ai history" ON ai_recommendation_history
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM recommendation_runs WHERE recommendation_runs.recommendation_run_id = ai_recommendation_history.recommendation_run_id AND recommendation_runs.user_id = auth.uid()
    ));

CREATE POLICY "Users can manage own transactions" ON transactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own savings goals" ON savings_goals
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notifications" ON notifications
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own budget warnings" ON budget_warnings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own scan logs" ON scan_logs
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own feedbacks" ON feedbacks
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can update own feedbacks" ON feedbacks
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedbacks" ON feedbacks
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = TRUE)
    );

CREATE POLICY "Admins can respond to feedbacks" ON feedbacks
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = TRUE)
    );

CREATE POLICY "Users can manage own push tokens" ON push_tokens
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage notification campaigns" ON notification_campaigns
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = TRUE)
    );

CREATE POLICY "Admins can view audit logs" ON audit_logs
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = TRUE)
    );

CREATE POLICY "Users can manage own report exports" ON report_exports
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notification settings" ON user_notification_settings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own campaign targets" ON notification_campaign_targets
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage campaign targets" ON notification_campaign_targets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM user_profiles WHERE user_profiles.user_id = auth.uid() AND user_profiles.is_admin = TRUE)
    );

-- OTP policies (no RLS needed - handled by email verification)

-- =====================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (user_id, full_name, job, initial_income, date_of_birth, currency_code, locale, time_zone)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        (NEW.raw_user_meta_data->>'job')::TEXT,
        (NEW.raw_user_meta_data->>'initial_income')::INT,
        (NEW.raw_user_meta_data->>'date_of_birth')::DATE,
        COALESCE(NEW.raw_user_meta_data->>'currency_code', 'VND'),
        COALESCE(NEW.raw_user_meta_data->>'locale', 'vi-VN'),
        COALESCE(NEW.raw_user_meta_data->>'time_zone', 'Asia/Ho_Chi_Minh')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- AUTO-CREATE DEFAULT NOTIFICATION SETTINGS ON USER SIGNUP
-- =====================================================
CREATE OR REPLACE FUNCTION handle_new_user_notification_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_notification_settings (user_id)
    VALUES (NEW.user_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_profile_created
    AFTER INSERT ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_notification_settings();

-- =====================================================
-- SEED DATA: See ../seed.sql
-- Run AFTER this migration and AFTER creating auth.users
-- =====================================================
