import { useState } from "react";
import { Link } from "react-router";
import { Search, Eye } from "lucide-react";
import { returns } from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
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

export function Returns() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredReturns = returns.filter((ret) => {
    const matchesSearch = 
      ret.return_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || ret.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      expected: 'bg-yellow-100 text-yellow-700',
      received: 'bg-blue-100 text-blue-700',
      qc_passed: 'bg-green-100 text-green-700',
      qc_failed: 'bg-red-100 text-red-700',
      restocked: 'bg-green-100 text-green-700',
      damaged: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const expectedReturns = returns.filter(r => r.status === 'expected').length;
  const receivedReturns = returns.filter(r => r.status === 'received').length;
  const qcPassed = returns.filter(r => r.status === 'qc_passed' || r.status === 'restocked').length;
  const qcFailed = returns.filter(r => r.status === 'qc_failed' || r.status === 'damaged').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Returns Management</h1>
        <p className="text-gray-600 mt-1">Track and process customer returns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Expected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{expectedReturns}</div>
            <p className="text-xs text-gray-600 mt-1">In transit</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Received</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{receivedReturns}</div>
            <p className="text-xs text-gray-600 mt-1">Awaiting QC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">QC Passed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{qcPassed}</div>
            <p className="text-xs text-gray-600 mt-1">Restocked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">QC Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{qcFailed}</div>
            <p className="text-xs text-gray-600 mt-1">Damaged</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Returns</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by Return ID, Order ID, or reason..."
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
                <SelectItem value="expected">Expected</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="qc_passed">QC Passed</SelectItem>
                <SelectItem value="qc_failed">QC Failed</SelectItem>
                <SelectItem value="restocked">Restocked</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return ID</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Expected Date</TableHead>
                <TableHead>Received Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-gray-500 py-8">
                    No returns found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReturns.map((ret) => (
                  <TableRow key={ret.return_id}>
                    <TableCell className="font-medium">{ret.return_id}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{ret.order_id}</Badge>
                    </TableCell>
                    <TableCell>{ret.items.length} items</TableCell>
                    <TableCell className="max-w-xs truncate">{ret.reason}</TableCell>
                    <TableCell>{ret.courier}</TableCell>
                    <TableCell>{ret.expected_date || '-'}</TableCell>
                    <TableCell>{ret.received_date || '-'}</TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(ret.status)}>
                        {ret.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="gap-2" asChild>
                        <Link to={`/returns/${ret.return_id}`}>
                          <Eye className="w-4 h-4" />
                          View
                        </Link>
                      </Button>
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