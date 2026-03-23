import React, { useState } from 'react';
import { X, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface Props {
  onClose: () => void;
  onImported: (orderId?: string) => void;
}

export function PullOrderModal({ onClose, onImported }: Props) {
  const [wooId, setWooId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handlePull = async () => {
    const id = parseInt(wooId.trim());
    if (!id || isNaN(id)) {
      setError('Please enter a valid WooCommerce order ID.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const { data: existing } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('woo_order_id', id)
        .maybeSingle();

      if (existing) {
        setError(`This order already exists in the system as ${existing.order_number}.`);
        setLoading(false);
        return;
      }

      const { data: config } = await supabase
        .from('woocommerce_config')
        .select('store_url, consumer_key, consumer_secret')
        .eq('is_connected', true)
        .maybeSingle();

      if (!config) {
        setError('WooCommerce is not configured. Please set it up in Settings.');
        setLoading(false);
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const fetchRes = await fetch(`${supabaseUrl}/functions/v1/woo-proxy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          action: 'fetch-single-order',
          store_url: config.store_url,
          consumer_key: config.consumer_key,
          consumer_secret: config.consumer_secret,
          order_id: id,
        }),
      });

      const fetchResult = await fetchRes.json();
      if (!fetchRes.ok || fetchResult.error) {
        setError(fetchResult.error || 'Failed to fetch order from WooCommerce.');
        setLoading(false);
        return;
      }

      const importRes = await fetch(`${supabaseUrl}/functions/v1/woo-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supabaseKey}` },
        body: JSON.stringify({
          action: 'import-order',
          store_url: config.store_url,
          consumer_key: config.consumer_key,
          consumer_secret: config.consumer_secret,
          order: fetchResult.order,
        }),
      });

      const importResult = await importRes.json();
      if (!importRes.ok || importResult.error) {
        setError(importResult.error || 'Failed to import order.');
        setLoading(false);
        return;
      }

      setSuccess(`Order imported successfully as ${importResult.order_number}.`);
      setTimeout(() => {
        onImported(importResult.order_id);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pull Order from WooCommerce</h2>
            <p className="text-sm text-gray-500 mt-0.5">Import a specific order that may have been missed</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">WooCommerce Order ID</label>
            <input
              type="number"
              value={wooId}
              onChange={e => setWooId(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handlePull()}
              placeholder="e.g. 10157"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
              <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{success}</span>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePull}
            disabled={loading || !wooId.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            {loading ? 'Importing...' : 'Import Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
