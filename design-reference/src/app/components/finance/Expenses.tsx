import { useState } from "react";
import { 
  Plus, Search, DollarSign, Calendar, TrendingUp, TrendingDown, 
  Upload, FileText, Image as ImageIcon, Settings, X 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import { Textarea } from "../ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { toast } from "sonner";

// Expense categories with P&L impact
const EXPENSE_CATEGORIES = [
  { id: 'rent', name: 'Rent', affects_pl: true, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'salaries', name: 'Salaries & Wages', affects_pl: true, color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'utilities', name: 'Utilities', affects_pl: true, color: 'bg-green-100 text-green-700 border-green-300' },
  { id: 'marketing', name: 'Marketing & Advertising', affects_pl: true, color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { id: 'shipping', name: 'Shipping & Logistics', affects_pl: true, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'office_supplies', name: 'Office Supplies', affects_pl: true, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { id: 'maintenance', name: 'Maintenance & Repairs', affects_pl: true, color: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'software', name: 'Software & Subscriptions', affects_pl: true, color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { id: 'taxes', name: 'Taxes & Licenses', affects_pl: true, color: 'bg-red-100 text-red-700 border-red-300' },
  { id: 'owner_draw', name: 'Owner Draw', affects_pl: false, color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { id: 'loan_repayment', name: 'Loan Repayment', affects_pl: false, color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { id: 'capital_expense', name: 'Capital Expense', affects_pl: false, color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { id: 'other', name: 'Other', affects_pl: true, color: 'bg-slate-100 text-slate-700 border-slate-300' },
];

interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  description: string;
  reference?: string;
  affects_profit: boolean;
  receipt_url?: string;
  receipt_type?: 'image' | 'pdf';
  created_by: string;
}

export function Expenses() {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState("current_month");
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [manageCategoriesOpen, setManageCategoriesOpen] = useState(false);
  
  // Mock expenses data
  const [expenses, setExpenses] = useState<Expense[]>([
    {
      id: '1',
      category: 'rent',
      amount: 50000,
      date: '2026-02-01',
      description: 'Monthly warehouse rent',
      reference: 'RENT-FEB-2026',
      affects_profit: true,
      created_by: 'Admin'
    },
    {
      id: '2',
      category: 'salaries',
      amount: 120000,
      date: '2026-02-01',
      description: 'Staff salaries for February',
      reference: 'SAL-FEB-2026',
      affects_profit: true,
      created_by: 'Admin'
    },
    {
      id: '3',
      category: 'marketing',
      amount: 15000,
      date: '2026-02-15',
      description: 'Facebook ads campaign',
      reference: 'FB-ADS-001',
      affects_profit: true,
      receipt_type: 'image',
      created_by: 'Marketing Manager'
    },
  ]);
  
  const [newExpense, setNewExpense] = useState({
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: '',
    affects_profit: true,
  });
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Calculate current month expenses
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthExpenses = expenses.filter(e => e.date.startsWith(currentMonth));
  const currentMonthTotal = currentMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
  const currentMonthPLImpact = currentMonthExpenses
    .filter(e => e.affects_profit)
    .reduce((sum, e) => sum + e.amount, 0);

  // Filter expenses based on date range
  const getDateRangeExpenses = () => {
    const today = new Date();
    let startDate = new Date();
    
    switch(dateRange) {
      case 'current_month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'last_month':
        startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endDate = new Date(today.getFullYear(), today.getMonth(), 0);
        return expenses.filter(e => {
          const expDate = new Date(e.date);
          return expDate >= startDate && expDate <= endDate;
        });
      case 'last_3_months':
        startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1);
        break;
      case 'current_year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        return expenses;
    }
    
    return expenses.filter(e => new Date(e.date) >= startDate);
  };

  const filteredExpenses = getDateRangeExpenses().filter((expense) => {
    const matchesSearch = 
      expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (expense.reference?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
    
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const handleCategoryChange = (categoryId: string) => {
    setNewExpense(prev => {
      const category = EXPENSE_CATEGORIES.find(c => c.id === categoryId);
      return {
        ...prev,
        category: categoryId,
        affects_profit: category?.affects_pl || true
      };
    });
  };

  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      setReceiptFile(file);
      toast.success(`Receipt uploaded: ${file.name}`);
    }
  };

  const handleAddExpense = () => {
    if (!newExpense.category || !newExpense.amount || !newExpense.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const expense: Expense = {
      id: Date.now().toString(),
      category: newExpense.category,
      amount: parseFloat(newExpense.amount),
      date: newExpense.date,
      description: newExpense.description,
      reference: newExpense.reference,
      affects_profit: newExpense.affects_profit,
      receipt_url: receiptFile ? URL.createObjectURL(receiptFile) : undefined,
      receipt_type: receiptFile ? (receiptFile.type.includes('pdf') ? 'pdf' : 'image') : undefined,
      created_by: 'Current User'
    };

    setExpenses([expense, ...expenses]);
    toast.success('Expense added successfully');
    
    // Reset form
    setNewExpense({
      category: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      reference: '',
      affects_profit: true,
    });
    setReceiptFile(null);
    setAddExpenseOpen(false);
  };

  const getCategoryInfo = (categoryId: string) => {
    return EXPENSE_CATEGORIES.find(c => c.id === categoryId) || EXPENSE_CATEGORIES.find(c => c.id === 'other')!;
  };

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const plImpactExpenses = filteredExpenses.filter(e => e.affects_profit).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold">Expenses</h1>
          <p className="text-gray-600 mt-1">Track and manage business expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setManageCategoriesOpen(true)}>
            <Settings className="w-4 h-4 mr-2" />
            Categories
          </Button>
          <Button onClick={() => setAddExpenseOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Current Month Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Current Month Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">৳{currentMonthTotal.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{currentMonthExpenses.length} expenses</p>
              </div>
              <DollarSign className="w-10 h-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">P&L Impact (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-red-600">৳{currentMonthPLImpact.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentMonthExpenses.filter(e => e.affects_profit).length} expenses
                </p>
              </div>
              <TrendingDown className="w-10 h-10 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">Non-P&L (This Month)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-600">
                  ৳{(currentMonthTotal - currentMonthPLImpact).toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {currentMonthExpenses.filter(e => !e.affects_profit).length} expenses
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current_month">Current Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                  <SelectItem value="current_year">Current Year</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EXPENSE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>All Expenses</CardTitle>
            <div className="text-sm text-gray-600">
              Total: <span className="font-bold">৳{totalExpenses.toLocaleString()}</span>
              {' '} | P&L Impact: <span className="font-bold text-red-600">৳{plImpactExpenses.toLocaleString()}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>P&L Impact</TableHead>
                <TableHead>Receipt</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    No expenses found
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((expense) => {
                  const categoryInfo = getCategoryInfo(expense.category);
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {new Date(expense.date).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={categoryInfo.color}>
                          {categoryInfo.name}
                        </Badge>
                      </TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {expense.reference || '-'}
                      </TableCell>
                      <TableCell className="font-bold">৳{expense.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={expense.affects_profit ? 'default' : 'secondary'}>
                          {expense.affects_profit ? 'Yes' : 'No'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {expense.receipt_url ? (
                          <Button variant="ghost" size="sm" onClick={() => window.open(expense.receipt_url, '_blank')}>
                            {expense.receipt_type === 'pdf' ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <ImageIcon className="w-4 h-4" />
                            )}
                          </Button>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Expense</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={newExpense.category} onValueChange={handleCategoryChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name} {!cat.affects_pl && '(Non-P&L)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount (BDT) *</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Reference Number</Label>
                <Input
                  placeholder="INV-001, Receipt #123..."
                  value={newExpense.reference}
                  onChange={(e) => setNewExpense({...newExpense, reference: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Describe the expense..."
                value={newExpense.description}
                onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Upload Receipt (Image or PDF)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleReceiptUpload}
                  className="hidden"
                  id="receipt-upload"
                />
                <label htmlFor="receipt-upload" className="cursor-pointer">
                  {receiptFile ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center gap-2">
                        {receiptFile.type.includes('pdf') ? (
                          <FileText className="w-8 h-8 text-blue-600" />
                        ) : (
                          <ImageIcon className="w-8 h-8 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm font-medium">{receiptFile.name}</p>
                      <p className="text-xs text-gray-500">{(receiptFile.size / 1024).toFixed(2)} KB</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          setReceiptFile(null);
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to upload receipt</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG or PDF (max 10MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="affects-profit"
                checked={newExpense.affects_profit}
                onChange={(e) => setNewExpense({...newExpense, affects_profit: e.target.checked})}
                className="w-4 h-4 rounded border-gray-300"
              />
              <Label htmlFor="affects-profit" className="text-sm cursor-pointer">
                This expense affects Profit & Loss calculation
                <span className="block text-xs text-gray-500 mt-1">
                  {newExpense.category && getCategoryInfo(newExpense.category).affects_pl 
                    ? '(Default for this category)' 
                    : '(Override default)'}
                </span>
              </Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setAddExpenseOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddExpense}>
                Add Expense
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Modal */}
      <Dialog open={manageCategoriesOpen} onOpenChange={setManageCategoriesOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Expense Categories</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category Name</TableHead>
                  <TableHead>Affects P&L</TableHead>
                  <TableHead>Color</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {EXPENSE_CATEGORIES.map(cat => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell>
                      <Badge variant={cat.affects_pl ? 'default' : 'secondary'}>
                        {cat.affects_pl ? 'Yes' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cat.color}>
                        Preview
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            <p className="text-sm text-gray-600 italic">
              Note: Category management and custom categories will be available in a future update
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
