import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import { ArrowLeft, CreditCard as Edit2, Save, X, Plus, Trash2, Phone, Mail, MapPin, Calendar, ShoppingBag, TrendingUp, CheckCircle2, XCircle, Glasses } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { toast } from 'sonner';
import { customers as mockCustomers, type Customer, type PrescriptionData } from '../../data/customersData';

export function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null);
  
  const [editingPrescription, setEditingPrescription] = useState<PrescriptionData | null>(null);
  const [showPrescriptionDialog, setShowPrescriptionDialog] = useState(false);

  useEffect(() => {
    // In real app, fetch customer data from API
    const foundCustomer = mockCustomers.find(c => c.customer_id === id);
    if (foundCustomer) {
      setCustomer(foundCustomer);
      setEditedCustomer(foundCustomer);
    }
  }, [id]);

  if (!customer || !editedCustomer) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-gray-500">Customer not found</p>
      </div>
    );
  }

  const handleSaveCustomerInfo = () => {
    // In real app, save to API/database
    setCustomer(editedCustomer);
    setIsEditingInfo(false);
    toast.success('Customer information updated successfully');
  };

  const handleCancelEdit = () => {
    setEditedCustomer(customer);
    setIsEditingInfo(false);
  };

  const handleAddPrescription = () => {
    setEditingPrescription({
      id: `RX-${Date.now()}`,
      order_id: '',
      date: new Date().toISOString().split('T')[0],
      od_sphere: '',
      od_cylinder: '',
      od_axis: '',
      os_sphere: '',
      os_cylinder: '',
      os_axis: '',
      pd: '',
      lens_type: '',
    });
    setShowPrescriptionDialog(true);
  };

  const handleEditPrescription = (prescription: PrescriptionData) => {
    setEditingPrescription(prescription);
    setShowPrescriptionDialog(true);
  };

  const handleSavePrescription = () => {
    if (!editingPrescription) return;

    const updatedPrescriptions = customer.prescription_data || [];
    const existingIndex = updatedPrescriptions.findIndex(p => p.id === editingPrescription.id);

    if (existingIndex >= 0) {
      updatedPrescriptions[existingIndex] = editingPrescription;
    } else {
      updatedPrescriptions.push(editingPrescription);
    }

    const updatedCustomer = {
      ...customer,
      prescription_data: updatedPrescriptions,
    };

    setCustomer(updatedCustomer);
    setEditedCustomer(updatedCustomer);
    setShowPrescriptionDialog(false);
    setEditingPrescription(null);
    toast.success('Prescription saved successfully');
  };

  const handleDeletePrescription = (prescriptionId: string) => {
    const updatedPrescriptions = (customer.prescription_data || []).filter(p => p.id !== prescriptionId);
    const updatedCustomer = {
      ...customer,
      prescription_data: updatedPrescriptions,
    };

    setCustomer(updatedCustomer);
    setEditedCustomer(updatedCustomer);
    toast.success('Prescription deleted');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/customers')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">{customer.name}</h1>
            <p className="text-gray-600 mt-1">{customer.customer_id}</p>
          </div>
          <Badge variant={customer.customer_type === 'returning' ? 'default' : 'secondary'}>
            {customer.customer_type === 'returning' ? 'Returning Customer' : 'New Customer'}
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <ShoppingBag className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{customer.total_orders}</div>
            <p className="text-xs text-gray-500 mt-1">
              Since {new Date(customer.first_order_date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
            <TrendingUp className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">৳{customer.total_spent.toLocaleString()}</div>
            <p className="text-xs text-gray-500 mt-1">
              Avg: ৳{customer.avg_order_value.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Delivery Success</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{customer.delivery_success_rate.toFixed(1)}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {customer.successful_deliveries} of {customer.total_orders} orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Failed/Cancelled</CardTitle>
            <XCircle className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{customer.failed_deliveries + customer.cancelled_orders}</div>
            <p className="text-xs text-gray-500 mt-1">
              {customer.failed_deliveries} failed, {customer.cancelled_orders} cancelled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Information */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Customer Information</CardTitle>
          {!isEditingInfo ? (
            <Button onClick={() => setIsEditingInfo(true)} size="sm">
              <Edit2 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSaveCustomerInfo} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button onClick={handleCancelEdit} variant="outline" size="sm">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Contact Details</h3>
              
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                {isEditingInfo ? (
                  <Input
                    id="name"
                    value={editedCustomer.name}
                    onChange={(e) => setEditedCustomer({ ...editedCustomer, name: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    {customer.name}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                {isEditingInfo ? (
                  <Input
                    id="phone"
                    value={editedCustomer.phone}
                    onChange={(e) => setEditedCustomer({ ...editedCustomer, phone: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <Phone className="w-4 h-4 text-gray-400" />
                    {customer.phone}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                {isEditingInfo ? (
                  <Input
                    id="email"
                    type="email"
                    value={editedCustomer.email}
                    onChange={(e) => setEditedCustomer({ ...editedCustomer, email: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <Mail className="w-4 h-4 text-gray-400" />
                    {customer.email}
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Address</h3>
              
              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                {isEditingInfo ? (
                  <Input
                    id="address"
                    value={editedCustomer.address}
                    onChange={(e) => setEditedCustomer({ ...editedCustomer, address: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-900">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {customer.address}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="area">Area</Label>
                  {isEditingInfo ? (
                    <Input
                      id="area"
                      value={editedCustomer.area}
                      onChange={(e) => setEditedCustomer({ ...editedCustomer, area: e.target.value })}
                    />
                  ) : (
                    <div className="text-gray-900">{customer.area}</div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  {isEditingInfo ? (
                    <Input
                      id="city"
                      value={editedCustomer.city}
                      onChange={(e) => setEditedCustomer({ ...editedCustomer, city: e.target.value })}
                    />
                  ) : (
                    <div className="text-gray-900">{customer.city}</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2 pt-4 border-t">
            <Label htmlFor="notes">Customer Notes</Label>
            {isEditingInfo ? (
              <Textarea
                id="notes"
                value={editedCustomer.notes || ''}
                onChange={(e) => setEditedCustomer({ ...editedCustomer, notes: e.target.value })}
                rows={3}
                placeholder="Add notes about this customer..."
              />
            ) : (
              <div className="text-gray-900 p-3 bg-gray-50 rounded-md min-h-[80px]">
                {customer.notes || 'No notes added'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Prescription History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Glasses className="w-5 h-5" />
            Prescription History
          </CardTitle>
          <Button onClick={handleAddPrescription} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Prescription
          </Button>
        </CardHeader>
        <CardContent>
          {customer.prescription_data && customer.prescription_data.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>OD (Right)</TableHead>
                  <TableHead>OS (Left)</TableHead>
                  <TableHead>PD</TableHead>
                  <TableHead>Lens Type</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.prescription_data.map((rx) => (
                  <TableRow key={rx.id}>
                    <TableCell>{new Date(rx.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Link to={`/fulfilment/orders/${rx.order_id}`} className="text-blue-600 hover:underline">
                        {rx.order_id}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      SPH {rx.od_sphere} CYL {rx.od_cylinder} AX {rx.od_axis}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      SPH {rx.os_sphere} CYL {rx.os_cylinder} AX {rx.os_axis}
                    </TableCell>
                    <TableCell>{rx.pd}</TableCell>
                    <TableCell>{rx.lens_type}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPrescription(rx)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => rx.id && handleDeletePrescription(rx.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Glasses className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No prescription data available</p>
              <Button onClick={handleAddPrescription} variant="outline" className="mt-4">
                Add First Prescription
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescription Dialog */}
      <Dialog open={showPrescriptionDialog} onOpenChange={setShowPrescriptionDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrescription?.order_id ? 'Edit Prescription' : 'Add New Prescription'}
            </DialogTitle>
            <DialogDescription>
              Enter the prescription details for this customer
            </DialogDescription>
          </DialogHeader>

          {editingPrescription && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="order_id">Order ID</Label>
                  <Input
                    id="order_id"
                    value={editingPrescription.order_id}
                    onChange={(e) => setEditingPrescription({ ...editingPrescription, order_id: e.target.value })}
                    placeholder="ORD-2026-XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={editingPrescription.date}
                    onChange={(e) => setEditingPrescription({ ...editingPrescription, date: e.target.value })}
                  />
                </div>
              </div>

              {/* Right Eye (OD) */}
              <div className="space-y-2">
                <h3 className="font-medium">Right Eye (OD)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="od_sphere">Sphere (SPH)</Label>
                    <Input
                      id="od_sphere"
                      value={editingPrescription.od_sphere}
                      onChange={(e) => setEditingPrescription({ ...editingPrescription, od_sphere: e.target.value })}
                      placeholder="-1.50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="od_cylinder">Cylinder (CYL)</Label>
                    <Input
                      id="od_cylinder"
                      value={editingPrescription.od_cylinder}
                      onChange={(e) => setEditingPrescription({ ...editingPrescription, od_cylinder: e.target.value })}
                      placeholder="-0.50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="od_axis">Axis</Label>
                    <Input
                      id="od_axis"
                      value={editingPrescription.od_axis}
                      onChange={(e) => setEditingPrescription({ ...editingPrescription, od_axis: e.target.value })}
                      placeholder="180"
                    />
                  </div>
                </div>
              </div>

              {/* Left Eye (OS) */}
              <div className="space-y-2">
                <h3 className="font-medium">Left Eye (OS)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="os_sphere">Sphere (SPH)</Label>
                    <Input
                      id="os_sphere"
                      value={editingPrescription.os_sphere}
                      onChange={(e) => setEditingPrescription({ ...editingPrescription, os_sphere: e.target.value })}
                      placeholder="-1.75"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="os_cylinder">Cylinder (CYL)</Label>
                    <Input
                      id="os_cylinder"
                      value={editingPrescription.os_cylinder}
                      onChange={(e) => setEditingPrescription({ ...editingPrescription, os_cylinder: e.target.value })}
                      placeholder="-0.25"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="os_axis">Axis</Label>
                    <Input
                      id="os_axis"
                      value={editingPrescription.os_axis}
                      onChange={(e) => setEditingPrescription({ ...editingPrescription, os_axis: e.target.value })}
                      placeholder="175"
                    />
                  </div>
                </div>
              </div>

              {/* PD & Lens Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pd">Pupillary Distance (PD)</Label>
                  <Input
                    id="pd"
                    value={editingPrescription.pd}
                    onChange={(e) => setEditingPrescription({ ...editingPrescription, pd: e.target.value })}
                    placeholder="62"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lens_type">Lens Type</Label>
                  <Input
                    id="lens_type"
                    value={editingPrescription.lens_type}
                    onChange={(e) => setEditingPrescription({ ...editingPrescription, lens_type: e.target.value })}
                    placeholder="Blue Light Block 1.56 AR"
                  />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPrescriptionDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrescription}>
              Save Prescription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
