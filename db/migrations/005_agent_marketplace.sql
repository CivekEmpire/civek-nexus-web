-- Migration 005: Agent Marketplace
-- Sprint 24 NEXUS: Marketplace de Agentes Especializados
-- Fecha: 19 Abril 2026

-- Agent definitions
CREATE TABLE IF NOT EXISTS marketplace_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'health', 'finance', 'productivity', 'family', 'business', 'other'
    icon_emoji VARCHAR(10) DEFAULT '🤖',
    pricing_model VARCHAR(20) DEFAULT 'free' CHECK (pricing_model IN ('free', 'freemium', 'paid', 'subscription')),
    price_amount DECIMAL(10,2) DEFAULT 0,
    price_currency VARCHAR(3) DEFAULT 'USD',
    subscription_period VARCHAR(20) CHECK (subscription_period IN ('monthly', 'yearly', NULL)),

    -- Agent configuration
    prompt_template TEXT NOT NULL,
    system_instructions TEXT,
    tools JSONB DEFAULT '[]'::jsonb, -- [{name, config}]
    triggers JSONB DEFAULT '[]'::jsonb, -- [{event, condition, action}]
    settings_schema JSONB DEFAULT '{}'::jsonb,

    -- Stats
    install_count INTEGER DEFAULT 0,
    rating_avg DECIMAL(3,2) DEFAULT 0.0 CHECK (rating_avg >= 0 AND rating_avg <= 5),
    rating_count INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected', 'archived')),
    visibility VARCHAR(20) DEFAULT 'public' CHECK (visibility IN ('public', 'private', 'unlisted')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- User installed agents
CREATE TABLE IF NOT EXISTS user_agents (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES marketplace_agents(id) ON DELETE CASCADE,
    custom_name VARCHAR(200),
    custom_settings JSONB DEFAULT '{}'::jsonb,
    enabled BOOLEAN DEFAULT TRUE,
    installed_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    PRIMARY KEY (user_id, agent_id)
);

-- Agent reviews
CREATE TABLE IF NOT EXISTS agent_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES marketplace_agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(agent_id, user_id)
);

-- Agent revenue tracking
CREATE TABLE IF NOT EXISTS agent_revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES marketplace_agents(id) ON DELETE CASCADE,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- 'purchase', 'subscription', 'renewal'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    creator_share DECIMAL(10,2) NOT NULL, -- 70% to creator
    platform_share DECIMAL(10,2) NOT NULL, -- 30% to platform
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'refunded')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent usage analytics
CREATE TABLE IF NOT EXISTS agent_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES marketplace_agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'installed', 'used', 'configured', 'uninstalled'
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_agents_creator ON marketplace_agents(creator_id);
CREATE INDEX IF NOT EXISTS idx_agents_category ON marketplace_agents(category);
CREATE INDEX IF NOT EXISTS idx_agents_status ON marketplace_agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_rating ON marketplace_agents(rating_avg DESC);
CREATE INDEX IF NOT EXISTS idx_agents_installs ON marketplace_agents(install_count DESC);

CREATE INDEX IF NOT EXISTS idx_user_agents_user ON user_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_enabled ON user_agents(enabled);

CREATE INDEX IF NOT EXISTS idx_reviews_agent ON agent_reviews(agent_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON agent_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON agent_reviews(rating);

CREATE INDEX IF NOT EXISTS idx_revenue_agent ON agent_revenue(agent_id);
CREATE INDEX IF NOT EXISTS idx_revenue_creator ON agent_revenue(creator_id);
CREATE INDEX IF NOT EXISTS idx_revenue_created ON agent_revenue(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_agent ON agent_analytics(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON agent_analytics(event_type);

-- Function to update agent stats
CREATE OR REPLACE FUNCTION update_agent_stats() RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'user_agents' THEN
        IF TG_OP = 'INSERT' THEN
            UPDATE marketplace_agents SET install_count = install_count + 1 WHERE id = NEW.agent_id;
        ELSIF TG_OP = 'DELETE' THEN
            UPDATE marketplace_agents SET install_count = install_count - 1 WHERE id = OLD.agent_id;
        END IF;
    ELSIF TG_TABLE_NAME = 'agent_reviews' THEN
        UPDATE marketplace_agents
        SET
            rating_avg = (SELECT AVG(rating) FROM agent_reviews WHERE agent_id = NEW.agent_id),
            rating_count = (SELECT COUNT(*) FROM agent_reviews WHERE agent_id = NEW.agent_id)
        WHERE id = NEW.agent_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_install_count
    AFTER INSERT OR DELETE ON user_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_stats();

CREATE TRIGGER trigger_update_agent_rating
    AFTER INSERT OR UPDATE ON agent_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_stats();

-- Comments
COMMENT ON TABLE marketplace_agents IS 'Sprint 24 NEXUS: AI agent definitions in marketplace';
COMMENT ON TABLE user_agents IS 'Sprint 24 NEXUS: User-installed agents';
COMMENT ON TABLE agent_reviews IS 'Sprint 24 NEXUS: Agent reviews and ratings';
COMMENT ON TABLE agent_revenue IS 'Sprint 24 NEXUS: Revenue tracking (70% creator, 30% platform)';
COMMENT ON TABLE agent_analytics IS 'Sprint 24 NEXUS: Usage analytics for agents';

-- Demo data
INSERT INTO marketplace_agents (id, creator_id, name, description, category, pricing_model, price_amount, prompt_template, status, visibility)
VALUES
    ('agent001-0000-0000-0000-000000000001'::uuid,
     '550e8400-e29b-41d4-a716-446655440000'::uuid,
     'Health Tracker AI',
     'Seguimiento personalizado de salud, recordatorios de medicinas, análisis de síntomas',
     'health', 'freemium', 9.99,
     'Eres un asistente de salud personal que ayuda a usuarios a mantener registros de su salud...',
     'approved', 'public'),

    ('agent002-0000-0000-0000-000000000002'::uuid,
     '550e8400-e29b-41d4-a716-446655440000'::uuid,
     'Investment Advisor',
     'Análisis de oportunidades de inversión, portfolio tracking, alertas de mercado',
     'finance', 'subscription', 29.99,
     'Eres un asesor financiero experto que analiza oportunidades de inversión...',
     'approved', 'public')
ON CONFLICT (id) DO NOTHING;
