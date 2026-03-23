import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom/client';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  OrderDetail as OrderDetailType, OrderItem, OrderCourierInfo,
  OrderPrescription, OrderNote, CallLog, ActivityLog, PackagingItem
} from './types';
import {
  fetchOrderDetail, fetchOrderItems, fetchOrderCourierInfo,
  fetchOrderPrescription, fetchOrderNotes, fetchCallLog,
  fetchActivityLog, fetchPackagingItems
} from './service';
import { OrderHeader } from './OrderHeader';
import { CustomerInfoCard } from './CustomerInfoCard';
import { CourierPaymentCard } from './CourierPaymentCard';
import { OrderSourceCard } from './OrderSourceCard';
import { OrderNotesCard, CallLogCard } from './NotesCallLog';
import { OrderItemsCard } from './OrderItemsCard';
import { PackagingCard } from './PackagingCard';
import { PrescriptionCard } from './PrescriptionCard';
import { SmsCard } from './SmsCard';
import { ActivityLogCard } from './ActivityLogCard';
import { CsActionPanel } from './CsActionPanel';
import { InvoiceTemplate, PackingSlipTemplate } from './InvoiceTemplate';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [courier, setCourier] = useState<OrderCourierInfo | null>(null);
  const [prescription, setPrescription] = useState<OrderPrescription | null>(null);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [callLog, setCallLog] = useState<CallLog[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [ord, its, cou, presc, nts, calls, acts, pkg] = await Promise.all([
        fetchOrderDetail(id),
        fetchOrderItems(id),
        fetchOrderCourierInfo(id),
        fetchOrderPrescription(id),
        fetchOrderNotes(id),
        fetchCallLog(id),
        fetchActivityLog(id),
        fetchPackagingItems(id),
      ]);
      if (!ord) { navigate('/fulfillment/orders'); return; }
      setOrder(ord);
      setItems(its);
      setCourier(cou);
      setPrescription(presc);
      setNotes(nts);
      setCallLog(calls);
      setActivityLog(acts);
      setPackagingItems(pkg);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
    supabase.from('users').select('id, full_name').eq('is_active', true).order('full_name').then(({ data }) => {
      setUsers(data ?? []);
    });
  }, [load]);

  const printContent = (content: React.ReactElement) => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="UTF-8">
      <title>Print</title>
      <style>
        body { margin: 0; padding: 0; font-family: sans-serif; }
        @media print { body { margin: 0; } }
        table { border-collapse: collapse; }
      </style>
      </head><body><div id="root"></div></body></html>
    `);
    printWindow.document.close();
    const root = ReactDOM.createRoot(printWindow.document.getElementById('root')!);
    root.render(content);
    setTimeout(() => { printWindow.print(); }, 600);
  };

  const handlePrintInvoice = () => {
    if (!order) return;
    printContent(
      <InvoiceTemplate order={order} items={items} prescription={prescription} packagingItems={packagingItems} />
    );
  };

  const handlePrintPackingSlip = () => {
    if (!order) return;
    printContent(<PackingSlipTemplate order={order} items={items} />);
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-gray-100 rounded-xl" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-80 bg-gray-100 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="space-y-5 pb-10">
      <OrderHeader
        order={order}
        items={items}
        onPrintInvoice={handlePrintInvoice}
        onPrintPackingSlip={handlePrintPackingSlip}
      />

      {/* Three-column top section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <CustomerInfoCard order={order} onUpdated={load} />
        <CourierPaymentCard order={order} courier={courier} userId={user?.id ?? null} onUpdated={load} />
        <div className="space-y-5">
          <OrderSourceCard order={order} users={users} userId={user?.id ?? null} onUpdated={load} />
          <CsActionPanel
            order={order}
            items={items}
            userId={user?.id ?? null}
            userRole={user?.role ?? null}
            onUpdated={load}
          />
        </div>
      </div>

      {/* Notes and Call Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <OrderNotesCard orderId={order.id} notes={notes} userId={user?.id ?? null} onUpdated={load} />
        <CallLogCard orderId={order.id} callLog={callLog} userId={user?.id ?? null} onUpdated={load} />
      </div>

      {/* Order Items */}
      <OrderItemsCard order={order} items={items} userId={user?.id ?? null} onUpdated={load} />

      {/* Packaging */}
      <PackagingCard orderId={order.id} items={packagingItems} userId={user?.id ?? null} onUpdated={load} />

      {/* Prescription */}
      <PrescriptionCard orderId={order.id} prescription={prescription} userId={user?.id ?? null} onUpdated={load} />

      {/* SMS */}
      <SmsCard phone={order.customer?.phone_primary ?? ''} />

      {/* Activity Log */}
      <ActivityLogCard logs={activityLog} />
    </div>
  );
}
