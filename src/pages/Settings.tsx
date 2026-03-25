import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
  Building2,
  Users,
  Truck,
  MessageSquare,
  Barcode,
  ShoppingCart,
  Lock,
  Bell,
  Package
} from 'lucide-react';

export default function Settings() {
  const navigate = useNavigate();

  const settingsSections = [
    {
      title: 'Store Profile',
      description: 'Manage store information and branding',
      icon: Building2,
      color: 'blue',
      route: '/settings/store-profile'
    },
    {
      title: 'User Management',
      description: 'Manage users, roles and permissions',
      icon: Users,
      color: 'green'
    },
    {
      title: 'Courier Settings',
      description: 'Configure Pathao and Steadfast integration',
      icon: Truck,
      color: 'emerald',
      route: '/settings/courier'
    },
    {
      title: 'SMS Settings',
      description: 'Configure SMS gateway and templates',
      icon: MessageSquare,
      color: 'amber',
      route: '/settings/sms'
    },
    {
      title: 'Barcode Settings',
      description: 'Configure label size and barcode format for printing',
      icon: Barcode,
      color: 'blue',
      route: '/settings/barcode'
    },
    {
      title: 'Default Packaging',
      description: 'Set packaging materials to auto-add to every new order',
      icon: Package,
      color: 'teal',
      route: '/settings/packaging'
    },
    {
      title: 'WooCommerce Integration',
      description: 'Connect and sync with WooCommerce store',
      icon: ShoppingCart,
      color: 'orange',
      route: '/settings/woocommerce'
    },
    {
      title: 'Security',
      description: 'Manage security and authentication settings',
      icon: Lock,
      color: 'red'
    },
    {
      title: 'Notifications',
      description: 'Configure system notifications and alerts',
      icon: Bell,
      color: 'teal'
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      emerald: 'bg-emerald-100 text-emerald-600',
      amber: 'bg-amber-100 text-amber-600',
      orange: 'bg-orange-100 text-orange-600',
      red: 'bg-red-100 text-red-600',
      teal: 'bg-teal-100 text-teal-600'
    };
    return colors[color as keyof typeof colors] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Configure your ERP system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsSections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.title}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => ('route' in section && section.route) ? navigate(section.route as string) : undefined}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${getColorClasses(section.color)} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Configure
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
