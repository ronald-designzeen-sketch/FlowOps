import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseKey)

// Helper function to get user from request
async function getUser(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error } = await supabase.auth.getUser(token)
  return error ? null : user
}

// Auth routes
async function handleSignup(request) {
  try {
    const { email, password, name } = await request.json()
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    })
    
    if (error) throw error
    
    // Create default workspace for new user
    if (data.user) {
      const { data: workspace, error: wsError } = await supabase
        .from('workspaces')
        .insert([{
          name: `${name}'s Workspace`,
          owner_id: data.user.id
        }])
        .select()
        .single()
      
      if (!wsError && workspace) {
        // Add user to workspace members
        await supabase.from('workspace_members').insert([{
          workspace_id: workspace.id,
          user_id: data.user.id,
          role: 'owner'
        }])
      }
    }
    
    return NextResponse.json({ user: data.user, session: data.session })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

async function handleLogin(request) {
  try {
    const { email, password } = await request.json()
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) throw error
    
    return NextResponse.json({ user: data.user, session: data.session })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

async function handleLogout(request) {
  try {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    
    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// Tasks routes
async function getTasks(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        project:projects(id, name),
        assignee:users!tasks_assignee_id_fkey(id, name, email),
        subtasks(*),
        time_entries(*)
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Calculate total time for each task
    const tasksWithTime = tasks.map(task => ({
      ...task,
      total_time: task.time_entries?.reduce((sum, entry) => sum + (entry.duration || 0), 0) || 0
    }))
    
    return NextResponse.json({ tasks: tasksWithTime })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function createTask(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const taskData = await request.json()
    
    const { data: task, error } = await supabase
      .from('tasks')
      .insert([{
        ...taskData,
        created_by: user.id
      }])
      .select(`
        *,
        project:projects(id, name),
        assignee:users!tasks_assignee_id_fkey(id, name, email)
      `)
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ task })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function updateTask(request, taskId) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const updates = await request.json()
    
    const { data: task, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select(`
        *,
        project:projects(id, name),
        assignee:users!tasks_assignee_id_fkey(id, name, email)
      `)
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ task })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Time tracking routes
async function getTimeEntries(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const url = new URL(request.url)
    const taskId = url.searchParams.get('task_id')
    
    let query = supabase
      .from('time_entries')
      .select(`
        *,
        task:tasks(id, title),
        user:users(id, name, email)
      `)
      .order('start_time', { ascending: false })
    
    if (taskId) {
      query = query.eq('task_id', taskId)
    }
    
    const { data: entries, error } = await query
    
    if (error) throw error
    
    return NextResponse.json({ entries })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function startTimer(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { task_id, description } = await request.json()
    
    // Check if there's already an active timer for this user
    const { data: activeTimer } = await supabase
      .from('time_entries')
      .select('*')
      .eq('user_id', user.id)
      .is('end_time', null)
      .single()
    
    if (activeTimer) {
      return NextResponse.json({ error: 'You already have an active timer running' }, { status: 400 })
    }
    
    const { data: entry, error } = await supabase
      .from('time_entries')
      .insert([{
        task_id,
        user_id: user.id,
        start_time: new Date().toISOString(),
        description: description || ''
      }])
      .select(`
        *,
        task:tasks(id, title),
        user:users(id, name, email)
      `)
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ entry })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function stopTimer(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { entry_id } = await request.json()
    
    const endTime = new Date()
    
    // Get the entry to calculate duration
    const { data: existingEntry } = await supabase
      .from('time_entries')
      .select('*')
      .eq('id', entry_id)
      .single()
    
    if (!existingEntry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
    }
    
    const startTime = new Date(existingEntry.start_time)
    const duration = Math.floor((endTime - startTime) / 1000 / 60) // duration in minutes
    
    const { data: entry, error } = await supabase
      .from('time_entries')
      .update({
        end_time: endTime.toISOString(),
        duration: duration
      })
      .eq('id', entry_id)
      .select(`
        *,
        task:tasks(id, title),
        user:users(id, name, email)
      `)
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ entry })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function getActiveTimer(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { data: entry, error } = await supabase
      .from('time_entries')
      .select(`
        *,
        task:tasks(id, title),
        user:users(id, name, email)
      `)
      .eq('user_id', user.id)
      .is('end_time', null)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "not found"
    
    return NextResponse.json({ entry: entry || null })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Projects routes
async function getProjects(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('name')
    
    if (error) throw error
    
    return NextResponse.json({ projects })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function createProject(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const projectData = await request.json()
    
    const { data: project, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({ project })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Dashboard stats
async function getDashboardStats(request) {
  try {
    const user = await getUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // Get task counts
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
    
    const taskStats = {
      total: tasks?.length || 0,
      todo: tasks?.filter(t => t.status === 'todo').length || 0,
      in_progress: tasks?.filter(t => t.status === 'in_progress').length || 0,
      completed: tasks?.filter(t => t.status === 'completed').length || 0
    }
    
    // Get time stats for today, this week, this month
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const { data: todayEntries } = await supabase
      .from('time_entries')
      .select('duration')
      .gte('start_time', today.toISOString())
      .not('duration', 'is', null)
    
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    
    const { data: weekEntries } = await supabase
      .from('time_entries')
      .select('duration')
      .gte('start_time', weekAgo.toISOString())
      .not('duration', 'is', null)
    
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    
    const { data: monthEntries } = await supabase
      .from('time_entries')
      .select('duration')
      .gte('start_time', monthAgo.toISOString())
      .not('duration', 'is', null)
    
    const timeStats = {
      today: todayEntries?.reduce((sum, e) => sum + (e.duration || 0), 0) || 0,
      week: weekEntries?.reduce((sum, e) => sum + (e.duration || 0), 0) || 0,
      month: monthEntries?.reduce((sum, e) => sum + (e.duration || 0), 0) || 0
    }
    
    return NextResponse.json({ taskStats, timeStats })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Main route handler
export async function GET(request, { params }) {
  const path = params?.path?.join('/') || ''
  
  if (path === '') {
    return NextResponse.json({ message: 'FlowOps API' })
  }
  
  if (path === 'tasks') {
    return getTasks(request)
  }
  
  if (path === 'projects') {
    return getProjects(request)
  }
  
  if (path === 'time-entries') {
    return getTimeEntries(request)
  }
  
  if (path === 'time-entries/active') {
    return getActiveTimer(request)
  }
  
  if (path === 'dashboard/stats') {
    return getDashboardStats(request)
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function POST(request, { params }) {
  const path = params?.path?.join('/') || ''
  
  if (path === 'auth/signup') {
    return handleSignup(request)
  }
  
  if (path === 'auth/login') {
    return handleLogin(request)
  }
  
  if (path === 'auth/logout') {
    return handleLogout(request)
  }
  
  if (path === 'tasks') {
    return createTask(request)
  }
  
  if (path === 'projects') {
    return createProject(request)
  }
  
  if (path === 'time-entries/start') {
    return startTimer(request)
  }
  
  if (path === 'time-entries/stop') {
    return stopTimer(request)
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function PUT(request, { params }) {
  const path = params?.path?.join('/') || ''
  
  if (path.startsWith('tasks/')) {
    const taskId = path.split('/')[1]
    return updateTask(request, taskId)
  }
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function DELETE(request, { params }) {
  const path = params?.path?.join('/') || ''
  
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}