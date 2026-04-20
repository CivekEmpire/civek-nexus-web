-- Migration 007: Monetization
-- Sprint 25 NEXUS: Monetización Completa
-- Fecha: 19 Abril 2026

-- Subscription plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name VARCHAR(100) NOT NULL UNIQUE,
    circle_type VARCHAR(20) NOT NULL CHECK (circle_type IN ('vida', 'negocios', 'elite')),
    price_monthly DECIMAL(10,2) NOT NULL,
    price_yearly DECIMAL(10,2),
    features JSONB DEFAULT '[]'::jsonb,
    limits JSONB DEFAULT '{}'::jsonb,
    display_order INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('trial', 'active', 'past_due', 'cancelled', 'expired')),
    billing_period VARCHAR(20) NOT NULL CHECK (billing_period IN ('monthly', 'yearly')),
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    stripe_subscription_id VARCHAR(255),
    stripe_customer_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    transaction_type VARCHAR(50) NOT NULL, -- 'subscription', 'marketplace', 'service', 'refund'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50), -- 'card', 'paypal', 'crypto'
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    stripe_payment_intent_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    amount_subtotal DECIMAL(10,2) NOT NULL,
    amount_tax DECIMAL(10,2) DEFAULT 0,
    amount_total DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    invoice_pdf_url TEXT,
    stripe_invoice_id VARCHAR(255),
    line_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment methods
CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method_type VARCHAR(50) NOT NULL, -- 'card', 'paypal', 'bank_account'
    is_default BOOLEAN DEFAULT FALSE,
    stripe_payment_method_id VARCHAR(255),
    card_brand VARCHAR(50),
    card_last4 VARCHAR(4),
    card_exp_month INTEGER,
    card_exp_year INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revenue analytics
CREATE TABLE IF NOT EXISTS revenue_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    mrr DECIMAL(12,2) DEFAULT 0, -- Monthly Recurring Revenue
    arr DECIMAL(12,2) DEFAULT 0, -- Annual Recurring Revenue
    new_subscriptions INTEGER DEFAULT 0,
    cancelled_subscriptions INTEGER DEFAULT 0,
    churn_rate DECIMAL(5,2) DEFAULT 0,
    ltv_avg DECIMAL(10,2) DEFAULT 0, -- Lifetime Value average
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plans_circle ON subscription_plans(circle_type, enabled);
CREATE INDEX IF NOT EXISTS idx_plans_order ON subscription_plans(display_order);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period ON user_subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON user_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON payment_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON payment_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(is_default) WHERE is_default = TRUE;

CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue_analytics(date DESC);

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number() RETURNS VARCHAR AS $$
DECLARE
    next_num INTEGER;
    invoice_num VARCHAR;
BEGIN
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 9) AS INTEGER)), 0) + 1
    INTO next_num
    FROM invoices
    WHERE invoice_number LIKE 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-%';

    invoice_num := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(next_num::TEXT, 6, '0');
    RETURN invoice_num;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE subscription_plans IS 'Sprint 25 NEXUS: Subscription plan definitions';
COMMENT ON TABLE user_subscriptions IS 'Sprint 25 NEXUS: Active user subscriptions';
COMMENT ON TABLE payment_transactions IS 'Sprint 25 NEXUS: All payment transactions';
COMMENT ON TABLE invoices IS 'Sprint 25 NEXUS: Generated invoices';
COMMENT ON TABLE payment_methods IS 'Sprint 25 NEXUS: Saved payment methods';
COMMENT ON TABLE revenue_analytics IS 'Sprint 25 NEXUS: Daily revenue analytics';

-- Seed subscription plans
INSERT INTO subscription_plans (plan_name, circle_type, price_monthly, price_yearly, features, display_order) VALUES
('Vida Free', 'vida', 0.00, 0.00, '["Perfil básico", "Mensajería", "1 espacio"]'::jsonb, 1),
('Vida Premium', 'vida', 9.00, 90.00, '["Agentes ilimitados", "Memoria bi-temporal", "Recordatorios"]'::jsonb, 2),
('Negocios Pro', 'negocios', 29.00, 290.00, '["Todo Premium", "Herramientas negocio", "Hipobid/Uttill"]'::jsonb, 3),
('Negocios Family', 'negocios', 49.00, 490.00, '["Todo Pro para 5 usuarios"]'::jsonb, 4),
('Élite', 'elite', 99.00, 990.00, '["Deal flow", "Eventos exclusivos", "Concierge"]'::jsonb, 5),
('Élite Legacy', 'elite', 299.00, 2990.00, '["Todo Élite", "Membresía heredable", "Eventos globales"]'::jsonb, 6)
ON CONFLICT (plan_name) DO NOTHING;
