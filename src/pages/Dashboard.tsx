import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, Clock, CheckCircle2, AlertTriangle, Users, TrendingUp, Activity } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar, Legend,
} from 'recharts';
import { Progress } from '@/components/ui/progress';
import MemberDashboard from '@/components/MemberDashboard';

const STATUS_COLORS = ['hsl(210, 80%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(152, 60%, 42%)'];

const Dashboard = () => {
  const { user, role, profile } = useAuth();

  if (role && role !== 'admin') {
    return <MemberDashboard />;
  }

  const { data: tasks = [] } = useQuery({
    queryKey: ['dashboard-tasks'],
    queryFn: async () => {
      const { data } = await supabase.from('tasks').select('*, departments(name, color), profiles!tasks_assigned_to_fkey(full_name)');
      return data ?? [];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['all-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*, user_roles(role)');
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

  const { data: recentComments = [] } = useQuery({
    queryKey: ['recent-comments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('task_comments')
        .select('*, profiles(full_name), tasks(title)')
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const now = new Date();
  const total = tasks.length;
  const pending = tasks.filter((t: any) => t.status === 'pending').length;
  const inProgress = tasks.filter((t: any) => t.status === 'in_progress').length;
  const completed = tasks.filter((t: any) => t.status === 'completed').length;
  const overdue = tasks.filter((t: any) => t.due_date && new Date(t.due_date) < now && t.status !== 'completed').length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  const statusData = [
    { name: 'Pending', value: pending },
    { name: 'In Progress', value: inProgress },
    { name: 'Completed', value: completed },
  ].filter((d) => d.value > 0);

  // Department data with completion rates
  const deptData = departments.map((d: any) => {
    const deptTasks = tasks.filter((t: any) => t.department_id === d.id);
    const deptCompleted = deptTasks.filter((t: any) => t.status === 'completed').length;
    return {
      name: d.name,
      tasks: deptTasks.length,
      completed: deptCompleted,
      pending: deptTasks.filter((t: any) => t.status === 'pending').length,
      in_progress: deptTasks.filter((t: any) => t.status === 'in_progress').length,
      rate: deptTasks.length > 0 ? Math.round((deptCompleted / deptTasks.length) * 100) : 0,
      color: d.color,
    };
  });

  // Staff performance
  const staffPerformance = profiles
    .map((p: any) => {
      const staffTasks = tasks.filter((t: any) => t.assigned_to === p.id);
      const staffCompleted = staffTasks.filter((t: any) => t.status === 'completed').length;
      return {
        name: p.full_name || 'Unknown',
        total: staffTasks.length,
        completed: staffCompleted,
        pending: staffTasks.filter((t: any) => t.status === 'pending').length,
        in_progress: staffTasks.filter((t: any) => t.status === 'in_progress').length,
        rate: staffTasks.length > 0 ? Math.round((staffCompleted / staffTasks.length) * 100) : 0,
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.rate - a.rate);

  // Daily productivity (last 7 days)
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (6 - i));
    const dayStr = date.toISOString().slice(0, 10);
    const dayLabel = date.toLocaleDateString('en', { weekday: 'short' });
    const created = tasks.filter((t: any) => t.created_at?.slice(0, 10) === dayStr).length;
    const completedDay = tasks.filter((t: any) => t.status === 'completed' && t.updated_at?.slice(0, 10) === dayStr).length;
    return { day: dayLabel, created, completed: completedDay };
  });

  // Weekly trends (last 4 weeks)
  const weeklyData = Array.from({ length: 4 }, (_, i) => {
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - (i * 7));
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    const label = `W${4 - i}`;
    const weekTasks = tasks.filter((t: any) => {
      const d = new Date(t.created_at);
      return d >= weekStart && d <= weekEnd;
    });
    const weekCompleted = tasks.filter((t: any) => {
      const d = new Date(t.updated_at);
      return t.status === 'completed' && d >= weekStart && d <= weekEnd;
    });
    return { week: label, created: weekTasks.length, completed: weekCompleted.length };
  });

  // Completion radial
  const radialData = [{ name: 'Completion', value: completionRate, fill: 'hsl(152, 60%, 42%)' }];

  const summaryCards = [
    { label: 'Total Tasks', value: total, icon: ListTodo, color: 'text-primary' },
    { label: 'Pending', value: pending, icon: Clock, color: 'text-warning' },
    { label: 'In Progress', value: inProgress, icon: Activity, color: 'text-primary' },
    { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-success' },
    { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Team', value: profiles.length, icon: Users, color: 'text-accent' },
  ];

  const chartConfig = {
    pending: { label: 'Pending', color: STATUS_COLORS[0] },
    inProgress: { label: 'In Progress', color: STATUS_COLORS[1] },
    completed: { label: 'Completed', color: STATUS_COLORS[2] },
    tasks: { label: 'Tasks', color: 'hsl(210, 80%, 45%)' },
    created: { label: 'Created', color: 'hsl(210, 80%, 45%)' },
    in_progress: { label: 'In Progress', color: 'hsl(38, 92%, 50%)' },
    total: { label: 'Total', color: 'hsl(210, 80%, 45%)' },
    rate: { label: 'Rate', color: 'hsl(152, 60%, 42%)' },
  };

  const emptyState = (msg: string) => (
    <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">{msg}</div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {profile?.full_name || 'User'}</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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

      {/* Row 1: Completion Rate + Status Pie + Tasks by Department */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Completion Rate Radial */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" /> Task Completion
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative">
              <ChartContainer config={chartConfig} className="h-[180px] w-[180px]">
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" background cornerRadius={10} />
                </RadialBarChart>
              </ChartContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{completionRate}%</span>
                <span className="text-xs text-muted-foreground">Complete</span>
              </div>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <span>{completed} done</span>
              <span>{pending + inProgress} remaining</span>
            </div>
          </CardContent>
        </Card>

        {/* Status Pie */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : emptyState('No tasks yet')}
          </CardContent>
        </Card>

        {/* Department Stacked Bar */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {deptData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="completed" stackId="a" fill="hsl(152, 60%, 42%)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="in_progress" stackId="a" fill="hsl(38, 92%, 50%)" />
                  <Bar dataKey="pending" stackId="a" fill="hsl(210, 80%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : emptyState('No departments yet')}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Daily Productivity + Weekly Trends */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Productivity */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Daily Productivity (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px]">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(210, 80%, 45%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(210, 80%, 45%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(152, 60%, 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area type="monotone" dataKey="created" stroke="hsl(210, 80%, 45%)" fill="url(#gradCreated)" strokeWidth={2} />
                <Area type="monotone" dataKey="completed" stroke="hsl(152, 60%, 42%)" fill="url(#gradCompleted)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Weekly Trends */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" /> Weekly Trends (4 weeks)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[220px]">
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="created" stroke="hsl(210, 80%, 45%)" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="completed" stroke="hsl(152, 60%, 42%)" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Staff Performance */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Staff Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {staffPerformance.length > 0 ? (
            <div className="space-y-4">
              {staffPerformance.map((s) => (
                <div key={s.name} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{s.name}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{s.completed}/{s.total} tasks</span>
                      <span className={`font-semibold ${s.rate >= 75 ? 'text-success' : s.rate >= 40 ? 'text-warning' : 'text-destructive'}`}>
                        {s.rate}%
                      </span>
                    </div>
                  </div>
                  <Progress value={s.rate} className="h-2" />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">No staff assignments yet</p>
          )}
        </CardContent>
      </Card>

      {/* Department Performance Table */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Department Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {deptData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground text-left">
                    <th className="pb-2 font-medium">Department</th>
                    <th className="pb-2 font-medium text-center">Total</th>
                    <th className="pb-2 font-medium text-center">Completed</th>
                    <th className="pb-2 font-medium text-center">Completion Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {deptData.map((d: any) => (
                    <tr key={d.name} className="border-b border-border/30">
                      <td className="py-2 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                        {d.name}
                      </td>
                      <td className="py-2 text-center">{d.tasks}</td>
                      <td className="py-2 text-center">{d.completed}</td>
                      <td className="py-2 text-center">
                        <span className={d.rate >= 75 ? 'text-success' : d.rate >= 40 ? 'text-warning' : 'text-destructive'}>
                          {d.rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">No departments yet</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentComments.length > 0 ? (
            <div className="space-y-3">
              {recentComments.map((c: any) => (
                <div key={c.id} className="flex items-start gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">
                      {(c.profiles?.full_name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-foreground">
                      <span className="font-medium">{c.profiles?.full_name || 'User'}</span>
                      {' commented on '}
                      <span className="font-medium">{c.tasks?.title || 'a task'}</span>
                    </p>
                    <p className="text-muted-foreground text-xs mt-0.5 truncate">{c.content}</p>
                    <p className="text-muted-foreground/60 text-[11px] mt-0.5">
                      {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm py-4 text-center">No recent activity</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
