import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Bangladesh-specific formatting
export function formatBDT(amount: number): string {
  return `৳ ${amount.toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCurrency(amount: number, currency: string = 'BDT'): string {
  if (currency === 'BDT') {
    return formatBDT(amount);
  }
  const symbols: Record<string, string> = {
    USD: '$',
    CNY: '¥',
    EUR: '€',
    GBP: '£',
  };
  return `${symbols[currency] || currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatPhoneBD(phone: string): string {
  // Format Bangladesh phone numbers: +880-XXXX-XXXXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('880')) {
    return `+880-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
  }
  if (cleaned.startsWith('0')) {
    return `+880-${cleaned.slice(1, 5)}-${cleaned.slice(5)}`;
  }
  return phone;
}

export function percentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

export function calculatePercentage(numerator: number, denominator: number): string {
  return `${percentage(numerator, denominator)}%`;
}

// Role-based access control
export type UserRole = 'admin' | 'operations_manager' | 'warehouse_manager' | 'customer_service' | 'accounts';

export function canSeeCosts(role: UserRole): boolean {
  return role !== 'warehouse_manager';
}

export function canAccessModule(role: UserRole, module: string): boolean {
  const accessMatrix: Record<string, UserRole[]> = {
    dashboard: ['admin', 'operations_manager', 'warehouse_manager', 'customer_service', 'accounts'],
    purchase: ['admin', 'operations_manager'],
    inventory: ['admin', 'operations_manager', 'warehouse_manager'],
    fulfillment: ['admin', 'operations_manager', 'warehouse_manager', 'customer_service', 'accounts'],
    finance: ['admin', 'operations_manager', 'accounts'],
    customers: ['admin', 'operations_manager', 'customer_service'],
    reports: ['admin'],
    settings: ['admin'],
  };

  return accessMatrix[module]?.includes(role) ?? false;
}

// Status colors for CS statuses
export const CS_STATUS_COLORS: Record<string, string> = {
  new_not_called: '#e2e8f0',
  new_called: '#94a3b8',
  awaiting_payment: '#fbbf24',
  send_to_lab: '#f59e0b',
  in_lab: '#f97316',
  late_delivery: '#ef4444',
  exchange: '#06b6d4',
  not_printed: '#818cf8',
  printed: '#6366f1',
  packed: '#8b5cf6',
  shipped: '#3b82f6',
  delivered: '#10b981',
  refund: '#f43f5e',
};

export const CS_STATUS_LABELS: Record<string, string> = {
  new_not_called: 'New - Not Called',
  new_called: 'New - Called',
  awaiting_payment: 'Awaiting Payment',
  send_to_lab: 'Send to Lab',
  in_lab: 'In Lab',
  late_delivery: 'Late Delivery',
  exchange: 'Exchange',
  not_printed: 'Not Printed',
  printed: 'Printed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  refund: 'Refund',
};

// Generate unique IDs
export function generatePONumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `PO-${year}-${random}`;
}

export function generateLotNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `LOT-${year}-${random}`;
}

export function generateReturnNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RET-${year}-${random}`;
}

export function generateShipmentNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `SHP-${year}-${random}`;
}
