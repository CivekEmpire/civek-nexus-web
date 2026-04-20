-- Migration 004: Elite Features (Deal Flow, Legacy, Concierge, Events)
-- Sprint 20 NEXUS: Funciones Élite
-- Fecha: 19 Abril 2026

-- Deal Flow (CIVEK OUTER)
CREATE TABLE IF NOT EXISTS deals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    deal_type VARCHAR(50) NOT NULL, -- 'investment', 'acquisition', 'partnership', 'venture'
    stage VARCHAR(50) DEFAULT 'sourcing' CHECK (stage IN ('sourcing', 'due_diligence', 'negotiation', 'closing', 'closed', 'passed')),
    amount DECIMAL(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    sector VARCHAR(100),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    visibility VARCHAR(20) DEFAULT 'elite' CHECK (visibility IN ('private', 'elite', 'shared')),
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

-- Deal participants
CREATE TABLE IF NOT EXISTS deal_participants (
    deal_id UUID REFERENCES deals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'lead', 'investor', 'advisor', 'observer'
    equity_percentage DECIMAL(5,2),
    investment_amount DECIMAL(15,2),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (deal_id, user_id)
);

-- Deal activity
CREATE TABLE IF NOT EXISTS deal_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy Manager (Digital Testaments)
CREATE TABLE IF NOT EXISTS digital_testaments (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    heirs JSONB DEFAULT '[]'::jsonb, -- [{user_id, relationship, access_level}]
    instructions TEXT,
    reveal_content JSONB DEFAULT '{}'::jsonb, -- {type, content, unlock_condition}
    bequests JSONB DEFAULT '[]'::jsonb, -- Digital assets to transfer
    trigger_conditions JSONB DEFAULT '{
        "inactivity_days": 180,
        "require_proof_of_death": true,
        "executor_user_ids": []
    }'::jsonb,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'triggered', 'executed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    triggered_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ
);

-- Legacy vaults (secure storage)
CREATE TABLE IF NOT EXISTS legacy_vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vault_name VARCHAR(200) NOT NULL,
    vault_type VARCHAR(50) NOT NULL, -- 'documents', 'credentials', 'media', 'instructions'
    content_encrypted TEXT NOT NULL, -- Encrypted content
    unlock_conditions JSONB DEFAULT '{}'::jsonb, -- {date, event, person}
    authorized_heirs UUID[] DEFAULT ARRAY[]::UUID[],
    status VARCHAR(20) DEFAULT 'locked' CHECK (status IN ('locked', 'unlocked', 'accessed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accessed_at TIMESTAMPTZ
);

-- Concierge requests
CREATE TABLE IF NOT EXISTS concierge_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL, -- 'reservation', 'research', 'booking', 'task', 'other'
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    assigned_to UUID REFERENCES users(id), -- AI agent or human concierge
    result TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Elite events
CREATE TABLE IF NOT EXISTS elite_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_type VARCHAR(50) NOT NULL, -- 'networking', 'conference', 'dinner', 'retreat', 'exclusive'
    location VARCHAR(200),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    capacity INTEGER,
    visibility VARCHAR(20) DEFAULT 'elite' CHECK (visibility IN ('private', 'elite', 'invite_only')),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    metadata JSONB DEFAULT '{
        "dress_code": "",
        "agenda": [],
        "speakers": [],
        "sponsors": []
    }'::jsonb,
    status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('draft', 'upcoming', 'ongoing', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event RSVPs
CREATE TABLE IF NOT EXISTS event_rsvps (
    event_id UUID REFERENCES elite_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('invited', 'attending', 'maybe', 'declined')),
    plus_one BOOLEAN DEFAULT FALSE,
    dietary_restrictions TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deals_owner ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON deals(stage);
CREATE INDEX IF NOT EXISTS idx_deals_visibility ON deals(visibility);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created ON deals(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deal_participants_user ON deal_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_deal_participants_role ON deal_participants(role);

CREATE INDEX IF NOT EXISTS idx_deal_activity_deal ON deal_activity(deal_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_legacy_vaults_user ON legacy_vaults(user_id);
CREATE INDEX IF NOT EXISTS idx_legacy_vaults_status ON legacy_vaults(status);

CREATE INDEX IF NOT EXISTS idx_concierge_user ON concierge_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_concierge_status ON concierge_requests(status);
CREATE INDEX IF NOT EXISTS idx_concierge_priority ON concierge_requests(priority);
CREATE INDEX IF NOT EXISTS idx_concierge_assigned ON concierge_requests(assigned_to);

CREATE INDEX IF NOT EXISTS idx_events_host ON elite_events(host_id);
CREATE INDEX IF NOT EXISTS idx_events_start ON elite_events(start_time);
CREATE INDEX IF NOT EXISTS idx_events_status ON elite_events(status);

CREATE INDEX IF NOT EXISTS idx_rsvps_event ON event_rsvps(event_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_user ON event_rsvps(user_id);
CREATE INDEX IF NOT EXISTS idx_rsvps_status ON event_rsvps(status);

-- Function to check elite membership
CREATE OR REPLACE FUNCTION is_elite_member(p_user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_circles
        WHERE user_id = p_user_id
        AND circle_type = 'elite'
        AND verified = TRUE
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- Comments
COMMENT ON TABLE deals IS 'Sprint 20 NEXUS: Deal flow for elite members (CIVEK OUTER)';
COMMENT ON TABLE digital_testaments IS 'Sprint 20 NEXUS: Digital testaments and legacy planning';
COMMENT ON TABLE legacy_vaults IS 'Sprint 20 NEXUS: Secure vaults for sensitive legacy content';
COMMENT ON TABLE concierge_requests IS 'Sprint 20 NEXUS: 24/7 concierge AI service for elite';
COMMENT ON TABLE elite_events IS 'Sprint 20 NEXUS: Exclusive events for elite members';
COMMENT ON TABLE event_rsvps IS 'Sprint 20 NEXUS: Event attendance management';

-- Demo data
INSERT INTO deals (id, title, description, deal_type, stage, amount, sector, owner_id)
VALUES
    ('deal0001-0000-0000-0000-000000000001'::uuid, 'FarmaTech Startup Series A',
     'Invertir en startup de tecnología farmacéutica', 'investment', 'due_diligence',
     500000, 'FarmaTech', '550e8400-e29b-41d4-a716-446655440000'::uuid)
ON CONFLICT (id) DO NOTHING;

INSERT INTO elite_events (id, title, description, event_type, location, start_time, end_time, capacity, host_id)
VALUES
    ('event001-0000-0000-0000-000000000001'::uuid, 'CIVEK Elite Summit 2026',
     'Cumbre anual de miembros élite', 'conference', 'San José, Costa Rica',
     '2026-06-15 09:00:00-06', '2026-06-15 18:00:00-06', 100,
     '550e8400-e29b-41d4-a716-446655440000'::uuid)
ON CONFLICT (id) DO NOTHING;
