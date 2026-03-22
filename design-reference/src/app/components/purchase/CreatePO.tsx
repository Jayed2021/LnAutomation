import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Plus, Trash2, ArrowLeft, Download, AlertCircle, TrendingUp, TrendingDown, Upload, X, Check } from "lucide-react";
import { skus, suppliers, purchaseOrders } from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

interface POLineItem {
  id: string;
  sku: string;
  quantity: number;
  unit_cost: number;
  currency: string;
  lot_suffix?: string; // For unique barcode generation
}

interface Payment {
  id: string;
  amount: number;
  payment_slip?: File | string;
  date: string;
}

interface ChangeLog {
  id: string;
  timestamp: string;
  description: string;
}

export function CreatePO() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const existingPO = isEditing ? purchaseOrders.find(p => p.po_id === id) : null;

  const [selectedSupplier, setSelectedSupplier] = useState(existingPO?.supplier || "");
  const [shipmentName, setShipmentName] = useState("");
  const [fxRateUsdToCny, setFxRateUsdToCny] = useState("7.25");
  const [fxRateCnyToBdt, setFxRateCnyToBdt] = useState("15.17");
  const [fxRateUsdToBdt, setFxRateUsdToBdt] = useState("110");
  const [fxRateDate, setFxRateDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedArrival, setEstimatedArrival] = useState(existingPO?.estimated_arrival || "");
  const [items, setItems] = useState<POLineItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [changeLogs, setChangeLogs] = useState<ChangeLog[]>([]);
  const [paymentComplete, setPaymentComplete] = useState(false);

  // When supplier changes, populate items
  const handleSupplierChange = (supplierId: string) => {
    setSelectedSupplier(supplierId);
    
    const supplierProducts = skus.filter(sku =>
      sku.suppliers.some(s => s.supplier_id === supplierId)
    );

    const newItems: POLineItem[] = supplierProducts.map((sku, index) => {
      const supplierInfo = sku.suppliers.find(s => s.supplier_id === supplierId);
      return {
        id: `${Date.now()}-${index}`,
        sku: sku.sku,
        quantity: 0,
        unit_cost: supplierInfo?.unit_cost || 0,
        currency: supplierInfo?.currency || 'USD',
        lot_suffix: `${String(index + 1).padStart(3, '0')}`, // e.g., 001, 002
      };
    });

    setItems(newItems);
    logChange('Supplier selected and items populated');
  };

  const addItem = () => {
    setItems([...items, { 
      id: Date.now().toString(), 
      sku: '', 
      quantity: 0, 
      unit_cost: 0,
      currency: 'USD',
      lot_suffix: String(items.length + 1).padStart(3, '0'),
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    logChange('Item removed from PO');
  };

  const updateItem = (id: string, field: keyof POLineItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (field === 'sku' && selectedSupplier) {
          const skuData = skus.find(s => s.sku === value);
          const supplierInfo = skuData?.suppliers.find(s => s.supplier_id === selectedSupplier);
          return { 
            ...item, 
            sku: value,
            unit_cost: supplierInfo?.unit_cost || item.unit_cost,
            currency: supplierInfo?.currency || item.currency,
          };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const calculateTotalInCurrency = (currency: 'USD' | 'CNY' | 'BDT') => {
    return items.reduce((sum, item) => {
      let costInCurrency = 0;
      
      if (item.currency === 'USD') {
        if (currency === 'USD') costInCurrency = item.quantity * item.unit_cost;
        else if (currency === 'CNY') costInCurrency = item.quantity * item.unit_cost * parseFloat(fxRateUsdToCny);
        else costInCurrency = item.quantity * item.unit_cost * parseFloat(fxRateUsdToBdt);
      } else if (item.currency === 'CNY') {
        if (currency === 'USD') costInCurrency = item.quantity * item.unit_cost / parseFloat(fxRateUsdToCny);
        else if (currency === 'CNY') costInCurrency = item.quantity * item.unit_cost;
        else costInCurrency = item.quantity * item.unit_cost * parseFloat(fxRateCnyToBdt);
      }
      
      return sum + (isNaN(costInCurrency) ? 0 : costInCurrency);
    }, 0);
  };

  const addPayment = () => {
    const newPayment: Payment = {
      id: Date.now().toString(),
      amount: 0,
      date: new Date().toISOString().split('T')[0],
    };
    setPayments([...payments, newPayment]);
    logChange('Payment entry added');
  };

  const removePayment = (id: string) => {
    setPayments(payments.filter(p => p.id !== id));
    logChange('Payment entry removed');
  };

  const updatePayment = (id: string, field: keyof Payment, value: any) => {
    setPayments(payments.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const handleFileUpload = (paymentId: string, file: File) => {
    updatePayment(paymentId, 'payment_slip', file);
    logChange(`Payment slip uploaded for payment ${paymentId}`);
  };

  const totalPayments = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalCostBDT = calculateTotalInCurrency('BDT');
  const isFullyPaid = totalPayments >= totalCostBDT;

  const handleMarkPaymentComplete = () => {
    if (!isFullyPaid) {
      toast.error('Total payments must equal or exceed total cost in BDT');
      return;
    }
    setPaymentComplete(true);
    logChange('Payment marked as complete');
    toast.success('Payment completed! You can now create the PO.');
  };

  const logChange = (description: string) => {
    const log: ChangeLog = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      description,
    };
    setChangeLogs([log, ...changeLogs]);
  };

  const handleSave = () => {
    if (!selectedSupplier || !estimatedArrival || !shipmentName) {
      toast.error("Please fill in supplier, shipment name, and estimated arrival date");
      return;
    }

    logChange('PO saved as draft');
    toast.success('Purchase order saved successfully');
  };

  const handleSaveFxRate = () => {
    logChange(`FX rates updated (Date: ${fxRateDate}): USD→CNY: ${fxRateUsdToCny}, CNY→BDT: ${fxRateCnyToBdt}, USD→BDT: ${fxRateUsdToBdt}`);
    toast.success('Exchange rates saved');
  };

  const handleCreatePO = () => {
    if (!paymentComplete) {
      toast.error("Please complete payment before creating PO");
      return;
    }

    const validItems = items.filter(item => item.quantity > 0);
    if (validItems.length === 0) {
      toast.error("Please add at least one item with quantity > 0");
      return;
    }

    logChange('PO created and marked as Complete');
    toast.success('Purchase order created successfully!');
    setTimeout(() => navigate('/purchase'), 1000);
  };

  const handleExportExcel = () => {
    const data = items
      .filter(item => item.quantity > 0)
      .map(item => {
        const skuData = skus.find(s => s.sku === item.sku);
        return {
          SKU: item.sku,
          Name: skuData?.name || '',
          'Current Stock': skuData?.current_stock || 0,
          'Order Quantity': item.quantity,
          'Unit Cost': item.unit_cost,
          Currency: item.currency,
          'Total Cost': (item.quantity * item.unit_cost).toFixed(2),
        };
      });

    console.log('Exporting to Excel:', data);
    toast.success('PO exported to Excel format');
  };

  const getProductRecommendation = (sku: string) => {
    if (!selectedSupplier) return null;

    const skuData = skus.find(s => s.sku === sku);
    if (!skuData) return null;

    const supplierInfo = skuData.suppliers.find(s => s.supplier_id === selectedSupplier);
    if (!supplierInfo) return null;

    const currentStock = skuData.current_stock || 0;
    const performanceScore = supplierInfo.performance_score || 0;

    if (currentStock === 0 && performanceScore >= 4) {
      return { type: 'high', message: 'Out of stock - High priority reorder', color: 'red' };
    } else if (currentStock < 20 && performanceScore >= 4) {
      return { type: 'medium', message: 'Low stock - Recommended reorder', color: 'yellow' };
    } else if (performanceScore === 5) {
      return { type: 'good', message: 'Top performing product', color: 'green' };
    } else if (performanceScore < 3) {
      return { type: 'warning', message: 'Poor supplier performance', color: 'orange' };
    }
    
    return null;
  };

  const getSupplierName = () => {
    const supplier = suppliers.find(s => s.supplier_id === selectedSupplier);
    return supplier?.company_name || '';
  };

  const generateLotBarcode = (sku: string, lotSuffix: string) => {
    const poNumber = id || 'PO2026001';
    return `${sku}-${poNumber}-${lotSuffix}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/purchase')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">
              {isEditing ? `Edit PO - ${id}` : 'Create Purchase Order'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing ? 'Edit draft purchase order' : 'Create a new purchase order for supplier'}
            </p>
          </div>
        </div>
        {items.some(item => item.quantity > 0) && (
          <Button onClick={handleExportExcel} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export to Excel
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>PO Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select value={selectedSupplier} onValueChange={handleSupplierChange}>
                    <SelectTrigger id="supplier">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.supplier_id} value={supplier.supplier_id}>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-mono text-xs">
                              {supplier.initial}
                            </Badge>
                            <span>{supplier.company_name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shipment_name">Shipment Name *</Label>
                  <Input
                    id="shipment_name"
                    type="text"
                    placeholder="e.g., MQ01"
                    value={shipmentName}
                    onChange={(e) => {
                      setShipmentName(e.target.value.toUpperCase());
                      logChange(`Shipment name set to ${e.target.value.toUpperCase()}`);
                    }}
                  />
                  <p className="text-xs text-gray-500">
                    This will be used for barcode generation (e.g., SKU_MQ01)
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eta">Estimated Arrival *</Label>
                  <Input
                    id="eta"
                    type="date"
                    value={estimatedArrival}
                    onChange={(e) => {
                      setEstimatedArrival(e.target.value);
                      logChange(`ETA updated to ${e.target.value}`);
                    }}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <Label>Exchange Rates</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="date"
                      value={fxRateDate}
                      onChange={(e) => setFxRateDate(e.target.value)}
                      className="w-40"
                    />
                    <Button size="sm" onClick={handleSaveFxRate} variant="outline">
                      Save Rates
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fx_usd_cny">USD to CNY</Label>
                    <Input
                      id="fx_usd_cny"
                      type="number"
                      step="0.01"
                      value={fxRateUsdToCny}
                      onChange={(e) => setFxRateUsdToCny(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fx_cny_bdt">CNY to BDT</Label>
                    <Input
                      id="fx_cny_bdt"
                      type="number"
                      step="0.01"
                      value={fxRateCnyToBdt}
                      onChange={(e) => setFxRateCnyToBdt(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fx_usd_bdt">USD to BDT</Label>
                    <Input
                      id="fx_usd_bdt"
                      type="number"
                      step="0.01"
                      value={fxRateUsdToBdt}
                      onChange={(e) => setFxRateUsdToBdt(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedSupplier && items.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Line Items - {getSupplierName()}</CardTitle>
                  <Button onClick={addItem} variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Custom Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Image</TableHead>
                        <TableHead>Name + SKU</TableHead>
                        <TableHead>Current Qty</TableHead>
                        <TableHead>Order Qty</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total Cost</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item) => {
                        const skuData = skus.find(s => s.sku === item.sku);
                        const recommendation = getProductRecommendation(item.sku);
                        const lineTotal = item.quantity * item.unit_cost;

                        return (
                          <TableRow 
                            key={item.id}
                            className={
                              recommendation?.type === 'high' ? 'bg-red-50' :
                              recommendation?.type === 'medium' ? 'bg-yellow-50' :
                              recommendation?.type === 'good' ? 'bg-green-50' :
                              ''
                            }
                          >
                            <TableCell>
                              {skuData?.image ? (
                                <img 
                                  src={skuData.image} 
                                  alt={skuData.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                  No image
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{skuData?.name || 'Unknown'}</div>
                                <div className="font-mono text-xs text-gray-600">{item.sku}</div>
                                {recommendation && (
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      recommendation.color === 'red' ? 'bg-red-50 text-red-700 border-red-200' :
                                      recommendation.color === 'yellow' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                      recommendation.color === 'green' ? 'bg-green-50 text-green-700 border-green-200' :
                                      'bg-orange-50 text-orange-700 border-orange-200'
                                    }`}
                                  >
                                    {recommendation.type === 'high' ? 'Priority' :
                                     recommendation.type === 'medium' ? 'Recommended' :
                                     recommendation.type === 'good' ? 'Top Product' :
                                     'Warning'}
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`font-medium ${
                                (skuData?.current_stock || 0) === 0 ? 'text-red-600' :
                                (skuData?.current_stock || 0) < 20 ? 'text-yellow-600' :
                                'text-green-600'
                              }`}>
                                {skuData?.current_stock || 0}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                className="w-24"
                                value={item.quantity || ''}
                                onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="w-28"
                                  value={item.unit_cost || ''}
                                  onChange={(e) => updateItem(item.id, 'unit_cost', parseFloat(e.target.value) || 0)}
                                />
                                <Badge variant="outline" className="text-xs">
                                  {item.currency}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              {lineTotal.toFixed(2)} {item.currency}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(item.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedSupplier && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payment Tracking (BDT)</CardTitle>
                  <Button onClick={addPayment} variant="outline" size="sm" className="gap-2">
                    <Plus className="w-4 h-4" />
                    Make Payment
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {payments.length === 0 ? (
                  <div className="text-center text-gray-500 py-6">
                    <p>No payments added yet</p>
                    <p className="text-sm mt-1">Click "Make Payment" to add payment entries</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount (BDT)</TableHead>
                        <TableHead>Payment Slip/Invoice</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell>
                            <Input
                              type="date"
                              value={payment.date}
                              onChange={(e) => updatePayment(payment.id, 'date', e.target.value)}
                              className="w-40"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="Enter amount"
                              value={payment.amount || ''}
                              onChange={(e) => updatePayment(payment.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-40"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleFileUpload(payment.id, file);
                                }}
                                className="w-64"
                              />
                              {payment.payment_slip && (
                                <Badge variant="outline" className="gap-1">
                                  <Check className="w-3 h-3" />
                                  Uploaded
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePayment(payment.id)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}

                {payments.length > 0 && (
                  <div className="border-t pt-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Paid:</span>
                      <span className="text-lg font-semibold">৳{totalPayments.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Cost (BDT):</span>
                      <span className="text-lg font-semibold">৳{totalCostBDT.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Balance:</span>
                      <span className={`text-lg font-semibold ${
                        totalPayments >= totalCostBDT ? 'text-green-600' : 'text-red-600'
                      }`}>
                        ৳{(totalCostBDT - totalPayments).toLocaleString()}
                      </span>
                    </div>
                    {!paymentComplete && (
                      <Button
                        onClick={handleMarkPaymentComplete}
                        disabled={!isFullyPaid}
                        className="w-full gap-2"
                        variant={isFullyPaid ? 'default' : 'outline'}
                      >
                        <Check className="w-4 h-4" />
                        Payment Complete
                      </Button>
                    )}
                    {paymentComplete && (
                      <Badge className="w-full justify-center py-2 bg-green-100 text-green-700">
                        ✓ Payment Completed
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {changeLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Change Log</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {changeLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 text-sm border-b pb-2">
                      <span className="text-gray-500 text-xs whitespace-nowrap">{log.timestamp}</span>
                      <span className="text-gray-700">{log.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {!selectedSupplier && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-lg font-medium">Select a supplier to begin</p>
                  <p className="text-sm mt-1">Line items will be automatically populated based on supplier products</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Items:</span>
                  <span className="font-medium">{items.filter(i => i.quantity > 0).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Units:</span>
                  <span className="font-medium">
                    {items.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total (USD):</span>
                    <span className="font-semibold">
                      ${calculateTotalInCurrency('USD').toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Total (CNY):</span>
                    <span className="font-semibold">
                      ¥{calculateTotalInCurrency('CNY').toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-blue-600">Total (BDT):</span>
                    <span className="font-semibold text-blue-600 text-lg">
                      ৳{calculateTotalInCurrency('BDT').toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full gap-2" 
                onClick={handleCreatePO}
                disabled={!paymentComplete || !selectedSupplier || items.filter(i => i.quantity > 0).length === 0}
              >
                <Check className="w-4 h-4" />
                Create PO
              </Button>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleSave}
                disabled={!selectedSupplier}
              >
                Save
              </Button>
              <Button 
                variant="ghost" 
                className="w-full"
                onClick={() => navigate('/purchase')}
              >
                Cancel
              </Button>
              {!paymentComplete && (
                <div className="text-xs text-gray-500 text-center mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                  Complete payment to enable PO creation
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}