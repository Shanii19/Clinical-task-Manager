import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, ListTodo, User, Heart } from 'lucide-react';
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from '@/components/ui/command';
import { QuickTaskModal } from '@/components/QuickTaskModal';

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [quickTaskId, setQuickTaskId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const { data: tasks = [] } = useQuery({
    queryKey: ['search-tasks'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, patient_name, status, priority')
        .order('created_at', { ascending: false })
        .limit(100);
      return data ?? [];
    },
    enabled: open,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['search-users'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name');
      return data ?? [];
    },
    enabled: open,
  });

  const handleSelectTask = (taskId: string) => {
    setOpen(false);
    setQuickTaskId(taskId);
  };

  const handleSelectUser = (userId: string) => {
    setOpen(false);
    navigate(`/chat`);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:bg-accent transition-colors"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search tasks, patients, users..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Tasks">
            {tasks.map((task: any) => (
              <CommandItem key={task.id} onSelect={() => handleSelectTask(task.id)} className="gap-2">
                <ListTodo className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="truncate">{task.title}</span>
                </div>
                <span className="text-xs text-muted-foreground capitalize">{task.status?.replace('_', ' ')}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          {tasks.some((t: any) => t.patient_name) && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Patients">
                {tasks
                  .filter((t: any) => t.patient_name)
                  .reduce((acc: any[], t: any) => {
                    if (!acc.find((a) => a.patient_name === t.patient_name)) acc.push(t);
                    return acc;
                  }, [])
                  .map((task: any) => (
                    <CommandItem key={`patient-${task.id}`} onSelect={() => handleSelectTask(task.id)} className="gap-2">
                      <Heart className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span>{task.patient_name}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </>
          )}
          <CommandSeparator />
          <CommandGroup heading="Users">
            {users.map((u: any) => (
              <CommandItem key={u.id} onSelect={() => handleSelectUser(u.id)} className="gap-2">
                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                <span>{u.full_name || 'Unnamed'}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <QuickTaskModal taskId={quickTaskId} onClose={() => setQuickTaskId(null)} />
    </>
  );
}
