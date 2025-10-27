'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Play, Pause, Clock, CheckCircle2, Circle, AlertCircle, Plus, LogOut, LayoutDashboard, ListTodo, Timer, Folder, Menu, X, MessageSquare, Calendar, FileText, Settings, Send, Bell } from 'lucide-react'
import { toast } from 'sonner'

const App = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  // Auth states
  const [authMode, setAuthMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  
  // Data states
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [timeEntries, setTimeEntries] = useState([])
  const [activeTimer, setActiveTimer] = useState(null)
  const [dashboardStats, setDashboardStats] = useState(null)
  const [channels, setChannels] = useState([])
  const [messages, setMessages] = useState([])
  const [selectedChannel, setSelectedChannel] = useState(null)
  const [meetings, setMeetings] = useState([])
  const [docs, setDocs] = useState([])
  const [notifications, setNotifications] = useState([])
  const [workspace, setWorkspace] = useState(null)
  
  // Form states
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [newProjectOpen, setNewProjectOpen] = useState(false)
  const [newChannelOpen, setNewChannelOpen] = useState(false)
  const [newMeetingOpen, setNewMeetingOpen] = useState(false)
  const [newDocOpen, setNewDocOpen] = useState(false)
  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    project_id: ''
  })
  const [newProjectData, setNewProjectData] = useState({
    name: '',
    description: ''
  })
  const [newChannelData, setNewChannelData] = useState({ name: '' })
  const [newMeetingData, setNewMeetingData] = useState({
    title: '',
    start_time: '',
    end_time: '',
    notes: ''
  })
  const [newDocData, setNewDocData] = useState({ title: '', content: '' })
  const [messageInput, setMessageInput] = useState('')
  
  // Timer state
  const [timerDuration, setTimerDuration] = useState(0)
  const [timerInterval, setTimerInterval] = useState(null)
  
  useEffect(() => {
    checkUser()
  }, [])
  
  useEffect(() => {
    if (user) {
      loadData()
      checkActiveTimer()
    }
  }, [user])
  
  // Timer effect
  useEffect(() => {
    if (activeTimer) {
      const startTime = new Date(activeTimer.start_time)
      
      const interval = setInterval(() => {
        const now = new Date()
        const duration = Math.floor((now - startTime) / 1000)
        setTimerDuration(duration)
      }, 1000)
      
      setTimerInterval(interval)
      
      return () => clearInterval(interval)
    } else {
      if (timerInterval) {
        clearInterval(timerInterval)
        setTimerInterval(null)
      }
      setTimerDuration(0)
    }
  }, [activeTimer])
  
  const checkUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      if (authMode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name }
          }
        })
        
        if (error) throw error
        
        if (data.user) {
          // Create default workspace
          const { data: workspace, error: wsError } = await supabase
            .from('workspaces')
            .insert([{
              name: `${name}'s Workspace`,
              owner_id: data.user.id
            }])
            .select()
            .single()
          
          if (!wsError && workspace) {
            await supabase.from('workspace_members').insert([{
              workspace_id: workspace.id,
              user_id: data.user.id,
              role: 'owner'
            }])
          }
          
          toast.success('Account created! Please check your email to verify.')
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) throw error
        
        setUser(data.user)
        toast.success('Welcome back!')
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }
  
  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    toast.success('Logged out successfully')
  }
  
  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Load workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace:workspaces(*)')
        .eq('user_id', session.user.id)
        .single()

      if (membership?.workspace) {
        setWorkspace(membership.workspace)
      }

      // Load projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('*')
        .order('name')
      setProjects(projectsData || [])
      
      // Load tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(`
          *,
          project:projects(id, name),
          time_entries(*)
        `)
        .order('created_at', { ascending: false })
      
      const tasksWithTime = (tasksData || []).map(task => ({
        ...task,
        total_time: task.time_entries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0
      }))
      setTasks(tasksWithTime)
      
      // Load time entries
      const { data: entriesData } = await supabase
        .from('time_entries')
        .select(`
          *,
          task:tasks(id, title)
        `)
        .order('start_time', { ascending: false })
        .limit(50)
      setTimeEntries(entriesData || [])
      
      // Load dashboard stats
      loadDashboardStats()
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }
  
  const loadDashboardStats = async () => {
    try {
      // Task stats
      const taskStats = {
        total: tasks.length,
        todo: tasks.filter(t => t.status === 'todo').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length
      }
      
      // Time stats
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      
      const monthAgo = new Date()
      monthAgo.setDate(monthAgo.getDate() - 30)
      
      const todayEntries = timeEntries.filter(e => new Date(e.start_time) >= today && e.duration)
      const weekEntries = timeEntries.filter(e => new Date(e.start_time) >= weekAgo && e.duration)
      const monthEntries = timeEntries.filter(e => new Date(e.start_time) >= monthAgo && e.duration)
      
      const timeStats = {
        today: todayEntries.reduce((sum, e) => sum + (e.duration || 0), 0),
        week: weekEntries.reduce((sum, e) => sum + (e.duration || 0), 0),
        month: monthEntries.reduce((sum, e) => sum + (e.duration || 0), 0)
      }
      
      setDashboardStats({ taskStats, timeStats })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }
  
  const checkActiveTimer = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const { data: entry } = await supabase
        .from('time_entries')
        .select(`
          *,
          task:tasks(id, title)
        `)
        .eq('user_id', session.user.id)
        .is('end_time', null)
        .single()
      
      setActiveTimer(entry || null)
    } catch (error) {
      // No active timer
    }
  }
  
  const createTask = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...newTaskData,
          created_by: session.user.id,
          assignee_id: session.user.id
        }])
        .select(`
          *,
          project:projects(id, name)
        `)
        .single()
      
      if (error) throw error
      
      setTasks([{ ...data, time_entries: [], total_time: 0 }, ...tasks])
      setNewTaskOpen(false)
      setNewTaskData({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        project_id: ''
      })
      toast.success('Task created!')
    } catch (error) {
      toast.error('Error creating task')
    }
  }
  
  const createProject = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      // Get user's workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single()
      
      if (!membership) {
        toast.error('No workspace found')
        return
      }
      
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          ...newProjectData,
          workspace_id: membership.workspace_id
        }])
        .select()
        .single()
      
      if (error) throw error
      
      setProjects([...projects, data])
      setNewProjectOpen(false)
      setNewProjectData({ name: '', description: '' })
      toast.success('Project created!')
    } catch (error) {
      toast.error('Error creating project')
    }
  }
  
  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', taskId)
        .select(`
          *,
          project:projects(id, name),
          time_entries(*)
        `)
        .single()
      
      if (error) throw error
      
      const updatedTask = {
        ...data,
        total_time: data.time_entries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0
      }
      
      setTasks(tasks.map(t => t.id === taskId ? updatedTask : t))
      toast.success('Task updated!')
    } catch (error) {
      toast.error('Error updating task')
    }
  }
  
  const startTimer = async (taskId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      
      // Check for active timer
      if (activeTimer) {
        toast.error('Please stop the current timer first')
        return
      }
      
      const { data, error } = await supabase
        .from('time_entries')
        .insert([{
          task_id: taskId,
          user_id: session.user.id,
          start_time: new Date().toISOString()
        }])
        .select(`
          *,
          task:tasks(id, title)
        `)
        .single()
      
      if (error) throw error
      
      setActiveTimer(data)
      toast.success('Timer started!')
    } catch (error) {
      toast.error('Error starting timer')
    }
  }
  
  const stopTimer = async () => {
    try {
      if (!activeTimer) return
      
      const endTime = new Date()
      const startTime = new Date(activeTimer.start_time)
      const duration = Math.floor((endTime - startTime) / 1000 / 60)
      
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          end_time: endTime.toISOString(),
          duration: duration
        })
        .eq('id', activeTimer.id)
        .select(`
          *,
          task:tasks(id, title)
        `)
        .single()
      
      if (error) throw error
      
      setActiveTimer(null)
      setTimeEntries([data, ...timeEntries])
      
      // Update task total time
      const task = tasks.find(t => t.id === activeTimer.task_id)
      if (task) {
        setTasks(tasks.map(t => 
          t.id === activeTimer.task_id 
            ? { ...t, total_time: t.total_time + duration }
            : t
        ))
      }
      
      toast.success(`Timer stopped! Logged ${duration} minutes`)
    } catch (error) {
      toast.error('Error stopping timer')
    }
  }
  
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  
  const formatMinutes = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const generateSeedData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: membership } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', session.user.id)
        .single()

      if (!membership) {
        toast.error('No workspace found')
        return
      }

      toast.info('Generating demo data...')

      // Create demo projects
      const { data: proj1 } = await supabase
        .from('projects')
        .insert([{
          workspace_id: membership.workspace_id,
          name: 'Website Redesign',
          description: 'Redesigning the company website with modern UI/UX'
        }])
        .select()
        .single()

      const { data: proj2 } = await supabase
        .from('projects')
        .insert([{
          workspace_id: membership.workspace_id,
          name: 'Mobile App Development',
          description: 'Building a cross-platform mobile application'
        }])
        .select()
        .single()

      const { data: proj3 } = await supabase
        .from('projects')
        .insert([{
          workspace_id: membership.workspace_id,
          name: 'Marketing Campaign',
          description: 'Q4 marketing initiatives and campaigns'
        }])
        .select()
        .single()

      // Create demo tasks
      const demoTasks = [
        { project_id: proj1.id, title: 'Design homepage mockup', description: 'Create new homepage design in Figma', status: 'completed', priority: 'high' },
        { project_id: proj1.id, title: 'Implement responsive navigation', description: 'Build mobile-friendly navigation component', status: 'in_progress', priority: 'high' },
        { project_id: proj1.id, title: 'Optimize images', description: 'Compress and optimize all website images', status: 'todo', priority: 'medium' },
        { project_id: proj2.id, title: 'Setup development environment', description: 'Configure React Native project', status: 'completed', priority: 'high' },
        { project_id: proj2.id, title: 'Build authentication flow', description: 'Implement login and signup screens', status: 'in_progress', priority: 'high' },
        { project_id: proj2.id, title: 'Design app icon', description: 'Create app icon for iOS and Android', status: 'todo', priority: 'low' },
        { project_id: proj3.id, title: 'Plan social media strategy', description: 'Outline content calendar for Q4', status: 'in_progress', priority: 'medium' },
        { project_id: proj3.id, title: 'Create email templates', description: 'Design email campaign templates', status: 'todo', priority: 'medium' },
      ]

      for (const task of demoTasks) {
        await supabase.from('tasks').insert([{
          ...task,
          created_by: session.user.id,
          assignee_id: session.user.id
        }])
      }

      // Create a demo channel
      await supabase.from('channels').insert([{
        workspace_id: membership.workspace_id,
        name: 'general'
      }])

      // Create a demo meeting
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)
      const meetingEnd = new Date(tomorrow)
      meetingEnd.setHours(11, 0, 0, 0)

      await supabase.from('meetings').insert([{
        workspace_id: membership.workspace_id,
        title: 'Weekly Team Standup',
        start_time: tomorrow.toISOString(),
        end_time: meetingEnd.toISOString(),
        notes: 'Discuss weekly progress and blockers'
      }])

      // Create a demo document
      await supabase.from('docs').insert([{
        workspace_id: membership.workspace_id,
        title: 'Project Guidelines',
        content: 'This document outlines our project development guidelines and best practices.',
        created_by: session.user.id
      }])

      toast.success('Demo data generated successfully!')
      loadData()
    } catch (error) {
      console.error('Error generating seed data:', error)
      toast.error('Error generating demo data')
    }
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-full bg-indigo-600 flex items-center justify-center">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl text-center">FlowOps</CardTitle>
            <CardDescription className="text-center">
              Your all-in-one productivity platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={authMode} onValueChange={setAuthMode}>
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create Account'}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-sidebar border-r border-border transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center">
              <LayoutDashboard className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-sidebar-foreground">FlowOps</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Button
            variant={activeView === 'dashboard' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveView('dashboard')}
          >
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          
          <Button
            variant={activeView === 'tasks' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveView('tasks')}
          >
            <ListTodo className="h-4 w-4 mr-2" />
            Tasks
          </Button>
          
          <Button
            variant={activeView === 'time-tracking' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveView('time-tracking')}
          >
            <Timer className="h-4 w-4 mr-2" />
            Time Tracking
          </Button>
          
          <Button
            variant={activeView === 'projects' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveView('projects')}
          >
            <Folder className="h-4 w-4 mr-2" />
            Projects
          </Button>

          <Button
            variant={activeView === 'chat' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveView('chat')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>

          <Button
            variant={activeView === 'calendar' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveView('calendar')}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>

          <Button
            variant={activeView === 'docs' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveView('docs')}
          >
            <FileText className="h-4 w-4 mr-2" />
            Docs
          </Button>

          <Button
            variant={activeView === 'admin' ? 'secondary' : 'ghost'}
            className="w-full justify-start"
            onClick={() => setActiveView('admin')}
          >
            <Settings className="h-4 w-4 mr-2" />
            Admin
          </Button>
        </nav>
        
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar>
              <AvatarFallback>{user?.email?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.user_metadata?.name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="h-16 border-b border-border bg-card px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-xl font-semibold">
              {activeView === 'dashboard' && 'Dashboard'}
              {activeView === 'tasks' && 'Tasks'}
              {activeView === 'time-tracking' && 'Time Tracking'}
              {activeView === 'projects' && 'Projects'}
              {activeView === 'chat' && 'Chat'}
              {activeView === 'calendar' && 'Calendar'}
              {activeView === 'docs' && 'Docs'}
              {activeView === 'admin' && 'Admin'}
            </h1>
          </div>
          
          {/* Active timer indicator */}
          {activeTimer && (
            <Card className="px-4 py-2 bg-indigo-50 border-indigo-200">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium">{activeTimer.task?.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono font-semibold">{formatDuration(timerDuration)}</span>
                </div>
                <Button size="sm" variant="destructive" onClick={stopTimer}>
                  <Pause className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              </div>
            </Card>
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </Button>
            {activeView === 'tasks' && (
              <Dialog open={newTaskOpen} onOpenChange={setNewTaskOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                    <DialogDescription>Add a new task to your workspace</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input
                        value={newTaskData.title}
                        onChange={(e) => setNewTaskData({ ...newTaskData, title: e.target.value })}
                        placeholder="Task title"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newTaskData.description}
                        onChange={(e) => setNewTaskData({ ...newTaskData, description: e.target.value })}
                        placeholder="Task description"
                      />
                    </div>
                    <div>
                      <Label>Project</Label>
                      <Select value={newTaskData.project_id} onValueChange={(value) => setNewTaskData({ ...newTaskData, project_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map(project => (
                            <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={newTaskData.priority} onValueChange={(value) => setNewTaskData({ ...newTaskData, priority: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewTaskOpen(false)}>Cancel</Button>
                    <Button onClick={createTask}>Create Task</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            
            {activeView === 'projects' && (
              <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Project</DialogTitle>
                    <DialogDescription>Add a new project to organize your tasks</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newProjectData.name}
                        onChange={(e) => setNewProjectData({ ...newProjectData, name: e.target.value })}
                        placeholder="Project name"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newProjectData.description}
                        onChange={(e) => setNewProjectData({ ...newProjectData, description: e.target.value })}
                        placeholder="Project description"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewProjectOpen(false)}>Cancel</Button>
                    <Button onClick={createProject}>Create Project</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
        
        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeView === 'dashboard' && (
            <div className="space-y-6">
              {/* Time tracking summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Today</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMinutes(dashboardStats?.timeStats?.today || 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMinutes(dashboardStats?.timeStats?.week || 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatMinutes(dashboardStats?.timeStats?.month || 0)}</div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Task overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Task Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">To Do</span>
                        <span className="text-sm font-medium">{dashboardStats?.taskStats?.todo || 0}</span>
                      </div>
                      <Progress value={(dashboardStats?.taskStats?.todo || 0) / (dashboardStats?.taskStats?.total || 1) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">In Progress</span>
                        <span className="text-sm font-medium">{dashboardStats?.taskStats?.in_progress || 0}</span>
                      </div>
                      <Progress value={(dashboardStats?.taskStats?.in_progress || 0) / (dashboardStats?.taskStats?.total || 1) * 100} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm">Completed</span>
                        <span className="text-sm font-medium">{dashboardStats?.taskStats?.completed || 0}</span>
                      </div>
                      <Progress value={(dashboardStats?.taskStats?.completed || 0) / (dashboardStats?.taskStats?.total || 1) * 100} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Recent tasks */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {tasks.slice(0, 5).map(task => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {task.status === 'completed' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          ) : task.status === 'in_progress' ? (
                            <Circle className="h-5 w-5 text-blue-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-gray-300" />
                          )}
                          <div>
                            <p className="font-medium">{task.title}</p>
                            {task.project && (
                              <p className="text-xs text-muted-foreground">{task.project.name}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {task.total_time > 0 && (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatMinutes(task.total_time)}
                            </Badge>
                          )}
                          <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                            {task.priority}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeView === 'tasks' && (
            <div className="space-y-6">
              <Tabs defaultValue="all" className="w-full">
                <TabsList>
                  <TabsTrigger value="all">All Tasks</TabsTrigger>
                  <TabsTrigger value="todo">To Do</TabsTrigger>
                  <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                  <TabsTrigger value="completed">Completed</TabsTrigger>
                </TabsList>
                
                <TabsContent value="all" className="space-y-4 mt-4">
                  {tasks.map(task => (
                    <Card key={task.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{task.title}</h3>
                              <Badge variant={task.status === 'completed' ? 'secondary' : task.status === 'in_progress' ? 'default' : 'outline'}>
                                {task.status.replace('_', ' ')}
                              </Badge>
                              <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                                {task.priority}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {task.project && (
                                <div className="flex items-center gap-1">
                                  <Folder className="h-3 w-3" />
                                  {task.project.name}
                                </div>
                              )}
                              {task.total_time > 0 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatMinutes(task.total_time)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {task.status !== 'completed' && (
                              <>
                                {activeTimer?.task_id === task.id ? (
                                  <Button size="sm" variant="destructive" onClick={stopTimer}>
                                    <Pause className="h-4 w-4 mr-1" />
                                    Stop
                                  </Button>
                                ) : (
                                  <Button size="sm" onClick={() => startTimer(task.id)} disabled={activeTimer !== null}>
                                    <Play className="h-4 w-4 mr-1" />
                                    Start
                                  </Button>
                                )}
                              </>
                            )}
                            {task.status === 'todo' && (
                              <Button size="sm" variant="outline" onClick={() => updateTaskStatus(task.id, 'in_progress')}>
                                Start Task
                              </Button>
                            )}
                            {task.status === 'in_progress' && (
                              <Button size="sm" variant="outline" onClick={() => updateTaskStatus(task.id, 'completed')}>
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                
                <TabsContent value="todo" className="space-y-4 mt-4">
                  {tasks.filter(t => t.status === 'todo').map(task => (
                    <Card key={task.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{task.title}</h3>
                              <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                                {task.priority}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            )}
                            {task.project && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Folder className="h-3 w-3" />
                                {task.project.name}
                              </div>
                            )}
                          </div>
                          <Button size="sm" variant="outline" onClick={() => updateTaskStatus(task.id, 'in_progress')}>
                            Start Task
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                
                <TabsContent value="in_progress" className="space-y-4 mt-4">
                  {tasks.filter(t => t.status === 'in_progress').map(task => (
                    <Card key={task.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{task.title}</h3>
                              <Badge variant={task.priority === 'high' ? 'destructive' : task.priority === 'medium' ? 'default' : 'secondary'}>
                                {task.priority}
                              </Badge>
                            </div>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              {task.project && (
                                <div className="flex items-center gap-1">
                                  <Folder className="h-3 w-3" />
                                  {task.project.name}
                                </div>
                              )}
                              {task.total_time > 0 && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatMinutes(task.total_time)}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {activeTimer?.task_id === task.id ? (
                              <Button size="sm" variant="destructive" onClick={stopTimer}>
                                <Pause className="h-4 w-4 mr-1" />
                                Stop
                              </Button>
                            ) : (
                              <Button size="sm" onClick={() => startTimer(task.id)} disabled={activeTimer !== null}>
                                <Play className="h-4 w-4 mr-1" />
                                Start
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => updateTaskStatus(task.id, 'completed')}>
                              Complete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                
                <TabsContent value="completed" className="space-y-4 mt-4">
                  {tasks.filter(t => t.status === 'completed').map(task => (
                    <Card key={task.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <h3 className="font-semibold line-through text-muted-foreground">{task.title}</h3>
                            </div>
                            {task.total_time > 0 && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Total time: {formatMinutes(task.total_time)}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
              </Tabs>
            </div>
          )}
          
          {activeView === 'time-tracking' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Time Entries</CardTitle>
                  <CardDescription>View and manage your logged time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {timeEntries.map(entry => (
                      <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium">{entry.task?.title || 'Unknown task'}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(entry.start_time).toLocaleString()}
                            {entry.end_time && ` - ${new Date(entry.end_time).toLocaleTimeString()}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {entry.duration ? (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatMinutes(entry.duration)}
                            </Badge>
                          ) : (
                            <Badge variant="default">
                              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse mr-2" />
                              Running
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {activeView === 'projects' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => (
                <Card key={project.id}>
                  <CardHeader>
                    <CardTitle>{project.name}</CardTitle>
                    {project.description && (
                      <CardDescription>{project.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      {tasks.filter(t => t.project_id === project.id).length} tasks
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {activeView === 'chat' && (
            <div className="h-full flex">
              <div className="w-64 border-r border-border p-4 space-y-2">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Channels</h2>
                  <Button size="sm" variant="ghost">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground text-center py-8">
                  Chat feature coming soon! Create channels and communicate with your team in real-time.
                </p>
              </div>
              <div className="flex-1 flex flex-col">
                <div className="flex-1 p-6 overflow-y-auto">
                  <div className="text-center py-20 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Select a channel to start messaging</p>
                  </div>
                </div>
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input placeholder="Type a message..." className="flex-1" />
                    <Button size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'calendar' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Meetings</CardTitle>
                  <CardDescription>Schedule and manage your meetings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">No meetings scheduled yet</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Schedule Meeting
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === 'docs' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Documents</CardTitle>
                  <CardDescription>Create and manage team documents</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="mb-4">No documents yet</p>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      New Document
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {activeView === 'admin' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Workspace Settings</CardTitle>
                  <CardDescription>Manage your workspace and team members</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium mb-2">Workspace Information</h3>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">Workspace Name</span>
                          <span className="text-sm font-medium">{workspace?.name || 'Loading...'}</span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b">
                          <span className="text-sm text-muted-foreground">Created</span>
                          <span className="text-sm font-medium">
                            {workspace?.created_at ? new Date(workspace.created_at).toLocaleDateString() : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="text-2xl font-bold">{projects.length}</div>
                          <div className="text-xs text-muted-foreground">Projects</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-2xl font-bold">{tasks.length}</div>
                          <div className="text-xs text-muted-foreground">Tasks</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-2xl font-bold">{timeEntries.filter(e => e.duration).length}</div>
                          <div className="text-xs text-muted-foreground">Time Entries</div>
                        </div>
                        <div className="p-4 border rounded-lg">
                          <div className="text-2xl font-bold">
                            {formatMinutes(timeEntries.reduce((sum, e) => sum + (e.duration || 0), 0))}
                          </div>
                          <div className="text-xs text-muted-foreground">Total Time</div>
                        </div>
                      </div>
                    </div>
                    <div className="pt-4 border-t">
                      <h3 className="font-medium mb-3">Quick Actions</h3>
                      <div className="space-y-2">
                        <Button onClick={generateSeedData} className="w-full" variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Generate Demo Data
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Creates sample projects, tasks, meetings, and documents to explore the platform
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App