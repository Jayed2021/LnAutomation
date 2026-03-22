import { useState } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, CreditCard as Edit2, Save, X, Package, MapPin, DollarSign, Barcode as BarcodeIcon, Building, Download, Plus, Trash2 } from "lucide-react";
import { skus, lots, suppliers, updateSKU } from "../../data/mockData";
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

interface SupplierInfo {
  id: string;
  supplier_id: string;
  supplier_name: string;
  unit_cost: number;
  currency: string;
}

export function ProductDetail() {
  const { sku: skuParam } = useParams();
  const [isEditing, setIsEditing] = useState(false);
  
  const skuData = skus.find(s => s.sku === skuParam);
  const productLots = lots.filter(l => l.sku === skuParam);
  
  const [formData, setFormData] = useState({
    sku: skuData?.sku || "",
    name: skuData?.name || "",
    barcode: skuData?.barcode || "",
    selling_price: skuData?.selling_price.toString() || "",
  });

  const [productSuppliers, setProductSuppliers] = useState<SupplierInfo[]>(
    skuData?.suppliers.map((s, idx) => ({
      id: `${s.supplier_id}-${idx}`,
      supplier_id: s.supplier_id,
      supplier_name: s.supplier_name,
      unit_cost: s.unit_cost,
      currency: s.currency,
    })) || []
  );

  if (!skuData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/inventory/stock">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Products
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            Product not found
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalQuantity = productLots.reduce((sum, lot) => sum + lot.remaining_quantity, 0);
  const totalValue = productLots.reduce((sum, lot) => sum + (lot.remaining_quantity * lot.landed_cost), 0);
  const avgCost = totalQuantity > 0 ? totalValue / totalQuantity : 0;
  const uniqueLocations = [...new Set(productLots.map(lot => lot.location))];

  const handleSave = () => {
    // Update SKU with new data
    updateSKU(skuParam!, {
      sku: formData.sku,
      name: formData.name,
      barcode: formData.barcode,
      selling_price: parseFloat(formData.selling_price),
      suppliers: productSuppliers.map(s => ({
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        unit_cost: s.unit_cost,
        currency: s.currency,
        last_purchase_date: '',
        performance_score: 0,
        total_ordered_last_quarter: 0,
      })),
    });
    setIsEditing(false);
    toast.success("Product updated successfully");
  };

  const handleCancel = () => {
    setFormData({
      sku: skuData?.sku || "",
      name: skuData?.name || "",
      barcode: skuData?.barcode || "",
      selling_price: skuData?.selling_price.toString() || "",
    });
    setProductSuppliers(
      skuData?.suppliers.map((s, idx) => ({
        id: `${s.supplier_id}-${idx}`,
        supplier_id: s.supplier_id,
        supplier_name: s.supplier_name,
        unit_cost: s.unit_cost,
        currency: s.currency,
      })) || []
    );
    setIsEditing(false);
  };

  const handleAddSupplier = () => {
    const newSupplier: SupplierInfo = {
      id: Date.now().toString(),
      supplier_id: "",
      supplier_name: "",
      unit_cost: 0,
      currency: "USD",
    };
    setProductSuppliers([...productSuppliers, newSupplier]);
  };

  const handleRemoveSupplier = (id: string) => {
    setProductSuppliers(productSuppliers.filter(s => s.id !== id));
  };

  const handleSupplierChange = (id: string, supplierId: string) => {
    const supplier = suppliers.find(s => s.supplier_id === supplierId);
    if (supplier) {
      setProductSuppliers(productSuppliers.map(s => 
        s.id === id ? { ...s, supplier_id: supplierId, supplier_name: supplier.company_name } : s
      ));
    }
  };

  const handleUnitCostChange = (id: string, cost: number) => {
    setProductSuppliers(productSuppliers.map(s => 
      s.id === id ? { ...s, unit_cost: cost } : s
    ));
  };

  const handleCurrencyChange = (id: string, currency: string) => {
    setProductSuppliers(productSuppliers.map(s => 
      s.id === id ? { ...s, currency } : s
    ));
  };

  const handleDownloadBarcode = () => {
    // In production, this would generate and download an actual barcode image
    navigator.clipboard.writeText(formData.barcode);
    toast.success(`Barcode ${formData.barcode} copied to clipboard (in production, this would download a barcode image)`);
  };

  const handleDownloadLotBarcode = (lotId: string, shipmentName: string) => {
    const barcode = `${skuParam}_${shipmentName}`;
    navigator.clipboard.writeText(barcode);
    toast.success(`Barcode ${barcode} copied to clipboard`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/inventory/stock">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Products
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold">{isEditing ? formData.name : skuData.name}</h1>
            <p className="text-gray-600 mt-1 font-mono">{isEditing ? formData.sku : skuData.sku}</p>
          </div>
        </div>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} className="gap-2">
            <Edit2 className="w-4 h-4" />
            Edit Product
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} className="gap-2">
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Image and Basic Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Product Image</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-square w-full bg-gray-100 rounded-lg overflow-hidden">
              <img
                src={skuData.image || 'https://via.placeholder.com/400'}
                alt={skuData.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Total Stock</span>
                <span className="font-semibold text-lg">{totalQuantity} units</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm text-gray-600">Total Value</span>
                <span className="font-semibold">${totalValue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Avg. Cost</span>
                <span className="font-semibold">${avgCost.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sku" className="flex items-center gap-2 text-gray-600">
                  <Package className="w-4 h-4" />
                  SKU
                </Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50 font-mono" : "font-mono"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-2 text-gray-600">
                  Product Name
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="barcode" className="flex items-center gap-2 text-gray-600">
                  <BarcodeIcon className="w-4 h-4" />
                  Barcode (Same as SKU)
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="barcode"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    disabled={!isEditing}
                    className={!isEditing ? "bg-gray-50 font-mono" : "font-mono"}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadBarcode}
                    className="shrink-0"
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">Product-level barcode for identification</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="flex items-center gap-2 text-gray-600">
                  <DollarSign className="w-4 h-4" />
                  Selling Price
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                  disabled={!isEditing}
                  className={!isEditing ? "bg-gray-50" : ""}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  Warehouse Locations
                </Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {uniqueLocations.length > 0 ? (
                    uniqueLocations.map((location, idx) => (
                      <Badge key={idx} variant="outline" className="gap-1">
                        <MapPin className="w-3 h-3" />
                        {location}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No stock locations</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="space-y-2">
                <Label className="text-gray-600">Attributes</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(skuData.attributes).map(([key, value]) => (
                    <Badge key={key} variant="outline">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suppliers Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Suppliers</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Manage multiple suppliers with different unit costs
              </p>
            </div>
            {isEditing && (
              <Button onClick={handleAddSupplier} variant="outline" size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                Add Supplier
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {productSuppliers.map((supplier) => (
              <div key={supplier.id} className="flex items-end gap-4 p-4 border rounded-lg">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Supplier</Label>
                    {isEditing ? (
                      <Select 
                        value={supplier.supplier_id} 
                        onValueChange={(value) => handleSupplierChange(supplier.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers.map((s) => (
                            <SelectItem key={s.supplier_id} value={s.supplier_id}>
                              {s.company_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={supplier.supplier_name} disabled className="bg-gray-50" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Unit Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={supplier.unit_cost}
                      onChange={(e) => handleUnitCostChange(supplier.id, parseFloat(e.target.value) || 0)}
                      disabled={!isEditing}
                      className={!isEditing ? "bg-gray-50" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    {isEditing ? (
                      <Select 
                        value={supplier.currency} 
                        onValueChange={(value) => handleCurrencyChange(supplier.id, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="CNY">CNY</SelectItem>
                          <SelectItem value="BDT">BDT</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input value={supplier.currency} disabled className="bg-gray-50" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Total Cost</Label>
                    <Input 
                      value={`${supplier.unit_cost.toFixed(2)} ${supplier.currency}`}
                      disabled 
                      className="bg-gray-50 font-medium"
                    />
                  </div>
                </div>
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSupplier(supplier.id)}
                    className="shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            ))}
            {productSuppliers.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No suppliers configured
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Shipments (formerly Inventory Lots) */}
      <Card>
        <CardHeader>
          <CardTitle>Shipments</CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Each shipment has a unique barcode for tracking and dispatch
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment Barcode</TableHead>
                <TableHead>Lot ID</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead>PO ID</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Landed Cost</TableHead>
                <TableHead>Initial Qty</TableHead>
                <TableHead>Remaining Qty</TableHead>
                <TableHead>Lot Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productLots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No shipments found for this product
                  </TableCell>
                </TableRow>
              ) : (
                productLots.map((lot) => {
                  // Extract shipment name from PO ID (e.g., "PO-2026-001" -> "MQ01")
                  const shipmentName = lot.po_id.replace('PO-', '').replace(/-/g, '');
                  const shipmentBarcode = `${skuParam}_${shipmentName}`;
                  
                  return (
                    <TableRow key={lot.lot_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200">
                            {shipmentBarcode}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleDownloadLotBarcode(lot.lot_id, shipmentName)}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium font-mono text-sm">{lot.lot_id}</TableCell>
                      <TableCell>{new Date(lot.received_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-sm">{lot.po_id}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="w-3 h-3" />
                          {lot.location}
                        </Badge>
                      </TableCell>
                      <TableCell>${lot.landed_cost.toFixed(2)}</TableCell>
                      <TableCell>{lot.initial_quantity}</TableCell>
                      <TableCell className="font-medium">{lot.remaining_quantity}</TableCell>
                      <TableCell className="font-medium">
                        ${(lot.remaining_quantity * lot.landed_cost).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
