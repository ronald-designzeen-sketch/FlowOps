-- Quick Fix: Disable RLS for Development
-- This removes the infinite recursion issue and allows full access for testing
-- Run this in Supabase SQL Editor: https://tsnahgabddfpcxuvcxvr.supabase.co/project/tsnahgabddfpcxuvcxvr/sql/new

-- Disable Row Level Security on all tables (DEVELOPMENT ONLY)
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE channels DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE docs DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Note: This allows all authenticated users to access all data
-- Perfect for development and testing
-- For production, you'll need proper RLS policies
