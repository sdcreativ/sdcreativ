-- Conversations avec Kady (assistance virtuelle) : visibles dans CRM → Conversations Kady.
-- Aucune IP ni identifiant de navigateur : l'identifiant est tiré au hasard par le widget (session).
-- Conservation : 90 jours après le dernier message, sauf si la conversation a donné un prospect.
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY,
  locale VARCHAR(5) NOT NULL DEFAULT 'fr',
  first_page VARCHAR(300),
  last_page VARCHAR(300),
  attribution JSONB,
  acquisition_channel VARCHAR(30),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  intent VARCHAR(20),
  contact_offered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_last ON chat_conversations (last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_lead ON chat_conversations (lead_id) WHERE lead_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages (conversation_id, id);
