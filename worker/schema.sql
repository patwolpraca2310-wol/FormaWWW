-- No names, email addresses, IP addresses or message bodies are stored here.
CREATE TABLE IF NOT EXISTS contact_submissions (
  fingerprint TEXT PRIMARY KEY NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','sent','failed','uncertain')),
  owner TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS contact_submissions_expiry ON contact_submissions(expires_at);
