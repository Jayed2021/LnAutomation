import { useState } from "react";
import { Package, Scan, Check, AlertCircle, Printer } from "lucide-react";
import { orders, lots } from "../../data/mockData";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";

interface PickItem {
  sku: string;
  sku_name: string;
  quantity: number;
  lot_id: string;
  location: string;
  picked: boolean;
  scanned_barcode?: string;
}

export function Picking() {
  const readyOrders = orders.filter(o => o.cs_status === 'ready_to_ship' && o.ops_status === 'not_printed');
  const printedOrders = orders.filter(o => o.ops_status === 'printed');
  
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [pickList, setPickList] = useState<PickItem[]>([]);

  const selectedOrder = orders.find(o => o.order_id === selectedOrderId);

  const generatePickList = (orderId: string) => {
    const order = orders.find(o => o.order_id === orderId);
    if (!order) return;

    // Generate pick list with FIFO lot selection
    const items: PickItem[] = order.items.flatMap(item => {
      // Find FIFO lots for this SKU
      const availableLots = lots
        .filter(lot => lot.sku === item.sku && lot.remaining_quantity > 0)
        .sort((a, b) => new Date(a.received_date).getTime() - new Date(b.received_date).getTime());

      const pickItems: PickItem[] = [];
      let remainingQty = item.quantity;

      for (const lot of availableLots) {
        if (remainingQty === 0) break;
        const pickQty = Math.min(lot.remaining_quantity, remainingQty);
        pickItems.push({
          sku: item.sku,
          sku_name: item.sku_name,
          quantity: pickQty,
          lot_id: lot.lot_id,
          location: lot.location,
          picked: false,
        });
        remainingQty -= pickQty;
      }

      return pickItems;
    });

    setPickList(items);
    setSelectedOrderId(orderId);
    toast.success("Pick list generated with FIFO lots");
  };

  const handleBarcodeScan = () => {
    if (!barcodeInput.trim()) return;

    // Find unpicked item that matches the barcode
    const matchingItem = pickList.find(item => !item.picked);
    
    if (!matchingItem) {
      toast.error("All items already picked or no items to pick");
      setBarcodeInput("");
      return;
    }

    // In a real system, we'd validate the barcode matches the expected SKU
    // For demo, we'll mark it as picked
    setPickList(pickList.map(item => 
      item === matchingItem ? { ...item, picked: true, scanned_barcode: barcodeInput } : item
    ));
    
    toast.success(`✓ Picked: ${matchingItem.sku} from ${matchingItem.location}`);
    setBarcodeInput("");
  };

  const handlePrintInvoice = (orderId: string) => {
    generatePickList(orderId);
    toast.success("Invoice printed. Order status: Printed");
  };

  const handleCompletePicking = () => {
    const allPicked = pickList.every(item => item.picked);
    if (!allPicked) {
      toast.error("Please scan all items before completing");
      return;
    }

    toast.success("Picking completed! Inventory movements created. Order status: Packed");
    setSelectedOrderId(null);
    setPickList([]);
  };

  const pickedCount = pickList.filter(item => item.picked).length;
  const totalItems = pickList.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Picking & Packing</h1>
        <p className="text-gray-600 mt-1">Operations workflow for order fulfilment</p>
      </div>

      <Tabs defaultValue="ready">
        <TabsList>
          <TabsTrigger value="ready">Ready to Ship ({readyOrders.length})</TabsTrigger>
          <TabsTrigger value="printed">Printed ({printedOrders.length})</TabsTrigger>
          <TabsTrigger value="picking">Active Picking</TabsTrigger>
        </TabsList>

        <TabsContent value="ready" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orders Ready for Printing</CardTitle>
            </CardHeader>
            <CardContent>
              {readyOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No orders ready to ship</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {readyOrders.map((order) => (
                      <TableRow key={order.order_id}>
                        <TableCell className="font-medium">{order.order_id}</TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{order.items.length} items</TableCell>
                        <TableCell>${order.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{order.payment_method}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => handlePrintInvoice(order.order_id)}
                            className="gap-2"
                          >
                            <Printer className="w-4 h-4" />
                            Print Invoice
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="printed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Printed Orders - Ready for Picking</CardTitle>
            </CardHeader>
            <CardContent>
              {printedOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Scan className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No printed orders</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {printedOrders.map((order) => (
                      <TableRow key={order.order_id}>
                        <TableCell className="font-medium">{order.order_id}</TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{order.items.length} items</TableCell>
                        <TableCell>${order.total.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => generatePickList(order.order_id)}
                            variant="outline"
                            className="gap-2"
                          >
                            <Package className="w-4 h-4" />
                            Start Picking
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="picking" className="space-y-4">
          {!selectedOrderId ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-gray-500">
                  <Scan className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No active picking session</p>
                  <p className="text-sm">Print an invoice or start picking from the Printed tab</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Scanning Interface */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Scan className="w-5 h-5" />
                        Picking: {selectedOrderId}
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        Customer: {selectedOrder?.customer_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold">
                        {pickedCount}/{totalItems}
                      </p>
                      <p className="text-xs text-gray-600">Items picked</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900">FIFO Validation Active</p>
                        <p className="text-blue-700 mt-1">
                          Scan barcodes to verify correct SKU and LOT. System will prevent mispicks.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="barcode">Scan Barcode</Label>
                    <div className="flex gap-2">
                      <Input
                        id="barcode"
                        placeholder="Scan or enter barcode..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleBarcodeScan()}
                        autoFocus
                      />
                      <Button onClick={handleBarcodeScan}>
                        <Scan className="w-4 h-4 mr-2" />
                        Scan
                      </Button>
                    </div>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-green-500 h-3 rounded-full transition-all"
                      style={{ width: `${(pickedCount / totalItems * 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Pick List */}
              <Card>
                <CardHeader>
                  <CardTitle>Pick List (FIFO Order)</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Lot ID</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pickList.map((item, index) => (
                        <TableRow 
                          key={index}
                          className={item.picked ? 'bg-green-50' : ''}
                        >
                          <TableCell>
                            {item.picked ? (
                              <Badge className="bg-green-500 text-white gap-1">
                                <Check className="w-3 h-3" />
                                Picked
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{item.sku}</TableCell>
                          <TableCell>{item.sku_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.lot_id}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-blue-100 text-blue-700 font-mono">
                              {item.location}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-medium">{item.quantity}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="flex justify-between items-center mt-6 pt-6 border-t">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSelectedOrderId(null);
                        setPickList([]);
                      }}
                    >
                      Cancel Picking
                    </Button>
                    <Button 
                      onClick={handleCompletePicking}
                      disabled={pickedCount !== totalItems}
                      className="gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Complete Picking
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
