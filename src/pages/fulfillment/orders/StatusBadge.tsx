import React from 'react';
import { STATUS_CONFIG } from './types';

interface Props {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: Props) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border} ${className}`}
    >
      {cfg.label}
    </span>
  );
}
