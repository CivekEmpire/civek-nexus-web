-- Migration 008: ANCESTOR PROTOCOL (Complete Digital Inheritance)
-- Sprint 22 NEXUS: La herencia digital completa del Imperio
-- Fecha: 19 Abril 2026
-- "No eres un usuario. Eres un ancestro en construcción."

-- Testament Vaults (Bóvedas por Dimensión)
-- No todo o nada - heredar partes específicas del legado
CREATE TABLE IF NOT EXISTS testament_vaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    testament_id UUID NOT NULL REFERENCES digital_testaments(user_id) ON DELETE CASCADE,
    vault_dimension VARCHAR(50) NOT NULL CHECK (vault_dimension IN (
        'civek_os',      -- Código, arquitectura, decisiones técnicas
        'dr_vek',        -- Conocimiento médico, protocolos salud
        'uttill',        -- Estrategias financieras, deals
        'hipobid',       -- Licitaciones, contactos comerciales
        'nexus',         -- Red completa, círculos élite
        'family'         -- Fotos, historias, tradiciones, valores
    )),
    vault_name VARCHAR(200) NOT NULL,
    description TEXT,
    content_type VARCHAR(50) NOT NULL, -- 'documents', 'code', 'media', 'knowledge', 'contacts', 'credentials'
    content_encrypted TEXT,
    content_metadata JSONB DEFAULT '{}'::jsonb, -- {file_count, total_size, categories}
    natural_heir VARCHAR(100), -- "Hijo con talento tecnológico", "Esposa", etc.
    access_restrictions JSONB DEFAULT '{
        "min_age": null,
        "require_verification": false,
        "time_delay_days": 0,
        "conditions": []
    }'::jsonb,
    encryption_key_hash VARCHAR(255), -- Hash for verification
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'locked', 'unlocked', 'inherited')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    unlocked_at TIMESTAMPTZ,
    inherited_at TIMESTAMPTZ
);

-- Testament Beneficiaries (Herederos con niveles de acceso)
CREATE TABLE IF NOT EXISTS testament_beneficiaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    testament_id UUID NOT NULL REFERENCES digital_testaments(user_id) ON DELETE CASCADE,
    beneficiary_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL = no está en NEXUS aún
    beneficiary_email VARCHAR(255), -- Si no está en NEXUS
    beneficiary_name VARCHAR(200) NOT NULL,
    relationship VARCHAR(100) NOT NULL, -- 'spouse', 'child', 'sibling', 'business_partner', 'trusted_advisor'
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN (
        'consultation',  -- Nivel 1: Ver, leer, aprender
        'interaction',   -- Nivel 2: Hablar con el agente IA, preguntar
        'fusion',        -- Nivel 3: El heredero continúa el legado
        'succession'     -- Nivel 4: El heredero toma control total
    )),
    vaults_access UUID[] DEFAULT ARRAY[]::UUID[], -- Qué vaults puede acceder
    activation_mode VARCHAR(20) NOT NULL CHECK (activation_mode IN (
        'vida',          -- Herencia total, sin restricciones (activación inmediata)
        'delegado',      -- Acceso temporal (puede revocarse)
        'legado',        -- Activación solo por fallecimiento
        'emergencia'     -- Activación por incapacidad temporal
    )),
    delegation_expires_at TIMESTAMPTZ, -- Para modo 'delegado'
    activation_conditions JSONB DEFAULT '{
        "require_proof_of_death": true,
        "executor_approval": false,
        "time_delay_days": 0
    }'::jsonb,
    priority INTEGER DEFAULT 1, -- Orden de herencia (1 = primero)
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked', 'executed')),
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ancestor AI Instances (IA del difunto para interacción)
CREATE TABLE IF NOT EXISTS ancestor_ai_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    testament_id UUID NOT NULL REFERENCES digital_testaments(user_id) ON DELETE CASCADE,
    ancestor_name VARCHAR(200) NOT NULL,
    training_data_source JSONB DEFAULT '{}'::jsonb, -- {conversations, documents, decisions, values}
    personality_profile JSONB DEFAULT '{}'::jsonb, -- {traits, communication_style, values, beliefs}
    knowledge_base JSONB DEFAULT '{}'::jsonb, -- {business, technical, personal, wisdom}
    active_for_beneficiaries UUID[] DEFAULT ARRAY[]::UUID[], -- Qué beneficiarios pueden hablar
    conversation_limits JSONB DEFAULT '{
        "max_conversations_per_day": null,
        "topics_allowed": ["all"],
        "topics_forbidden": []
    }'::jsonb,
    model_version VARCHAR(50), -- 'gpt-4', 'claude-opus-4.6', etc.
    status VARCHAR(20) DEFAULT 'training' CHECK (status IN ('training', 'ready', 'active', 'paused', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    last_interaction_at TIMESTAMPTZ
);

-- Ancestor Conversations (Conversaciones con el AI del difunto)
CREATE TABLE IF NOT EXISTS ancestor_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ancestor_ai_id UUID NOT NULL REFERENCES ancestor_ai_instances(id) ON DELETE CASCADE,
    beneficiary_id UUID NOT NULL REFERENCES testament_beneficiaries(id) ON DELETE CASCADE,
    conversation_thread_id UUID DEFAULT gen_random_uuid(),
    message_role VARCHAR(20) NOT NULL CHECK (message_role IN ('user', 'ancestor')),
    message_content TEXT NOT NULL,
    message_metadata JSONB DEFAULT '{}'::jsonb, -- {emotion, context, wisdom_shared}
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memorial Profiles (Perfiles conmemorativos)
CREATE TABLE IF NOT EXISTS memorial_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    testament_id UUID NOT NULL REFERENCES digital_testaments(user_id) ON DELETE CASCADE,
    profile_name VARCHAR(200) NOT NULL,
    birth_date DATE,
    passing_date DATE,
    biography TEXT,
    life_achievements TEXT[],
    photo_url VARCHAR(500),
    video_url VARCHAR(500),
    quotes TEXT[], -- Frases célebres del ancestro
    values TEXT[], -- Valores que transmitió
    visibility VARCHAR(20) DEFAULT 'family' CHECK (visibility IN ('private', 'family', 'circle', 'public')),
    allow_tributes BOOLEAN DEFAULT TRUE,
    allow_ai_interaction BOOLEAN DEFAULT FALSE, -- Permitir que visitantes hablen con su AI
    metadata JSONB DEFAULT '{}'::jsonb,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Memorial Tributes (Tributos en perfiles memorial)
CREATE TABLE IF NOT EXISTS memorial_tributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memorial_id UUID NOT NULL REFERENCES memorial_profiles(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(200) NOT NULL,
    tribute_text TEXT NOT NULL,
    tribute_type VARCHAR(50) DEFAULT 'message' CHECK (tribute_type IN ('message', 'story', 'memory', 'photo', 'video')),
    media_url VARCHAR(500),
    is_approved BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Legacy Activation Events (Log de activaciones)
CREATE TABLE IF NOT EXISTS legacy_activation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    testament_id UUID NOT NULL REFERENCES digital_testaments(user_id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
        'testament_created', 'testament_updated',
        'beneficiary_added', 'beneficiary_activated',
        'vault_unlocked', 'vault_accessed',
        'ai_activated', 'ai_conversation',
        'emergency_activated', 'delegation_revoked',
        'memorial_published'
    )),
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    affected_beneficiary_id UUID REFERENCES testament_beneficiaries(id) ON DELETE SET NULL,
    affected_vault_id UUID REFERENCES testament_vaults(id) ON DELETE SET NULL,
    event_metadata JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_testament_vaults_testament ON testament_vaults(testament_id);
CREATE INDEX IF NOT EXISTS idx_testament_vaults_dimension ON testament_vaults(vault_dimension);
CREATE INDEX IF NOT EXISTS idx_testament_vaults_status ON testament_vaults(status);

CREATE INDEX IF NOT EXISTS idx_beneficiaries_testament ON testament_beneficiaries(testament_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_user ON testament_beneficiaries(beneficiary_user_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_email ON testament_beneficiaries(beneficiary_email);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_status ON testament_beneficiaries(status);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_priority ON testament_beneficiaries(testament_id, priority);

CREATE INDEX IF NOT EXISTS idx_ancestor_ai_testament ON ancestor_ai_instances(testament_id);
CREATE INDEX IF NOT EXISTS idx_ancestor_ai_status ON ancestor_ai_instances(status);

CREATE INDEX IF NOT EXISTS idx_ancestor_convs_ai ON ancestor_conversations(ancestor_ai_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ancestor_convs_beneficiary ON ancestor_conversations(beneficiary_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ancestor_convs_thread ON ancestor_conversations(conversation_thread_id, created_at);

CREATE INDEX IF NOT EXISTS idx_memorial_testament ON memorial_profiles(testament_id);
CREATE INDEX IF NOT EXISTS idx_memorial_visibility ON memorial_profiles(visibility);
CREATE INDEX IF NOT EXISTS idx_memorial_status ON memorial_profiles(status);

CREATE INDEX IF NOT EXISTS idx_tributes_memorial ON memorial_tributes(memorial_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tributes_author ON memorial_tributes(author_user_id);

CREATE INDEX IF NOT EXISTS idx_activation_events_testament ON legacy_activation_events(testament_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activation_events_type ON legacy_activation_events(event_type);

-- Functions

-- Function: Get beneficiary access level for a vault
CREATE OR REPLACE FUNCTION get_beneficiary_vault_access(
    p_beneficiary_id UUID,
    p_vault_id UUID
) RETURNS VARCHAR AS $$
DECLARE
    v_access_level VARCHAR;
    v_has_access BOOLEAN;
BEGIN
    SELECT
        access_level,
        p_vault_id = ANY(vaults_access)
    INTO v_access_level, v_has_access
    FROM testament_beneficiaries
    WHERE id = p_beneficiary_id
    AND status = 'active';

    IF NOT FOUND OR NOT v_has_access THEN
        RETURN 'none';
    END IF;

    RETURN v_access_level;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Activate legacy for beneficiary
CREATE OR REPLACE FUNCTION activate_legacy_for_beneficiary(
    p_beneficiary_id UUID,
    p_proof_of_death BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
    v_beneficiary testament_beneficiaries;
    v_testament_id UUID;
    v_unlocked_vaults UUID[];
    v_result JSONB;
BEGIN
    -- Get beneficiary details
    SELECT * INTO v_beneficiary
    FROM testament_beneficiaries
    WHERE id = p_beneficiary_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Beneficiary not found');
    END IF;

    -- Check activation conditions
    IF v_beneficiary.activation_mode = 'legado' AND NOT p_proof_of_death THEN
        RETURN jsonb_build_object('success', false, 'error', 'Proof of death required');
    END IF;

    -- Activate beneficiary
    UPDATE testament_beneficiaries
    SET status = 'active', activated_at = NOW()
    WHERE id = p_beneficiary_id;

    -- Unlock vaults
    UPDATE testament_vaults
    SET status = 'unlocked', unlocked_at = NOW()
    WHERE id = ANY(v_beneficiary.vaults_access)
    RETURNING id INTO v_unlocked_vaults;

    -- Log event
    INSERT INTO legacy_activation_events (
        testament_id, event_type, affected_beneficiary_id,
        description, event_metadata
    ) VALUES (
        v_beneficiary.testament_id,
        'beneficiary_activated',
        p_beneficiary_id,
        'Legacy activated for ' || v_beneficiary.beneficiary_name,
        jsonb_build_object(
            'proof_of_death', p_proof_of_death,
            'vaults_unlocked', v_unlocked_vaults,
            'access_level', v_beneficiary.access_level
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'beneficiary_id', p_beneficiary_id,
        'vaults_unlocked', v_unlocked_vaults,
        'access_level', v_beneficiary.access_level
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Log ancestor conversation
CREATE OR REPLACE FUNCTION log_ancestor_conversation(
    p_ancestor_ai_id UUID,
    p_beneficiary_id UUID,
    p_thread_id UUID,
    p_role VARCHAR,
    p_content TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
    v_conversation_id UUID;
BEGIN
    INSERT INTO ancestor_conversations (
        ancestor_ai_id, beneficiary_id, conversation_thread_id,
        message_role, message_content, message_metadata
    ) VALUES (
        p_ancestor_ai_id, p_beneficiary_id, p_thread_id,
        p_role, p_content, p_metadata
    ) RETURNING id INTO v_conversation_id;

    -- Update last interaction
    UPDATE ancestor_ai_instances
    SET last_interaction_at = NOW()
    WHERE id = p_ancestor_ai_id;

    RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get ancestor wisdom (para herederos)
CREATE OR REPLACE FUNCTION get_ancestor_wisdom(
    p_testament_id UUID,
    p_topic VARCHAR DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_ai_instance ancestor_ai_instances;
    v_result JSONB;
BEGIN
    SELECT * INTO v_ai_instance
    FROM ancestor_ai_instances
    WHERE testament_id = p_testament_id
    AND status = 'active'
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('available', false);
    END IF;

    -- Extract relevant wisdom from knowledge_base
    v_result := jsonb_build_object(
        'available', true,
        'ancestor_name', v_ai_instance.ancestor_name,
        'knowledge_base', v_ai_instance.knowledge_base,
        'personality', v_ai_instance.personality_profile
    );

    IF p_topic IS NOT NULL THEN
        v_result := v_result || jsonb_build_object(
            'topic_filter', p_topic
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- Comments
COMMENT ON TABLE testament_vaults IS 'Sprint 22 NEXUS: Bóvedas por dimensión (CIVEK OS, Dr.Vek, Uttill, etc)';
COMMENT ON TABLE testament_beneficiaries IS 'Sprint 22 NEXUS: Herederos con 4 niveles de acceso';
COMMENT ON TABLE ancestor_ai_instances IS 'Sprint 22 NEXUS: IA del difunto para que herederos puedan conversar';
COMMENT ON TABLE ancestor_conversations IS 'Sprint 22 NEXUS: Conversaciones con el ancestro';
COMMENT ON TABLE memorial_profiles IS 'Sprint 22 NEXUS: Perfiles conmemorativos públicos/privados';
COMMENT ON TABLE memorial_tributes IS 'Sprint 22 NEXUS: Tributos en memoriales';
COMMENT ON TABLE legacy_activation_events IS 'Sprint 22 NEXUS: Registro de eventos de herencia';

-- Demo data
INSERT INTO testament_vaults (testament_id, vault_dimension, vault_name, description, content_type, natural_heir)
SELECT
    user_id,
    'civek_os',
    'CIVEK OS Architecture & Code',
    'Toda la arquitectura técnica, código, decisiones de diseño del imperio CIVEK',
    'code',
    'Hijo con talento tecnológico'
FROM digital_testaments
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO testament_vaults (testament_id, vault_dimension, vault_name, description, content_type, natural_heir)
SELECT
    user_id,
    'family',
    'Memoria Familiar',
    'Fotos, historias, tradiciones, valores familiares',
    'media',
    'Todos los hijos'
FROM digital_testaments
LIMIT 1
ON CONFLICT DO NOTHING;
