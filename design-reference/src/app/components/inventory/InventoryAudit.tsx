import { useState } from "react";
import { ClipboardCheck, Save, Plus, Calendar } from "lucide-react";
import { 
  lots, 
  inventoryAudits, 
  warehouseLocations, 
  addInventoryAudit,
  currentUser 
} from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Checkbox } from "../ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Badge } from "../ui/badge";
import { toast } from "sonner";

interface AuditItem {
  sku: string;
  sku_name: string;
  location: string;
  expected_quantity: number;
  counted_quantity: number | null;
  difference: number;
}

export function InventoryAudit() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [auditInProgress, setAuditInProgress] = useState(false);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [notes, setNotes] = useState("");
  const [auditDate, setAuditDate] = useState(new Date().toISOString().split('T')[0]);

  // Get unique locations from lots
  const availableLocations = [...new Set(lots.map(lot => lot.location))];

  // Calculate audits completed today
  const today = new Date().toISOString().split('T')[0];
  const auditsToday = inventoryAudits.filter(audit => audit.audit_date === today);
  const locationsAuditedToday = auditsToday.reduce((acc, audit) => acc + audit.locations.length, 0);

  const handleLocationToggle = (location: string) => {
    setSelectedLocations(prev =>
      prev.includes(location)
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  const handleStartAudit = () => {
    if (selectedLocations.length === 0) {
      toast.error("Please select at least one location to audit");
      return;
    }

    // Get all items in selected locations
    const itemsToAudit: AuditItem[] = [];
    
    selectedLocations.forEach(location => {
      const lotsInLocation = lots.filter(lot => lot.location === location);
      lotsInLocation.forEach(lot => {
        itemsToAudit.push({
          sku: lot.sku,
          sku_name: lot.sku_name,
          location: lot.location,
          expected_quantity: lot.remaining_quantity,
          counted_quantity: null,
          difference: 0,
        });
      });
    });

    setAuditItems(itemsToAudit);
    setAuditInProgress(true);
    setDialogOpen(false);
    toast.success(`Started audit for ${selectedLocations.length} location(s)`);
  };

  const updateCountedQuantity = (index: number, counted: number) => {
    setAuditItems(prevItems => {
      const newItems = [...prevItems];
      newItems[index] = {
        ...newItems[index],
        counted_quantity: counted,
        difference: counted - newItems[index].expected_quantity,
      };
      return newItems;
    });
  };

  const handleSaveAudit = () => {
    const uncountedItems = auditItems.filter(item => item.counted_quantity === null);
    if (uncountedItems.length > 0) {
      toast.error(`Please count all items. ${uncountedItems.length} items remaining.`);
      return;
    }

    const newAudit = {
      audit_id: `AUD-${String(inventoryAudits.length + 1).padStart(3, '0')}`,
      audit_date: auditDate,
      locations: selectedLocations,
      items: auditItems,
      status: 'completed' as const,
      audited_by: currentUser.name,
    };

    addInventoryAudit(newAudit);

    const hasVariances = auditItems.some(item => item.difference !== 0);
    if (hasVariances) {
      const totalVariance = auditItems.reduce((sum, item) => sum + Math.abs(item.difference), 0);
      toast.success(`Audit completed with ${totalVariance} total variance units. Adjustment movements will be created.`);
    } else {
      toast.success("Audit completed. All counts match expected quantities.");
    }

    // Reset state
    setAuditInProgress(false);
    setAuditItems([]);
    setSelectedLocations([]);
    setNotes("");
  };

  const completedCount = auditItems.filter(item => item.counted_quantity !== null).length;
  const totalItems = auditItems.length;
  const progressPercentage = totalItems > 0 ? (completedCount / totalItems * 100).toFixed(0) : "0";

  const itemsWithVariance = auditItems.filter(item => item.difference !== 0 && item.counted_quantity !== null);
  const totalVarianceValue = itemsWithVariance.reduce((sum, item) => sum + Math.abs(item.difference), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Physical Inventory Audit</h1>
          <p className="text-gray-600 mt-1">Count and reconcile physical stock with system records</p>
        </div>
        {!auditInProgress && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Start New Audit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Locations to Audit</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Select one or more locations:</Label>
                  <div className="mt-3 space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                    {availableLocations.map((location) => {
                      const itemsInLocation = lots.filter(l => l.location === location).length;
                      return (
                        <div key={location} className="flex items-center space-x-2">
                          <Checkbox
                            id={location}
                            checked={selectedLocations.includes(location)}
                            onCheckedChange={() => handleLocationToggle(location)}
                          />
                          <label
                            htmlFor={location}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                          >
                            {location} ({itemsInLocation} {itemsInLocation === 1 ? 'item' : 'items'})
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label htmlFor="audit_date">Audit Date</Label>
                  <Input
                    id="audit_date"
                    type="date"
                    value={auditDate}
                    onChange={(e) => setAuditDate(e.target.value)}
                  />
                </div>
                <div className="pt-4 flex gap-2 justify-end border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setSelectedLocations([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleStartAudit}>
                    Start Audit ({selectedLocations.length} locations)
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Audits Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{auditsToday.length}</div>
            <p className="text-xs text-gray-600 mt-1">{locationsAuditedToday} locations audited</p>
          </CardContent>
        </Card>

        {auditInProgress && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{progressPercentage}%</div>
                <p className="text-xs text-gray-600 mt-1">{completedCount} of {totalItems} counted</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Variances Found</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{itemsWithVariance.length}</div>
                <p className="text-xs text-gray-600 mt-1">{totalVarianceValue} total units difference</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-600">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <Button 
                  className="w-full gap-2" 
                  onClick={handleSaveAudit}
                  disabled={completedCount !== totalItems}
                >
                  <Save className="w-4 h-4" />
                  Complete Audit
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {auditInProgress && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  Count Sheet
                </div>
                <div className="flex gap-2">
                  {selectedLocations.map((loc) => (
                    <Badge key={loc} variant="outline">{loc}</Badge>
                  ))}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Expected Qty</TableHead>
                    <TableHead>Counted Qty</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditItems.map((item, index) => (
                    <TableRow 
                      key={`${item.sku}-${item.location}`}
                      className={item.difference !== 0 && item.counted_quantity !== null ? 'bg-yellow-50' : ''}
                    >
                      <TableCell className="font-medium font-mono text-sm">{item.sku}</TableCell>
                      <TableCell>
                        <p className="text-sm">{item.sku_name}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.location}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.expected_quantity}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          className="w-24"
                          placeholder="Count"
                          value={item.counted_quantity ?? ''}
                          onChange={(e) => updateCountedQuantity(index, parseInt(e.target.value) || 0)}
                        />
                      </TableCell>
                      <TableCell>
                        {item.counted_quantity !== null && (
                          <span className={
                            item.difference === 0 ? 'text-green-600 font-medium' :
                            item.difference > 0 ? 'text-blue-600 font-medium' :
                            'text-red-600 font-medium'
                          }>
                            {item.difference > 0 ? '+' : ''}{item.difference}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.counted_quantity === null ? (
                          <Badge variant="outline" className="bg-gray-50">
                            Pending
                          </Badge>
                        ) : item.difference === 0 ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            Match
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                            Variance
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any notes about the audit process, issues found, or reasons for variances..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>
        </>
      )}

      {!auditInProgress && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Audits</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Audit ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Items Audited</TableHead>
                  <TableHead>Variances</TableHead>
                  <TableHead>Audited By</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryAudits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No audits completed yet. Start your first audit above.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryAudits.slice().reverse().map((audit) => {
                    const varianceCount = audit.items.filter(item => item.difference !== 0).length;
                    return (
                      <TableRow key={audit.audit_id}>
                        <TableCell className="font-mono text-sm font-medium">{audit.audit_id}</TableCell>
                        <TableCell>{new Date(audit.audit_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {audit.locations.map((loc, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {loc}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>{audit.items.length} items</TableCell>
                        <TableCell>
                          {varianceCount > 0 ? (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                              {varianceCount} variances
                            </Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              No variances
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{audit.audited_by}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                            {audit.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
