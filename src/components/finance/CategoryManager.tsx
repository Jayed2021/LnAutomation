import { useState, useEffect } from 'react';
import { Plus, ChevronRight, ChevronDown, Loader2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import {
  type ExpenseCategory,
  type CategoryNode,
  fetchCategories,
  buildCategoryTree,
  addCategory,
  updateCategory,
} from '../../pages/finance/expenseService';

interface CategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoriesChanged: () => void;
}

interface AddFormState {
  parentId: string | null;
  name: string;
  affectsProfitDefault: boolean;
}

export default function CategoryManager({
  open,
  onOpenChange,
  onCategoriesChanged,
}: CategoryManagerProps) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [addForm, setAddForm] = useState<AddFormState | null>(null);
  const [addLoading, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const cats = await fetchCategories();
      setCategories(cats);
      const parentIds = new Set(cats.filter(c => c.parent_id === null).map(c => c.id));
      setExpandedIds(parentIds);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const tree = buildCategoryTree(categories);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleActive = async (cat: ExpenseCategory) => {
    setTogglingId(cat.id);
    try {
      await updateCategory(cat.id, { is_active: !cat.is_active });
      await load();
      onCategoriesChanged();
    } finally {
      setTogglingId(null);
    }
  };

  const handleToggleProfitDefault = async (cat: ExpenseCategory) => {
    setTogglingId(cat.id);
    try {
      await updateCategory(cat.id, { affects_profit_default: !cat.affects_profit_default });
      await load();
      onCategoriesChanged();
    } finally {
      setTogglingId(null);
    }
  };

  const handleAdd = async () => {
    if (!addForm) return;
    if (!addForm.name.trim()) {
      setAddError('Name is required.');
      return;
    }
    setSavingAdd(true);
    setAddError('');
    try {
      await addCategory(addForm.name.trim(), addForm.parentId, addForm.affectsProfitDefault);
      setAddForm(null);
      await load();
      onCategoriesChanged();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setAddError(msg.includes('unique') ? 'A category with this name already exists.' : 'Failed to add category.');
    } finally {
      setSavingAdd(false);
    }
  };

  const renderNode = (node: CategoryNode, depth = 0): React.ReactNode => {
    const isLeaf = node.children.length === 0;
    const isExpanded = expandedIds.has(node.id);
    const isToggling = togglingId === node.id;

    return (
      <div key={node.id}>
        <div
          className={cn(
            'flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors',
            !node.is_active && 'opacity-50'
          )}
          style={{ paddingLeft: `${12 + depth * 20}px` }}
        >
          {!isLeaf ? (
            <button
              type="button"
              onClick={() => toggleExpand(node.id)}
              className="p-0.5 rounded hover:bg-gray-200 transition-colors flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
              )}
            </button>
          ) : (
            <span className="w-5 flex-shrink-0" />
          )}

          <span className={cn(
            'flex-1 text-sm truncate',
            isLeaf ? 'text-gray-700' : 'text-gray-900 font-medium'
          )}>
            {node.name}
          </span>

          {isLeaf && (
            <div className="flex items-center gap-1 flex-shrink-0 mr-2">
              <span className="text-xs text-gray-400">Affects P&L</span>
              <button
                type="button"
                onClick={() => handleToggleProfitDefault(node)}
                disabled={isToggling}
                className={cn(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                  node.affects_profit_default ? 'bg-emerald-500' : 'bg-gray-300',
                  isToggling && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform',
                    node.affects_profit_default ? 'translate-x-4.5' : 'translate-x-0.5'
                  )}
                />
              </button>
            </div>
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            {!isLeaf && (
              <button
                type="button"
                onClick={() => {
                  setAddForm({
                    parentId: node.id,
                    name: '',
                    affectsProfitDefault: true,
                  });
                  setAddError('');
                  if (!isExpanded) toggleExpand(node.id);
                }}
                className="p-1 rounded hover:bg-blue-50 text-blue-600 transition-colors"
                title="Add subcategory"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleToggleActive(node)}
              disabled={isToggling}
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium transition-colors',
                node.is_active
                  ? 'bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600'
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100',
                isToggling && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isToggling ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : node.is_active ? 'Active' : 'Inactive'}
            </button>
          </div>
        </div>

        {!isLeaf && isExpanded && (
          <div>
            {node.children.map(child => renderNode(child, depth + 1))}
            {addForm?.parentId === node.id && (
              <AddInlineForm
                form={addForm}
                error={addError}
                loading={addLoading}
                depth={depth + 1}
                onChange={setAddForm}
                onSave={handleAdd}
                onCancel={() => { setAddForm(null); setAddError(''); }}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative ml-auto z-50 w-full max-w-sm h-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">Manage Categories</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {tree.map(node => renderNode(node))}

              {addForm?.parentId === null && (
                <div className="mt-3">
                  <AddInlineForm
                    form={addForm}
                    error={addError}
                    loading={addLoading}
                    depth={0}
                    onChange={setAddForm}
                    onSave={handleAdd}
                    onCancel={() => { setAddForm(null); setAddError(''); }}
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200">
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center gap-2 justify-center"
            onClick={() => {
              setAddForm({ parentId: null, name: '', affectsProfitDefault: true });
              setAddError('');
            }}
          >
            <Plus className="w-4 h-4" />
            Add New Parent Category
          </Button>
        </div>
      </div>
    </div>
  );
}

interface AddInlineFormProps {
  form: AddFormState;
  error: string;
  loading: boolean;
  depth: number;
  onChange: (f: AddFormState) => void;
  onSave: () => void;
  onCancel: () => void;
}

function AddInlineForm({ form, error, loading, depth, onChange, onSave, onCancel }: AddInlineFormProps) {
  return (
    <div
      className="bg-blue-50 border border-blue-200 rounded-lg p-3 my-1"
      style={{ marginLeft: `${12 + depth * 20}px` }}
    >
      <input
        autoFocus
        type="text"
        placeholder={form.parentId ? 'Subcategory name' : 'Parent category name'}
        value={form.name}
        onChange={e => onChange({ ...form, name: e.target.value })}
        onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel(); }}
        className="w-full px-2.5 py-1.5 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
      />

      {form.parentId && (
        <label className="flex items-center gap-2 mt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.affectsProfitDefault}
            onChange={e => onChange({ ...form, affectsProfitDefault: e.target.checked })}
            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
          />
          <span className="text-xs text-gray-600">Affects P&L by default</span>
        </label>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      <div className="flex gap-2 mt-2">
        <Button
          size="sm"
          variant="primary"
          onClick={onSave}
          disabled={loading}
          className="flex-1 text-xs"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Add'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 text-xs"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
