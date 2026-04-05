import { useState, useEffect } from 'react';

export type WidgetId = 'upcoming-tasks' | 'notifications' | 'status-chart' | 'recent-activity' | 'deadlines';

export interface WidgetConfig {
  id: WidgetId;
  title: string;
  description: string;
}

export const AVAILABLE_WIDGETS: WidgetConfig[] = [
  { id: 'upcoming-tasks', title: 'Upcoming Tasks', description: 'Tasks due soon sorted by deadline' },
  { id: 'notifications', title: 'Notifications', description: 'Recent unread notifications' },
  { id: 'status-chart', title: 'Status Chart', description: 'Pie chart of task status distribution' },
  { id: 'recent-activity', title: 'Recent Activity', description: 'Latest task comments and updates' },
  { id: 'deadlines', title: 'Deadline Calendar', description: 'Tasks grouped by due date' },
];

const DEFAULT_WIDGETS: WidgetId[] = ['upcoming-tasks', 'notifications'];
const STORAGE_KEY = 'dashboard-widgets-v2';

export function useDashboardWidgets() {
  const [activeWidgets, setActiveWidgets] = useState<WidgetId[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        // Filter out old 'task-stats' if present
        return parsed.filter((w) => w !== 'task-stats') as WidgetId[];
      }
      return DEFAULT_WIDGETS;
    } catch {
      return DEFAULT_WIDGETS;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(activeWidgets));
  }, [activeWidgets]);

  const addWidget = (id: WidgetId) => {
    if (!activeWidgets.includes(id)) {
      setActiveWidgets((prev) => [...prev, id]);
    }
  };

  const removeWidget = (id: WidgetId) => {
    setActiveWidgets((prev) => prev.filter((w) => w !== id));
  };

  const resetWidgets = () => setActiveWidgets(DEFAULT_WIDGETS);

  return { activeWidgets, addWidget, removeWidget, resetWidgets };
}
