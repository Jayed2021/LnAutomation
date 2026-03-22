import { useState } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertCircle, Clock,
  Download, Trash2, Eye, DollarSign, TrendingUp, Search, Zap,
  ArrowLeft, Package, Truck, CreditCard, BarChart3, ExternalLink, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { orders } from '../../data/mockData';

interface CollectionRecord {
  id: string;
  courier_name: string;
  invoice_number: string;
  invoice_pdf_url?: string;
  invoice_date: string;
  total_disbursed: number;
  bank_reference: string;
  bank_amount: number;
  bank_date: string;
  status: 'pending' | 'processing' | 'verified' | 'discrepancy';
  orders_matched: number;
  total_orders: number;
  created_date: string;
  created_by: string;
  ai_processed: boolean;
  matched_orders?: MatchedOrder[];
}

interface MatchedOrder {
  order_id: string;
  woo_order_id: string;
  tracking_number: string;
  collected_amount: number;
  delivery_charge: number;
  cod_charge: number;
  disbursed_amount: number;
  match_confidence: number;
  status: 'matched' | 'not_found' | 'already_updated';
}

export function Collection() {
  const [collections, setCollections] = useState<CollectionRecord[]>([
    {
      id: '1',
      courier_name: 'Pathao',
      invoice_number: 'PTH-FEB-001',
      invoice_date: '2026-02-20',
      total_disbursed: 125000,
      bank_reference: 'BK-20260221-001',
      bank_amount: 125000,
      bank_date: '2026-02-21',
      status: 'verified',
      orders_matched: 15,
      total_orders: 15,
      created_date: '2026-02-21',
      created_by: 'Admin',
      ai_processed: true,
      matched_orders: [
        { order_id: 'ORD-001', woo_order_id: '#1001', tracking_number: 'PTH-DH-001234', collected_amount: 2500, delivery_charge: 60, cod_charge: 25, disbursed_amount: 2415, match_confidence: 100, status: 'matched' },
        { order_id: 'ORD-002', woo_order_id: '#1002', tracking_number: 'PTH-DH-001235', collected_amount: 3200, delivery_charge: 60, cod_charge: 32, disbursed_amount: 3108, match_confidence: 100, status: 'matched' },
        { order_id: 'ORD-003', woo_order_id: '#1003', tracking_number: 'PTH-DH-001236', collected_amount: 1800, delivery_charge: 60, cod_charge: 18, disbursed_amount: 1722, match_confidence: 95, status: 'matched' },
        { order_id: 'ORD-004', woo_order_id: '#1004', tracking_number: 'PTH-DH-001237', collected_amount: 4500, delivery_charge: 80, cod_charge: 45, disbursed_amount: 4375, match_confidence: 100, status: 'matched' },
        { order_id: 'ORD-005', woo_order_id: '#1005', tracking_number: 'PTH-DH-001238', collected_amount: 2100, delivery_charge: 60, cod_charge: 21, disbursed_amount: 2019, match_confidence: 100, status: 'matched' },
        { order_id: 'ORD-006', woo_order_id: '#1006', tracking_number: 'PTH-DH-001239', collected_amount: 6800, delivery_charge: 80, cod_charge: 68, disbursed_amount: 6652, match_confidence: 100, status: 'matched' },
        { order_id: 'ORD-007', woo_order_id: '#1007', tracking_number: 'PTH-DH-001240', collected_amount: 1500, delivery_charge: 60, cod_charge: 15, disbursed_amount: 1425, match_confidence: 95, status: 'matched' },
        { order_id: 'ORD-008', woo_order_id: '#1008', tracking_number: 'PTH-DH-001241', collected_amount: 9200, delivery_charge: 100, cod_charge: 92, disbursed_amount: 9008, match_confidence: 100, status: 'matched' },
        { order_id: 'ORD-009', woo_order_id: '#1009', tracking_number: 'PTH-DH-001242', collected_amount: 3400, delivery_charge: 60, cod_charge: 34, disbursed_amount: 3306, match_confidence: 100, status: 'matched' },
        { order_id: 'ORD-010', woo_order_id: '#1010', tracking_number: 'PTH-DH-001243', collected_amount: 7600, delivery_charge: 80, cod_charge: 76, disbursed_amount: 7444, match_confidence: 100, status: 'matched' },
        { order_id: 'ORD-011', woo_order_id: '#1011', tracking_number: 'PTH-DH-001244', collected_amount: 2800, delivery_charge: 60, cod_charge: 28, disbursed_amount: 2712, match_confidence: 100, status: 'matched' },
        { order_id: 'ORD-012', woo_order_id: '#1012', tracking_number: 'PTH-DH-001245', collected_amount: 5500, delivery_charge: 80, cod_charge: 55, disbursed_amount: 5365, match_confidence: 95, status: 'matched' },
        { order_id: 'ORD-013', woo_order_id: '#1013', tracking_number: 'PTH-DH-001246', collected_amount: 1200, delivery_charge: 60, cod_charge: 12, disbursed_amount: 1128, match_confidence: 100, status: 'matched' },
        { order_id: 'ORD-014', woo_order_id: '#1014', tracking_number: 'PTH-DH-001247', collected_amount: 4100, delivery_charge: 60, cod_charge: 41, disbursed_amount: 3999, match_confidence: 100, status: 'matched' },
        { order_id: 'ORD-015', woo_order_id: '#1015', tracking_number: 'PTH-DH-001248', collected_amount: 8800, delivery_charge: 100, cod_charge: 88, disbursed_amount: 8612, match_confidence: 100, status: 'matched' },
      ]
    }
  ]);

  const [addCollectionOpen, setAddCollectionOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [detailPageOpen, setDetailPageOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<CollectionRecord | null>(null);
  const [processingAI, setProcessingAI] = useState(false);

  const [newCollection, setNewCollection] = useState({
    courier_name: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    bank_reference: '',
    bank_amount: '',
    bank_date: new Date().toISOString().split('T')[0],
  });
  
  const [invoicePDF, setInvoicePDF] = useState<File | null>(null);

  // Mock AI processing function
  const processInvoiceWithAI = async (pdfFile: File): Promise<MatchedOrder[]> => {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Mock extracted data from PDF
    const mockExtractedData = [
      {
        tracking_number: 'PTH-DH-001234',
        collected_amount: 2500,
        delivery_charge: 60,
        cod_charge: 25,
        disbursed_amount: 2415
      },
      {
        tracking_number: 'PTH-DH-001235',
        collected_amount: 3200,
        delivery_charge: 60,
        cod_charge: 32,
        disbursed_amount: 3108
      },
      {
        tracking_number: 'PTH-DH-001236',
        collected_amount: 1800,
        delivery_charge: 60,
        cod_charge: 18,
        disbursed_amount: 1722
      },
    ];

    // Match with orders in database
    const matchedOrders: MatchedOrder[] = mockExtractedData.map(extracted => {
      // Find order by tracking number
      const order = orders.find(o => o.tracking_number === extracted.tracking_number);
      
      if (!order) {
        return {
          order_id: '',
          woo_order_id: '',
          tracking_number: extracted.tracking_number,
          collected_amount: extracted.collected_amount,
          delivery_charge: extracted.delivery_charge,
          cod_charge: extracted.cod_charge,
          disbursed_amount: extracted.disbursed_amount,
          match_confidence: 0,
          status: 'not_found' as const
        };
      }

      // Check if order already has collection data
      const alreadyUpdated = order.collected_amount && order.delivery_charge;

      return {
        order_id: order.order_id,
        woo_order_id: order.woo_order_id,
        tracking_number: extracted.tracking_number,
        collected_amount: extracted.collected_amount,
        delivery_charge: extracted.delivery_charge,
        cod_charge: extracted.cod_charge,
        disbursed_amount: extracted.disbursed_amount,
        match_confidence: alreadyUpdated ? 100 : 95,
        status: alreadyUpdated ? 'already_updated' as const : 'matched' as const
      };
    });

    return matchedOrders;
  };

  const handlePDFUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.includes('pdf')) {
        toast.error('Please upload a PDF file');
        return;
      }
      if (file.size > 20 * 1024 * 1024) {
        toast.error('File size must be less than 20MB');
        return;
      }
      setInvoicePDF(file);
      toast.success(`Invoice uploaded: ${file.name}`);
    }
  };

  const handleProcessWithAI = async () => {
    if (!invoicePDF) {
      toast.error('Please upload an invoice PDF first');
      return;
    }

    setProcessingAI(true);
    toast.info('AI is analyzing the invoice...');

    try {
      const matchedOrders = await processInvoiceWithAI(invoicePDF);
      
      const totalDisbursed = matchedOrders.reduce((sum, o) => sum + o.disbursed_amount, 0);
      const ordersMatched = matchedOrders.filter(o => o.status === 'matched').length;
      
      // Show results
      toast.success(`AI processed ${matchedOrders.length} orders. ${ordersMatched} matched successfully!`);
      
      // Store matched orders temporarily
      setNewCollection(prev => ({
        ...prev,
        // Auto-fill if bank amount matches
      }));

      // Store results for preview
      const tempCollection: CollectionRecord = {
        id: 'temp',
        courier_name: newCollection.courier_name,
        invoice_number: newCollection.invoice_number,
        invoice_date: newCollection.invoice_date,
        total_disbursed: totalDisbursed,
        bank_reference: newCollection.bank_reference,
        bank_amount: parseFloat(newCollection.bank_amount) || 0,
        bank_date: newCollection.bank_date,
        status: 'processing',
        orders_matched: ordersMatched,
        total_orders: matchedOrders.length,
        created_date: new Date().toISOString(),
        created_by: 'Current User',
        ai_processed: true,
        matched_orders: matchedOrders
      };

      setSelectedCollection(tempCollection);
      setViewDetailsOpen(true);

    } catch (error) {
      toast.error('AI processing failed. Please try again.');
    } finally {
      setProcessingAI(false);
    }
  };

  const handleSaveCollection = () => {
    if (!selectedCollection || !selectedCollection.matched_orders) {
      toast.error('No data to save');
      return;
    }

    // Update orders in the database
    const updatedCount = selectedCollection.matched_orders.filter(o => o.status === 'matched').length;
    
    // Save collection record
    const newRecord: CollectionRecord = {
      ...selectedCollection,
      id: Date.now().toString(),
      status: selectedCollection.bank_amount === selectedCollection.total_disbursed ? 'verified' : 'discrepancy',
    };

    setCollections([newRecord, ...collections]);
    
    toast.success(`Collection saved! ${updatedCount} orders updated.`);
    
    // Reset form
    setNewCollection({
      courier_name: '',
      invoice_number: '',
      invoice_date: new Date().toISOString().split('T')[0],
      bank_reference: '',
      bank_amount: '',
      bank_date: new Date().toISOString().split('T')[0],
    });
    setInvoicePDF(null);
    setSelectedCollection(null);
    setViewDetailsOpen(false);
    setAddCollectionOpen(false);
  };

  const totalCollected = collections.reduce((sum, c) => sum + c.bank_amount, 0);
  const pendingVerification = collections.filter(c => c.status === 'pending' || c.status === 'processing').length;
  const totalDiscrepancies = collections.filter(c => c.status === 'discrepancy').reduce(
    (sum, c) => sum + Math.abs(c.total_disbursed - c.bank_amount), 
    0
  );

  const handleOpenDetailPage = (collection: CollectionRecord) => {
    setSelectedCollection(collection);
    setDetailPageOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold">Collection Management</h1>
          <p className="text-gray-600 mt-1">
            Verify courier payments and bank deposits with AI-powered invoice analysis
          </p>
        </div>
        <Button onClick={() => setAddCollectionOpen(true)}>
          <Upload className="w-4 h-4 mr-2" />
          Add Collection
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Collected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">৳{totalCollected.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">{collections.length} collection records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pending Verification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{pendingVerification}</p>
            <p className="text-sm text-gray-600 mt-1">Awaiting bank confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Discrepancies
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">৳{totalDiscrepancies.toLocaleString()}</p>
            <p className="text-sm text-gray-600 mt-1">Needs investigation</p>
          </CardContent>
        </Card>
      </div>

      {/* Collections Table */}
      <Card>
        <CardHeader>
          <CardTitle>Collection Records</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Courier</TableHead>
                <TableHead>Invoice Date</TableHead>
                <TableHead>Disbursed</TableHead>
                <TableHead>Bank Amount</TableHead>
                <TableHead>Bank Ref</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                    No collection records yet
                  </TableCell>
                </TableRow>
              ) : (
                collections.map((collection) => (
                  <TableRow
                    key={collection.id}
                    className="cursor-pointer hover:bg-blue-50/60 transition-colors"
                    onClick={() => handleOpenDetailPage(collection)}
                  >
                    <TableCell className="font-medium text-blue-600 hover:underline">{collection.invoice_number}</TableCell>
                    <TableCell>{collection.courier_name}</TableCell>
                    <TableCell>{new Date(collection.invoice_date).toLocaleDateString('en-GB')}</TableCell>
                    <TableCell className="font-bold">৳{collection.total_disbursed.toLocaleString()}</TableCell>
                    <TableCell className="font-bold">৳{collection.bank_amount.toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{collection.bank_reference}</TableCell>
                    <TableCell>
                      {collection.ai_processed && (
                        <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
                          <Zap className="w-3 h-3 mr-1" />
                          {collection.orders_matched}/{collection.total_orders}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          collection.status === 'verified'
                            ? 'default'
                            : collection.status === 'discrepancy'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className={
                          collection.status === 'verified'
                            ? 'bg-green-100 text-green-700 border-green-300'
                            : ''
                        }
                      >
                        {collection.status === 'verified' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                        {collection.status === 'discrepancy' && <AlertCircle className="w-3 h-3 mr-1" />}
                        {collection.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetailPage(collection);
                        }}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Collection Modal */}
      <Dialog open={addCollectionOpen} onOpenChange={setAddCollectionOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Collection Record</DialogTitle>
            <DialogDescription>
              Upload courier invoice PDF for AI analysis and bank verification
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Courier Invoice Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold">Courier Invoice Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Courier Company *</Label>
                  <Select value={newCollection.courier_name} onValueChange={(val) => setNewCollection({...newCollection, courier_name: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select courier" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pathao">Pathao</SelectItem>
                      <SelectItem value="Steadfast">Steadfast</SelectItem>
                      <SelectItem value="Redx">Redx</SelectItem>
                      <SelectItem value="Paperfly">Paperfly</SelectItem>
                      <SelectItem value="eCourier">eCourier</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Invoice Number *</Label>
                  <Input
                    placeholder="PTH-FEB-001"
                    value={newCollection.invoice_number}
                    onChange={(e) => setNewCollection({...newCollection, invoice_number: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Invoice Date *</Label>
                  <Input
                    type="date"
                    value={newCollection.invoice_date}
                    onChange={(e) => setNewCollection({...newCollection, invoice_date: e.target.value})}
                  />
                </div>
              </div>

              {/* PDF Upload */}
              <div className="space-y-2">
                <Label>Upload Invoice PDF *</Label>
                <div className="border-2 border-dashed rounded-lg p-6 text-center bg-blue-50 border-blue-200">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handlePDFUpload}
                    className="hidden"
                    id="invoice-pdf-upload"
                  />
                  <label htmlFor="invoice-pdf-upload" className="cursor-pointer">
                    {invoicePDF ? (
                      <div className="space-y-2">
                        <FileText className="w-12 h-12 text-blue-600 mx-auto" />
                        <p className="text-sm font-medium">{invoicePDF.name}</p>
                        <p className="text-xs text-gray-500">{(invoicePDF.size / 1024).toFixed(2)} KB</p>
                        <div className="flex gap-2 justify-center mt-3">
                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              handleProcessWithAI();
                            }}
                            disabled={processingAI}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            {processingAI ? 'Processing...' : 'Process with AI'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              setInvoicePDF(null);
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <Upload className="w-12 h-12 text-blue-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Click to upload courier invoice PDF</p>
                        <p className="text-xs text-gray-500 mt-1">PDF format (max 20MB)</p>
                      </div>
                    )}
                  </label>
                </div>
                {invoicePDF && (
                  <div className="bg-purple-50 border border-purple-200 rounded p-3 text-sm">
                    <div className="flex items-start gap-2">
                      <Zap className="w-4 h-4 text-purple-600 mt-0.5" />
                      <div className="text-purple-900">
                        <p className="font-medium">AI will extract:</p>
                        <ul className="list-disc list-inside text-xs mt-1 text-purple-700">
                          <li>Consignment ID / Tracking numbers</li>
                          <li>Amount collected from customer</li>
                          <li>Delivery charges</li>
                          <li>COD charges</li>
                          <li>Disbursed amounts</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bank Details Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <DollarSign className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold">Bank Deposit Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Reference Number *</Label>
                  <Input
                    placeholder="BK-20260221-001"
                    value={newCollection.bank_reference}
                    onChange={(e) => setNewCollection({...newCollection, bank_reference: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Bank Deposit Date *</Label>
                  <Input
                    type="date"
                    value={newCollection.bank_date}
                    onChange={(e) => setNewCollection({...newCollection, bank_date: e.target.value})}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>Amount Received in Bank (BDT) *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newCollection.bank_amount}
                    onChange={(e) => setNewCollection({...newCollection, bank_amount: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setAddCollectionOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleProcessWithAI}
                disabled={!invoicePDF || processingAI}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Zap className="w-4 h-4 mr-2" />
                {processingAI ? 'Processing...' : 'Process & Preview'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details / Preview Modal */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCollection?.id === 'temp' ? 'Preview & Confirm' : 'Collection Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedCollection?.ai_processed && 'AI has matched orders with tracking numbers'}
            </DialogDescription>
          </DialogHeader>

          {selectedCollection && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Invoice Total</p>
                    <p className="text-2xl font-bold">৳{selectedCollection.total_disbursed.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Bank Amount</p>
                    <p className="text-2xl font-bold text-green-600">৳{selectedCollection.bank_amount.toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <p className="text-sm text-gray-600">Difference</p>
                    <p className={`text-2xl font-bold ${
                      selectedCollection.bank_amount === selectedCollection.total_disbursed 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      ৳{Math.abs(selectedCollection.bank_amount - selectedCollection.total_disbursed).toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Matched Orders */}
              {selectedCollection.matched_orders && (
                <div>
                  <h3 className="font-semibold mb-3">Matched Orders ({selectedCollection.matched_orders.length})</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Status</TableHead>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Tracking #</TableHead>
                          <TableHead>Collected</TableHead>
                          <TableHead>Delivery</TableHead>
                          <TableHead>COD Fee</TableHead>
                          <TableHead>Disbursed</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedCollection.matched_orders.map((order, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {order.status === 'matched' && (
                                <Badge variant="default" className="bg-green-100 text-green-700 border-green-300">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Matched
                                </Badge>
                              )}
                              {order.status === 'not_found' && (
                                <Badge variant="destructive">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  Not Found
                                </Badge>
                              )}
                              {order.status === 'already_updated' && (
                                <Badge variant="secondary">
                                  Already Updated
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{order.woo_order_id || '-'}</TableCell>
                            <TableCell className="font-mono text-sm">{order.tracking_number}</TableCell>
                            <TableCell>৳{order.collected_amount.toLocaleString()}</TableCell>
                            <TableCell>৳{order.delivery_charge}</TableCell>
                            <TableCell>৳{order.cod_charge}</TableCell>
                            <TableCell className="font-bold">৳{order.disbursed_amount.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {selectedCollection.id === 'temp' && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveCollection} className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm & Update Orders
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Collection Detail Full-Page View */}
      {detailPageOpen && selectedCollection && (
        <CollectionDetailPage
          collection={selectedCollection}
          onClose={() => setDetailPageOpen(false)}
        />
      )}
    </div>
  );
}

interface CollectionDetailPageProps {
  collection: CollectionRecord;
  onClose: () => void;
}

function CollectionDetailPage({ collection, onClose }: CollectionDetailPageProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const matched = collection.matched_orders || [];
  const filtered = matched.filter(o => {
    const matchesSearch =
      o.woo_order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.tracking_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalCollected = matched.reduce((s, o) => s + o.collected_amount, 0);
  const totalDelivery = matched.reduce((s, o) => s + o.delivery_charge, 0);
  const totalCOD = matched.reduce((s, o) => s + o.cod_charge, 0);
  const totalDisbursed = matched.reduce((s, o) => s + o.disbursed_amount, 0);
  const matchedCount = matched.filter(o => o.status === 'matched').length;
  const notFoundCount = matched.filter(o => o.status === 'not_found').length;
  const alreadyCount = matched.filter(o => o.status === 'already_updated').length;

  const statusColor = collection.status === 'verified'
    ? 'text-green-600 bg-green-50 border-green-200'
    : collection.status === 'discrepancy'
    ? 'text-red-600 bg-red-50 border-red-200'
    : 'text-orange-600 bg-orange-50 border-orange-200';

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Collections
            </Button>
            <div className="h-5 w-px bg-gray-300" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-semibold">{collection.invoice_number}</h1>
                <Badge
                  className={`border ${
                    collection.status === 'verified'
                      ? 'bg-green-100 text-green-700 border-green-300'
                      : collection.status === 'discrepancy'
                      ? 'bg-red-100 text-red-700 border-red-300'
                      : 'bg-orange-100 text-orange-700 border-orange-300'
                  }`}
                >
                  {collection.status === 'verified' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                  {collection.status === 'discrepancy' && <AlertCircle className="w-3 h-3 mr-1" />}
                  {collection.status.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-gray-500">{collection.courier_name} · Invoice Date: {new Date(collection.invoice_date).toLocaleDateString('en-GB')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-blue-100 bg-blue-50/40">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-600">Total Orders</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">{matched.length}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{matchedCount} matched</span>
                {notFoundCount > 0 && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{notFoundCount} not found</span>}
                {alreadyCount > 0 && <span className="text-xs bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">{alreadyCount} already updated</span>}
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-100 bg-green-50/40">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-600">Total Collected (COD)</p>
              </div>
              <p className="text-2xl font-bold text-green-700">৳{totalCollected.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">From customers</p>
            </CardContent>
          </Card>

          <Card className="border-orange-100 bg-orange-50/40">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Truck className="w-4 h-4 text-orange-600" />
                <p className="text-xs text-gray-600">Courier Charges</p>
              </div>
              <p className="text-2xl font-bold text-orange-700">৳{(totalDelivery + totalCOD).toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Delivery + COD fees</p>
            </CardContent>
          </Card>

          <Card className="border-purple-100 bg-purple-50/40">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <CreditCard className="w-4 h-4 text-purple-600" />
                <p className="text-xs text-gray-600">Net Disbursed</p>
              </div>
              <p className="text-2xl font-bold text-purple-700">৳{totalDisbursed.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">Received in bank</p>
            </CardContent>
          </Card>
        </div>

        {/* Invoice & Bank Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Invoice Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Invoice Number</span>
                <span className="font-medium">{collection.invoice_number}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Courier</span>
                <span className="font-medium">{collection.courier_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Invoice Date</span>
                <span className="font-medium">{new Date(collection.invoice_date).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Disbursed (Invoice)</span>
                <span className="font-bold">৳{collection.total_disbursed.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">AI Processed</span>
                <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700 text-xs">
                  <Zap className="w-3 h-3 mr-1" />
                  Yes
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-green-600" />
                Bank Deposit Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Bank Reference</span>
                <span className="font-medium font-mono">{collection.bank_reference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Deposit Date</span>
                <span className="font-medium">{new Date(collection.bank_date).toLocaleDateString('en-GB')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Amount Received</span>
                <span className="font-bold text-green-700">৳{collection.bank_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Difference</span>
                <span className={`font-bold ${collection.bank_amount === collection.total_disbursed ? 'text-green-600' : 'text-red-600'}`}>
                  {collection.bank_amount === collection.total_disbursed ? '৳0 (Balanced)' : `৳${Math.abs(collection.bank_amount - collection.total_disbursed).toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Created By</span>
                <span className="font-medium">{collection.created_by}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Orders Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Orders Paid in This Invoice
                <Badge variant="outline" className="ml-1">{matched.length} orders</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search order / tracking..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-8 w-56 h-8 text-sm"
                  />
                </div>
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="matched">Matched</option>
                  <option value="not_found">Not Found</option>
                  <option value="already_updated">Already Updated</option>
                </select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="pl-4">#</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Tracking Number</TableHead>
                    <TableHead className="text-right">Collected (COD)</TableHead>
                    <TableHead className="text-right">Delivery Fee</TableHead>
                    <TableHead className="text-right">COD Fee</TableHead>
                    <TableHead className="text-right">Net Disbursed</TableHead>
                    <TableHead className="text-right">Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50">
                      <TableCell className="pl-4 text-gray-400 text-sm">{idx + 1}</TableCell>
                      <TableCell>
                        {order.status === 'matched' && (
                          <Badge variant="outline" className="bg-green-50 border-green-300 text-green-700 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Matched
                          </Badge>
                        )}
                        {order.status === 'not_found' && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Not Found
                          </Badge>
                        )}
                        {order.status === 'already_updated' && (
                          <Badge variant="secondary" className="text-xs">
                            Already Updated
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-blue-600">{order.woo_order_id || '—'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{order.tracking_number}</span>
                      </TableCell>
                      <TableCell className="text-right font-medium">৳{order.collected_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-orange-600">-৳{order.delivery_charge}</TableCell>
                      <TableCell className="text-right text-orange-600">-৳{order.cod_charge}</TableCell>
                      <TableCell className="text-right font-bold text-green-700">৳{order.disbursed_amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${order.match_confidence >= 95 ? 'bg-green-500' : order.match_confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${order.match_confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{order.match_confidence}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No orders match your search
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Totals row */}
            {filtered.length > 0 && (
              <div className="border-t bg-gray-50 px-4 py-3 flex justify-end gap-8 text-sm">
                <div className="text-right">
                  <p className="text-gray-500 text-xs">Total Collected</p>
                  <p className="font-bold">৳{filtered.reduce((s, o) => s + o.collected_amount, 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs">Total Charges</p>
                  <p className="font-bold text-orange-600">-৳{filtered.reduce((s, o) => s + o.delivery_charge + o.cod_charge, 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs">Net Disbursed</p>
                  <p className="font-bold text-green-700">৳{filtered.reduce((s, o) => s + o.disbursed_amount, 0).toLocaleString()}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}