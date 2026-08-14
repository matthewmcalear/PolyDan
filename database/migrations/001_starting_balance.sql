-- Migration: Starting Balance for New Users
-- Run this in Supabase SQL editor
-- This sets the default starting balance to 1000 fake dollars for all new users

-- Update the default value for the points column
ALTER TABLE users ALTER COLUMN points SET DEFAULT 1000;

-- Optionally, backfill existing users with 0 points to have 1000 points
-- Uncomment the following line if you want to give existing users with 0 points the starting balance:
-- UPDATE users SET points = 1000 WHERE points = 0;
