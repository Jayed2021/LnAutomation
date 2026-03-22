import { useState } from "react";
import { Plus, Search, Warehouse as WarehouseIcon, MapPin, CreditCard as Edit2, Save, X, Download, Barcode as BarcodeIcon } from "lucide-react";
import { 
  warehouses, 
  warehouseLocations, 
  addWarehouse, 
  addWarehouseLocation,
  updateWarehouseLocation 
} from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { toast } from "sonner";

export function WarehouseLocations() {
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<string | null>(null);
  
  const [warehouseForm, setWarehouseForm] = useState({
    name: "",
    address: "",
  });

  const [locationForm, setLocationForm] = useState({
    warehouse_id: "",
    location_name: "",
    barcode: "",
    capacity: "100",
  });

  const [editForm, setEditForm] = useState({
    location_name: "",
    barcode: "",
    capacity: "100",
  });

  const filteredLocations = warehouseLocations.filter((location) => {
    const matchesSearch =
      location.location_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      location.barcode.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleWarehouseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newWarehouse = {
      warehouse_id: `WH-${String(warehouses.length + 1).padStart(3, '0')}`,
      name: warehouseForm.name,
      address: warehouseForm.address,
      created_date: new Date().toISOString().split('T')[0],
    };

    addWarehouse(newWarehouse);
    setWarehouseDialogOpen(false);
    setWarehouseForm({ name: "", address: "" });
    toast.success("Warehouse added successfully!");
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const warehouse = warehouses.find(w => w.warehouse_id === locationForm.warehouse_id);
    if (!warehouse) return;

    const newLocation = {
      location_id: `WL-${String(warehouseLocations.length + 1).padStart(3, '0')}`,
      warehouse_id: locationForm.warehouse_id,
      warehouse_name: warehouse.name,
      location_name: locationForm.location_name,
      barcode: locationForm.barcode,
      capacity: locationForm.capacity,
      created_date: new Date().toISOString().split('T')[0],
    };

    addWarehouseLocation(newLocation);
    setLocationDialogOpen(false);
    setLocationForm({ warehouse_id: "", location_name: "", barcode: "", capacity: "100" });
    toast.success("Location added successfully!");
  };

  const handleEditClick = (location: any) => {
    setEditingLocation(location.location_id);
    setEditForm({
      location_name: location.location_name,
      barcode: location.barcode,
      capacity: location.capacity,
    });
  };

  const handleEditSave = (locationId: string) => {
    updateWarehouseLocation(locationId, editForm);
    setEditingLocation(null);
    toast.success("Location updated successfully!");
  };

  const handleEditCancel = () => {
    setEditingLocation(null);
    setEditForm({ location_name: "", barcode: "", capacity: "100" });
  };

  const handleDownloadBarcode = (barcode: string) => {
    // In production, this would generate and download an actual barcode image
    navigator.clipboard.writeText(barcode);
    toast.success(`Barcode ${barcode} copied to clipboard (in production, this would download a barcode image)`);
  };

  const totalLocations = warehouseLocations.length;
  const totalWarehouses = warehouses.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Warehouses & Locations</h1>
        <p className="text-gray-600 mt-1">Manage warehouse facilities and storage locations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <WarehouseIcon className="w-4 h-4" />
              Total Warehouses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalWarehouses}</div>
            <p className="text-xs text-gray-600 mt-1">Active warehouse facilities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Total Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{totalLocations}</div>
            <p className="text-xs text-gray-600 mt-1">Storage locations across all warehouses</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="locations" className="w-full">
        <TabsList>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="warehouses">Warehouses</TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Storage Locations</CardTitle>
                <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Location
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Location</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleLocationSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="warehouse_select">Warehouse</Label>
                        <Select
                          value={locationForm.warehouse_id}
                          onValueChange={(value) => 
                            setLocationForm({ ...locationForm, warehouse_id: value })
                          }
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select warehouse" />
                          </SelectTrigger>
                          <SelectContent>
                            {warehouses.map((wh) => (
                              <SelectItem key={wh.warehouse_id} value={wh.warehouse_id}>
                                {wh.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="location_name">Location Name</Label>
                        <Input
                          id="location_name"
                          placeholder="e.g., A-12, Shelf-5, Zone-B"
                          value={locationForm.location_name}
                          onChange={(e) => 
                            setLocationForm({ ...locationForm, location_name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="barcode">Location Barcode</Label>
                        <Input
                          id="barcode"
                          placeholder="e.g., LOC-A12-001"
                          value={locationForm.barcode}
                          onChange={(e) => 
                            setLocationForm({ ...locationForm, barcode: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="capacity">Capacity</Label>
                        <Input
                          id="capacity"
                          placeholder="e.g., 100"
                          value={locationForm.capacity}
                          onChange={(e) => 
                            setLocationForm({ ...locationForm, capacity: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="pt-4 flex gap-2 justify-end">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setLocationDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Create Location</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by location, warehouse, or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Location Name</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Created Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLocations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No locations found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLocations.map((location) => {
                      const isEditing = editingLocation === location.location_id;
                      const usagePercent = (location.current_stock / location.capacity) * 100;
                      const remainingCapacity = location.capacity - location.current_stock;
                      
                      return (
                        <TableRow key={location.location_id}>
                          <TableCell>
                            <Badge variant="outline">{location.warehouse_name}</Badge>
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                value={editForm.location_name}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, location_name: e.target.value })
                                }
                                className="h-8"
                              />
                            ) : (
                              <span className="font-medium">{location.location_name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isEditing ? (
                                <Input
                                  value={editForm.barcode}
                                  onChange={(e) => 
                                    setEditForm({ ...editForm, barcode: e.target.value })
                                  }
                                  className="h-8 font-mono"
                                />
                              ) : (
                                <>
                                  <span className="font-mono text-sm">{location.barcode}</span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={() => handleDownloadBarcode(location.barcode)}
                                  >
                                    <Download className="w-3 h-3" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <Input
                                type="number"
                                value={editForm.capacity}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, capacity: e.target.value })
                                }
                                className="h-8 w-20"
                              />
                            ) : (
                              <div className="space-y-1 min-w-[150px]">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-medium">{location.current_stock} / {location.capacity}</span>
                                  <span className="text-gray-500">{usagePercent.toFixed(0)}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full transition-all ${
                                      usagePercent >= 90 ? 'bg-red-500' :
                                      usagePercent >= 75 ? 'bg-yellow-500' :
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                                  />
                                </div>
                                <p className="text-xs text-gray-500">
                                  {remainingCapacity} units available
                                </p>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(location.created_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {isEditing ? (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleEditSave(location.location_id)}
                                  className="h-8 gap-1"
                                >
                                  <Save className="w-3 h-3" />
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={handleEditCancel}
                                  className="h-8 gap-1"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditClick(location)}
                                className="h-8 gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                Edit
                              </Button>
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
        </TabsContent>

        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Warehouse Facilities</CardTitle>
                <Dialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Warehouse
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Warehouse</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleWarehouseSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="warehouse_name">Warehouse Name</Label>
                        <Input
                          id="warehouse_name"
                          placeholder="e.g., Main Warehouse"
                          value={warehouseForm.name}
                          onChange={(e) =>
                            setWarehouseForm({ ...warehouseForm, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          placeholder="Full address (optional)"
                          value={warehouseForm.address}
                          onChange={(e) =>
                            setWarehouseForm({ ...warehouseForm, address: e.target.value })
                          }
                        />
                      </div>
                      <div className="pt-4 flex gap-2 justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setWarehouseDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Create Warehouse</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Warehouse ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Locations</TableHead>
                    <TableHead>Created Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {warehouses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No warehouses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    warehouses.map((warehouse) => {
                      const locationCount = warehouseLocations.filter(
                        l => l.warehouse_id === warehouse.warehouse_id
                      ).length;
                      
                      return (
                        <TableRow key={warehouse.warehouse_id}>
                          <TableCell className="font-mono text-sm">
                            {warehouse.warehouse_id}
                          </TableCell>
                          <TableCell className="font-medium">{warehouse.name}</TableCell>
                          <TableCell className="text-gray-600">
                            {warehouse.address || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{locationCount} locations</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(warehouse.created_date).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}