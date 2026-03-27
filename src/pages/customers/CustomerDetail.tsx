import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  Loader2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Plus,
  Trash2,
  ShoppingBag,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  fetchCustomerById,
  fetchCustomerOrders,
  fetchCustomerPrescriptions,
  updateCustomer,
  addCustomerPrescription,
  deleteCustomerPrescription,
} from './service';
import type { Customer, CustomerOrder, CustomerPrescription, UpdateCustomerPayload } from './types';
import { STATUS_CONFIG } from '../fulfillment/orders/types';

function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  accent?: 'green' | 'red' | 'amber' | 'default';
}) {
  const accentClass =
    accent === 'green'
      ? 'text-emerald-600'
      : accent === 'red'
      ? 'text-red-600'
      : accent === 'amber'
      ? 'text-amber-600'
      : 'text-gray-900';
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 shrink-0 mt-0.5">
          {icon}
        </div>
        <div>
          <p className={`text-xl font-bold ${accentClass}`}>{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color} ${cfg.border}`}
    >
      {cfg.label}
    </span>
  );
}

const EMPTY_RX = {
  prescription_type: '',
  od_sph: '',
  od_cyl: '',
  od_axis: '',
  od_pd: '',
  os_sph: '',
  os_cyl: '',
  os_axis: '',
  os_pd: '',
  notes: '',
  recorded_date: new Date().toISOString().split('T')[0],
};

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<CustomerPrescription[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<UpdateCustomerPayload>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [showRxModal, setShowRxModal] = useState(false);
  const [rxForm, setRxForm] = useState(EMPTY_RX);
  const [savingRx, setSavingRx] = useState(false);
  const [deletingRxId, setDeletingRxId] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, o, p] = await Promise.all([
        fetchCustomerById(id),
        fetchCustomerOrders(id),
        fetchCustomerPrescriptions(id),
      ]);
      setCustomer(c);
      setOrders(o);
      setPrescriptions(p);
    } catch (err) {
      console.error('Load customer error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const startEdit = () => {
    if (!customer) return;
    setEditForm({
      full_name: customer.full_name,
      phone_primary: customer.phone_primary ?? '',
      phone_secondary: customer.phone_secondary ?? '',
      email: customer.email ?? '',
      address_line1: customer.address_line1 ?? '',
      city: customer.city ?? '',
      district: customer.district ?? '',
      notes: customer.notes ?? '',
    });
    setSaveError('');
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    if (!id) return;
    if (!editForm.full_name?.trim()) {
      setSaveError('Full name is required.');
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await updateCustomer(id, editForm);
      await load();
      setEditing(false);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddRx = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSavingRx(true);
    try {
      await addCustomerPrescription(id, rxForm);
      setShowRxModal(false);
      setRxForm(EMPTY_RX);
      const updated = await fetchCustomerPrescriptions(id);
      setPrescriptions(updated);
    } catch (err) {
      console.error('Add prescription error:', err);
    } finally {
      setSavingRx(false);
    }
  };

  const handleDeleteRx = async (rxId: string) => {
    setDeletingRxId(rxId);
    try {
      await deleteCustomerPrescription(rxId);
      setPrescriptions(prev => prev.filter(p => p.id !== rxId));
    } catch (err) {
      console.error('Delete prescription error:', err);
    } finally {
      setDeletingRxId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16 text-gray-400">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm">Customer not found.</p>
        <button onClick={() => navigate('/customers')} className="mt-3 text-blue-600 text-sm hover:underline">
          Back to Customers
        </button>
      </div>
    );
  }

  const isNew = customer.total_orders <= 1;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Customers
        </button>
        <span className="text-gray-300">/</span>
        <span className="text-sm font-medium text-gray-900">{customer.full_name}</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
            isNew
              ? 'bg-sky-50 text-sky-700 border border-sky-200'
              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          }`}
        >
          {isNew ? 'New' : 'Returning'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          icon={<ShoppingBag className="w-4 h-4" />}
          label="Total Orders"
          value={customer.total_orders.toString()}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Total Spent"
          value={`৳${customer.total_spent.toLocaleString()}`}
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Avg Order Value"
          value={customer.avg_order_value ? `৳${Math.round(customer.avg_order_value).toLocaleString()}` : '—'}
        />
        <StatCard
          icon={<CheckCircle className="w-4 h-4" />}
          label="Delivered"
          value={customer.successful_deliveries.toString()}
          accent="green"
        />
        <StatCard
          icon={<XCircle className="w-4 h-4" />}
          label="Failed / Cancelled"
          value={customer.failed_deliveries.toString()}
          accent="red"
        />
        <StatCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="Success Rate"
          value={customer.delivery_success_rate !== null ? `${customer.delivery_success_rate.toFixed(0)}%` : '—'}
          accent={
            customer.delivery_success_rate === null
              ? 'default'
              : customer.delivery_success_rate >= 80
              ? 'green'
              : customer.delivery_success_rate >= 50
              ? 'amber'
              : 'red'
          }
        />
      </div>

      <Card>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Customer Information</h2>
          {!editing ? (
            <Button variant="secondary" onClick={startEdit} className="flex items-center gap-1.5 text-sm">
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {saveError && <span className="text-xs text-red-600">{saveError}</span>}
              <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-1.5"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save
              </Button>
            </div>
          )}
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field
            label="Full Name"
            value={customer.full_name}
            editValue={editForm.full_name ?? ''}
            editing={editing}
            onChange={v => setEditForm(f => ({ ...f, full_name: v }))}
            icon={null}
          />
          <Field
            label="Primary Phone"
            value={customer.phone_primary}
            editValue={editForm.phone_primary ?? ''}
            editing={editing}
            onChange={v => setEditForm(f => ({ ...f, phone_primary: v }))}
            icon={<Phone className="w-3.5 h-3.5" />}
          />
          <Field
            label="Secondary Phone"
            value={customer.phone_secondary}
            editValue={editForm.phone_secondary ?? ''}
            editing={editing}
            onChange={v => setEditForm(f => ({ ...f, phone_secondary: v }))}
            icon={<Phone className="w-3.5 h-3.5" />}
          />
          <Field
            label="Email"
            value={customer.email}
            editValue={editForm.email ?? ''}
            editing={editing}
            onChange={v => setEditForm(f => ({ ...f, email: v }))}
            icon={<Mail className="w-3.5 h-3.5" />}
          />
          <Field
            label="Address"
            value={customer.address_line1}
            editValue={editForm.address_line1 ?? ''}
            editing={editing}
            onChange={v => setEditForm(f => ({ ...f, address_line1: v }))}
            icon={<MapPin className="w-3.5 h-3.5" />}
            className="sm:col-span-2"
          />
          <Field
            label="District"
            value={customer.district}
            editValue={editForm.district ?? ''}
            editing={editing}
            onChange={v => setEditForm(f => ({ ...f, district: v }))}
          />
          <Field
            label="City / Thana"
            value={customer.city}
            editValue={editForm.city ?? ''}
            editing={editing}
            onChange={v => setEditForm(f => ({ ...f, city: v }))}
          />
          <div className="sm:col-span-2">
            <p className="text-xs font-medium text-gray-500 mb-1">Internal Notes</p>
            {editing ? (
              <textarea
                value={editForm.notes ?? ''}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            ) : (
              <p className="text-sm text-gray-700">{customer.notes || <span className="text-gray-300">—</span>}</p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Order History</h2>
            <p className="text-xs text-gray-400 mt-0.5">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Order ID</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-600">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <Link
                        to={`/fulfillment/orders/${o.id}`}
                        className="font-mono text-blue-600 hover:text-blue-800 hover:underline text-xs"
                        onClick={e => e.stopPropagation()}
                      >
                        {o.order_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(o.order_date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-3">
                      <OrderStatusBadge status={o.cs_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Prescription History</h2>
            <p className="text-xs text-gray-400 mt-0.5">{prescriptions.length} record{prescriptions.length !== 1 ? 's' : ''}</p>
          </div>
          <Button
            onClick={() => { setRxForm(EMPTY_RX); setShowRxModal(true); }}
            className="flex items-center gap-1.5 text-sm bg-gray-900 text-white hover:bg-gray-800"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Rx
          </Button>
        </div>

        {prescriptions.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No prescriptions on record</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {prescriptions.map(rx => (
              <div key={rx.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      {rx.prescription_type && (
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {rx.prescription_type}
                        </span>
                      )}
                      {rx.recorded_date && (
                        <span className="text-xs text-gray-400">
                          {new Date(rx.recorded_date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                      <RxEyeRow label="OD (Right)" sph={rx.od_sph} cyl={rx.od_cyl} axis={rx.od_axis} pd={rx.od_pd} />
                      <RxEyeRow label="OS (Left)" sph={rx.os_sph} cyl={rx.os_cyl} axis={rx.os_axis} pd={rx.os_pd} />
                    </div>
                    {rx.notes && <p className="mt-2 text-xs text-gray-500 italic">{rx.notes}</p>}
                  </div>
                  <button
                    onClick={() => handleDeleteRx(rx.id)}
                    disabled={deletingRxId === rx.id}
                    className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors shrink-0"
                  >
                    {deletingRxId === rx.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showRxModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add Prescription</h2>
              <button
                onClick={() => setShowRxModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddRx} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    value={rxForm.prescription_type}
                    onChange={e => setRxForm(f => ({ ...f, prescription_type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type</option>
                    <option value="Single Vision">Single Vision</option>
                    <option value="Progressive">Progressive</option>
                    <option value="Bifocal">Bifocal</option>
                    <option value="Reading">Reading</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                  <input
                    type="date"
                    value={rxForm.recorded_date}
                    onChange={e => setRxForm(f => ({ ...f, recorded_date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">OD (Right Eye)</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['od_sph', 'od_cyl', 'od_axis', 'od_pd'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1 capitalize">{field.replace('od_', '').toUpperCase()}</label>
                      <input
                        type="text"
                        value={rxForm[field]}
                        onChange={e => setRxForm(f => ({ ...f, [field]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">OS (Left Eye)</p>
                <div className="grid grid-cols-4 gap-2">
                  {(['os_sph', 'os_cyl', 'os_axis', 'os_pd'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1 capitalize">{field.replace('os_', '').toUpperCase()}</label>
                      <input
                        type="text"
                        value={rxForm[field]}
                        onChange={e => setRxForm(f => ({ ...f, [field]: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="—"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <textarea
                  value={rxForm.notes}
                  onChange={e => setRxForm(f => ({ ...f, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-1">
                <Button type="button" variant="secondary" onClick={() => setShowRxModal(false)} disabled={savingRx}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingRx}
                  className="bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-1.5"
                >
                  {savingRx && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Prescription
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  editValue,
  editing,
  onChange,
  icon,
  className = '',
}: {
  label: string;
  value: string | null | undefined;
  editValue: string;
  editing: boolean;
  onChange: (v: string) => void;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-gray-500 mb-1">{label}</p>
      {editing ? (
        <input
          type="text"
          value={editValue}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      ) : (
        <div className="flex items-center gap-1.5 text-sm text-gray-800">
          {icon && <span className="text-gray-400">{icon}</span>}
          <span>{value || <span className="text-gray-300">—</span>}</span>
        </div>
      )}
    </div>
  );
}

function RxEyeRow({
  label,
  sph,
  cyl,
  axis,
  pd,
}: {
  label: string;
  sph: string | null;
  cyl: string | null;
  axis: string | null;
  pd: string | null;
}) {
  const hasValues = sph || cyl || axis || pd;
  return (
    <div>
      <p className="font-medium text-gray-600 mb-0.5">{label}</p>
      {hasValues ? (
        <p className="text-gray-500">
          SPH {sph || '—'} &nbsp;CYL {cyl || '—'} &nbsp;AXIS {axis || '—'} &nbsp;PD {pd || '—'}
        </p>
      ) : (
        <p className="text-gray-300">No data</p>
      )}
    </div>
  );
}
