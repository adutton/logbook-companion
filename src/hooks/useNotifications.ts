import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { AppNotification } from '../types/notification.types';

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  addNotification: (n: AppNotification) => void;
  clearAll: () => void;
}

export const NotificationContext = createContext<NotificationContextValue | null>(null);

/**
 * Internal hook that owns the notification state.
 * Used by NotificationProvider — consumers should use useNotifications().
 *
 * When the DB table is added later, this will switch to
 * Supabase queries + realtime subscription.
 */
export function useNotificationState(): NotificationContextValue {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const addNotification = useCallback((n: AppNotification) => {
    setNotifications((prev) => [n, ...prev]);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return useMemo(
    () => ({ notifications, unreadCount, markAsRead, markAllRead, addNotification, clearAll }),
    [notifications, unreadCount, markAsRead, markAllRead, addNotification, clearAll],
  );
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return ctx;
}
