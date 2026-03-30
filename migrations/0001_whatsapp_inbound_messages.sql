-- Migration: Add inbound WhatsApp message support to whatsapp_messages_log
-- Applied: 2026-03-30
-- Task #7: استقبال واتساب + إنشاء ليدز تلقائياً

-- Add direction column (inbound/outbound) to distinguish message flow
ALTER TABLE whatsapp_messages_log
  ADD COLUMN IF NOT EXISTS direction text DEFAULT 'outbound';

-- Add message_text column to store the actual message content
ALTER TABLE whatsapp_messages_log
  ADD COLUMN IF NOT EXISTS message_text text;

-- Add message_id column for WhatsApp deduplication (prevents processing same message twice)
ALTER TABLE whatsapp_messages_log
  ADD COLUMN IF NOT EXISTS message_id varchar;

-- Make agent_id nullable to support inbound messages that have no agent sender
-- (inbound messages are received by the agent, not sent by them)
ALTER TABLE whatsapp_messages_log
  ALTER COLUMN agent_id DROP NOT NULL;

-- Optional: index on message_id for fast deduplication lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_log_message_id
  ON whatsapp_messages_log (message_id)
  WHERE message_id IS NOT NULL;
