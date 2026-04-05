import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Send, Calendar, User, Building2, Trash2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type TaskStatus = Database['public']['Enums']['task_status'];

interface Props {
  taskId: string;
  onBack: () => void;
}

const statusColors: Record<string, string> = {
  pending: 'bg-muted text-muted-foreground',
  in_progress: 'bg-warning/15 text-warning border border-warning/30',
  completed: 'bg-success/15 text-success border border-success/30',
};

const TaskDetail = ({ taskId, onBack }: Props) => {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');

  const { data: task } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('*, departments(name, color), assigned:profiles!tasks_assigned_to_fkey(full_name), creator:profiles!tasks_created_by_fkey(full_name)')
        .eq('id', taskId)
        .single();
      return data;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const { data } = await supabase
        .from('task_comments')
        .select('*, profiles(full_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async (status: TaskStatus) => {
      const { error } = await supabase.from('tasks').update({ status }).eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Status updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('task_comments').insert({
        task_id: taskId,
        user_id: user!.id,
        content: comment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
      setComment('');
      toast.success('Comment added');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task deleted');
      onBack();
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (!task) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';
  const canEdit = role === 'admin' || task.assigned_to === user?.id;

  return (
    <div className="space-y-6 max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to tasks
      </button>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{task.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={statusColors[task.status]}>{task.status.replace('_', ' ')}</Badge>
            <Badge className={`text-[11px] ${task.priority === 'urgent' ? 'bg-destructive text-destructive-foreground' : task.priority === 'high' ? 'bg-warning text-warning-foreground' : 'bg-primary text-primary-foreground'}`}>
              {task.priority}
            </Badge>
            {isOverdue && <Badge variant="destructive">Overdue</Badge>}
          </div>
        </div>
        {role === 'admin' && (
          <Button variant="destructive" size="sm" onClick={() => deleteTask.mutate()}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        )}
      </div>

      {(task.description || task.patient_name) && (
        <Card className="border-border/50">
          <CardContent className="p-4">
            {task.description && <p className="text-sm text-foreground whitespace-pre-wrap">{task.description}</p>}
            {task.patient_name && <p className="text-sm text-muted-foreground mt-2">Patient: <span className="font-medium text-foreground">{task.patient_name}</span></p>}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Dept:</span>
          <span className="font-medium">{(task as any).departments?.name || 'None'}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Assigned:</span>
          <span className="font-medium">{(task as any).assigned?.full_name || 'Unassigned'}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Created by:</span>
          <span className="font-medium">{(task as any).creator?.full_name || 'Unknown'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Due:</span>
          <span className="font-medium">{task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}</span>
        </div>
      </div>

      {/* Status update */}
      {canEdit && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Update status:</span>
          <Select value={task.status} onValueChange={(v) => updateStatus.mutate(v as TaskStatus)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Comments */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Comments ({comments.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No comments yet</p>
          ) : (
            <div className="space-y-3">
              {comments.map((c: any) => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-xs font-medium text-primary">
                      {(c.profiles?.full_name || 'U')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 bg-muted rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{c.profiles?.full_name || 'User'}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-foreground">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 pt-2 border-t">
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment..."
              rows={2}
              className="flex-1"
            />
            <Button onClick={() => addComment.mutate()} disabled={!comment.trim() || addComment.isPending} size="icon" className="self-end">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskDetail;
