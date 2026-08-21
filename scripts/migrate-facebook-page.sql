-- Facebook Page connection (agence) + anti-doublon publication blog (idempotent)

CREATE TABLE IF NOT EXISTS facebook_page_connection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id VARCHAR(64) NOT NULL,
  page_name VARCHAR(255) NOT NULL,
  page_access_token_enc TEXT NOT NULL,
  user_token_enc TEXT,
  token_expires_at TIMESTAMPTZ,
  available_pages JSONB NOT NULL DEFAULT '[]',
  connected_by UUID REFERENCES crm_users(id) ON DELETE SET NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Une seule connexion agence
CREATE UNIQUE INDEX IF NOT EXISTS idx_facebook_page_connection_singleton
  ON facebook_page_connection ((true));

ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS facebook_post_id VARCHAR(128);
ALTER TABLE blog_posts ADD COLUMN IF NOT EXISTS facebook_published_at TIMESTAMPTZ;
