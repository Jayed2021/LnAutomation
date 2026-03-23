import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import ReactDOM from 'react-dom/client';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';
import {
  OrderDetail as OrderDetailType, OrderItem, OrderCourierInfo,
  OrderPrescription, OrderNote, CallLog, ActivityLog, PackagingItem
} from './types';
import {
  fetchOrderDetail, fetchOrderItems, fetchOrderCourierInfo,
  fetchOrderPrescriptions, fetchOrderNotes, fetchCallLog,
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
  const [prescriptions, setPrescriptions] = useState<OrderPrescription[]>([]);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [callLog, setCallLog] = useState<CallLog[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [ord, its, cou, prescs, nts, calls, acts, pkg] = await Promise.all([
        fetchOrderDetail(id),
        fetchOrderItems(id),
        fetchOrderCourierInfo(id),
        fetchOrderPrescriptions(id),
        fetchOrderNotes(id),
        fetchCallLog(id),
        fetchActivityLog(id),
        fetchPackagingItems(id),
      ]);
      if (!ord) { navigate('/fulfillment/orders'); return; }
      setOrder(ord);
      setItems(its);
      setCourier(cou);
      setPrescriptions(prescs);
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
      <InvoiceTemplate order={order} items={items} prescriptions={prescriptions} packagingItems={packagingItems} />
    );
  };

  const handlePrintPackingSlip = () => {
    if (!order) return;
    printContent(<PackingSlipTemplate order={order} items={items} />);
  };

  const handleDeleteOrder = async () => {
    if (!id) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await supabase.from('order_activity_log').delete().eq('order_id', id);
      await supabase.from('order_call_log').delete().eq('order_id', id);
      await supabase.from('order_notes').delete().eq('order_id', id);
      await supabase.from('order_prescriptions').delete().eq('order_id', id);
      await supabase.from('order_packaging_items').delete().eq('order_id', id);
      await supabase.from('order_courier_info').delete().eq('order_id', id);
      await supabase.from('order_items').delete().eq('order_id', id);
      const { error } = await supabase.from('orders').delete().eq('id', id);
      if (error) throw error;
      navigate('/fulfillment/orders');
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete order.');
      setDeleting(false);
    }
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
        onDeleteOrder={() => setShowDeleteConfirm(true)}
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
      <PrescriptionCard orderId={order.id} prescriptions={prescriptions} items={items} userId={user?.id ?? null} onUpdated={load} />

      {/* SMS */}
      <SmsCard phone={order.customer?.phone_primary ?? ''} />

      {/* Activity Log */}
      <ActivityLogCard logs={activityLog} />

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900">Delete Order</h2>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm text-gray-700">
                You are about to permanently delete order <span className="font-semibold">#{order.woo_order_id ?? order.order_number}</span> and all its associated data including:
              </p>
              <ul className="text-sm text-gray-500 list-disc list-inside space-y-0.5 ml-1">
                <li>Order items</li>
                <li>Courier & payment info</li>
                <li>Notes, call logs & activity history</li>
                <li>Prescription & packaging details</li>
              </ul>
              {deleteError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {deleteError}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-5 border-t">
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteOrder}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
