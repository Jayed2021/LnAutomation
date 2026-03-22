import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Users, UserPlus, Eye, Phone, Mail, MapPin, TrendingUp, CheckCircle2, XCircle, Search, Plus, Glasses, ShoppingBag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

// ─── Mock Customer Data ───────────────────────────────────────────────────────

interface PrescriptionData {
  order_id: string;
  date: string;
  od_sphere: string;
  od_cylinder: string;
  od_axis: string;
  os_sphere: string;
  os_cylinder: string;
  os_axis: string;
  pd: string;
  lens_type: string;
}

interface Customer {
  customer_id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  area: string;
  customer_type: 'new' | 'returning';
  first_order_date: string;
  total_orders: number;
  successful_deliveries: number;
  failed_deliveries: number;
  cancelled_orders: number;
  total_spent: number;
  avg_order_value: number;
  delivery_success_rate: number;
  prescription_data?: PrescriptionData[];
  notes?: string;
}

const customers: Customer[] = [
  {
    customer_id: 'CUST-001',
    name: 'Anika Rahman',
    phone: '+880 1712 345678',
    email: 'anika.rahman@email.com',
    address: 'House 45, Road 12, Block C',
    city: 'Dhaka',
    area: 'Banani',
    customer_type: 'returning',
    first_order_date: '2025-08-15',
    total_orders: 8,
    successful_deliveries: 7,
    failed_deliveries: 1,
    cancelled_orders: 0,
    total_spent: 18500,
    avg_order_value: 2312,
    delivery_success_rate: 87.5,
    prescription_data: [
      {
        order_id: 'ORD-2026-160',
        date: '2026-02-23',
        od_sphere: '-1.50',
        od_cylinder: '-0.50',
        od_axis: '180',
        os_sphere: '-1.75',
        os_cylinder: '-0.25',
        os_axis: '175',
        pd: '62',
        lens_type: 'Blue Light Block 1.56 AR',
      },
      {
        order_id: 'ORD-2025-892',
        date: '2025-11-10',
        od_sphere: '-1.25',
        od_cylinder: '-0.50',
        od_axis: '180',
        os_sphere: '-1.50',
        os_cylinder: '-0.25',
        os_axis: '175',
        pd: '62',
        lens_type: 'CR-39 Anti-Reflective 1.56',
      },
    ],
    notes: 'Prefers delivery between 2-5 PM. Reliable customer.',
  },
  {
    customer_id: 'CUST-002',
    name: 'Rafiq Ahmed',
    phone: '+880 1812 456789',
    email: 'rafiq.ahmed@email.com',
    address: '78 Green Road',
    city: 'Dhaka',
    area: 'Dhanmondi',
    customer_type: 'returning',
    first_order_date: '2025-09-22',
    total_orders: 5,
    successful_deliveries: 5,
    failed_deliveries: 0,
    cancelled_orders: 0,
    total_spent: 12400,
    avg_order_value: 2480,
    delivery_success_rate: 100,
    notes: 'VIP customer - always orders premium products.',
  },
  {
    customer_id: 'CUST-003',
    name: 'Nusrat Jahan',
    phone: '+880 1911 567890',
    email: 'nusrat.jahan@email.com',
    address: 'Flat 3B, Skyline Apartments',
    city: 'Dhaka',
    area: 'Gulshan',
    customer_type: 'returning',
    first_order_date: '2025-07-10',
    total_orders: 12,
    successful_deliveries: 10,
    failed_deliveries: 1,
    cancelled_orders: 1,
    total_spent: 28900,
    avg_order_value: 2408,
    delivery_success_rate: 83.3,
    prescription_data: [
      {
        order_id: 'ORD-2026-178',
        date: '2026-02-28',
        od_sphere: '-3.00',
        od_cylinder: '-1.00',
        od_axis: '180',
        os_sphere: '-3.25',
        os_cylinder: '-0.75',
        os_axis: '175',
        pd: '66',
        lens_type: 'Blue Light Block 1.67 AR (High Index)',
      },
    ],
    notes: 'High prescription power - always use 1.67 index lenses.',
  },
  {
    customer_id: 'CUST-004',
    name: 'Karim Hossain',
    phone: '+880 1713 678901',
    email: 'karim.h@email.com',
    address: '12 Mirpur Road',
    city: 'Dhaka',
    area: 'Mirpur',
    customer_type: 'returning',
    first_order_date: '2025-10-05',
    total_orders: 3,
    successful_deliveries: 2,
    failed_deliveries: 1,
    cancelled_orders: 0,
    total_spent: 4200,
    avg_order_value: 1400,
    delivery_success_rate: 66.7,
    notes: 'Difficult to reach. Call multiple times before dispatch.',
  },
  {
    customer_id: 'CUST-005',
    name: 'Fatima Begum',
    phone: '+880 1821 789012',
    email: 'fatima.begum@email.com',
    address: 'House 89, Sector 7',
    city: 'Dhaka',
    area: 'Uttara',
    customer_type: 'new',
    first_order_date: '2026-02-28',
    total_orders: 1,
    successful_deliveries: 0,
    failed_deliveries: 0,
    cancelled_orders: 0,
    total_spent: 1200,
    avg_order_value: 1200,
    delivery_success_rate: 0,
    notes: 'First time customer - awaiting delivery.',
  },
  {
    customer_id: 'CUST-006',
    name: 'Abdullah Khan',
    phone: '+880 1615 890123',
    email: 'abdullah.khan@email.com',
    address: '45 Elephant Road',
    city: 'Dhaka',
    area: 'Hatirpool',
    customer_type: 'returning',
    first_order_date: '2025-06-18',
    total_orders: 15,
    successful_deliveries: 14,
    failed_deliveries: 0,
    cancelled_orders: 1,
    total_spent: 36800,
    avg_order_value: 2453,
    delivery_success_rate: 93.3,
    prescription_data: [
      {
        order_id: 'ORD-2026-184',
        date: '2026-03-02',
        od_sphere: '+1.25',
        od_cylinder: '0.00',
        od_axis: '-',
        os_sphere: '+1.50',
        os_cylinder: '0.00',
        os_axis: '-',
        pd: '62',
        lens_type: 'CR-39 Anti-Reflective 1.56',
      },
      {
        order_id: 'ORD-2025-956',
        date: '2025-12-15',
        od_sphere: '+1.00',
        od_cylinder: '0.00',
        od_axis: '-',
        os_sphere: '+1.25',
        os_cylinder: '0.00',
        os_axis: '-',
        pd: '62',
        lens_type: 'CR-39 Anti-Reflective 1.56',
      },
    ],
    notes: 'Excellent customer. Refers friends frequently.',
  },
  {
    customer_id: 'CUST-007',
    name: 'Sultana Akter',
    phone: '+880 1744 901234',
    email: 'sultana.akter@email.com',
    address: 'Plot 23, Main Road',
    city: 'Chittagong',
    area: 'Agrabad',
    customer_type: 'returning',
    first_order_date: '2025-11-20',
    total_orders: 4,
    successful_deliveries: 4,
    failed_deliveries: 0,
    cancelled_orders: 0,
    total_spent: 9600,
    avg_order_value: 2400,
    delivery_success_rate: 100,
    notes: 'Chittagong customer - reliable.',
  },
  {
    customer_id: 'CUST-008',
    name: 'Mahmud Rahman',
    phone: '+880 1511 012345',
    email: '',
    address: '156 CDA Avenue',
    city: 'Chittagong',
    area: 'Nasirabad',
    customer_type: 'new',
    first_order_date: '2026-03-01',
    total_orders: 1,
    successful_deliveries: 1,
    failed_deliveries: 0,
    cancelled_orders: 0,
    total_spent: 1800,
    avg_order_value: 1800,
    delivery_success_rate: 100,
    notes: 'No email provided.',
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

const fmt = (n: number) => '৳' + n.toLocaleString();

// ─── KPI Card Component ───────────────────────────────────────────────────────

function KPICard({ title, value, sub, icon: Icon, color }: {
  title: string; value: string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-gray-500 mb-1">{title}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
          </div>
          <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-').replace('600', '100')}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Customer Details Modal ───────────────────────────────────────────────────

function CustomerDetailsModal({ customer }: { customer: Customer }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Eye className="w-4 h-4" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Customer Details</DialogTitle>
          <DialogDescription>
            Complete information for {customer.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-xs text-gray-500">Customer ID</p>
                <p className="font-medium">{customer.customer_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Name</p>
                <p className="font-medium">{customer.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium">{customer.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium">{customer.email || 'Not provided'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Address</p>
                <p className="font-medium">{customer.address}, {customer.area}, {customer.city}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Customer Type</p>
                <Badge className={customer.customer_type === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                  {customer.customer_type === 'new' ? 'New Customer' : 'Returning Customer'}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">First Order Date</p>
                <p className="font-medium">{new Date(customer.first_order_date).toLocaleDateString('en-GB')}</p>
              </div>
            </div>
          </div>

          {/* Order Statistics */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Order Statistics
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500">Total Orders</p>
                  <p className="text-xl font-bold text-blue-600">{customer.total_orders}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500">Total Spent</p>
                  <p className="text-xl font-bold text-green-600">{fmt(customer.total_spent)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500">Avg Order Value</p>
                  <p className="text-xl font-bold text-purple-600">{fmt(customer.avg_order_value)}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Delivery Performance */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Delivery Performance
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500">Success Rate</p>
                  <p className={`text-xl font-bold ${customer.delivery_success_rate >= 80 ? 'text-green-600' : 'text-orange-600'}`}>
                    {customer.delivery_success_rate.toFixed(1)}%
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500">Successful</p>
                  <p className="text-xl font-bold text-green-600">{customer.successful_deliveries}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500">Failed</p>
                  <p className="text-xl font-bold text-red-600">{customer.failed_deliveries}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 pb-3">
                  <p className="text-xs text-gray-500">Cancelled</p>
                  <p className="text-xl font-bold text-gray-600">{customer.cancelled_orders}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Prescription Data */}
          {customer.prescription_data && customer.prescription_data.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Glasses className="w-4 h-4" />
                Prescription History
              </h3>
              <div className="space-y-3">
                {customer.prescription_data.map((rx, index) => (
                  <Card key={index} className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-4 pb-3">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm font-medium text-blue-900">{rx.order_id}</p>
                          <p className="text-xs text-blue-600">{new Date(rx.date).toLocaleDateString('en-GB')}</p>
                        </div>
                        <Badge className="bg-blue-200 text-blue-800">{rx.lens_type}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2 rounded">
                          <p className="font-medium text-gray-700 mb-1">Right Eye (OD)</p>
                          <p className="text-gray-600">SPH: {rx.od_sphere} | CYL: {rx.od_cylinder} | AXIS: {rx.od_axis}</p>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <p className="font-medium text-gray-700 mb-1">Left Eye (OS)</p>
                          <p className="text-gray-600">SPH: {rx.os_sphere} | CYL: {rx.os_cylinder} | AXIS: {rx.os_axis}</p>
                        </div>
                      </div>
                      <div className="mt-2 bg-white p-2 rounded text-xs">
                        <span className="font-medium text-gray-700">PD: </span>
                        <span className="text-gray-600">{rx.pd}mm</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {customer.notes && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Notes</h3>
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <p className="text-sm text-gray-700">{customer.notes}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add Customer Modal ───────────────────────────────────────────────────────

function AddCustomerModal() {
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In real implementation, this would save to database
    setOpen(false);
    alert('Customer added successfully!');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Add New Customer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Customer</DialogTitle>
          <DialogDescription>
            Create a new customer record in the system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" placeholder="Enter customer name" required />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" type="tel" placeholder="+880 1712 345678" required />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="customer@email.com" />
            </div>

            <div className="col-span-2">
              <Label htmlFor="address">Address *</Label>
              <Input id="address" placeholder="House/Flat, Road, Block" required />
            </div>

            <div>
              <Label htmlFor="area">Area *</Label>
              <Input id="area" placeholder="e.g., Banani, Gulshan" required />
            </div>

            <div>
              <Label htmlFor="city">City *</Label>
              <Select defaultValue="dhaka">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dhaka">Dhaka</SelectItem>
                  <SelectItem value="chittagong">Chittagong</SelectItem>
                  <SelectItem value="sylhet">Sylhet</SelectItem>
                  <SelectItem value="rajshahi">Rajshahi</SelectItem>
                  <SelectItem value="khulna">Khulna</SelectItem>
                  <SelectItem value="barisal">Barisal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Any special instructions or notes about the customer" rows={3} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Add Customer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Customer Reports Component ──────────────────────────────────────────

export function CustomerReports() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');

  // Calculate statistics
  const totalCustomers = customers.length;
  const newCustomers = customers.filter(c => c.customer_type === 'new').length;
  const returningCustomers = customers.filter(c => c.customer_type === 'returning').length;
  const customersWithPrescriptions = customers.filter(c => c.prescription_data && c.prescription_data.length > 0).length;
  const avgDeliverySuccessRate = (customers.reduce((sum, c) => sum + c.delivery_success_rate, 0) / totalCustomers).toFixed(1);
  const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
  const avgLifetimeValue = totalRevenue / totalCustomers;

  // Filter customers
  const filteredCustomers = customers.filter((customer) => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customer_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = customerTypeFilter === 'all' || customer.customer_type === customerTypeFilter;
    
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard 
          title="Total Customers" 
          value={totalCustomers.toString()} 
          sub={`${newCustomers} new, ${returningCustomers} returning`}
          icon={Users} 
          color="text-blue-600" 
        />
        <KPICard 
          title="Avg Delivery Success" 
          value={`${avgDeliverySuccessRate}%`} 
          sub="Across all customers"
          icon={CheckCircle2} 
          color="text-green-600" 
        />
        <KPICard 
          title="With Prescriptions" 
          value={customersWithPrescriptions.toString()} 
          sub={`${((customersWithPrescriptions/totalCustomers)*100).toFixed(0)}% of customers`}
          icon={Glasses} 
          color="text-purple-600" 
        />
        <KPICard 
          title="Avg Lifetime Value" 
          value={fmt(Math.round(avgLifetimeValue))} 
          sub={`${fmt(totalRevenue)} total`}
          icon={TrendingUp} 
          color="text-orange-600" 
        />
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Database</CardTitle>
            <AddCustomerModal />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, phone, email, or customer ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Filter by Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Customers</SelectItem>
                <SelectItem value="new">New Customers</SelectItem>
                <SelectItem value="returning">Returning Customers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customer Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Orders</TableHead>
                <TableHead className="text-right">Total Spent</TableHead>
                <TableHead className="text-right">Success Rate</TableHead>
                <TableHead>Prescription</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                    No customers found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow 
                    key={customer.customer_id} 
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/customers/${customer.customer_id}`)}
                  >
                    <TableCell className="font-medium">{customer.customer_id}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{customer.name}</p>
                        <p className="text-xs text-gray-500">Since {new Date(customer.first_order_date).toLocaleDateString('en-GB')}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          {customer.phone}
                        </p>
                        {customer.email && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-gray-400" />
                            {customer.email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-1">
                        <MapPin className="w-3 h-3 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm">{customer.area}</p>
                          <p className="text-xs text-gray-500">{customer.city}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={customer.customer_type === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                        {customer.customer_type === 'new' ? 'New' : 'Returning'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{customer.total_orders}</TableCell>
                    <TableCell className="text-right font-medium text-green-700">{fmt(customer.total_spent)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className={`font-medium ${customer.delivery_success_rate >= 80 ? 'text-green-600' : customer.delivery_success_rate >= 60 ? 'text-orange-600' : 'text-red-600'}`}>
                          {customer.delivery_success_rate.toFixed(0)}%
                        </span>
                        {customer.delivery_success_rate >= 80 ? (
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-orange-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {customer.prescription_data && customer.prescription_data.length > 0 ? (
                        <Badge className="bg-purple-100 text-purple-700 gap-1">
                          <Glasses className="w-3 h-3" />
                          {customer.prescription_data.length}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">None</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <CustomerDetailsModal customer={customer} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-blue-900">Customer Management</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p><strong>New vs Returning:</strong> The system automatically identifies returning customers by matching phone numbers or email addresses from WooCommerce orders.</p>
          <p><strong>Prescription Data:</strong> Lens prescriptions are automatically saved for customers who order prescription lenses, making it easier for CS team to assist with reorders.</p>
          <p><strong>Delivery Success Rate:</strong> Calculated based on the ratio of successful deliveries to total orders. Helps identify reliable vs difficult-to-reach customers.</p>
        </CardContent>
      </Card>
    </div>
  );
}
