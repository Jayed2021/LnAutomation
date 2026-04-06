import { UserRole } from './supabase';

export type ModuleKey =
  | 'dashboard'
  | 'purchase'
  | 'inventory'
  | 'fulfillment'
  | 'fulfillment_operations'
  | 'fulfillment_returns'
  | 'finance'
  | 'finance_expenses'
  | 'finance_collection'
  | 'customers'
  | 'reports'
  | 'settings';

const ROLE_MODULE_ACCESS: Record<UserRole, ModuleKey[]> = {
  admin: [
    'dashboard', 'purchase', 'inventory',
    'fulfillment', 'fulfillment_operations', 'fulfillment_returns',
    'finance', 'finance_expenses', 'finance_collection',
    'customers', 'reports', 'settings',
  ],
  operations_manager: [
    'dashboard', 'purchase', 'inventory',
    'fulfillment', 'fulfillment_operations', 'fulfillment_returns',
    'finance', 'finance_expenses', 'finance_collection',
    'customers', 'reports',
  ],
  warehouse_manager: [
    'dashboard', 'inventory',
    'fulfillment', 'fulfillment_operations', 'fulfillment_returns',
  ],
  customer_service: [
    'dashboard', 'fulfillment', 'customers',
  ],
  accounts: [
    'dashboard', 'fulfillment',
    'finance', 'finance_expenses', 'finance_collection',
  ],
};

export function getModuleAccess(
  role: UserRole,
  modulePermissions: Record<string, boolean>,
  module: string
): boolean {
  if (module in modulePermissions) {
    return modulePermissions[module];
  }
  const allowed = ROLE_MODULE_ACCESS[role] ?? [];
  return allowed.includes(module as ModuleKey);
}

export function canDeleteOrders(role: UserRole): boolean {
  return role === 'admin';
}

export function canDoWarehouseActions(
  role: UserRole,
  modulePermissions: Record<string, boolean>
): boolean {
  if ('warehouse_actions' in modulePermissions) return modulePermissions['warehouse_actions'];
  return ['admin', 'operations_manager', 'warehouse_manager'].includes(role);
}

export function canDoCSActions(
  role: UserRole,
  modulePermissions: Record<string, boolean>
): boolean {
  if ('cs_actions' in modulePermissions) return modulePermissions['cs_actions'];
  return ['admin', 'operations_manager', 'customer_service'].includes(role);
}

export function canEditOrderSource(
  role: UserRole,
  modulePermissions: Record<string, boolean>
): boolean {
  if ('edit_order_source' in modulePermissions) return modulePermissions['edit_order_source'];
  return ['admin', 'operations_manager', 'customer_service'].includes(role);
}

export function canEditCourierPayment(
  role: UserRole,
  modulePermissions: Record<string, boolean>
): boolean {
  if ('edit_courier_payment' in modulePermissions) return modulePermissions['edit_courier_payment'];
  return ['admin', 'operations_manager', 'warehouse_manager', 'customer_service', 'accounts'].includes(role);
}

export function canViewDetailedReports(
  role: UserRole,
  modulePermissions: Record<string, boolean>
): boolean {
  if ('detailed_reports' in modulePermissions) return modulePermissions['detailed_reports'];
  return role === 'admin';
}
