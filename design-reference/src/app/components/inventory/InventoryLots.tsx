import { useState } from "react";
import { Search, Package, ArrowLeft, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { getAllShipments, getShipmentByPO, ShipmentSummary, currentUser } from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { canSeeCosts } from "../../utils/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export function InventoryLots() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShipment, setSelectedShipment] = useState<ShipmentSummary | null>(null);

  const allShipments = getAllShipments();

  const filteredShipments = allShipments.filter((shipment) => {
    const matchesSearch = 
      shipment.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      shipment.po_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Calculate days in inventory
  const getDaysInInventory = (receivedDate: string) => {
    const received = new Date(receivedDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - received.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const showCosts = canSeeCosts(currentUser.role);

  // If a shipment is selected, show detail view
  if (selectedShipment) {
    const totalProfit = selectedShipment.items.reduce((sum, item) => sum + item.profit, 0);

    return (
      <div className="space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => setSelectedShipment(null)}
            className="mb-2 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Shipments
          </Button>
          <h1 className="text-3xl font-semibold">Shipment {selectedShipment.shipment_id}</h1>
          <p className="text-gray-600 mt-1">
            Received {new Date(selectedShipment.received_date).toLocaleDateString()} • {selectedShipment.total_skus} SKUs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Total Quantity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{selectedShipment.total_initial_quantity}</div>
              <p className="text-xs text-gray-600 mt-1">Initial received</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Sold Quantity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-green-600">{selectedShipment.total_sold_quantity}</div>
              <p className="text-xs text-gray-600 mt-1">{selectedShipment.utilization_percent.toFixed(1)}% sold</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Remaining
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold text-orange-600">{selectedShipment.total_remaining_quantity}</div>
              <p className="text-xs text-gray-600 mt-1">In stock</p>
            </CardContent>
          </Card>

          {showCosts && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Total Profit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-green-600">
                  ${totalProfit.toFixed(2)}
                </div>
                <p className="text-xs text-gray-600 mt-1">From sold items</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>SKU Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Sold Qty</TableHead>
                  <TableHead>Remaining</TableHead>
                  {showCosts && (
                    <>
                      <TableHead>Landed Cost</TableHead>
                      <TableHead>Total Cost</TableHead>
                      <TableHead>Profit</TableHead>
                    </>
                  )}
                  <TableHead>Location</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedShipment.items.map((item) => (
                  <TableRow key={item.lot_id}>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell className="font-medium">{item.sku_name}</TableCell>
                    <TableCell>{item.initial_quantity}</TableCell>
                    <TableCell className="text-green-600 font-medium">{item.sold_quantity}</TableCell>
                    <TableCell className="text-orange-600">{item.remaining_quantity}</TableCell>
                    {showCosts && (
                      <>
                        <TableCell>${item.landed_cost.toFixed(2)}</TableCell>
                        <TableCell>${item.total_cost.toFixed(2)}</TableCell>
                        <TableCell>
                          <span className={item.profit >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                            ${item.profit.toFixed(2)}
                          </span>
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      <Badge variant="outline">{item.location}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default view: Shipments list
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Shipments</h1>
        <p className="text-gray-600 mt-1">Track inventory shipments and lots by purchase order</p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Package className="w-5 h-5 text-blue-600 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900">About FIFO Lots</p>
          <p className="text-blue-700 mt-1">
            Each lot represents a batch of goods received from a purchase order. Lots are dispatched in FIFO order 
            (First In, First Out) to ensure accurate COGS calculation. Older lots are listed first.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Shipments</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by Shipment ID or PO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shipment ID</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead>Age (Days)</TableHead>
                <TableHead>Total SKUs</TableHead>
                <TableHead>Initial Qty</TableHead>
                <TableHead>Sold Qty</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Utilization</TableHead>
                {showCosts && <TableHead>Total Landed Cost</TableHead>}
                <TableHead>PO Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredShipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                    No shipments found
                  </TableCell>
                </TableRow>
              ) : (
                filteredShipments.map((shipment) => {
                  const age = getDaysInInventory(shipment.received_date);
                  const utilization = shipment.utilization_percent;

                  return (
                    <TableRow 
                      key={shipment.po_id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setSelectedShipment(shipment)}
                    >
                      <TableCell>
                        <span className="font-semibold text-blue-600">
                          {shipment.shipment_id}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(shipment.received_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={age > 90 ? "destructive" : age > 60 ? "default" : "outline"}>
                          {age}d
                        </Badge>
                      </TableCell>
                      <TableCell>{shipment.total_skus}</TableCell>
                      <TableCell>{shipment.total_initial_quantity}</TableCell>
                      <TableCell className="text-green-600 font-medium">
                        {shipment.total_sold_quantity}
                      </TableCell>
                      <TableCell className="text-orange-600">
                        {shipment.total_remaining_quantity}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
                            <div
                              className={`h-full ${
                                utilization >= 75 ? 'bg-green-500' :
                                utilization >= 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${utilization}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600 min-w-[40px]">
                            {utilization.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      {showCosts && (
                        <TableCell className="font-medium">
                          ${shipment.total_landed_cost.toFixed(2)}
                        </TableCell>
                      )}
                      <TableCell className="font-mono text-sm text-gray-600">
                        {shipment.po_id}
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
