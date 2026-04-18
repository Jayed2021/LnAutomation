import { useState, useEffect } from 'react';
import { Plus, Save, X, CreditCard as Edit2, FlaskConical, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LensBrandType {
  id: string;
  lens_type_name: string;
  is_high_index_applicable: boolean;
  default_lab_price: number;
  default_customer_price: number;
  is_active: boolean;
  sort_order: number;
  editing?: boolean;
}

interface LensBrand {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  types: LensBrandType[];
  expanded?: boolean;
  editingName?: boolean;
  addingType?: boolean;
}

const inputCls = "px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white w-full";
const numInput = "px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white w-20 text-right";

export function LensBrandManager() {
  const [brands, setBrands] = useState<LensBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingBrand, setAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data: brandRows } = await supabase
      .from('lens_brands')
      .select('id, name, is_active, sort_order')
      .order('sort_order');
    const { data: typeRows } = await supabase
      .from('lens_brand_types')
      .select('id, brand_id, lens_type_name, is_high_index_applicable, default_lab_price, default_customer_price, is_active, sort_order')
      .order('sort_order');
    if (!brandRows) { setLoading(false); return; }
    const built: LensBrand[] = brandRows.map(b => ({
      ...b,
      types: (typeRows ?? []).filter(t => t.brand_id === b.id).map(t => ({ ...t })),
      expanded: false,
    }));
    setBrands(built);
    setLoading(false);
  };

  const addBrand = async () => {
    if (!newBrandName.trim()) return;
    setSaving('new-brand');
    const maxOrder = brands.reduce((m, b) => Math.max(m, b.sort_order), 0);
    const { data, error } = await supabase
      .from('lens_brands')
      .insert({ name: newBrandName.trim(), sort_order: maxOrder + 1 })
      .select()
      .maybeSingle();
    if (!error && data) {
      setBrands(prev => [...prev, { ...data, types: [], expanded: true }]);
      setNewBrandName('');
      setAddingBrand(false);
    }
    setSaving(null);
  };

  const saveBrandName = async (brandId: string, name: string) => {
    setSaving(brandId);
    await supabase.from('lens_brands').update({ name }).eq('id', brandId);
    setBrands(prev => prev.map(b => b.id === brandId ? { ...b, name, editingName: false } : b));
    setSaving(null);
  };

  const toggleBrandActive = async (brandId: string, current: boolean) => {
    setSaving(brandId + '-active');
    await supabase.from('lens_brands').update({ is_active: !current }).eq('id', brandId);
    setBrands(prev => prev.map(b => b.id === brandId ? { ...b, is_active: !current } : b));
    setSaving(null);
  };

  const addLensType = async (brandId: string, typeData: { lens_type_name: string; is_high_index_applicable: boolean; default_lab_price: number; default_customer_price: number }) => {
    if (!typeData.lens_type_name.trim()) return;
    setSaving(brandId + '-addtype');
    const brand = brands.find(b => b.id === brandId);
    const maxOrder = (brand?.types ?? []).reduce((m, t) => Math.max(m, t.sort_order), 0);
    const { data, error } = await supabase
      .from('lens_brand_types')
      .insert({ brand_id: brandId, ...typeData, sort_order: maxOrder + 1 })
      .select()
      .maybeSingle();
    if (!error && data) {
      setBrands(prev => prev.map(b => b.id === brandId ? {
        ...b,
        types: [...b.types, { ...data }],
        addingType: false,
      } : b));
    }
    setSaving(null);
  };

  const saveLensType = async (brandId: string, typeId: string, updates: Partial<LensBrandType>) => {
    setSaving(typeId);
    await supabase.from('lens_brand_types').update(updates).eq('id', typeId);
    setBrands(prev => prev.map(b => b.id === brandId ? {
      ...b,
      types: b.types.map(t => t.id === typeId ? { ...t, ...updates, editing: false } : t),
    } : b));
    setSaving(null);
  };

  const toggleTypeActive = async (brandId: string, typeId: string, current: boolean) => {
    setSaving(typeId + '-active');
    await supabase.from('lens_brand_types').update({ is_active: !current }).eq('id', typeId);
    setBrands(prev => prev.map(b => b.id === brandId ? {
      ...b,
      types: b.types.map(t => t.id === typeId ? { ...t, is_active: !current } : t),
    } : b));
    setSaving(null);
  };

  if (loading) {
    return <div className="px-5 py-8 text-center text-sm text-gray-400">Loading lens brands...</div>;
  }

  return (
    <div className="divide-y divide-gray-100">
      <div className="px-5 py-4 flex items-center gap-3 bg-gray-50/50">
        <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
          <FlaskConical className="w-4 h-4 text-teal-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">Prescription Lens Settings</h3>
          <p className="text-xs text-gray-500">Manage lens brands, types and default pricing</p>
        </div>
        <button
          onClick={() => setAddingBrand(true)}
          className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 border border-teal-200 px-2.5 py-1.5 rounded-lg transition-colors hover:bg-teal-50"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Brand
        </button>
      </div>

      {addingBrand && (
        <div className="px-5 py-3 bg-teal-50/50 border-b border-teal-100 flex items-center gap-2">
          <input
            autoFocus
            value={newBrandName}
            onChange={e => setNewBrandName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addBrand(); if (e.key === 'Escape') { setAddingBrand(false); setNewBrandName(''); } }}
            placeholder="Brand name (e.g. Eyepro)"
            className="px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 flex-1"
          />
          <button
            onClick={addBrand}
            disabled={saving === 'new-brand' || !newBrandName.trim()}
            className="flex items-center gap-1 text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-3 h-3" />
            Save
          </button>
          <button
            onClick={() => { setAddingBrand(false); setNewBrandName(''); }}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {brands.length === 0 && !addingBrand && (
        <div className="px-5 py-8 text-center text-sm text-gray-400">
          No lens brands configured. Click "Add Brand" to get started.
        </div>
      )}

      {brands.map(brand => (
        <BrandRow
          key={brand.id}
          brand={brand}
          saving={saving}
          onToggleExpand={() => setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, expanded: !b.expanded } : b))}
          onStartEditName={() => setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, editingName: true } : b))}
          onCancelEditName={() => setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, editingName: false } : b))}
          onSaveName={(name) => saveBrandName(brand.id, name)}
          onToggleActive={() => toggleBrandActive(brand.id, brand.is_active)}
          onStartAddType={() => setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, addingType: true, expanded: true } : b))}
          onCancelAddType={() => setBrands(prev => prev.map(b => b.id === brand.id ? { ...b, addingType: false } : b))}
          onSaveNewType={(d) => addLensType(brand.id, d)}
          onStartEditType={(typeId) => setBrands(prev => prev.map(b => b.id === brand.id ? {
            ...b,
            types: b.types.map(t => t.id === typeId ? { ...t, editing: true } : t),
          } : b))}
          onCancelEditType={(typeId) => setBrands(prev => prev.map(b => b.id === brand.id ? {
            ...b,
            types: b.types.map(t => t.id === typeId ? { ...t, editing: false } : t),
          } : b))}
          onSaveType={(typeId, updates) => saveLensType(brand.id, typeId, updates)}
          onToggleTypeActive={(typeId, current) => toggleTypeActive(brand.id, typeId, current)}
        />
      ))}
    </div>
  );
}

interface BrandRowProps {
  brand: LensBrand;
  saving: string | null;
  onToggleExpand: () => void;
  onStartEditName: () => void;
  onCancelEditName: () => void;
  onSaveName: (name: string) => void;
  onToggleActive: () => void;
  onStartAddType: () => void;
  onCancelAddType: () => void;
  onSaveNewType: (d: { lens_type_name: string; is_high_index_applicable: boolean; default_lab_price: number; default_customer_price: number }) => void;
  onStartEditType: (typeId: string) => void;
  onCancelEditType: (typeId: string) => void;
  onSaveType: (typeId: string, updates: Partial<LensBrandType>) => void;
  onToggleTypeActive: (typeId: string, current: boolean) => void;
}

function BrandRow({
  brand, saving,
  onToggleExpand, onStartEditName, onCancelEditName, onSaveName, onToggleActive,
  onStartAddType, onCancelAddType, onSaveNewType,
  onStartEditType, onCancelEditType, onSaveType, onToggleTypeActive,
}: BrandRowProps) {
  const [nameEdit, setNameEdit] = useState(brand.name);
  const [newType, setNewType] = useState({ lens_type_name: '', is_high_index_applicable: false, default_lab_price: 0, default_customer_price: 0 });
  const [typeEdits, setTypeEdits] = useState<Record<string, LensBrandType>>({});

  const startEditType = (t: LensBrandType) => {
    setTypeEdits(prev => ({ ...prev, [t.id]: { ...t } }));
    onStartEditType(t.id);
  };

  const toggleClass = (active: boolean) =>
    `relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${active ? 'bg-teal-500' : 'bg-gray-200'}`;
  const thumbClass = (active: boolean) =>
    `pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ${active ? 'translate-x-3' : 'translate-x-0'}`;

  return (
    <div className={`${!brand.is_active ? 'opacity-60' : ''}`}>
      <div className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
        <button onClick={onToggleExpand} className="text-gray-400 hover:text-gray-600">
          {brand.expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {brand.editingName ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              autoFocus
              value={nameEdit}
              onChange={e => setNameEdit(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') onSaveName(nameEdit); if (e.key === 'Escape') onCancelEditName(); }}
              className="px-2 py-1 border border-teal-300 rounded text-sm flex-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <button onClick={() => onSaveName(nameEdit)} disabled={saving === brand.id} className="text-xs text-teal-600 hover:text-teal-700 px-2 py-1 rounded hover:bg-teal-50">
              <Save className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCancelEditName} className="text-xs text-gray-400 hover:text-gray-600 px-1 py-1 rounded hover:bg-gray-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-medium text-gray-900">{brand.name}</span>
            <span className="text-xs text-gray-400">{brand.types.filter(t => t.is_active).length} active types</span>
            <button onClick={onStartEditName} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors">
              <Edit2 className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          {!brand.editingName && (
            <button
              onClick={onStartAddType}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-700 border border-gray-200 hover:border-teal-200 px-2 py-1 rounded transition-colors hover:bg-teal-50"
            >
              <Plus className="w-3 h-3" />
              Add Type
            </button>
          )}
          <button
            onClick={onToggleActive}
            disabled={saving === brand.id + '-active'}
            className={toggleClass(brand.is_active)}
            role="switch"
            aria-checked={brand.is_active}
          >
            <span className={thumbClass(brand.is_active)} />
          </button>
        </div>
      </div>

      {brand.expanded && (
        <div className="ml-8 mr-4 mb-2 border border-gray-100 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-3 py-2 font-semibold text-gray-600">Lens Type</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">High Index</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">Lab Price (৳)</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-600 whitespace-nowrap">Cust. Price (৳)</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-600">Active</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {brand.types.map(t => {
                const ed = typeEdits[t.id] ?? t;
                return (
                  <tr key={t.id} className={`hover:bg-gray-50 ${!t.is_active ? 'opacity-50' : ''}`}>
                    {t.editing ? (
                      <>
                        <td className="px-3 py-2">
                          <input value={ed.lens_type_name} onChange={e => setTypeEdits(prev => ({ ...prev, [t.id]: { ...ed, lens_type_name: e.target.value } }))} className={inputCls} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <input type="checkbox" checked={ed.is_high_index_applicable} onChange={e => setTypeEdits(prev => ({ ...prev, [t.id]: { ...ed, is_high_index_applicable: e.target.checked } }))} className="rounded border-gray-300 text-teal-600" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" value={ed.default_lab_price} onChange={e => setTypeEdits(prev => ({ ...prev, [t.id]: { ...ed, default_lab_price: parseFloat(e.target.value) || 0 } }))} className={numInput} min="0" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input type="number" value={ed.default_customer_price} onChange={e => setTypeEdits(prev => ({ ...prev, [t.id]: { ...ed, default_customer_price: parseFloat(e.target.value) || 0 } }))} className={numInput} min="0" />
                        </td>
                        <td className="px-3 py-2 text-center">—</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => onSaveType(t.id, { lens_type_name: ed.lens_type_name, is_high_index_applicable: ed.is_high_index_applicable, default_lab_price: ed.default_lab_price, default_customer_price: ed.default_customer_price })} disabled={saving === t.id} className="p-1 text-teal-600 hover:text-teal-700 rounded hover:bg-teal-50">
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => onCancelEditType(t.id)} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 text-gray-800 font-medium">{t.lens_type_name}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${t.is_high_index_applicable ? 'bg-teal-50 text-teal-700' : 'bg-gray-100 text-gray-400'}`}>
                            {t.is_high_index_applicable ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 font-mono">{t.default_lab_price.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-gray-700 font-mono">{t.default_customer_price.toLocaleString()}</td>
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => onToggleTypeActive(t.id, t.is_active)}
                            disabled={saving === t.id + '-active'}
                            className={`relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${t.is_active ? 'bg-teal-500' : 'bg-gray-200'}`}
                          >
                            <span className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow transition duration-200 ${t.is_active ? 'translate-x-3' : 'translate-x-0'}`} />
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => startEditType(t)} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}

              {brand.addingType && (
                <tr className="bg-teal-50/50">
                  <td className="px-3 py-2">
                    <input
                      autoFocus
                      value={newType.lens_type_name}
                      onChange={e => setNewType(prev => ({ ...prev, lens_type_name: e.target.value }))}
                      placeholder="e.g. Anti-Blue"
                      className={inputCls}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" checked={newType.is_high_index_applicable} onChange={e => setNewType(prev => ({ ...prev, is_high_index_applicable: e.target.checked }))} className="rounded border-gray-300 text-teal-600" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input type="number" value={newType.default_lab_price} onChange={e => setNewType(prev => ({ ...prev, default_lab_price: parseFloat(e.target.value) || 0 }))} className={numInput} min="0" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <input type="number" value={newType.default_customer_price} onChange={e => setNewType(prev => ({ ...prev, default_customer_price: parseFloat(e.target.value) || 0 }))} className={numInput} min="0" />
                  </td>
                  <td className="px-3 py-2 text-center text-gray-300 text-xs">New</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => onSaveNewType(newType)} disabled={saving === brand.id + '-addtype' || !newType.lens_type_name.trim()} className="p-1 text-teal-600 hover:text-teal-700 rounded hover:bg-teal-50 disabled:opacity-50">
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setNewType({ lens_type_name: '', is_high_index_applicable: false, default_lab_price: 0, default_customer_price: 0 }); onCancelAddType(); }} className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {brand.types.length === 0 && !brand.addingType && (
                <tr>
                  <td colSpan={6} className="px-3 py-4 text-center text-gray-400 text-xs italic">
                    No lens types yet. Click "Add Type" to add one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
