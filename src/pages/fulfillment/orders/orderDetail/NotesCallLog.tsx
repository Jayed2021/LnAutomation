import React, { useState } from 'react';
import { Phone, FileText } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { OrderNote, CallLog } from './types';
import { logActivity } from './service';

interface NotesProps {
  orderId: string;
  notes: OrderNote[];
  userId: string | null;
  onUpdated: () => void;
}

export function OrderNotesCard({ orderId, notes, userId, onUpdated }: NotesProps) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await supabase.from('order_notes').insert({
        order_id: orderId,
        note_text: text.trim(),
        created_by: userId,
      });
      setText('');
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleString('en-BD', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-4 h-4 text-gray-500" />
        <h3 className="font-semibold text-gray-900">Order Notes</h3>
      </div>

      <div className="space-y-2 mb-4">
        {notes.map(note => (
          <div key={note.id} className="p-3 bg-amber-50 border border-amber-100 rounded-lg">
            <p className="text-sm text-gray-800">{note.note_text}</p>
            <p className="text-xs text-gray-500 mt-1">
              {note.created_by_user?.full_name ?? 'Unknown'} &bull; {formatDateTime(note.created_at)}
            </p>
          </div>
        ))}
        {notes.length === 0 && <p className="text-sm text-gray-400">No notes yet.</p>}
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={3}
        placeholder="Add a new note..."
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
      />
      <button
        onClick={handleLog}
        disabled={saving || !text.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white rounded-lg text-sm font-medium transition-colors"
      >
        <FileText className="w-4 h-4" />
        {saving ? 'Saving...' : 'Log Note'}
      </button>
    </div>
  );
}

interface CallLogProps {
  orderId: string;
  callLog: CallLog[];
  userId: string | null;
  onUpdated: () => void;
}

export function CallLogCard({ orderId, callLog, userId, onUpdated }: CallLogProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    setSaving(true);
    try {
      await supabase.from('order_call_log').insert({
        order_id: orderId,
        notes: note.trim() || null,
        called_by: userId,
      });
      await supabase.from('orders').update({
        cs_status: 'new_called',
        updated_at: new Date().toISOString(),
      }).eq('id', orderId).in('cs_status', ['new_not_called']);
      await logActivity(orderId, `Call logged${note.trim() ? ': ' + note.trim() : ''}`, userId);
      setNote('');
      onUpdated();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (d: string) => {
    const date = new Date(d);
    return date.toLocaleString('en-BD', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Phone className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-gray-900">Call Log</h3>
        </div>
        <span className="text-xs bg-gray-900 text-white px-2.5 py-1 rounded-full font-medium">
          {callLog.length} attempt{callLog.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add call note..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={e => e.key === 'Enter' && handleLog()}
        />
        <button
          onClick={handleLog}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-medium transition-colors shrink-0"
        >
          <Phone className="w-3.5 h-3.5" />
          Log
        </button>
      </div>

      <div className="space-y-2">
        {callLog.map(log => (
          <div key={log.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg">
            <p className="text-sm text-gray-800">{log.notes || 'Call attempt (no note)'}</p>
            <p className="text-xs text-gray-500 mt-1">
              {log.called_by_user?.full_name ?? 'Unknown'} &bull; {formatDateTime(log.created_at)}
            </p>
          </div>
        ))}
        {callLog.length === 0 && <p className="text-sm text-gray-400">No calls logged.</p>}
      </div>
    </div>
  );
}
