import React, { useState } from 'react';
import { Truck, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock, Package } from 'lucide-react';
import { OrderCourierInfo } from './types';

interface Props {
  courier: OrderCourierInfo | null;
}

const COURIER_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  Pending: {
    label: 'Pending',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: <Clock className="w-3 h-3" />,
  },
  'In Transit': {
    label: 'In Transit',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: <Truck className="w-3 h-3" />,
  },
  Delivered: {
    label: 'Delivered',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  Returned: {
    label: 'Returned',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: <Package className="w-3 h-3" />,
  },
  Cancelled: {
    label: 'Cancelled',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: <AlertCircle className="w-3 h-3" />,
  },
};

function getStatusConfig(status: string | null) {
  if (!status) return null;
  return COURIER_STATUS_CONFIG[status] ?? {
    label: status,
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: <Truck className="w-3 h-3" />,
  };
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function JsonViewer({ data }: { data: Record<string, unknown> }) {
  const renderValue = (value: unknown, depth = 0): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-gray-400">null</span>;
    }
    if (typeof value === 'boolean') {
      return <span className={value ? 'text-green-600' : 'text-red-600'}>{String(value)}</span>;
    }
    if (typeof value === 'number') {
      return <span className="text-blue-600">{value}</span>;
    }
    if (typeof value === 'string') {
      return <span className="text-amber-700">"{value}"</span>;
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="text-gray-500">[]</span>;
      return (
        <span>
          {'['}
          <div className="ml-4">
            {value.map((item, i) => (
              <div key={i}>{renderValue(item, depth + 1)}{i < value.length - 1 ? ',' : ''}</div>
            ))}
          </div>
          {']'}
        </span>
      );
    }
    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) return <span className="text-gray-500">{'{}'}</span>;
      return (
        <span>
          {'{'}
          <div className="ml-4">
            {entries.map(([k, v], i) => (
              <div key={k}>
                <span className="text-gray-600 font-medium">{k}</span>
                <span className="text-gray-400">: </span>
                {renderValue(v, depth + 1)}
                {i < entries.length - 1 ? <span className="text-gray-400">,</span> : ''}
              </div>
            ))}
          </div>
          {'}'}
        </span>
      );
    }
    return <span className="text-gray-700">{String(value)}</span>;
  };

  return (
    <div className="font-mono text-xs leading-relaxed text-gray-800 overflow-x-auto">
      {renderValue(data)}
    </div>
  );
}

export function CourierResponseCard({ courier }: Props) {
  const [responseExpanded, setResponseExpanded] = useState(false);

  if (!courier) return null;

  const hasConsignment = !!courier.consignment_id;
  const hasStatus = !!courier.courier_status;
  const hasResponse = !!courier.courier_api_response;
  const hasError = !!courier.courier_api_error;

  if (!hasConsignment && !hasStatus && !hasResponse && !hasError) return null;

  const statusConfig = getStatusConfig(courier.courier_status);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3.5">
        <Truck className="w-4 h-4 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Courier Status & API Log</h3>
      </div>

      <div className="space-y-3">
        {(hasConsignment || hasStatus) && (
          <div className="grid grid-cols-2 gap-3">
            {hasConsignment && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Consignment ID</div>
                <div className="text-sm font-mono text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200 truncate">
                  {courier.consignment_id}
                </div>
              </div>
            )}
            {hasStatus && statusConfig && (
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Courier Order Status</div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusConfig.color} ${statusConfig.bg} ${statusConfig.border}`}>
                  {statusConfig.icon}
                  {statusConfig.label}
                </span>
              </div>
            )}
          </div>
        )}

        {courier.courier_status_updated_at && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-0.5">Status Last Updated</div>
            <div className="text-xs text-gray-600">{formatDateTime(courier.courier_status_updated_at)}</div>
          </div>
        )}

        {hasError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="text-xs font-semibold text-red-700">API Error</span>
            </div>
            <p className="text-xs text-red-800 font-mono leading-relaxed whitespace-pre-wrap break-all">
              {courier.courier_api_error}
            </p>
          </div>
        )}

        {hasResponse && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setResponseExpanded(p => !p)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                <span className="text-xs font-semibold text-gray-700">API Response</span>
              </div>
              {responseExpanded
                ? <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                : <ChevronDown className="w-3.5 h-3.5 text-gray-500" />}
            </button>
            {responseExpanded && (
              <div className="p-3 bg-white border-t border-gray-200 max-h-64 overflow-y-auto">
                <JsonViewer data={courier.courier_api_response!} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
