import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RefreshProvider } from './contexts/RefreshContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import PurchaseOrders from './pages/purchase/PurchaseOrders';
import CreatePurchaseOrder from './pages/purchase/CreatePurchaseOrder';
import PurchaseOrderDetail from './pages/purchase/PurchaseOrderDetail';
import Suppliers from './pages/purchase/Suppliers';
import SupplierDetail from './pages/purchase/SupplierDetail';
import Products from './pages/inventory/Products';
import ProductDetail from './pages/inventory/ProductDetail';
import Shipments from './pages/inventory/Shipments';
import StockMovements from './pages/inventory/StockMovements';
import WarehouseLocations from './pages/inventory/WarehouseLocations';
import InventoryAudit from './pages/inventory/InventoryAudit';
import AuditDetail from './pages/inventory/AuditDetail';
import ReceiveGoods from './pages/inventory/ReceiveGoods';
import Stock from './pages/inventory/Stock';
import Orders from './pages/fulfillment/orders/Orders';
import OrderDetail from './pages/fulfillment/orders/orderDetail/OrderDetail';
import Operations from './pages/fulfillment/Operations';
import Returns from './pages/fulfillment/Returns';
import ReturnDetail from './pages/fulfillment/ReturnDetail';
import Collection from './pages/finance/Collection';
import Expenses from './pages/finance/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import WooCommerceSettings from './pages/settings/WooCommerceSettings';
import BarcodeSettings from './pages/settings/BarcodeSettings';
import PackagingSettings from './pages/settings/PackagingSettings';
import StoreProfile from './pages/settings/StoreProfile';
import CourierSettings from './pages/settings/CourierSettings';
import SmsSettings from './pages/settings/SmsSettings';
import UserManagement from './pages/settings/UserManagement';
import CsAssignment from './pages/settings/CsAssignment';
import ComingSoon from './pages/ComingSoon';
import ProfitLoss from './pages/reports/ProfitLoss';
import Customers from './pages/customers/Customers';
import CustomerDetail from './pages/customers/CustomerDetail';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RefreshProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />

            <Route path="purchase/orders" element={<PurchaseOrders />} />
            <Route path="purchase/orders/:id" element={<PurchaseOrderDetail />} />
            <Route path="purchase/orders/:id/edit" element={<CreatePurchaseOrder />} />
            <Route path="purchase/create" element={<CreatePurchaseOrder />} />
            <Route path="purchase/suppliers" element={<Suppliers />} />
            <Route path="purchase/suppliers/:id" element={<SupplierDetail />} />

            <Route path="inventory/products" element={<Products />} />
            <Route path="inventory/products/:id" element={<ProductDetail />} />
            <Route path="inventory/shipments" element={<Shipments />} />
            <Route path="inventory/stock" element={<Stock />} />
            <Route path="inventory/movements" element={<StockMovements />} />
            <Route path="inventory/locations" element={<WarehouseLocations />} />
            <Route path="inventory/audit" element={<InventoryAudit />} />
            <Route path="inventory/audit/:id" element={<AuditDetail />} />
            <Route path="inventory/cycle-counts" element={<Navigate to="/inventory/audit" replace />} />
            <Route path="inventory/receive" element={<ReceiveGoods />} />
            <Route path="inventory/warehouse" element={<WarehouseLocations />} />

            <Route path="fulfillment/orders" element={<Orders />} />
            <Route path="fulfillment/orders/:id" element={<OrderDetail />} />
            <Route path="fulfillment/operations" element={<Operations />} />
            <Route path="fulfillment/returns" element={<Returns />} />
            <Route path="fulfillment/returns/:id" element={<ReturnDetail />} />

            <Route path="finance/collection" element={<Collection />} />
            <Route path="finance/expenses" element={<Expenses />} />
            <Route path="finance/profit" element={<ComingSoon moduleName="Profit Analysis" />} />

            <Route path="customers" element={<Customers />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="reports" element={<Reports />} />
            <Route path="reports/profit-loss" element={<ProfitLoss />} />
            <Route path="settings" element={<Settings />} />
            <Route path="settings/woocommerce" element={<WooCommerceSettings />} />
            <Route path="settings/barcode" element={<BarcodeSettings />} />
            <Route path="settings/packaging" element={<PackagingSettings />} />
            <Route path="settings/store-profile" element={<StoreProfile />} />
            <Route path="settings/courier" element={<CourierSettings />} />
            <Route path="settings/sms" element={<SmsSettings />} />
            <Route path="settings/users" element={<UserManagement />} />
            <Route path="settings/cs-assignment" element={<CsAssignment />} />
          </Route>
        </Routes>
        </RefreshProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
