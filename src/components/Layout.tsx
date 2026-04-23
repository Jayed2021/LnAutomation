import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRefresh } from '../contexts/RefreshContext';
import { useNotifications } from '../contexts/NotificationContext';
import { supabase } from '../lib/supabase';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  DollarSign,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  RefreshCw,
  KeyRound,
  Bell,
} from 'lucide-react';
import bcrypt from 'bcryptjs';
import { NotificationToast } from './NotificationToast';

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
  module: string;
  children?: NavItem[];
}

export const Layout: React.FC = () => {
  const { user, setUser, hasModuleAccess } = useAuth();
  const { triggerRefresh, isRefreshing } = useRefresh();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [receiveGoodsCount, setReceiveGoodsCount] = useState(0);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  useEffect(() => {
    const fetchCount = async () => {
      const [directRes, partialRes, sessionsRes] = await Promise.all([
        supabase
          .from('purchase_orders')
          .select('id', { count: 'exact', head: true })
          .in('status', ['ordered', 'confirmed']),
        supabase
          .from('purchase_orders')
          .select('id, purchase_order_items!inner(ordered_quantity, received_quantity)')
          .eq('status', 'partially_received'),
        supabase
          .from('goods_receipt_sessions')
          .select('po_id')
          .neq('step', 'complete')
      ]);

      const activePOIds = new Set((sessionsRes.data || []).map((s: any) => s.po_id));
      const partialWithWork = (partialRes.data || []).filter((po: any) => {
        if (activePOIds.has(po.id)) return true;
        const items = po.purchase_order_items || [];
        return items.some((i: any) => (i.ordered_quantity ?? 0) > (i.received_quantity ?? 0));
      });

      setReceiveGoodsCount((directRes.count ?? 0) + partialWithWork.length);
    };
    fetchCount();
  }, [isRefreshing]);

  const location = useLocation();
  const navigate = useNavigate();

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      module: 'dashboard'
    },
    {
      name: 'Purchase',
      path: '/purchase',
      icon: <ShoppingCart className="w-5 h-5" />,
      module: 'purchase',
      children: [
        { name: 'Purchase Orders', path: '/purchase/orders', icon: null, module: 'purchase' },
        { name: 'Create PO', path: '/purchase/create', icon: null, module: 'purchase' },
        { name: 'Suppliers', path: '/purchase/suppliers', icon: null, module: 'purchase' }
      ]
    },
    {
      name: 'Inventory',
      path: '/inventory',
      icon: <Package className="w-5 h-5" />,
      module: 'inventory',
      children: [
        { name: 'Products', path: '/inventory/products', icon: null, module: 'inventory' },
        { name: 'Shipments', path: '/inventory/shipments', icon: null, module: 'inventory' },
        { name: 'Stock Movements', path: '/inventory/movements', icon: null, module: 'inventory' },
        { name: 'Locations', path: '/inventory/locations', icon: null, module: 'inventory' },
        { name: 'Audit & Cycle Counts', path: '/inventory/audit', icon: null, module: 'inventory' },
        { name: 'Receive Goods', path: '/inventory/receive', icon: null, module: 'inventory' }
      ]
    },
    {
      name: 'Fulfillment',
      path: '/fulfillment',
      icon: <Truck className="w-5 h-5" />,
      module: 'fulfillment',
      children: [
        { name: 'Orders', path: '/fulfillment/orders', icon: null, module: 'fulfillment' },
        { name: 'Operations', path: '/fulfillment/operations', icon: null, module: 'fulfillment_operations' },
        { name: 'Returns', path: '/fulfillment/returns', icon: null, module: 'fulfillment_returns' }
      ]
    },
    {
      name: 'Finance',
      path: '/finance',
      icon: <DollarSign className="w-5 h-5" />,
      module: 'finance',
      children: [
        { name: 'Cash Out', path: '/finance/expenses', icon: null, module: 'finance_expenses' },
        { name: 'Cash In', path: '/finance/collection', icon: null, module: 'finance_collection' }
      ]
    },
    {
      name: 'Customers',
      path: '/customers',
      icon: <Users className="w-5 h-5" />,
      module: 'customers'
    },
    {
      name: 'Reports',
      path: '/reports',
      icon: <BarChart3 className="w-5 h-5" />,
      module: 'reports'
    },
    {
      name: 'Settings',
      path: '/settings',
      icon: <Settings className="w-5 h-5" />,
      module: 'settings'
    }
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.children) {
      const accessibleChildren = item.children.filter(child => hasModuleAccess(child.module));
      return accessibleChildren.length > 0;
    }
    return hasModuleAccess(item.module);
  });

  const toggleMenu = (path: string) => {
    setExpandedMenus(prev =>
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('erp_user_id');
    setUser(null);
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!user) return;
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError('New passwords do not match.');
      return;
    }
    if (passwordForm.next.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    setPasswordSaving(true);
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', user.id)
        .maybeSingle();
      if (!userData) throw new Error('User not found.');
      const match = await bcrypt.compare(passwordForm.current, userData.password_hash);
      if (!match) {
        setPasswordError('Current password is incorrect.');
        return;
      }
      const newHash = await bcrypt.hash(passwordForm.next, 10);
      await supabase.from('users').update({ password_hash: newHash, password_changed: true, updated_at: new Date().toISOString() }).eq('id', user.id);
      setPasswordSuccess(true);
      setPasswordForm({ current: '', next: '', confirm: '' });
      setUser({ ...user, password_changed: true });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordSuccess(false);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'An error occurred.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const formatRoleName = (role: string) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-gray-900 text-white transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-xl font-bold">ERP System</h1>
          <p className="text-xs text-gray-400 mt-1">Bangladesh Eyewear</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {filteredNavItems.map((item) => (
            <div key={item.path}>
              {item.children ? (
                <div>
                  <button
                    onClick={() => toggleMenu(item.path)}
                    className={`w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800 transition-colors ${
                      isActive(item.path) ? 'bg-gray-800 border-l-4 border-blue-600' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.name}</span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedMenus.includes(item.path) ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedMenus.includes(item.path) && (
                    <div className="bg-gray-800">
                      {item.children
                        .filter(child => hasModuleAccess(child.module))
                        .map((child) => (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`flex items-center justify-between px-12 py-2 text-sm hover:bg-gray-700 transition-colors ${
                              location.pathname === child.path || location.pathname.startsWith(child.path + '/') ? 'bg-gray-700 text-blue-400' : ''
                            }`}
                          >
                            <span>{child.name}</span>
                            {child.path === '/inventory/receive' && receiveGoodsCount > 0 && (
                              <span className="ml-2 min-w-[20px] h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                {receiveGoodsCount}
                              </span>
                            )}
                          </Link>
                        ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors ${
                    isActive(item.path) ? 'bg-gray-800 border-l-4 border-blue-600' : ''
                  }`}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          {user && !user.password_changed && (
            <div className="mb-3 px-3 py-2 bg-amber-600/20 border border-amber-500/30 rounded-lg">
              <p className="text-xs text-amber-300 font-medium">Please change your default password</p>
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold shrink-0">
              {user?.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.role && formatRoleName(user.role)}</p>
            </div>
          </div>
          <button
            onClick={() => { setShowPasswordModal(true); setPasswordError(''); setPasswordSuccess(false); setPasswordForm({ current: '', next: '', confirm: '' }); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 mb-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
          >
            <KeyRound className="w-4 h-4" />
            <span>Change Password</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/notifications')}
              title="Notifications"
              className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={triggerRefresh}
              disabled={isRefreshing}
              title="Refresh data"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
            <div className="h-6 w-px bg-gray-200" />
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
              <p className="text-xs text-gray-500">{user?.username && `@${user.username}`}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>

      <NotificationToast />

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Change Password</h2>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              {passwordSuccess ? (
                <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 text-center font-medium">
                  Password changed successfully!
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwordForm.current}
                      onChange={e => setPasswordForm(p => ({ ...p, current: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.next}
                      onChange={e => setPasswordForm(p => ({ ...p, next: e.target.value }))}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={e => setPasswordForm(p => ({ ...p, confirm: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  </div>
                  {passwordError && (
                    <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                      {passwordError}
                    </div>
                  )}
                  <div className="flex gap-3 pt-1">
                    <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button type="submit" disabled={passwordSaving} className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition-colors">
                      {passwordSaving ? 'Saving...' : 'Change Password'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
