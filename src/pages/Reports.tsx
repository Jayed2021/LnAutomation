import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { BarChart3, TrendingUp, Package, DollarSign, Users, FileText } from 'lucide-react';

export default function Reports() {
  const reportCategories = [
    {
      title: 'Sales Reports',
      icon: TrendingUp,
      color: 'emerald',
      reports: [
        'Daily Sales Summary',
        'Sales by Product',
        'Sales by Customer',
        'Sales Trend Analysis'
      ]
    },
    {
      title: 'Inventory Reports',
      icon: Package,
      color: 'blue',
      reports: [
        'Stock Level Report',
        'Low Stock Alert',
        'Inventory Valuation',
        'Movement History'
      ]
    },
    {
      title: 'Financial Reports',
      icon: DollarSign,
      color: 'green',
      reports: [
        'Profit & Loss',
        'Cash Flow Statement',
        'Outstanding Payments',
        'Expense Analysis'
      ]
    },
    {
      title: 'Customer Reports',
      icon: Users,
      color: 'amber',
      reports: [
        'Customer Analytics',
        'Top Customers',
        'Customer Payment History',
        'Customer Returns'
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
                {category.reports.map((report) => (
                  <div
                    key={report}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                        {report}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      Generate
                    </Button>
                  </div>
                ))}
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
        <Button className="w-full md:w-auto">
          Create Custom Report
        </Button>
      </Card>
    </div>
  );
}
