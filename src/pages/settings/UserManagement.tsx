import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, CreditCard as Edit2, RefreshCw, Check, X, Eye, EyeOff, ChevronDown, Shield, UserCheck, UserX, KeyRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { User, UserRole } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import bcrypt from 'bcryptjs';

const ROLES: { value: UserRole; label: string; description: string }[] = [
  { value: 'admin', label: 'Admin', description: 'Full access to all modules including Settings' },
  { value: 'operations_manager', label: 'General Manager', description: 'Full access except Settings' },
  { value: 'warehouse_manager', label: 'Warehouse Manager', description: 'Inventory and Fulfillment Operations' },
  { value: 'customer_service', label: 'Customer Service', description: 'Orders and order detail view only' },
  { value: 'accounts', label: 'Accounts', description: 'Finance module and read-only order access' },
];

const ROLE_LABEL: Record<UserRole, string> = {
  admin: 'Admin',
  operations_manager: 'General Manager',
  warehouse_manager: 'Warehouse Manager',
  customer_service: 'Customer Service',
  accounts: 'Accounts',
};

const MODULE_OVERRIDES = [
  { key: 'purchase', label: 'Purchase' },
  { key: 'inventory', label: 'Inventory' },
  { key: 'fulfillment', label: 'Fulfillment - Orders' },
  { key: 'fulfillment_operations', label: 'Fulfillment - Operations' },
  { key: 'fulfillment_returns', label: 'Fulfillment - Returns' },
  { key: 'finance', label: 'Finance' },
  { key: 'finance_expenses', label: 'Finance - Expenses' },
  { key: 'finance_collection', label: 'Finance - Collection' },
  { key: 'customers', label: 'Customers' },
  { key: 'reports', label: 'Reports' },
  { key: 'cs_actions', label: 'CS Actions (order status changes)' },
  { key: 'warehouse_actions', label: 'Warehouse Actions (mark processed, ship)' },
  { key: 'edit_order_source', label: 'Edit Order Source & CS Assignment' },
];

const ROLE_BADGE_COLORS: Record<UserRole, string> = {
  admin: 'bg-gray-900 text-white',
  operations_manager: 'bg-blue-100 text-blue-800',
  warehouse_manager: 'bg-green-100 text-green-800',
  customer_service: 'bg-orange-100 text-orange-800',
  accounts: 'bg-teal-100 text-teal-800',
};

interface UserFormData {
  full_name: string;
  username: string;
  email: string;
  role: UserRole;
  password: string;
  can_see_costs: boolean;
  is_active: boolean;
  module_permissions: Record<string, boolean | null>;
}

const emptyForm: UserFormData = {
  full_name: '',
  username: '',
  email: '',
  role: 'customer_service',
  password: '',
  can_see_costs: false,
  is_active: true,
  module_permissions: {},
};

export default function UserManagement() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showResetModal, setShowResetModal] = useState<User | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [resetShowPw, setResetShowPw] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);
  const [resetError, setResetError] = useState('');
  const [expandedOverrides, setExpandedOverrides] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('full_name');
    setUsers(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingUser(null);
    setForm(emptyForm);
    setError('');
    setShowPassword(false);
    setExpandedOverrides(false);
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    setForm({
      full_name: u.full_name,
      username: u.username ?? '',
      email: u.email ?? '',
      role: u.role,
      password: '',
      can_see_costs: u.can_see_costs,
      is_active: u.is_active,
      module_permissions: { ...(u.module_permissions ?? {}) },
    });
    setError('');
    setShowPassword(false);
    setExpandedOverrides(Object.keys(u.module_permissions ?? {}).length > 0);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!form.full_name.trim()) { setError('Full name is required.'); return; }
    if (!form.username.trim()) { setError('Username is required.'); return; }
    if (!editingUser && !form.password) { setError('Password is required for new users.'); return; }
    if (form.password && form.password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setSaving(true);
    try {
      const usernameClean = form.username.trim().toLowerCase();

      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('username', usernameClean)
        .maybeSingle();

      if (existing && (!editingUser || existing.id !== editingUser.id)) {
        setError('Username already taken. Please choose a different one.');
        return;
      }

      const cleanPerms: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(form.module_permissions)) {
        if (v !== null && v !== undefined) {
          cleanPerms[k] = v as boolean;
        }
      }

      if (editingUser) {
        const updates: Record<string, unknown> = {
          full_name: form.full_name.trim(),
          username: usernameClean,
          email: form.email.trim() || null,
          role: form.role,
          can_see_costs: form.can_see_costs,
          is_active: form.is_active,
          module_permissions: cleanPerms,
          updated_at: new Date().toISOString(),
        };
        if (form.password) {
          updates.password_hash = await bcrypt.hash(form.password, 10);
          updates.password_changed = false;
        }
        const { error: err } = await supabase.from('users').update(updates).eq('id', editingUser.id);
        if (err) throw err;
      } else {
        const hash = await bcrypt.hash(form.password, 10);
        const { error: err } = await supabase.from('users').insert({
          full_name: form.full_name.trim(),
          username: usernameClean,
          email: form.email.trim() || `${usernameClean}@system.local`,
          role: form.role,
          password_hash: hash,
          password_changed: false,
          can_see_costs: form.can_see_costs,
          is_active: form.is_active,
          module_permissions: cleanPerms,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (err) throw err;
      }

      setShowModal(false);
      load();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: User) => {
    if (u.id === currentUser?.id) return;
    await supabase.from('users').update({ is_active: !u.is_active, updated_at: new Date().toISOString() }).eq('id', u.id);
    load();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showResetModal) return;
    if (resetPassword.length < 6) { setResetError('Password must be at least 6 characters.'); return; }
    setResetSaving(true);
    setResetError('');
    try {
      const hash = await bcrypt.hash(resetPassword, 10);
      await supabase.from('users').update({ password_hash: hash, password_changed: false, updated_at: new Date().toISOString() }).eq('id', showResetModal.id);
      setShowResetModal(null);
      setResetPassword('');
      load();
    } catch (err: any) {
      setResetError(err.message || 'An error occurred.');
    } finally {
      setResetSaving(false);
    }
  };

  const setModuleOverride = (key: string, value: boolean | null) => {
    setForm(f => {
      const next = { ...f.module_permissions };
      if (value === null) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return { ...f, module_permissions: next };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/settings')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Settings
          </button>
          <span className="text-gray-300">/</span>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>
          <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <span className="text-sm text-gray-500">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Username</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Access</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Login</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">No users found.</td></tr>
              ) : filtered.map(u => (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600 shrink-0">
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{u.full_name}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-mono text-gray-600">@{u.username}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE_COLORS[u.role]}`}>
                      {ROLE_LABEL[u.role]}
                    </span>
                    {Object.keys(u.module_permissions ?? {}).length > 0 && (
                      <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200" title="Has custom module overrides">
                        Hybrid
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      {u.can_see_costs && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                          <Shield className="w-3 h-3" /> Costs
                        </span>
                      )}
                      {!u.password_changed && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                          Default PW
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      onClick={() => handleToggleActive(u)}
                      disabled={u.id === currentUser?.id}
                      title={u.id === currentUser?.id ? "Can't deactivate yourself" : undefined}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                        u.is_active
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      } disabled:cursor-not-allowed`}
                    >
                      {u.is_active ? <><UserCheck className="w-3.5 h-3.5" />Active</> : <><UserX className="w-3.5 h-3.5" />Inactive</>}
                    </button>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-400">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Never'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => { setShowResetModal(u); setResetPassword(''); setResetError(''); setResetShowPw(false); }}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Reset password"
                      >
                        <KeyRound className="w-4 h-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Edit2 className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="text-base font-semibold text-gray-900">
                {editingUser ? 'Edit User' : 'Add New User'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                  <input
                    type="text"
                    value={form.username}
                    onChange={e => setForm(f => ({ ...f, username: e.target.value.toLowerCase().replace(/\s/g, '') }))}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="johndoe"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="optional"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {editingUser ? 'New Password (leave blank to keep)' : 'Password *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      required={!editingUser}
                      minLength={editingUser ? undefined : 6}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      placeholder={editingUser ? 'Leave blank to keep current' : 'Min 6 characters'}
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select
                    value={form.role}
                    onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  >
                    {ROLES.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">{ROLES.find(r => r.value === form.role)?.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.can_see_costs}
                    onChange={e => setForm(f => ({ ...f, can_see_costs: e.target.checked }))}
                    className="rounded border-gray-300 text-gray-900"
                  />
                  <span className="text-sm text-gray-700">Can see costs & purchase prices</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="rounded border-gray-300 text-gray-900"
                    disabled={editingUser?.id === currentUser?.id}
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedOverrides(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-medium text-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-500" />
                    Module Overrides
                    <span className="text-xs text-gray-400 font-normal">
                      (for hybrid roles — overrides default role access)
                    </span>
                    {Object.keys(form.module_permissions).length > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold">
                        {Object.keys(form.module_permissions).length} override{Object.keys(form.module_permissions).length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expandedOverrides ? 'rotate-180' : ''}`} />
                </button>
                {expandedOverrides && (
                  <div className="p-4 space-y-2">
                    <p className="text-xs text-gray-500 mb-3">
                      Set <span className="font-semibold text-green-700">Grant</span> to give access beyond the role default, or{' '}
                      <span className="font-semibold text-red-700">Revoke</span> to remove default access.{' '}
                      Leave as <span className="font-semibold">Default</span> to use role's standard access.
                    </p>
                    {MODULE_OVERRIDES.map(mod => {
                      const val = form.module_permissions[mod.key];
                      return (
                        <div key={mod.key} className="flex items-center justify-between gap-3">
                          <span className="text-sm text-gray-700">{mod.label}</span>
                          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                            <button
                              type="button"
                              onClick={() => setModuleOverride(mod.key, null)}
                              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${val === undefined || val === null ? 'bg-white shadow-sm text-gray-700' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                              Default
                            </button>
                            <button
                              type="button"
                              onClick={() => setModuleOverride(mod.key, true)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${val === true ? 'bg-green-600 text-white shadow-sm' : 'text-gray-400 hover:text-green-600'}`}
                            >
                              <Check className="w-3 h-3" /> Grant
                            </button>
                            <button
                              type="button"
                              onClick={() => setModuleOverride(mod.key, false)}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${val === false ? 'bg-red-600 text-white shadow-sm' : 'text-gray-400 hover:text-red-600'}`}
                            >
                              <X className="w-3 h-3" /> Revoke
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && (
                <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition-colors">
                  {saving ? 'Saving...' : editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-base font-semibold text-gray-900">Reset Password</h2>
                <p className="text-sm text-gray-500">For {showResetModal.full_name}</p>
              </div>
              <button onClick={() => setShowResetModal(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                <div className="relative">
                  <input
                    type={resetShowPw ? 'text' : 'password'}
                    value={resetPassword}
                    onChange={e => setResetPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    placeholder="Min 6 characters"
                  />
                  <button type="button" onClick={() => setResetShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" tabIndex={-1}>
                    {resetShowPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  The user will be prompted to change their password on next login.
                </p>
              </div>
              {resetError && (
                <div className="px-3 py-2 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">{resetError}</div>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowResetModal(null)} className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={resetSaving} className="flex-1 px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition-colors">
                  {resetSaving ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
