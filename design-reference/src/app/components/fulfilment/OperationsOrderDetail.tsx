import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Printer, FileText, Check } from "lucide-react";
import { orders } from "../../data/mockData";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { InvoiceTemplate } from "./InvoiceTemplate";
import { PackingSlipTemplate } from "./PackingSlipTemplate";
import type { Order } from "../../data/mockData";

export function OperationsOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = orders.find((o) => o.order_id === id);

  const invoiceRef = useRef<HTMLDivElement>(null);
  const packingSlipRef = useRef<HTMLDivElement>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isGeneratingPackingSlip, setIsGeneratingPackingSlip] = useState(false);
  const [orderStatus, setOrderStatus] = useState(order?.cs_status || 'not_printed');

  useEffect(() => {
    // Check QR code scans
    const handleQRCodeScan = (event: CustomEvent) => {
      const data = event.detail;
      try {
        const parsed = JSON.parse(data);
        if (parsed.action === 'start_pick' && parsed.orderId === order?.woo_order_id) {
          toast.success(`QR Code scanned for order ${parsed.orderId}!`);
          // You can trigger the pick modal here if needed
        }
      } catch (e) {
        // Not a valid QR code format
      }
    };

    window.addEventListener('qr-code-scanned' as any, handleQRCodeScan as any);
    return () => {
      window.removeEventListener('qr-code-scanned' as any, handleQRCodeScan as any);
    };
  }, [order]);

  if (!order) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="text-center text-gray-500">Order not found</div>
      </div>
    );
  }

  // Extract order details
  const customerName = order.customer_name || '';
  const customerPhone = order.customer_phone || '';
  const customerAddress = order.shipping_address || '';
  const customerDistrict = order.district || '';
  const paymentMethod = order.payment_method || 'COD';
  const courierCompany = order.courier_company || 'Steadfast';
  const orderItems = order.items || [];
  
  const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shippingFee = order.shipping_fee || 0;
  const discount = order.discount || 0;
  const lensPrice = order.lens_price || 0;
  const total = order.total || 0;
  
  // Prescription data
  const prescriptionType = order.prescription_type;
  const lensType = order.lens_type;
  const customLensType = order.custom_lens_type;
  const lensCharge = order.lens_charge || 0;
  const fittingCharge = order.fitting_charge || 0;
  
  const rightSph = order.right_sph || '';
  const rightCyl = order.right_cyl || '';
  const rightAxis = order.right_axis || '';
  const rightPd = order.right_pd || '';
  const leftSph = order.left_sph || '';
  const leftCyl = order.left_cyl || '';
  const leftAxis = order.left_axis || '';
  const leftPd = order.left_pd || '';

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
      
      toast.success("Packing slip generated successfully!");
    } catch (error) {
      console.error("Error generating packing slip:", error);
      toast.error("Failed to generate packing slip");
    } finally {
      setIsGeneratingPackingSlip(false);
    }
  };

  const handleMarkAsPrinted = () => {
    setOrderStatus('printed');
    toast.success(`Order ${order.woo_order_id} marked as printed!`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-semibold">Order {order.woo_order_id}</h1>
            <p className="text-gray-600 mt-1">Operations View</p>
          </div>
        </div>
        <Badge
          className={
            orderStatus === 'printed'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-red-100 text-red-700'
          }
        >
          {orderStatus === 'printed' ? 'Printed' : 'Not Printed'}
        </Badge>
      </div>

      {/* Order Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Order Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Customer Details</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Name:</span> {customerName}</p>
                <p><span className="font-medium">Phone:</span> {customerPhone}</p>
                <p><span className="font-medium">Address:</span> {customerAddress}</p>
                <p><span className="font-medium">District:</span> {customerDistrict}</p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Order Details</h3>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Order Date:</span> {new Date(order.date).toLocaleDateString('en-GB')}</p>
                <p><span className="font-medium">Payment Method:</span> {paymentMethod}</p>
                <p><span className="font-medium">Courier:</span> {courierCompany}</p>
                <p><span className="font-medium">Total:</span> ৳{total.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Card */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {orderItems.map((item, index) => (
              <div key={index} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-gray-600">SKU: {item.sku}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium">Qty: {item.quantity}</p>
                  <p className="text-sm text-gray-600">৳{item.price.toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle>Operations Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={handleGenerateInvoice}
              variant="outline"
              className="gap-2"
              disabled={isGeneratingInvoice}
            >
              <FileText className="w-4 h-4" />
              {isGeneratingInvoice ? 'Generating...' : 'Print Invoice'}
            </Button>
            <Button
              onClick={handleGeneratePackingSlip}
              variant="outline"
              className="gap-2"
              disabled={isGeneratingPackingSlip}
            >
              <Printer className="w-4 h-4" />
              {isGeneratingPackingSlip ? 'Generating...' : 'Print Packing Slip'}
            </Button>
            <Button
              onClick={handleMarkAsPrinted}
              variant="default"
              className="gap-2 bg-green-600 hover:bg-green-700"
              disabled={orderStatus === 'printed'}
            >
              <Check className="w-4 h-4" />
              {orderStatus === 'printed' ? 'Already Printed' : 'Mark As Printed'}
            </Button>
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
