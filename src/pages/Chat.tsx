import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Users, MessageSquare, AtSign, Search } from 'lucide-react';
import { toast } from 'sonner';

const Chat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [cursorPos, setCursorPos] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // All profiles
  const { data: profiles = [] } = useQuery({
    queryKey: ['chat-profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').neq('id', user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  // Conversations list (unique users we've messaged with)
  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, message_text, created_at')
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order('created_at', { ascending: false });
      if (!data) return [];

      const seen = new Map<string, any>();
      for (const msg of data) {
        const otherId = msg.sender_id === user!.id ? msg.receiver_id : msg.sender_id;
        if (!seen.has(otherId)) {
          seen.set(otherId, { userId: otherId, lastMessage: msg.message_text, lastAt: msg.created_at });
        }
      }
      return Array.from(seen.values());
    },
    enabled: !!user,
  });

  // Messages with selected user
  const { data: messages = [] } = useQuery({
    queryKey: ['chat-messages', user?.id, selectedUser],
    queryFn: async () => {
      if (!selectedUser) return [];
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${selectedUser}),and(sender_id.eq.${selectedUser},receiver_id.eq.${user!.id})`)
        .order('created_at', { ascending: true });
      return data ?? [];
    },
    enabled: !!user && !!selectedUser,
  });

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('chat-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !message.trim()) return;
      const { error } = await supabase.from('messages').insert({
        sender_id: user!.id,
        receiver_id: selectedUser,
        message_text: message.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const selectedProfile = profiles.find((p: any) => p.id === selectedUser);
  const initials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  // Conversation list enriched with profile names
  const enrichedConversations = useMemo(() => {
    return conversations.map((c: any) => {
      const prof = profiles.find((p: any) => p.id === c.userId);
      return { ...c, name: prof?.full_name || 'Unknown' };
    });
  }, [conversations, profiles]);

  const filteredConversations = enrichedConversations.filter((c: any) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  // New chat with user not in conversations
  const newChatUsers = profiles.filter((p: any) =>
    !conversations.some((c: any) => c.userId === p.id) &&
    p.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  // @mention handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessage(val);
    setCursorPos(e.target.selectionStart || 0);

    const beforeCursor = val.slice(0, e.target.selectionStart || 0);
    const atMatch = beforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setShowMentions(true);
      setMentionFilter(atMatch[1]);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (name: string) => {
    const beforeCursor = message.slice(0, cursorPos);
    const afterCursor = message.slice(cursorPos);
    const replaced = beforeCursor.replace(/@\w*$/, `@${name} `);
    setMessage(replaced + afterCursor);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const mentionSuggestions = profiles.filter((p: any) =>
    p.full_name?.toLowerCase().includes(mentionFilter.toLowerCase())
  ).slice(0, 5);

  // Render message with @mentions highlighted
  const renderMessage = (text: string) => {
    const parts = text.split(/(@\w[\w\s]*?)(?=\s|$)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? (
        <span key={i} className="text-primary font-medium">{part}</span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar: Conversations */}
      <Card className="w-72 shrink-0 border-border/50 flex flex-col">
        <CardHeader className="pb-2 px-3 pt-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Messages
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-8 h-8 text-xs" />
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.map((c: any) => (
            <button
              key={c.userId}
              onClick={() => setSelectedUser(c.userId)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${selectedUser === c.userId ? 'bg-primary/10 text-primary' : 'hover:bg-muted/50'}`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials(c.name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{c.lastMessage}</p>
              </div>
            </button>
          ))}
          {/* New chat suggestions */}
          {search && newChatUsers.length > 0 && (
            <>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider px-2 pt-2">Start new chat</div>
              {newChatUsers.slice(0, 5).map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedUser(p.id)}
                  className={`w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-muted/50 transition-colors ${selectedUser === p.id ? 'bg-primary/10' : ''}`}
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-[10px] bg-muted text-muted-foreground">{initials(p.full_name)}</AvatarFallback>
                  </Avatar>
                  <p className="text-sm truncate">{p.full_name}</p>
                </button>
              ))}
            </>
          )}
          {filteredConversations.length === 0 && newChatUsers.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">No conversations yet. Search for a user to start chatting.</p>
          )}
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 border-border/50 flex flex-col">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {initials(selectedProfile?.full_name || '')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-semibold">{selectedProfile?.full_name || 'User'}</p>
                <p className="text-[11px] text-muted-foreground">Direct message</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-12">No messages yet. Say hello!</p>
              )}
              {messages.map((msg: any) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMe ? 'bg-primary text-primary-foreground rounded-br-md' : 'bg-muted text-foreground rounded-bl-md'}`}>
                      <p className="text-sm">{renderMessage(msg.message_text)}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t p-3 relative">
              {showMentions && mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-3 right-3 mb-1 bg-popover border rounded-lg shadow-lg p-1 z-10">
                  {mentionSuggestions.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => insertMention(p.full_name)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-muted transition-colors text-left"
                    >
                      <AtSign className="h-3 w-3 text-primary" />
                      {p.full_name}
                    </button>
                  ))}
                </div>
              )}
              <form onSubmit={(e) => { e.preventDefault(); sendMessage.mutate(); }} className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={message}
                  onChange={handleInputChange}
                  placeholder="Type a message... use @ to mention"
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={!message.trim() || sendMessage.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm">Select a conversation or search for a user</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Chat;
