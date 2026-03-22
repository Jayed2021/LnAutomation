import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Wallet, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface Collection {
  id: string;
  order_id: string;
  customer: string;
  amount: number;
  due_amount: number;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  due_date: string;
}

export default function Collection() {
  const mockCollections: Collection[] = [
    {
      id: '1',
      order_id: 'ORD-2024-1234',
      customer: 'Abdul Karim',
      amount: 12500,
      due_amount: 0,
      status: 'paid',
      due_date: '2024-03-10'
    },
    {
      id: '2',
      order_id: 'ORD-2024-1235',
      customer: 'Fatima Rahman',
      amount: 8900,
      due_amount: 4450,
      status: 'partial',
      due_date: '2024-03-15'
    },
    {
      id: '3',
      order_id: 'ORD-2024-1200',
      customer: 'Mohammad Ali',
      amount: 5600,
      due_amount: 5600,
      status: 'overdue',
      due_date: '2024-03-05'
    },
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      paid: 'emerald',
      partial: 'amber',
      pending: 'blue',
      overdue: 'red'
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Payment Collection</h1>
        <p className="text-sm text-gray-500 mt-1">Track customer payments and outstanding dues</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Collected</p>
              <p className="text-3xl font-bold mt-2 text-emerald-600">৳ 2.4M</p>
              <p className="text-xs text-gray-500 mt-1">This month</p>
            </div>
            <div className="p-3 bg-emerald-100 rounded-lg">
              <Wallet className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-3xl font-bold mt-2 text-blue-600">৳ 456K</p>
              <p className="text-xs text-gray-500 mt-1">32 invoices</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-3xl font-bold mt-2 text-red-600">৳ 89K</p>
              <p className="text-xs text-gray-500 mt-1">8 invoices</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Collection Rate</p>
              <p className="text-3xl font-bold mt-2 text-gray-900">84%</p>
              <p className="text-xs text-emerald-600 mt-1">+5% from last month</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <CheckCircle className="w-8 h-8 text-gray-600" />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Collections</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
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
              {mockCollections.map((collection) => (
                <tr key={collection.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{collection.order_id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">{collection.customer}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      ৳ {collection.amount.toLocaleString('en-BD')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${collection.due_amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      ৳ {collection.due_amount.toLocaleString('en-BD')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{collection.due_date}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusColor(collection.status) as any}>
                      {collection.status.charAt(0).toUpperCase() + collection.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button variant="ghost" size="sm">
                      {collection.status === 'paid' ? 'View' : 'Record Payment'}
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
