CREATE TABLE orbit_sessions (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL CHECK (provider IN ('github', 'gitlab')),
  login TEXT NOT NULL,
  display_name TEXT,
  connected_at TIMESTAMPTZ NOT NULL,
  access_token_ciphertext TEXT NOT NULL,
  refresh_token_ciphertext TEXT,
  token_expires_at TIMESTAMPTZ,
  session_expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX orbit_sessions_expiry_idx ON orbit_sessions (session_expires_at);
