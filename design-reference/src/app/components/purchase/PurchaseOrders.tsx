import { useState } from "react";
import { Link } from "react-router";
import { Plus, Search, Package } from "lucide-react";
import { purchaseOrders } from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
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

export function PurchaseOrders() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesSearch = 
      po.po_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.supplier.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      ordered: 'bg-blue-100 text-blue-700',
      partially_received: 'bg-yellow-100 text-yellow-700',
      closed: 'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Purchase Orders</h1>
          <p className="text-gray-600 mt-1">Manage supplier purchase orders</p>
        </div>
        <Button className="gap-2" asChild>
          <Link to="/purchase/create">
            <Plus className="w-4 h-4" />
            Create PO
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Purchase Orders</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by PO ID or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ordered">Ordered</SelectItem>
                <SelectItem value="partially_received">Partially Received</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO ID</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPOs.map((po) => (
                <TableRow 
                  key={po.po_id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => window.location.href = `/purchase/${po.po_id}`}
                >
                  <TableCell className="font-medium">{po.po_id}</TableCell>
                  <TableCell>{po.supplier}</TableCell>
                  <TableCell>{po.items.length} items</TableCell>
                  <TableCell>${po.total_cost.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{po.currency}</Badge>
                  </TableCell>
                  <TableCell>{new Date(po.estimated_arrival).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(po.status)}>
                      {po.status.replace(/_/g, ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    {(po.status === 'ordered' || po.status === 'partially_received') && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        asChild
                        className="gap-2"
                      >
                        <Link to={`/purchase/receive/${po.po_id}`}>
                          <Package className="w-4 h-4" />
                          Receive
                        </Link>
                      </Button>
                    )}
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