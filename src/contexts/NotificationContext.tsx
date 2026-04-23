import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

export interface NotificationBody {
  returns?: Array<{
    return_number: string;
    items: Array<{ sku: string; quantity: number }>;
  }>;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: NotificationBody;
  created_by: string;
  sender_name: string | null;
  created_at: string;
  read_at: string | null;
}

export interface ToastNotification {
  id: string;
  title: string;
  summary: string;
}

interface NotificationContextType {
  notifications: AppNotification[];
  loading: boolean;
  unreadCount: number;
  toasts: ToastNotification[];
  markAllRead: () => Promise<void>;
  dismissToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<ToastNotification[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id, type, title, body, created_by, sender_name, created_at,
        notification_reads!left(read_at)
      `)
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch notifications:', error);
      return;
    }

    const rows: AppNotification[] = (data ?? []).map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body ?? {},
      created_by: row.created_by,
      sender_name: row.sender_name,
      created_at: row.created_at,
      read_at: row.notification_reads?.[0]?.read_at ?? null,
    }));

    setNotifications(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    fetchNotifications();

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newRow = payload.new as any;
          const notification: AppNotification = {
            id: newRow.id,
            type: newRow.type,
            title: newRow.title,
            body: newRow.body ?? {},
            created_by: newRow.created_by,
            sender_name: newRow.sender_name,
            created_at: newRow.created_at,
            read_at: null,
          };

          setNotifications(prev => [notification, ...prev]);

          if (newRow.created_by !== user.id) {
            const returns = notification.body?.returns ?? [];
            const totalUnits = returns.reduce(
              (s: number, r: any) => s + (r.items?.reduce((ss: number, i: any) => ss + (i.quantity ?? 0), 0) ?? 0),
              0
            );
            const summary = returns.length > 0
              ? `${returns.length} return${returns.length !== 1 ? 's' : ''} · ${totalUnits} unit${totalUnits !== 1 ? 's' : ''} restocked`
              : notification.title;

            const toast: ToastNotification = {
              id: newRow.id,
              title: newRow.title,
              summary,
            };
            setToasts(prev => [...prev, toast]);
            setTimeout(() => {
              setToasts(prev => prev.filter(t => t.id !== toast.id));
            }, 4000);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [user, fetchNotifications]);

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unread = notifications.filter(n => n.read_at === null);
    if (unread.length === 0) return;
    const rows = unread.map(n => ({
      notification_id: n.id,
      user_id: user.id,
      read_at: new Date().toISOString(),
    }));
    await supabase
      .from('notification_reads')
      .upsert(rows, { onConflict: 'notification_id,user_id' });
    setNotifications(prev =>
      prev.map(n => (n.read_at === null ? { ...n, read_at: new Date().toISOString() } : n))
    );
  }, [user, notifications]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const unreadCount = notifications.filter(n => n.read_at === null).length;

  return (
    <NotificationContext.Provider value={{ notifications, loading, unreadCount, toasts, markAllRead, dismissToast }}>
      {children}
    </NotificationContext.Provider>
  );
};
