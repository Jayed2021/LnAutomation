import React, { useState } from 'react';
import { ChevronDown, Save, X, CreditCard as Edit2 } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderDetail } from './types';

const SOURCES = ['Website', 'Facebook', 'Instagram', 'WhatsApp', 'Phone'];

interface Props {
  order: OrderDetail;
  users: { id: string; full_name: string }[];
  userId: string | null;
  canEdit: boolean;
  onUpdated: () => void;
}

export function OrderSourceCard({ order, users, userId, canEdit, onUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState({
    cs_status: order.cs_status,
    order_source: order.order_source ?? 'Website',
    assigned_to: order.assigned_user?.id ?? '',
    confirmed_by: order.confirmed_user?.id ?? '',
    conversation_url: order.conversation_url ?? '',
  });

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from('orders').update({
        order_source: edit.order_source.toLowerCase(),
        assigned_to: edit.assigned_to || null,
        confirmed_by: edit.confirmed_by || null,
        conversation_url: edit.conversation_url || null,
        updated_at: new Date().toISOString(),
      }).eq('id', order.id);
      setEditing(false);
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-gray-900">Order Status &amp; Source</h3>
        {!editing ? (
          canEdit && (
            <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium">
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          )
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="p-1.5 hover:bg-gray-100 rounded transition-colors">
              <X className="w-4 h-4 text-gray-500" />
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Order Source</div>
          {editing
            ? (
              <select value={edit.order_source} onChange={e => setEdit(p => ({ ...p, order_source: e.target.value }))} className={inputCls}>
                {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )
            : <div className="text-sm text-gray-900 capitalize">{order.order_source ?? '—'}</div>}
        </div>

        {editing && ['facebook', 'instagram', 'whatsapp'].includes(edit.order_source.toLowerCase()) && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Conversation URL</div>
            <input
              value={edit.conversation_url}
              onChange={e => setEdit(p => ({ ...p, conversation_url: e.target.value }))}
              className={inputCls}
              placeholder="https://..."
            />
          </div>
        )}

        {!editing && order.conversation_url && (
          <div>
            <div className="text-xs font-medium text-gray-500 mb-1">Conversation URL</div>
            <a href={order.conversation_url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline truncate block">
              {order.conversation_url}
            </a>
          </div>
        )}

        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">Assigned CS Person</div>
          {editing
            ? (
              <select value={edit.assigned_to} onChange={e => setEdit(p => ({ ...p, assigned_to: e.target.value }))} className={inputCls}>
                <option value="">Unassigned</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            )
            : <div className="text-sm text-gray-900">{order.assigned_user?.full_name ?? 'Unassigned'}</div>}
        </div>

        <div>
          <div className="text-xs font-medium text-gray-500 mb-1">
            Confirmed By <span className="text-gray-400 font-normal">(if covering for assigned person)</span>
          </div>
          {editing
            ? (
              <select value={edit.confirmed_by} onChange={e => setEdit(p => ({ ...p, confirmed_by: e.target.value }))} className={inputCls}>
                <option value="">— Same as assigned —</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            )
            : <div className="text-sm text-gray-500">{order.confirmed_user?.full_name ?? '— Same as assigned —'}</div>}
        </div>
      </div>
    </div>
  );
}
