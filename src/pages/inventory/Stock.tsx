import { useState } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Search, Package, AlertTriangle } from 'lucide-react';

interface StockItem {
  id: string;
  sku: string;
  product_name: string;
  category: string;
  quantity: number;
  min_stock: number;
  location: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export default function Stock() {
  const [searchTerm, setSearchTerm] = useState('');

  const mockStock: StockItem[] = [
    {
      id: '1',
      sku: 'RB-001-BLK',
      product_name: 'Ray-Ban Aviator Black',
      category: 'Sunglasses',
      quantity: 45,
      min_stock: 20,
      location: 'A-12',
      status: 'in_stock'
    },
    {
      id: '2',
      sku: 'OKL-005-GRY',
      product_name: 'Oakley Holbrook Grey',
      category: 'Sunglasses',
      quantity: 8,
      min_stock: 15,
      location: 'B-05',
      status: 'low_stock'
    },
    {
      id: '3',
      sku: 'PR-010-TOR',
      product_name: 'Prada Tortoise Frame',
      category: 'Eyeglasses',
      quantity: 0,
      min_stock: 10,
      location: 'C-03',
      status: 'out_of_stock'
    },
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      in_stock: 'emerald',
      low_stock: 'amber',
      out_of_stock: 'red'
    };
    return colors[status as keyof typeof colors] || 'gray';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Stock Levels</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor inventory across all locations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total SKUs</p>
              <p className="text-3xl font-bold mt-2 text-gray-900">234</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Low Stock Items</p>
              <p className="text-3xl font-bold mt-2 text-amber-600">18</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Out of Stock</p>
              <p className="text-3xl font-bold mt-2 text-red-600">5</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <Package className="w-8 h-8 text-red-600" />
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
              placeholder="Search by SKU or product name..."
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
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min Stock
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
              {mockStock.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{item.sku}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900">{item.product_name}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{item.category}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{item.location}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${item.quantity < item.min_stock ? 'text-red-600' : 'text-gray-900'}`}>
                      {item.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-500">{item.min_stock}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusColor(item.status) as any}>
                      {item.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button variant="ghost" size="sm">
                      Adjust
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
