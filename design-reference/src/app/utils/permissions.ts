import { type User } from '../data/mockData';

export const canSeeCosts = (user: User): boolean => {
  // Warehouse managers cannot see any costs
  return user.role !== 'warehouse_manager';
};

export const canAccessProfitAnalysis = (user: User): boolean => {
  // Only admin can access profit analysis
  return user.role === 'admin';
};

export const canManageFinance = (user: User): boolean => {
  // Admin and accounts can manage finance
  return user.role === 'admin' || user.role === 'accounts';
};

export const canReceiveGoods = (user: User): boolean => {
  // Admin, operations manager, and warehouse manager can receive goods
  return ['admin', 'operations_manager', 'warehouse_manager'].includes(user.role);
};

export const canChangeOrderStatus = (user: User): boolean => {
  // Warehouse manager can change order status from shipped to processing
  // Admin, ops manager, and CS can also change statuses
  return ['admin', 'operations_manager', 'warehouse_manager', 'customer_service'].includes(user.role);
};

export const canCreatePO = (user: User): boolean => {
  // Only admin and operations manager can create POs
  return ['admin', 'operations_manager'].includes(user.role);
};
