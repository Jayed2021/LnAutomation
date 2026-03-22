import { useState } from 'react';
import { UserPlus, CreditCard as Edit2, Trash2, Shield, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Permission {
  module: string;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
  permissions: Permission[];
  createdAt: string;
  lastLogin?: string;
}

// ─── Permission Templates ────────────────────────────────────────────────────

const moduleList = [
  'Purchase Orders',
  'Inventory',
  'Fulfilment - Operations',
  'Fulfilment - Orders',
  'Returns',
  'Expenses',
  'Collection',
  'Profit Analysis',
  'Customers',
  'Reports',
];

const roleTemplates: Record<string, Permission[]> = {
  'Admin': moduleList.map(module => ({
    module,
    view: true,
    create: true,
    edit: true,
    delete: true,
  })),
  'Procurement Manager': [
    { module: 'Purchase Orders', view: true, create: true, edit: true, delete: true },
    { module: 'Inventory', view: true, create: false, edit: false, delete: false },
    { module: 'Fulfilment - Operations', view: false, create: false, edit: false, delete: false },
    { module: 'Fulfilment - Orders', view: false, create: false, edit: false, delete: false },
    { module: 'Returns', view: false, create: false, edit: false, delete: false },
    { module: 'Expenses', view: false, create: false, edit: false, delete: false },
    { module: 'Collection', view: false, create: false, edit: false, delete: false },
    { module: 'Profit Analysis', view: false, create: false, edit: false, delete: false },
    { module: 'Customers', view: false, create: false, edit: false, delete: false },
    { module: 'Reports', view: true, create: false, edit: false, delete: false },
  ],
  'Operations': [
    { module: 'Purchase Orders', view: false, create: false, edit: false, delete: false },
    { module: 'Inventory', view: true, create: true, edit: true, delete: true },
    { module: 'Fulfilment - Operations', view: true, create: true, edit: true, delete: true },
    { module: 'Fulfilment - Orders', view: true, create: false, edit: false, delete: false },
    { module: 'Returns', view: true, create: true, edit: true, delete: true },
    { module: 'Expenses', view: false, create: false, edit: false, delete: false },
    { module: 'Collection', view: false, create: false, edit: false, delete: false },
    { module: 'Profit Analysis', view: false, create: false, edit: false, delete: false },
    { module: 'Customers', view: false, create: false, edit: false, delete: false },
    { module: 'Reports', view: true, create: false, edit: false, delete: false },
  ],
  'Customer Service': [
    { module: 'Purchase Orders', view: false, create: false, edit: false, delete: false },
    { module: 'Inventory', view: false, create: false, edit: false, delete: false },
    { module: 'Fulfilment - Operations', view: false, create: false, edit: false, delete: false },
    { module: 'Fulfilment - Orders', view: true, create: true, edit: true, delete: false },
    { module: 'Returns', view: true, create: false, edit: false, delete: false },
    { module: 'Expenses', view: false, create: false, edit: false, delete: false },
    { module: 'Collection', view: false, create: false, edit: false, delete: false },
    { module: 'Profit Analysis', view: false, create: false, edit: false, delete: false },
    { module: 'Customers', view: true, create: true, edit: true, delete: false },
    { module: 'Reports', view: true, create: false, edit: false, delete: false },
  ],
  'Accounting': [
    { module: 'Purchase Orders', view: false, create: false, edit: false, delete: false },
    { module: 'Inventory', view: false, create: false, edit: false, delete: false },
    { module: 'Fulfilment - Operations', view: false, create: false, edit: false, delete: false },
    { module: 'Fulfilment - Orders', view: true, create: false, edit: false, delete: false },
    { module: 'Returns', view: false, create: false, edit: false, delete: false },
    { module: 'Expenses', view: true, create: true, edit: true, delete: true },
    { module: 'Collection', view: true, create: true, edit: true, delete: true },
    { module: 'Profit Analysis', view: false, create: false, edit: false, delete: false },
    { module: 'Customers', view: false, create: false, edit: false, delete: false },
    { module: 'Reports', view: true, create: false, edit: false, delete: false },
  ],
};

// ─── Mock Data ───────────────────────────────────────────────────────────────

const mockUsers: User[] = [
  {
    id: 'USER-001',
    name: 'Admin User',
    email: 'admin@eyewear.com',
    role: 'Admin',
    status: 'active',
    permissions: roleTemplates['Admin'],
    createdAt: '2025-01-01',
    lastLogin: '2026-03-05',
  },
  {
    id: 'USER-002',
    name: 'Tahmid Rahman',
    email: 'tahmid@eyewear.com',
    role: 'Procurement Manager',
    status: 'active',
    permissions: roleTemplates['Procurement Manager'],
    createdAt: '2025-02-15',
    lastLogin: '2026-03-04',
  },
  {
    id: 'USER-003',
    name: 'Sadia Khan',
    email: 'sadia@eyewear.com',
    role: 'Operations',
    status: 'active',
    permissions: roleTemplates['Operations'],
    createdAt: '2025-03-10',
    lastLogin: '2026-03-05',
  },
  {
    id: 'USER-004',
    name: 'Fahim Ahmed',
    email: 'fahim@eyewear.com',
    role: 'Custom',
    status: 'active',
    permissions: [
      { module: 'Purchase Orders', view: false, create: false, edit: false, delete: false },
      { module: 'Inventory', view: false, create: false, edit: false, delete: false },
      { module: 'Fulfilment - Operations', view: false, create: false, edit: false, delete: false },
      { module: 'Fulfilment - Orders', view: true, create: true, edit: true, delete: false },
      { module: 'Returns', view: true, create: false, edit: false, delete: false },
      { module: 'Expenses', view: true, create: true, edit: true, delete: false },
      { module: 'Collection', view: true, create: true, edit: true, delete: false },
      { module: 'Profit Analysis', view: false, create: false, edit: false, delete: false },
      { module: 'Customers', view: true, create: true, edit: true, delete: false },
      { module: 'Reports', view: true, create: false, edit: false, delete: false },
    ],
    createdAt: '2025-06-20',
    lastLogin: '2026-03-05',
  },
  {
    id: 'USER-005',
    name: 'Nazia Begum',
    email: 'nazia@eyewear.com',
    role: 'Accounting',
    status: 'active',
    permissions: roleTemplates['Accounting'],
    createdAt: '2025-08-05',
    lastLogin: '2026-03-04',
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export function UserManagement() {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [customPermissions, setCustomPermissions] = useState<Permission[]>([]);

  const handleAddUser = () => {
    setEditingUser({
      id: `USER-${Date.now()}`,
      name: '',
      email: '',
      role: '',
      status: 'active',
      permissions: [],
      createdAt: new Date().toISOString().split('T')[0],
    });
    setSelectedRole('');
    setCustomPermissions([]);
    setShowUserDialog(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser({ ...user });
    setSelectedRole(user.role);
    setCustomPermissions([...user.permissions]);
    setShowUserDialog(true);
  };

  const handleDeleteUser = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter(u => u.id !== userId));
      toast.success('User deleted successfully');
    }
  };

  const handleRoleChange = (role: string) => {
    setSelectedRole(role);
    if (role && role !== 'Custom') {
      setCustomPermissions([...roleTemplates[role]]);
    } else if (role === 'Custom') {
      // Start with empty permissions for custom role
      setCustomPermissions(moduleList.map(module => ({
        module,
        view: false,
        create: false,
        edit: false,
        delete: false,
      })));
    }
  };

  const handlePermissionChange = (moduleIndex: number, permissionType: keyof Permission, value: boolean) => {
    const updated = [...customPermissions];
    if (permissionType !== 'module') {
      updated[moduleIndex][permissionType] = value;
      setCustomPermissions(updated);
    }
  };

  const handleSaveUser = () => {
    if (!editingUser || !editingUser.name || !editingUser.email || !selectedRole) {
      toast.error('Please fill all required fields');
      return;
    }

    const updatedUser = {
      ...editingUser,
      role: selectedRole,
      permissions: customPermissions,
    };

    const existingIndex = users.findIndex(u => u.id === updatedUser.id);
    if (existingIndex >= 0) {
      const updated = [...users];
      updated[existingIndex] = updatedUser;
      setUsers(updated);
      toast.success('User updated successfully');
    } else {
      setUsers([...users, updatedUser]);
      toast.success('User added successfully');
    }

    setShowUserDialog(false);
    setEditingUser(null);
  };

  const getPermissionSummary = (permissions: Permission[]) => {
    const activeModules = permissions.filter(p => p.view).map(p => p.module);
    if (activeModules.length === moduleList.length) {
      return 'All Modules';
    }
    if (activeModules.length === 0) {
      return 'No Access';
    }
    if (activeModules.length <= 3) {
      return activeModules.join(', ');
    }
    return `${activeModules.length} modules`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription className="mt-1">
                Manage user accounts and permissions for your ERP system
              </CardDescription>
            </div>
            <Button onClick={handleAddUser}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Users ({users.filter(u => u.status === 'active').length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.id}</p>
                    </div>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'Admin' ? 'default' : 'secondary'}>
                      {user.role === 'Custom' && <Shield className="w-3 h-3 mr-1" />}
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600">
                      {getPermissionSummary(user.permissions)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell>
                    {user.status === 'active' ? (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700">
                        <XCircle className="w-3 h-3 mr-1" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditUser(user)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.role === 'Admin'}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUser?.email ? 'Edit User' : 'Add New User'}
            </DialogTitle>
            <DialogDescription>
              Configure user information and permissions
            </DialogDescription>
          </DialogHeader>

          {editingUser && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    placeholder="john@eyewear.com"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select value={selectedRole} onValueChange={handleRoleChange}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin (Full Access)</SelectItem>
                    <SelectItem value="Procurement Manager">Procurement Manager</SelectItem>
                    <SelectItem value="Operations">Operations</SelectItem>
                    <SelectItem value="Customer Service">Customer Service</SelectItem>
                    <SelectItem value="Accounting">Accounting</SelectItem>
                    <SelectItem value="Custom">Custom (Mix & Match)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Select a predefined role or choose "Custom" to create a hybrid role
                </p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editingUser.status}
                  onValueChange={(value: 'active' | 'inactive') =>
                    setEditingUser({ ...editingUser, status: value })
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Permissions Table */}
              {selectedRole && customPermissions.length > 0 && (
                <div className="space-y-2">
                  <Label>Permissions</Label>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[200px]">Module</TableHead>
                          <TableHead className="text-center">View</TableHead>
                          <TableHead className="text-center">Create</TableHead>
                          <TableHead className="text-center">Edit</TableHead>
                          <TableHead className="text-center">Delete</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customPermissions.map((permission, index) => (
                          <TableRow key={permission.module}>
                            <TableCell className="font-medium">{permission.module}</TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={permission.view}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(index, 'view', checked as boolean)
                                }
                                disabled={selectedRole !== 'Custom'}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={permission.create}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(index, 'create', checked as boolean)
                                }
                                disabled={selectedRole !== 'Custom'}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={permission.edit}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(index, 'edit', checked as boolean)
                                }
                                disabled={selectedRole !== 'Custom'}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={permission.delete}
                                onCheckedChange={(checked) =>
                                  handlePermissionChange(index, 'delete', checked as boolean)
                                }
                                disabled={selectedRole !== 'Custom'}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {selectedRole !== 'Custom' && (
                    <p className="text-xs text-gray-500">
                      These are preset permissions for the "{selectedRole}" role. Select "Custom" role to modify.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              {editingUser?.email && users.find(u => u.id === editingUser.id) ? 'Update User' : 'Add User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
