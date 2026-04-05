import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('notifications').update({ read: true }).eq('user_id', user!.id).eq('read', false);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground text-sm">{unreadCount} unread</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={() => markAllRead.mutate()}>
            <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <Card
              key={n.id}
              className={`border-border/50 cursor-pointer transition-colors ${!n.read ? 'bg-primary/5 border-primary/20' : ''}`}
              onClick={() => {
                if (!n.read) markRead.mutate(n.id);
                if (n.task_id) navigate('/tasks');
              }}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 shrink-0 ${!n.read ? 'bg-primary' : 'bg-transparent'}`} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground text-sm">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
