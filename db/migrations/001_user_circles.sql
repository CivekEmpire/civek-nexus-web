-- Migration 001: User Circles Schema
-- Sprint 16: Perfiles de Usuario
-- Fecha: 19 Abril 2026

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User circles
CREATE TABLE IF NOT EXISTS user_circles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    circle_type VARCHAR(20) NOT NULL CHECK (circle_type IN ('vida', 'negocios', 'elite')),
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMPTZ,
    verification_method VARCHAR(50),
    reputation_score INTEGER DEFAULT 0 CHECK (reputation_score >= 0 AND reputation_score <= 1000),
    profile_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_circle_type ON user_circles(circle_type);
CREATE INDEX IF NOT EXISTS idx_verified ON user_circles(verified);
CREATE INDEX IF NOT EXISTS idx_reputation ON user_circles(reputation_score DESC);

-- References table
CREATE TABLE IF NOT EXISTS references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    circle_type VARCHAR(20) NOT NULL CHECK (circle_type IN ('vida', 'negocios', 'elite')),
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_user_id, to_user_id, circle_type)
);

-- Indexes for references
CREATE INDEX IF NOT EXISTS idx_references_to_user ON references(to_user_id);
CREATE INDEX IF NOT EXISTS idx_references_status ON references(status);
CREATE INDEX IF NOT EXISTS idx_references_circle ON references(circle_type);

-- Verification attempts
CREATE TABLE IF NOT EXISTS verification_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    circle_type VARCHAR(20) NOT NULL,
    method VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_user ON verification_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_status ON verification_attempts(status);

-- Comments
COMMENT ON TABLE user_circles IS 'Sprint 16: User profiles differentiated by circle (Vida, Negocios, Elite)';
COMMENT ON TABLE references IS 'Sprint 16: Professional and personal references system';
COMMENT ON TABLE verification_attempts IS 'Sprint 16: Track verification attempts for each circle';
