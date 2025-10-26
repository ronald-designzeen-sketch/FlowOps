# FlowOps - Team Productivity Platform

FlowOps is an all-in-one productivity platform for teams that combines task management, time tracking, chat, meetings, docs, and more.

## 🚀 Features

### ✅ Core Features (Implemented)
- **Task Management**: Create, organize, and track tasks with status management (To Do, In Progress, Completed)
- **Time Tracking**: Start/stop timers directly from tasks, track time automatically
- **Projects**: Organize tasks into projects
- **Dashboard**: View task overview and time tracking statistics
- **Authentication**: Secure user authentication with Supabase Auth
- **Workspaces**: Each user gets their own workspace

### 🎯 Key Highlights
- **Integrated Time Tracking**: Start timers on any task with one click
- **Live Timer**: Active timer shows in the top bar with real-time duration
- **Time Analytics**: View time logged today, this week, and this month
- **Beautiful UI**: Modern interface built with Tailwind CSS and shadcn/ui
- **Responsive Design**: Works on desktop and mobile

## 📋 Setup Instructions

### 1. Database Setup

You need to create the database tables in your Supabase account:

1. Go to your Supabase SQL Editor: https://tsnahgabddfpcxuvcxvr.supabase.co/project/tsnahgabddfpcxuvcxvr/sql

2. Copy the contents of `supabase-schema.sql` and run it in the SQL Editor

3. This will create all necessary tables:
   - workspaces
   - workspace_members
   - projects
   - tasks
   - subtasks
   - time_entries
   - channels
   - messages
   - meetings
   - docs
   - notifications
   - activity_logs

4. The script also sets up Row Level Security (RLS) policies to ensure data security

### 2. Environment Variables

The following environment variables are already configured in `.env`:

```
NEXT_PUBLIC_SUPABASE_URL=https://tsnahgabddfpcxuvcxvr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. Install Dependencies

```bash
cd /app
yarn install
```

### 4. Run the Application

The application is already running via supervisor. Access it at:
https://team-productivity.preview.emergentagent.com

## 📖 How to Use

### First Time Setup
1. **Sign Up**: Create a new account
2. **Automatic Workspace**: A workspace is automatically created for you
3. **Create a Project**: Click on "Projects" and create your first project
4. **Create Tasks**: Navigate to "Tasks" and click "New Task"

### Task Management
1. **Create Task**: Click "New Task" button, fill in details
2. **Update Status**: Move tasks between To Do, In Progress, and Completed
3. **Priority Levels**: Set priority as Low, Medium, or High

### Time Tracking
1. **Start Timer**: Click the "Start" button on any task
2. **Active Timer**: Shows in the top bar with running duration
3. **Stop Timer**: Click "Stop" to log the time
4. **View Entries**: Go to "Time Tracking" page to see all logged time
5. **Dashboard Stats**: View time logged today/week/month on Dashboard

### Navigation
- **Dashboard**: Overview of tasks and time tracking stats
- **Tasks**: Manage all your tasks with different views (All, To Do, In Progress, Completed)
- **Time Tracking**: View all your time entries
- **Projects**: View and manage projects

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14, React, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime (ready to use)

### Key Files
- `/app/app/page.js` - Main application frontend
- `/app/app/api/[[...path]]/route.js` - Backend API routes
- `/app/lib/supabase.js` - Supabase client configuration
- `/app/supabase-schema.sql` - Database schema

### API Endpoints

**Authentication**
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout

**Tasks**
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task

**Projects**
- `GET /api/projects` - Get all projects
- `POST /api/projects` - Create new project

**Time Tracking**
- `GET /api/time-entries` - Get time entries
- `GET /api/time-entries/active` - Get active timer
- `POST /api/time-entries/start` - Start timer
- `POST /api/time-entries/stop` - Stop timer

**Dashboard**
- `GET /api/dashboard/stats` - Get dashboard statistics

## 🎨 Design System

The application uses a consistent design system:
- **Primary Color**: Indigo (#4F46E5)
- **Font**: Inter
- **Components**: shadcn/ui
- **Icons**: Lucide React

## 🔮 Future Enhancements

The application is ready to be extended with:
- **Chat System**: Real-time chat with channels (tables already exist)
- **Meetings**: Calendar integration and meeting management (tables already exist)
- **Docs**: Rich text editor for collaborative documents (tables already exist)
- **Notifications**: Real-time notifications system (table already exists)
- **Activity Logs**: Track all user actions (table already exists)
- **Team Management**: Invite team members to workspaces
- **Realtime Updates**: Live task updates across users
- **Advanced Analytics**: Charts and insights
- **File Attachments**: Upload files to tasks
- **Subtasks**: Break down tasks into smaller items

## 🐛 Troubleshooting

### Authentication Issues
- Make sure you've run the database schema in Supabase
- Check that environment variables are set correctly
- Clear browser cache and try again

### Time Tracking Not Working
- Ensure you're logged in
- Check that the tasks table exists in Supabase
- Verify time_entries table was created

### Can't Create Tasks
- Make sure you've created a project first
- Verify workspace_members table has your user

## 📝 Notes

- All UUIDs are used instead of MongoDB ObjectIDs for better JSON serialization
- Row Level Security ensures users can only access their own data
- Time durations are stored in minutes
- All timestamps use timezone-aware PostgreSQL timestamps

## 🎉 Success!

Your FlowOps platform is now ready to use! Start by:
1. Running the SQL schema in Supabase
2. Creating an account
3. Creating your first project
4. Adding tasks and tracking time!

Enjoy your new productivity platform! 🚀
