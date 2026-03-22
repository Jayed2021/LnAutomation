import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { returns, currentUser } from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
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
import { toast } from "sonner";

export function ReturnDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const returnItem = returns.find(r => r.return_id === id);
  
  const [status, setStatus] = useState(returnItem?.status || '');
  const [qcNotes, setQcNotes] = useState("");
  const [itemQCStatus, setItemQCStatus] = useState<Record<number, 'passed' | 'failed'>>(
    returnItem?.items.reduce((acc, item, index) => {
      acc[index] = item.qc_status || 'passed';
      return acc;
    }, {} as Record<number, 'passed' | 'failed'>) || {}
  );

  if (!returnItem) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/returns')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-semibold">Return Not Found</h1>
        </div>
      </div>
    );
  }

  const handleReceive = () => {
    setStatus('received');
    toast.success("Return marked as received. Ready for QC.");
  };

  const handleQC = () => {
    const allPassed = Object.values(itemQCStatus).every(s => s === 'passed');
    const newStatus = allPassed ? 'qc_passed' : 'qc_failed';
    setStatus(newStatus);
    toast.success(`QC ${allPassed ? 'passed' : 'failed'}. ${allPassed ? 'Items will be restocked.' : 'Items marked as damaged.'}`);
  };

  const handleRestock = () => {
    setStatus('restocked');
    toast.success("Items restocked. Inventory movements created with original cost lineage.");
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      expected: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      received: 'bg-blue-100 text-blue-700 border-blue-200',
      qc_passed: 'bg-green-100 text-green-700 border-green-200',
      qc_failed: 'bg-red-100 text-red-700 border-red-200',
      restocked: 'bg-green-100 text-green-700 border-green-200',
      damaged: 'bg-red-100 text-red-700 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const canProcess = currentUser.role === 'admin' || currentUser.role === 'operations';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/returns')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-semibold">{returnItem.return_id}</h1>
          <p className="text-gray-600 mt-1">Order: {returnItem.order_id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Return Items */}
          <Card>
            <CardHeader>
              <CardTitle>Returned Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Quantity</TableHead>
                    {status === 'received' && <TableHead>QC Status</TableHead>}
                    {returnItem.items[0]?.lot_id && <TableHead>Restocked to Lot</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {returnItem.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.sku_name}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      {status === 'received' && (
                        <TableCell>
                          {canProcess ? (
                            <Select 
                              value={itemQCStatus[index]} 
                              onValueChange={(value: 'passed' | 'failed') => {
                                setItemQCStatus({ ...itemQCStatus, [index]: value });
                              }}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="passed">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                    Passed
                                  </div>
                                </SelectItem>
                                <SelectItem value="failed">
                                  <div className="flex items-center gap-2">
                                    <XCircle className="w-4 h-4 text-red-600" />
                                    Failed
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge className={itemQCStatus[index] === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {itemQCStatus[index]}
                            </Badge>
                          )}
                        </TableCell>
                      )}
                      {item.lot_id && (
                        <TableCell>
                          <Badge variant="outline">{item.lot_id}</Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* QC Notes */}
          {(status === 'received' || status === 'qc_passed' || status === 'qc_failed') && (
            <Card>
              <CardHeader>
                <CardTitle>QC Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add notes about item condition, damage details, etc."
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  rows={4}
                  disabled={!canProcess || (status !== 'received')}
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle>Return Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge className={getStatusColor(status) + " w-full justify-center py-2 text-base"}>
                {status.replace(/_/g, ' ')}
              </Badge>

              {canProcess && (
                <div className="space-y-2 pt-2">
                  {status === 'expected' && (
                    <Button className="w-full" onClick={handleReceive}>
                      Mark as Received
                    </Button>
                  )}
                  {status === 'received' && (
                    <Button className="w-full" onClick={handleQC}>
                      Complete QC
                    </Button>
                  )}
                  {status === 'qc_passed' && (
                    <Button className="w-full" onClick={handleRestock}>
                      Restock Items
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Return Information */}
          <Card>
            <CardHeader>
              <CardTitle>Return Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Reason</p>
                <p className="text-sm">{returnItem.reason}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-gray-600">Courier</p>
                <p className="text-sm">{returnItem.courier}</p>
              </div>
              {returnItem.expected_date && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Expected Date</p>
                  <p className="text-sm">{returnItem.expected_date}</p>
                </div>
              )}
              {returnItem.received_date && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-600">Received Date</p>
                  <p className="text-sm">{returnItem.received_date}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Related Order */}
          <Card>
            <CardHeader>
              <CardTitle>Related Order</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge variant="outline" className="text-base">{returnItem.order_id}</Badge>
                <Button variant="outline" size="sm" className="w-full">
                  View Original Order
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
