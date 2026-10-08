CREATE TABLE IF NOT EXISTS business_upgrade_leads (
  id BIGSERIAL PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone VARCHAR(15) NOT NULL,
  contact TEXT NOT NULL,
  service TEXT,
  telegram_delivered BOOLEAN NOT NULL DEFAULT FALSE,
  telegram_message_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS business_upgrade_leads_created_at_idx
  ON business_upgrade_leads (created_at DESC);
