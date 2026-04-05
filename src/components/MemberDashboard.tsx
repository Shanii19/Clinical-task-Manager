import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListTodo, Clock, CheckCircle2, AlertTriangle, Calendar } from 'lucide-react';
import { useState } from 'react';

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-warning/15 text-warning border border-warning/30',
  completed: 'bg-success/15 text-success border border-success/30',
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-destructive text-destructive-foreground',
  high: 'bg-warning text-warning-foreground',
  normal: 'bg-primary text-primary-foreground',
  medium: 'bg-primary/70 text-primary-foreground',
  low: 'bg-muted text-muted-foreground',
};

const MemberDashboard = ({ onSelectTask }: { onSelectTask?: (id: string) => void }) => {
  const { user, profile } = useAuth();
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterDueDate, setFilterDueDate] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('due_date');

  const { data: myTasks = [] } = useQuery({
    queryKey: ['my-tasks', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, departments(name, color)')
        .eq('assigned_to', user!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const now = new Date();
  const total = myTasks.length;
  const pending = myTasks.filter((t: any) => t.status === 'pending').length;
  const inProgress = myTasks.filter((t: any) => t.status === 'in_progress').length;
  const completed = myTasks.filter((t: any) => t.status === 'completed').length;
  const overdue = myTasks.filter((t: any) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed').length;

  // Upcoming deadlines: non-completed tasks with due dates in the future, sorted by nearest
  const upcoming = myTasks
    .filter((t: any) => t.due_date && new Date(t.due_date) >= now && t.status !== 'completed')
    .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
    .slice(0, 5);

  // Filtered & sorted task list
  let filtered = myTasks.filter((t: any) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterDueDate) {
      if (!t.due_date) return false;
      if (new Date(t.due_date).toISOString().slice(0, 10) !== filterDueDate) return false;
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

  const summaryCards = [
    { label: 'My Tasks', value: total, icon: ListTodo, color: 'text-primary' },
    { label: 'Pending', value: pending, icon: Clock, color: 'text-warning' },
    { label: 'In Progress', value: inProgress, icon: ListTodo, color: 'text-primary' },
    { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-success' },
    { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
  ];

  const daysUntil = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff} days`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {profile?.full_name || 'User'}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground">{card.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Deadlines */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Upcoming Deadlines
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcoming.length > 0 ? (
            <div className="space-y-2">
              {upcoming.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/40 hover:bg-muted/70 cursor-pointer transition-colors"
                  onClick={() => onSelectTask?.(task.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge className={`${priorityColors[task.priority]} text-[10px] shrink-0`}>
                      {task.priority}
                    </Badge>
                    <span className="text-sm font-medium truncate">{task.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {daysUntil(task.due_date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">No upcoming deadlines</p>
          )}
        </CardContent>
      </Card>

      {/* My Tasks with Filters */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base">My Tasks</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <input
                type="date"
                value={filterDueDate}
                onChange={(e) => setFilterDueDate(e.target.value)}
                className="h-8 px-2 text-xs rounded-md border border-input bg-background"
              />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[110px] h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="due_date">Due Date</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="created_at">Newest</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            <div className="space-y-2">
              {filtered.map((task: any) => {
                const isOverdue = task.due_date && new Date(task.due_date) < now && task.status !== 'completed';
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:shadow-sm cursor-pointer transition-all"
                    onClick={() => onSelectTask?.(task.id)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <Badge className={`${statusColors[task.status]} text-[10px] shrink-0`}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <span className="text-sm font-medium truncate">{task.title}</span>
                      {isOverdue && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 shrink-0">Overdue</Badge>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      {task.departments && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.departments.color }} />
                          {task.departments.name}
                        </span>
                      )}
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">No tasks found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MemberDashboard;
