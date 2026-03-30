-- Migration: Add WhatsApp smart chatbot support
-- Applied: 2026-03-30
-- Task #11: شات بوت واتساب ذكي

-- Add bot_active and bot_stage columns to leads table for per-lead bot state tracking
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS bot_active boolean DEFAULT true;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS bot_stage text DEFAULT 'greeting';

-- Create chatbot_settings table for per-user chatbot configuration
CREATE TABLE IF NOT EXISTS chatbot_settings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL UNIQUE,
  is_active boolean DEFAULT false,
  working_hours_start integer DEFAULT 9,
  working_hours_end integer DEFAULT 18,
  welcome_message text DEFAULT 'أهلاً! أنا المساعد الذكي. ممكن تعرفني باسمك؟',
  updated_at timestamp DEFAULT now()
);
