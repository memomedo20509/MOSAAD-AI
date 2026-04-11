-- Add type and state tracking columns to lead_history table
ALTER TABLE lead_history ADD COLUMN IF NOT EXISTS type text DEFAULT 'other';
ALTER TABLE lead_history ADD COLUMN IF NOT EXISTS from_state_id varchar;
ALTER TABLE lead_history ADD COLUMN IF NOT EXISTS to_state_id varchar;

-- Backfill type from action text for existing records
UPDATE lead_history SET type = 'created' WHERE action ILIKE '%إنشاء%' OR action ILIKE '%إضافة%' OR action = 'تم إنشاء الليد';
UPDATE lead_history SET type = 'state_change' WHERE action ILIKE '%انتقل%' OR action ILIKE '%تغيير الحالة%';
UPDATE lead_history SET type = 'assignment' WHERE action ILIKE '%تعيين%' OR action ILIKE '%نقل%' OR action ILIKE '%توزيع%';
UPDATE lead_history SET type = 'call' WHERE action ILIKE '%مكالمة%' OR action ILIKE '%لم يرد%';
UPDATE lead_history SET type = 'whatsapp' WHERE action ILIKE '%واتساب%';
UPDATE lead_history SET type = 'note' WHERE action ILIKE '%ملاحظة%';
