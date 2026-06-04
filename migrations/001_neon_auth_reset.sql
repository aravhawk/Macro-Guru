-- Migration: self-rolled JWT/bcrypt auth -> Neon Auth.
--
-- Users are now managed by Neon Auth (neon_auth.users_sync). This drops the
-- local users table and changes user_id columns from uuid to text (the Neon
-- Auth user id type).
--
-- NOTE: this is a fresh reset. Existing conversations/messages reference local
-- user ids that have no Neon Auth equivalent, so they are dropped rather than
-- remapped. Do NOT run this against a database whose data must be preserved.

BEGIN;

DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  thread_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, date)
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_rate_limits_user_id_date ON rate_limits(user_id, date);

COMMIT;
