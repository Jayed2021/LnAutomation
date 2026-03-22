import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard as Edit2, Save, X, Building2, ExternalLink, Download, FileText, Loader2, Trash2, Calendar, Plus, Link, MessageSquare, Send, Upload, AlertCircle, ChevronDown, ChevronUp, Pencil, Tag } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';

interface Supplier {
  id: string;
  code: string | null;
  name: string;
  short_name: string | null;
  email: string | null;
  phone: string | null;
  supplier_type: 'chinese' | 'local';
  alibaba_url: string | null;
  alipay_name: string | null;
  alipay_email: string | null;
  alipay_qr_url: string | null;
  wechat_name: string | null;
  wechat_number: string | null;
  wechat_qr_url: string | null;
  local_payment_accounts: string | null;
  is_active: boolean;
  created_at: string;
}

interface SupplierCatalog {
  id: string;
  supplier_id: string;
  file_name: string;
  file_url: string;
  notes: string | null;
  price_range: string | null;
  uploaded_at: string;
}

interface SupplierNote {
  id: string;
  supplier_id: string;
  note: string;
  created_by: string | null;
  created_at: string;
  users?: { full_name: string | null } | null;
}

type SupplierEditForm = Omit<Supplier, 'id' | 'is_active' | 'created_at'>;

function FieldRow({
  label,
  value,
  editing,
  field,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string;
  value: string | null;
  editing: boolean;
  field: string;
  onChange: (field: string, v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      {editing ? (
        <input
          type={type}
          value={value || ''}
          onChange={e => onChange(field, e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-gray-50"
        />
      ) : (
        <p className="text-sm text-gray-800">
          {value || <span className="text-gray-400 italic">Not set</span>}
        </p>
      )}
    </div>
  );
}

function QrBlock({
  label,
  url,
  editing,
  onChange,
  onClear,
  accent,
}: {
  label: string;
  url: string | null;
  editing: boolean;
  onChange: (v: string) => void;
  onClear: () => void;
  accent: 'blue' | 'green';
}) {
  const [imgError, setImgError] = useState(false);
  const borderColor = accent === 'blue' ? 'border-blue-100' : 'border-green-100';

  useEffect(() => { setImgError(false); }, [url]);

  if (!editing) {
    return (
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
        {url ? (
          imgError ? (
            <div className="w-44 h-44 border border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center gap-2 p-3">
              <AlertCircle className="w-6 h-6 text-gray-300" />
              <p className="text-xs text-gray-400 text-center leading-snug">Image could not be loaded</p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
              >
                <ExternalLink className="w-3 h-3" /> Open URL
              </a>
            </div>
          ) : (
            <img
              src={url}
              alt={label}
              className="w-44 h-44 object-contain border border-gray-200 rounded-xl bg-white shadow-sm"
              onError={() => setImgError(true)}
            />
          )
        ) : (
          <p className="text-sm text-gray-400 italic">No QR code set</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      {url ? (
        <div className="space-y-2">
          <div className={`relative inline-block border-2 ${borderColor} rounded-xl overflow-hidden bg-white`}>
            {imgError ? (
              <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 p-3 bg-gray-50">
                <AlertCircle className="w-6 h-6 text-gray-300" />
                <p className="text-xs text-gray-400 text-center leading-snug">Image could not be loaded</p>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium"
                >
                  <ExternalLink className="w-3 h-3" /> Open URL
                </a>
              </div>
            ) : (
              <img
                src={url}
                alt={label}
                className="w-44 h-44 object-contain"
                onError={() => setImgError(true)}
              />
            )}
            <button
              onClick={onClear}
              className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Link className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="url"
              value={url}
              onChange={e => { setImgError(false); onChange(e.target.value); }}
              placeholder="Image URL"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-400 bg-gray-50 text-gray-600"
            />
          </div>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Link className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <input
              type="url"
              value=""
              onChange={e => onChange(e.target.value)}
              placeholder="Paste image URL (Google Drive, Imgur, etc.)"
              className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-gray-50 placeholder-gray-400"
            />
          </div>
          <p className="text-xs text-gray-400 pl-5">Upload to Google Drive / Imgur and paste the link here</p>
        </div>
      )}
    </div>
  );
}

function CatalogCard({
  catalog,
  onDelete,
  onUpdate,
}: {
  catalog: SupplierCatalog;
  onDelete: (id: string) => void;
  onUpdate: (id: string, price_range: string | null, notes: string | null) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editPrice, setEditPrice] = useState(catalog.price_range || '');
  const [editNotes, setEditNotes] = useState(catalog.notes || '');
  const [saving, setSaving] = useState(false);

  const hasLongNotes = catalog.notes && catalog.notes.length > 120;
  const displayNotes = expanded || !hasLongNotes ? catalog.notes : catalog.notes!.substring(0, 120) + '...';

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(catalog.id, editPrice.trim() || null, editNotes.trim() || null);
    setSaving(false);
    setEditing(false);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="px-5 py-4 hover:bg-gray-50/60 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText className="w-4 h-4 text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-800">{catalog.file_name}</p>
              {catalog.price_range && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-medium">
                  <Tag className="w-3 h-3" />
                  {catalog.price_range}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <Calendar className="w-3 h-3" />
              {formatDate(catalog.uploaded_at)}
            </div>

            {!editing && catalog.notes && (
              <div className="mt-2">
                <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{displayNotes}</p>
                {hasLongNotes && (
                  <button
                    onClick={() => setExpanded(v => !v)}
                    className="inline-flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-600 mt-1 transition-colors"
                  >
                    {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show more</>}
                  </button>
                )}
              </div>
            )}

            {editing && (
              <div className="mt-3 space-y-2 bg-white border border-gray-200 rounded-lg p-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Price Range</label>
                  <input
                    type="text"
                    value={editPrice}
                    onChange={e => setEditPrice(e.target.value)}
                    placeholder="e.g. ¥10–¥50, Budget range, Mid-range"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Remarks</label>
                  <textarea
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Add observations, ordering notes, quality feedback..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-300 bg-gray-50 resize-none"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    Save
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditPrice(catalog.price_range || ''); setEditNotes(catalog.notes || ''); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
          <a
            href={catalog.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Open
          </a>
          <button
            onClick={() => { setEditing(v => !v); setEditPrice(catalog.price_range || ''); setEditNotes(catalog.notes || ''); }}
            className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit remarks & price"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(catalog.id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete catalog"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupplierDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [catalogs, setCatalogs] = useState<SupplierCatalog[]>([]);
  const [notes, setNotes] = useState<SupplierNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<SupplierEditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [catalogName, setCatalogName] = useState('');
  const [catalogUrl, setCatalogUrl] = useState('');
  const [catalogPriceRange, setCatalogPriceRange] = useState('');
  const [catalogNotes, setCatalogNotes] = useState('');
  const [catalogInputMode, setCatalogInputMode] = useState<'url' | 'upload'>('url');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [savingCatalog, setSavingCatalog] = useState(false);

  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [supplierRes, catalogsRes, notesRes] = await Promise.all([
        supabase.from('suppliers').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('supplier_catalogs')
          .select('*')
          .eq('supplier_id', id)
          .order('uploaded_at', { ascending: false }),
        supabase
          .from('supplier_notes')
          .select('*, users(full_name)')
          .eq('supplier_id', id)
          .order('created_at', { ascending: false }),
      ]);
      if (supplierRes.error) throw supplierRes.error;
      setSupplier(supplierRes.data);
      setCatalogs(catalogsRes.data || []);
      setNotes(notesRes.data || []);
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const startEdit = () => {
    if (!supplier) return;
    setEditForm({
      code: supplier.code,
      name: supplier.name,
      short_name: supplier.short_name,
      email: supplier.email,
      phone: supplier.phone,
      supplier_type: supplier.supplier_type || 'chinese',
      alibaba_url: supplier.alibaba_url,
      alipay_name: supplier.alipay_name,
      alipay_email: supplier.alipay_email,
      alipay_qr_url: supplier.alipay_qr_url,
      wechat_name: supplier.wechat_name,
      wechat_number: supplier.wechat_number,
      wechat_qr_url: supplier.wechat_qr_url,
      local_payment_accounts: supplier.local_payment_accounts,
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditForm(null);
  };

  const setField = (field: string, value: string) => {
    setEditForm(f => f ? { ...f, [field]: value || null } : f);
  };

  const handleSave = async () => {
    if (!id || !editForm) return;
    setSaving(true);
    try {
      const isChinese = editForm.supplier_type === 'chinese';
      const payload: Record<string, string | null> = {
        code: editForm.code,
        name: editForm.name,
        short_name: editForm.short_name,
        email: editForm.email,
        phone: editForm.phone,
        supplier_type: editForm.supplier_type,
        alibaba_url: isChinese ? editForm.alibaba_url : null,
        alipay_name: isChinese ? editForm.alipay_name : null,
        alipay_email: isChinese ? editForm.alipay_email : null,
        alipay_qr_url: isChinese ? editForm.alipay_qr_url : null,
        wechat_name: isChinese ? editForm.wechat_name : null,
        wechat_number: isChinese ? editForm.wechat_number : null,
        wechat_qr_url: isChinese ? editForm.wechat_qr_url : null,
        local_payment_accounts: !isChinese ? editForm.local_payment_accounts : null,
      };

      Object.keys(payload).forEach(k => {
        if (typeof payload[k] === 'string') {
          payload[k] = (payload[k] as string).trim() || null;
        }
      });

      const { error } = await supabase
        .from('suppliers')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      await load();
      setEditing(false);
      setEditForm(null);
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const resetCatalogForm = () => {
    setCatalogName('');
    setCatalogUrl('');
    setCatalogPriceRange('');
    setCatalogNotes('');
    setCatalogInputMode('url');
    setUploadFile(null);
    setUploadProgress(0);
    setShowCatalogForm(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    if (!catalogName.trim()) {
      setCatalogName(file.name.replace(/\.[^.]+$/, ''));
    }
  };

  const addCatalog = async () => {
    if (!id || !catalogName.trim()) return;

    setSavingCatalog(true);
    try {
      let finalUrl = '';

      if (catalogInputMode === 'upload' && uploadFile) {
        setUploading(true);
        setUploadProgress(10);
        const ext = uploadFile.name.split('.').pop();
        const path = `${id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('supplier-catalogs')
          .upload(path, uploadFile, { upsert: false });
        if (uploadError) throw uploadError;
        setUploadProgress(80);
        const { data: urlData } = supabase.storage.from('supplier-catalogs').getPublicUrl(path);
        finalUrl = urlData.publicUrl;
        setUploadProgress(100);
        setUploading(false);
      } else {
        if (!catalogUrl.trim()) { setSavingCatalog(false); return; }
        finalUrl = catalogUrl.trim();
      }

      const { error } = await supabase.from('supplier_catalogs').insert({
        supplier_id: id,
        file_name: catalogName.trim(),
        file_url: finalUrl,
        price_range: catalogPriceRange.trim() || null,
        notes: catalogNotes.trim() || null,
        uploaded_by: user?.id || null,
      });
      if (error) throw error;
      resetCatalogForm();
      await load();
    } catch (err) {
      console.error('Add catalog error:', err);
      setUploading(false);
    } finally {
      setSavingCatalog(false);
      setUploadProgress(0);
    }
  };

  const deleteCatalog = async (catalogId: string) => {
    try {
      const { error } = await supabase
        .from('supplier_catalogs')
        .delete()
        .eq('id', catalogId);
      if (error) throw error;
      setCatalogs(c => c.filter(x => x.id !== catalogId));
    } catch (err) {
      console.error('Delete catalog error:', err);
    }
  };

  const updateCatalog = async (catalogId: string, price_range: string | null, notes: string | null) => {
    try {
      const { error } = await supabase
        .from('supplier_catalogs')
        .update({ price_range, notes })
        .eq('id', catalogId);
      if (error) throw error;
      setCatalogs(c => c.map(x => x.id === catalogId ? { ...x, price_range, notes } : x));
    } catch (err) {
      console.error('Update catalog error:', err);
    }
  };

  const addNote = async () => {
    if (!id || !newNote.trim()) return;
    setSavingNote(true);
    try {
      const { error } = await supabase.from('supplier_notes').insert({
        supplier_id: id,
        note: newNote.trim(),
        created_by: user?.id || null,
      });
      if (error) throw error;
      setNewNote('');
      await load();
    } catch (err) {
      console.error('Add note error:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('supplier_notes')
        .delete()
        .eq('id', noteId);
      if (error) throw error;
      setNotes(n => n.filter(x => x.id !== noteId));
    } catch (err) {
      console.error('Delete note error:', err);
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  };

  const formatDateTime = (iso: string) => {
    return new Date(iso).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Supplier not found.</p>
        <Button variant="ghost" onClick={() => navigate('/purchase/suppliers')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Suppliers
        </Button>
      </div>
    );
  }

  const supplierType = (editing && editForm ? editForm.supplier_type : supplier.supplier_type) || 'chinese';
  const isChinese = supplierType === 'chinese';
  const canAddCatalog = catalogName.trim() && (
    catalogInputMode === 'url' ? catalogUrl.trim() : uploadFile !== null
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/purchase/suppliers')}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              {supplier.code ? (
                <span className="text-sm font-bold text-gray-700">{supplier.code}</span>
              ) : (
                <Building2 className="w-6 h-6 text-gray-500" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                  isChinese
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {isChinese ? 'Chinese' : 'Local'}
                </span>
              </div>
              {supplier.code && (
                <span className="text-sm text-gray-500">Code: {supplier.code}</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <Button variant="outline" onClick={cancelEdit} disabled={saving}>
                <X className="w-4 h-4 mr-1.5" /> Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-gray-900 text-white hover:bg-gray-800"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-1.5" /> Saving...</>
                ) : (
                  <><Save className="w-4 h-4 mr-1.5" /> Save Changes</>
                )}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={startEdit}
              className="flex items-center gap-1.5"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Supplier Information</h2>
        </div>

        {editing && editForm && (
          <div className="px-5 pt-5">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Supplier Type</p>
            <div className="flex gap-2 mb-1">
              <button
                type="button"
                onClick={() => setEditForm(f => f ? { ...f, supplier_type: 'chinese' } : f)}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                  editForm.supplier_type === 'chinese'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                Chinese Supplier
              </button>
              <button
                type="button"
                onClick={() => setEditForm(f => f ? { ...f, supplier_type: 'local' } : f)}
                className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                  editForm.supplier_type === 'local'
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                Local Supplier
              </button>
            </div>
          </div>
        )}

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldRow
            label="Initial Code"
            value={editing && editForm ? editForm.code : supplier.code}
            editing={editing}
            field="code"
            onChange={setField}
            placeholder="e.g., MQ"
          />
          <FieldRow
            label="Company Name"
            value={editing && editForm ? editForm.name : supplier.name}
            editing={editing}
            field="name"
            onChange={setField}
            placeholder="Full company name"
          />
          <div className="sm:col-span-2">
            <FieldRow
              label="Short Name / Initials (CSV import matching)"
              value={editing && editForm ? editForm.short_name : supplier.short_name}
              editing={editing}
              field="short_name"
              onChange={setField}
              placeholder="e.g., MQ, ZH, MO"
            />
            {!editing && supplier.short_name && (
              <p className="text-xs text-gray-400 mt-1">Used to match this supplier when importing products via CSV</p>
            )}
          </div>
          <FieldRow
            label="Email Address"
            value={editing && editForm ? editForm.email : supplier.email}
            editing={editing}
            field="email"
            onChange={setField}
            placeholder="contact@supplier.com"
            type="email"
          />
          <FieldRow
            label="Phone Number"
            value={editing && editForm ? editForm.phone : supplier.phone}
            editing={editing}
            field="phone"
            onChange={setField}
            placeholder={isChinese ? '+86 ...' : '+880 ...'}
          />
          {isChinese && (
            <div className="sm:col-span-2">
              <FieldRow
                label="Alibaba Store URL"
                value={editing && editForm ? editForm.alibaba_url : supplier.alibaba_url}
                editing={editing}
                field="alibaba_url"
                onChange={setField}
                placeholder="https://supplier.en.alibaba.com"
                type="url"
              />
              {!editing && supplier.alibaba_url && (
                <a
                  href={supplier.alibaba_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 mt-1"
                >
                  <ExternalLink className="w-3 h-3" /> Open Store
                </a>
              )}
            </div>
          )}
        </div>
      </Card>

      {isChinese ? (
        <Card>
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Payment Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">QR codes are shown large for easy screenshot sharing with forwarders</p>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-gray-100">
            <div className="space-y-4 pb-6 md:pb-0 md:pr-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded uppercase tracking-wide">
                  Alipay
                </span>
              </div>
              <FieldRow
                label="Alipay Chinese Name"
                value={editing && editForm ? editForm.alipay_name : supplier.alipay_name}
                editing={editing}
                field="alipay_name"
                onChange={setField}
                placeholder="支付宝名称"
              />
              <FieldRow
                label="Alipay Account"
                value={editing && editForm ? editForm.alipay_email : supplier.alipay_email}
                editing={editing}
                field="alipay_email"
                onChange={setField}
                placeholder="alipay@supplier.com"
                type="email"
              />
              <QrBlock
                label="Alipay QR Code"
                url={editing && editForm ? editForm.alipay_qr_url : supplier.alipay_qr_url}
                editing={editing}
                onChange={v => setEditForm(f => f ? { ...f, alipay_qr_url: v || null } : f)}
                onClear={() => setEditForm(f => f ? { ...f, alipay_qr_url: null } : f)}
                accent="blue"
              />
            </div>

            <div className="space-y-4 pt-6 md:pt-0 md:pl-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded uppercase tracking-wide">
                  WeChat Pay
                </span>
              </div>
              <FieldRow
                label="WeChat Chinese Name"
                value={editing && editForm ? editForm.wechat_name : supplier.wechat_name}
                editing={editing}
                field="wechat_name"
                onChange={setField}
                placeholder="微信名称"
              />
              <FieldRow
                label="WeChat Number/ID"
                value={editing && editForm ? editForm.wechat_number : supplier.wechat_number}
                editing={editing}
                field="wechat_number"
                onChange={setField}
                placeholder="WeChat ID"
              />
              <QrBlock
                label="WeChat QR Code"
                url={editing && editForm ? editForm.wechat_qr_url : supplier.wechat_qr_url}
                editing={editing}
                onChange={v => setEditForm(f => f ? { ...f, wechat_qr_url: v || null } : f)}
                onClear={() => setEditForm(f => f ? { ...f, wechat_qr_url: null } : f)}
                accent="green"
              />
            </div>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="p-5 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-800">Payment Account Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">Bank accounts, mobile banking, and other payment methods</p>
          </div>
          <div className="p-5">
            {editing && editForm ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  Enter payment details below — one account per line or in any format you prefer.
                </p>
                <textarea
                  value={editForm.local_payment_accounts || ''}
                  onChange={e => setEditForm(f => f ? { ...f, local_payment_accounts: e.target.value || null } : f)}
                  placeholder={`Bank: Dutch-Bangla Bank\nA/C: 1234567890\nbKash: 01700-000000\nNagad: 01800-000000`}
                  rows={6}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-gray-50 placeholder-gray-400 resize-none font-mono"
                />
              </div>
            ) : supplier.local_payment_accounts ? (
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono bg-amber-50/40 border border-amber-100 rounded-lg px-4 py-3 leading-relaxed">
                {supplier.local_payment_accounts}
              </pre>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-gray-400 text-sm italic">No payment details added yet.</p>
                <p className="text-gray-400 text-xs mt-1">Click Edit to add bank accounts and other payment info.</p>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Supplier Catalogs</h2>
            <p className="text-xs text-gray-400 mt-0.5">Upload a file or link from Google Drive — add price range and remarks for each catalog</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowCatalogForm(v => !v)}
            className="flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Catalog
          </Button>
        </div>

        {showCatalogForm && (
          <div className="p-5 border-b border-gray-100 bg-gray-50/60">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-4">New Catalog</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Catalog Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={catalogName}
                  onChange={e => setCatalogName(e.target.value)}
                  placeholder="e.g., Spring 2025 Catalog"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white placeholder-gray-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">File Source <span className="text-red-400">*</span></label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden w-fit mb-3">
                  <button
                    type="button"
                    onClick={() => setCatalogInputMode('url')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
                      catalogInputMode === 'url'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Link className="w-3.5 h-3.5" /> Paste URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setCatalogInputMode('upload')}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors border-l border-gray-200 ${
                      catalogInputMode === 'upload'
                        ? 'bg-gray-900 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" /> Upload File
                  </button>
                </div>

                {catalogInputMode === 'url' ? (
                  <div className="flex items-center gap-2">
                    <Link className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <input
                      type="url"
                      value={catalogUrl}
                      onChange={e => setCatalogUrl(e.target.value)}
                      placeholder="https://drive.google.com/..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white placeholder-gray-400"
                    />
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.xlsx,.xls"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {uploadFile ? (
                      <div className="flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg bg-white">
                        <FileText className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate flex-1">{uploadFile.name}</span>
                        <button
                          onClick={() => { setUploadFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-200 rounded-lg bg-white hover:border-gray-400 hover:bg-gray-50 transition-colors"
                      >
                        <Upload className="w-6 h-6 text-gray-400" />
                        <span className="text-sm text-gray-500">Click to select a file</span>
                        <span className="text-xs text-gray-400">PDF, Images, Excel — max 20MB</span>
                      </button>
                    )}
                    {uploading && uploadProgress > 0 && (
                      <div className="mt-2">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-800 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Uploading... {uploadProgress}%</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price Range</label>
                  <input
                    type="text"
                    value={catalogPriceRange}
                    onChange={e => setCatalogPriceRange(e.target.value)}
                    placeholder="e.g. ¥10–¥50, Budget range"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white placeholder-gray-400"
                  />
                </div>
                <div className="sm:row-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
                  <textarea
                    value={catalogNotes}
                    onChange={e => setCatalogNotes(e.target.value)}
                    placeholder="Observations, ordering notes, quality feedback, future stock ideas..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-white placeholder-gray-400 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <Button
                onClick={addCatalog}
                disabled={savingCatalog || !canAddCatalog}
                className="bg-gray-900 text-white hover:bg-gray-800 text-sm"
              >
                {savingCatalog ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> {uploading ? 'Uploading...' : 'Saving...'}</>
                ) : (
                  'Save Catalog'
                )}
              </Button>
              <Button
                variant="outline"
                onClick={resetCatalogForm}
                className="text-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {catalogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm font-medium">No catalogs added yet</p>
            <p className="text-gray-400 text-xs mt-1">Upload a file or add a link to a Google Drive PDF</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {catalogs.map(catalog => (
              <CatalogCard
                key={catalog.id}
                catalog={catalog}
                onDelete={deleteCatalog}
                onUpdate={updateCatalog}
              />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-800">Notes</h2>
            {notes.length > 0 && (
              <span className="ml-auto text-xs text-gray-400 font-medium">{notes.length} note{notes.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Log important information, reminders, or observations about this supplier</p>
        </div>

        <div className="p-5 border-b border-gray-100">
          <div className="space-y-2">
            <textarea
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Add a note about this supplier..."
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 bg-gray-50 placeholder-gray-400 resize-none"
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && newNote.trim()) {
                  e.preventDefault();
                  addNote();
                }
              }}
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">Cmd+Enter to post</p>
              <Button
                onClick={addNote}
                disabled={savingNote || !newNote.trim()}
                className="bg-gray-900 text-white hover:bg-gray-800 text-sm flex items-center gap-1.5"
              >
                {savingNote ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Posting...</>
                ) : (
                  <><Send className="w-3.5 h-3.5" /> Post Note</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-gray-500 text-sm font-medium">No notes yet</p>
            <p className="text-gray-400 text-xs mt-1">Use notes to track important details about this supplier over time</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notes.map(note => (
              <div key={note.id} className="px-5 py-4 hover:bg-gray-50/50 transition-colors group">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-semibold text-gray-600">
                        {note.users?.full_name?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-700">
                          {note.users?.full_name || 'Unknown user'}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDateTime(note.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{note.note}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
