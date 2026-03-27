import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRefresh } from '../../contexts/RefreshContext';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  Plus,
  Search,
  Users,
  TrendingUp,
  ShoppingBag,
  Star,
  Loader2,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronLeft,
  X,
} from 'lucide-react';
import { fetchCustomers, createCustomer, CUSTOMERS_PAGE_SIZE } from './service';
import type { Customer, CreateCustomerPayload } from './types';

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        </div>
      </div>
    </Card>
  );
}

function CustomerTypeBadge({ hasDeliveredOrder }: { hasDeliveredOrder: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        hasDeliveredOrder
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : 'bg-sky-50 text-sky-700 border border-sky-200'
      }`}
    >
      {hasDeliveredOrder ? 'Returning' : 'New'}
    </span>
  );
}

const EMPTY_FORM: CreateCustomerPayload = {
  full_name: '',
  phone_primary: '',
  phone_secondary: '',
  email: '',
  address_line1: '',
  city: '',
  district: '',
  notes: '',
};

export default function Customers() {
  const navigate = useNavigate();
  const { lastRefreshed, setRefreshing } = useRefresh();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'new' | 'returning'>('all');
  const [page, setPage] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<CreateCustomerPayload>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async (currentPage = page) => {
    setLoading(true);
    try {
      const result = await fetchCustomers(search, typeFilter, currentPage);
      setCustomers(result.data);
      setTotalCount(result.count);
    } catch (err) {
      console.error('Load customers error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(page); }, [lastRefreshed]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      load(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, typeFilter]);

  useEffect(() => {
    load(page);
  }, [page]);

  const totalPages = Math.ceil(totalCount / CUSTOMERS_PAGE_SIZE);
  const startIndex = page * CUSTOMERS_PAGE_SIZE + 1;
  const endIndex = Math.min((page + 1) * CUSTOMERS_PAGE_SIZE, totalCount);

  const handleOpenModal = () => {
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setFormError('Full name is required.');
      return;
    }
    if (!form.phone_primary.trim()) {
      setFormError('Primary phone is required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const created = await createCustomer(form);
      setShowModal(false);
      navigate(`/customers/${created.id}`);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="text-sm text-gray-500 mt-1">Manage customer profiles and order history</p>
        </div>
        <Button
          className="flex items-center gap-2 bg-gray-900 text-white hover:bg-gray-800"
          onClick={handleOpenModal}
        >
          <Plus className="w-4 h-4" />
          New Customer
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Customers" value={totalCount.toString()} />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Returning Customers" value={loading ? '—' : customers.filter(c => c.has_delivered_order).length.toString()} />
        <StatCard icon={<ShoppingBag className="w-5 h-5" />} label="Showing" value={loading ? '—' : `${startIndex}–${endIndex}`} />
        <StatCard icon={<Star className="w-5 h-5" />} label="Page" value={loading ? '—' : `${page + 1} of ${totalPages || 1}`} />
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name, phone, or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as typeof typeFilter)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="new">New Only</option>
            <option value="returning">Returning Only</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Location</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Orders</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total Spent</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Success Rate</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{c.full_name}</p>
                      {c.last_order_date && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Last order {new Date(c.last_order_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {c.phone_primary && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Phone className="w-3.5 h-3.5 shrink-0" />
                          <span>{c.phone_primary}</span>
                        </div>
                      )}
                      {c.email && (
                        <div className="flex items-center gap-1 text-gray-400 text-xs mt-0.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[150px]">{c.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(c.district || c.city) ? (
                        <div className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span>{[c.district, c.city].filter(Boolean).join(', ')}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CustomerTypeBadge hasDeliveredOrder={c.has_delivered_order} />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">{c.total_orders}</td>
                    <td className="px-4 py-3 text-right text-gray-700">৳{c.total_spent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      {c.delivery_success_rate !== null ? (
                        <span
                          className={`font-medium ${
                            c.delivery_success_rate >= 80
                              ? 'text-emerald-600'
                              : c.delivery_success_rate >= 50
                              ? 'text-amber-600'
                              : 'text-red-600'
                          }`}
                        >
                          {c.delivery_success_rate.toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-300 inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-400">
            {totalCount > 0
              ? `Showing ${startIndex}–${endIndex} of ${totalCount} customer${totalCount !== 1 ? 's' : ''}`
              : 'No customers'}
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i)
                .filter(i => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
                .reduce<(number | 'ellipsis')[]>((acc, i, idx, arr) => {
                  if (idx > 0 && (i as number) - (arr[idx - 1] as number) > 1) acc.push('ellipsis');
                  acc.push(i);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-sm">…</span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item as number)}
                      disabled={loading}
                      className={`min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                        page === item
                          ? 'bg-gray-900 text-white'
                          : 'hover:bg-gray-100 text-gray-600'
                      }`}
                    >
                      {(item as number) + 1}
                    </button>
                  )
                )}

              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">New Customer</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Customer full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={form.phone_primary}
                    onChange={e => setForm(f => ({ ...f, phone_primary: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="01XXXXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Phone</label>
                  <input
                    type="tel"
                    value={form.phone_secondary}
                    onChange={e => setForm(f => ({ ...f, phone_secondary: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optional"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={form.address_line1}
                    onChange={e => setForm(f => ({ ...f, address_line1: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Street / Area"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                  <input
                    type="text"
                    value={form.district}
                    onChange={e => setForm(f => ({ ...f, district: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Dhaka"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City / Thana</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Mirpur"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="CS notes, preferences, etc."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowModal(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gray-900 text-white hover:bg-gray-800 flex items-center gap-2"
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Customer
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
