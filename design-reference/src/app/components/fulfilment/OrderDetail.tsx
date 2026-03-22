import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, Phone, MapPin, CreditCard, Calendar, Plus, Trash2, Save, X, PhoneCall, Upload, FileText, AlertCircle, CheckCircle, Clock, Package, MessageSquare, Printer, CreditCard as Edit2, Download } from "lucide-react";
import { orders, currentUser, users, packagingMaterials, type OrderPackagingMaterial } from "../../data/mockData";
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
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { PackingSlipTemplate } from "./PackingSlipTemplate";
import { useAppSettings } from "../../store/appSettings";

interface CallLog {
  timestamp: string;
  note: string;
  user: string;
}

interface OrderLog {
  timestamp: string;
  action: string;
  user: string;
  details?: string;
}

export function OrderDetail() {
  const { id } = useParams();
  const [appSettings] = useAppSettings();
  const navigate = useNavigate();
  const order = orders.find(o => o.order_id === id);
  
  // CS Assignment
  const [assignedTo, setAssignedTo] = useState(order?.assigned_to || '');
  const [assignedToName, setAssignedToName] = useState(order?.assigned_to_name || '');
  const [confirmedBy, setConfirmedBy] = useState(order?.confirmed_by || '');

  // Order state
  const [csStatus, setCsStatus] = useState(order?.cs_status || '');
  const [customerName, setCustomerName] = useState(order?.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(order?.customer_phone || '');
  const [customerAddress, setCustomerAddress] = useState(order?.shipping_address || '');
  const [customerDistrict, setCustomerDistrict] = useState('Dhaka');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(order?.payment_method || 'COD');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'unpaid' | 'paid'>('unpaid');
  
  // Courier info
  const [courierCompany, setCourierCompany] = useState('Pathao');
  const [courierArea, setCourierArea] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [totalReceivable, setTotalReceivable] = useState(order?.total || 0);
  const [collectedAmount, setCollectedAmount] = useState(order?.collected_amount || 0);
  const [deliveryCharge, setDeliveryCharge] = useState(order?.delivery_charge || 60);
  
  // Order actions
  const [selectedAction, setSelectedAction] = useState<string>('');
  const [cancelReason, setCancelReason] = useState('');
  const [exchangeOrderId, setExchangeOrderId] = useState('');
  const [confirmationType, setConfirmationType] = useState('');
  const [courierEntryMethod, setCourierEntryMethod] = useState('');
  const [isProcessingAPI, setIsProcessingAPI] = useState(false);
  const [refundAmount, setRefundAmount] = useState(0);
  
  // Order source
  const [orderSource, setOrderSource] = useState('website');
  const [conversationUrl, setConversationUrl] = useState('');
  const [metaScreenshot, setMetaScreenshot] = useState<File | null>(null);
  
  // Notes and logs
  const [orderNotes, setOrderNotes] = useState(order?.notes || '');
  const [noteInput, setNoteInput] = useState('');
  const [callNote, setCallNote] = useState('');
  const [callLogs, setCallLogs] = useState<CallLog[]>([
    { timestamp: '2026-02-25 10:30 AM', note: 'Initial call - customer confirmed order', user: 'Sarah Chen' }
  ]);
  const [callAttempts, setCallAttempts] = useState(1);
  const [activityLog, setActivityLog] = useState<OrderLog[]>([
    { timestamp: order?.created_date || '', action: 'Order created from WooCommerce', user: 'System' },
  ]);
  
  // SMS
  const [smsMessage, setSmsMessage] = useState('');
  const [smsRecipient, setSmsRecipient] = useState(order?.customer_phone || '');
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  
  // Line items
  const [orderItems, setOrderItems] = useState(order?.items || []);
  const [shippingFee, setShippingFee] = useState(60);
  const [discount, setDiscount] = useState(0);
  const [isEditingItems, setIsEditingItems] = useState(false);
  
  // Additional lens
  const [prescriptionType, setPrescriptionType] = useState('');
  const [lensType, setLensType] = useState('');
  const [customLensType, setCustomLensType] = useState('');
  const [lensPrice, setLensPrice] = useState(0);
  const [prescription, setPrescription] = useState<File | null>(null);
  const [lensCharge, setLensCharge] = useState(0);
  const [fittingCharge, setFittingCharge] = useState(0);
  
  // Prescription fields for each eye
  const [rightSph, setRightSph] = useState('');
  const [rightCyl, setRightCyl] = useState('');
  const [rightAxis, setRightAxis] = useState('');
  const [rightPd, setRightPd] = useState('');
  const [leftSph, setLeftSph] = useState('');
  const [leftCyl, setLeftCyl] = useState('');
  const [leftAxis, setLeftAxis] = useState('');
  const [leftPd, setLeftPd] = useState('');
  
  // UI state
  const [lateDeliveryDate, setLateDeliveryDate] = useState(order?.late_delivery_date || '');
  const [selectedPartialItems, setSelectedPartialItems] = useState<string[]>([]);
  
  // Packaging materials
  const [orderPackagingMaterials, setOrderPackagingMaterials] = useState<OrderPackagingMaterial[]>(order?.packaging_materials || []);
  const [showPackagingDialog, setShowPackagingDialog] = useState(false);
  const [selectedPackagingSku, setSelectedPackagingSku] = useState('');
  const [packagingQuantity, setPackagingQuantity] = useState(1);
  
  // Invoice and Packing Slip generation
  const invoiceRef = useRef<HTMLDivElement>(null);
  const packingSlipRef = useRef<HTMLDivElement>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isGeneratingPackingSlip, setIsGeneratingPackingSlip] = useState(false);

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/fulfilment/orders')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-semibold">Order Not Found</h1>
        </div>
      </div>
    );
  }

  const handleFieldUpdate = (field: string, value: any) => {
    const log: OrderLog = {
      timestamp: new Date().toLocaleString(),
      action: `Updated ${field}`,
      user: currentUser.name,
      details: `Changed to: ${value}`
    };
    setActivityLog([log, ...activityLog]);
    toast.success(`${field} updated`);
  };

  const handleAddNote = () => {
    if (!noteInput.trim()) {
      toast.error("Please enter a note");
      return;
    }
    const newNotes = orderNotes ? `${orderNotes}\n\n[${new Date().toLocaleString()} - ${currentUser.name}]\n${noteInput}` : `[${new Date().toLocaleString()} - ${currentUser.name}]\n${noteInput}`;
    setOrderNotes(newNotes);
    setNoteInput('');
    
    const log: OrderLog = {
      timestamp: new Date().toLocaleString(),
      action: 'Note added',
      user: currentUser.name,
      details: noteInput
    };
    setActivityLog([log, ...activityLog]);
    toast.success("Note logged successfully");
  };

  const handleAddCall = () => {
    if (!callNote.trim()) {
      toast.error("Please add a call note");
      return;
    }
    const newLog: CallLog = {
      timestamp: new Date().toLocaleString(),
      note: callNote,
      user: currentUser.name
    };
    setCallLogs([newLog, ...callLogs]);
    setCallAttempts(callAttempts + 1);
    setCallNote('');
    
    const actLog: OrderLog = {
      timestamp: new Date().toLocaleString(),
      action: `Call attempt #${callAttempts + 1}`,
      user: currentUser.name,
      details: callNote
    };
    setActivityLog([actLog, ...activityLog]);
    
    toast.success("Call log added");
  };

  const handleMakeCall = () => {
    // Open phone dialer with customer phone number
    window.location.href = `tel:${customerPhone}`;
  };

  const handleActionSubmit = () => {
    if (selectedAction === 'cbd') {
      if (!cancelReason) {
        toast.error("Please select a cancellation reason");
        return;
      }
      const log: OrderLog = {
        timestamp: new Date().toLocaleString(),
        action: 'Order cancelled before dispatch',
        user: currentUser.name,
        details: `Reason: ${cancelReason}`
      };
      setActivityLog([log, ...activityLog]);
      toast.success("Order marked as CBD - Stock will be updated in WooCommerce");
      setSelectedAction('');
      setCancelReason('');
    } else if (selectedAction === 'cad') {
      if (!cancelReason) {
        toast.error("Please select a cancellation reason");
        return;
      }
      const log: OrderLog = {
        timestamp: new Date().toLocaleString(),
        action: 'Order cancelled after dispatch',
        user: currentUser.name,
        details: `Reason: ${cancelReason}. Added to Returns List.`
      };
      setActivityLog([log, ...activityLog]);
      toast.success("Order marked as CAD - Added to Returns");
      setSelectedAction('');
      setCancelReason('');
    } else if (selectedAction === 'exchange') {
      if (!exchangeOrderId) {
        toast.error("Please enter the returnable order ID");
        return;
      }
      const log: OrderLog = {
        timestamp: new Date().toLocaleString(),
        action: 'Order marked as exchange',
        user: currentUser.name,
        details: `Exchange for order: ${exchangeOrderId}`
      };
      setActivityLog([log, ...activityLog]);
      toast.success(`Order linked to return ${exchangeOrderId} - Status changed to EXR`);
      setSelectedAction('');
      setExchangeOrderId('');
    } else if (selectedAction === 'partial') {
      if (selectedPartialItems.length === 0) {
        toast.error("Please select items to return");
        return;
      }
      const log: OrderLog = {
        timestamp: new Date().toLocaleString(),
        action: 'Partial delivery processed',
        user: currentUser.name,
        details: `${selectedPartialItems.length} items marked for return`
      };
      setActivityLog([log, ...activityLog]);
      toast.success("Partial delivery processed - Items added to returns");
      setSelectedAction('');
      setSelectedPartialItems([]);
    } else if (selectedAction === 'refund') {
      if (!refundAmount || refundAmount <= 0) {
        toast.error("Please enter a valid refund amount");
        return;
      }
      setCsStatus('refund' as any);
      const log: OrderLog = {
        timestamp: new Date().toLocaleString(),
        action: 'Order refunded',
        user: currentUser.name,
        details: `Refund amount: ৳${refundAmount.toFixed(2)} - Added to Expenses as Refund category`
      };
      setActivityLog([log, ...activityLog]);
      toast.success(`Refund of ৳${refundAmount.toFixed(2)} processed and added to Expenses`);
      setSelectedAction('');
    }
  };

  const handleConfirmOrder = async () => {
    if (!confirmationType) {
      toast.error("Please select confirmation type");
      return;
    }
    if (!courierEntryMethod) {
      toast.error("Please select courier entry method");
      return;
    }
    if (courierEntryMethod === 'manual' && !trackingNumber) {
      toast.error("Please enter tracking number for manual entry");
      return;
    }
    
    // Validation based on confirmation type
    if (confirmationType === 'prepaid') {
      if (paymentMethod === 'COD') {
        toast.error("Payment method cannot be COD for Prepaid confirmation type");
        return;
      }
      if (!paymentReference) {
        toast.error("Payment reference is required for Prepaid confirmation type");
        return;
      }
    }
    
    if (confirmationType === 'partial_paid') {
      // For partial paid, payment method must be a combination (e.g., "bKash + COD")
      if (!paymentMethod.includes('COD') || !paymentMethod.includes('+')) {
        toast.error("Payment method must be a combination of prepaid method + COD for Partial Paid confirmation type");
        return;
      }
      if (!paymentReference) {
        toast.error("Payment reference is required for Partial Paid confirmation type");
        return;
      }
    }
    
    // Check if Office Delivery and prepaid method requires payment reference
    if (courierCompany === 'Office Delivery' && paymentMethod !== 'COD' && !paymentReference) {
      toast.error("Payment reference is required for Office Delivery with prepaid payment methods");
      return;
    }
    
    if (courierEntryMethod === 'api') {
      setIsProcessingAPI(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsProcessingAPI(false);
      toast.success("Order submitted to courier API successfully");
    }
    
    const log: OrderLog = {
      timestamp: new Date().toLocaleString(),
      action: 'Order confirmed',
      user: currentUser.name,
      details: `Type: ${confirmationType}, Courier: ${courierEntryMethod}`
    };
    setActivityLog([log, ...activityLog]);
    setCsStatus('not_printed' as any);
    toast.success("Order confirmed successfully");
  };

  const handleSendSMS = async () => {
    if (!smsMessage.trim()) {
      toast.error("Please enter an SMS message");
      return;
    }
    setIsSendingSMS(true);
    // Simulate SMS API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsSendingSMS(false);
    
    const log: OrderLog = {
      timestamp: new Date().toLocaleString(),
      action: 'SMS sent to customer',
      user: currentUser.name,
      details: smsMessage
    };
    setActivityLog([log, ...activityLog]);
    toast.success("SMS sent successfully");
    setSmsMessage('');
  };

  const handleGenerateInvoice = async () => {
    if (!invoiceRef.current) return;
    
    setIsGeneratingInvoice(true);
    toast.info("Generating invoice PDF...");
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const canvas = await html2canvas(invoiceRef.current, {
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
      
      const log: OrderLog = {
        timestamp: new Date().toLocaleString(),
        action: 'Invoice generated',
        user: currentUser.name,
        details: `PDF invoice downloaded`
      };
      setActivityLog([log, ...activityLog]);
      
      toast.success("Invoice generated successfully!");
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const handleGeneratePackingSlip = async () => {
    if (!packingSlipRef.current) return;
    
    setIsGeneratingPackingSlip(true);
    toast.info("Generating packing slip PDF...");
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const canvas = await html2canvas(packingSlipRef.current, {
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
      
      const log: OrderLog = {
        timestamp: new Date().toLocaleString(),
        action: 'Packing slip generated',
        user: currentUser.name,
        details: `PDF packing slip downloaded`
      };
      setActivityLog([log, ...activityLog]);
      
      toast.success("Packing slip generated successfully!");
    } catch (error) {
      console.error("Error generating packing slip:", error);
      toast.error("Failed to generate packing slip");
    } finally {
      setIsGeneratingPackingSlip(false);
    }
  };

  const addOrderItem = () => {
    toast.info("Product selection modal would open here");
  };

  const removeOrderItem = (sku: string) => {
    setOrderItems(orderItems.filter(item => item.sku !== sku));
    toast.success("Item removed");
  };

  const handleSaveOrderItems = async () => {
    // Simulate API call to sync with website
    toast.info("Syncing with website...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const log: OrderLog = {
      timestamp: new Date().toLocaleString(),
      action: 'Order items updated',
      user: currentUser.name,
      details: 'Changes synced with website - Stock updated'
    };
    setActivityLog([log, ...activityLog]);
    setIsEditingItems(false);
    toast.success("Order items saved and synced with website");
  };

  const addPackagingMaterial = () => {
    if (!selectedPackagingSku) {
      toast.error("Please select a packaging material");
      return;
    }
    const material = packagingMaterials.find(m => m.sku === selectedPackagingSku);
    if (!material) return;

    // Check if already exists
    const existing = orderPackagingMaterials.find(m => m.sku === selectedPackagingSku);
    if (existing) {
      // Update quantity
      setOrderPackagingMaterials(orderPackagingMaterials.map(m =>
        m.sku === selectedPackagingSku
          ? { ...m, quantity: m.quantity + packagingQuantity }
          : m
      ));
    } else {
      // Add new
      setOrderPackagingMaterials([...orderPackagingMaterials, {
        sku: material.sku,
        name: material.name,
        quantity: packagingQuantity,
        cost_per_unit: material.cost_per_unit
      }]);
    }

    toast.success("Packaging material added");
    setShowPackagingDialog(false);
    setSelectedPackagingSku('');
    setPackagingQuantity(1);
  };

  const removePackagingMaterial = (sku: string) => {
    setOrderPackagingMaterials(orderPackagingMaterials.filter(m => m.sku !== sku));
    toast.success("Packaging material removed");
  };

  const updatePackagingQuantity = (sku: string, quantity: number) => {
    if (quantity < 1) {
      removePackagingMaterial(sku);
      return;
    }
    setOrderPackagingMaterials(orderPackagingMaterials.map(m =>
      m.sku === sku ? { ...m, quantity } : m
    ));
  };

  const canEditCS = currentUser.role === 'admin' || currentUser.role === 'customer_service';
  const canEditOps = currentUser.role === 'admin' || currentUser.role === 'operations_manager' || currentUser.role === 'warehouse_manager';
  const canEditPackaging = currentUser.role === 'admin' || currentUser.role === 'operations_manager' || currentUser.role === 'customer_service';

  const formatStatus = (status: string) => {
    const labels: Record<string, string> = {
      new_not_called: 'New & Not Called',
      new_called: 'New & Called',
      awaiting_payment: 'Awaiting Payment',
      late_delivery: 'Late Delivery',
      exchange: 'Exchange',
      reverse_pick: 'Reverse Pick',
      send_to_lab: 'Send to Lab',
      in_lab: 'In Lab',
      not_printed: 'Not Printed',
      printed: 'Printed',
      packed: 'Packed',
      shipped: 'Shipped',
      delivered: 'Delivered',
      processing: 'Processing',
      refund: 'Refund',
    };
    return labels[status] || status;
  };

  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const total = subtotal + shippingFee - discount + lensPrice;

  // Check if confirm order should be disabled
  const isConfirmDisabled = selectedAction === 'cbd' || selectedAction === 'cad' || selectedAction === 'partial';

  // Check if there are WooCommerce meta values (mocked for now)
  const hasWooMeta = order.woo_meta && Object.keys(order.woo_meta).length > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header - Compact with Full Order Summary */}
      <Card className="border-b-4 border-blue-500">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <Button variant="ghost" size="sm" onClick={() => navigate('/fulfilment/orders')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h1 className="text-lg font-semibold">{order.woo_order_id}</h1>
                  <Badge className={`${
                    csStatus === 'shipped' ? 'bg-green-500 text-white' :
                    csStatus === 'refund' ? 'bg-red-500 text-white' :
                    csStatus === 'new_not_called' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {formatStatus(csStatus)}
                  </Badge>
                  <span className="text-xs text-gray-600">{order.created_date}</span>
                  {assignedToName && (
                    <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
                        {assignedToName.split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <span className="text-xs text-blue-700 font-medium">{assignedToName}</span>
                    </div>
                  )}
                  {confirmedBy && confirmedBy !== assignedToName && (
                    <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                      <span className="text-xs text-amber-600">Confirmed by:</span>
                      <span className="text-xs text-amber-700 font-medium">{confirmedBy}</span>
                    </div>
                  )}
                </div>
                
                {/* Order Summary Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">
                      {orderItems.map(item => `${item.sku_name} (${item.quantity})`).join(', ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-semibold text-green-700">৳{total.toFixed(2)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Discount:</span>
                      <span className="font-medium text-orange-600">-৳{discount.toFixed(2)}</span>
                    </div>
                  )}
                  {hasWooMeta && appSettings.enablePrescriptionLens && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-700">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Additional Lens / Modification
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {canEditCS && (
              <div className="flex flex-col gap-2">
                <Button 
                  onClick={handleGenerateInvoice} 
                  variant="outline"
                  className="gap-2"
                  disabled={isGeneratingInvoice}
                >
                  <FileText className="w-4 h-4" />
                  {isGeneratingInvoice ? 'Generating...' : 'Generate Invoice'}
                </Button>
                <Button 
                  onClick={handleGeneratePackingSlip} 
                  variant="outline"
                  className="gap-2"
                  disabled={isGeneratingPackingSlip}
                >
                  <Package className="w-4 h-4" />
                  {isGeneratingPackingSlip ? 'Generating...' : 'Generate Packing Slip'}
                </Button>
                <Button 
                  onClick={handleMakeCall} 
                  variant="default" 
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Phone className="w-4 h-4" />
                  Call Customer
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Top 3 Columns: Customer Info | Courier & Confirm | Status & Source */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Customer Information - Inline Editable */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="customer-name" className="text-xs text-gray-600">Name</Label>
              <p className="text-sm font-medium">{customerName}</p>
            </div>
            <div className="space-y-1">
              <Label htmlFor="customer-phone" className="text-xs text-gray-600">Phone</Label>
              {canEditCS ? (
                <Input
                  id="customer-phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  onBlur={() => handleFieldUpdate('Phone', customerPhone)}
                  className="h-9"
                />
              ) : (
                <p className="text-sm font-medium flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {customerPhone}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="customer-district" className="text-xs text-gray-600">District</Label>
              {canEditCS ? (
                <Select value={customerDistrict} onValueChange={(v) => { setCustomerDistrict(v); handleFieldUpdate('District', v); }}>
                  <SelectTrigger id="customer-district" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dhaka">Dhaka</SelectItem>
                    <SelectItem value="Chittagong">Chittagong</SelectItem>
                    <SelectItem value="Rajshahi">Rajshahi</SelectItem>
                    <SelectItem value="Khulna">Khulna</SelectItem>
                    <SelectItem value="Sylhet">Sylhet</SelectItem>
                    <SelectItem value="Barisal">Barisal</SelectItem>
                    <SelectItem value="Rangpur">Rangpur</SelectItem>
                    <SelectItem value="Mymensingh">Mymensingh</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm font-medium">{customerDistrict}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="customer-address" className="text-xs text-gray-600">Address</Label>
              {canEditCS ? (
                <Textarea
                  id="customer-address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  onBlur={() => handleFieldUpdate('Address', customerAddress)}
                  rows={2}
                  className="text-sm"
                />
              ) : (
                <p className="text-sm flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  {customerAddress}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="customer-email" className="text-xs text-gray-600">Email (Optional)</Label>
              {canEditCS ? (
                <Input
                  id="customer-email"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  onBlur={() => handleFieldUpdate('Email', customerEmail)}
                  placeholder="customer@example.com"
                  className="h-9"
                />
              ) : (
                <p className="text-sm text-gray-500">{customerEmail || 'Not provided'}</p>
              )}
            </div>

            <div className="pt-2 border-t space-y-3">
              {/* Payment Method */}
              <div className="space-y-2">
                <Label htmlFor="payment-method" className="text-xs text-gray-600">Payment Method</Label>
                {canEditCS ? (
                  <Select value={paymentMethod} onValueChange={(value) => {
                    setPaymentMethod(value);
                    const log: ActivityLogEntry = {
                      timestamp: new Date().toISOString(),
                      user: currentUser.name,
                      action: `Changed payment method to ${value}`,
                    };
                    setActivityLog([log, ...activityLog]);
                  }}>
                    <SelectTrigger id="payment-method" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COD">COD</SelectItem>
                      <SelectItem value="bKash">bKash</SelectItem>
                      <SelectItem value="Nagad">Nagad</SelectItem>
                      <SelectItem value="Rocket">Rocket</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="bKash + COD">bKash + COD</SelectItem>
                      <SelectItem value="Nagad + COD">Nagad + COD</SelectItem>
                      <SelectItem value="Rocket + COD">Rocket + COD</SelectItem>
                      <SelectItem value="Bank Transfer + COD">Bank Transfer + COD</SelectItem>
                      <SelectItem value="Card + COD">Card + COD</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className={`${
                    paymentMethod === 'COD' ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
                  } w-fit`}>
                    <CreditCard className="w-3 h-3 mr-1" />
                    {paymentMethod}
                  </Badge>
                )}
              </div>

              {/* Payment Reference */}
              {paymentMethod !== 'COD' && (
                <div className="space-y-2">
                  <Label htmlFor="payment-ref" className="text-xs text-gray-600">Payment Reference</Label>
                  {canEditCS ? (
                    <Input
                      id="payment-ref"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      onBlur={() => {
                        const log: ActivityLogEntry = {
                          timestamp: new Date().toISOString(),
                          user: currentUser.name,
                          action: `Updated payment reference to ${paymentReference}`,
                        };
                        setActivityLog([log, ...activityLog]);
                      }}
                      placeholder="Enter payment reference"
                      className="h-9"
                    />
                  ) : (
                    <p className="text-sm">{paymentReference || 'Not provided'}</p>
                  )}
                </div>
              )}

              {/* Payment Status */}
              <div className="space-y-2">
                <Label htmlFor="payment-status" className="text-xs text-gray-600">Payment Status</Label>
                {canEditCS ? (
                  <Select value={paymentStatus} onValueChange={(value: 'paid' | 'unpaid') => {
                    setPaymentStatus(value);
                    const log: ActivityLogEntry = {
                      timestamp: new Date().toISOString(),
                      user: currentUser.name,
                      action: `Changed payment status to ${value}`,
                    };
                    setActivityLog([log, ...activityLog]);
                  }}>
                    <SelectTrigger id="payment-status" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}>
                    {paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Courier Information & Confirm Order */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Courier & Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Courier Info */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="courier-company" className="text-xs text-gray-600">Courier Company</Label>
                <Select value={courierCompany} onValueChange={setCourierCompany}>
                  <SelectTrigger id="courier-company" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pathao">Pathao</SelectItem>
                    <SelectItem value="Steadfast">Steadfast</SelectItem>
                    <SelectItem value="Redx">Redx</SelectItem>
                    <SelectItem value="eCourier">eCourier</SelectItem>
                    <SelectItem value="Paperfly">Paperfly</SelectItem>
                    <SelectItem value="Office Delivery">Office Delivery</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Show payment reference requirement for Office Delivery with prepaid */}
              {courierCompany === 'Office Delivery' && paymentMethod !== 'COD' && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                  <p className="text-yellow-800 font-medium">Payment reference required for Office Delivery</p>
                </div>
              )}
              
              <div className="space-y-1">
                <Label htmlFor="courier-area" className="text-xs text-gray-600">Area</Label>
                <Input
                  id="courier-area"
                  value={courierArea}
                  onChange={(e) => setCourierArea(e.target.value)}
                  placeholder="Delivery area"
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tracking" className="text-xs text-gray-600">Tracking Number</Label>
                <Input
                  id="tracking"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Tracking #"
                  className="h-9"
                />
              </div>
              
              {/* Collected Amount - Only show for final statuses */}
              {(csStatus === 'delivered' || csStatus === 'exchange' || selectedAction === 'cad' || selectedAction === 'partial') && (
                <div className="space-y-1">
                  <Label htmlFor="collected-amount" className="text-xs text-gray-600">Collected Amount</Label>
                  <Input
                    id="collected-amount"
                    type="number"
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="h-9"
                  />
                </div>
              )}
              
              {/* Delivery Charge - Only show for final statuses */}
              {(csStatus === 'delivered' || csStatus === 'exchange' || selectedAction === 'cad' || selectedAction === 'partial') && (
                <div className="space-y-1">
                  <Label htmlFor="delivery-charge" className="text-xs text-gray-600">Delivery Charge</Label>
                  <Input
                    id="delivery-charge"
                    type="number"
                    value={deliveryCharge}
                    onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                    placeholder="60"
                    className="h-9"
                  />
                </div>
              )}
              
              {/* Total Receivable */}
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg space-y-1">
                <Label className="text-xs text-gray-600">Total Receivable (Courier Collection)</Label>
                <p className="text-lg font-bold text-green-700">৳{totalReceivable.toFixed(2)}</p>
                <p className="text-xs text-gray-500">Amount to collect from customer</p>
              </div>
            </div>

            {/* Confirm Order Box */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <Label className="text-sm font-semibold">Confirm Order</Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmation-type" className="text-xs text-gray-600">Confirmation Type</Label>
                <Select value={confirmationType} onValueChange={setConfirmationType} disabled={isConfirmDisabled}>
                  <SelectTrigger id="confirmation-type" className="h-9">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phonecall">Phonecall</SelectItem>
                    <SelectItem value="prepaid">Prepaid</SelectItem>
                    <SelectItem value="partial_paid">Partial Paid</SelectItem>
                    <SelectItem value="assumption">Assumption</SelectItem>
                    <SelectItem value="messenger">Messenger Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="courier-entry" className="text-xs text-gray-600">Courier Entry Method</Label>
                <Select value={courierEntryMethod} onValueChange={setCourierEntryMethod} disabled={isConfirmDisabled}>
                  <SelectTrigger id="courier-entry" className="h-9">
                    <SelectValue placeholder="Select method..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="api">Automatic (API)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {courierEntryMethod === 'manual' && !isConfirmDisabled && (
                <Input 
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="h-9"
                />
              )}
              <Button 
                size="sm" 
                className="w-full"
                onClick={handleConfirmOrder}
                disabled={!confirmationType || !courierEntryMethod || isProcessingAPI || isConfirmDisabled}
              >
                {isProcessingAPI ? 'Processing...' : 'Confirm Order'}
              </Button>
              {isConfirmDisabled && (
                <p className="text-xs text-orange-600">Confirm order is disabled when CBD, CAD, or Partial Delivery is selected</p>
              )}
              {isProcessingAPI && (
                <p className="text-xs text-blue-600 flex items-center gap-2">
                  <Clock className="w-3 h-3 animate-spin" />
                  Submitting to courier API...
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Order Status & Source */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Status & Source</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Change Status Dropdown */}
            {canEditCS && (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="change-status" className="text-xs text-gray-600">Change Status</Label>
                  <Select value={selectedAction} onValueChange={setSelectedAction}>
                    <SelectTrigger id="change-status" className="h-9">
                      <SelectValue placeholder="Select status change..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cbd">Cancel Before Dispatch (CBD)</SelectItem>
                      <SelectItem value="cad">Cancel After Dispatch (CAD)</SelectItem>
                      <SelectItem value="exchange">Exchange</SelectItem>
                      <SelectItem value="partial">Partial Delivery</SelectItem>
                      <SelectItem value="reverse_pick">Reverse Pick (Customer Sent Return)</SelectItem>
                      <SelectItem value="late_delivery">Late Delivery</SelectItem>
                      <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                      <SelectItem value="send_to_lab">Send to Lab</SelectItem>
                      <SelectItem value="in_lab">In Lab</SelectItem>
                      <SelectItem value="processing">Mark as Processing</SelectItem>
                      <SelectItem value="delivered">Mark as Delivered</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* CBD or CAD - Show cancel reason */}
                {(selectedAction === 'cbd' || selectedAction === 'cad') && (
                  <div className="space-y-2">
                    <Label htmlFor="cancel-reason" className="text-xs text-gray-600">
                      {selectedAction === 'cbd' ? 'Cancellation Reason' : 'Return Reason'}
                    </Label>
                    <Select value={cancelReason} onValueChange={setCancelReason}>
                      <SelectTrigger id="cancel-reason" className="h-9">
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="change_of_mind">Change of Mind</SelectItem>
                        <SelectItem value="advance_delivery_charge">Advance Delivery Charge</SelectItem>
                        <SelectItem value="confused_size">Confused about Size</SelectItem>
                        <SelectItem value="duplicate">Duplicate Order</SelectItem>
                        <SelectItem value="test">Test Order</SelectItem>
                        <SelectItem value="others">Others</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      className="w-full"
                      onClick={handleActionSubmit}
                    >
                      Confirm {selectedAction === 'cbd' ? 'CBD' : 'CAD'}
                    </Button>
                  </div>
                )}

                {/* Exchange - Show order ID field */}
                {selectedAction === 'exchange' && (
                  <div className="space-y-2">
                    <Label htmlFor="exchange-order" className="text-xs text-gray-600">Return Order ID</Label>
                    <Input 
                      id="exchange-order"
                      value={exchangeOrderId}
                      onChange={(e) => setExchangeOrderId(e.target.value)}
                      placeholder="Enter order ID"
                      className="h-9"
                    />
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={handleActionSubmit}
                    >
                      Mark as Exchange
                    </Button>
                  </div>
                )}

                {/* Partial Delivery - Show items selection */}
                {selectedAction === 'partial' && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Select Items to Return</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                      {orderItems.map((item) => (
                        <label key={item.sku} className="flex items-start gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={selectedPartialItems.includes(item.sku)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPartialItems([...selectedPartialItems, item.sku]);
                              } else {
                                setSelectedPartialItems(selectedPartialItems.filter(s => s !== item.sku));
                              }
                            }}
                            className="rounded mt-0.5"
                          />
                          <span className="flex-1">{item.sku_name} (Qty: {item.quantity})</span>
                        </label>
                      ))}
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={handleActionSubmit}
                    >
                      Process Partial Delivery
                    </Button>
                  </div>
                )}

                {/* Refund - Show refund amount field */}
                {selectedAction === 'refund' && (
                  <div className="space-y-2">
                    <Label htmlFor="refund-amount" className="text-xs text-gray-600">Refund Amount</Label>
                    <Input 
                      id="refund-amount"
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="h-9"
                    />
                    <div className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <p className="text-red-800">Refund will be added to Expenses under "Refund" category</p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="w-full"
                      onClick={handleActionSubmit}
                    >
                      Process Refund
                    </Button>
                  </div>
                )}

                {/* Late Delivery - Show date field */}
                {selectedAction === 'late_delivery' && (
                  <div className="space-y-2">
                    <Label htmlFor="late-delivery-date" className="text-xs text-gray-600">Late Delivery Date</Label>
                    <Input 
                      id="late-delivery-date"
                      type="date"
                      value={lateDeliveryDate}
                      onChange={(e) => setLateDeliveryDate(e.target.value)}
                      className="h-9"
                    />
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setCsStatus('late_delivery' as any);
                        toast.success("Order marked for late delivery");
                        setSelectedAction('');
                      }}
                    >
                      Set Late Delivery
                    </Button>
                  </div>
                )}

                {/* Awaiting Payment, Send to Lab, In Lab, Reverse Pick - Direct actions */}
                {(selectedAction === 'awaiting_payment' || selectedAction === 'send_to_lab' || selectedAction === 'in_lab' || selectedAction === 'reverse_pick') && (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => {
                      setCsStatus(selectedAction as any);
                      const log: OrderLog = {
                        timestamp: new Date().toLocaleString(),
                        action: `Status changed to ${formatStatus(selectedAction)}`,
                        user: currentUser.name,
                        details: selectedAction === 'reverse_pick' ? 'Customer has sent the return item. Expected to receive within 7 days.' : undefined
                      };
                      setActivityLog([log, ...activityLog]);
                      toast.success(`Order status changed to ${formatStatus(selectedAction)}`);
                      setSelectedAction('');
                    }}
                  >
                    Confirm Status Change
                  </Button>
                )}
                
                {/* Processing - Mark order as processing */}
                {selectedAction === 'processing' && (
                  <div className="space-y-2">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs">
                      <p className="font-semibold text-blue-900 mb-1">Processing Status</p>
                      <p className="text-blue-700">This will revert the order to processing status and release reserved stock. Used when order is cancelled before shipping.</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => {
                        setCsStatus('processing' as any);
                        const log: OrderLog = {
                          timestamp: new Date().toLocaleString(),
                          action: 'Order marked as Processing',
                          user: currentUser.name,
                          details: 'Reserved stock released back to available inventory'
                        };
                        setActivityLog([log, ...activityLog]);
                        toast.success('Order marked as Processing - Reserved stock released');
                        setSelectedAction('');
                      }}
                    >
                      Mark as Processing
                    </Button>
                  </div>
                )}
                
                {/* Delivered - Mark order as delivered */}
                {selectedAction === 'delivered' && (
                  <div className="space-y-2">
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-xs">
                      <p className="font-semibold text-green-900 mb-1">Delivered Status</p>
                      <p className="text-green-700">Mark this order as delivered to customer. Physical stock already reduced when order was shipped.</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setCsStatus('delivered' as any);
                        const log: OrderLog = {
                          timestamp: new Date().toLocaleString(),
                          action: 'Order delivered to customer',
                          user: currentUser.name,
                          details: 'Customer confirmed receipt of goods'
                        };
                        setActivityLog([log, ...activityLog]);
                        toast.success('Order marked as Delivered');
                        setSelectedAction('');
                      }}
                    >
                      Mark as Delivered
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Order Source & Info - Moved here */}
            <div className="border-t pt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="order-source" className="text-xs text-gray-600">Order Source</Label>
                {canEditCS ? (
                  <Select value={orderSource} onValueChange={(value) => {
                    setOrderSource(value);
                    handleFieldUpdate('Order Source', value);
                  }}>
                    <SelectTrigger id="order-source" className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="website">Website</SelectItem>
                      <SelectItem value="meta_suite">Meta Suite</SelectItem>
                      <SelectItem value="phonecall">Phonecall</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="w-fit">
                    {orderSource === 'website' ? 'Website' : 
                     orderSource === 'meta_suite' ? 'Meta Suite' : 
                     orderSource === 'phonecall' ? 'Phonecall' :
                     orderSource === 'whatsapp' ? 'WhatsApp' : 'Email'}
                  </Badge>
                )}
              </div>

              {/* CS Assignment - Moved from Customer Information */}
              <div className="space-y-1">
                <Label className="text-xs text-gray-600 flex items-center gap-1">
                  Assigned CS Person
                </Label>
                {canEditCS ? (
                  <Select value={assignedTo} onValueChange={(val) => {
                    const u = users.find(u => u.id === val);
                    setAssignedTo(val);
                    setAssignedToName(u?.name || '');
                    handleFieldUpdate('Assigned CS Person', u?.name || '');
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select CS person" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.filter(u => u.role === 'customer_service').map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium">{assignedToName || 'Unassigned'}</p>
                )}
              </div>
              
              <div className="space-y-1">
                <Label className="text-xs text-gray-600">
                  Confirmed By
                  <span className="ml-1 text-gray-400">(if covering for assigned person)</span>
                </Label>
                {canEditCS ? (
                  <Select value={confirmedBy || '__none__'} onValueChange={(val) => {
                    const v = val === '__none__' ? '' : val;
                    setConfirmedBy(v);
                    handleFieldUpdate('Confirmed By', v || 'None');
                  }}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Same as assigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Same as assigned —</SelectItem>
                      {users.filter(u => u.role === 'customer_service').map(u => (
                        <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium">{confirmedBy || '—'}</p>
                )}
              </div>

              {orderSource === 'meta_suite' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="conversation-url" className="text-xs text-gray-600">Conversation URL</Label>
                    <a 
                      href={conversationUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {conversationUrl || 'Not provided'}
                    </a>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meta-screenshot" className="text-xs text-gray-600">Screenshot</Label>
                    <p className="text-sm text-gray-500">
                      {metaScreenshot ? metaScreenshot.name : 'No screenshot uploaded'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Notes & Call Log - Full Width - With Inline Editing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Notes - Inline Editable */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {orderNotes && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">
                {orderNotes}
              </div>
            )}
            {canEditCS && (
              <div className="space-y-2">
                <Textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  rows={3}
                  placeholder="Add a new note..."
                />
                <Button onClick={handleAddNote} size="sm" className="w-full gap-2">
                  <Save className="w-4 h-4" />
                  Log Note
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Call Log */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Call Log</CardTitle>
              <Badge variant="outline" className="text-xs">
                {callAttempts} {callAttempts === 1 ? 'attempt' : 'attempts'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {canEditCS && (
              <div className="flex gap-2">
                <Input
                  value={callNote}
                  onChange={(e) => setCallNote(e.target.value)}
                  placeholder="Add call note..."
                  className="flex-1 h-9"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddCall();
                    }
                  }}
                />
                <Button onClick={handleAddCall} size="sm" className="gap-2">
                  <PhoneCall className="w-4 h-4" />
                  Log
                </Button>
              </div>
            )}

            <div className="space-y-2 max-h-32 overflow-y-auto">
              {callLogs.map((log, index) => (
                <div key={index} className="p-2 bg-blue-50 rounded border border-blue-100">
                  <p className="text-sm">{log.note}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                    <span>{log.user}</span>
                    <span>•</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order Items - With Edit/Save Button */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Order Items</CardTitle>
          {canEditCS && !isEditingItems && (
            <Button size="sm" variant="outline" onClick={() => setIsEditingItems(true)} className="gap-2">
              <Edit2 className="w-4 h-4" />
              Edit Items
            </Button>
          )}
          {canEditCS && isEditingItems && (
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveOrderItems} className="gap-2">
                <Save className="w-4 h-4" />
                Save & Sync
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsEditingItems(false)} className="gap-2">
                <X className="w-4 h-4" />
                Cancel
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Total</TableHead>
                {isEditingItems && <TableHead></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderItems.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{item.sku_name}</p>
                      <p className="text-xs text-gray-600">{item.sku}</p>
                      {item.attributes && Object.entries(item.attributes).map(([key, value]) => (
                        <p key={key} className="text-xs text-gray-500">{key}: {value}</p>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {isEditingItems ? (
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const newItems = [...orderItems];
                          newItems[index].quantity = parseInt(e.target.value) || 1;
                          setOrderItems(newItems);
                        }}
                        className="w-16 h-8 ml-auto"
                      />
                    ) : (
                      item.quantity
                    )}
                  </TableCell>
                  <TableCell className="text-right">৳{item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">৳0.00</TableCell>
                  <TableCell className="text-right font-medium">৳{(item.quantity * item.price).toFixed(2)}</TableCell>
                  {isEditingItems && (
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeOrderItem(item.sku)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
              <TableRow className="bg-gray-50">
                <TableCell colSpan={4} className="text-right font-medium">Subtotal:</TableCell>
                <TableCell className="text-right font-semibold">৳{subtotal.toFixed(2)}</TableCell>
                {isEditingItems && <TableCell></TableCell>}
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-right">Shipping Fee:</TableCell>
                <TableCell className="text-right">
                  {isEditingItems ? (
                    <Input
                      type="number"
                      value={shippingFee}
                      onChange={(e) => setShippingFee(Number(e.target.value))}
                      className="w-24 h-8 ml-auto"
                    />
                  ) : (
                    `৳${shippingFee.toFixed(2)}`
                  )}
                </TableCell>
                {isEditingItems && <TableCell></TableCell>}
              </TableRow>
              <TableRow>
                <TableCell colSpan={4} className="text-right">Discount:</TableCell>
                <TableCell className="text-right">
                  {isEditingItems ? (
                    <Input
                      type="number"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      className="w-24 h-8 ml-auto"
                    />
                  ) : (
                    `৳${discount.toFixed(2)}`
                  )}
                </TableCell>
                {isEditingItems && <TableCell></TableCell>}
              </TableRow>
              {lensPrice > 0 && appSettings.enablePrescriptionLens && (
                <TableRow>
                  <TableCell colSpan={4} className="text-right">Additional Lens:</TableCell>
                  <TableCell className="text-right">৳{lensPrice.toFixed(2)}</TableCell>
                  {isEditingItems && <TableCell></TableCell>}
                </TableRow>
              )}
              <TableRow className="bg-blue-50">
                <TableCell colSpan={4} className="text-right font-semibold text-base">Order Total:</TableCell>
                <TableCell className="text-right font-bold text-base">৳{total.toFixed(2)}</TableCell>
                {isEditingItems && <TableCell></TableCell>}
              </TableRow>
            </TableBody>
          </Table>

          {/* Packaging Materials Section */}
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-gray-600" />
                <h3 className="font-semibold text-sm">Packaging Materials</h3>
                <Badge variant="outline" className="text-xs">
                  {orderPackagingMaterials.length} items
                </Badge>
              </div>
              {canEditPackaging && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPackagingDialog(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Material
                </Button>
              )}
            </div>

            {orderPackagingMaterials.length > 0 ? (
              <div className="space-y-2">
                {orderPackagingMaterials.map((material) => (
                  <div
                    key={material.sku}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{material.name}</p>
                      <p className="text-xs text-gray-600">{material.sku}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {canEditPackaging ? (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-gray-600">Qty:</Label>
                          <Input
                            type="number"
                            min="1"
                            value={material.quantity}
                            onChange={(e) => updatePackagingQuantity(material.sku, parseInt(e.target.value))}
                            className="w-16 h-8 text-sm"
                          />
                        </div>
                      ) : (
                        <span className="text-sm font-medium">Qty: {material.quantity}</span>
                      )}
                      {currentUser.role !== 'warehouse_manager' && (
                        <span className="text-xs text-gray-600 w-20 text-right">
                          ৳{(material.cost_per_unit * material.quantity).toFixed(2)}
                        </span>
                      )}
                      {canEditPackaging && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePackagingMaterial(material.sku)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {currentUser.role !== 'warehouse_manager' && orderPackagingMaterials.length > 0 && (
                  <div className="flex justify-end pt-2 border-t">
                    <div className="text-sm">
                      <span className="text-gray-600">Total Packaging Cost: </span>
                      <span className="font-semibold">
                        ৳{orderPackagingMaterials.reduce((sum, m) => sum + (m.cost_per_unit * m.quantity), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No packaging materials added</p>
                {canEditPackaging && (
                  <p className="text-xs mt-1">Click "Add Material" to add packaging items</p>
                )}
              </div>
            )}
          </div>

          {/* Add Packaging Material Dialog */}
          {showPackagingDialog && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPackagingDialog(false)}>
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Add Packaging Material</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowPackagingDialog(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="packaging-material">Material</Label>
                    <Select value={selectedPackagingSku} onValueChange={setSelectedPackagingSku}>
                      <SelectTrigger id="packaging-material">
                        <SelectValue placeholder="Select packaging material..." />
                      </SelectTrigger>
                      <SelectContent>
                        {packagingMaterials.map((material) => (
                          <SelectItem key={material.sku} value={material.sku}>
                            {material.name} ({material.sku})
                            {currentUser.role !== 'warehouse_manager' && (
                              <span className="text-xs text-gray-500 ml-2">- ৳{material.cost_per_unit}</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="packaging-quantity">Quantity</Label>
                    <Input
                      id="packaging-quantity"
                      type="number"
                      min="1"
                      value={packagingQuantity}
                      onChange={(e) => setPackagingQuantity(parseInt(e.target.value) || 1)}
                    />
                  </div>

                  {selectedPackagingSku && currentUser.role !== 'warehouse_manager' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="text-sm">
                        <span className="text-gray-600">Cost: </span>
                        <span className="font-semibold">
                          ৳{((packagingMaterials.find(m => m.sku === selectedPackagingSku)?.cost_per_unit || 0) * packagingQuantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-4">
                    <Button onClick={addPackagingMaterial} className="flex-1">
                      Add Material
                    </Button>
                    <Button variant="outline" onClick={() => setShowPackagingDialog(false)} className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional / Prescription Lens - Enhanced with Prescription Fields */}
      {appSettings.enablePrescriptionLens && <Card className="border-purple-200 bg-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Additional / Prescription Lens</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <Label htmlFor="prescription-type" className="text-xs text-gray-600">Prescription Type</Label>
              <Select value={prescriptionType} onValueChange={(value) => {
                setPrescriptionType(value);
                // Reset lens type if switching away from single vision and high index was selected
                if (value !== 'single_vision' && lensType === 'high_index') {
                  setLensType('');
                }
              }}>
                <SelectTrigger id="prescription-type" className="h-9">
                  <SelectValue placeholder="Select prescription type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_vision">Single Vision</SelectItem>
                  <SelectItem value="progressive">Progressive</SelectItem>
                  <SelectItem value="bifocal">Bifocal</SelectItem>
                  <SelectItem value="blue_light">Blue Light Filter</SelectItem>
                  <SelectItem value="transition">Transition</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="lens-type" className="text-xs text-gray-600">Lens Type</Label>
              <Select 
                value={lensType} 
                onValueChange={setLensType}
                disabled={!prescriptionType}
              >
                <SelectTrigger id="lens-type" className="h-9">
                  <SelectValue placeholder={prescriptionType ? "Select lens type" : "Select prescription first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multicoated">Multicoated Lens</SelectItem>
                  <SelectItem value="hard_coated">Hard Coated Lens</SelectItem>
                  <SelectItem value="standard_antiblue">Standard Anti-blue Lens</SelectItem>
                  <SelectItem value="eyepro_premium_antiblue">Eyepro Premium Anti-Blue Lens</SelectItem>
                  <SelectItem value="standard_photochromic">Standard Photochromic Lens</SelectItem>
                  <SelectItem value="eyepro_premium_photochromic">Eyepro Premium Photochromic Lens</SelectItem>
                  {prescriptionType === 'single_vision' && (
                    <SelectItem value="high_index">High Index Lens</SelectItem>
                  )}
                  <SelectItem value="custom">Custom Lens Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {lensType === 'custom' && (
              <div className="space-y-2">
                <Label htmlFor="custom-lens-type" className="text-xs text-gray-600">Custom Lens Type</Label>
                <Input
                  id="custom-lens-type"
                  value={customLensType}
                  onChange={(e) => setCustomLensType(e.target.value)}
                  placeholder="Enter custom lens type"
                  className="h-9"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="lens-price" className="text-xs text-gray-600">Price (৳)</Label>
              <Input
                id="lens-price"
                type="number"
                value={lensPrice}
                onChange={(e) => setLensPrice(Number(e.target.value))}
                placeholder="0.00"
                className="h-9"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prescription" className="text-xs text-gray-600">Upload Prescription</Label>
              <Input
                id="prescription"
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setPrescription(e.target.files?.[0] || null)}
                className="h-9"
              />
              {prescription && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {prescription.name}
                </p>
              )}
            </div>
          </div>

          {/* Prescription Fields - Only show when prescription type is selected */}
          {prescriptionType && (
            <div className="mt-6 pt-6 border-t border-purple-300">
              <div className="mb-4">
                <p className="text-sm font-semibold text-purple-900 mb-1">Prescription Details</p>
                <p className="text-xs text-purple-700">These values will be color-coded on the invoice to prevent lab errors</p>
              </div>
              
              {/* Right Eye */}
              <div className="mb-4">
                <Label className="text-sm font-semibold text-purple-900 mb-2 block">Right Eye (OD)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="right-sph" className="text-xs text-gray-600">SPH</Label>
                    <Input
                      id="right-sph"
                      value={rightSph}
                      onChange={(e) => setRightSph(e.target.value)}
                      placeholder="+/-0.00"
                      className="h-9 border-blue-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="right-cyl" className="text-xs text-gray-600">CYL</Label>
                    <Input
                      id="right-cyl"
                      value={rightCyl}
                      onChange={(e) => setRightCyl(e.target.value)}
                      placeholder="+/-0.00"
                      className="h-9 border-blue-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="right-axis" className="text-xs text-gray-600">AXIS</Label>
                    <Input
                      id="right-axis"
                      value={rightAxis}
                      onChange={(e) => setRightAxis(e.target.value)}
                      placeholder="0-180"
                      className="h-9 border-blue-300 focus:border-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="right-pd" className="text-xs text-gray-600">PD</Label>
                    <Input
                      id="right-pd"
                      value={rightPd}
                      onChange={(e) => setRightPd(e.target.value)}
                      placeholder="mm"
                      className="h-9 border-blue-300 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Left Eye */}
              <div className="mb-4">
                <Label className="text-sm font-semibold text-purple-900 mb-2 block">Left Eye (OS)</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="left-sph" className="text-xs text-gray-600">SPH</Label>
                    <Input
                      id="left-sph"
                      value={leftSph}
                      onChange={(e) => setLeftSph(e.target.value)}
                      placeholder="+/-0.00"
                      className="h-9 border-green-300 focus:border-green-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="left-cyl" className="text-xs text-gray-600">CYL</Label>
                    <Input
                      id="left-cyl"
                      value={leftCyl}
                      onChange={(e) => setLeftCyl(e.target.value)}
                      placeholder="+/-0.00"
                      className="h-9 border-green-300 focus:border-green-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="left-axis" className="text-xs text-gray-600">AXIS</Label>
                    <Input
                      id="left-axis"
                      value={leftAxis}
                      onChange={(e) => setLeftAxis(e.target.value)}
                      placeholder="0-180"
                      className="h-9 border-green-300 focus:border-green-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="left-pd" className="text-xs text-gray-600">PD</Label>
                    <Input
                      id="left-pd"
                      value={leftPd}
                      onChange={(e) => setLeftPd(e.target.value)}
                      placeholder="mm"
                      className="h-9 border-green-300 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Lab Charges - Breakdown */}
              <div className="border-t border-purple-300 pt-4">
                <Label className="text-sm font-semibold text-purple-900 mb-3 block">Lab Charges Breakdown</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="lens-charge" className="text-xs text-gray-600">Lens Charge (৳)</Label>
                    <Input
                      id="lens-charge"
                      type="number"
                      value={lensCharge}
                      onChange={(e) => setLensCharge(Number(e.target.value))}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fitting-charge" className="text-xs text-gray-600">Fitting Charge (৳)</Label>
                    <Input
                      id="fitting-charge"
                      type="number"
                      value={fittingCharge}
                      onChange={(e) => setFittingCharge(Number(e.target.value))}
                      placeholder="0.00"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-600">Total Lab Charges (৳)</Label>
                    <div className="h-9 px-3 flex items-center bg-purple-100 border border-purple-300 rounded-md">
                      <span className="font-semibold text-purple-900">
                        ৳{(lensCharge + fittingCharge).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">Required for Additional Lens Reports</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>}

      {/* SMS to Customer */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Send SMS to Customer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="sms-recipient" className="text-xs text-gray-600">Recipient Phone Number</Label>
            <Input
              id="sms-recipient"
              value={smsRecipient}
              onChange={(e) => setSmsRecipient(e.target.value)}
              placeholder="+880..."
              className="h-9"
            />
          </div>
          <div className="flex gap-3">
            <Textarea
              value={smsMessage}
              onChange={(e) => setSmsMessage(e.target.value)}
              placeholder="Type your SMS message here..."
              rows={3}
              className="flex-1"
            />
            <Button 
              onClick={handleSendSMS}
              disabled={isSendingSMS || !smsMessage.trim()}
              className="gap-2 h-auto"
            >
              {isSendingSMS ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  Send SMS
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-600">
            Via SMS API
          </p>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Activity Log
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {activityLog.map((log, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded text-sm border border-gray-200">
                <p className="font-medium text-gray-900">{log.action}</p>
                {log.details && (
                  <p className="text-gray-600 mt-1 text-xs">{log.details}</p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <span>{log.user}</span>
                  <span>•</span>
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hidden Templates for PDF Generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {/* Invoice Template */}
        <InvoiceTemplate
          ref={invoiceRef}
          orderId={order.woo_order_id}
          orderDate={new Date(order.date).toLocaleDateString('en-GB')}
          invoiceNumber={`149${order.woo_order_id.slice(-4)}`}
          invoiceDate={new Date().toLocaleDateString('en-GB')}
          customerName={customerName}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          customerDistrict={customerDistrict}
          items={orderItems.map(item => ({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
          }))}
          subtotal={subtotal}
          shippingFee={shippingFee}
          discount={discount}
          lensPrice={lensPrice}
          total={total}
          paymentMethod={paymentMethod}
          prescriptionType={prescriptionType}
          lensType={lensType}
          customLensType={customLensType}
          prescription={prescriptionType ? {
            rightSph,
            rightCyl,
            rightAxis,
            rightPd,
            leftSph,
            leftCyl,
            leftAxis,
            leftPd,
          } : undefined}
        />
        
        {/* Packing Slip Template */}
        <PackingSlipTemplate
          ref={packingSlipRef}
          orderId={order.woo_order_id}
          orderDate={new Date(order.date).toLocaleDateString('en-GB')}
          customerName={customerName}
          customerPhone={customerPhone}
          customerAddress={customerAddress}
          customerDistrict={customerDistrict}
          items={orderItems.map(item => ({
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            serialNumber: item.serial_number || `${item.sku}-LOT-${Math.floor(Math.random() * 1000)}`,
            pickLocation: `${String.fromCharCode(65 + Math.floor(Math.random() * 5))}${Math.floor(Math.random() * 20) + 1}`,
          }))}
          courierCompany={courierCompany}
          paymentMethod={paymentMethod}
          prescriptionType={prescriptionType}
          lensType={lensType}
          customLensType={customLensType}
          prescription={prescriptionType ? {
            rightSph,
            rightCyl,
            rightAxis,
            rightPd,
            leftSph,
            leftCyl,
            leftAxis,
            leftPd,
          } : undefined}
          lensCharge={lensCharge}
          fittingCharge={fittingCharge}
        />
      </div>
    </div>
  );
}
