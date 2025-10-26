-- Fix for Infinite Recursion in RLS Policies
-- Run this in Supabase SQL Editor to fix the policy issues

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace projects" ON projects;
DROP POLICY IF EXISTS "Users can view workspace tasks" ON tasks;

-- Recreate workspace policies (simplified)
CREATE POLICY "Users can view their own workspaces" ON workspaces
  FOR SELECT USING (
    auth.uid() = owner_id OR
    id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Recreate workspace_members policies (simplified)
CREATE POLICY "Users can view workspace members" ON workspace_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    workspace_id IN (SELECT workspace_id FROM workspace_members wm WHERE wm.user_id = auth.uid())
  );

-- Recreate projects policies (simplified)
CREATE POLICY "Users can view workspace projects" ON projects
  FOR SELECT USING (
    workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid())
  );

-- Recreate tasks policies (simplified - allow all authenticated users for now)
CREATE POLICY "Users can view all tasks" ON tasks
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Alternative: Disable RLS temporarily for testing (ONLY FOR DEVELOPMENT)
-- Uncomment these if you still have issues:

-- ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
