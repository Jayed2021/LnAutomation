import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useRefresh } from '../contexts/RefreshContext';
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
  RefreshCw
} from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [receiveGoodsCount, setReceiveGoodsCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from('purchase_orders')
        .select('id', { count: 'exact', head: true })
        .in('status', ['ordered', 'confirmed', 'partially_received']);
      setReceiveGoodsCount(count ?? 0);
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
        { name: 'Expenses', path: '/finance/expenses', icon: null, module: 'finance_expenses' },
        { name: 'Profit Analysis', path: '/finance/profit', icon: null, module: 'finance' },
        { name: 'Collection', path: '/finance/collection', icon: null, module: 'finance_collection' }
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
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-bold">
              {user?.full_name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.role && formatRoleName(user.role)}</p>
            </div>
          </div>
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
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
