import { Link } from "react-router";
import { FileText, Package, CheckSquare, Truck, RotateCcw, MapPin, Printer, Scan, Camera, Microscope, Check } from "lucide-react";
import { orders } from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { useState, useEffect, useRef } from "react";
import { PickModal } from "./PickModal";
import { Invoice } from "./Invoice";
import { LabInvoice } from "./LabInvoice";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { PackingSlipTemplate } from "./PackingSlipTemplate";
import { assignRecommendedLotsToOrder } from "../../utils/fifoLogic";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { BarcodeScanner } from "../BarcodeScanner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import type { Order, OrderItem } from "../../data/mockData";

type StatusType = 'not_printed' | 'printed' | 'packed' | 'send_to_lab';

export function Operations() {
  const [selectedStatus, setSelectedStatus] = useState<StatusType>('not_printed');
  const [pickModalOpen, setPickModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<OrderItem[]>([]);
  
  // Lab invoice state
  const [labInvoiceModalOpen, setLabInvoiceModalOpen] = useState(false);
  const [labInvoiceOrder, setLabInvoiceOrder] = useState<Order | null>(null);
  const [labInvoiceItems, setLabInvoiceItems] = useState<OrderItem[]>([]);
  
  // Picked orders tracking
  const [pickedOrders, setPickedOrders] = useState<Map<string, { items: OrderItem[], isPartial: boolean }>>(new Map());
  
  // Barcode scanning state
  const [barcodeBuffer, setBarcodeBuffer] = useState('');
  const barcodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [cameraScannerOpen, setCameraScannerOpen] = useState(false);

  // PDF generation state and refs
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [currentPDFOrder, setCurrentPDFOrder] = useState<Order | null>(null);
  const invoiceTemplateRef = useRef<HTMLDivElement>(null);
  const packingSlipTemplateRef = useRef<HTMLDivElement>(null);
  
  // Track orders marked as printed
  const [markedAsPrintedOrders, setMarkedAsPrintedOrders] = useState<Set<string>>(new Set());

  // Global barcode scanner listener
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Enter key means barcode scan is complete
      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        handleBarcodeScanned(barcodeBuffer);
        setBarcodeBuffer('');
        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
        }
        return;
      }

      // Add character to buffer
      if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);
        
        // Clear buffer after 100ms of no input (barcode scanners are fast)
        if (barcodeTimeoutRef.current) {
          clearTimeout(barcodeTimeoutRef.current);
        }
        barcodeTimeoutRef.current = setTimeout(() => {
          setBarcodeBuffer('');
        }, 100);
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => {
      window.removeEventListener('keypress', handleKeyPress);
      if (barcodeTimeoutRef.current) {
        clearTimeout(barcodeTimeoutRef.current);
      }
    };
  }, [barcodeBuffer]);

  const handleBarcodeScanned = (barcode: string) => {
    // Find order by WooCommerce order ID
    const order = orders.find(o => o.woo_order_id === barcode);
    
    if (order) {
      // Check if order is in "printed" status (ready for picking)
      if (order.cs_status === 'printed') {
        toast.success(`Order ${barcode} scanned! Opening pick modal...`);
        handleStartPick(order);
      } else if (order.cs_status === 'not_printed') {
        toast.info(`Order ${barcode} found but not yet printed. Please print invoice first.`);
      } else {
        toast.info(`Order ${barcode} is currently in status: ${order.cs_status}`);
      }
    }
    // If not found as order ID, ignore (might be item barcode)
  };

  // Orders ready for operations
  const notPrintedOrders = orders.filter(o => o.cs_status === 'not_printed');
  const printedOrders = orders.filter(o => o.cs_status === 'printed');
  const packedOrders = orders.filter(o => o.cs_status === 'packed');
  const sendToLabOrders = orders.filter(o => o.cs_status === 'send_to_lab');

  const handleCardClick = (status: StatusType) => {
    setSelectedStatus(status);
  };

  const getStatusOrders = () => {
    switch (selectedStatus) {
      case 'not_printed':
        return notPrintedOrders;
      case 'printed':
        return printedOrders;
      case 'packed':
        return packedOrders;
      case 'send_to_lab':
        return sendToLabOrders;
      default:
        return [];
    }
  };

  const getStatusTitle = () => {
    switch (selectedStatus) {
      case 'not_printed':
        return 'Orders Awaiting Invoice Print';
      case 'printed':
        return 'Printed Orders - Ready to Pick & Pack';
      case 'packed':
        return 'Packed Orders - Ready to Ship';
      case 'send_to_lab':
        return 'Orders to Send to Lab';
      default:
        return '';
    }
  };

  const getStatusIcon = () => {
    switch (selectedStatus) {
      case 'not_printed':
        return <FileText className="w-5 h-5 text-red-600" />;
      case 'printed':
        return <Package className="w-5 h-5 text-blue-600" />;
      case 'packed':
        return <Truck className="w-5 h-5 text-green-600" />;
      case 'send_to_lab':
        return <Package className="w-5 h-5 text-purple-600" />;
      default:
        return null;
    }
  };

  const handlePrintInvoice = (order: Order) => {
    // Assign FIFO lots to order items
    const itemsWithLots = assignRecommendedLotsToOrder(order.items);
    setInvoiceOrder(order);
    setInvoiceItems(itemsWithLots);
    setInvoiceModalOpen(true);
    toast.success(`Invoice preview for ${order.woo_order_id}`);
  };

  const handlePrintLabInvoice = (order: Order) => {
    // Assign FIFO lots to order items
    const itemsWithLots = assignRecommendedLotsToOrder(order.items);
    setLabInvoiceOrder(order);
    setLabInvoiceItems(itemsWithLots);
    setLabInvoiceModalOpen(true);
    toast.success(`Lab invoice preview for ${order.woo_order_id}`);
  };

  const handleStartPick = (order: Order) => {
    // Assign FIFO lots to order items
    const itemsWithLots = assignRecommendedLotsToOrder(order.items);
    setSelectedOrder({ ...order, items: itemsWithLots });
    setPickModalOpen(true);
  };

  const handlePickComplete = (pickedItems: OrderItem[]) => {
    if (!selectedOrder) return;
    
    // Check if all items were picked
    const totalItems = selectedOrder.items.length;
    const pickedCount = pickedItems.filter(item => item.scanned).length;
    const isPartial = pickedCount < totalItems;
    
    // Check for discrepancies
    const discrepancies = pickedItems.filter(item => item.pick_discrepancy);
    
    if (isPartial) {
      toast.warning(
        `Partial pick completed: ${pickedCount}/${totalItems} items picked. Order ready for packing.`,
        { duration: 5000 }
      );
    } else if (discrepancies.length > 0) {
      toast.warning(
        `Pick completed with ${discrepancies.length} FIFO discrepancy(ies). Manager has been notified.`,
        { duration: 5000 }
      );
    } else {
      toast.success(`All items picked correctly using FIFO! Order ${selectedOrder.woo_order_id} ready for packing.`);
    }

    // Track picked order
    setPickedOrders(prev => new Map(prev).set(selectedOrder.order_id, { items: pickedItems, isPartial }));
    
    setPickModalOpen(false);
    setSelectedOrder(null);
  };

  const handlePackOrder = (order: Order) => {
    const pickedData = pickedOrders.get(order.order_id);
    if (!pickedData) {
      toast.error('This order has not been picked yet');
      return;
    }
    
    // Mark as packed
    toast.success(`Order ${order.woo_order_id} marked as packed and ready to ship`);
    
    // Remove from picked orders
    setPickedOrders(prev => {
      const newMap = new Map(prev);
      newMap.delete(order.order_id);
      return newMap;
    });
  };

  const handleGenerateInvoicePDF = async (order: Order) => {
    setCurrentPDFOrder(order);
    setIsGeneratingPDF(true);
    toast.info("Generating invoice PDF...");
    
    // Wait for the template to render
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      if (!invoiceTemplateRef.current) {
        throw new Error("Invoice template ref not found");
      }

      const canvas = await html2canvas(invoiceTemplateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        windowHeight: 1123,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`Invoice_${order.woo_order_id}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success("Invoice PDF generated successfully!");
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice PDF");
    } finally {
      setIsGeneratingPDF(false);
      setCurrentPDFOrder(null);
    }
  };

  const handleGeneratePackingSlipPDF = async (order: Order) => {
    setCurrentPDFOrder(order);
    setIsGeneratingPDF(true);
    toast.info("Generating packing slip PDF...");
    
    // Wait for the template to render
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      if (!packingSlipTemplateRef.current) {
        throw new Error("Packing slip template ref not found");
      }

      const canvas = await html2canvas(packingSlipTemplateRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 794,
        windowHeight: 1123,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 0;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      pdf.save(`PackingSlip_${order.woo_order_id}_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success("Packing slip PDF generated successfully!");
    } catch (error) {
      console.error("Error generating packing slip:", error);
      toast.error("Failed to generate packing slip PDF");
    } finally {
      setIsGeneratingPDF(false);
      setCurrentPDFOrder(null);
    }
  };

  const handleMarkAsPrinted = (order: Order) => {
    setMarkedAsPrintedOrders(prev => new Set(prev).add(order.order_id));
    toast.success(`Order ${order.woo_order_id} marked as printed!`);
  };

  const statusOrders = getStatusOrders();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Operations</h1>
        <p className="text-gray-600 mt-1">Warehouse operations: Print, Pick, Pack, Ship & Receive Returns</p>
        {/* Barcode Scanner Indicator */}
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-blue-600">
            <Scan className="w-4 h-4" />
            <span>Barcode scanner ready - Scan order barcode to start picking</span>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => setCameraScannerOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Camera className="w-4 h-4 mr-2" />
            Open Barcode Scanner
          </Button>
        </div>
      </div>

      {/* Clickable Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Not Printed Card */}
        <Card 
          className={`cursor-pointer transition-all hover:scale-[1.02] ${
            selectedStatus === 'not_printed' 
              ? 'shadow-lg ring-2 ring-red-500 ring-offset-2' 
              : 'hover:shadow-md'
          }`}
          onClick={() => handleCardClick('not_printed')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Not Printed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-red-600">{notPrintedOrders.length}</div>
            <p className="text-xs text-gray-600 mt-1">Need invoice printing</p>
          </CardContent>
        </Card>

        {/* Printed Card */}
        <Card 
          className={`cursor-pointer transition-all hover:scale-[1.02] ${
            selectedStatus === 'printed' 
              ? 'shadow-lg ring-2 ring-blue-500 ring-offset-2' 
              : 'hover:shadow-md'
          }`}
          onClick={() => handleCardClick('printed')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Printed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-blue-600">{printedOrders.length}</div>
            <p className="text-xs text-gray-600 mt-1">Ready to pick & pack</p>
          </CardContent>
        </Card>

        {/* Packed Card */}
        <Card 
          className={`cursor-pointer transition-all hover:scale-[1.02] ${
            selectedStatus === 'packed' 
              ? 'shadow-lg ring-2 ring-green-500 ring-offset-2' 
              : 'hover:shadow-md'
          }`}
          onClick={() => handleCardClick('packed')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckSquare className="w-4 h-4" />
              Packed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-green-600">{packedOrders.length}</div>
            <p className="text-xs text-gray-600 mt-1">Ready to ship</p>
          </CardContent>
        </Card>

        {/* Send to Lab Card */}
        <Card 
          className={`cursor-pointer transition-all hover:scale-[1.02] ${
            selectedStatus === 'send_to_lab' 
              ? 'shadow-lg ring-2 ring-purple-500 ring-offset-2' 
              : 'hover:shadow-md'
          }`}
          onClick={() => handleCardClick('send_to_lab')}
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Send to Lab
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold text-purple-600">{sendToLabOrders.length}</div>
            <p className="text-xs text-gray-600 mt-1">Custom prescriptions</p>
          </CardContent>
        </Card>
      </div>

      {/* Selected Status Orders Table */}
      {statusOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              {getStatusTitle()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  {selectedStatus === 'not_printed' && <TableHead>Total</TableHead>}
                  {selectedStatus === 'not_printed' && <TableHead>Address</TableHead>}
                  {selectedStatus === 'packed' && <TableHead>Address</TableHead>}
                  {selectedStatus === 'packed' && <TableHead>Payment</TableHead>}
                  {selectedStatus === 'send_to_lab' && <TableHead>Notes</TableHead>}
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusOrders.map((order) => (
                  <TableRow key={order.order_id}>
                    <TableCell className="font-medium">
                      <Link to={`/fulfilment/orders/${order.order_id}`} className="hover:underline text-blue-600">
                        {order.woo_order_id}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{order.customer_name}</p>
                        <p className="text-xs text-gray-600">{order.customer_phone}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {selectedStatus === 'not_printed' ? (
                        <span>{order.items.length} items</span>
                      ) : (
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="text-sm">
                              <span className="font-medium">{item.quantity}x</span> {item.sku_name}
                            </div>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    {selectedStatus === 'not_printed' && (
                      <>
                        <TableCell className="font-medium">৳{order.total.toFixed(2)}</TableCell>
                        <TableCell className="text-sm text-gray-600">{order.shipping_address}</TableCell>
                      </>
                    )}
                    {selectedStatus === 'packed' && (
                      <>
                        <TableCell className="text-sm">{order.shipping_address}</TableCell>
                        <TableCell>
                          <Badge variant={order.payment_method === 'COD' ? 'default' : 'outline'}>
                            {order.payment_method}
                          </Badge>
                        </TableCell>
                      </>
                    )}
                    {selectedStatus === 'send_to_lab' && (
                      <TableCell className="text-sm text-gray-600">{order.notes}</TableCell>
                    )}
                    <TableCell>
                      <div className="flex gap-2">
                        {selectedStatus === 'not_printed' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleGenerateInvoicePDF(order)}
                              disabled={isGeneratingPDF}
                              title="Print Invoice"
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleGeneratePackingSlipPDF(order)}
                              disabled={isGeneratingPDF}
                              title="Print Packing Slip"
                            >
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleMarkAsPrinted(order)}
                              disabled={markedAsPrintedOrders.has(order.order_id)}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                            >
                              <Check className="w-4 h-4" />
                              {markedAsPrintedOrders.has(order.order_id) ? 'Printed' : 'Mark As Printed'}
                            </Button>
                          </>
                        )}
                        {selectedStatus === 'printed' && (
                          <>
                            {pickedOrders.has(order.order_id) ? (
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant="outline" 
                                  className={pickedOrders.get(order.order_id)?.isPartial ? "bg-yellow-50 border-yellow-300 text-yellow-700" : "bg-green-50 border-green-300 text-green-700"}
                                >
                                  {pickedOrders.get(order.order_id)?.isPartial ? "Partial Picked" : "Picked"}
                                </Badge>
                                {/* If partial, show both Start Pick and Pack buttons */}
                                {pickedOrders.get(order.order_id)?.isPartial && (
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleStartPick(order)}
                                    className="flex items-center gap-1 border-blue-300 text-blue-700 hover:bg-blue-50"
                                  >
                                    <Scan className="w-4 h-4" />
                                    Continue Pick
                                  </Button>
                                )}
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => handlePackOrder(order)}
                                  className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                                >
                                  <CheckSquare className="w-4 h-4" />
                                  Pack
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="default" 
                                size="sm"
                                onClick={() => handleStartPick(order)}
                                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700"
                              >
                                <Scan className="w-4 h-4" />
                                Start Pick
                              </Button>
                            )}
                          </>
                        )}
                        {selectedStatus === 'packed' && (
                          <Button 
                            variant="default" 
                            size="sm"
                            onClick={() => handlePackOrder(order)}
                            className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
                          >
                            <Truck className="w-4 h-4" />
                            Mark as Shipped
                          </Button>
                        )}
                        {selectedStatus === 'send_to_lab' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handlePrintLabInvoice(order)}
                              className="flex items-center gap-1"
                            >
                              <Printer className="w-4 h-4" />
                              Print Lab Invoice
                            </Button>
                            <Button 
                              variant="default" 
                              size="sm"
                              onClick={() => handleStartPick(order)}
                              className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700"
                            >
                              <Scan className="w-4 h-4" />
                              Pick for Lab
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle>Quick Access</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-24 flex flex-col gap-2" asChild>
              <Link to="/returns">
                <RotateCcw className="w-6 h-6" />
                <span>Receive Returns</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2" asChild>
              <Link to="/inventory/receive">
                <Package className="w-6 h-6" />
                <span>Receive Shipments</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-24 flex flex-col gap-2" asChild>
              <Link to="/fulfilment/orders">
                <FileText className="w-6 h-6" />
                <span>All Orders</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Modal */}
      {invoiceModalOpen && invoiceOrder && (
        <Dialog open={invoiceModalOpen} onOpenChange={setInvoiceModalOpen}>
          <DialogContent className="max-w-[210mm] max-h-[95vh] overflow-y-auto p-0">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle>Invoice with Picking List - {invoiceOrder.woo_order_id}</DialogTitle>
            </DialogHeader>
            {/* A4 Paper Container */}
            <div className="bg-white p-8 min-h-[297mm]">
              <Invoice order={invoiceOrder} itemsWithLots={invoiceItems} />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setInvoiceModalOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                window.print();
                toast.success('Invoice sent to printer');
              }}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Lab Invoice Modal */}
      {labInvoiceModalOpen && labInvoiceOrder && (
        <Dialog open={labInvoiceModalOpen} onOpenChange={setLabInvoiceModalOpen}>
          <DialogContent className="max-w-[210mm] max-h-[95vh] overflow-y-auto p-0">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle>Lab Work Order - {labInvoiceOrder.woo_order_id}</DialogTitle>
            </DialogHeader>
            {/* A4 Paper Container */}
            <div className="bg-white p-8 min-h-[297mm]">
              <LabInvoice order={labInvoiceOrder} itemsWithLots={labInvoiceItems} />
            </div>
            <div className="flex justify-end gap-2 p-4 border-t bg-gray-50">
              <Button variant="outline" onClick={() => setLabInvoiceModalOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                window.print();
                toast.success('Lab invoice sent to printer');
              }}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Pick Modal */}
      {selectedOrder && (
        <PickModal
          isOpen={pickModalOpen}
          onClose={() => {
            setPickModalOpen(false);
            setSelectedOrder(null);
          }}
          orderItems={selectedOrder.items}
          orderId={selectedOrder.order_id}
          wooOrderId={selectedOrder.woo_order_id}
          onPickComplete={handlePickComplete}
        />
      )}

      {/* Barcode Scanner */}
      <BarcodeScanner
        isOpen={cameraScannerOpen}
        onClose={() => setCameraScannerOpen(false)}
        onScan={handleBarcodeScanned}
        title="Scan Order Barcode"
        description="Point your camera at the order barcode on the printed invoice"
      />

      {/* Hidden PDF Templates */}
      {currentPDFOrder && (
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
          {/* Invoice Template */}
          <InvoiceTemplate
            ref={invoiceTemplateRef}
            orderId={currentPDFOrder.woo_order_id}
            orderDate={new Date(currentPDFOrder.date).toLocaleDateString('en-GB')}
            invoiceNumber={`149${currentPDFOrder.woo_order_id.slice(-4)}`}
            invoiceDate={new Date().toLocaleDateString('en-GB')}
            customerName={currentPDFOrder.customer_name}
            customerPhone={currentPDFOrder.customer_phone}
            customerAddress={currentPDFOrder.shipping_address}
            customerDistrict={currentPDFOrder.district || ''}
            items={currentPDFOrder.items.map(item => ({
              sku: item.sku,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            }))}
            subtotal={currentPDFOrder.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}
            shippingFee={currentPDFOrder.shipping_fee || 0}
            discount={currentPDFOrder.discount || 0}
            lensPrice={currentPDFOrder.lens_price || 0}
            total={currentPDFOrder.total}
            paymentMethod={currentPDFOrder.payment_method}
            prescriptionType={currentPDFOrder.prescription_type}
            lensType={currentPDFOrder.lens_type}
            customLensType={currentPDFOrder.custom_lens_type}
            prescription={currentPDFOrder.prescription_type ? {
              rightSph: currentPDFOrder.right_sph || '',
              rightCyl: currentPDFOrder.right_cyl || '',
              rightAxis: currentPDFOrder.right_axis || '',
              rightPd: currentPDFOrder.right_pd || '',
              leftSph: currentPDFOrder.left_sph || '',
              leftCyl: currentPDFOrder.left_cyl || '',
              leftAxis: currentPDFOrder.left_axis || '',
              leftPd: currentPDFOrder.left_pd || '',
            } : undefined}
          />
          
          {/* Packing Slip Template */}
          <PackingSlipTemplate
            ref={packingSlipTemplateRef}
            orderId={currentPDFOrder.woo_order_id}
            orderDate={new Date(currentPDFOrder.date).toLocaleDateString('en-GB')}
            customerName={currentPDFOrder.customer_name}
            customerPhone={currentPDFOrder.customer_phone}
            customerAddress={currentPDFOrder.shipping_address}
            customerDistrict={currentPDFOrder.district || ''}
            items={currentPDFOrder.items.map(item => ({
              sku: item.sku,
              name: item.name,
              quantity: item.quantity,
              serialNumber: item.serial_number || `${item.sku}-LOT-${Math.floor(Math.random() * 1000)}`,
              pickLocation: `${String.fromCharCode(65 + Math.floor(Math.random() * 5))}${Math.floor(Math.random() * 20) + 1}`,
            }))}
            courierCompany={currentPDFOrder.courier_company || 'Steadfast'}
            paymentMethod={currentPDFOrder.payment_method}
            prescriptionType={currentPDFOrder.prescription_type}
            lensType={currentPDFOrder.lens_type}
            customLensType={currentPDFOrder.custom_lens_type}
            prescription={currentPDFOrder.prescription_type ? {
              rightSph: currentPDFOrder.right_sph || '',
              rightCyl: currentPDFOrder.right_cyl || '',
              rightAxis: currentPDFOrder.right_axis || '',
              rightPd: currentPDFOrder.right_pd || '',
              leftSph: currentPDFOrder.left_sph || '',
              leftCyl: currentPDFOrder.left_cyl || '',
              leftAxis: currentPDFOrder.left_axis || '',
              leftPd: currentPDFOrder.left_pd || '',
            } : undefined}
            lensCharge={currentPDFOrder.lens_charge || 0}
            fittingCharge={currentPDFOrder.fitting_charge || 0}
          />
        </div>
      )}
    </div>
  );
}