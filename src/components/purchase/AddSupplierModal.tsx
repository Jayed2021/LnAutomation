import { useState } from 'react';
import { X, Loader2, Link } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';

interface SupplierForm {
  code: string;
  name: string;
  short_name: string;
  email: string;
  phone: string;
  supplier_type: 'chinese' | 'local';
  alibaba_url: string;
  alipay_name: string;
  alipay_email: string;
  alipay_qr_url: string;
  wechat_name: string;
  wechat_number: string;
  wechat_qr_url: string;
  local_payment_accounts: string;
}

interface AddSupplierModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyForm: SupplierForm = {
  code: '',
  name: '',
  short_name: '',
  email: '',
  phone: '',
  supplier_type: 'chinese',
  alibaba_url: '',
  alipay_name: '',
  alipay_email: '',
  alipay_qr_url: '',
  wechat_name: '',
  wechat_number: '',
  wechat_qr_url: '',
  local_payment_accounts: '',
};

function QrUrlInput({
  label,
  value,
  onChange,
  onClear,
  accent,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  accent: 'blue' | 'green';
}) {
  const bgPreview = accent === 'blue' ? 'border-blue-100' : 'border-green-100';

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {value ? (
        <div className="space-y-2">
          <div className={`relative inline-block border-2 ${bgPreview} rounded-lg overflow-hidden bg-white`}>
            <img
              src={value}
              alt={label}
              className="w-28 h-28 object-contain"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <button
              onClick={onClear}
              className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <input
            type="url"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder="Paste image URL (Google Drive, Imgur, etc.)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white text-gray-600 placeholder-gray-400"
          />
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="url"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder="Paste image URL (Google Drive, Imgur, etc.)"
              className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white placeholder-gray-400"
            />
          </div>
          <p className="text-xs text-gray-400 pl-5">Upload to Google Drive / Imgur and paste the link here</p>
        </div>
      )}
    </div>
  );
}

export default function AddSupplierModal({ open, onClose, onSuccess }: AddSupplierModalProps) {
  const [form, setForm] = useState<SupplierForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof SupplierForm, value: string) =>
    setForm(f => ({ ...f, [field]: value }));

  const handleClose = () => {
    setForm(emptyForm);
    onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const isChinese = form.supplier_type === 'chinese';

      const { error } = await supabase.from('suppliers').insert({
        name: form.name.trim() || 'Unnamed Supplier',
        code: form.code.trim() || null,
        short_name: form.short_name.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        supplier_type: form.supplier_type,
        alibaba_url: isChinese ? (form.alibaba_url.trim() || null) : null,
        alipay_name: isChinese ? (form.alipay_name.trim() || null) : null,
        alipay_email: isChinese ? (form.alipay_email.trim() || null) : null,
        alipay_qr_url: isChinese ? (form.alipay_qr_url.trim() || null) : null,
        wechat_name: isChinese ? (form.wechat_name.trim() || null) : null,
        wechat_number: isChinese ? (form.wechat_number.trim() || null) : null,
        wechat_qr_url: isChinese ? (form.wechat_qr_url.trim() || null) : null,
        local_payment_accounts: !isChinese ? (form.local_payment_accounts.trim() || null) : null,
        is_active: true,
      });
      if (error) throw error;
      setForm(emptyForm);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Save supplier error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const isChinese = form.supplier_type === 'chinese';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative z-50 bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add New Supplier</h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Supplier Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => set('supplier_type', 'chinese')}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                  isChinese
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                Chinese Supplier
              </button>
              <button
                type="button"
                onClick={() => set('supplier_type', 'local')}
                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                  !isChinese
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                Local Supplier
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Initial/Code</label>
              <input
                type="text"
                placeholder="e.g., VSC"
                value={form.code}
                onChange={e => set('code', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-gray-50 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Company Name</label>
              <input
                type="text"
                placeholder="Full company name"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-gray-50 placeholder-gray-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Short Name / Initials
              <span className="ml-1.5 text-xs text-gray-400 font-normal">(used to match products from CSV imports)</span>
            </label>
            <input
              type="text"
              placeholder="e.g., MQ, ZH, MO"
              value={form.short_name}
              onChange={e => set('short_name', e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-gray-50 placeholder-gray-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="contact@supplier.com"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-gray-50 placeholder-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
              <input
                type="text"
                placeholder={isChinese ? '+86 ...' : '+880 ...'}
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-gray-50 placeholder-gray-400"
              />
            </div>
          </div>

          {isChinese ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Alibaba Store URL</label>
                <input
                  type="url"
                  placeholder="https://supplier.en.alibaba.com"
                  value={form.alibaba_url}
                  onChange={e => set('alibaba_url', e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-gray-50 placeholder-gray-400"
                />
              </div>

              <div className="pt-1">
                <h3 className="text-base font-semibold text-gray-900 mb-4">Payment Details</h3>

                <div className="space-y-4">
                  <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                    <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3">Alipay</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Alipay Chinese Name</label>
                        <input
                          type="text"
                          placeholder="支付宝名称"
                          value={form.alipay_name}
                          onChange={e => set('alipay_name', e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Alipay Account</label>
                        <input
                          type="email"
                          placeholder="alipay@supplier.com"
                          value={form.alipay_email}
                          onChange={e => set('alipay_email', e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white placeholder-gray-400"
                        />
                      </div>
                    </div>
                    <QrUrlInput
                      label="Alipay QR Code Image URL"
                      value={form.alipay_qr_url}
                      onChange={v => set('alipay_qr_url', v)}
                      onClear={() => set('alipay_qr_url', '')}
                      accent="blue"
                    />
                  </div>

                  <div className="p-4 bg-green-50/50 rounded-lg border border-green-100">
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">WeChat Pay</p>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">WeChat Chinese Name</label>
                        <input
                          type="text"
                          placeholder="微信名称"
                          value={form.wechat_name}
                          onChange={e => set('wechat_name', e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white placeholder-gray-400"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">WeChat Number/ID</label>
                        <input
                          type="text"
                          placeholder="WeChat ID"
                          value={form.wechat_number}
                          onChange={e => set('wechat_number', e.target.value)}
                          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white placeholder-gray-400"
                        />
                      </div>
                    </div>
                    <QrUrlInput
                      label="WeChat QR Code Image URL"
                      value={form.wechat_qr_url}
                      onChange={v => set('wechat_qr_url', v)}
                      onClear={() => set('wechat_qr_url', '')}
                      accent="green"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="pt-1">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Payment Account Details</h3>
              <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-700 font-medium mb-2">
                  Add bank accounts, bKash, Nagad, or any other payment information — one per line or in any format you prefer.
                </p>
                <textarea
                  value={form.local_payment_accounts}
                  onChange={e => set('local_payment_accounts', e.target.value)}
                  placeholder={`Bank: Dutch-Bangla Bank\nA/C: 1234567890\nbKash: 01700-000000\nNagad: 01800-000000`}
                  rows={5}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent bg-white placeholder-gray-400 resize-none font-mono"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gray-900 text-white hover:bg-gray-800 min-w-[120px]"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Saving...</> : 'Add Supplier'}
          </Button>
        </div>
      </div>
    </div>
  );
}
