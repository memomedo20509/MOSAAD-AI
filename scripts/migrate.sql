-- Migration: Add googleId to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR UNIQUE;
