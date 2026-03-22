import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Plus, Search, TrendingDown, CreditCard } from 'lucide-react';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  payment_method: string;
  status: 'paid' | 'pending' | 'approved';
}

export default function Expenses() {
  const [searchTerm, setSearchTerm] = useState('');

  const mockExpenses: Expense[] = [
    {
      id: '1',
      category: 'Rent',
      description: 'Office rent - March 2024',
      amount: 45000,
      date: '2024-03-01',
      payment_method: 'Bank Transfer',
      status: 'paid'
    },
    {
      id: '2',
      category: 'Utilities',
      description: 'Electricity bill',
      amount: 8500,
      date: '2024-03-15',
      payment_method: 'Cash',
      status: 'paid'
    },
    {
      id: '3',
      category: 'Marketing',
      description: 'Facebook Ads campaign',
      amount: 12000,
      date: '2024-03-14',
      payment_method: 'Credit Card',
      status: 'pending'
    },
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      paid: 'emerald',
      pending: 'amber',
      approved: 'blue'
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expenses</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage business expenses</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total This Month</p>
              <p className="text-3xl font-bold mt-2 text-red-600">৳ 245K</p>
              <p className="text-xs text-gray-500 mt-1">32 transactions</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="text-3xl font-bold mt-2 text-amber-600">৳ 34K</p>
              <p className="text-xs text-gray-500 mt-1">5 items</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <CreditCard className="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Last Month</p>
              <p className="text-3xl font-bold mt-2 text-gray-600">৳ 289K</p>
              <p className="text-xs text-emerald-600 mt-1">-15% vs this month</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <TrendingDown className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue focus:border-transparent"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{expense.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">{expense.description}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{expense.date}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      ৳ {expense.amount.toLocaleString('en-BD')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{expense.payment_method}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusColor(expense.status) as any}>
                      {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
