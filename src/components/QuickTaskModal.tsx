import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, User, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type TaskStatus = Database['public']['Enums']['task_status'];
type TaskPriority = Database['public']['Enums']['task_priority'];

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-warning/15 text-warning border border-warning/30',
  completed: 'bg-success/15 text-success border border-success/30',
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-destructive text-destructive-foreground',
  high: 'bg-warning text-warning-foreground',
  normal: 'bg-primary text-primary-foreground',
  low: 'bg-muted text-muted-foreground',
};

interface QuickTaskModalProps {
  taskId: string | null;
  onClose: () => void;
}

export function QuickTaskModal({ taskId, onClose }: QuickTaskModalProps) {
  const { role } = useAuth();
  const queryClient = useQueryClient();

  const { data: task } = useQuery({
    queryKey: ['quick-task', taskId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, departments(name, color), profiles!tasks_assigned_to_fkey(full_name)')
        .eq('id', taskId!)
        .single();
      return data;
    },
    enabled: !!taskId,
  });

  const updateTask = useMutation({
    mutationFn: async (updates: { status?: TaskStatus; priority?: TaskPriority }) => {
      const { error } = await supabase.from('tasks').update(updates).eq('id', taskId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick-task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['search-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
      toast.success('Task updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!task) return null;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const canEdit = role === 'admin' || task.assigned_to;

  return (
    <Dialog open={!!taskId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg pr-6">{task.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {task.description && (
            <p className="text-sm text-muted-foreground">{task.description}</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              {canEdit ? (
                <Select value={task.status} onValueChange={(v) => updateTask.mutate({ status: v as TaskStatus })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={statusColors[task.status]}>{task.status.replace('_', ' ')}</Badge>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Priority</label>
              {role === 'admin' ? (
                <Select value={task.priority} onValueChange={(v) => updateTask.mutate({ priority: v as TaskPriority })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={priorityColors[task.priority]}>{task.priority}</Badge>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {task.patient_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Patient: {task.patient_name}</span>
              </div>
            )}
            {(task as any).profiles?.full_name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>Assigned to: {(task as any).profiles.full_name}</span>
              </div>
            )}
            {(task as any).departments?.name && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span>{(task as any).departments.name}</span>
              </div>
            )}
            {task.due_date && (
              <div className={`flex items-center gap-2 ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                <Calendar className="h-3.5 w-3.5" />
                <span>{isOverdue ? 'Overdue: ' : 'Due: '}{new Date(task.due_date).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
