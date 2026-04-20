-- Migration 006: Token Economy
-- Sprint 21 NEXUS: Nexus Económico (Tokens CIVEK)
-- Fecha: 19 Abril 2026

-- User token balances
CREATE TABLE IF NOT EXISTS user_tokens (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned INTEGER DEFAULT 0 CHECK (lifetime_earned >= 0),
    lifetime_spent INTEGER DEFAULT 0 CHECK (lifetime_spent >= 0),
    last_earn_at TIMESTAMPTZ,
    last_spend_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token transactions
CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('earn', 'spend', 'transfer', 'refund')),
    reason VARCHAR(200) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    balance_after INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token rewards catalog
CREATE TABLE IF NOT EXISTS token_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(100) NOT NULL UNIQUE,
    tokens_amount INTEGER NOT NULL CHECK (tokens_amount > 0),
    description TEXT,
    max_per_day INTEGER,
    max_per_month INTEGER,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Token redemptions catalog
CREATE TABLE IF NOT EXISTS token_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_type VARCHAR(100) NOT NULL,
    redemption_name VARCHAR(200) NOT NULL,
    description TEXT,
    tokens_cost INTEGER NOT NULL CHECK (tokens_cost > 0),
    value_usd DECIMAL(10,2),
    category VARCHAR(50), -- 'subscription', 'discount', 'feature', 'event', 'other'
    metadata JSONB DEFAULT '{}'::jsonb,
    available_quantity INTEGER, -- NULL = unlimited
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User redemptions history
CREATE TABLE IF NOT EXISTS user_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redemption_id UUID NOT NULL REFERENCES token_redemptions(id),
    tokens_spent INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'refunded')),
    redeemed_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Daily/monthly limits tracking
CREATE TABLE IF NOT EXISTS token_reward_limits (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    count_today INTEGER DEFAULT 0,
    count_this_month INTEGER DEFAULT 0,
    last_earned_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, action_type, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_tokens_balance ON user_tokens(balance DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON token_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON token_transactions(type);
CREATE INDEX IF NOT EXISTS idx_rewards_enabled ON token_rewards(enabled) WHERE enabled = TRUE;
CREATE INDEX IF NOT EXISTS idx_redemptions_user ON user_redemptions(user_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS idx_redemptions_status ON user_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_limits_user_date ON token_reward_limits(user_id, date DESC);

-- Function to award tokens
CREATE OR REPLACE FUNCTION award_tokens(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason VARCHAR,
    p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    new_balance INTEGER;
    result JSONB;
BEGIN
    -- Initialize user_tokens if doesn't exist
    INSERT INTO user_tokens (user_id, balance, lifetime_earned)
    VALUES (p_user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Update balance
    UPDATE user_tokens
    SET
        balance = balance + p_amount,
        lifetime_earned = lifetime_earned + p_amount,
        last_earn_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO new_balance;

    -- Log transaction
    INSERT INTO token_transactions (user_id, amount, type, reason, metadata, balance_after)
    VALUES (p_user_id, p_amount, 'earn', p_reason, p_metadata, new_balance);

    result := json_build_object(
        'success', true,
        'tokens_awarded', p_amount,
        'new_balance', new_balance
    )::jsonb;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to spend tokens
CREATE OR REPLACE FUNCTION spend_tokens(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason VARCHAR,
    p_metadata JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    current_balance INTEGER;
    new_balance INTEGER;
    result JSONB;
BEGIN
    -- Check balance
    SELECT balance INTO current_balance FROM user_tokens WHERE user_id = p_user_id;

    IF current_balance IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'User has no token account')::jsonb;
    END IF;

    IF current_balance < p_amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient balance')::jsonb;
    END IF;

    -- Deduct tokens
    UPDATE user_tokens
    SET
        balance = balance - p_amount,
        lifetime_spent = lifetime_spent + p_amount,
        last_spend_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING balance INTO new_balance;

    -- Log transaction
    INSERT INTO token_transactions (user_id, amount, type, reason, metadata, balance_after)
    VALUES (p_user_id, -p_amount, 'spend', p_reason, p_metadata, new_balance);

    result := json_build_object(
        'success', true,
        'tokens_spent', p_amount,
        'new_balance', new_balance
    )::jsonb;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE user_tokens IS 'Sprint 21 NEXUS: User token balances';
COMMENT ON TABLE token_transactions IS 'Sprint 21 NEXUS: All token transactions history';
COMMENT ON TABLE token_rewards IS 'Sprint 21 NEXUS: Catalog of actions that earn tokens';
COMMENT ON TABLE token_redemptions IS 'Sprint 21 NEXUS: Catalog of items to redeem with tokens';
COMMENT ON TABLE user_redemptions IS 'Sprint 21 NEXUS: User redemption history';

-- Seed rewards catalog
INSERT INTO token_rewards (action_type, tokens_amount, description, max_per_day, max_per_month) VALUES
('profile_complete', 100, 'Completar perfil por primera vez', 1, 1),
('first_post', 50, 'Primera publicación', 1, 1),
('daily_login', 10, 'Iniciar sesión diariamente', 1, 30),
('refer_friend_verified', 500, 'Referir amigo verificado', NULL, NULL),
('space_moderation', 10, 'Ayudar en moderación de espacios', NULL, 300),
('monthly_active', 200, 'Ser usuario activo del mes', 1, 1),
('quality_post', 25, 'Publicación de alta calidad', 5, 150),
('helpful_review', 15, 'Review útil en marketplace', 10, 100)
ON CONFLICT (action_type) DO NOTHING;

-- Seed redemptions catalog
INSERT INTO token_redemptions (redemption_type, redemption_name, description, tokens_cost, value_usd, category) VALUES
('premium_month', '1 Mes Premium Gratis', 'Acceso Premium por 1 mes', 1000, 9.00, 'subscription'),
('uttill_discount_10', '10% Descuento Uttill', 'Descuento en productos Uttill', 500, 5.00, 'discount'),
('elite_event_access', 'Acceso Evento Élite (1 vez)', 'Entrada a un evento exclusivo', 2000, 50.00, 'event'),
('boost_post', 'Boost Publicación', 'Destacar publicación por 24h', 100, 2.00, 'feature'),
('priority_support', 'Soporte Prioritario', 'Soporte con respuesta rápida', 200, 5.00, 'feature')
ON CONFLICT DO NOTHING;

-- Initialize demo user tokens
INSERT INTO user_tokens (user_id, balance, lifetime_earned)
VALUES ('550e8400-e29b-41d4-a716-446655440000'::uuid, 1500, 1500)
ON CONFLICT (user_id) DO UPDATE SET balance = 1500, lifetime_earned = 1500;
