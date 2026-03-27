import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';
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

interface FormState {
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

const today = () => new Date().toISOString().split('T')[0];

function buildDefaultForm(expense?: Expense | null): FormState {
  return {
    category_id: expense?.category_id ?? '',
    expense_date: expense?.expense_date ?? today(),
    amount: expense?.amount !== undefined ? String(expense.amount) : '',
    reference_number: expense?.reference_number ?? '',
    description: expense?.description ?? '',
    affects_profit: expense?.affects_profit ?? true,
    receipt_file: null,
    existing_receipt_url: expense?.receipt_url ?? null,
    clear_receipt: false,
  };
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
  const [form, setForm] = useState<FormState>(buildDefaultForm(expense));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (open) {
      setForm(buildDefaultForm(expense));
      setErrors({});
      submittingRef.current = false;
    }
  }, [open, expense]);

  const tree = buildCategoryTree(categories.filter(c => c.is_active));

  const getCategoryPath = useCallback((catId: string): string => {
    const catMap = new Map(categories.map(c => [c.id, c]));
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
  }, [categories]);

  const handleCategoryChange = (catId: string) => {
    const catMap = new Map(categories.map(c => [c.id, c]));
    const cat = catMap.get(catId);
    setForm(prev => ({
      ...prev,
      category_id: catId,
      affects_profit: cat?.affects_profit_default ?? true,
    }));
  };

  const handleFile = (file: File) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      setErrors(prev => ({ ...prev, receipt_file: 'Only PNG, JPG, PDF files are allowed.' }));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, receipt_file: 'File must be under 10MB.' }));
      return;
    }
    setErrors(prev => ({ ...prev, receipt_file: undefined }));
    setForm(prev => ({ ...prev, receipt_file: file, clear_receipt: false }));
  };

  const validate = (): boolean => {
    const errs: Partial<Record<keyof FormState, string>> = {};
    if (!form.category_id) errs.category_id = 'Category is required.';
    if (!form.expense_date) errs.expense_date = 'Date is required.';
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0)
      errs.amount = 'Enter a valid amount.';
    if (!form.description.trim()) errs.description = 'Description is required.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!validate()) return;
    submittingRef.current = true;
    setSaving(true);
    try {
      if (isEdit && expense) {
        const payload: UpdateExpensePayload = {
          expense_date: form.expense_date,
          category_id: form.category_id,
          description: form.description.trim(),
          amount: Number(form.amount),
          affects_profit: form.affects_profit,
          reference_number: form.reference_number.trim() || undefined,
          clear_receipt: form.clear_receipt,
          receipt_file: form.receipt_file ?? undefined,
        };
        await updateExpense(expense.id, payload);
      } else {
        const payload: CreateExpensePayload = {
          expense_date: form.expense_date,
          category_id: form.category_id,
          description: form.description.trim(),
          amount: Number(form.amount),
          affects_profit: form.affects_profit,
          reference_number: form.reference_number.trim() || undefined,
          receipt_file: form.receipt_file ?? undefined,
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

  const receiptPreviewName = form.receipt_file?.name
    ?? (form.existing_receipt_url && !form.clear_receipt ? 'Existing receipt' : null);
  const isPdf = form.receipt_file?.type === 'application/pdf'
    || (form.existing_receipt_url?.includes('.pdf') && !form.clear_receipt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category_id}
                onChange={e => handleCategoryChange(e.target.value)}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.category_id ? 'border-red-400' : 'border-gray-300'
                )}
              >
                <option value="">Select category</option>
                {renderSelectOptions(tree)}
              </select>
              {errors.category_id && (
                <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>
              )}
              {form.category_id && (
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {getCategoryPath(form.category_id)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.expense_date}
                onChange={e => setForm(prev => ({ ...prev, expense_date: e.target.value }))}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.expense_date ? 'border-red-400' : 'border-gray-300'
                )}
              />
              {errors.expense_date && (
                <p className="text-xs text-red-500 mt-1">{errors.expense_date}</p>
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
                value={form.amount}
                onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                className={cn(
                  'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500',
                  errors.amount ? 'border-red-400' : 'border-gray-300'
                )}
              />
              {errors.amount && (
                <p className="text-xs text-red-500 mt-1">{errors.amount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reference Number
              </label>
              <input
                type="text"
                placeholder="INV-001, Receipt #123..."
                value={form.reference_number}
                onChange={e => setForm(prev => ({ ...prev, reference_number: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Describe the expense..."
              value={form.description}
              onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none',
                errors.description ? 'border-red-400' : 'border-gray-300'
              )}
            />
            {errors.description && (
              <p className="text-xs text-red-500 mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Receipt (Image or PDF)
            </label>
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
                  onClick={() => {
                    setForm(prev => ({
                      ...prev,
                      receipt_file: null,
                      clear_receipt: !!prev.existing_receipt_url,
                    }));
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
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
                  if (file) handleFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'w-full border-2 border-dashed rounded-lg p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors',
                  dragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
                )}
              >
                <div className="p-3 bg-white border border-gray-200 rounded-full shadow-sm">
                  <Upload className="w-5 h-5 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-600">Click to upload receipt</p>
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
                if (file) handleFile(file);
              }}
            />
            {errors.receipt_file && (
              <p className="text-xs text-red-500 mt-1">{errors.receipt_file}</p>
            )}
          </div>

          <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <input
              id="affects-profit"
              type="checkbox"
              checked={form.affects_profit}
              onChange={e => setForm(prev => ({ ...prev, affects_profit: e.target.checked }))}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <div>
              <label htmlFor="affects-profit" className="text-sm font-medium text-gray-700 cursor-pointer">
                This expense affects Profit &amp; Loss calculation
              </label>
              <p className="text-xs text-gray-400 mt-0.5">Override default</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </span>
            ) : isEdit ? 'Save Changes' : 'Add Expense'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
