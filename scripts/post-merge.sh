#!/bin/bash
set -e

npm install

# Apply schema changes via SQL directly to avoid interactive prompts from drizzle db:push
# This handles new tables and column additions safely with IF NOT EXISTS / IF NOT EXISTS

DB_URL="${DOKPLOY_DB_URL:-$DATABASE_URL}"

if [ -n "$DB_URL" ]; then
  echo "Applying schema migrations via SQL..."
  psql "$DB_URL" <<'ENDSQL'
-- call_logs table (Task #11)
CREATE TABLE IF NOT EXISTS call_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id VARCHAR REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  user_id VARCHAR NOT NULL,
  reminder_id VARCHAR,
  outcome TEXT NOT NULL DEFAULT 'answered',
  notes TEXT,
  duration_seconds INTEGER,
  next_follow_up_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- notifications table (Task #11)
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL,
  type TEXT NOT NULL DEFAULT 'reminder',
  message TEXT NOT NULL,
  lead_id VARCHAR REFERENCES leads(id) ON DELETE CASCADE,
  reminder_id VARCHAR,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- reminders: completed_at column (Task #11)
ALTER TABLE reminders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- leads: first_contact_at column (Task #11)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS first_contact_at TIMESTAMP;

-- leads: response_time_minutes column (if missing)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER;

-- scoring_config: weight_creation column (Task #2)
ALTER TABLE scoring_config ADD COLUMN IF NOT EXISTS weight_creation INTEGER DEFAULT 10;

SELECT 'Schema migration complete' as status;
ENDSQL
  echo "SQL migrations applied successfully."
else
  echo "No database URL found, skipping SQL migrations."
fi
