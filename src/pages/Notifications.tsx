import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ArrowLeft, RotateCcw } from 'lucide-react';
import { useNotifications, type AppNotification } from '../contexts/NotificationContext';
import { Card } from '../components/ui/Card';

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDateLabel(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-BD', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function groupByDate(items: AppNotification[]): Array<{ dateLabel: string; items: AppNotification[] }> {
  const map = new Map<string, AppNotification[]>();
  for (const n of items) {
    const date = n.created_at.slice(0, 10);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(n);
  }
  return [...map.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, list]) => ({ dateLabel: formatDateLabel(date), items: list }));
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  return_restock: { label: 'Return Restocks', color: 'text-teal-700', bg: 'bg-teal-50', border: 'border-teal-200' },
};

function getCfg(type: string) {
  return CATEGORY_CONFIG[type] ?? {
    label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200',
  };
}

function NotificationCard({ n }: { n: AppNotification }) {
  const cfg = getCfg(n.type);
  const returns = n.body?.returns ?? [];
  const totalItems = returns.reduce((s: number, r: any) => s + (r.items?.length ?? 0), 0);
  const totalUnits = returns.reduce(
    (s: number, r: any) => s + (r.items?.reduce((ss: number, i: any) => ss + (i.quantity ?? 0), 0) ?? 0),
    0
  );

  return (
    <div className={`rounded-xl border p-4 ${n.read_at ? 'bg-white border-gray-100' : 'bg-white border-gray-200 shadow-sm'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg} ${cfg.border} border`}>
          <RotateCcw className={`w-4 h-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {!n.read_at && <span className="inline-block w-2 h-2 bg-teal-500 rounded-full mr-1.5 mb-0.5 align-middle" />}
              <span className="text-sm font-semibold text-gray-900">{n.title}</span>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">{formatRelativeTime(n.created_at)}</span>
          </div>
          {n.sender_name && <p className="text-xs text-gray-500 mt-0.5">By {n.sender_name}</p>}

          {returns.length > 0 && (
            <div className="mt-2.5 space-y-1.5">
              {returns.map((r: any, idx: number) => (
                <div key={idx} className={`rounded-lg px-3 py-2 ${cfg.bg} border ${cfg.border}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-gray-800">{r.return_number}</span>
                    <span className="text-xs text-gray-500">{r.items?.length ?? 0} SKU{(r.items?.length ?? 0) !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(r.items ?? []).map((item: any, i: number) => (
                      <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                        {item.sku} ×{item.quantity}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {returns.length > 1 && (
            <p className="text-xs text-gray-400 mt-1.5">
              {returns.length} returns · {totalItems} SKU{totalItems !== 1 ? 's' : ''} · {totalUnits} unit{totalUnits !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CategorySection({ type, items }: { type: string; items: AppNotification[] }) {
  const cfg = getCfg(type);
  const dateGroups = groupByDate(items);
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
          {cfg.label}
        </span>
        <span className="text-xs text-gray-400">{items.length} notification{items.length !== 1 ? 's' : ''}</span>
      </div>
      <div className="space-y-4">
        {dateGroups.map(({ dateLabel, items: list }) => (
          <div key={dateLabel}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{dateLabel}</p>
            <div className="space-y-2">
              {list.map(n => <NotificationCard key={n.id} n={n} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, loading, markAllRead, unreadCount } = useNotifications();

  useEffect(() => {
    if (unreadCount > 0) markAllRead();
  }, []);

  const byType = new Map<string, AppNotification[]>();
  for (const n of notifications) {
    if (!byType.has(n.type)) byType.set(n.type, []);
    byType.get(n.type)!.push(n);
  }

  const typeOrder = ['return_restock'];
  const sortedTypes = [
    ...typeOrder.filter(t => byType.has(t)),
    ...[...byType.keys()].filter(t => !typeOrder.includes(t)),
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500">Updates and alerts from your team</p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-400 text-sm">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <Card className="py-20 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <Bell className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No notifications</p>
            <p className="text-sm text-gray-400">You will see updates here when your team sends them.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {sortedTypes.map(type => (
            <CategorySection key={type} type={type} items={byType.get(type)!} />
          ))}
        </div>
      )}
    </div>
  );
}
