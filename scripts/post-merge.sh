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

-- lead_manager_comments table (Task #15)
CREATE TABLE IF NOT EXISTS lead_manager_comments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id VARCHAR REFERENCES leads(id) ON DELETE CASCADE NOT NULL,
  manager_id VARCHAR REFERENCES users(id) NOT NULL,
  manager_name TEXT,
  content TEXT NOT NULL,
  is_read_by_agent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- whatsapp_campaigns table (Task #10)
CREATE TABLE IF NOT EXISTS whatsapp_campaigns (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  filter_state_id VARCHAR,
  filter_channel TEXT,
  filter_days_no_reply INTEGER,
  scheduled_at TIMESTAMP,
  status TEXT DEFAULT 'draft',
  created_by TEXT NOT NULL,
  total_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- whatsapp_campaign_recipients table (Task #10)
CREATE TABLE IF NOT EXISTS whatsapp_campaign_recipients (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id VARCHAR REFERENCES whatsapp_campaigns(id),
  lead_id VARCHAR REFERENCES leads(id),
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  sent_at TIMESTAMP,
  error_message TEXT
);

-- whatsapp_followup_rules table (Task #10)
CREATE TABLE IF NOT EXISTS whatsapp_followup_rules (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  days_after_no_reply INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT NOT NULL,
  last_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- chatbot_settings table (Task #11)
CREATE TABLE IF NOT EXISTS chatbot_settings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,
  working_hours_start INTEGER DEFAULT 9,
  working_hours_end INTEGER DEFAULT 18,
  welcome_message TEXT DEFAULT 'أهلاً! 👋 أنا المساعد الذكي لشركتنا العقارية.',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- leads: bot columns (Task #11)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bot_active BOOLEAN DEFAULT true;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bot_stage TEXT DEFAULT 'greeting';

-- leads: ai_analyzed_at column (Task #9)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP;

SELECT 'Schema migration complete' as status;
ENDSQL
  echo "SQL migrations applied successfully."
else
  echo "No database URL found, skipping SQL migrations."
fi
