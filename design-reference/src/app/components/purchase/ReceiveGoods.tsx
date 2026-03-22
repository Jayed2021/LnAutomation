import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Save, Upload, X, Download, FileText, Image as ImageIcon, CheckCircle, Barcode } from "lucide-react";
import { purchaseOrders, warehouseLocations, currentUser, type PurchaseOrder } from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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
import { Package } from "lucide-react";

interface ReceiveItem {
  sku: string;
  sku_name: string;
  ordered_quantity: number;
  qty_checked: number;
  quality_checked: number;
  damaged_quantity: number;
  location: string;
  landed_cost_per_unit: number;
  barcode: string;
}

interface Photo {
  id: string;
  url: string;
  file_name: string;
  type: 'good' | 'damaged';
  upload_date: string;
}

interface DateLog {
  timestamp: string;
  date: string;
  user: string;
}

type ReceivingStep = 'quantity' | 'quality' | 'completed';

export function ReceiveGoods() {
  const { id } = useParams();
  const navigate = useNavigate();
  const po = id ? purchaseOrders.find(p => p.po_id === id) : null;

  // If no ID, show list of pending shipments
  if (!id) {
    const pendingPOs = purchaseOrders.filter(po => 
      po.status === 'ordered' || po.status === 'partially_received'
    );

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Receive Shipments</h1>
          <p className="text-gray-600 mt-1">Process incoming purchase orders</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Shipments</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              {pendingPOs.length} shipment{pendingPOs.length !== 1 ? 's' : ''} ready to receive
            </p>
          </CardHeader>
          <CardContent>
            {pendingPOs.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No pending shipments</p>
                <p className="text-sm mt-1">All purchase orders have been received</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO ID</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPOs.map((pendingPO) => (
                    <TableRow key={pendingPO.po_id}>
                      <TableCell className="font-mono font-medium">{pendingPO.po_id}</TableCell>
                      <TableCell>{pendingPO.supplier}</TableCell>
                      <TableCell>{new Date(pendingPO.estimated_arrival).toLocaleDateString()}</TableCell>
                      <TableCell>{pendingPO.items.length} items</TableCell>
                      <TableCell className="font-medium">
                        {pendingPO.currency} {pendingPO.total_cost.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          pendingPO.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }>
                          {pendingPO.status.replace(/_/g, ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm"
                          onClick={() => navigate(`/inventory/receive/${pendingPO.po_id}`)}
                          className="gap-2"
                        >
                          <Package className="w-4 h-4" />
                          Receive
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Rest of the component for receiving specific PO
  const [currentStep, setCurrentStep] = useState<ReceivingStep>('quantity');
  const [warehouse] = useState("Main Warehouse");
  const [quantityCheckDate, setQuantityCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [qualityCheckDate, setQualityCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantityNotes, setQuantityNotes] = useState("");
  const [qualityNotes, setQualityNotes] = useState("");
  const [addedToStockAfterQty, setAddedToStockAfterQty] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [quantityDateLogs, setQuantityDateLogs] = useState<DateLog[]>([]);
  const [qualityDateLogs, setQualityDateLogs] = useState<DateLog[]>([]);
  
  const [items, setItems] = useState<ReceiveItem[]>(
    po?.items.map((item, index) => ({
      sku: item.sku,
      sku_name: item.sku_name,
      ordered_quantity: item.quantity,
      qty_checked: 0,
      quality_checked: 0,
      damaged_quantity: 0,
      location: warehouseLocations[0]?.location_name || "",
      landed_cost_per_unit: item.unit_cost * (po.fx_rate || 1),
      barcode: `${item.sku}-${po.po_id}-${String(index + 1).padStart(3, '0')}`, // Unique LOT barcode
    })) || []
  );

  if (!po) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/purchase')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-semibold">Purchase Order Not Found</h1>
        </div>
      </div>
    );
  }

  const updateItem = (sku: string, field: keyof ReceiveItem, value: any) => {
    setItems(items.map(item => 
      item.sku === sku ? { ...item, [field]: value } : item
    ));
  };

  const handleSaveProgress = () => {
    toast.success("Progress saved! You can resume from where you left off.");
  };

  const handleSaveQuantityCheckDate = () => {
    const log: DateLog = {
      timestamp: new Date().toLocaleString(),
      date: quantityCheckDate,
      user: currentUser.name,
    };
    setQuantityDateLogs([...quantityDateLogs, log]);
    toast.success("Quantity check date logged");
  };

  const handleSaveQualityCheckDate = () => {
    const log: DateLog = {
      timestamp: new Date().toLocaleString(),
      date: qualityCheckDate,
      user: currentUser.name,
    };
    setQualityDateLogs([...qualityDateLogs, log]);
    toast.success("Quality check date logged");
  };

  const handleQuantityCheckComplete = (addToStock: boolean) => {
    const hasInvalidQuantities = items.some(item => item.qty_checked === 0);
    if (hasInvalidQuantities) {
      toast.error("Please enter quantity checked for all items");
      return;
    }

    const hasNoLocation = items.some(item => !item.location);
    if (hasNoLocation) {
      toast.error("Please select a location for all items");
      return;
    }

    setAddedToStockAfterQty(addToStock);
    setCurrentStep('quality');
    
    if (addToStock) {
      toast.success("Quantity check complete. Items added to stock. Now proceed with quality check.");
    } else {
      toast.success("Quantity check complete. Proceed with quality check.");
    }
  };

  const handleQualityCheckComplete = () => {
    const hasInvalidQuantities = items.some(item => item.quality_checked === 0);
    if (hasInvalidQuantities) {
      toast.error("Please enter quality checked quantity for all items");
      return;
    }

    setCurrentStep('completed');
    toast.success("Quality check complete! You can now generate the final report.");
  };

  const handlePhotoUpload = (type: 'good' | 'damaged') => {
    // Simulated photo upload
    const newPhoto: Photo = {
      id: `photo-${Date.now()}`,
      url: type === 'good' 
        ? 'https://images.unsplash.com/photo-1585076800763-a7f80e5c0f79?w=400'
        : 'https://images.unsplash.com/photo-1607863680198-23d4b2565df0?w=400',
      file_name: `${type}_items_${new Date().toISOString()}.jpg`,
      type,
      upload_date: new Date().toISOString(),
    };
    
    setPhotos([...photos, newPhoto]);
    toast.success(`${type === 'good' ? 'Good' : 'Damaged'} items photo uploaded`);
  };

  const handlePhotoRemove = (photoId: string) => {
    setPhotos(photos.filter(p => p.id !== photoId));
    toast.success("Photo removed");
  };

  const handleDownloadBarcode = (barcode: string) => {
    // In production, this would generate and download a barcode image
    navigator.clipboard.writeText(barcode);
    toast.success(`Barcode ${barcode} copied to clipboard (in production, this would download a barcode image)`);
  };

  const handleGenerateReport = () => {
    const reportData = {
      po_id: po.po_id,
      supplier: po.supplier,
      quantity_check: {
        date: quantityCheckDate,
        checked_by: currentUser.name,
        notes: quantityNotes,
        added_to_stock: addedToStockAfterQty,
        date_logs: quantityDateLogs,
      },
      quality_check: {
        date: qualityCheckDate,
        checked_by: currentUser.name,
        notes: qualityNotes,
        photos: photos.length,
        date_logs: qualityDateLogs,
      },
      items: items.map(item => ({
        barcode: item.barcode,
        sku: item.sku,
        name: item.sku_name,
        ordered: item.ordered_quantity,
        qty_checked: item.qty_checked,
        quality_checked: item.quality_checked,
        damaged: item.damaged_quantity,
        final_good: item.quality_checked - item.damaged_quantity,
        location: item.location,
        landed_cost: item.landed_cost_per_unit,
      })),
      total_ordered: items.reduce((sum, item) => sum + item.ordered_quantity, 0),
      total_good: items.reduce((sum, item) => sum + item.quality_checked - item.damaged_quantity, 0),
      total_damaged: items.reduce((sum, item) => sum + item.damaged_quantity, 0),
    };

    console.log("Generating report:", reportData);
    toast.success("Report generated successfully! In production, this would download a PDF.");
  };

  const getStepStatus = (step: ReceivingStep) => {
    if (step === 'quantity') return currentStep === 'quantity' ? 'current' : 'completed';
    if (step === 'quality') {
      if (currentStep === 'quantity') return 'pending';
      if (currentStep === 'quality') return 'current';
      return 'completed';
    }
    if (step === 'completed') {
      return currentStep === 'completed' ? 'current' : 'pending';
    }
    return 'pending';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/inventory/receive')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Receive
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">Receive Goods - {po.po_id}</h1>
            <p className="text-gray-600 mt-1">Two-step receiving process</p>
          </div>
        </div>
        <Button onClick={handleSaveProgress} variant="outline" className="gap-2">
          <Save className="w-4 h-4" />
          Save Progress
        </Button>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${
                  getStepStatus('quantity') === 'current' ? 'text-blue-600' :
                  getStepStatus('quantity') === 'completed' ? 'text-green-600' :
                  'text-gray-400'
                }`}>
                  1. Quantity Check
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  getStepStatus('quantity') === 'current' ? 'bg-blue-100 text-blue-600' :
                  getStepStatus('quantity') === 'completed' ? 'bg-green-100 text-green-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {getStepStatus('quantity') === 'completed' ? <CheckCircle className="w-5 h-5" /> : '1'}
                </div>
              </div>
              <div className="h-1 bg-gray-200 rounded">
                <div className={`h-1 rounded ${
                  getStepStatus('quantity') === 'completed' ? 'bg-green-500 w-full' :
                  getStepStatus('quantity') === 'current' ? 'bg-blue-500 w-1/2' :
                  'w-0'
                }`} />
              </div>
            </div>

            <div className="w-12"></div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${
                  getStepStatus('quality') === 'current' ? 'text-blue-600' :
                  getStepStatus('quality') === 'completed' ? 'text-green-600' :
                  'text-gray-400'
                }`}>
                  2. Quality Check
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  getStepStatus('quality') === 'current' ? 'bg-blue-100 text-blue-600' :
                  getStepStatus('quality') === 'completed' ? 'bg-green-100 text-green-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {getStepStatus('quality') === 'completed' ? <CheckCircle className="w-5 h-5" /> : '2'}
                </div>
              </div>
              <div className="h-1 bg-gray-200 rounded">
                <div className={`h-1 rounded ${
                  getStepStatus('quality') === 'completed' ? 'bg-green-500 w-full' :
                  getStepStatus('quality') === 'current' ? 'bg-blue-500 w-1/2' :
                  'w-0'
                }`} />
              </div>
            </div>

            <div className="w-12"></div>

            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${
                  getStepStatus('completed') === 'current' ? 'text-blue-600' :
                  'text-gray-400'
                }`}>
                  3. Complete
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  getStepStatus('completed') === 'current' ? 'bg-green-100 text-green-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {getStepStatus('completed') === 'current' ? <CheckCircle className="w-5 h-5" /> : '3'}
                </div>
              </div>
              <div className="h-1 bg-gray-200 rounded">
                <div className={`h-1 rounded ${
                  getStepStatus('completed') === 'current' ? 'bg-green-500 w-full' :
                  'w-0'
                }`} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Quantity Check */}
      {currentStep === 'quantity' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Step 1: Quantity Check</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="qty_check_date">Check Date:</Label>
                <Input
                  id="qty_check_date"
                  type="date"
                  value={quantityCheckDate}
                  onChange={(e) => setQuantityCheckDate(e.target.value)}
                  className="w-40"
                />
                <Button size="sm" onClick={handleSaveQuantityCheckDate} variant="outline">
                  <Save className="w-4 h-4 mr-1" />
                  Log Date
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {quantityDateLogs.length > 0 && (
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">Date Change Log:</p>
                <div className="space-y-1">
                  {quantityDateLogs.map((log, index) => (
                    <p key={index} className="text-xs text-blue-700">
                      {log.timestamp} - Date set to {new Date(log.date).toLocaleDateString()} by {log.user}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Barcode</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Ordered Qty</TableHead>
                    <TableHead>Qty Checked</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.sku}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {item.barcode}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDownloadBarcode(item.barcode)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                      <TableCell>{item.sku_name}</TableCell>
                      <TableCell className="font-medium">{item.ordered_quantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="w-24"
                          value={item.qty_checked || ''}
                          onChange={(e) => updateItem(item.sku, 'qty_checked', parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={item.location} 
                          onValueChange={(value) => updateItem(item.sku, 'location', value)}
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouseLocations.map((loc) => (
                              <SelectItem key={loc.location_id} value={loc.location_name}>
                                <div>
                                  <div className="font-medium">{loc.warehouse_name}</div>
                                  <div className="text-xs text-gray-600">{loc.location_name}</div>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qty_notes">Notes</Label>
              <Textarea
                id="qty_notes"
                placeholder="Add any notes about the quantity check..."
                value={quantityNotes}
                onChange={(e) => setQuantityNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => handleQuantityCheckComplete(false)} variant="outline" className="flex-1">
                Complete Check (Don't Add to Stock)
              </Button>
              <Button onClick={() => handleQuantityCheckComplete(true)} className="flex-1">
                Complete & Add to Stock
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Quality Check */}
      {currentStep === 'quality' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Step 2: Quality Check</CardTitle>
              <div className="flex items-center gap-2">
                <Label htmlFor="quality_check_date">Check Date:</Label>
                <Input
                  id="quality_check_date"
                  type="date"
                  value={qualityCheckDate}
                  onChange={(e) => setQualityCheckDate(e.target.value)}
                  className="w-40"
                />
                <Button size="sm" onClick={handleSaveQualityCheckDate} variant="outline">
                  <Save className="w-4 h-4 mr-1" />
                  Log Date
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {qualityDateLogs.length > 0 && (
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm font-medium text-blue-900 mb-2">Date Change Log:</p>
                <div className="space-y-1">
                  {qualityDateLogs.map((log, index) => (
                    <p key={index} className="text-xs text-blue-700">
                      {log.timestamp} - Date set to {new Date(log.date).toLocaleDateString()} by {log.user}
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Qty Checked</TableHead>
                    <TableHead>Quality Passed</TableHead>
                    <TableHead>Damaged</TableHead>
                    <TableHead>Final Good</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const finalGood = item.quality_checked - item.damaged_quantity;
                    return (
                      <TableRow key={item.sku}>
                        <TableCell className="font-mono font-medium">{item.sku}</TableCell>
                        <TableCell>{item.sku_name}</TableCell>
                        <TableCell className="font-medium">{item.qty_checked}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={item.qty_checked}
                            className="w-24"
                            value={item.quality_checked || ''}
                            onChange={(e) => updateItem(item.sku, 'quality_checked', parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            max={item.quality_checked}
                            className="w-24"
                            value={item.damaged_quantity || ''}
                            onChange={(e) => updateItem(item.sku, 'damaged_quantity', parseInt(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell className={`font-medium ${
                          finalGood < item.ordered_quantity ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {finalGood}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Upload Photos - Good Items</Label>
                <Button
                  onClick={() => handlePhotoUpload('good')}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Good Items Photo
                </Button>
                <div className="space-y-2">
                  {photos.filter(p => p.type === 'good').map((photo) => (
                    <div key={photo.id} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                      <ImageIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm flex-1">{photo.file_name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePhotoRemove(photo.id)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Upload Photos - Damaged Items</Label>
                <Button
                  onClick={() => handlePhotoUpload('damaged')}
                  variant="outline"
                  className="w-full gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Damaged Items Photo
                </Button>
                <div className="space-y-2">
                  {photos.filter(p => p.type === 'damaged').map((photo) => (
                    <div key={photo.id} className="flex items-center gap-2 p-2 bg-red-50 rounded border border-red-200">
                      <ImageIcon className="w-4 h-4 text-red-600" />
                      <span className="text-sm flex-1">{photo.file_name}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handlePhotoRemove(photo.id)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quality_notes">Notes</Label>
              <Textarea
                id="quality_notes"
                placeholder="Add any notes about the quality check..."
                value={qualityNotes}
                onChange={(e) => setQualityNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button onClick={() => setCurrentStep('quantity')} variant="outline">
                Back to Quantity Check
              </Button>
              <Button onClick={handleQualityCheckComplete} className="flex-1">
                Complete Quality Check
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Completed */}
      {currentStep === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Receiving Process Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-green-50 p-4 rounded border border-green-200">
              <p className="text-green-900 font-medium">
                All items have been checked and recorded. You can now generate the final report.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-600">Total Ordered</p>
                  <p className="text-2xl font-semibold mt-1">
                    {items.reduce((sum, item) => sum + item.ordered_quantity, 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-600">Total Good</p>
                  <p className="text-2xl font-semibold text-green-600 mt-1">
                    {items.reduce((sum, item) => sum + item.quality_checked - item.damaged_quantity, 0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm text-gray-600">Total Damaged</p>
                  <p className="text-2xl font-semibold text-red-600 mt-1">
                    {items.reduce((sum, item) => sum + item.damaged_quantity, 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={handleGenerateReport} className="flex-1 gap-2">
                <FileText className="w-4 h-4" />
                Generate & Download Report
              </Button>
              <Button onClick={() => navigate('/purchase')} variant="outline">
                Back to Purchase Orders
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}