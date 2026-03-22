import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Package, Truck, DollarSign, CreditCard as Edit2, Save, X, Download, FileText } from "lucide-react";
import { purchaseOrders, skus, currentUser } from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { toast } from "sonner";

const BDT_TO_USD = 110; // Approximate exchange rate

export function PODetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const po = purchaseOrders.find(p => p.po_id === id);

  const [isEditingShipping, setIsEditingShipping] = useState(false);
  const [isEditingETA, setIsEditingETA] = useState(false);
  const [totalWeight, setTotalWeight] = useState("0");
  const [numberOfCartons, setNumberOfCartons] = useState("0");
  const [shippingCostBDT, setShippingCostBDT] = useState("0");
  const [eta, setEta] = useState(po?.estimated_arrival || "");
  const [etaLogs, setEtaLogs] = useState<Array<{date: string, timestamp: string}>>([]);

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

  // If this is a draft PO, redirect to the Create PO view for editing
  if (po.status === 'draft') {
    navigate(`/purchase/create/${po.po_id}`);
    return null;
  }

  const totalProductsOrdered = po.items.reduce((sum, item) => sum + item.quantity, 0);
  const totalProductCostUSD = po.total_cost;
  const totalProductCostBDT = totalProductCostUSD * BDT_TO_USD;
  const shippingCostUSD = parseFloat(shippingCostBDT) / BDT_TO_USD;
  const totalCostBDT = totalProductCostBDT + parseFloat(shippingCostBDT);
  const totalCostUSD = totalProductCostUSD + shippingCostUSD;

  // Calculate landed cost per item
  const getLandedCostPerItem = (item: any) => {
    if (parseFloat(shippingCostBDT) === 0 || totalProductsOrdered === 0) {
      return item.unit_cost * (po.fx_rate || 1);
    }
    
    const landedCostBDT = totalCostBDT / totalProductsOrdered;
    const landedCostUSD = landedCostBDT / BDT_TO_USD;
    
    return landedCostUSD;
  };

  const handleSaveShipping = () => {
    setIsEditingShipping(false);
    toast.success("Shipping details saved successfully");
  };

  const handleSaveETA = () => {
    setIsEditingETA(false);
    const log = {
      date: eta,
      timestamp: new Date().toLocaleString(),
    };
    setEtaLogs([...etaLogs, log]);
    toast.success("ETA updated and logged");
  };

  const handleReceiveGoods = () => {
    navigate(`/purchase/receive/${po.po_id}`);
  };

  const handleExportPackingList = () => {
    const data = po.items.map(item => {
      const skuData = skus.find(s => s.sku === item.sku);
      return {
        Image: skuData?.image || 'No image',
        SKU: item.sku,
        'Product Name': item.sku_name,
        Quantity: item.quantity,
      };
    });

    console.log('Exporting Packing List:', data);
    toast.success('Packing list exported to Excel format');
  };

  const canReceive = ['ordered', 'partially_received'].includes(po.status);
  const canEdit = ['draft', 'ordered'].includes(po.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/purchase')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">{po.po_id}</h1>
            <p className="text-gray-600 mt-1">Purchase Order Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportPackingList} variant="outline" className="gap-2">
            <FileText className="w-4 h-4" />
            Create Packing List
          </Button>
          {canReceive && (
            <Button onClick={handleReceiveGoods} className="gap-2">
              <Package className="w-4 h-4" />
              Receive Goods
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Supplier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">{po.supplier}</div>
            <p className="text-xs text-gray-600 mt-1">Currency: {po.currency}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={
              po.status === 'draft' ? 'bg-gray-100 text-gray-700' :
              po.status === 'ordered' ? 'bg-blue-100 text-blue-700' :
              po.status === 'partially_received' ? 'bg-yellow-100 text-yellow-700' :
              'bg-green-100 text-green-700'
            }>
              {po.status.replace(/_/g, ' ')}
            </Badge>
            <p className="text-xs text-gray-600 mt-2">
              Created: {new Date(po.created_date).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-600">ETA</CardTitle>
            {!isEditingETA && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditingETA(true)}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {isEditingETA ? (
              <div className="space-y-2">
                <Input
                  type="date"
                  value={eta}
                  onChange={(e) => setEta(e.target.value)}
                  className="text-sm"
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleSaveETA} className="flex-1 h-7 text-xs">
                    <Save className="w-3 h-3 mr-1" />
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditingETA(false);
                      setEta(po.estimated_arrival);
                    }}
                    className="flex-1 h-7 text-xs"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="text-lg font-semibold">
                  {new Date(eta).toLocaleDateString()}
                </div>
                <p className="text-xs text-gray-600 mt-1">Estimated Arrival</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-semibold">${totalCostUSD.toFixed(2)}</div>
            <p className="text-xs text-gray-600 mt-1">
              {po.currency} {po.total_cost.toFixed(2)} × {po.fx_rate}
            </p>
          </CardContent>
        </Card>
      </div>

      {etaLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ETA Change Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {etaLogs.map((log, index) => (
                <div key={index} className="flex items-center justify-between text-sm border-b pb-2">
                  <span className="text-gray-600">Updated to: {new Date(log.date).toLocaleDateString()}</span>
                  <span className="text-gray-500 text-xs">{log.timestamp}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Shipping Details
            </CardTitle>
            {!isEditingShipping && canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditingShipping(true)}
                className="gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <Label htmlFor="total_weight">Total Weight (kg)</Label>
              {isEditingShipping ? (
                <Input
                  id="total_weight"
                  type="number"
                  step="0.01"
                  value={totalWeight}
                  onChange={(e) => setTotalWeight(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 text-lg font-medium">
                  {parseFloat(totalWeight) > 0 ? `${totalWeight} kg` : '—'}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="cartons">Number of Cartons</Label>
              {isEditingShipping ? (
                <Input
                  id="cartons"
                  type="number"
                  value={numberOfCartons}
                  onChange={(e) => setNumberOfCartons(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 text-lg font-medium">
                  {parseInt(numberOfCartons) > 0 ? numberOfCartons : '—'}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="shipping_cost">Shipping Cost (BDT)</Label>
              {isEditingShipping ? (
                <Input
                  id="shipping_cost"
                  type="number"
                  step="0.01"
                  value={shippingCostBDT}
                  onChange={(e) => setShippingCostBDT(e.target.value)}
                  className="mt-1"
                />
              ) : (
                <div className="mt-1 text-lg font-medium">
                  {parseFloat(shippingCostBDT) > 0 ? `৳${parseFloat(shippingCostBDT).toLocaleString()}` : '—'}
                </div>
              )}
              {parseFloat(shippingCostBDT) > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  ≈ ${shippingCostUSD.toFixed(2)} USD
                </p>
              )}
            </div>
          </div>

          {isEditingShipping && (
            <div className="flex gap-2 mt-4">
              <Button onClick={handleSaveShipping} className="gap-2">
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditingShipping(false)}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {parseFloat(shippingCostBDT) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Product Cost (USD):</span>
                <span className="font-medium">${totalProductCostUSD.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Product Cost (BDT):</span>
                <span className="font-medium">৳{totalProductCostBDT.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Shipping Cost (BDT):</span>
                <span className="font-medium">৳{parseFloat(shippingCostBDT).toLocaleString()}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total Cost (BDT):</span>
                  <span className="font-semibold text-lg">৳{totalCostBDT.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="font-semibold">Total Cost (USD):</span>
                  <span className="font-semibold text-lg">${totalCostUSD.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Items Ordered:</span>
                  <span className="font-medium">{totalProductsOrdered} units</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-gray-600">Avg. Landed Cost/Unit:</span>
                  <span className="font-medium">
                    ${(totalCostUSD / totalProductsOrdered).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Received</TableHead>
                <TableHead>Unit Cost ({po.currency})</TableHead>
                <TableHead>Total Cost ({po.currency})</TableHead>
                {parseFloat(shippingCostBDT) > 0 && (
                  <TableHead>Est. Landed Cost/Unit (USD)</TableHead>
                )}
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.items.map((item) => {
                const skuData = skus.find(s => s.sku === item.sku);
                const landedCost = getLandedCostPerItem(item);
                const itemTotal = item.quantity * item.unit_cost;
                const fullyReceived = item.received_quantity >= item.quantity;
                const partiallyReceived = item.received_quantity > 0 && item.received_quantity < item.quantity;

                return (
                  <TableRow key={item.sku}>
                    <TableCell className="font-mono text-sm font-medium">{item.sku}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {skuData?.image && (
                          <img 
                            src={skuData.image} 
                            alt={item.sku_name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        )}
                        <span>{item.sku_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.quantity}</TableCell>
                    <TableCell>
                      <span className={
                        fullyReceived ? 'text-green-600 font-medium' :
                        partiallyReceived ? 'text-yellow-600 font-medium' :
                        'text-gray-600'
                      }>
                        {item.received_quantity}
                      </span>
                    </TableCell>
                    <TableCell>{item.unit_cost.toFixed(2)}</TableCell>
                    <TableCell className="font-medium">{itemTotal.toFixed(2)}</TableCell>
                    {parseFloat(shippingCostBDT) > 0 && (
                      <TableCell className="font-medium text-blue-600">
                        ${landedCost.toFixed(2)}
                      </TableCell>
                    )}
                    <TableCell>
                      {fullyReceived ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          Received
                        </Badge>
                      ) : partiallyReceived ? (
                        <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                          Partial
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-50">
                          Pending
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}