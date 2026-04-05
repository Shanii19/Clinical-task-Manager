import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Search, MessageSquare, Calendar, ArrowUpDown } from 'lucide-react';
import TaskDetail from '@/components/TaskDetail';
import type { Database } from '@/integrations/supabase/types';

type TaskStatus = Database['public']['Enums']['task_status'];
type TaskPriority = Database['public']['Enums']['task_priority'];

const priorityColors: Record<string, string> = {
  urgent: 'bg-destructive text-destructive-foreground',
  high: 'bg-warning text-warning-foreground',
  normal: 'bg-primary text-primary-foreground',
  low: 'bg-muted text-muted-foreground',
};

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-warning/15 text-warning border border-warning/30',
  completed: 'bg-success/15 text-success border border-success/30',
};

const Tasks = () => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDept, setFilterDept] = useState<string>('all');
  const [filterEmployee, setFilterEmployee] = useState<string>('all');
  const [filterDueDate, setFilterDueDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [patientName, setPatientName] = useState('');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [deptId, setDeptId] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, departments(name, color), profiles!tasks_assigned_to_fkey(full_name)')
        .order('created_at', { ascending: false });
      return data ?? [];
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*');
      return data ?? [];
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data ?? [];
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tasks').insert({
        title,
        description: description || null,
        patient_name: patientName || null,
        status,
        priority,
        department_id: deptId || null,
        assigned_to: assignedTo || null,
        created_by: user!.id,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created');
      setCreateOpen(false);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPatientName('');
    setStatus('pending');
    setPriority('normal');
    setDeptId('');
    setAssignedTo('');
    setDueDate('');
  };

  // Filter & sort
  let filtered = tasks.filter((t: any) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterDept !== 'all' && t.department_id !== filterDept) return false;
    if (filterEmployee !== 'all' && t.assigned_to !== filterEmployee) return false;
    if (filterDueDate) {
      if (!t.due_date) return false;
      const taskDate = new Date(t.due_date).toISOString().slice(0, 10);
      if (taskDate !== filterDueDate) return false;
    }
    return true;
  });

  filtered = [...filtered].sort((a: any, b: any) => {
    if (sortBy === 'due_date') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    }
    if (sortBy === 'priority') {
      const order: Record<string, number> = { urgent: 0, high: 1, normal: 2, medium: 3, low: 4 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    }
    if (sortBy === 'status') {
      const order: Record<string, number> = { pending: 0, in_progress: 1, completed: 2 };
      return (order[a.status] ?? 0) - (order[b.status] ?? 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (selectedTask) {
    return <TaskDetail taskId={selectedTask} onBack={() => setSelectedTask(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground text-sm">{filtered.length} tasks</p>
        </div>
        {role === 'admin' && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New Task</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Task</DialogTitle>
              </DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); createTask.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." rows={3} />
                </div>
                <div className="space-y-2">
                  <Label>Patient Name</Label>
                  <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Patient name (optional)" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">🔴 Urgent</SelectItem>
                        <SelectItem value="high">🟠 High</SelectItem>
                        <SelectItem value="normal">🔵 Normal</SelectItem>
                        <SelectItem value="low">⚪ Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={status} onValueChange={(v) => setStatus(v as TaskStatus)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={deptId} onValueChange={setDeptId}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <Select value={assignedTo} onValueChange={setAssignedTo}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {members.map((m: any) => (
                          <SelectItem key={m.id} value={m.id}>{m.full_name || 'Unnamed'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
                <Button type="submit" className="w-full" disabled={createTask.isPending}>
                  {createTask.isPending ? 'Creating...' : 'Create Task'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Department" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d: any) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Employee" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {members.map((m: any) => (
              <SelectItem key={m.id} value={m.id}>{m.full_name || 'Unnamed'}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={filterDueDate}
          onChange={(e) => setFilterDueDate(e.target.value)}
          className="w-[160px]"
          placeholder="Due date"
        />
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[140px]"><ArrowUpDown className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="created_at">Newest</SelectItem>
            <SelectItem value="due_date">Due Date</SelectItem>
            <SelectItem value="priority">Priority</SelectItem>
            <SelectItem value="status">Status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading tasks...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No tasks found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task: any) => {
            const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
            return (
              <Card key={task.id} className="border-border/50 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedTask(task.id)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-foreground truncate">{task.title}</h3>
                        {isOverdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Overdue</Badge>}
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground truncate mb-2">{task.description}</p>
                      )}
                      {task.patient_name && (
                        <p className="text-xs text-muted-foreground mb-2">Patient: {task.patient_name}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge className={`${statusColors[task.status]} text-[11px]`}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        <Badge className={`${priorityColors[task.priority]} text-[11px]`}>
                          {task.priority}
                        </Badge>
                        {task.departments && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.departments.color }} />
                            {task.departments.name}
                          </span>
                        )}
                        {task.profiles?.full_name && (
                          <span className="text-muted-foreground">→ {task.profiles.full_name}</span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <MessageSquare className="h-4 w-4 text-muted-foreground/50 shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Tasks;
