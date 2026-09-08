ALTER TABLE school_hosts
  ADD COLUMN IF NOT EXISTS verification_token_digest text;
