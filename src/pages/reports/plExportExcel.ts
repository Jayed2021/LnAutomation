import * as ExcelJS from 'exceljs';
import type { OrderProfit } from './ProfitLoss';
import type { Expense } from '../finance/expenseService';
import type { RevenueCategory } from '../finance/collection/manualRevenueService';
import { REVENUE_CATEGORY_LABELS } from '../finance/collection/manualRevenueService';

const CURRENCY = '৳';

function fmtNum(n: number) {
  return parseFloat(n.toFixed(2));
}

function applyHeaderStyle(row: ExcelJS.Row, bgColor = 'FF1E3A5F') {
  row.eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      bottom: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      left: { style: 'thin', color: { argb: 'FFB0BEC5' } },
      right: { style: 'thin', color: { argb: 'FFB0BEC5' } },
    };
  });
  row.height = 24;
}

function applySectionLabelStyle(cell: ExcelJS.Cell, bgColor = 'FFE3EBF6') {
  cell.font = { bold: true, size: 11, color: { argb: 'FF1E3A5F' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
  cell.border = {
    top: { style: 'thin', color: { argb: 'FFCFD8DC' } },
    bottom: { style: 'thin', color: { argb: 'FFCFD8DC' } },
    left: { style: 'thin', color: { argb: 'FFCFD8DC' } },
    right: { style: 'thin', color: { argb: 'FFCFD8DC' } },
  };
}

function applyTotalRowStyle(row: ExcelJS.Row, bgColor = 'FFF0F4FA') {
  row.eachCell(cell => {
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF90A4AE' } },
      bottom: { style: 'medium', color: { argb: 'FF90A4AE' } },
      left: { style: 'thin', color: { argb: 'FFCFD8DC' } },
      right: { style: 'thin', color: { argb: 'FFCFD8DC' } },
    };
  });
}

function applyDataRowBorder(row: ExcelJS.Row) {
  row.eachCell(cell => {
    cell.border = {
      top: { style: 'hair', color: { argb: 'FFE8EDF2' } },
      bottom: { style: 'hair', color: { argb: 'FFE8EDF2' } },
      left: { style: 'thin', color: { argb: 'FFCFD8DC' } },
      right: { style: 'thin', color: { argb: 'FFCFD8DC' } },
    };
  });
}

interface ExportOptions {
  from: string;
  to: string;
  rows: OrderProfit[];
  otherRevenue: { total: number; byCategory: Record<string, number> };
  plExpenses: Expense[];
  orderTotals: {
    revenue: number;
    delivery_charge: number;
    product_cogs: number;
    packaging_cost: number;
    total_cogs: number;
    gross_profit: number;
  };
  storeName?: string;
  manualPackagingCost?: {
    total_cost: number;
    notes: string | null;
  };
}

export async function exportProfitLossExcel(opts: ExportOptions): Promise<void> {
  const { from, to, rows, otherRevenue, plExpenses, orderTotals, storeName, manualPackagingCost } = opts;

  const totalRevenue = orderTotals.revenue + otherRevenue.total;
  const grossProfit = orderTotals.gross_profit + otherRevenue.total;
  const totalExpenses = plExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  const manualGrossProfit = manualPackagingCost
    ? grossProfit - manualPackagingCost.total_cost + orderTotals.packaging_cost
    : null;
  const manualNetProfit = manualGrossProfit !== null ? manualGrossProfit - totalExpenses : null;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Lunettes ERP';
  workbook.created = new Date();

  buildSummarySheet(workbook, { from, to, storeName, orderTotals, otherRevenue, totalRevenue, grossProfit, totalExpenses, netProfit, grossMargin, netMargin, plExpenses, manualPackagingCost, manualGrossProfit, manualNetProfit });
  buildOrderDetailSheet(workbook, rows, from, to);
  buildExpensesSheet(workbook, plExpenses, from, to);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `PL_Report_${from}_${to}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

function buildSummarySheet(
  wb: ExcelJS.Workbook,
  opts: {
    from: string; to: string; storeName?: string;
    orderTotals: { revenue: number; delivery_charge: number; product_cogs: number; packaging_cost: number; total_cogs: number; gross_profit: number };
    otherRevenue: { total: number; byCategory: Record<string, number> };
    totalRevenue: number; grossProfit: number; totalExpenses: number; netProfit: number;
    grossMargin: number; netMargin: number;
    plExpenses: Expense[];
    manualPackagingCost?: { total_cost: number; notes: string | null } | null;
    manualGrossProfit: number | null;
    manualNetProfit: number | null;
  }
) {
  const ws = wb.addWorksheet('P&L Summary', { properties: { tabColor: { argb: 'FF1E3A5F' } } });

  ws.columns = [
    { key: 'label', width: 40 },
    { key: 'amount', width: 22 },
    { key: 'pct', width: 18 },
  ];

  const addTitle = (text: string) => {
    const row = ws.addRow([text]);
    row.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } };
    row.getCell(1).alignment = { horizontal: 'left' };
    row.height = 28;
    ws.mergeCells(`A${row.number}:C${row.number}`);
  };

  const addMeta = (label: string, value: string) => {
    const row = ws.addRow([label, value]);
    row.getCell(1).font = { size: 10, color: { argb: 'FF607D8B' } };
    row.getCell(2).font = { size: 10, color: { argb: 'FF37474F' } };
    row.height = 16;
  };

  const addBlank = () => { ws.addRow([]); };

  const addSectionHeader = (label: string) => {
    const row = ws.addRow([label]);
    ws.mergeCells(`A${row.number}:C${row.number}`);
    applySectionLabelStyle(row.getCell(1));
    row.height = 20;
  };

  const addLine = (label: string, amount: number, isSubItem = false, pct?: number) => {
    const pctStr = pct !== undefined ? `${pct.toFixed(1)}%` : '';
    const row = ws.addRow([label, fmtNum(amount), pctStr]);
    if (isSubItem) {
      row.getCell(1).font = { size: 10, color: { argb: 'FF546E7A' } };
      row.getCell(1).alignment = { indent: 2 };
    } else {
      row.getCell(1).font = { size: 11 };
    }
    row.getCell(2).numFmt = `"${CURRENCY}"#,##0.00`;
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).alignment = { horizontal: 'right' };
    row.getCell(3).font = { color: { argb: 'FF607D8B' }, size: 10 };
    applyDataRowBorder(row);
    row.height = 18;
  };

  const addTotalLine = (label: string, amount: number, pct?: number, colorPositive = true) => {
    const pctStr = pct !== undefined ? `${pct.toFixed(1)}%` : '';
    const row = ws.addRow([label, fmtNum(amount), pctStr]);
    const isPositive = amount >= 0;
    const textColor = colorPositive ? (isPositive ? 'FF1B5E20' : 'FFC62828') : 'FF1E3A5F';
    row.getCell(1).font = { bold: true, size: 11, color: { argb: textColor } };
    row.getCell(2).font = { bold: true, size: 11, color: { argb: textColor } };
    row.getCell(2).numFmt = `"${CURRENCY}"#,##0.00`;
    row.getCell(2).alignment = { horizontal: 'right' };
    row.getCell(3).font = { bold: true, size: 11, color: { argb: textColor } };
    row.getCell(3).alignment = { horizontal: 'right' };
    applyTotalRowStyle(row);
    row.height = 22;
  };

  const { from, to, storeName, orderTotals, otherRevenue, totalRevenue, grossProfit, totalExpenses, netProfit, grossMargin, netMargin, plExpenses, manualPackagingCost, manualGrossProfit, manualNetProfit } = opts;

  addTitle(storeName ? `${storeName} — Profit & Loss Statement` : 'Profit & Loss Statement');
  addMeta('Report Period:', `${from}  to  ${to}`);
  addMeta('Generated:', new Date().toLocaleString('en-BD'));
  addBlank();

  addSectionHeader('REVENUE');
  addLine(`Order Revenue (${opts.orderTotals.revenue > 0 ? 'net collected' : ''})`, orderTotals.revenue, true,
    totalRevenue > 0 ? (orderTotals.revenue / totalRevenue) * 100 : undefined);
  for (const k of Object.keys(REVENUE_CATEGORY_LABELS) as RevenueCategory[]) {
    if (otherRevenue.byCategory[k]) {
      addLine(REVENUE_CATEGORY_LABELS[k], otherRevenue.byCategory[k], true,
        totalRevenue > 0 ? (otherRevenue.byCategory[k] / totalRevenue) * 100 : undefined);
    }
  }
  addTotalLine('Total Revenue', totalRevenue, 100, false);
  addBlank();

  addSectionHeader('COST OF GOODS SOLD (COGS)');
  addLine('Product COGS', orderTotals.product_cogs, true,
    totalRevenue > 0 ? (orderTotals.product_cogs / totalRevenue) * 100 : undefined);
  addLine('Packaging Cost (System Estimate)', orderTotals.packaging_cost, true,
    totalRevenue > 0 ? (orderTotals.packaging_cost / totalRevenue) * 100 : undefined);
  if (manualPackagingCost) {
    addLine('Packaging Cost (Manual Calculation)', manualPackagingCost.total_cost, true,
      totalRevenue > 0 ? (manualPackagingCost.total_cost / totalRevenue) * 100 : undefined);
    if (manualPackagingCost.notes) {
      addLine(`  Note: ${manualPackagingCost.notes}`, 0, true);
    }
  }
  addLine('Delivery Charges', orderTotals.delivery_charge, true,
    totalRevenue > 0 ? (orderTotals.delivery_charge / totalRevenue) * 100 : undefined);
  addTotalLine('Total COGS (System Packaging)', orderTotals.total_cogs,
    totalRevenue > 0 ? (orderTotals.total_cogs / totalRevenue) * 100 : undefined, false);
  addBlank();

  addTotalLine('GROSS PROFIT (System Packaging)', grossProfit, grossMargin);
  if (manualGrossProfit !== null) {
    const manualGrossMargin = totalRevenue > 0 ? (manualGrossProfit / totalRevenue) * 100 : 0;
    addTotalLine('GROSS PROFIT (Manual Packaging)', manualGrossProfit, manualGrossMargin);
  }
  addBlank();

  addSectionHeader('OPERATING EXPENSES (Affects P&L)');
  const byCategory: Record<string, { name: string; total: number }> = {};
  for (const e of plExpenses) {
    const catName = e.category?.name ?? 'Uncategorized';
    if (!byCategory[catName]) byCategory[catName] = { name: catName, total: 0 };
    byCategory[catName].total += e.amount;
  }
  const catEntries = Object.values(byCategory).sort((a, b) => b.total - a.total);
  if (catEntries.length === 0) {
    const row = ws.addRow(['  No expenses recorded for this period', '', '']);
    row.getCell(1).font = { italic: true, color: { argb: 'FF9E9E9E' }, size: 10 };
    row.getCell(1).alignment = { indent: 2 };
    applyDataRowBorder(row);
    row.height = 18;
  } else {
    for (const cat of catEntries) {
      addLine(cat.name, cat.total, true,
        totalRevenue > 0 ? (cat.total / totalRevenue) * 100 : undefined);
    }
  }
  addTotalLine('Total Operating Expenses', totalExpenses,
    totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : undefined, false);
  addBlank();

  addTotalLine('NET PROFIT (System Packaging)', netProfit, netMargin);
  if (manualNetProfit !== null) {
    const manualNetMargin = totalRevenue > 0 ? (manualNetProfit / totalRevenue) * 100 : 0;
    addTotalLine('NET PROFIT (Manual Packaging)', manualNetProfit, manualNetMargin);
  }

  ws.getRow(1).font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } };
}

function buildOrderDetailSheet(wb: ExcelJS.Workbook, rows: OrderProfit[], from: string, to: string) {
  const ws = wb.addWorksheet('Order Detail', { properties: { tabColor: { argb: 'FF0D47A1' } } });

  ws.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Order #', key: 'order_number', width: 16 },
    { header: 'Customer', key: 'customer', width: 24 },
    { header: 'Status', key: 'status', width: 16 },
    { header: 'Revenue', key: 'revenue', width: 16 },
    { header: 'Delivery Charge', key: 'delivery', width: 18 },
    { header: 'Product COGS', key: 'cogs', width: 18 },
    { header: 'Packaging', key: 'packaging', width: 14 },
    { header: 'Gross Profit', key: 'gross_profit', width: 18 },
    { header: 'Margin %', key: 'margin', width: 12 },
  ];

  const headerRow = ws.getRow(1);
  applyHeaderStyle(headerRow);
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.autoFilter = { from: 'A1', to: 'J1' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const numFmt = `"${CURRENCY}"#,##0.00`;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const row = ws.addRow({
      date: r.order_date?.slice(0, 10) ?? '',
      order_number: r.order_number,
      customer: r.customer_name ?? '',
      status: r.cs_status,
      revenue: fmtNum(r.revenue),
      delivery: fmtNum(r.delivery_charge),
      cogs: fmtNum(r.product_cogs),
      packaging: fmtNum(r.packaging_cost),
      gross_profit: fmtNum(r.gross_profit),
      margin: parseFloat(r.gross_margin_pct.toFixed(2)),
    });

    const isPositive = r.gross_profit >= 0;
    const rowBg = isPositive ? 'FFF1F8F0' : 'FFFFF3F3';

    row.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? rowBg : 'FFFFFFFF' } };
      cell.border = {
        top: { style: 'hair', color: { argb: 'FFE0E0E0' } },
        bottom: { style: 'hair', color: { argb: 'FFE0E0E0' } },
        left: { style: 'thin', color: { argb: 'FFCFD8DC' } },
        right: { style: 'thin', color: { argb: 'FFCFD8DC' } },
      };
    });

    row.getCell('revenue').numFmt = numFmt;
    row.getCell('delivery').numFmt = numFmt;
    row.getCell('cogs').numFmt = numFmt;
    row.getCell('packaging').numFmt = numFmt;
    row.getCell('gross_profit').numFmt = numFmt;
    row.getCell('margin').numFmt = '0.0"%"';

    row.getCell('gross_profit').font = {
      bold: true,
      color: { argb: isPositive ? 'FF1B5E20' : 'FFC62828' },
    };
    row.getCell('margin').font = {
      color: { argb: isPositive ? 'FF2E7D32' : 'FFC62828' },
    };

    row.height = 18;
  }

  if (rows.length > 0) {
    const totals = rows.reduce((acc, r) => {
      acc.revenue += r.revenue;
      acc.delivery += r.delivery_charge;
      acc.cogs += r.product_cogs;
      acc.packaging += r.packaging_cost;
      acc.gross_profit += r.gross_profit;
      return acc;
    }, { revenue: 0, delivery: 0, cogs: 0, packaging: 0, gross_profit: 0 });

    const avgMargin = totals.revenue > 0 ? (totals.gross_profit / totals.revenue) * 100 : 0;

    const totRow = ws.addRow({
      date: '',
      order_number: `Total (${rows.length} orders)`,
      customer: '',
      status: '',
      revenue: fmtNum(totals.revenue),
      delivery: fmtNum(totals.delivery),
      cogs: fmtNum(totals.cogs),
      packaging: fmtNum(totals.packaging),
      gross_profit: fmtNum(totals.gross_profit),
      margin: parseFloat(avgMargin.toFixed(2)),
    });

    applyTotalRowStyle(totRow);
    totRow.getCell('revenue').numFmt = numFmt;
    totRow.getCell('delivery').numFmt = numFmt;
    totRow.getCell('cogs').numFmt = numFmt;
    totRow.getCell('packaging').numFmt = numFmt;
    totRow.getCell('gross_profit').numFmt = numFmt;
    totRow.getCell('margin').numFmt = '0.0"%"';
    totRow.height = 22;
  }

  const metaRow = ws.addRow([`Period: ${from} to ${to}`]);
  metaRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF9E9E9E' } };
  ws.mergeCells(`A${metaRow.number}:J${metaRow.number}`);
}

function buildExpensesSheet(wb: ExcelJS.Workbook, expenses: Expense[], from: string, to: string) {
  const ws = wb.addWorksheet('Expenses (P&L)', { properties: { tabColor: { argb: 'FFB71C1C' } } });

  ws.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Category', key: 'category', width: 28 },
    { header: 'Description', key: 'description', width: 36 },
    { header: 'Reference', key: 'reference', width: 18 },
    { header: 'Type', key: 'type', width: 14 },
    { header: 'Amount', key: 'amount', width: 16 },
  ];

  const headerRow = ws.getRow(1);
  applyHeaderStyle(headerRow, 'FF8B2020');
  ws.autoFilter = { from: 'A1', to: 'F1' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  const numFmt = `"${CURRENCY}"#,##0.00`;

  const byCategory: Record<string, { name: string; entries: Expense[] }> = {};
  for (const e of expenses) {
    const catName = e.category?.name ?? 'Uncategorized';
    if (!byCategory[catName]) byCategory[catName] = { name: catName, entries: [] };
    byCategory[catName].entries.push(e);
  }

  const catEntries = Object.values(byCategory).sort((a, b) => {
    const totA = a.entries.reduce((s, e) => s + e.amount, 0);
    const totB = b.entries.reduce((s, e) => s + e.amount, 0);
    return totB - totA;
  });

  let rowIdx = 2;
  for (const cat of catEntries) {
    const catTotal = cat.entries.reduce((s, e) => s + e.amount, 0);

    const catHeaderRow = ws.getRow(rowIdx++);
    catHeaderRow.values = [cat.name, '', '', '', '', catTotal];
    catHeaderRow.getCell(1).font = { bold: true, size: 11, color: { argb: 'FF8B2020' } };
    catHeaderRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8F8' } };
    catHeaderRow.getCell(6).numFmt = numFmt;
    catHeaderRow.getCell(6).font = { bold: true, color: { argb: 'FF8B2020' } };
    catHeaderRow.getCell(6).alignment = { horizontal: 'right' };
    ws.mergeCells(`A${catHeaderRow.number}:E${catHeaderRow.number}`);
    catHeaderRow.height = 20;
    applyDataRowBorder(catHeaderRow);

    for (let i = 0; i < cat.entries.length; i++) {
      const e = cat.entries[i];
      const row = ws.getRow(rowIdx++);
      row.values = [
        e.expense_date,
        e.category?.name ?? '',
        e.description,
        e.reference_number ?? '',
        e.expense_type.charAt(0).toUpperCase() + e.expense_type.slice(1),
        fmtNum(e.amount),
      ];

      row.getCell(1).font = { size: 10, color: { argb: 'FF546E7A' } };
      row.getCell(1).alignment = { indent: 1 };
      row.getCell(2).font = { size: 10, color: { argb: 'FF546E7A' } };
      row.getCell(6).numFmt = numFmt;
      row.getCell(6).alignment = { horizontal: 'right' };
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: i % 2 === 0 ? 'FFFFFFFF' : 'FFFFF5F5' } };
      applyDataRowBorder(row);
      row.height = 17;
    }
  }

  if (expenses.length === 0) {
    const row = ws.addRow(['No expenses found for this period.']);
    row.getCell(1).font = { italic: true, color: { argb: 'FF9E9E9E' } };
    ws.mergeCells(`A${row.number}:F${row.number}`);
  } else {
    ws.addRow([]);
    const totalAmt = expenses.reduce((s, e) => s + e.amount, 0);
    const totRow = ws.addRow(['', '', '', '', 'TOTAL', fmtNum(totalAmt)]);
    applyTotalRowStyle(totRow);
    totRow.getCell(6).numFmt = numFmt;
    totRow.getCell(5).font = { bold: true, size: 11, color: { argb: 'FF8B2020' } };
    totRow.getCell(5).alignment = { horizontal: 'right' };
    totRow.getCell(6).font = { bold: true, size: 11, color: { argb: 'FF8B2020' } };
    totRow.getCell(6).alignment = { horizontal: 'right' };
    totRow.height = 22;
  }

  const metaRow = ws.addRow([`Period: ${from} to ${to}  |  Only expenses marked "Affects P&L"`]);
  metaRow.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF9E9E9E' } };
  ws.mergeCells(`A${metaRow.number}:F${metaRow.number}`);
}
