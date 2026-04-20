-- Migration 009: Division Integrations (Hipobid, Uttill, Distribeaute, Dr.Vek)
-- Sprint 19 NEXUS: Integración con las 4 divisiones activas del Imperio
-- Fecha: 19 Abril 2026
-- "CIVEK OS PRIMERO → NEGOCIOS IMPECABLES DESPUÉS"

-- ============================================================================
-- HIPOBID INTEGRATION (Licitaciones globales)
-- ============================================================================

CREATE TABLE IF NOT EXISTS hipobid_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hipobid_account_id VARCHAR(100), -- External Hipobid ID if exists
    integration_status VARCHAR(20) DEFAULT 'pending' CHECK (integration_status IN ('pending', 'active', 'paused', 'disconnected')),
    api_credentials_encrypted TEXT, -- Encrypted API credentials
    sync_settings JSONB DEFAULT '{
        "auto_sync": true,
        "sync_interval_hours": 24,
        "notify_new_bids": true,
        "notify_won_bids": true
    }'::jsonb,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS hipobid_tenders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tender_external_id VARCHAR(200), -- ID from Hipobid system
    tender_title VARCHAR(500) NOT NULL,
    tender_description TEXT,
    tender_category VARCHAR(100),
    country VARCHAR(100),
    organization VARCHAR(300),
    budget_amount DECIMAL(15,2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    submission_deadline TIMESTAMPTZ,
    award_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled', 'expired')),
    user_bid_status VARCHAR(50) DEFAULT 'interested' CHECK (user_bid_status IN ('interested', 'preparing', 'submitted', 'won', 'lost', 'withdrawn')),
    user_bid_amount DECIMAL(15,2),
    probability_score INTEGER CHECK (probability_score BETWEEN 0 AND 100), -- AI-calculated win probability
    documents_url VARCHAR(500),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hipobid_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tender_id UUID REFERENCES hipobid_tenders(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 'new_tender', 'deadline_reminder', 'status_change', 'award_notification'
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- UTTILL INTEGRATION (Materiales construcción)
-- ============================================================================

CREATE TABLE IF NOT EXISTS uttill_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    uttill_customer_id VARCHAR(100), -- Uttill customer ID
    shopify_customer_id VARCHAR(100), -- Shopify customer ID
    integration_status VARCHAR(20) DEFAULT 'pending' CHECK (integration_status IN ('pending', 'active', 'paused', 'disconnected')),
    loyalty_points INTEGER DEFAULT 0,
    discount_tier VARCHAR(50) DEFAULT 'standard' CHECK (discount_tier IN ('standard', 'silver', 'gold', 'platinum')),
    preferences JSONB DEFAULT '{
        "preferred_payment_method": "credit_card",
        "delivery_address": {},
        "notify_new_products": true,
        "notify_price_drops": true
    }'::jsonb,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS uttill_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_external_id VARCHAR(200), -- Shopify product ID
    product_name VARCHAR(300) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    subcategory VARCHAR(100),
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CRC',
    stock_quantity INTEGER DEFAULT 0,
    unit VARCHAR(50), -- 'm2', 'kg', 'unit', etc.
    image_url VARCHAR(500),
    shopify_url VARCHAR(500),
    specifications JSONB DEFAULT '{}'::jsonb,
    is_featured BOOLEAN DEFAULT FALSE,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS uttill_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_external_id VARCHAR(200), -- Shopify order ID
    order_number VARCHAR(50) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CRC',
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded')),
    items JSONB DEFAULT '[]'::jsonb, -- [{product_id, name, quantity, price}]
    delivery_address JSONB DEFAULT '{}'::jsonb,
    payment_method VARCHAR(50),
    tracking_number VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DISTRIBEAUTE INTEGRATION (Cosméticos premium)
-- ============================================================================

CREATE TABLE IF NOT EXISTS distribeaute_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    distributor_level VARCHAR(50) DEFAULT 'customer' CHECK (distributor_level IN ('customer', 'distributor', 'leader', 'diamond')),
    enrollment_date DATE,
    sponsor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    downline_count INTEGER DEFAULT 0,
    lifetime_sales DECIMAL(15,2) DEFAULT 0,
    current_month_sales DECIMAL(15,2) DEFAULT 0,
    commission_earned DECIMAL(15,2) DEFAULT 0,
    commission_pending DECIMAL(15,2) DEFAULT 0,
    rank_achieved VARCHAR(50),
    integration_status VARCHAR(20) DEFAULT 'active' CHECK (integration_status IN ('pending', 'active', 'paused', 'terminated')),
    preferences JSONB DEFAULT '{
        "auto_order": false,
        "preferred_products": [],
        "notify_new_products": true,
        "notify_rank_progress": true
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS distribeaute_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(300) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    retail_price DECIMAL(10,2) NOT NULL,
    distributor_price DECIMAL(10,2) NOT NULL,
    pv_points INTEGER, -- Personal Volume points
    bv_points INTEGER, -- Business Volume points
    currency VARCHAR(3) DEFAULT 'USD',
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS distribeaute_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    commission_period VARCHAR(20) NOT NULL, -- '2026-04', etc.
    commission_type VARCHAR(50) NOT NULL, -- 'retail', 'team_bonus', 'rank_bonus', 'leadership'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
    paid_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DR.VEK INTEGRATION (Wellness ayurvédico)
-- ============================================================================

CREATE TABLE IF NOT EXISTS drvek_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    patient_id VARCHAR(100), -- Dr.Vek patient ID
    integration_status VARCHAR(20) DEFAULT 'pending' CHECK (integration_status IN ('pending', 'active', 'paused', 'disconnected')),
    health_profile JSONB DEFAULT '{
        "dosha": null,
        "allergies": [],
        "chronic_conditions": [],
        "current_medications": [],
        "health_goals": []
    }'::jsonb,
    privacy_settings JSONB DEFAULT '{
        "share_with_practitioners": true,
        "share_with_family": false,
        "anonymize_data": false
    }'::jsonb,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS drvek_health_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_type VARCHAR(50) NOT NULL, -- 'consultation', 'treatment', 'measurement', 'medication', 'symptom'
    record_date DATE NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    practitioner_name VARCHAR(200),
    measurements JSONB DEFAULT '{}'::jsonb, -- {weight, blood_pressure, etc}
    prescriptions JSONB DEFAULT '[]'::jsonb, -- [{medication, dosage, frequency}]
    notes TEXT,
    attachments VARCHAR(500)[], -- URLs to documents/images
    is_critical BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drvek_wellness_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_name VARCHAR(200) NOT NULL,
    plan_type VARCHAR(50) NOT NULL, -- 'detox', 'weight_loss', 'immunity', 'stress_relief', 'custom'
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    daily_routines JSONB DEFAULT '[]'::jsonb, -- [{time, activity, duration}]
    recommended_products JSONB DEFAULT '[]'::jsonb, -- [{product_id, usage_instructions}]
    progress_metrics JSONB DEFAULT '{}'::jsonb,
    practitioner_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drvek_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL, -- 'medication', 'appointment', 'measurement', 'routine'
    title VARCHAR(200) NOT NULL,
    description TEXT,
    reminder_time TIME NOT NULL,
    recurrence VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'custom'
    recurrence_pattern JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CROSS-DIVISION ANALYTICS
-- ============================================================================

CREATE TABLE IF NOT EXISTS division_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    division VARCHAR(50) NOT NULL CHECK (division IN ('hipobid', 'uttill', 'distribeaute', 'drvek')),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,2),
    metric_metadata JSONB DEFAULT '{}'::jsonb,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Hipobid
CREATE INDEX IF NOT EXISTS idx_hipobid_int_user ON hipobid_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_hipobid_tenders_user ON hipobid_tenders(user_id);
CREATE INDEX IF NOT EXISTS idx_hipobid_tenders_status ON hipobid_tenders(status, user_bid_status);
CREATE INDEX IF NOT EXISTS idx_hipobid_tenders_deadline ON hipobid_tenders(submission_deadline);
CREATE INDEX IF NOT EXISTS idx_hipobid_notifs_user ON hipobid_notifications(user_id, is_read);

-- Uttill
CREATE INDEX IF NOT EXISTS idx_uttill_int_user ON uttill_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_uttill_products_category ON uttill_products(category, is_available);
CREATE INDEX IF NOT EXISTS idx_uttill_products_featured ON uttill_products(is_featured, is_available);
CREATE INDEX IF NOT EXISTS idx_uttill_orders_user ON uttill_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uttill_orders_status ON uttill_orders(status);

-- Distribeaute
CREATE INDEX IF NOT EXISTS idx_distribeaute_int_user ON distribeaute_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_distribeaute_int_sponsor ON distribeaute_integrations(sponsor_user_id);
CREATE INDEX IF NOT EXISTS idx_distribeaute_products_code ON distribeaute_products(product_code);
CREATE INDEX IF NOT EXISTS idx_distribeaute_products_avail ON distribeaute_products(is_available);
CREATE INDEX IF NOT EXISTS idx_distribeaute_comm_user ON distribeaute_commissions(user_id, commission_period);

-- Dr.Vek
CREATE INDEX IF NOT EXISTS idx_drvek_int_user ON drvek_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_drvek_records_user ON drvek_health_records(user_id, record_date DESC);
CREATE INDEX IF NOT EXISTS idx_drvek_records_type ON drvek_health_records(record_type);
CREATE INDEX IF NOT EXISTS idx_drvek_plans_user ON drvek_wellness_plans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_drvek_reminders_user ON drvek_reminders(user_id, is_active);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_division_analytics_user ON division_analytics(user_id, division);
CREATE INDEX IF NOT EXISTS idx_division_analytics_period ON division_analytics(division, period_start, period_end);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function: Get user's division integration status
CREATE OR REPLACE FUNCTION get_user_divisions_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    v_result := jsonb_build_object(
        'hipobid', (SELECT integration_status FROM hipobid_integrations WHERE user_id = p_user_id),
        'uttill', (SELECT integration_status FROM uttill_integrations WHERE user_id = p_user_id),
        'distribeaute', (SELECT integration_status FROM distribeaute_integrations WHERE user_id = p_user_id),
        'drvek', (SELECT integration_status FROM drvek_integrations WHERE user_id = p_user_id)
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Calculate Uttill loyalty points
CREATE OR REPLACE FUNCTION calculate_uttill_loyalty_points(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_total_spent DECIMAL;
    v_points INTEGER;
BEGIN
    SELECT COALESCE(SUM(total_amount), 0)
    INTO v_total_spent
    FROM uttill_orders
    WHERE user_id = p_user_id
    AND status IN ('delivered', 'confirmed');

    -- 1 point per $10 spent (adjust as needed)
    v_points := FLOOR(v_total_spent / 10)::INTEGER;

    UPDATE uttill_integrations
    SET loyalty_points = v_points
    WHERE user_id = p_user_id;

    RETURN v_points;
END;
$$ LANGUAGE plpgsql;

-- Function: Update Distribeaute rank
CREATE OR REPLACE FUNCTION update_distribeaute_rank(p_user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_current_month_sales DECIMAL;
    v_downline_count INTEGER;
    v_new_rank VARCHAR;
BEGIN
    SELECT current_month_sales, downline_count
    INTO v_current_month_sales, v_downline_count
    FROM distribeaute_integrations
    WHERE user_id = p_user_id;

    -- Simple rank logic (customize based on actual Distribeaute rules)
    IF v_current_month_sales >= 10000 AND v_downline_count >= 20 THEN
        v_new_rank := 'diamond';
    ELSIF v_current_month_sales >= 5000 AND v_downline_count >= 10 THEN
        v_new_rank := 'leader';
    ELSIF v_current_month_sales >= 1000 THEN
        v_new_rank := 'distributor';
    ELSE
        v_new_rank := 'customer';
    END IF;

    UPDATE distribeaute_integrations
    SET rank_achieved = v_new_rank,
        distributor_level = v_new_rank
    WHERE user_id = p_user_id;

    RETURN v_new_rank;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE hipobid_integrations IS 'Sprint 19 NEXUS: Integración con Hipobid (licitaciones)';
COMMENT ON TABLE hipobid_tenders IS 'Sprint 19 NEXUS: Licitaciones desde Hipobid';
COMMENT ON TABLE uttill_integrations IS 'Sprint 19 NEXUS: Integración con Uttill (materiales construcción)';
COMMENT ON TABLE uttill_products IS 'Sprint 19 NEXUS: Catálogo de productos Uttill/Shopify';
COMMENT ON TABLE uttill_orders IS 'Sprint 19 NEXUS: Órdenes de compra Uttill';
COMMENT ON TABLE distribeaute_integrations IS 'Sprint 19 NEXUS: Integración con Distribeaute (cosméticos)';
COMMENT ON TABLE distribeaute_products IS 'Sprint 19 NEXUS: Productos Distribeaute';
COMMENT ON TABLE distribeaute_commissions IS 'Sprint 19 NEXUS: Comisiones Distribeaute';
COMMENT ON TABLE drvek_integrations IS 'Sprint 19 NEXUS: Integración con Dr.Vek (wellness)';
COMMENT ON TABLE drvek_health_records IS 'Sprint 19 NEXUS: Registros de salud Dr.Vek';
COMMENT ON TABLE drvek_wellness_plans IS 'Sprint 19 NEXUS: Planes de bienestar Dr.Vek';
COMMENT ON TABLE drvek_reminders IS 'Sprint 19 NEXUS: Recordatorios Dr.Vek';
COMMENT ON TABLE division_analytics IS 'Sprint 19 NEXUS: Analytics cruzado de divisiones';

-- ============================================================================
-- DEMO DATA
-- ============================================================================

-- Sample Uttill products
INSERT INTO uttill_products (product_external_id, product_name, category, price, unit) VALUES
    ('uttill-001', 'Cemento Gris Portland 50kg', 'cemento', 8500, 'bolsa'),
    ('uttill-002', 'Arena de Río m3', 'arena', 12000, 'm3'),
    ('uttill-003', 'Varilla Corrugada 1/2" 6m', 'hierro', 3500, 'unidad'),
    ('uttill-004', 'Bloque de Concreto 15x20x40', 'bloques', 450, 'unidad'),
    ('uttill-005', 'Madera Pino 2x4 3.6m', 'madera', 2800, 'unidad')
ON CONFLICT DO NOTHING;

-- Sample Distribeaute products
INSERT INTO distribeaute_products (product_code, product_name, category, retail_price, distributor_price, pv_points) VALUES
    ('DB-SERUM-001', 'Serum Facial Vitamina C', 'skincare', 45.00, 35.00, 25),
    ('DB-CREAM-001', 'Crema Hidratante Nocturna', 'skincare', 38.00, 28.00, 20),
    ('DB-MASK-001', 'Mascarilla Purificante', 'skincare', 28.00, 20.00, 15),
    ('DB-OIL-001', 'Aceite Esencial Lavanda', 'wellness', 22.00, 16.00, 12),
    ('DB-SUPP-001', 'Suplemento Colágeno', 'supplements', 55.00, 42.00, 30)
ON CONFLICT (product_code) DO NOTHING;
