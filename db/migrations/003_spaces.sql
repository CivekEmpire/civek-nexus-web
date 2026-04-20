-- Migration 003: Spaces (Communities, Groups, Channels)
-- Sprint 18 NEXUS: Espacios
-- Fecha: 19 Abril 2026

-- Spaces table
CREATE TABLE IF NOT EXISTS spaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('community', 'group', 'channel')),
    circle_type VARCHAR(20) CHECK (circle_type IN ('vida', 'negocios', 'elite', 'shared')),
    visibility VARCHAR(20) DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'invite')),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    member_count INTEGER DEFAULT 1,
    description TEXT,
    avatar_url TEXT,
    settings JSONB DEFAULT '{
        "allow_attachments": true,
        "allow_mentions": true,
        "allow_threads": true,
        "allow_reactions": true,
        "moderation_level": "medium"
    }'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Space members
CREATE TABLE IF NOT EXISTS space_members (
    space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'moderator', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    notification_settings JSONB DEFAULT '{
        "enabled": true,
        "mentions_only": false,
        "mute_until": null
    }'::jsonb,
    PRIMARY KEY (space_id, user_id)
);

-- Space messages
CREATE TABLE IF NOT EXISTS space_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    mentions JSONB DEFAULT '[]'::jsonb, -- [{user_id, name}]
    parent_message_id UUID REFERENCES space_messages(id) ON DELETE CASCADE, -- for threads
    pinned BOOLEAN DEFAULT FALSE,
    edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message reactions
CREATE TABLE IF NOT EXISTS message_reactions (
    message_id UUID REFERENCES space_messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (message_id, user_id, emoji)
);

-- Space invitations
CREATE TABLE IF NOT EXISTS space_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invited_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    invited_email VARCHAR(255),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT invited_user_or_email CHECK (
        (invited_user_id IS NOT NULL) OR (invited_email IS NOT NULL)
    )
);

-- Space activity log
CREATE TABLE IF NOT EXISTS space_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    space_id UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    activity_type VARCHAR(50) NOT NULL, -- 'member_joined', 'member_left', 'message_pinned', 'settings_changed', etc.
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_spaces_type ON spaces(type);
CREATE INDEX IF NOT EXISTS idx_spaces_circle ON spaces(circle_type);
CREATE INDEX IF NOT EXISTS idx_spaces_visibility ON spaces(visibility);
CREATE INDEX IF NOT EXISTS idx_spaces_owner ON spaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_spaces_created ON spaces(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_space_members_user ON space_members(user_id);
CREATE INDEX IF NOT EXISTS idx_space_members_role ON space_members(role);

CREATE INDEX IF NOT EXISTS idx_messages_space ON space_messages(space_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_user ON space_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON space_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_pinned ON space_messages(space_id, pinned) WHERE pinned = TRUE;

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);

CREATE INDEX IF NOT EXISTS idx_invitations_space ON space_invitations(space_id);
CREATE INDEX IF NOT EXISTS idx_invitations_user ON space_invitations(invited_user_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON space_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON space_invitations(status);

CREATE INDEX IF NOT EXISTS idx_activity_space ON space_activity(space_id, created_at DESC);

-- Function para actualizar member_count
CREATE OR REPLACE FUNCTION update_space_member_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE spaces SET member_count = member_count + 1 WHERE id = NEW.space_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE spaces SET member_count = member_count - 1 WHERE id = OLD.space_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_space_member_count
    AFTER INSERT OR DELETE ON space_members
    FOR EACH ROW
    EXECUTE FUNCTION update_space_member_count();

-- Function para log activity
CREATE OR REPLACE FUNCTION log_space_activity() RETURNS TRIGGER AS $$
DECLARE
    activity_type_val VARCHAR;
    metadata_val JSONB;
BEGIN
    IF TG_TABLE_NAME = 'space_members' THEN
        IF TG_OP = 'INSERT' THEN
            activity_type_val := 'member_joined';
            metadata_val := json_build_object('user_id', NEW.user_id, 'role', NEW.role)::jsonb;
        ELSIF TG_OP = 'DELETE' THEN
            activity_type_val := 'member_left';
            metadata_val := json_build_object('user_id', OLD.user_id)::jsonb;
        END IF;

        INSERT INTO space_activity (space_id, user_id, activity_type, metadata)
        VALUES (COALESCE(NEW.space_id, OLD.space_id), COALESCE(NEW.user_id, OLD.user_id), activity_type_val, metadata_val);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_member_activity
    AFTER INSERT OR DELETE ON space_members
    FOR EACH ROW
    EXECUTE FUNCTION log_space_activity();

-- Comments
COMMENT ON TABLE spaces IS 'Sprint 18 NEXUS: Communities, Groups, and Channels';
COMMENT ON TABLE space_members IS 'Sprint 18 NEXUS: Space membership with roles';
COMMENT ON TABLE space_messages IS 'Sprint 18 NEXUS: Messages within spaces';
COMMENT ON TABLE message_reactions IS 'Sprint 18 NEXUS: Emoji reactions to messages';
COMMENT ON TABLE space_invitations IS 'Sprint 18 NEXUS: Space invitation system';
COMMENT ON TABLE space_activity IS 'Sprint 18 NEXUS: Activity log for audit trail';

-- Demo data
INSERT INTO spaces (id, name, type, circle_type, visibility, owner_id, description)
VALUES
    ('11111111-1111-1111-1111-111111111111'::uuid, 'CIVEK Empire', 'community', 'negocios', 'private',
     '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Comunidad oficial CIVEK Empire'),
    ('22222222-2222-2222-2222-222222222222'::uuid, 'Familia Mora', 'group', 'vida', 'private',
     '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Grupo familiar privado'),
    ('33333333-3333-3333-3333-333333333333'::uuid, 'Anuncios CIVEK', 'channel', 'shared', 'public',
     '550e8400-e29b-41d4-a716-446655440000'::uuid, 'Canal oficial de anuncios')
ON CONFLICT (id) DO NOTHING;

-- Add owner as member
INSERT INTO space_members (space_id, user_id, role)
VALUES
    ('11111111-1111-1111-1111-111111111111'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'owner'),
    ('22222222-2222-2222-2222-222222222222'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'owner'),
    ('33333333-3333-3333-3333-333333333333'::uuid, '550e8400-e29b-41d4-a716-446655440000'::uuid, 'owner')
ON CONFLICT DO NOTHING;
