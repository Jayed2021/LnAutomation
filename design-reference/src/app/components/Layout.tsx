import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  ClipboardList, 
  RotateCcw, 
  DollarSign, 
  Users,
  BarChart3,
  Settings,
  User,
  Menu,
  X,
  LogOut
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { purchaseOrders } from "../data/mockData";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { toast } from "sonner";

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  // Role-based navigation
  // Admin: Full access
  // Operations Manager: All except profit analysis
  // Warehouse Manager: Can't see costs, no Expenses/Profit/Reports, can receive goods, inventory ops, picking/packing
  // Customer Service: Only Orders, Picking/Packing, Returns
  // Accounts: Finance, Orders
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['admin', 'operations_manager', 'warehouse_manager', 'customer_service', 'accounts'] },
    { 
      name: 'Purchase', 
      icon: ShoppingCart, 
      roles: ['admin', 'operations_manager'],
      children: [
        { name: 'Purchase Orders', href: '/purchase' },
        { name: 'Create PO', href: '/purchase/create' },
        { name: 'Suppliers', href: '/purchase/suppliers' },
      ]
    },
    { 
      name: 'Inventory', 
      icon: Package, 
      roles: ['admin', 'operations_manager', 'warehouse_manager'],
      children: [
        { name: 'Products', href: '/inventory/stock' },
        { name: 'Shipments', href: '/inventory/lots', roles: ['admin', 'operations_manager'] },
        { name: 'Stock Movements', href: '/inventory/movements' },
        { name: 'Warehouse', href: '/inventory/warehouse' },
        { name: 'Audit', href: '/inventory/audit' },
        { name: 'Receive', href: '/inventory/receive', badge: 'pending_shipments' },
      ]
    },
    { 
      name: 'Fulfilment', 
      icon: ClipboardList, 
      roles: ['admin', 'operations_manager', 'customer_service', 'warehouse_manager', 'accounts'],
      children: [
        { name: 'Orders', href: '/fulfilment/orders' },
        { name: 'Operations', href: '/fulfilment/operations', roles: ['admin', 'operations_manager', 'warehouse_manager'] },
        { name: 'Returns', href: '/fulfilment/returns', roles: ['admin', 'operations_manager', 'customer_service', 'warehouse_manager'] },
      ]
    },
    { 
      name: 'Finance', 
      icon: DollarSign, 
      roles: ['admin', 'accounts'],
      children: [
        { name: 'Expenses', href: '/finance/expenses' },
        { name: 'Profit Analysis', href: '/finance/profit', roles: ['admin'] },
        { name: 'Collection', href: '/finance/collection' },
      ]
    },
    { name: 'Customers', href: '/customers', icon: Users, roles: ['admin', 'operations_manager', 'customer_service'] },
    { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin'] },
    { name: 'Settings', href: '/settings', icon: Settings, roles: ['admin'] },
  ];

  const hasAccess = (roles: string[]) => {
    if (!roles) return true; // If no roles specified, allow all
    return roles.includes(profile.role);
  };

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const getRoleBadgeColor = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-500',
      operations_manager: 'bg-blue-500',
      warehouse_manager: 'bg-green-500',
      customer_service: 'bg-purple-500',
      accounts: 'bg-orange-500',
    };
    return colors[role] || 'bg-gray-500';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Admin',
      operations_manager: 'Ops Manager',
      warehouse_manager: 'Warehouse',
      customer_service: 'CS',
      accounts: 'Accounts',
    };
    return labels[role] || role;
  };

  const getBadgeCount = (badgeType: string) => {
    if (badgeType === 'pending_shipments') {
      // Count POs that are ordered or partially received (need receiving)
      return purchaseOrders.filter(po => 
        po.status === 'ordered' || po.status === 'partially_received'
      ).length;
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-40 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-semibold">ERP System</h1>
          </div>
          
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <User className="w-4 h-4" />
                  {profile?.full_name}
                  <Badge className={`${getRoleBadgeColor(profile?.role)} text-white ml-2`}>
                    {getRoleLabel(profile?.role)}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Switch User (Demo)</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside 
        className={`fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 transition-transform duration-200 z-30 overflow-y-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            if (!hasAccess(item.roles)) return null;

            if (item.children) {
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700">
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </div>
                  <div className="ml-7 space-y-1">
                    {item.children.map((child) => {
                      // Check child-specific roles if they exist
                      if (child.roles && !hasAccess(child.roles)) return null;
                      
                      const badgeCount = child.badge ? getBadgeCount(child.badge) : 0;
                      
                      return (
                        <Link
                          key={child.href}
                          to={child.href}
                          className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                            isActive(child.href)
                              ? 'bg-blue-50 text-blue-700 font-medium'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <span>{child.name}</span>
                          {badgeCount > 0 && (
                            <Badge className="bg-red-500 text-white text-xs h-5 w-5 flex items-center justify-center p-0">
                              {badgeCount}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                to={item.href!}
                className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                  isActive(item.href!)
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main 
        className={`pt-16 transition-all duration-200 ${
          sidebarOpen ? 'ml-64' : 'ml-0'
        }`}
      >
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}