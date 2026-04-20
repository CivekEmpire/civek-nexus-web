-- Migration 002: Nexus Oath + Nexus Score
-- Sprint 23: Juramento Nexus + Nexus Score
-- Fecha: 19 Abril 2026

-- Nexus Oath (Juramento)
CREATE TABLE IF NOT EXISTS nexus_oaths (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    oath_version VARCHAR(10) DEFAULT 'v1.0',
    accepted_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT,
    reminder_sent_at TIMESTAMPTZ,
    next_reminder TIMESTAMPTZ,
    UNIQUE(user_id, oath_version)
);

-- Nexus Score Components
CREATE TABLE IF NOT EXISTS nexus_score_components (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

    -- Confianza (30%)
    trust_references INTEGER DEFAULT 0,           -- Referencias recibidas
    trust_verifications INTEGER DEFAULT 0,        -- Verificaciones completadas
    trust_score DECIMAL(5,2) DEFAULT 0.0,        -- 0-100

    -- Contribución (25%)
    contrib_moderation_hours INTEGER DEFAULT 0,  -- Horas de moderación
    contrib_help_actions INTEGER DEFAULT 0,      -- Ayudas a comunidad
    contrib_content_quality INTEGER DEFAULT 0,   -- Calidad de contenido (0-100)
    contrib_score DECIMAL(5,2) DEFAULT 0.0,     -- 0-100

    -- Reputación (25%)
    reputation_feedback_positive INTEGER DEFAULT 0,  -- Feedback positivo
    reputation_feedback_negative INTEGER DEFAULT 0,  -- Feedback negativo
    reputation_deals_completed INTEGER DEFAULT 0,    -- Deals completados
    reputation_score DECIMAL(5,2) DEFAULT 0.0,      -- 0-100

    -- Impacto (20%)
    impact_referrals INTEGER DEFAULT 0,          -- Referidos exitosos
    impact_deal_flow INTEGER DEFAULT 0,          -- Deal flow generado
    impact_community_growth INTEGER DEFAULT 0,   -- Crecimiento comunidad
    impact_score DECIMAL(5,2) DEFAULT 0.0,      -- 0-100

    -- Score total
    total_score INTEGER DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 1000),
    level VARCHAR(20) DEFAULT 'explorador' CHECK (level IN ('explorador', 'constructor', 'lider', 'ancestro')),

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Score History (para graficar)
CREATE TABLE IF NOT EXISTS nexus_score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL,
    trust_score DECIMAL(5,2),
    contrib_score DECIMAL(5,2),
    reputation_score DECIMAL(5,2),
    impact_score DECIMAL(5,2),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Violations (reportes de violaciones al juramento)
CREATE TABLE IF NOT EXISTS oath_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reported_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    violation_type VARCHAR(50) NOT NULL, -- 'harassment', 'spam', 'fraud', 'other'
    description TEXT NOT NULL,
    evidence JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'confirmed', 'dismissed')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    resolution TEXT,
    penalty_applied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Score Transactions (log de cambios)
CREATE TABLE IF NOT EXISTS score_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    component VARCHAR(20) NOT NULL, -- 'trust', 'contribution', 'reputation', 'impact'
    points_change INTEGER NOT NULL,
    reason VARCHAR(200) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oaths_user ON nexus_oaths(user_id);
CREATE INDEX IF NOT EXISTS idx_oaths_reminder ON nexus_oaths(next_reminder);

CREATE INDEX IF NOT EXISTS idx_score_level ON nexus_score_components(level);
CREATE INDEX IF NOT EXISTS idx_score_total ON nexus_score_components(total_score DESC);

CREATE INDEX IF NOT EXISTS idx_score_history_user ON nexus_score_history(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_violations_reported ON oath_violations(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_violations_status ON oath_violations(status);
CREATE INDEX IF NOT EXISTS idx_violations_created ON oath_violations(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON score_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_component ON score_transactions(component);

-- Function para calcular score total
CREATE OR REPLACE FUNCTION calculate_total_nexus_score(
    p_trust DECIMAL,
    p_contrib DECIMAL,
    p_reputation DECIMAL,
    p_impact DECIMAL
) RETURNS INTEGER AS $$
BEGIN
    -- Formula: Trust(30%) + Contribution(25%) + Reputation(25%) + Impact(20%)
    RETURN ROUND((p_trust * 0.30 + p_contrib * 0.25 + p_reputation * 0.25 + p_impact * 0.20) * 10);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function para determinar nivel
CREATE OR REPLACE FUNCTION get_score_level(p_score INTEGER) RETURNS VARCHAR AS $$
BEGIN
    IF p_score >= 800 THEN RETURN 'ancestro';
    ELSIF p_score >= 600 THEN RETURN 'lider';
    ELSIF p_score >= 300 THEN RETURN 'constructor';
    ELSE RETURN 'explorador';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para actualizar score automáticamente
CREATE OR REPLACE FUNCTION update_nexus_score() RETURNS TRIGGER AS $$
DECLARE
    new_total INTEGER;
    new_level VARCHAR;
BEGIN
    new_total := calculate_total_nexus_score(
        NEW.trust_score,
        NEW.contrib_score,
        NEW.reputation_score,
        NEW.impact_score
    );

    new_level := get_score_level(new_total);

    NEW.total_score := new_total;
    NEW.level := new_level;
    NEW.updated_at := NOW();

    -- Guardar en historial si cambió significativamente (±10 puntos)
    IF TG_OP = 'UPDATE' AND ABS(new_total - OLD.total_score) >= 10 THEN
        INSERT INTO nexus_score_history (
            user_id, score, trust_score, contrib_score, reputation_score, impact_score, reason
        ) VALUES (
            NEW.user_id, new_total, NEW.trust_score, NEW.contrib_score,
            NEW.reputation_score, NEW.impact_score, 'Automatic calculation'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_nexus_score
    BEFORE INSERT OR UPDATE ON nexus_score_components
    FOR EACH ROW
    EXECUTE FUNCTION update_nexus_score();

-- Comments
COMMENT ON TABLE nexus_oaths IS 'Sprint 23: Nexus Oath acceptance tracking';
COMMENT ON TABLE nexus_score_components IS 'Sprint 23: Nexus Score breakdown by component';
COMMENT ON TABLE nexus_score_history IS 'Sprint 23: Score history for graphing trends';
COMMENT ON TABLE oath_violations IS 'Sprint 23: Violations reporting and review system';
COMMENT ON TABLE score_transactions IS 'Sprint 23: Detailed log of score changes';

-- Insert demo data
INSERT INTO nexus_score_components (user_id, trust_score, contrib_score, reputation_score, impact_score)
VALUES
    ('550e8400-e29b-41d4-a716-446655440000'::uuid, 85.0, 60.0, 70.0, 45.0)
ON CONFLICT (user_id) DO NOTHING;
