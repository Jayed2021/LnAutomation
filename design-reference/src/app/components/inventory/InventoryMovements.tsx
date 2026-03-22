import { useState } from "react";
import { Search, ArrowUp, ArrowDown, RotateCcw, CreditCard as Edit } from "lucide-react";
import { inventoryMovements } from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

export function InventoryMovements() {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredMovements = inventoryMovements.filter((movement) => {
    const matchesSearch = 
      movement.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.sku_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.lot_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      movement.reference_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || movement.movement_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'receive':
        return <ArrowDown className="w-4 h-4 text-green-600" />;
      case 'dispatch':
        return <ArrowUp className="w-4 h-4 text-blue-600" />;
      case 'return':
        return <RotateCcw className="w-4 h-4 text-orange-600" />;
      case 'adjustment':
        return <Edit className="w-4 h-4 text-purple-600" />;
      default:
        return null;
    }
  };

  const getMovementColor = (type: string) => {
    const colors: Record<string, string> = {
      receive: 'bg-green-100 text-green-700',
      dispatch: 'bg-blue-100 text-blue-700',
      return: 'bg-orange-100 text-orange-700',
      adjustment: 'bg-purple-100 text-purple-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  // Sort by timestamp, newest first
  const sortedMovements = [...filteredMovements].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Inventory Movements</h1>
        <p className="text-gray-600 mt-1">Complete audit trail of all inventory changes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Movements</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by SKU, Lot ID, or Reference..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="receive">Receive</SelectItem>
                <SelectItem value="dispatch">Dispatch</SelectItem>
                <SelectItem value="return">Return</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Movement ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Lot ID</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Date/Time</TableHead>
                <TableHead>User</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMovements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-gray-500 py-8">
                    No movements found
                  </TableCell>
                </TableRow>
              ) : (
                sortedMovements.map((movement) => (
                  <TableRow key={movement.movement_id}>
                    <TableCell className="font-medium">{movement.movement_id}</TableCell>
                    <TableCell>
                      <Badge className={getMovementColor(movement.movement_type) + " flex items-center gap-1 w-fit"}>
                        {getMovementIcon(movement.movement_type)}
                        {movement.movement_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{movement.sku}</p>
                        <p className="text-xs text-gray-600">{movement.sku_name}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{movement.lot_id}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className={movement.quantity < 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                        {movement.quantity > 0 ? '+' : ''}{movement.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{movement.from_location}</TableCell>
                    <TableCell className="text-sm">{movement.to_location}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{movement.reference_id}</p>
                        <p className="text-xs text-gray-600">{movement.reference_type}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(movement.timestamp).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-sm">{movement.user}</TableCell>
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
