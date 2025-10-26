-- FlowOps Database Schema for Supabase
-- Run this SQL in your Supabase SQL Editor: https://tsnahgabddfpcxuvcxvr.supabase.co/project/tsnahgabddfpcxuvcxvr/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed', 'archived')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create subtasks table
CREATE TABLE IF NOT EXISTS subtasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create time_entries table
CREATE TABLE IF NOT EXISTS time_entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  duration INTEGER, -- in minutes
  description TEXT,
  billable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create channels table
CREATE TABLE IF NOT EXISTS channels (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create docs table
CREATE TABLE IF NOT EXISTS docs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users view (for easier querying)
CREATE OR REPLACE VIEW users AS
SELECT 
  id,
  raw_user_meta_data->>'name' as name,
  email,
  raw_user_meta_data->>'avatar_url' as avatar_url,
  created_at
FROM auth.users;

-- Enable Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Users can view their own workspaces" ON workspaces
  FOR SELECT USING (
    auth.uid() = owner_id OR
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their workspaces" ON workspaces
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their workspaces" ON workspaces
  FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for workspace_members
CREATE POLICY "Users can view workspace members" ON workspace_members
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid())
  );

CREATE POLICY "Workspace owners can manage members" ON workspace_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_id = auth.uid())
  );

-- RLS Policies for projects
CREATE POLICY "Users can view workspace projects" ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update workspace projects" ON projects
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = projects.workspace_id AND user_id = auth.uid())
  );

-- RLS Policies for tasks
CREATE POLICY "Users can view workspace tasks" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
      WHERE p.id = tasks.project_id AND wm.user_id = auth.uid()
    ) OR
    tasks.project_id IS NULL
  );

CREATE POLICY "Users can create tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update tasks" ON tasks
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS Policies for subtasks
CREATE POLICY "Users can view subtasks" ON subtasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM tasks WHERE tasks.id = subtasks.task_id
    )
  );

CREATE POLICY "Users can manage subtasks" ON subtasks
  FOR ALL USING (auth.uid() IS NOT NULL);

-- RLS Policies for time_entries
CREATE POLICY "Users can view their time entries" ON time_entries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their time entries" ON time_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their time entries" ON time_entries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their time entries" ON time_entries
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for channels
CREATE POLICY "Users can view workspace channels" ON channels
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = channels.workspace_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create channels" ON channels
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = channels.workspace_id AND user_id = auth.uid())
  );

-- RLS Policies for messages
CREATE POLICY "Users can view channel messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM channels c
      JOIN workspace_members wm ON wm.workspace_id = c.workspace_id
      WHERE c.id = messages.channel_id AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- RLS Policies for meetings
CREATE POLICY "Users can view workspace meetings" ON meetings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = meetings.workspace_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create meetings" ON meetings
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = meetings.workspace_id AND user_id = auth.uid())
  );

-- RLS Policies for docs
CREATE POLICY "Users can view workspace docs" ON docs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = docs.workspace_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create docs" ON docs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = docs.workspace_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update docs" ON docs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = docs.workspace_id AND user_id = auth.uid())
  );

-- RLS Policies for notifications
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Users can update their notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for activity_logs
CREATE POLICY "Users can view workspace activity" ON activity_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "System can create activity logs" ON activity_logs
  FOR INSERT WITH CHECK (TRUE);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_task_id ON time_entries(task_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_start_time ON time_entries(start_time);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);

-- Insert some seed data (optional)
-- You can run this after creating your first account to have some demo data

-- First, you'll need to sign up to get a user_id, then replace 'YOUR_USER_ID' below

-- INSERT INTO workspaces (name, owner_id) VALUES ('Demo Workspace', 'YOUR_USER_ID');
-- INSERT INTO workspace_members (workspace_id, user_id, role) 
--   SELECT id, 'YOUR_USER_ID', 'owner' FROM workspaces WHERE name = 'Demo Workspace';
-- INSERT INTO projects (workspace_id, name, description)
--   SELECT id, 'Website Redesign', 'Redesigning the company website' FROM workspaces WHERE name = 'Demo Workspace';
-- INSERT INTO projects (workspace_id, name, description)
--   SELECT id, 'Mobile App', 'Building a new mobile application' FROM workspaces WHERE name = 'Demo Workspace';
