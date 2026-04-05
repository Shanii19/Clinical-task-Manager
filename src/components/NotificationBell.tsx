import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  return (
    <button onClick={() => navigate('/notifications')} className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
}
