const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase client
const supabaseUrl = process.env.SUPABASE_URL || 'https://whhooxgqwxumseyaxocc.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndoaG9veGdxd3h1bXNleWF4b2NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzOTQ1NjAsImV4cCI6MjA5MDk3MDU2MH0.BGjvVHHneX7pNtqgIMN7IZ0_qdBdpHhDIpn4j4NX6To';

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

// Middleware
app.use(cors());
app.use(express.json());

// ─── Health Check ───
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Clinical Task Manager API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', uptime: process.uptime() });
});

// ─── Tasks ───
app.get('/api/tasks', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, profiles:assigned_to(full_name), departments(name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tasks/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, profiles:assigned_to(full_name), departments(name)')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tasks').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Departments ───
app.get('/api/departments', async (req, res) => {
  try {
    const { data, error } = await supabase.from('departments').select('*').order('name');
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Profiles ───
app.get('/api/profiles', async (req, res) => {
  try {
    const { data, error } = await supabase.from('profiles').select('*, departments(name)');
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Leave Requests ───
app.get('/api/leave-requests', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .select('*, profiles:user_id(full_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leave-requests', async (req, res) => {
  try {
    const { data, error } = await supabase.from('leave_requests').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/leave-requests/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leave_requests')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Notifications ───
app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', req.params.userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Messages ───
app.get('/api/messages', async (req, res) => {
  try {
    const { sender_id, receiver_id } = req.query;
    let query = supabase.from('messages').select('*, sender:sender_id(full_name), receiver:receiver_id(full_name)');
    if (sender_id) query = query.eq('sender_id', sender_id);
    if (receiver_id) query = query.eq('receiver_id', receiver_id);
    const { data, error } = await query.order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { data, error } = await supabase.from('messages').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Task Comments ───
app.get('/api/task-comments/:taskId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('task_comments')
      .select('*, profiles:user_id(full_name)')
      .eq('task_id', req.params.taskId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/task-comments', async (req, res) => {
  try {
    const { data, error } = await supabase.from('task_comments').insert(req.body).select().single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🏥 Clinical Task Manager API running on port ${PORT}`);
});
