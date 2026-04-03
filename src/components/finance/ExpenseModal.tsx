import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, Loader2, Search, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import {
  type Expense,
  type ExpenseCategory,
  type CategoryNode,
  type CreateExpensePayload,
  type UpdateExpensePayload,
  buildCategoryTree,
  createExpense,
  updateExpense,
} from '../../pages/finance/expenseService';

interface ExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  categories: ExpenseCategory[];
  userId: string;
  onSaved: () => void;
}

interface LineItem {
  category_id: string;
  amount: string;
  reference_number: string;
  description: string;
}

interface EditFormState {
  category_id: string;
  expense_date: string;
  amount: string;
  reference_number: string;
  description: string;
  affects_profit: boolean;
  receipt_file: File | null;
  existing_receipt_url: string | null;
  clear_receipt: boolean;
}

interface AddFormState {
  expense_date: string;
  affects_profit: boolean;
  receipt_file: File | null;
  clear_receipt: boolean;
  lineItems: LineItem[];
}

const today = () => new Date().toISOString().split('T')[0];

function buildDefaultEditForm(expense: Expense): EditFormState {
  return {
    category_id: expense.category_id,
    expense_date: expense.expense_date,
    amount: String(expense.amount),
    reference_number: expense.reference_number ?? '',
    description: expense.description,
    affects_profit: expense.affects_profit,
    receipt_file: null,
    existing_receipt_url: expense.receipt_url ?? null,
    clear_receipt: false,
  };
}

function buildDefaultAddForm(): AddFormState {
  return {
    expense_date: today(),
    affects_profit: true,
    receipt_file: null,
    clear_receipt: false,
    lineItems: [],
  };
}

function getCategoryPathFromMap(catId: string, catMap: Map<string, ExpenseCategory>): string {
  const cat = catMap.get(catId);
  if (!cat) return '';
  if (cat.parent_id) {
    const parent = catMap.get(cat.parent_id);
    if (parent?.parent_id) {
      const gp = catMap.get(parent.parent_id);
      return gp ? `${gp.name} › ${parent.name} › ${cat.name}` : `${parent.name} › ${cat.name}`;
    }
    return parent ? `${parent.name} › ${cat.name}` : cat.name;
  }
  return cat.name;
}

interface GroupedCategory {
  groupLabel: string;
  leaf: ExpenseCategory;
}

function buildGroupedLeaves(tree: CategoryNode[]): GroupedCategory[] {
  const result: GroupedCategory[] = [];
  const visit = (nodes: CategoryNode[], parentLabel: string) => {
    nodes.forEach(node => {
      if (node.children.length === 0) {
        result.push({ groupLabel: parentLabel, leaf: node });
      } else {
        visit(node.children, parentLabel ? `${parentLabel} › ${node.name}` : node.name);
      }
    });
  };
  visit(tree, '');
  return result;
}

export default function ExpenseModal({
  open,
  onOpenChange,
  expense,
  categories,
  userId,
  onSaved,
}: ExpenseModalProps) {
  const isEdit = !!expense;

  const [editForm, setEditForm] = useState<EditFormState>(
    expense ? buildDefaultEditForm(expense) : buildDefaultEditForm({} as Expense)
  );
  const [addForm, setAddForm] = useState<AddFormState>(buildDefaultAddForm());
  const [editErrors, setEditErrors] = useState<Partial<Record<string, string>>>({});
  const [addErrors, setAddErrors] = useState<Partial<Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [bulkRef, setBulkRef] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  const activeCategories = categories.filter(c => c.is_active);
  const catMap = new Map(categories.map(c => [c.id, c]));
  const tree = buildCategoryTree(activeCategories);
  const groupedLeaves = buildGroupedLeaves(tree);

  const filteredLeaves = categorySearch.trim()
    ? groupedLeaves.filter(g =>
        g.leaf.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
        g.groupLabel.toLowerCase().includes(categorySearch.toLowerCase())
      )
    : groupedLeaves;

  const groups = filteredLeaves.reduce<Record<string, ExpenseCategory[]>>((acc, g) => {
    const key = g.groupLabel || 'Other';
    if (!acc[key]) acc[key] = [];
    acc[key].push(g.leaf);
    return acc;
  }, {});

  useEffect(() => {
    if (open) {
      if (expense) {
        setEditForm(buildDefaultEditForm(expense));
        setEditErrors({});
      } else {
        setAddForm(buildDefaultAddForm());
        setAddErrors({});
        setCategorySearch('');
        setBulkRef('');
      }
      submittingRef.current = false;
    }
  }, [open, expense]);

  const getCategoryPath = useCallback(
    (catId: string) => getCategoryPathFromMap(catId, catMap),
    [catMap]
  );

  const handleEditCategoryChange = (catId: string) => {
    const cat = catMap.get(catId);
    setEditForm(prev => ({
      ...prev,
      category_id: catId,
      affects_profit: cat?.affects_profit_default ?? true,
    }));
  };

  const handleFile = (file: File) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      if (isEdit) {
        setEditErrors(prev => ({ ...prev, receipt_file: 'Only PNG, JPG, PDF files are allowed.' }));
      } else {
        setAddErrors(prev => ({ ...prev, receipt_file: 'Only PNG, JPG, PDF files are allowed.' }));
      }
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      if (isEdit) {
        setEditErrors(prev => ({ ...prev, receipt_file: 'File must be under 10MB.' }));
      } else {
        setAddErrors(prev => ({ ...prev, receipt_file: 'File must be under 10MB.' }));
      }
      return;
    }
    if (isEdit) {
      setEditErrors(prev => ({ ...prev, receipt_file: undefined }));
      setEditForm(prev => ({ ...prev, receipt_file: file, clear_receipt: false }));
    } else {
      setAddErrors(prev => ({ ...prev, receipt_file: undefined }));
      setAddForm(prev => ({ ...prev, receipt_file: file, clear_receipt: false }));
    }
  };

  const toggleCategory = (catId: string) => {
    const cat = catMap.get(catId);
    setAddForm(prev => {
      const exists = prev.lineItems.some(li => li.category_id === catId);
      if (exists) {
        return { ...prev, lineItems: prev.lineItems.filter(li => li.category_id !== catId) };
      }
      return {
        ...prev,
        affects_profit: prev.lineItems.length === 0 ? (cat?.affects_profit_default ?? true) : prev.affects_profit,
        lineItems: [
          ...prev.lineItems,
          { category_id: catId, amount: '', reference_number: '', description: '' },
        ],
      };
    });
  };

  const updateLineItem = (catId: string, field: keyof LineItem, value: string) => {
    setAddForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(li =>
        li.category_id === catId ? { ...li, [field]: value } : li
      ),
    }));
  };

  const removeLineItem = (catId: string) => {
    setAddForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(li => li.category_id !== catId),
    }));
  };

  const applyBulkRef = () => {
    if (!bulkRef.trim()) return;
    setAddForm(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(li => ({ ...li, reference_number: bulkRef.trim() })),
    }));
  };

  const totalAmount = addForm.lineItems.reduce((s, li) => s + (parseFloat(li.amount) || 0), 0);

  const validateEdit = (): boolean => {
    const errs: Record<string, string> = {};
    if (!editForm.category_id) errs.category_id = 'Category is required.';
    if (!editForm.expense_date) errs.expense_date = 'Date is required.';
    if (!editForm.amount || isNaN(Number(editForm.amount)) || Number(editForm.amount) <= 0)
      errs.amount = 'Enter a valid amount.';
    setEditErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateAdd = (): boolean => {
    const errs: Record<string, string> = {};
    if (!addForm.expense_date) errs.expense_date = 'Date is required.';
    if (addForm.lineItems.length === 0) errs.lineItems = 'Select at least one category.';
    addForm.lineItems.forEach((li, i) => {
      if (!li.amount || isNaN(Number(li.amount)) || Number(li.amount) <= 0) {
        errs[`amount_${i}`] = 'Enter a valid amount.';
      }
    });
    setAddErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    if (isEdit) {
      if (!validateEdit()) { submittingRef.current = false; return; }
      setSaving(true);
      try {
        const payload: UpdateExpensePayload = {
          expense_date: editForm.expense_date,
          category_id: editForm.category_id,
          description: editForm.description.trim(),
          amount: Number(editForm.amount),
          affects_profit: editForm.affects_profit,
          reference_number: editForm.reference_number.trim() || undefined,
          clear_receipt: editForm.clear_receipt,
          receipt_file: editForm.receipt_file ?? undefined,
        };
        await updateExpense(expense!.id, payload);
        onSaved();
        onOpenChange(false);
      } catch (err) {
        console.error('Failed to save expense:', err);
        alert('Failed to save expense. Please try again.');
      } finally {
        submittingRef.current = false;
        setSaving(false);
      }
    } else {
      if (!validateAdd()) { submittingRef.current = false; return; }
      setSaving(true);
      try {
        for (let i = 0; i < addForm.lineItems.length; i++) {
          const li = addForm.lineItems[i];
          const payload: CreateExpensePayload = {
            expense_date: addForm.expense_date,
            category_id: li.category_id,
            description: li.description.trim(),
            amount: Number(li.amount),
            affects_profit: addForm.affects_profit,
            reference_number: li.reference_number.trim() || undefined,
            receipt_file: i === 0 ? addForm.receipt_file ?? undefined : undefined,
            created_by: userId,
          };
          await createExpense(payload);
        }
        onSaved();
        onOpenChange(false);
      } catch (err) {
        console.error('Failed to save expense:', err);
        alert('Failed to save expense. Please try again.');
      } finally {
        submittingRef.current = false;
        setSaving(false);
      }
    }
  };

  const renderSelectOptions = (nodes: CategoryNode[], depth = 0): React.ReactNode[] => {
    const opts: React.ReactNode[] = [];
    nodes.forEach(node => {
      const isLeaf = node.children.length === 0;
      const pad = '\u00A0'.repeat(depth * 4);
      if (isLeaf) {
        opts.push(
          <option key={node.id} value={node.id}>
            {pad}{node.name}
          </option>
        );
      } else {
        opts.push(
          <option key={`group-${node.id}`} disabled value="">
            {pad}{node.name.toUpperCase()}
          </option>
        );
        opts.push(...renderSelectOptions(node.children, depth + 1));
      }
    });
    return opts;
  };

  const receiptFile = isEdit ? editForm.receipt_file : addForm.receipt_file;
  const existingReceiptUrl = isEdit ? editForm.existing_receipt_url : null;
  const clearReceipt = isEdit ? editForm.clear_receipt : addForm.clear_receipt;
  const receiptPreviewName = receiptFile?.name
    ?? (existingReceiptUrl && !clearReceipt ? 'Existing receipt' : null);
  const isPdf = receiptFile?.type === 'application/pdf'
    || (existingReceiptUrl?.includes('.pdf') && !clearReceipt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('max-w-lg', !isEdit && 'max-w-3xl')}>
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
        </DialogHeader>

        {isEdit ? (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={editForm.category_id}
                  onChange={e => handleEditCategoryChange(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500',
                    editErrors.category_id ? 'border-red-400' : 'border-gray-300'
                  )}
                >
                  <option value="">Select category</option>
                  {renderSelectOptions(tree)}
                </select>
                {editErrors.category_id && (
                  <p className="text-xs text-red-500 mt-1">{editErrors.category_id}</p>
                )}
                {editForm.category_id && (
                  <p className="text-xs text-gray-400 mt-1 truncate">
                    {getCategoryPath(editForm.category_id)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={editForm.expense_date}
                  onChange={e => setEditForm(prev => ({ ...prev, expense_date: e.target.value }))}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                    editErrors.expense_date ? 'border-red-400' : 'border-gray-300'
                  )}
                />
                {editErrors.expense_date && (
                  <p className="text-xs text-red-500 mt-1">{editErrors.expense_date}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (BDT) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={editForm.amount}
                  onChange={e => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                    editErrors.amount ? 'border-red-400' : 'border-gray-300'
                  )}
                />
                {editErrors.amount && (
                  <p className="text-xs text-red-500 mt-1">{editErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  placeholder="INV-001, Receipt #123..."
                  value={editForm.reference_number}
                  onChange={e => setEditForm(prev => ({ ...prev, reference_number: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Short remark..."
                value={editForm.description}
                onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <ReceiptUploadSection
              receiptPreviewName={receiptPreviewName}
              isPdf={!!isPdf}
              fileInputRef={fileInputRef}
              dragOver={dragOver}
              setDragOver={setDragOver}
              onFile={handleFile}
              onClear={() => {
                setEditForm(prev => ({
                  ...prev,
                  receipt_file: null,
                  clear_receipt: !!prev.existing_receipt_url,
                }));
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              error={editErrors.receipt_file}
            />

            <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <input
                id="edit-affects-profit"
                type="checkbox"
                checked={editForm.affects_profit}
                onChange={e => setEditForm(prev => ({ ...prev, affects_profit: e.target.checked }))}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div>
                <label htmlFor="edit-affects-profit" className="text-sm font-medium text-gray-700 cursor-pointer">
                  This expense affects Profit &amp; Loss calculation
                </label>
                <p className="text-xs text-gray-400 mt-0.5">Override default</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={addForm.expense_date}
                  onChange={e => setAddForm(prev => ({ ...prev, expense_date: e.target.value }))}
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                    addErrors.expense_date ? 'border-red-400' : 'border-gray-300'
                  )}
                />
                {addErrors.expense_date && (
                  <p className="text-xs text-red-500 mt-1">{addErrors.expense_date}</p>
                )}
              </div>

              <div className="flex items-end">
                <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg w-full">
                  <input
                    id="add-affects-profit"
                    type="checkbox"
                    checked={addForm.affects_profit}
                    onChange={e => setAddForm(prev => ({ ...prev, affects_profit: e.target.checked }))}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="add-affects-profit" className="text-sm font-medium text-gray-700 cursor-pointer leading-tight">
                    Affects Profit &amp; Loss
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-[1fr_1fr] gap-4 items-start">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Categories <span className="text-red-500">*</span>
                </label>
                {addErrors.lineItems && (
                  <p className="text-xs text-red-500 mb-1">{addErrors.lineItems}</p>
                )}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-100 bg-gray-50">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search categories..."
                        value={categorySearch}
                        onChange={e => setCategorySearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
                    {Object.keys(groups).length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">No categories found</p>
                    ) : (
                      Object.entries(groups).map(([groupLabel, leaves]) => (
                        <div key={groupLabel}>
                          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              {groupLabel}
                            </span>
                          </div>
                          {leaves.map(leaf => {
                            const checked = addForm.lineItems.some(li => li.category_id === leaf.id);
                            return (
                              <label
                                key={leaf.id}
                                className={cn(
                                  'flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-gray-50 last:border-b-0 hover:bg-blue-50 transition-colors',
                                  checked && 'bg-blue-50'
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleCategory(leaf.id)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className={cn('text-sm', checked ? 'text-blue-700 font-medium' : 'text-gray-700')}>
                                  {leaf.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upload Receipt
                </label>
                <ReceiptUploadSection
                  receiptPreviewName={receiptPreviewName}
                  isPdf={!!isPdf}
                  fileInputRef={fileInputRef}
                  dragOver={dragOver}
                  setDragOver={setDragOver}
                  onFile={handleFile}
                  onClear={() => {
                    setAddForm(prev => ({ ...prev, receipt_file: null }));
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  error={addErrors.receipt_file}
                  compact
                />
                <p className="text-xs text-gray-400 mt-1">Shared across all line items</p>
              </div>
            </div>

            {addForm.lineItems.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Line Items
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Bulk reference..."
                      value={bulkRef}
                      onChange={e => setBulkRef(e.target.value)}
                      className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
                    />
                    <button
                      type="button"
                      onClick={applyBulkRef}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors flex items-center gap-1"
                    >
                      Apply to all
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_90px_110px_110px_28px] gap-0 bg-gray-50 border-b border-gray-200">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Category</div>
                    <div className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</div>
                    <div className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference</div>
                    <div className="px-2 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</div>
                    <div />
                  </div>
                  {addForm.lineItems.map((li, i) => {
                    const cat = catMap.get(li.category_id);
                    return (
                      <div
                        key={li.category_id}
                        className="grid grid-cols-[1fr_90px_110px_110px_28px] gap-0 border-b border-gray-100 last:border-b-0 items-center"
                      >
                        <div className="px-3 py-2">
                          <span className="text-sm font-medium text-gray-800 block leading-tight">{cat?.name ?? li.category_id}</span>
                          <span className="text-xs text-gray-400">{getCategoryPath(li.category_id)}</span>
                        </div>
                        <div className="px-2 py-1.5">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={li.amount}
                            onChange={e => updateLineItem(li.category_id, 'amount', e.target.value)}
                            className={cn(
                              'w-full px-2 py-1 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500',
                              addErrors[`amount_${i}`] ? 'border-red-400' : 'border-gray-300'
                            )}
                          />
                          {addErrors[`amount_${i}`] && (
                            <p className="text-xs text-red-500 mt-0.5">{addErrors[`amount_${i}`]}</p>
                          )}
                        </div>
                        <div className="px-2 py-1.5">
                          <input
                            type="text"
                            placeholder="Ref..."
                            value={li.reference_number}
                            onChange={e => updateLineItem(li.category_id, 'reference_number', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="px-2 py-1.5">
                          <input
                            type="text"
                            placeholder="Remark..."
                            value={li.description}
                            onChange={e => updateLineItem(li.category_id, 'description', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-center justify-center px-1">
                          <button
                            type="button"
                            onClick={() => removeLineItem(li.category_id)}
                            className="p-0.5 hover:bg-red-50 rounded transition-colors"
                          >
                            <X className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  <div className="grid grid-cols-[1fr_90px_110px_110px_28px] gap-0 bg-gray-50 border-t border-gray-200">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-700">
                      Total ({addForm.lineItems.length} {addForm.lineItems.length === 1 ? 'item' : 'items'})
                    </div>
                    <div className="px-2 py-2 text-sm font-bold text-gray-900">
                      {totalAmount > 0 ? totalAmount.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                    </div>
                    <div className="col-span-3" />
                  </div>
                </div>
              </div>
            )}

            {addForm.lineItems.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-400">Select categories from the left to add line items</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving || (!isEdit && addForm.lineItems.length === 0)}>
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : isEdit ? 'Save Changes' : `Add ${addForm.lineItems.length > 1 ? `${addForm.lineItems.length} Expenses` : 'Expense'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ReceiptUploadSectionProps {
  receiptPreviewName: string | null;
  isPdf: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onFile: (file: File) => void;
  onClear: () => void;
  error?: string;
  compact?: boolean;
}

function ReceiptUploadSection({
  receiptPreviewName,
  isPdf,
  fileInputRef,
  dragOver,
  setDragOver,
  onFile,
  onClear,
  error,
  compact,
}: ReceiptUploadSectionProps) {
  return (
    <div>
      {receiptPreviewName ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex-shrink-0 p-2 bg-white border border-gray-200 rounded-lg">
            {isPdf ? (
              <FileText className="w-5 h-5 text-red-500" />
            ) : (
              <Image className="w-5 h-5 text-blue-500" />
            )}
          </div>
          <span className="flex-1 text-sm text-gray-700 truncate">{receiptPreviewName}</span>
          <button
            type="button"
            onClick={onClear}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) onFile(file);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'w-full border-2 border-dashed rounded-lg flex flex-col items-center gap-1.5 cursor-pointer transition-colors',
            compact ? 'p-4' : 'p-6',
            dragOver
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
          )}
        >
          <div className={cn('bg-white border border-gray-200 rounded-full shadow-sm', compact ? 'p-2' : 'p-3')}>
            <Upload className={cn('text-gray-400', compact ? 'w-4 h-4' : 'w-5 h-5')} />
          </div>
          <p className={cn('font-medium text-gray-600', compact ? 'text-xs' : 'text-sm')}>Click to upload</p>
          <p className="text-xs text-gray-400">PNG, JPG or PDF (max 10MB)</p>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
