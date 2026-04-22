import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface NotificationBody {
  returns?: Array<{
    return_number: string;
    items: Array<{ sku: string; quantity: number }>;
  }>;
  [key: string]: unknown;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: NotificationBody;
  created_by: string | null;
  created_at: string;
  sender_name?: string;
  read_at: string | null;
}

export interface ToastNotification {
  id: string;
  title: string;
  summary: string;
}

interface NotificationContextType {
  unreadCount: number;
  notifications: AppNotification[];
  toasts: ToastNotification[];
  loading: boolean;
  markAllRead: () => Promise<void>;
  dismissToast: (id: string) => void;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

function buildSummary(notification: AppNotification): string {
  if (notification.type === 'return_restock') {
    const returns = notification.body?.returns ?? [];
    const totalItems = returns.reduce((sum, r) => sum + r.items.length, 0);
    if (returns.length === 1) {
      return `${returns[0].return_number} — ${totalItems} item${totalItems !== 1 ? 's' : ''} restocked`;
    }
    return `${returns.length} returns restocked (${totalItems} items)`;
  }
  return notification.title;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const seenIds = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: notifData } = await supabase
      .from('notifications')
      .select('id, type, title, body, created_by, created_at, users!notifications_created_by_fkey(full_name)')
      .gte('created_at', cutoff)
      .order('created_at', { ascending: false });

    if (!notifData) {
      setLoading(false);
      return;
    }

    const ids = notifData.map((n: any) => n.id);
    let readsMap: Record<string, string | null> = {};

    if (ids.length > 0) {
      const { data: reads } = await supabase
        .from('notification_reads')
        .select('notification_id, read_at')
        .eq('user_id', user.id)
        .in('notification_id', ids);

      (reads ?? []).forEach((r: any) => {
        readsMap[r.notification_id] = r.read_at;
      });
    }

    const mapped: AppNotification[] = notifData.map((n: any) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      created_by: n.created_by,
      created_at: n.created_at,
      sender_name: (n.users as any)?.full_name ?? 'Unknown',
      read_at: readsMap[n.id] !== undefined ? readsMap[n.id] : null,
    }));

    setNotifications(mapped);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        async (payload) => {
          const newRow = payload.new as any;
          if (seenIds.current.has(newRow.id)) return;
          seenIds.current.add(newRow.id);

          let senderName = 'Someone';
          if (newRow.created_by) {
            const { data } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', newRow.created_by)
              .maybeSingle();
            if (data) senderName = (data as any).full_name;
          }

          if (newRow.created_by === user.id) {
            await fetchNotifications();
            return;
          }

          const notif: AppNotification = {
            id: newRow.id,
            type: newRow.type,
            title: newRow.title,
            body: newRow.body,
            created_by: newRow.created_by,
            created_at: newRow.created_at,
            sender_name: senderName,
            read_at: null,
          };

          setNotifications(prev => [notif, ...prev]);

          const toast: ToastNotification = {
            id: newRow.id,
            title: newRow.title,
            summary: buildSummary(notif),
          };

          setToasts(prev => [...prev, toast]);
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== toast.id));
          }, 4000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter(n => n.read_at === null).length;

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter(n => n.read_at === null);
    if (unread.length === 0) return;

    const now = new Date().toISOString();

    await supabase
      .from('notification_reads')
      .upsert(
        unread.map(n => ({
          notification_id: n.id,
          user_id: user.id,
          read_at: now,
        })),
        { onConflict: 'notification_id,user_id' }
      );

    setNotifications(prev =>
      prev.map(n => (n.read_at === null ? { ...n, read_at: now } : n))
    );
  }, [user, notifications]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, notifications, toasts, loading, markAllRead, dismissToast, refresh: fetchNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
