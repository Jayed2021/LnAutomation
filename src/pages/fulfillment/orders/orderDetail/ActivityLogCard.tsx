import React from 'react';
import { ActivityLog } from './types';

interface Props {
  logs: ActivityLog[];
}

export function ActivityLogCard({ logs }: Props) {
  const formatDateTime = (d: string) =>
    new Date(d).toLocaleString('en-BD', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-2">
      {logs.map(log => (
        <div key={log.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
          <p className="text-sm font-medium text-gray-800">{log.action}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {log.performed_by_user?.full_name ?? 'System'} &bull; {formatDateTime(log.created_at)}
          </p>
        </div>
      ))}
      {logs.length === 0 && <p className="text-sm text-gray-400">No activity recorded.</p>}
    </div>
  );
}
