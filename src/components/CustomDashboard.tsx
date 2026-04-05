import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Settings2, RotateCcw, Sparkles } from 'lucide-react';
import { AVAILABLE_WIDGETS, useDashboardWidgets, type WidgetId } from '@/hooks/useDashboardWidgets';
import { WIDGET_COMPONENTS, TaskStatsWidget } from '@/components/DashboardWidgets';
import { useAuth } from '@/contexts/AuthContext';

export function CustomDashboard() {
  const { profile } = useAuth();
  const { activeWidgets, addWidget, removeWidget, resetWidgets } = useDashboardWidgets();

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            {greeting}, {profile?.full_name || 'User'} <Sparkles className="h-5 w-5 text-warning" />
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 shadow-sm hover:shadow-md transition-shadow">
              <Settings2 className="h-4 w-4" /> Customize
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Customize Dashboard</SheetTitle>
              <SheetDescription>Toggle widgets to show or hide them on your dashboard.</SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              {AVAILABLE_WIDGETS.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{w.title}</p>
                    <p className="text-xs text-muted-foreground">{w.description}</p>
                  </div>
                  <Switch
                    checked={activeWidgets.includes(w.id)}
                    onCheckedChange={(checked) => checked ? addWidget(w.id) : removeWidget(w.id)}
                  />
                </div>
              ))}
              <Button variant="ghost" size="sm" className="w-full gap-2 mt-4" onClick={resetWidgets}>
                <RotateCcw className="h-3.5 w-3.5" /> Reset to defaults
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Task Stats - always visible */}
      <TaskStatsWidget />

      {/* Customizable widgets */}
      {activeWidgets.length > 0 && (
        <div className="grid md:grid-cols-2 gap-5">
          {activeWidgets.map((id) => {
            const WidgetComponent = WIDGET_COMPONENTS[id];
            return WidgetComponent ? (
              <div key={id}>
                <WidgetComponent onRemove={() => removeWidget(id)} />
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
