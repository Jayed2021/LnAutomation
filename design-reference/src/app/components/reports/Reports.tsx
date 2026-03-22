import { useState } from 'react';
import { BarChart3, TrendingUp, RotateCcw, AlertTriangle, ShoppingCart, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { lots } from "../../data/mockData";
import { SalesReports } from "./SalesReports";
import { CSPerformanceReport } from "./CSPerformanceReport";

export function Reports() {
  const [section, setSection] = useState<'sales' | 'inventory' | 'cs'>('sales');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Reports & Analytics</h1>
        <p className="text-gray-600 mt-1">Data-driven insights for decision making</p>
      </div>

      {/* Top-level section switcher */}
      <div className="flex gap-0 border-b">
        <button
          onClick={() => setSection('sales')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            section === 'sales'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          Sales Reports
        </button>
        <button
          onClick={() => setSection('inventory')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            section === 'inventory'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Inventory & Operations
        </button>
        <button
          onClick={() => setSection('cs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            section === 'cs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Customer Service
        </button>
      </div>

      {section === 'sales' ? <SalesReports /> : section === 'cs' ? <CSPerformanceReport /> : <InventoryReports />}
    </div>
  );
}

function InventoryReports() {
  const getDaysInInventory = (receivedDate: string) => {
    const received = new Date(receivedDate);
    const today = new Date();
    return Math.ceil(Math.abs(today.getTime() - received.getTime()) / (1000 * 60 * 60 * 24));
  };

  const agingLots = lots
    .map(lot => ({ ...lot, age_days: getDaysInInventory(lot.received_date), value: lot.remaining_quantity * lot.landed_cost }))
    .filter(lot => lot.remaining_quantity > 0);

  const aging0_30  = agingLots.filter(l => l.age_days <= 30);
  const aging31_60 = agingLots.filter(l => l.age_days > 30 && l.age_days <= 60);
  const aging61_90 = agingLots.filter(l => l.age_days > 60 && l.age_days <= 90);
  const aging90Plus = agingLots.filter(l => l.age_days > 90);

  const returnRates = [
    { sku: 'SUN-AVT-M',   total_sold: 63, returned: 1, rate: 1.6 },
    { sku: 'BLG-BLK-L',  total_sold: 26, returned: 1, rate: 3.8 },
    { sku: 'RDG-GLD-1.5',total_sold: 55, returned: 1, rate: 1.8 },
    { sku: 'BLG-BLK-M',  total_sold: 63, returned: 0, rate: 0.0 },
    { sku: 'CLC-BLU',    total_sold: 44, returned: 0, rate: 0.0 },
  ];

  const supplierQuality = [
    { supplier: 'Vision Supply Co.',    total_pos: 3, total_units_ordered: 450, damaged: 5, shortage: 0, damage_rate: 1.1, avg_delay: 2 },
    { supplier: 'Eyewear Imports Ltd.', total_pos: 1, total_units_ordered: 80,  damaged: 0, shortage: 0, damage_rate: 0.0, avg_delay: 0 },
  ];

  const capitalByLot = [...agingLots].sort((a, b) => b.value - a.value).slice(0, 10);

  return (
    <Tabs defaultValue="aging">
      <TabsList className="grid grid-cols-4 w-full lg:w-auto">
        <TabsTrigger value="aging">Inventory Aging</TabsTrigger>
        <TabsTrigger value="returns">Return Rates</TabsTrigger>
        <TabsTrigger value="suppliers">Supplier Quality</TabsTrigger>
        <TabsTrigger value="capital">Capital Analysis</TabsTrigger>
      </TabsList>

      {/* Aging */}
      <TabsContent value="aging" className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: '0-30 Days',  list: aging0_30,  warn: false },
            { label: '31-60 Days', list: aging31_60, warn: false },
            { label: '61-90 Days', list: aging61_90, warn: false },
            { label: '90+ Days',   list: aging90Plus, warn: true  },
          ].map(({ label, list, warn }) => (
            <Card key={label}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
                  {warn && <AlertTriangle className="w-4 h-4 text-orange-500" />}{label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-semibold ${warn ? 'text-orange-600' : ''}`}>{list.length}</div>
                <p className="text-xs text-gray-600 mt-1">${list.reduce((s, l) => s + l.value, 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader><CardTitle>Inventory Aging Details</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot ID</TableHead><TableHead>SKU</TableHead><TableHead>Received</TableHead>
                  <TableHead>Age</TableHead><TableHead>Qty</TableHead><TableHead>Value</TableHead><TableHead>Band</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agingLots.map(lot => {
                  const band = lot.age_days <= 30 ? '0-30' : lot.age_days <= 60 ? '31-60' : lot.age_days <= 90 ? '61-90' : '90+';
                  const isOld = lot.age_days > 90;
                  return (
                    <TableRow key={lot.lot_id} className={isOld ? 'bg-orange-50' : ''}>
                      <TableCell className="font-medium">{lot.lot_id}</TableCell>
                      <TableCell>{lot.sku}</TableCell>
                      <TableCell>{lot.received_date}</TableCell>
                      <TableCell><Badge variant="outline" className={isOld ? 'bg-orange-100 text-orange-700' : ''}>{lot.age_days}d</Badge></TableCell>
                      <TableCell>{lot.remaining_quantity}</TableCell>
                      <TableCell className="font-medium">${lot.value.toFixed(2)}</TableCell>
                      <TableCell><Badge variant="outline">{band}</Badge></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Returns */}
      <TabsContent value="returns" className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><RotateCcw className="w-5 h-5" />Return Rate by SKU</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead><TableHead>Total Sold</TableHead><TableHead>Returned</TableHead>
                  <TableHead>Return Rate</TableHead><TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnRates.map(item => (
                  <TableRow key={item.sku}>
                    <TableCell className="font-medium">{item.sku}</TableCell>
                    <TableCell>{item.total_sold}</TableCell>
                    <TableCell>{item.returned}</TableCell>
                    <TableCell className="font-medium">{item.rate.toFixed(1)}%</TableCell>
                    <TableCell>
                      <Badge className={item.rate === 0 ? 'bg-green-100 text-green-700' : item.rate < 3 ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}>
                        {item.rate === 0 ? 'Excellent' : item.rate < 3 ? 'Good' : 'Monitor'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Suppliers */}
      <TabsContent value="suppliers" className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Supplier Performance</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead><TableHead>POs</TableHead><TableHead>Units</TableHead>
                  <TableHead>Damaged</TableHead><TableHead>Short</TableHead><TableHead>Damage %</TableHead>
                  <TableHead>Avg Delay</TableHead><TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplierQuality.map(s => (
                  <TableRow key={s.supplier}>
                    <TableCell className="font-medium">{s.supplier}</TableCell>
                    <TableCell>{s.total_pos}</TableCell>
                    <TableCell>{s.total_units_ordered}</TableCell>
                    <TableCell className="text-red-600">{s.damaged}</TableCell>
                    <TableCell className="text-orange-600">{s.shortage}</TableCell>
                    <TableCell>{s.damage_rate.toFixed(1)}%</TableCell>
                    <TableCell>{s.avg_delay}d</TableCell>
                    <TableCell>
                      <Badge className={s.damage_rate === 0 && s.avg_delay === 0 ? 'bg-green-100 text-green-700' : s.damage_rate < 2 ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}>
                        {s.damage_rate === 0 && s.avg_delay === 0 ? 'Excellent' : s.damage_rate < 2 ? 'Good' : 'Fair'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Capital */}
      <TabsContent value="capital" className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" />Capital Tied by Lot (Top 10)</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lot ID</TableHead><TableHead>SKU</TableHead><TableHead>Age</TableHead>
                  <TableHead>Qty</TableHead><TableHead>Cost/Unit</TableHead><TableHead>Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {capitalByLot.map(lot => (
                  <TableRow key={lot.lot_id}>
                    <TableCell className="font-medium">{lot.lot_id}</TableCell>
                    <TableCell>{lot.sku}</TableCell>
                    <TableCell><Badge variant="outline">{lot.age_days}d</Badge></TableCell>
                    <TableCell>{lot.remaining_quantity}</TableCell>
                    <TableCell>${lot.landed_cost.toFixed(2)}</TableCell>
                    <TableCell className="font-semibold text-blue-600">${lot.value.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900">Total Capital Tied in Inventory</p>
              <p className="text-2xl font-semibold text-blue-600 mt-1">${agingLots.reduce((s, l) => s + l.value, 0).toLocaleString()}</p>
              <p className="text-xs text-blue-700 mt-1">Across {agingLots.length} active lots</p>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}