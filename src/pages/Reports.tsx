import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BarChart3, TrendingUp, Package, DollarSign, Users, FileText, Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const reportCategories = [
    {
      title: 'Sales Reports',
      icon: TrendingUp,
      color: 'emerald',
      reports: [
        { name: 'Daily Sales Summary', route: null },
        { name: 'Sales by Product', route: null },
        { name: 'Sales by Customer', route: null },
        { name: 'Sales Trend Analysis', route: null },
      ]
    },
    {
      title: 'Inventory Reports',
      icon: Package,
      color: 'blue',
      reports: [
        { name: 'Stock Level Report', route: null },
        { name: 'Low Stock Alert', route: null },
        { name: 'Inventory Valuation', route: null },
        { name: 'Movement History', route: null },
      ]
    },
    {
      title: 'Financial Reports',
      icon: DollarSign,
      color: 'green',
      reports: [
        { name: 'Profit & Loss', route: '/reports/profit-loss', adminOnly: true },
        { name: 'Cash Flow Statement', route: null },
        { name: 'Outstanding Payments', route: null },
        { name: 'Expense Analysis', route: null },
      ]
    },
    {
      title: 'Customer Reports',
      icon: Users,
      color: 'amber',
      reports: [
        { name: 'Customer Analytics', route: null },
        { name: 'Top Customers', route: null },
        { name: 'Customer Payment History', route: null },
        { name: 'Customer Returns', route: null },
      ]
    },
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      emerald: 'bg-emerald-100 text-emerald-600',
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      amber: 'bg-amber-100 text-amber-600'
    };
    return colors[color as keyof typeof colors] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Generate and view business reports</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.title} className="overflow-hidden">
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-lg ${getColorClasses(category.color)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">{category.title}</h2>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {category.reports.map((report) => {
                  const isLocked = report.adminOnly && !isAdmin;
                  const isClickable = !!report.route && !isLocked;

                  return (
                    <div
                      key={report.name}
                      onClick={() => isClickable && navigate(report.route!)}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors group ${
                        isClickable
                          ? 'bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-transparent cursor-pointer'
                          : isLocked
                          ? 'bg-gray-50 border border-transparent opacity-60 cursor-not-allowed'
                          : 'bg-gray-50 border border-transparent cursor-default'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isLocked
                          ? <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                          : <FileText className={`w-4 h-4 shrink-0 transition-colors ${isClickable ? 'text-gray-400 group-hover:text-blue-500' : 'text-gray-400'}`} />
                        }
                        <div>
                          <span className={`text-sm font-medium transition-colors ${
                            isClickable ? 'text-gray-700 group-hover:text-blue-700' : 'text-gray-700'
                          }`}>
                            {report.name}
                          </span>
                          {report.adminOnly && isAdmin && (
                            <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                              Live
                            </span>
                          )}
                          {isLocked && (
                            <span className="ml-2 text-xs text-gray-400">Admin only</span>
                          )}
                        </div>
                      </div>
                      {isClickable && (
                        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors opacity-0 group-hover:opacity-100" />
                      )}
                      {!isClickable && !isLocked && (
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" disabled>
                          Coming Soon
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-teal-100 rounded-lg">
            <BarChart3 className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Custom Reports</h2>
            <p className="text-sm text-gray-500">Build custom reports with filters and date ranges</p>
          </div>
        </div>
        <Button className="w-full md:w-auto" disabled>
          Coming Soon
        </Button>
      </Card>
    </div>
  );
}
