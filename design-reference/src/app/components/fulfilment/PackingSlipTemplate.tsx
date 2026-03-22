import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface PackingSlipItem {
  sku: string;
  name: string;
  quantity: number;
  serialNumber?: string;
  pickLocation?: string;
}

interface PrescriptionData {
  rightSph: string;
  rightCyl: string;
  rightAxis: string;
  rightPd: string;
  leftSph: string;
  leftCyl: string;
  leftAxis: string;
  leftPd: string;
}

interface PackingSlipTemplateProps {
  orderId: string;
  orderDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerDistrict: string;
  items: PackingSlipItem[];
  courierCompany: string;
  paymentMethod: string;
  
  // Additional lens data
  prescriptionType?: string;
  lensType?: string;
  customLensType?: string;
  prescription?: PrescriptionData;
  lensCharge?: number;
  fittingCharge?: number;
}

export const PackingSlipTemplate = React.forwardRef<HTMLDivElement, PackingSlipTemplateProps>((props, ref) => {
  const {
    orderId,
    orderDate,
    customerName,
    customerPhone,
    customerAddress,
    customerDistrict,
    items,
    courierCompany,
    paymentMethod,
    prescriptionType,
    lensType,
    customLensType,
    prescription,
    lensCharge,
    fittingCharge,
  } = props;

  const hasAdditionalLens = prescriptionType && lensType;
  const totalLabCharges = (lensCharge || 0) + (fittingCharge || 0);
  
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    // Generate QR code with order ID for "Start Pick" functionality
    const qrData = JSON.stringify({
      action: 'start_pick',
      orderId: orderId,
    });
    
    QRCode.toDataURL(qrData, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('QR Code generation error:', err));
  }, [orderId]);

  const formatLensType = (type: string) => {
    const types: Record<string, string> = {
      multicoated: 'Multicoated Lens',
      hard_coated: 'Hard Coated Lens',
      standard_antiblue: 'Standard Anti-blue Lens',
      eyepro_premium_antiblue: 'Eyepro Premium Anti-Blue Lens',
      standard_photochromic: 'Standard Photochromic Lens',
      eyepro_premium_photochromic: 'Eyepro Premium Photochromic Lens',
      high_index: 'High Index Lens',
      custom: customLensType || 'Custom Lens',
    };
    return types[type] || type;
  };

  const formatPrescriptionType = (type: string) => {
    const types: Record<string, string> = {
      single_vision: 'Single Vision',
      progressive: 'Progressive',
      bifocal: 'Bifocal',
      blue_light: 'Blue Light Filter',
      transition: 'Transition',
    };
    return types[type] || type;
  };

  return (
    <div ref={ref} style={{ 
      width: '210mm', 
      minHeight: '297mm', 
      padding: '15mm', 
      backgroundColor: '#ffffff', 
      fontFamily: 'Arial, Helvetica, sans-serif',
      color: '#000000',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <div style={{ borderBottom: '4px solid #000000', paddingBottom: '15px', marginBottom: '25px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '2px' }}>PACKING SLIP</h1>
            <p style={{ fontSize: '14px', margin: '8px 0 0 0', fontFamily: 'Arial, Helvetica, sans-serif', color: '#dc2626', fontWeight: 'bold' }}>
              WAREHOUSE PICK INSTRUCTIONS
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '15px', margin: '0 0 5px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <strong>Order ID:</strong> {orderId}
            </p>
            <p style={{ fontSize: '15px', margin: '0', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <strong>Date:</strong> {orderDate}
            </p>
          </div>
        </div>
      </div>

      {/* Shipping and Customer Information */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px', marginBottom: '30px' }}>
        <div style={{ border: '2px solid #000000', padding: '15px', backgroundColor: '#f9fafb' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000', margin: '0 0 12px 0', fontFamily: 'Arial, Helvetica, sans-serif', textTransform: 'uppercase' }}>
            Ship To:
          </h3>
          <p style={{ fontSize: '14px', margin: '0 0 6px 0', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>{customerName}</p>
          <p style={{ fontSize: '13px', margin: '0 0 6px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>{customerPhone}</p>
          <p style={{ fontSize: '13px', margin: '0 0 6px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>{customerAddress}</p>
          <p style={{ fontSize: '13px', margin: 0, fontFamily: 'Arial, Helvetica, sans-serif' }}><strong>{customerDistrict}</strong></p>
        </div>
        <div style={{ border: '2px solid #000000', padding: '15px', backgroundColor: '#f9fafb' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#000000', margin: '0 0 12px 0', fontFamily: 'Arial, Helvetica, sans-serif', textTransform: 'uppercase' }}>
            Shipping Details:
          </h3>
          <p style={{ fontSize: '13px', margin: '0 0 6px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <strong>Courier:</strong> {courierCompany}
          </p>
          <p style={{ fontSize: '13px', margin: 0, fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <strong>Payment:</strong> {paymentMethod}
          </p>
        </div>
      </div>

      {/* Pick Instructions */}
      <div style={{ backgroundColor: '#fef3c7', border: '3px solid #f59e0b', padding: '15px', marginBottom: '25px' }}>
        <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, Helvetica, sans-serif', color: '#92400e' }}>
          ⚠️ WAREHOUSE STAFF: Pick the following items from their specified locations. Verify serial numbers match.
        </p>
      </div>

      {/* Items to Pick */}
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: '#000000', margin: '0 0 15px 0', fontFamily: 'Arial, Helvetica, sans-serif', textTransform: 'uppercase', borderBottom: '3px solid #000000', paddingBottom: '8px' }}>
          Items to Pick
        </h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
          <thead>
            <tr style={{ backgroundColor: '#000000', color: '#ffffff' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>SKU</th>
              <th style={{ padding: '12px', textAlign: 'left', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>Product Name</th>
              <th style={{ padding: '12px', textAlign: 'center', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold', backgroundColor: '#1e40af' }}>Serial Number</th>
              <th style={{ padding: '12px', textAlign: 'center', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold', backgroundColor: '#059669' }}>Pick Location</th>
              <th style={{ padding: '12px', textAlign: 'center', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>Qty</th>
              <th style={{ padding: '12px', textAlign: 'center', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>✓</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f3f4f6', borderBottom: '1px solid #d1d5db' }}>
                <td style={{ padding: '12px', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold' }}>{item.sku}</td>
                <td style={{ padding: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{item.name}</td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  fontFamily: 'Arial, Helvetica, sans-serif', 
                  backgroundColor: '#dbeafe', 
                  color: '#1e40af', 
                  fontWeight: 'bold',
                  fontSize: '14px',
                  border: '2px solid #3b82f6'
                }}>
                  {item.serialNumber || '-'}
                </td>
                <td style={{ 
                  padding: '12px', 
                  textAlign: 'center', 
                  fontFamily: 'Arial, Helvetica, sans-serif', 
                  backgroundColor: '#d1fae5', 
                  color: '#059669', 
                  fontWeight: 'bold',
                  fontSize: '16px',
                  border: '2px solid #10b981'
                }}>
                  {item.pickLocation || '-'}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '14px', fontWeight: 'bold' }}>
                  {item.quantity}
                </td>
                <td style={{ padding: '12px', textAlign: 'center', border: '2px solid #d1d5db' }}>
                  <div style={{ width: '25px', height: '25px', border: '2px solid #000000', margin: '0 auto' }}></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Prescription Lens Instructions */}
      {hasAdditionalLens && prescription && (
        <div style={{ 
          marginBottom: '30px', 
          backgroundColor: '#faf5ff', 
          padding: '20px', 
          border: '3px solid #a855f7',
          pageBreakInside: 'avoid'
        }}>
          <h3 style={{ 
            fontSize: '16px', 
            fontWeight: 'bold', 
            color: '#7c3aed', 
            margin: '0 0 15px 0', 
            fontFamily: 'Arial, Helvetica, sans-serif',
            textTransform: 'uppercase',
            borderBottom: '2px solid #a855f7',
            paddingBottom: '8px'
          }}>
            ⚠️ PRESCRIPTION LENS - LAB INSTRUCTIONS
          </h3>
          
          <div style={{ marginBottom: '15px' }}>
            <p style={{ fontSize: '14px', margin: '0 0 8px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <strong>Prescription Type:</strong> {formatPrescriptionType(prescriptionType)}
            </p>
            <p style={{ fontSize: '14px', margin: '0', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <strong>Lens Type:</strong> {formatLensType(lensType)}
            </p>
          </div>

          {/* Prescription Values - Highlighted for Lab */}
          <div style={{ backgroundColor: '#ffffff', padding: '15px', border: '2px solid #a855f7', marginBottom: '15px' }}>
            <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#dc2626', margin: '0 0 12px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>
              ⚠️ LAB TECHNICIAN: Verify these values carefully before processing
            </p>
            
            {/* Right Eye */}
            <div style={{ marginBottom: '15px', paddingBottom: '15px', borderBottom: '2px solid #e9d5ff' }}>
              <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e40af', margin: '0 0 10px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                RIGHT EYE (OD)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ backgroundColor: '#dbeafe', padding: '10px', border: '3px solid #3b82f6', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', margin: '0 0 5px 0', color: '#1e40af', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>SPH</p>
                  <p style={{ fontSize: '18px', margin: 0, color: '#1e3a8a', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    {prescription.rightSph || '-'}
                  </p>
                </div>
                <div style={{ backgroundColor: '#dbeafe', padding: '10px', border: '3px solid #3b82f6', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', margin: '0 0 5px 0', color: '#1e40af', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>CYL</p>
                  <p style={{ fontSize: '18px', margin: 0, color: '#1e3a8a', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    {prescription.rightCyl || '-'}
                  </p>
                </div>
                <div style={{ backgroundColor: '#dbeafe', padding: '10px', border: '3px solid #3b82f6', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', margin: '0 0 5px 0', color: '#1e40af', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>AXIS</p>
                  <p style={{ fontSize: '18px', margin: 0, color: '#1e3a8a', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    {prescription.rightAxis || '-'}
                  </p>
                </div>
                <div style={{ backgroundColor: '#dbeafe', padding: '10px', border: '3px solid #3b82f6', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', margin: '0 0 5px 0', color: '#1e40af', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>PD</p>
                  <p style={{ fontSize: '18px', margin: 0, color: '#1e3a8a', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    {prescription.rightPd || '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Left Eye */}
            <div>
              <p style={{ fontSize: '13px', fontWeight: 'bold', color: '#059669', margin: '0 0 10px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                LEFT EYE (OS)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ backgroundColor: '#d1fae5', padding: '10px', border: '3px solid #10b981', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', margin: '0 0 5px 0', color: '#059669', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>SPH</p>
                  <p style={{ fontSize: '18px', margin: 0, color: '#065f46', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    {prescription.leftSph || '-'}
                  </p>
                </div>
                <div style={{ backgroundColor: '#d1fae5', padding: '10px', border: '3px solid #10b981', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', margin: '0 0 5px 0', color: '#059669', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>CYL</p>
                  <p style={{ fontSize: '18px', margin: 0, color: '#065f46', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    {prescription.leftCyl || '-'}
                  </p>
                </div>
                <div style={{ backgroundColor: '#d1fae5', padding: '10px', border: '3px solid #10b981', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', margin: '0 0 5px 0', color: '#059669', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>AXIS</p>
                  <p style={{ fontSize: '18px', margin: 0, color: '#065f46', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    {prescription.leftAxis || '-'}
                  </p>
                </div>
                <div style={{ backgroundColor: '#d1fae5', padding: '10px', border: '3px solid #10b981', textAlign: 'center' }}>
                  <p style={{ fontSize: '11px', margin: '0 0 5px 0', color: '#059669', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>PD</p>
                  <p style={{ fontSize: '18px', margin: 0, color: '#065f46', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                    {prescription.leftPd || '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Lab Charges */}
          {totalLabCharges > 0 && (
            <div style={{ backgroundColor: '#ffffff', padding: '12px', border: '2px solid #a855f7' }}>
              <p style={{ fontSize: '13px', fontWeight: 'bold', margin: '0 0 8px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>Lab Billing:</p>
              <div style={{ display: 'flex', gap: '20px', fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                <p style={{ margin: 0 }}>Lens Charge: <strong>৳{(lensCharge || 0).toFixed(2)}</strong></p>
                <p style={{ margin: 0 }}>Fitting Charge: <strong>৳{(fittingCharge || 0).toFixed(2)}</strong></p>
                <p style={{ margin: 0 }}>Total: <strong>৳{totalLabCharges.toFixed(2)}</strong></p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* QR Code for Start Pick */}
      <div style={{ marginTop: '30px', border: '3px solid #000000', padding: '20px', backgroundColor: '#f3f4f6', textAlign: 'center' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0 0 15px 0', fontFamily: 'Arial, Helvetica, sans-serif', textTransform: 'uppercase' }}>
          Scan to Start Pick Process
        </h3>
        <div style={{ backgroundColor: '#ffffff', padding: '20px', display: 'inline-block', border: '2px solid #000000' }}>
          {qrCodeUrl && (
            <img src={qrCodeUrl} alt={`QR Code for Order ${orderId}`} style={{ width: '200px', height: '200px' }} />
          )}
        </div>
        <p style={{ fontSize: '13px', margin: '15px 0 0 0', fontFamily: 'Arial, Helvetica, sans-serif', color: '#6b7280' }}>
          Scan this QR code with the app to open the Start Pick modal for Order #{orderId}
        </p>
      </div>

      {/* Footer */}
      <div style={{ marginTop: '30px', textAlign: 'center', fontSize: '10px', color: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif' }}>
        <p style={{ margin: 0 }}>Eyewear ERP System - Packing Slip | This is an internal warehouse document</p>
      </div>
    </div>
  );
});

PackingSlipTemplate.displayName = 'PackingSlipTemplate';
