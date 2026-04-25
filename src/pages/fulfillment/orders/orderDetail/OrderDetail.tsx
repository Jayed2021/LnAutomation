import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, AlertTriangle, X, Lock, PackageX, Banknote, FileText, Phone, Activity } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { useAuth } from '../../../../contexts/AuthContext';
import { REVENUE_CATEGORY_LABELS } from '../../../finance/collection/manualRevenueService';
import {
  OrderDetail as OrderDetailType, OrderItem, OrderCourierInfo,
  OrderPrescription, OrderNote, CallLog, ActivityLog, PackagingItem
} from './types';
import {
  fetchOrderDetail, fetchOrderItems, fetchOrderCourierInfo,
  fetchOrderPrescriptions, fetchOrderNotes, fetchCallLog,
  fetchActivityLog, fetchPackagingItems,
  fetchStoreProfile, fetchFifoLotsForItems, fetchDefaultPackagingWithPrice,
  StoreProfile,
} from './service';
import { OrderHeader } from './OrderHeader';
import { CustomerInfoCard } from './CustomerInfoCard';
import { CourierPaymentCard } from './CourierPaymentCard';
import { OrderSourceCard } from './OrderSourceCard';
import { OrderNotesCard, CallLogCard, AccordionSection } from './NotesCallLog';
import { OrderItemsCard } from './OrderItemsCard';
import { PackagingCard } from './PackagingCard';
import { PrescriptionCard } from './PrescriptionCard';
import { SmsCard } from './SmsCard';
import { ActivityLogCard } from './ActivityLogCard';
import { CsActionPanel } from './CsActionPanel';
import { CourierResponseCard } from './CourierResponseCard';
import { FraudAlertCard } from './FraudAlertCard';
import { buildInvoiceHtml, buildPackingSlipHtml } from './InvoiceTemplate';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, canDeleteOrders, canDoCSActions, canEditOrderSource } = useAuth();

  const [order, setOrder] = useState<OrderDetailType | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [courier, setCourier] = useState<OrderCourierInfo | null>(null);
  const [prescriptions, setPrescriptions] = useState<OrderPrescription[]>([]);
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [callLog, setCallLog] = useState<CallLog[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [packagingItems, setPackagingItems] = useState<PackagingItem[]>([]);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  const [storeProfile, setStoreProfile] = useState<StoreProfile | null>(null);
  const [manualRevenues, setManualRevenues] = useState<Array<{ id: string; amount: number; category: string; reference_number: string | null; bank_deposit_date: string | null }>>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [activeLock, setActiveLock] = useState<{ user_name: string } | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lockAcquiredRef = useRef(false);

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

      const { data: revData } = await supabase
        .from('manual_revenue_entries')
        .select('id, amount, category, reference_number, bank_deposit_date')
        .eq('order_id', id);
      setManualRevenues((revData ?? []) as any[]);
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
    fetchStoreProfile().then(sp => setStoreProfile(sp));
  }, [load]);

  useEffect(() => {
    if (!id || !user) return;

    const acquireLock = async () => {
      await supabase.from('order_locks').upsert(
        { order_id: id, user_id: user.id, user_name: user.full_name, locked_at: new Date().toISOString(), heartbeat_at: new Date().toISOString() },
        { onConflict: 'order_id' }
      );
      lockAcquiredRef.current = true;
    };

    const releaseLock = async () => {
      if (!lockAcquiredRef.current) return;
      await supabase.from('order_locks').delete().eq('order_id', id).eq('user_id', user.id);
      lockAcquiredRef.current = false;
    };

    const sendHeartbeat = async () => {
      if (!lockAcquiredRef.current) return;
      await supabase.from('order_locks').update({ heartbeat_at: new Date().toISOString() }).eq('order_id', id).eq('user_id', user.id);
    };

    acquireLock();
    heartbeatRef.current = setInterval(sendHeartbeat, 15000);

    const handleUnload = () => {
      if (lockAcquiredRef.current) {
        navigator.sendBeacon(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/order_locks?order_id=eq.${id}&user_id=eq.${user.id}`, '');
      }
    };
    window.addEventListener('beforeunload', handleUnload);

    const channel = supabase
      .channel(`order_lock_${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_locks', filter: `order_id=eq.${id}` }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setActiveLock(null);
        } else {
          const row = payload.new as { user_id: string; user_name: string; heartbeat_at: string };
          if (row.user_id !== user.id) {
            const age = Date.now() - new Date(row.heartbeat_at).getTime();
            setActiveLock(age < 30000 ? { user_name: row.user_name } : null);
          }
        }
      })
      .subscribe();

    supabase.from('order_locks').select('user_id, user_name, heartbeat_at').eq('order_id', id).maybeSingle().then(({ data }) => {
      if (data && data.user_id !== user.id) {
        const age = Date.now() - new Date(data.heartbeat_at).getTime();
        setActiveLock(age < 30000 ? { user_name: data.user_name } : null);
      }
    });

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      window.removeEventListener('beforeunload', handleUnload);
      supabase.removeChannel(channel);
      releaseLock();
    };
  }, [id, user]);

  const openPrintTab = (html: string) => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, '_blank');
    if (tab) {
      tab.addEventListener('load', () => {
        URL.revokeObjectURL(url);
      }, { once: true });
    } else {
      URL.revokeObjectURL(url);
    }
  };

  const handlePrintInvoice = async () => {
    if (!order) return;
    const [fifoLots, defaultPkg] = await Promise.all([
      fetchFifoLotsForItems(items, order.id),
      fetchDefaultPackagingWithPrice(),
    ]);
    openPrintTab(buildInvoiceHtml(order, items, prescriptions, storeProfile, fifoLots, packagingItems, defaultPkg));
  };

  const handlePrintPackingSlip = async () => {
    if (!order) return;
    const fifoLots = await fetchFifoLotsForItems(items, order.id);
    openPrintTab(buildPackingSlipHtml(order, items, packagingItems, fifoLots, storeProfile));
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
      {activeLock && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
          <Lock className="w-4 h-4 shrink-0 text-amber-600" />
          <span><span className="font-semibold">{activeLock.user_name}</span> is currently viewing this order.</span>
        </div>
      )}
      {order.stock_shortage && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          <PackageX className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
          <div>
            <div className="font-semibold text-red-800 mb-0.5">Stock Shortage</div>
            <p className="text-red-700 text-xs">
              Not enough available inventory to fulfil this order at the time of confirmation.
              Check inventory levels and receive more stock before picking.
            </p>
          </div>
        </div>
      )}
      <OrderHeader
        order={order}
        items={items}
        onPrintInvoice={handlePrintInvoice}
        onPrintPackingSlip={handlePrintPackingSlip}
        onDeleteOrder={() => setShowDeleteConfirm(true)}
        canDelete={canDeleteOrders}
      />

      <FraudAlertCard
        customerId={order.customer.id}
        defaultPhone={order.customer.phone_primary ?? ''}
      />

      {/* Three-column top section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <CustomerInfoCard order={order} onUpdated={load} />
        <div className="space-y-3">
          <CourierPaymentCard order={order} courier={courier} userId={user?.id ?? null} onUpdated={load} />
          {manualRevenues.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Additional Revenue Recorded</span>
              </div>
              <div className="space-y-1.5">
                {manualRevenues.map(r => (
                  <div key={r.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-medium text-emerald-700">
                        {(REVENUE_CATEGORY_LABELS as Record<string, string>)[r.category] ?? r.category}
                      </span>
                      {r.reference_number && (
                        <span className="text-xs text-emerald-600 ml-1">— Ref: {r.reference_number}</span>
                      )}
                      {r.bank_deposit_date && (
                        <span className="text-xs text-emerald-600 ml-1">· Deposited {r.bank_deposit_date}</span>
                      )}
                      {!r.bank_deposit_date && (
                        <span className="text-xs text-amber-600 ml-1">· Deposit pending</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-emerald-800">৳{r.amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}</span>
                  </div>
                ))}
                {manualRevenues.length > 1 && (
                  <div className="pt-1.5 border-t border-emerald-200 flex justify-between">
                    <span className="text-xs font-semibold text-emerald-700">Total</span>
                    <span className="text-sm font-bold text-emerald-800">
                      ৳{manualRevenues.reduce((s, r) => s + r.amount, 0).toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="space-y-5">
          <OrderSourceCard
            order={order}
            users={users}
            userId={user?.id ?? null}
            canEdit={canEditOrderSource}
            onUpdated={load}
          />
          {canDoCSActions && (
            <CsActionPanel
              order={order}
              items={items}
              userId={user?.id ?? null}
              userRole={user?.role ?? null}
              hasPrescription={prescriptions.length > 0}
              onUpdated={load}
            />
          )}
          <CourierResponseCard courier={courier} />
        </div>
      </div>

      {/* Notes + Call Log — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <AccordionSection
            icon={<FileText className="w-4 h-4" />}
            title="Order Notes"
            badge={notes.length > 0 ? (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                {notes.length}
              </span>
            ) : undefined}
            defaultOpen
            isLast
          >
            <OrderNotesCard orderId={order.id} notes={notes} userId={user?.id ?? null} onUpdated={load} />
          </AccordionSection>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <AccordionSection
            icon={<Phone className="w-4 h-4" />}
            title="Call Log"
            badge={
              <span className="text-xs bg-gray-900 text-white px-2 py-0.5 rounded-full font-medium">
                {callLog.length} attempt{callLog.length !== 1 ? 's' : ''}
              </span>
            }
            defaultOpen
            isLast
          >
            <CallLogCard orderId={order.id} callLog={callLog} userId={user?.id ?? null} onUpdated={load} />
          </AccordionSection>
        </div>
      </div>

      {/* Order Items */}
      <OrderItemsCard order={order} items={items} prescriptions={prescriptions} userId={user?.id ?? null} onUpdated={load} />

      {/* Packaging */}
      <PackagingCard orderId={order.id} items={packagingItems} userId={user?.id ?? null} onUpdated={load} />

      {/* Prescription */}
      <PrescriptionCard orderId={order.id} prescriptions={prescriptions} items={items} userId={user?.id ?? null} onUpdated={load} />

      {/* SMS */}
      <SmsCard phone={order.customer?.phone_primary ?? ''} />

      {/* Activity Log */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <AccordionSection
          icon={<Activity className="w-4 h-4" />}
          title="Activity Log"
          badge={activityLog.length > 0 ? (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
              {activityLog.length}
            </span>
          ) : undefined}
          defaultOpen={false}
          isLast
        >
          <ActivityLogCard logs={activityLog} />
        </AccordionSection>
      </div>

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
