import { useState, useRef, useCallback } from 'react';
import { useAppSettings } from '../../store/appSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Store, FlaskConical, Eye, ShoppingBag, Shirt, Package, CheckCircle2, Info,
  Upload, X, Phone, Mail, Globe, MapPin, FileText, Building2, Image as ImageIcon,
  Save, ReceiptText, Hash
} from 'lucide-react';
import { toast } from 'sonner';

const PRESET_TYPES = [
  { value: 'eyewear',   label: 'Eyewear / Optical',  icon: Eye,         lens: true,  description: 'Glasses, sunglasses, contact lenses — needs prescription lens options' },
  { value: 'fashion',   label: 'Fashion / Apparel',   icon: Shirt,       lens: false, description: 'Clothing, accessories — no lens-specific features needed' },
  { value: 'general',   label: 'General eCommerce',   icon: ShoppingBag, lens: false, description: 'Mixed products store — standard order management only' },
  { value: 'cosmetics', label: 'Beauty / Cosmetics',  icon: FlaskConical,lens: false, description: 'Skincare, makeup — no lens features needed' },
  { value: 'custom',    label: 'Other / Custom',       icon: Package,     lens: false, description: 'Manually configure which features are enabled below' },
];

export function StoreProfile() {
  const [settings, updateSettings] = useAppSettings();

  // Local draft state for the identity form
  const [draft, setDraft] = useState({
    storeName:          settings.storeName,
    storeTagline:       settings.storeTagline,
    storeAddressLine1:  settings.storeAddressLine1,
    storeAddressLine2:  settings.storeAddressLine2,
    storeCity:          settings.storeCity,
    storePostalCode:    settings.storePostalCode,
    storeCountry:       settings.storeCountry,
    storePhone:         settings.storePhone,
    storeSecondaryPhone:settings.storeSecondaryPhone,
    storeEmail:         settings.storeEmail,
    storeWebsite:       settings.storeWebsite,
    storeTaxId:         settings.storeTaxId,
    storeFooterNote:    settings.storeFooterNote,
  });
  const [dirty, setDirty] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(settings.storeLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (key: keyof typeof draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setDraft(d => ({ ...d, [key]: e.target.value }));
    setDirty(true);
  };

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast.error('Logo must be smaller than 500 KB');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setLogoPreview(dataUrl);
      updateSettings({ storeLogo: dataUrl });
      toast.success('Logo saved.');
    };
    reader.readAsDataURL(file);
  }, [updateSettings]);

  const removeLogo = () => {
    setLogoPreview('');
    updateSettings({ storeLogo: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Logo removed.');
  };

  function saveIdentity() {
    updateSettings(draft);
    setDirty(false);
    toast.success('Store identity saved. Invoices will reflect the changes.');
  }

  function applyPreset(preset: typeof PRESET_TYPES[0]) {
    updateSettings({ storeType: preset.value, enablePrescriptionLens: preset.lens });
    toast.success(`Store type set to "${preset.label}". Features updated.`);
  }

  const s = settings; // shorthand for live preview

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-semibold">Store Profile</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure store identity, contact details and branding. This information appears on all printed invoices and exported documents.
        </p>
      </div>

      {/* ── Store Identity Form ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Store className="w-4 h-4" />
            Store Identity
          </CardTitle>
          <CardDescription>All fields below appear on printed invoices and exported reports</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* Logo upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> Store Logo</Label>
            <div className="flex items-start gap-4">
              {/* Preview box */}
              <div className="w-28 h-20 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden shrink-0">
                {logoPreview
                  ? <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                  : <div className="text-center text-gray-400"><ImageIcon className="w-6 h-6 mx-auto mb-1" /><span className="text-xs">No logo</span></div>
                }
              </div>
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                <Button variant="outline" size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" />
                  {logoPreview ? 'Change Logo' : 'Upload Logo'}
                </Button>
                {logoPreview && (
                  <Button variant="ghost" size="sm" className="gap-2 text-red-600 hover:text-red-700" onClick={removeLogo}>
                    <X className="w-3.5 h-3.5" />Remove
                  </Button>
                )}
                <p className="text-xs text-gray-500 leading-relaxed">
                  PNG, JPG or SVG. Max 500 KB.<br />Recommended: transparent background, 300×100 px or wider.
                </p>
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Name & tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="store-name" className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Store Name <span className="text-red-500">*</span>
              </Label>
              <Input id="store-name" value={draft.storeName} onChange={set('storeName')} placeholder="e.g. Lunettes" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tagline" className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Tagline / Slogan
              </Label>
              <Input id="tagline" value={draft.storeTagline} onChange={set('storeTagline')} placeholder="e.g. Your Vision, Our Passion" />
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Address */}
          <div>
            <Label className="flex items-center gap-1.5 mb-3"><MapPin className="w-3.5 h-3.5" /> Address</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="addr1" className="text-xs text-gray-500">Address Line 1</Label>
                <Input id="addr1" value={draft.storeAddressLine1} onChange={set('storeAddressLine1')} placeholder="Road / Building / House no." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="addr2" className="text-xs text-gray-500">Address Line 2</Label>
                <Input id="addr2" value={draft.storeAddressLine2} onChange={set('storeAddressLine2')} placeholder="Area / Neighbourhood" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city" className="text-xs text-gray-500">City</Label>
                <Input id="city" value={draft.storeCity} onChange={set('storeCity')} placeholder="Dhaka" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal" className="text-xs text-gray-500">Postal Code</Label>
                <Input id="postal" value={draft.storePostalCode} onChange={set('storePostalCode')} placeholder="1229" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="country" className="text-xs text-gray-500">Country</Label>
                <Input id="country" value={draft.storeCountry} onChange={set('storeCountry')} placeholder="Bangladesh" className="max-w-xs" />
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Contact */}
          <div>
            <Label className="flex items-center gap-1.5 mb-3"><Phone className="w-3.5 h-3.5" /> Contact Information</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone1" className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />Primary Phone</Label>
                <Input id="phone1" value={draft.storePhone} onChange={set('storePhone')} placeholder="09613900800" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone2" className="text-xs text-gray-500 flex items-center gap-1"><Phone className="w-3 h-3" />Secondary Phone</Label>
                <Input id="phone2" value={draft.storeSecondaryPhone} onChange={set('storeSecondaryPhone')} placeholder="+880 1XXX XXXXXX" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs text-gray-500 flex items-center gap-1"><Mail className="w-3 h-3" />Email</Label>
                <Input id="email" type="email" value={draft.storeEmail} onChange={set('storeEmail')} placeholder="support@mystore.com.bd" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website" className="text-xs text-gray-500 flex items-center gap-1"><Globe className="w-3 h-3" />Website</Label>
                <Input id="website" value={draft.storeWebsite} onChange={set('storeWebsite')} placeholder="www.mystore.com.bd" />
              </div>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Tax & invoice note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxid" className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />TIN / BIN / Tax Registration No.
              </Label>
              <Input id="taxid" value={draft.storeTaxId} onChange={set('storeTaxId')} placeholder="Optional" />
              <p className="text-xs text-gray-500">Printed below store address on invoices</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer" className="flex items-center gap-1.5">
                <ReceiptText className="w-3.5 h-3.5" />Invoice Footer Note
              </Label>
              <Input id="footer" value={draft.storeFooterNote} onChange={set('storeFooterNote')} placeholder="Thank you for your purchase!" />
              <p className="text-xs text-gray-500">Appears at the bottom of every printed invoice</p>
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-gray-500">
              {dirty ? '⚠ You have unsaved changes' : '✓ All changes saved'}
            </p>
            <Button onClick={saveIdentity} disabled={!dirty} className="gap-2">
              <Save className="w-4 h-4" />
              Save Identity
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Live Invoice Header Preview ────────────────────────────────────── */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-blue-800">
            <ReceiptText className="w-4 h-4" />
            Invoice Header Preview
          </CardTitle>
          <CardDescription>This is how your store information will appear on printed invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
            {/* Simulated invoice header */}
            <div className="flex justify-between items-start p-6 border-b">
              {/* Left: logo + brand */}
              <div className="flex items-start gap-4">
                {s.storeLogo
                  ? <img src={s.storeLogo} alt="Logo" className="h-14 max-w-[120px] object-contain" />
                  : (
                    <div className="h-14 w-28 bg-gray-900 rounded flex items-center justify-center">
                      <span className="text-white text-sm font-bold tracking-widest uppercase truncate px-2">
                        {s.storeName || 'STORE'}
                      </span>
                    </div>
                  )
                }
                {s.storeTagline && (
                  <p className="text-xs text-gray-500 italic mt-1 self-end">{s.storeTagline}</p>
                )}
              </div>

              {/* Right: store info block */}
              <div className="text-right text-xs text-gray-700 space-y-0.5">
                <p className="font-semibold text-sm text-gray-900">{s.storeName || 'Store Name'}</p>
                {s.storeAddressLine1 && <p>{s.storeAddressLine1}</p>}
                {s.storeAddressLine2 && <p>{s.storeAddressLine2}</p>}
                {(s.storeCity || s.storePostalCode) && <p>{[s.storeCity, s.storePostalCode].filter(Boolean).join(' - ')}</p>}
                {s.storeCountry && <p>{s.storeCountry}</p>}
                {s.storeTaxId && <p className="mt-1 text-gray-500">TIN/BIN: {s.storeTaxId}</p>}
                {s.storePhone && <p className="mt-1">{s.storePhone}</p>}
                {s.storeSecondaryPhone && <p>{s.storeSecondaryPhone}</p>}
                {s.storeEmail && <p>{s.storeEmail}</p>}
                {s.storeWebsite && <p>{s.storeWebsite}</p>}
              </div>
            </div>

            {/* Footer note preview */}
            {s.storeFooterNote && (
              <div className="px-6 py-3 bg-gray-50 border-t">
                <p className="text-xs text-gray-500 text-center italic">{s.storeFooterNote}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Save the form above to update this preview and all printed invoices</p>
        </CardContent>
      </Card>

      {/* ── Business Type ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Business Type</CardTitle>
          <CardDescription>
            Select the type that best describes this store. This will automatically configure which features are shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PRESET_TYPES.map(preset => {
              const Icon = preset.icon;
              const isSelected = settings.storeType === preset.value;
              return (
                <button
                  key={preset.value}
                  onClick={() => applyPreset(preset)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${isSelected ? 'text-blue-800' : 'text-gray-800'}`}>{preset.label}</p>
                        {preset.lens && <Badge className="text-xs bg-purple-100 text-purple-700 mt-0.5">Lens features on</Badge>}
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 leading-relaxed">{preset.description}</p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Feature Toggles ────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Feature Toggles</CardTitle>
          <CardDescription>
            Fine-tune which modules are visible across the app. Turning a feature off hides it from all users — it can be re-enabled anytime.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-start justify-between gap-4 p-4 rounded-xl border-2 transition-all ${
            settings.enablePrescriptionLens ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${settings.enablePrescriptionLens ? 'bg-purple-100' : 'bg-gray-100'}`}>
                <Eye className={`w-5 h-5 ${settings.enablePrescriptionLens ? 'text-purple-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className={`text-sm font-semibold ${settings.enablePrescriptionLens ? 'text-purple-900' : 'text-gray-600'}`}>
                  Additional / Prescription Lens
                </p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Shows the prescription lens section in order detail (lens type, power fields, Rx file upload, lens charge, fitting charge).
                  Also controls lens-related columns in reports and packing slips.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {['Order Detail Card', 'Packing Slip', 'CS Reports', 'Lens Charge Line', 'Prescription Fields'].map(tag => (
                    <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border ${
                      settings.enablePrescriptionLens
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                    }`}>{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            <Switch
              checked={settings.enablePrescriptionLens}
              onCheckedChange={val => {
                updateSettings({ enablePrescriptionLens: val });
                toast.success(val ? 'Prescription lens features enabled.' : 'Prescription lens features hidden from all views.');
              }}
              className="shrink-0 mt-1"
            />
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              More feature toggles (e.g. multi-currency display, lab workflow, courier integrations) can be added here as the system grows.
              Disabling a feature only hides it from the UI — no data is deleted.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
