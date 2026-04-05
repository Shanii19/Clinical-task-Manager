import { useEffect } from 'react';
import { Bell, CheckCheck, ListTodo, CalendarOff, MessageSquare } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const typeIcons: Record<string, typeof Bell> = {
  task: ListTodo,
  leave: CalendarOff,
  chat: MessageSquare,
};

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications-unread', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id)
        .eq('read', false);
      return count ?? 0;
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications-recent', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['notifications-unread', user.id] });
          queryClient.invalidateQueries({ queryKey: ['notifications-recent', user.id] });
          toast.info((payload.new as any).title, { description: (payload.new as any).message });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    queryClient.invalidateQueries({ queryKey: ['notifications-unread', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications-recent', user?.id] });
  };

  const markAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user!.id).eq('read', false);
    queryClient.invalidateQueries({ queryKey: ['notifications-unread', user?.id] });
    queryClient.invalidateQueries({ queryKey: ['notifications-recent', user?.id] });
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
          ) : (
            notifications.map((n: any) => {
              const Icon = typeIcons[n.type] || Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (!n.read) markAsRead(n.id);
                    if (n.task_id) navigate('/tasks');
                    else if (n.type === 'leave') navigate('/notifications');
                  }}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/50 transition-colors border-b border-border/30 ${!n.read ? 'bg-primary/5' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!n.read ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${!n.read ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                </button>
              );
            })
          )}
        </div>
        <div className="border-t px-4 py-2">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('/notifications')}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
