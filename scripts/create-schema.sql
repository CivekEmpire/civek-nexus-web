-- CIVEK NEXUS - Sprint 16: User Circles Schema
-- Database: Neon PostgreSQL (same as civek-gateway)
-- Date: 2026-04-19

-- User Circles Table
CREATE TABLE IF NOT EXISTS user_circles (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    circle_type VARCHAR(20) NOT NULL CHECK (circle_type IN ('vida', 'negocios', 'elite')),
    verified BOOLEAN DEFAULT FALSE,
    verification_date TIMESTAMPTZ,
    verification_method VARCHAR(50),
    reputation_score INTEGER DEFAULT 0,
    profile_data JSONB DEFAULT '{}',
    user_references JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_circles_type ON user_circles(circle_type);
CREATE INDEX IF NOT EXISTS idx_user_circles_verified ON user_circles(verified);
CREATE INDEX IF NOT EXISTS idx_user_circles_reputation ON user_circles(reputation_score DESC);

-- Comments
COMMENT ON TABLE user_circles IS 'CIVEK NEXUS user profiles organized by circles (Vida, Negocios, Élite)';
COMMENT ON COLUMN user_circles.circle_type IS 'Type of circle: vida (personal), negocios (business), elite (exclusive)';
COMMENT ON COLUMN user_circles.verified IS 'Verification status for this circle';
COMMENT ON COLUMN user_circles.reputation_score IS 'Reputation score (0-1000)';
COMMENT ON COLUMN user_circles.profile_data IS 'Additional profile data specific to this circle';
COMMENT ON COLUMN user_circles.user_references IS 'Professional/personal references (for negocios/elite circles)';

-- Insert demo data for testing
INSERT INTO user_circles (user_id, circle_type, verified, verification_method, reputation_score, profile_data)
VALUES
    ('550e8400-e29b-41d4-a716-446655440000', 'vida', true, 'Email + Phone', 450,
     '{"name": "Carlos Mora", "email": "cmoramorales@gmail.com", "phone_verified": true}'),
    ('550e8400-e29b-41d4-a716-446655440001', 'negocios', false, null, 120,
     '{"name": "Carlos Mora", "email": "cmoramorales@gmail.com", "company": "CIVEK Empire"}'),
    ('550e8400-e29b-41d4-a716-446655440002', 'elite', false, null, 0,
     '{"name": "Carlos Mora", "email": "cmoramorales@gmail.com"}')
ON CONFLICT (user_id) DO NOTHING;
