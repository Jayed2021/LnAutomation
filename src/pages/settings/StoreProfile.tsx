import { useState, useEffect, useRef } from 'react';
import { Building2, MapPin, Phone, Mail, Globe, Hash, ReceiptText, Upload, X, Save, Image as ImageIcon, Store, CheckCircle2, Truck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StoreProfileData {
  id: string;
  store_name: string;
  tagline: string;
  logo_url: string;
  address_line1: string;
  address_line2: string;
  city: string;
  postal_code: string;
  country: string;
  phone_primary: string;
  phone_secondary: string;
  email: string;
  website: string;
  tax_number: string;
  invoice_footer: string;
  business_type: string;
  preferred_courier: string;
}

const EMPTY: Omit<StoreProfileData, 'id'> = {
  store_name: '',
  tagline: '',
  logo_url: '',
  address_line1: '',
  address_line2: '',
  city: '',
  postal_code: '',
  country: 'Bangladesh',
  phone_primary: '',
  phone_secondary: '',
  email: '',
  website: '',
  tax_number: '',
  invoice_footer: '',
  business_type: 'eyewear',
  preferred_courier: 'pathao',
};

const COURIER_OPTIONS = [
  { value: 'pathao', label: 'Pathao' },
  { value: 'steadfast', label: 'Steadfast' },
  { value: 'redx', label: 'RedX' },
  { value: 'sundarban', label: 'Sundarban' },
  { value: 'office', label: 'Office Delivery' },
];

export default function StoreProfile() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY);
  const [saved, setSaved] = useState(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data } = await supabase.from('store_profile').select('*').limit(1).maybeSingle();
    if (data) {
      const { id, ...rest } = data;
      const vals = { ...EMPTY, ...rest };
      setProfileId(id);
      setDraft(vals);
      setSaved(vals);
    }
  };

  const set = (key: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setDraft(d => ({ ...d, [key]: e.target.value }));
    setDirty(true);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      alert('Logo must be smaller than 1 MB');
      return;
    }
    setLogoUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `logos/store-logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('store-assets').upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('store-assets').getPublicUrl(path);
      setDraft(d => ({ ...d, logo_url: publicUrl }));
      setDirty(true);
    } catch (err) {
      console.error('Logo upload failed:', err);
      alert('Failed to upload logo. Please try again.');
    } finally {
      setLogoUploading(false);
    }
  };

  const removeLogo = () => {
    setDraft(d => ({ ...d, logo_url: '' }));
    setDirty(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (profileId) {
        await supabase.from('store_profile').update({ ...draft, updated_at: new Date().toISOString() }).eq('id', profileId);
      } else {
        const { data } = await supabase.from('store_profile').insert({ ...draft }).select('id').maybeSingle();
        if (data) setProfileId(data.id);
      }
      setSaved(draft);
      setDirty(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1';

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Store Profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure store identity, contact details and branding. This information appears on all printed invoices and documents.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Store className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Store Identity</h2>
        </div>

        <div>
          <label className={labelCls}>Store Logo</label>
          <div className="flex items-start gap-4">
            <div className="w-32 h-20 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
              {draft.logo_url
                ? <img src={draft.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                : <div className="text-center text-gray-400"><ImageIcon className="w-6 h-6 mx-auto mb-1" /><span className="text-xs">No logo</span></div>
              }
            </div>
            <div className="space-y-2">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {logoUploading ? 'Uploading...' : draft.logo_url ? 'Change Logo' : 'Upload Logo'}
              </button>
              {draft.logo_url && (
                <button
                  onClick={removeLogo}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Remove
                </button>
              )}
              <p className="text-xs text-gray-400 leading-relaxed">PNG, JPG or SVG. Max 1 MB.<br />Recommended: transparent background, 300×100 px or wider.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>
              <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> Store Name <span className="text-red-500">*</span></span>
            </label>
            <input value={draft.store_name} onChange={set('store_name')} className={inputCls} placeholder="e.g. Lunettes" />
          </div>
          <div>
            <label className={labelCls}>Tagline / Slogan</label>
            <input value={draft.tagline} onChange={set('tagline')} className={inputCls} placeholder="e.g. Your Vision, Our Passion" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <MapPin className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Address</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Address Line 1</label>
            <input value={draft.address_line1} onChange={set('address_line1')} className={inputCls} placeholder="Road / Building / House no." />
          </div>
          <div>
            <label className={labelCls}>Address Line 2</label>
            <input value={draft.address_line2} onChange={set('address_line2')} className={inputCls} placeholder="Area / Neighbourhood" />
          </div>
          <div>
            <label className={labelCls}>City</label>
            <input value={draft.city} onChange={set('city')} className={inputCls} placeholder="Dhaka" />
          </div>
          <div>
            <label className={labelCls}>Postal Code</label>
            <input value={draft.postal_code} onChange={set('postal_code')} className={inputCls} placeholder="1229" />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Country</label>
            <input value={draft.country} onChange={set('country')} className={inputCls + ' max-w-xs'} placeholder="Bangladesh" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Phone className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Contact Information</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}><span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Primary Phone</span></label>
            <input value={draft.phone_primary} onChange={set('phone_primary')} className={inputCls} placeholder="09613900800" />
          </div>
          <div>
            <label className={labelCls}><span className="flex items-center gap-1"><Phone className="w-3 h-3" /> Secondary Phone</span></label>
            <input value={draft.phone_secondary} onChange={set('phone_secondary')} className={inputCls} placeholder="+880 1XXX XXXXXX" />
          </div>
          <div>
            <label className={labelCls}><span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span></label>
            <input type="email" value={draft.email} onChange={set('email')} className={inputCls} placeholder="support@mystore.com.bd" />
          </div>
          <div>
            <label className={labelCls}><span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Website</span></label>
            <input value={draft.website} onChange={set('website')} className={inputCls} placeholder="www.mystore.com.bd" />
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <ReceiptText className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Invoice Details</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}><span className="flex items-center gap-1"><Hash className="w-3 h-3" /> TIN / BIN / Tax Registration No.</span></label>
            <input value={draft.tax_number} onChange={set('tax_number')} className={inputCls} placeholder="Optional" />
            <p className="text-xs text-gray-400 mt-1">Printed below store address on invoices</p>
          </div>
          <div>
            <label className={labelCls}><span className="flex items-center gap-1"><ReceiptText className="w-3 h-3" /> Invoice Footer Note</span></label>
            <input value={draft.invoice_footer} onChange={set('invoice_footer')} className={inputCls} placeholder="Thank you for your purchase!" />
            <p className="text-xs text-gray-400 mt-1">Appears at the bottom of every printed invoice</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
          <ImageIcon className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Invoice Header Preview</h2>
        </div>
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="flex justify-between items-start p-5 border-b border-gray-100">
            <div className="flex flex-col items-start gap-1">
              {saved.logo_url
                ? <img src={saved.logo_url} alt="Logo" className="h-12 max-w-[140px] object-contain" />
                : (
                  <div className="h-12 px-4 bg-gray-900 rounded-lg flex items-center justify-center min-w-[120px]">
                    <span className="text-white text-sm font-bold tracking-wider uppercase truncate">
                      {saved.store_name || 'STORE'}
                    </span>
                  </div>
                )
              }
              {saved.tagline && (
                <p className="text-xs text-gray-400 italic">{saved.tagline}</p>
              )}
            </div>
            <div className="text-right text-xs text-gray-600 space-y-0.5">
              <p className="font-semibold text-sm text-gray-900">{saved.store_name || 'Store Name'}</p>
              {saved.address_line1 && <p>{saved.address_line1}</p>}
              {saved.address_line2 && <p>{saved.address_line2}</p>}
              {(saved.city || saved.postal_code) && <p>{[saved.city, saved.postal_code].filter(Boolean).join(' - ')}</p>}
              {saved.country && <p>{saved.country}</p>}
              {saved.tax_number && <p className="text-gray-400 mt-1">TIN/BIN: {saved.tax_number}</p>}
              {saved.phone_primary && <p className="mt-1">{saved.phone_primary}</p>}
              {saved.email && <p>{saved.email}</p>}
            </div>
          </div>
          {saved.invoice_footer && (
            <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500 text-center italic">{saved.invoice_footer}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">Save the form above to update this preview</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <Truck className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900">Order Defaults</h2>
        </div>
        <div className="max-w-xs">
          <label className={labelCls}>
            <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Preferred Courier Service</span>
          </label>
          <select
            value={draft.preferred_courier}
            onChange={set('preferred_courier')}
            className={inputCls}
          >
            {COURIER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
            Automatically assigned to every new order imported from WooCommerce. Can be changed per-order after import.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm">
          {saveSuccess
            ? <><CheckCircle2 className="w-4 h-4 text-green-500" /><span className="text-green-600">Saved successfully</span></>
            : dirty
              ? <span className="text-amber-600">You have unsaved changes</span>
              : <span className="text-gray-400">All changes saved</span>
          }
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
