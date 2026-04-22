import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useNotifications, type ToastNotification } from '../contexts/NotificationContext';

function Toast({ toast, onDismiss }: { toast: ToastNotification; onDismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  };

  return (
    <div
      className={`flex items-start gap-3 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 w-80 transition-all duration-300 ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
    >
      <div className="flex-shrink-0 w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mt-0.5">
        <Bell className="w-4 h-4 text-teal-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 leading-tight">{toast.title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{toast.summary}</p>
      </div>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-md hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function NotificationToast() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={dismissToast} />
        </div>
      ))}
    </div>
  );
}
