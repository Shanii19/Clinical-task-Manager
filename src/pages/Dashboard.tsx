import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ListTodo, Clock, CheckCircle2, AlertTriangle, Users, Building2 } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid } from 'recharts';
import MemberDashboard from '@/components/MemberDashboard';

const STATUS_COLORS = ['hsl(210, 80%, 45%)', 'hsl(38, 92%, 50%)', 'hsl(152, 60%, 42%)'];
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'hsl(0, 72%, 55%)',
  high: 'hsl(38, 92%, 50%)',
  normal: 'hsl(210, 80%, 45%)',
  low: 'hsl(215, 15%, 50%)',
};

const Dashboard = () => {
  const { user, role, profile } = useAuth();

  // Members see their own dashboard
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

  const statusData = [
    { name: 'Pending', value: pending },
    { name: 'In Progress', value: inProgress },
    { name: 'Completed', value: completed },
  ].filter((d) => d.value > 0);

  const deptData = departments.map((d: any) => {
    const deptTasks = tasks.filter((t: any) => t.department_id === d.id);
    const deptCompleted = deptTasks.filter((t: any) => t.status === 'completed').length;
    return {
      name: d.name,
      tasks: deptTasks.length,
      completed: deptCompleted,
      rate: deptTasks.length > 0 ? Math.round((deptCompleted / deptTasks.length) * 100) : 0,
      color: d.color,
    };
  });

  const memberWorkload = profiles
    .filter((p: any) => p.user_roles?.some?.((r: any) => r.role === 'member') || true)
    .map((p: any) => ({
      name: p.full_name || 'Unknown',
      tasks: tasks.filter((t: any) => t.assigned_to === p.id).length,
    }))
    .filter((m: any) => m.tasks > 0)
    .sort((a: any, b: any) => b.tasks - a.tasks)
    .slice(0, 8);

  const summaryCards = [
    { label: 'Total Tasks', value: total, icon: ListTodo, color: 'text-primary' },
    { label: 'Pending', value: pending, icon: Clock, color: 'text-warning' },
    { label: 'In Progress', value: inProgress, icon: ListTodo, color: 'text-primary' },
    { label: 'Completed', value: completed, icon: CheckCircle2, color: 'text-success' },
    { label: 'Overdue', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
    { label: 'Team Members', value: profiles.length, icon: Users, color: 'text-accent' },
  ];

  const chartConfig = {
    pending: { label: 'Pending', color: STATUS_COLORS[0] },
    inProgress: { label: 'In Progress', color: STATUS_COLORS[1] },
    completed: { label: 'Completed', color: STATUS_COLORS[2] },
    tasks: { label: 'Tasks', color: 'hsl(210, 80%, 45%)' },
  };

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

      {/* Charts */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Status Pie */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name">
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={STATUS_COLORS[i]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No tasks yet</div>
            )}
          </CardContent>
        </Card>

        {/* Department Bar */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tasks by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {deptData.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tasks" fill="hsl(210, 80%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No departments yet</div>
            )}
          </CardContent>
        </Card>

        {/* Team Workload */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Team Workload</CardTitle>
          </CardHeader>
          <CardContent>
            {memberWorkload.length > 0 ? (
              <ChartContainer config={chartConfig} className="h-[200px]">
                <BarChart data={memberWorkload} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="tasks" fill="hsl(172, 60%, 42%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">No assignments yet</div>
            )}
          </CardContent>
        </Card>
      </div>

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
