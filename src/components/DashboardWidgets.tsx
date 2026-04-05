import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListTodo, Clock, CheckCircle2, AlertTriangle, Calendar, Bell, X, MessageSquare, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Button } from '@/components/ui/button';
import type { WidgetId } from '@/hooks/useDashboardWidgets';

const STATUS_COLORS = ['hsl(210, 80%, 55%)', 'hsl(38, 92%, 50%)', 'hsl(152, 60%, 42%)'];

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
    <Card className="border-border/40 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          {title}
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={onRemove}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// Task Stats - always shown, no remove button
export function TaskStatsWidget() {
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
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const cards = [
    { label: 'Total', value: total, icon: ListTodo, gradient: 'from-primary/20 to-primary/5', iconBg: 'bg-primary/15', iconColor: 'text-primary', borderColor: 'border-primary/20' },
    { label: 'Pending', value: pending, icon: Clock, gradient: 'from-warning/20 to-warning/5', iconBg: 'bg-warning/15', iconColor: 'text-warning', borderColor: 'border-warning/20' },
    { label: 'In Progress', value: inProgress, icon: TrendingUp, gradient: 'from-accent/20 to-accent/5', iconBg: 'bg-accent/15', iconColor: 'text-accent', borderColor: 'border-accent/20' },
    { label: 'Completed', value: completed, icon: CheckCircle2, gradient: 'from-success/20 to-success/5', iconBg: 'bg-success/15', iconColor: 'text-success', borderColor: 'border-success/20' },
    { label: 'Overdue', value: overdue, icon: AlertTriangle, gradient: 'from-destructive/20 to-destructive/5', iconBg: 'bg-destructive/15', iconColor: 'text-destructive', borderColor: 'border-destructive/20' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <Card key={c.label} className={`border ${c.borderColor} bg-gradient-to-br ${c.gradient} shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}>
            <CardContent className="p-4 flex flex-col items-center gap-2">
              <div className={`p-2 rounded-xl ${c.iconBg}`}>
                <c.icon className={`h-5 w-5 ${c.iconColor}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{c.value}</p>
              <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      {/* Completion bar */}
      <Card className="border-border/40 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Completion Rate</span>
            <span className="text-sm font-bold text-primary">{completionRate}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-700 ease-out"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
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
    return `${diff}d`;
  };

  return (
    <WidgetWrapper title="Upcoming Tasks" icon={Calendar} onRemove={onRemove}>
      {tasks.length > 0 ? (
        <div className="space-y-2">
          {tasks.map((t: any) => (
            <div key={t.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gradient-to-r from-muted/60 to-muted/20 hover:from-muted/80 hover:to-muted/40 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Badge className={`${priorityColors[t.priority]} text-[10px] shrink-0`}>{t.priority}</Badge>
                <span className="text-sm truncate font-medium">{t.title}</span>
              </div>
              <span className="text-xs font-semibold text-primary shrink-0 ml-2 bg-primary/10 px-2 py-0.5 rounded-full">{daysUntil(t.due_date)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">No upcoming tasks 🎯</p>
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

  const typeColors: Record<string, string> = {
    task: 'bg-primary',
    leave: 'bg-warning',
    chat: 'bg-accent',
  };

  return (
    <WidgetWrapper title="Notifications" icon={Bell} onRemove={onRemove}>
      {notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div key={n.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-gradient-to-r from-muted/60 to-muted/20 hover:from-muted/80 hover:to-muted/40 transition-colors">
              <div className={`w-2 h-2 rounded-full ${typeColors[n.type] || 'bg-primary'} mt-1.5 shrink-0 ring-2 ring-offset-1 ring-offset-card ${typeColors[n.type] || 'ring-primary'}/30`} />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground truncate">{n.message}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">All caught up! 🎉</p>
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
            <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" nameKey="name" strokeWidth={2} stroke="hsl(var(--card))"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {statusData.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i]} />)}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent />} />
          </PieChart>
        </ChartContainer>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">No tasks yet</p>
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
            <div key={c.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-gradient-to-r from-muted/60 to-muted/20 hover:from-muted/80 hover:to-muted/40 transition-colors">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-primary">
                  {(c.profiles?.full_name || 'U')[0].toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{c.profiles?.full_name || 'User'}</span> on {c.tasks?.title || 'a task'}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">No recent activity</p>
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

  const Section = ({ label, items, color, dotColor }: { label: string; items: any[]; color: string; dotColor: string }) =>
    items.length > 0 ? (
      <div>
        <p className={`text-xs font-bold uppercase tracking-wider ${color} mb-2`}>{label} ({items.length})</p>
        {items.map((t: any) => (
          <div key={t.id} className="flex items-center justify-between py-1.5 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
              <span className="truncate font-medium">{t.title}</span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0 ml-2">{new Date(t.due_date).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <WidgetWrapper title="Deadline Calendar" icon={Calendar} onRemove={onRemove}>
      {tasks.length > 0 ? (
        <div className="space-y-4">
          <Section label="Overdue" items={overdue} color="text-destructive" dotColor="bg-destructive" />
          <Section label="Today" items={today} color="text-warning" dotColor="bg-warning" />
          <Section label="Upcoming" items={upcoming} color="text-primary" dotColor="bg-primary" />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-6">No deadlines</p>
      )}
    </WidgetWrapper>
  );
}

export const WIDGET_COMPONENTS: Record<WidgetId, React.FC<WidgetProps>> = {
  'upcoming-tasks': UpcomingTasksWidget,
  'notifications': NotificationsWidget,
  'status-chart': StatusChartWidget,
  'recent-activity': RecentActivityWidget,
  'deadlines': DeadlinesWidget,
};
