import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Clock, CheckCircle2, AlertTriangle, Calendar, Bell, X, MessageSquare } from 'lucide-react';
import { PieChart, Pie, Cell } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import type { WidgetId } from '@/hooks/useDashboardWidgets';

const STATUS_COLORS = ['hsl(210, 80%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(152, 60%, 42%)'];

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

interface WidgetProps {
  onRemove: () => void;
}

function WidgetWrapper({ title, icon: Icon, onRemove, children }: WidgetProps & { title: string; icon: any; children: React.ReactNode }) {
  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" /> {title}
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function TaskStatsWidget({ onRemove }: WidgetProps) {
  const { user, role } = useAuth();

  const { data: tasks = [] } = useQuery({
    queryKey: ['widget-tasks', user?.id, role],
    queryFn: async () => {
      const query = role === 'admin'
        ? supabase.from('tasks').select('status, due_date')
        : supabase.from('tasks').select('status, due_date').eq('assigned_to', user!.id);
      const { data } = await query;
      return data ?? [];
    },
    enabled: !!user,
  });

  const now = new Date();
  const total = tasks.length;
  const pending = tasks.filter((t: any) => t.status === 'pending').length;
  const inProgress = tasks.filter((t: any) => t.status === 'in_progress').length;
  const completed = tasks.filter((t: any) => t.status === 'completed').length;
  const overdue = tasks.filter((t: any) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed').length;

  const cards = [
    { label: 'Total', value: total, icon: ListTodo, color: 'text-primary' },
    { label: 'Pending', value: pending, icon: Clock, color: 'text-warning' },
    { label: 'In Progress', value: inProgress, icon: ListTodo, color: 'text-primary' },
    { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-success' },
    { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <WidgetWrapper title="Task Stats" icon={ListTodo} onRemove={onRemove}>
      <div className="grid grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="text-center">
            <c.icon className={`h-4 w-4 mx-auto mb-1 ${c.color}`} />
            <p className="text-xl font-bold text-foreground">{c.value}</p>
            <p className="text-[10px] text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>
    </WidgetWrapper>
  );
}

export function UpcomingTasksWidget({ onRemove }: WidgetProps) {
  const { user } = useAuth();

  const { data: tasks = [] } = useQuery({
    queryKey: ['widget-upcoming', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, priority, due_date, status')
        .eq('assigned_to', user!.id)
        .neq('status', 'completed')
        .not('due_date', 'is', null)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const daysUntil = (date: string) => {
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diff <= 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `${diff} days`;
  };

  return (
    <WidgetWrapper title="Upcoming Tasks" icon={Calendar} onRemove={onRemove}>
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40">
              <div className="flex items-center gap-2 min-w-0">
                <Badge className={`${priorityColors[t.priority]} text-[10px] shrink-0`}>{t.priority}</Badge>
                <span className="text-sm truncate">{t.title}</span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0 ml-2">{daysUntil(t.due_date)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No upcoming tasks</p>
      )}
    </WidgetWrapper>
  );
}

export function NotificationsWidget({ onRemove }: WidgetProps) {
  const { user } = useAuth();

  const { data: notifications = [] } = useQuery({
    queryKey: ['widget-notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  return (
    <WidgetWrapper title="Notifications" icon={Bell} onRemove={onRemove}>
      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div key={n.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40">
              <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground truncate">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">All caught up! 🎉</p>
      )}
    </WidgetWrapper>
  );
}

export function StatusChartWidget({ onRemove }: WidgetProps) {
  const { user, role } = useAuth();

  const { data: tasks = [] } = useQuery({
    queryKey: ['widget-chart-tasks', user?.id, role],
    queryFn: async () => {
      const query = role === 'admin'
        ? supabase.from('tasks').select('status')
        : supabase.from('tasks').select('status').eq('assigned_to', user!.id);
      const { data } = await query;
      return data ?? [];
    },
    enabled: !!user,
  });

  const statusData = [
    { name: 'Pending', value: tasks.filter((t: any) => t.status === 'pending').length },
    { name: 'In Progress', value: tasks.filter((t: any) => t.status === 'in_progress').length },
    { name: 'Completed', value: tasks.filter((t: any) => t.status === 'completed').length },
  ].filter((d) => d.value > 0);

  const chartConfig = {
    pending: { label: 'Pending', color: STATUS_COLORS[0] },
    inProgress: { label: 'In Progress', color: STATUS_COLORS[1] },
    completed: { label: 'Completed', color: STATUS_COLORS[2] },
  };

  return (
    <WidgetWrapper title="Status Chart" icon={ListTodo} onRemove={onRemove}>
      {statusData.length > 0 ? (
        <ChartContainer config={chartConfig} className="h-[180px]">
          <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" nameKey="name"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No tasks yet</p>
      )}
    </WidgetWrapper>
  );
}

export function RecentActivityWidget({ onRemove }: WidgetProps) {
  const { data: comments = [] } = useQuery({
    queryKey: ['widget-recent-activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('task_comments')
        .select('*, profiles(full_name), tasks(title)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <WidgetWrapper title="Recent Activity" icon={MessageSquare} onRemove={onRemove}>
      {comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map((c: any) => (
            <div key={c.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-medium text-primary">
                  {(c.profiles?.full_name || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{c.profiles?.full_name || 'User'}</span> on {c.tasks?.title || 'a task'}
                </p>
                <p className="text-xs text-muted-foreground truncate">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
      )}
    </WidgetWrapper>
  );
}

export function DeadlinesWidget({ onRemove }: WidgetProps) {
  const { user } = useAuth();
  const now = new Date();

  const { data: tasks = [] } = useQuery({
    queryKey: ['widget-deadlines', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, due_date, status, priority')
        .eq('assigned_to', user!.id)
        .neq('status', 'completed')
        .not('due_date', 'is', null)
        .order('due_date', { ascending: true })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
  });

  const overdue = tasks.filter((t: any) => new Date(t.due_date) < now);
  const today = tasks.filter((t: any) => {
    const d = new Date(t.due_date);
    return d >= now && d.toDateString() === now.toDateString();
  });
  const upcoming = tasks.filter((t: any) => {
    const d = new Date(t.due_date);
    return d > now && d.toDateString() !== now.toDateString();
  });

  const Section = ({ label, items, color }: { label: string; items: any[]; color: string }) =>
    items.length > 0 ? (
      <div>
        <p className={`text-xs font-semibold ${color} mb-1`}>{label} ({items.length})</p>
        {items.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between py-1 text-sm">
            <span className="truncate">{t.title}</span>
            <span className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(t.due_date).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <WidgetWrapper title="Deadline Calendar" icon={Calendar} onRemove={onRemove}>
      {tasks.length > 0 ? (
        <div className="space-y-3">
          <Section label="Overdue" items={overdue} color="text-destructive" />
          <Section label="Today" items={today} color="text-warning" />
          <Section label="Upcoming" items={upcoming} color="text-primary" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">No deadlines</p>
      )}
    </WidgetWrapper>
  );
}

export const WIDGET_COMPONENTS: Record<WidgetId, React.FC<WidgetProps>> = {
  'task-stats': TaskStatsWidget,
  'upcoming-tasks': UpcomingTasksWidget,
  'notifications': NotificationsWidget,
  'status-chart': StatusChartWidget,
  'recent-activity': RecentActivityWidget,
  'deadlines': DeadlinesWidget,
};
