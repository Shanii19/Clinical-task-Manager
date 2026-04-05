import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { Settings2, RotateCcw } from 'lucide-react';
import { AVAILABLE_WIDGETS, useDashboardWidgets, type WidgetId } from '@/hooks/useDashboardWidgets';
import { WIDGET_COMPONENTS } from '@/components/DashboardWidgets';
import { useAuth } from '@/contexts/AuthContext';

export function CustomDashboard() {
  const { profile } = useAuth();
  const { activeWidgets, addWidget, removeWidget, resetWidgets } = useDashboardWidgets();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {profile?.full_name || 'User'}</p>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" /> Customize
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Customize Dashboard</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">Toggle widgets to show or hide them on your dashboard.</p>
              {AVAILABLE_WIDGETS.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2">
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

      {activeWidgets.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Settings2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No widgets selected. Click <strong>Customize</strong> to add widgets.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {activeWidgets.map((id) => {
            const WidgetComponent = WIDGET_COMPONENTS[id];
            return WidgetComponent ? (
              <div key={id} className={id === 'task-stats' ? 'md:col-span-2' : ''}>
                <WidgetComponent onRemove={() => removeWidget(id)} />
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
