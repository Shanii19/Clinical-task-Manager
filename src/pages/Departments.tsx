import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Trash2, Building2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

const Departments = () => {
  const { role } = useAuth();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');

  if (role !== 'admin') return <Navigate to="/" replace />;

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data } = await supabase.from('departments').select('*').order('name');
      return data ?? [];
    },
  });

  const createDept = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('departments').insert({ name, description: description || null, color });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department created');
      setCreateOpen(false);
      setName('');
      setDescription('');
      setColor('#3B82F6');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDept = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast.success('Department deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Departments</h1>
          <p className="text-muted-foreground text-sm">{departments.length} departments</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Add Department</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Department</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createDept.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency Room" required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Department description..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2 items-center">
                  <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-10 h-10 rounded border cursor-pointer" />
                  <Input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={createDept.isPending}>
                {createDept.isPending ? 'Creating...' : 'Create Department'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {departments.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No departments yet. Create one to organize tasks.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept: any) => (
            <Card key={dept.id} className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: dept.color + '20' }}>
                      <Building2 className="h-5 w-5" style={{ color: dept.color }} />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{dept.name}</h3>
                      {dept.description && <p className="text-sm text-muted-foreground mt-0.5">{dept.description}</p>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteDept.mutate(dept.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Departments;
