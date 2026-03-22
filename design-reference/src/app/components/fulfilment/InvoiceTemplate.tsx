import React from 'react';
import { getAppSettings } from '../../store/appSettings';

interface InvoiceItem {
  sku: string;
  name: string;
  quantity: number;
  price: number;
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

interface InvoiceTemplateProps {
  orderId: string;
  orderDate: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerDistrict: string;
  items: InvoiceItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  lensPrice: number;
  total: number;
  paymentMethod: string;
  
  // Additional lens data
  prescriptionType?: string;
  lensType?: string;
  customLensType?: string;
  prescription?: PrescriptionData;
}

export const InvoiceTemplate = React.forwardRef<HTMLDivElement, InvoiceTemplateProps>((props, ref) => {
  const {
    orderId,
    orderDate,
    invoiceNumber,
    invoiceDate,
    customerName,
    customerPhone,
    customerAddress,
    customerDistrict,
    items,
    subtotal,
    shippingFee,
    discount,
    lensPrice,
    total,
    paymentMethod,
    prescriptionType,
    lensType,
    customLensType,
    prescription,
  } = props;

  const store = getAppSettings();

  const hasAdditionalLens = prescriptionType && lensType;

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
      {/* Header with Logo and Company Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
          {store.storeLogo ? (
            <img src={store.storeLogo} alt={store.storeName} style={{ height: '56px', maxWidth: '160px', objectFit: 'contain' }} />
          ) : (
            <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: 0, fontFamily: 'Arial, Helvetica, sans-serif', letterSpacing: '2px' }}>
              {store.storeName.toUpperCase()}
            </h1>
          )}
          {store.storeTagline && (
            <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#6b7280', fontStyle: 'italic', fontFamily: 'Arial, Helvetica, sans-serif', alignSelf: 'flex-end' }}>
              {store.storeTagline}
            </p>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>{store.storeName}</p>
          {store.storeAddressLine1 && <p style={{ margin: '4px 0', fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{store.storeAddressLine1}</p>}
          {store.storeAddressLine2 && <p style={{ margin: '4px 0', fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{store.storeAddressLine2}</p>}
          {store.storeCity && <p style={{ margin: '4px 0', fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{[store.storeCity, store.storePostalCode].filter(Boolean).join(' - ')}</p>}
          {store.storeCountry && <p style={{ margin: '4px 0', fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{store.storeCountry}</p>}
          {store.storeTaxId && <p style={{ margin: '4px 0', fontSize: '11px', color: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif' }}>TIN/BIN: {store.storeTaxId}</p>}
          {store.storePhone && <p style={{ margin: '12px 0 4px 0', fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{store.storePhone}</p>}
          {store.storeSecondaryPhone && <p style={{ margin: '4px 0', fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{store.storeSecondaryPhone}</p>}
          {store.storeEmail && <p style={{ margin: '4px 0', fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{store.storeEmail}</p>}
          {store.storeWebsite && <p style={{ margin: '4px 0', fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{store.storeWebsite}</p>}
        </div>
      </div>

      {/* Invoice Title */}
      <h2 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 30px 0', fontFamily: 'Arial, Helvetica, sans-serif' }}>INVOICE</h2>

      {/* Customer and Invoice Details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div style={{ width: '45%' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{customerName}</p>
          <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{customerAddress}</p>
          <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: 'bold', fontFamily: 'Arial, Helvetica, sans-serif' }}>{customerDistrict.toUpperCase()}</p>
          <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{customerDistrict}</p>
          <p style={{ margin: '0', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif' }}>{customerPhone}</p>
        </div>
        <div style={{ width: '45%', textAlign: 'right' }}>
          <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <span>Invoice Number:</span> <span style={{ marginLeft: '20px' }}>{invoiceNumber}</span>
          </p>
          <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <span>Invoice Date:</span> <span style={{ marginLeft: '20px' }}>{invoiceDate}</span>
          </p>
          <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <span>Order Number:</span> <span style={{ marginLeft: '20px' }}>{orderId}</span>
          </p>
          <p style={{ margin: '0 0 6px 0', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <span>Order Date:</span> <span style={{ marginLeft: '20px' }}>{orderDate}</span>
          </p>
          <p style={{ margin: '0', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <span>Payment Method:</span> <span style={{ marginLeft: '20px' }}>{paymentMethod}</span>
          </p>
        </div>
      </div>

      {/* Products Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
        <thead>
          <tr style={{ backgroundColor: '#000000', color: '#ffffff' }}>
            <th style={{ padding: '12px', textAlign: 'left', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold', fontSize: '13px' }}>Product</th>
            <th style={{ padding: '12px', textAlign: 'right', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold', fontSize: '13px' }}>Quantity</th>
            <th style={{ padding: '12px', textAlign: 'right', fontFamily: 'Arial, Helvetica, sans-serif', fontWeight: 'bold', fontSize: '13px' }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <React.Fragment key={index}>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 12px 4px 12px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px' }}>{item.name}</td>
                <td style={{ padding: '12px 12px 4px 12px', textAlign: 'right', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', color: '#d97706' }}>{item.quantity}</td>
                <td style={{ padding: '12px 12px 4px 12px', textAlign: 'right', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px' }}>৳{item.price.toFixed(2)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td colSpan={3} style={{ padding: '0 12px 12px 12px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11px' }}>
                  <span style={{ fontWeight: 'bold' }}>SKU:</span> {item.sku}
                </td>
              </tr>
            </React.Fragment>
          ))}
          
          {/* Additional Lens Row */}
          {hasAdditionalLens && lensPrice > 0 && (
            <React.Fragment>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 12px 4px 12px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px' }}>
                  {formatPrescriptionType(prescriptionType)} - {formatLensType(lensType)}
                </td>
                <td style={{ padding: '12px 12px 4px 12px', textAlign: 'right', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px', color: '#d97706' }}>1</td>
                <td style={{ padding: '12px 12px 4px 12px', textAlign: 'right', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px' }}>৳{lensPrice.toFixed(2)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td colSpan={3} style={{ padding: '0 12px 12px 12px', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '11px' }}>
                  <span style={{ fontWeight: 'bold' }}>Prescription Lens Service</span>
                </td>
              </tr>
            </React.Fragment>
          )}
        </tbody>
      </table>

      {/* Prescription Details (if applicable) */}
      {hasAdditionalLens && prescription && (
        <div style={{ marginBottom: '30px', padding: '15px', border: '1px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
          <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', fontSize: '13px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
            Prescription Details:
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '12px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
            <div>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Right Eye (OD):</p>
              <p style={{ margin: '0' }}>SPH: {prescription.rightSph || '-'} | CYL: {prescription.rightCyl || '-'} | AXIS: {prescription.rightAxis || '-'} | PD: {prescription.rightPd || '-'}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>Left Eye (OS):</p>
              <p style={{ margin: '0' }}>SPH: {prescription.leftSph || '-'} | CYL: {prescription.leftCyl || '-'} | AXIS: {prescription.leftAxis || '-'} | PD: {prescription.leftPd || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Totals */}
      <div style={{ marginLeft: 'auto', width: '350px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px' }}>
          <span>Subtotal</span>
          <span>৳{subtotal.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px' }}>
            <span>Discount</span>
            <span>-৳{discount.toFixed(2)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #000000', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '13px' }}>
          <span>Shipping</span>
          <span>৳{shippingFee.toFixed(2)} <span style={{ fontSize: '11px' }}>via Standard Shipping</span></span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '15px', fontWeight: 'bold', borderBottom: '3px double #000000' }}>
          <span>Total</span>
          <span>৳{total.toFixed(2)}</span>
        </div>
      </div>

      {/* Footer note */}
      {store.storeFooterNote && (
        <div style={{ marginTop: '40px', paddingTop: '16px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '11px', color: '#6b7280', fontFamily: 'Arial, Helvetica, sans-serif', fontStyle: 'italic' }}>
            {store.storeFooterNote}
          </p>
        </div>
      )}
    </div>
  );
});

InvoiceTemplate.displayName = 'InvoiceTemplate';