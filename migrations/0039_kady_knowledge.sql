-- Base de connaissances de Kady, modifiable dans CRM → Site → Kady → Réponses.
-- Tant que la table est vide pour une langue, Kady utilise la base écrite dans le code.
CREATE TABLE IF NOT EXISTS kady_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale VARCHAR(5) NOT NULL DEFAULT 'fr',
  title VARCHAR(120) NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  answer TEXT NOT NULL,
  links JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_kady_knowledge_locale ON kady_knowledge (locale, is_active, sort_order);

-- Qualité des réponses : origine de la réponse et avis du visiteur (👍 / 👎).
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS answer_source VARCHAR(12);
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS rating SMALLINT;
-- Question traitée dans l'admin (ajoutée à la base ou ignorée) : sort de la liste « à améliorer ».
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
