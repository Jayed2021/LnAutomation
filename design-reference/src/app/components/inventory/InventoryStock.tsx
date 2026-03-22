import { useState } from "react";
import { Search, AlertTriangle, TrendingDown, MapPin } from "lucide-react";
import { lots, skus, currentUser } from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Link } from "react-router";
import { canSeeCosts } from "../../utils/permissions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";

export function InventoryStock() {
  const [searchTerm, setSearchTerm] = useState("");

  // Aggregate stock by SKU with location information
  const stockBySKU = lots.reduce((acc, lot) => {
    if (!acc[lot.sku]) {
      const skuData = skus.find(s => s.sku === lot.sku);
      acc[lot.sku] = {
        sku: lot.sku,
        sku_name: lot.sku_name,
        total_quantity: 0,
        lots_count: 0,
        avg_cost: 0,
        total_value: 0,
        locations: new Set(),
        image: skuData?.image,
      };
    }
    acc[lot.sku].total_quantity += lot.remaining_quantity;
    acc[lot.sku].lots_count += 1;
    acc[lot.sku].total_value += lot.remaining_quantity * lot.landed_cost;
    acc[lot.sku].locations.add(lot.location);
    return acc;
  }, {} as Record<string, any>);

  // Calculate average cost and convert locations Set to Array
  Object.values(stockBySKU).forEach((item: any) => {
    item.avg_cost = item.total_quantity > 0 ? item.total_value / item.total_quantity : 0;
    item.locations = Array.from(item.locations);
  });

  const stockItems = Object.values(stockBySKU);

  const filteredStock = stockItems.filter((item: any) => {
    const matchesSearch = 
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const totalStockValue = stockItems.reduce((sum: number, item: any) => sum + item.total_value, 0);
  const totalUnits = stockItems.reduce((sum: number, item: any) => sum + item.total_quantity, 0);
  const lowStockCount = stockItems.filter((item: any) => item.total_quantity < 20).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Products</h1>
        <p className="text-gray-600 mt-1">Current inventory across all warehouses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Units</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalUnits.toLocaleString()}</div>
            <p className="text-xs text-gray-600 mt-1">Across {stockItems.length} SKUs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">${totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <p className="text-xs text-gray-600 mt-1">At landed cost</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Low Stock Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{lowStockCount}</div>
            <p className="text-xs text-gray-600 mt-1">Below 20 units</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Stock</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by SKU or name..."
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
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Total Quantity</TableHead>
                <TableHead>Lots</TableHead>
                <TableHead>Avg. Cost</TableHead>
                <TableHead>Total Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStock.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-gray-500 py-8">
                    No stock items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredStock.map((item: any) => (
                  <TableRow key={item.sku} className="hover:bg-gray-50">
                    <TableCell>
                      <Link 
                        to={`/inventory/product/${item.sku}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <img 
                          src={item.image || 'https://via.placeholder.com/40'} 
                          alt={item.sku_name}
                          className="w-10 h-10 object-cover rounded border"
                        />
                        <span className="font-medium text-blue-600 hover:underline">
                          {item.sku_name}
                        </span>
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.locations.map((loc: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs gap-1">
                            <MapPin className="w-3 h-3" />
                            {loc}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.total_quantity}</TableCell>
                    <TableCell>{item.lots_count}</TableCell>
                    <TableCell>
                      {canSeeCosts(currentUser) ? `${item.avg_cost.toFixed(2)}` : '---'}
                    </TableCell>
                    <TableCell>${item.total_value.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.total_quantity === 0 ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Out of Stock
                        </Badge>
                      ) : item.total_quantity < 20 ? (
                        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 flex items-center gap-1 w-fit">
                          <TrendingDown className="w-3 h-3" />
                          Low Stock
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}