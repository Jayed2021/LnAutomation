import { useState } from "react";
import { Plus, Search, CreditCard as Edit2, Save, X, Upload, Download, Trash2, FileText, Calendar } from "lucide-react";
import { 
  suppliers,
  addSupplier,
  updateSupplier,
  addCatalogToSupplier,
  removeCatalogFromSupplier
} from "../../data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";

export function Suppliers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<string | null>(null);
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

  const [supplierForm, setSupplierForm] = useState({
    initial: "",
    company_name: "",
    email: "",
    phone: "",
    alibaba_url: "",
    alipay_qr: "",
    alipay_chinese_name: "",
    wechat_qr: "",
    wechat_chinese_name: "",
    alipay_email: "",
    wechat_number: "",
  });

  const [catalogForm, setCatalogForm] = useState({
    file_name: "",
    notes: "",
  });

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesSearch =
      supplier.initial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingSupplier) {
      updateSupplier(editingSupplier, supplierForm);
      setEditingSupplier(null);
    } else {
      const newSupplier = {
        supplier_id: `SUP-${String(suppliers.length + 1).padStart(3, '0')}`,
        ...supplierForm,
        catalogs: [],
        created_date: new Date().toISOString().split('T')[0],
      };
      addSupplier(newSupplier);
    }
    
    setDialogOpen(false);
    resetSupplierForm();
  };

  const handleEditClick = (supplier: any) => {
    setEditingSupplier(supplier.supplier_id);
    setSupplierForm({
      initial: supplier.initial,
      company_name: supplier.company_name,
      email: supplier.email,
      phone: supplier.phone,
      alibaba_url: supplier.alibaba_url || "",
      alipay_qr: supplier.alipay_qr || "",
      alipay_chinese_name: supplier.alipay_chinese_name || "",
      wechat_qr: supplier.wechat_qr || "",
      wechat_chinese_name: supplier.wechat_chinese_name || "",
      alipay_email: supplier.alipay_email || "",
      wechat_number: supplier.wechat_number || "",
    });
    setDialogOpen(true);
  };

  const resetSupplierForm = () => {
    setSupplierForm({
      initial: "",
      company_name: "",
      email: "",
      phone: "",
      alibaba_url: "",
      alipay_qr: "",
      alipay_chinese_name: "",
      wechat_qr: "",
      wechat_chinese_name: "",
      alipay_email: "",
      wechat_number: "",
    });
  };

  const handleCatalogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newCatalog = {
      catalog_id: `CAT-${String(Math.random()).slice(2, 8)}`,
      file_name: catalogForm.file_name,
      file_url: "#", // In production, this would be the uploaded file URL
      upload_date: new Date().toISOString().split('T')[0],
      notes: catalogForm.notes,
    };

    addCatalogToSupplier(selectedSupplierId, newCatalog);
    setCatalogDialogOpen(false);
    setCatalogForm({ file_name: "", notes: "" });
  };

  const handleCatalogDelete = (supplierId: string, catalogId: string) => {
    if (confirm("Are you sure you want to delete this catalog?")) {
      removeCatalogFromSupplier(supplierId, catalogId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Suppliers</h1>
          <p className="text-gray-600 mt-1">Manage supplier information and catalogs</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingSupplier(null);
            resetSupplierForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSupplierSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="initial">Initial/Code</Label>
                  <Input
                    id="initial"
                    placeholder="e.g., VSC"
                    value={supplierForm.initial}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, initial: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    placeholder="Full company name"
                    value={supplierForm.company_name}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, company_name: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@supplier.com"
                    value={supplierForm.email}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, email: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+86 ..."
                    value={supplierForm.phone}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, phone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="alibaba_url">Alibaba Store URL</Label>
                <Input
                  id="alibaba_url"
                  placeholder="https://supplier.en.alibaba.com"
                  value={supplierForm.alibaba_url}
                  onChange={(e) =>
                    setSupplierForm({ ...supplierForm, alibaba_url: e.target.value })
                  }
                />
              </div>

              <div className="pt-2">
                <h3 className="font-medium mb-3">Payment Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="alipay_chinese_name">Alipay Chinese Name</Label>
                      <Input
                        id="alipay_chinese_name"
                        placeholder="支付宝名称"
                        value={supplierForm.alipay_chinese_name}
                        onChange={(e) =>
                          setSupplierForm({
                            ...supplierForm,
                            alipay_chinese_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="alipay_email">Alipay Email</Label>
                      <Input
                        id="alipay_email"
                        type="email"
                        placeholder="alipay@supplier.com"
                        value={supplierForm.alipay_email}
                        onChange={(e) =>
                          setSupplierForm({ ...supplierForm, alipay_email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="alipay_qr">Alipay QR Code URL</Label>
                    <Input
                      id="alipay_qr"
                      placeholder="URL to QR code image"
                      value={supplierForm.alipay_qr}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, alipay_qr: e.target.value })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="wechat_chinese_name">WeChat Chinese Name</Label>
                      <Input
                        id="wechat_chinese_name"
                        placeholder="微信名称"
                        value={supplierForm.wechat_chinese_name}
                        onChange={(e) =>
                          setSupplierForm({
                            ...supplierForm,
                            wechat_chinese_name: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="wechat_number">WeChat Number/ID</Label>
                      <Input
                        id="wechat_number"
                        placeholder="WeChat ID"
                        value={supplierForm.wechat_number}
                        onChange={(e) =>
                          setSupplierForm({ ...supplierForm, wechat_number: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="wechat_qr">WeChat QR Code URL</Label>
                    <Input
                      id="wechat_qr"
                      placeholder="URL to QR code image"
                      value={supplierForm.wechat_qr}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, wechat_qr: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-2 justify-end border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingSupplier(null);
                    resetSupplierForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSupplier ? "Update Supplier" : "Add Supplier"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Suppliers</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search by name, initial, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {filteredSuppliers.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No suppliers found
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <AccordionItem key={supplier.supplier_id} value={supplier.supplier_id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-4">
                        <Badge variant="outline" className="font-mono">
                          {supplier.initial}
                        </Badge>
                        <span className="font-medium">{supplier.company_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {supplier.catalogs.length} catalogs
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-6 pt-4">
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-3">Contact Information</h4>
                          <dl className="space-y-2 text-sm">
                            <div>
                              <dt className="text-gray-600">Email:</dt>
                              <dd className="font-medium">{supplier.email}</dd>
                            </div>
                            <div>
                              <dt className="text-gray-600">Phone:</dt>
                              <dd className="font-medium">{supplier.phone}</dd>
                            </div>
                            {supplier.alibaba_url && (
                              <div>
                                <dt className="text-gray-600">Alibaba Store:</dt>
                                <dd>
                                  <a 
                                    href={supplier.alibaba_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    View Store
                                  </a>
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>

                        <div>
                          <h4 className="font-medium mb-3">Payment Details</h4>
                          <dl className="space-y-2 text-sm">
                            {supplier.alipay_chinese_name && (
                              <div>
                                <dt className="text-gray-600">Alipay Name:</dt>
                                <dd className="font-medium">{supplier.alipay_chinese_name}</dd>
                              </div>
                            )}
                            {supplier.alipay_email && (
                              <div>
                                <dt className="text-gray-600">Alipay Email:</dt>
                                <dd className="font-medium">{supplier.alipay_email}</dd>
                              </div>
                            )}
                            {supplier.wechat_chinese_name && (
                              <div>
                                <dt className="text-gray-600">WeChat Name:</dt>
                                <dd className="font-medium">{supplier.wechat_chinese_name}</dd>
                              </div>
                            )}
                            {supplier.wechat_number && (
                              <div>
                                <dt className="text-gray-600">WeChat ID:</dt>
                                <dd className="font-medium">{supplier.wechat_number}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>

                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">Product Catalogs</h4>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedSupplierId(supplier.supplier_id);
                              setCatalogDialogOpen(true);
                            }}
                            className="gap-2"
                          >
                            <Upload className="w-4 h-4" />
                            Upload Catalog
                          </Button>
                        </div>

                        {supplier.catalogs.length === 0 ? (
                          <p className="text-sm text-gray-500 py-4">No catalogs uploaded</p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>File Name</TableHead>
                                <TableHead>Upload Date</TableHead>
                                <TableHead>Notes</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {supplier.catalogs.map((catalog) => (
                                <TableRow key={catalog.catalog_id}>
                                  <TableCell className="flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium">{catalog.file_name}</span>
                                  </TableCell>
                                  <TableCell className="flex items-center gap-1 text-sm text-gray-600">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(catalog.upload_date).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell className="text-sm text-gray-600">
                                    {catalog.notes || '—'}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1"
                                      >
                                        <Download className="w-3 h-3" />
                                        Download
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1 text-red-600 hover:text-red-700"
                                        onClick={() =>
                                          handleCatalogDelete(supplier.supplier_id, catalog.catalog_id)
                                        }
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end border-t pt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClick(supplier)}
                          className="gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Edit Supplier
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))
            )}
          </Accordion>
        </CardContent>
      </Card>

      <Dialog open={catalogDialogOpen} onOpenChange={setCatalogDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Product Catalog</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCatalogSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="catalog_file">File Name</Label>
              <div className="flex gap-2">
                <Input
                  id="catalog_file"
                  placeholder="e.g., 2026-Spring-Catalog.pdf"
                  value={catalogForm.file_name}
                  onChange={(e) =>
                    setCatalogForm({ ...catalogForm, file_name: e.target.value })
                  }
                  required
                />
                <Button type="button" variant="outline">
                  <Upload className="w-4 h-4 mr-2" />
                  Browse
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                In production, this would upload to server or Google Drive
              </p>
            </div>
            <div>
              <Label htmlFor="catalog_notes">Notes (Optional)</Label>
              <Textarea
                id="catalog_notes"
                placeholder="Add any notes about this catalog..."
                value={catalogForm.notes}
                onChange={(e) =>
                  setCatalogForm({ ...catalogForm, notes: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="pt-4 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCatalogDialogOpen(false);
                  setCatalogForm({ file_name: "", notes: "" });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Upload Catalog</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
