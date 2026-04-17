import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { RefreshProvider } from './contexts/RefreshContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

const PurchaseOrders = lazy(() => import('./pages/purchase/PurchaseOrders'));
const CreatePurchaseOrder = lazy(() => import('./pages/purchase/CreatePurchaseOrder'));
const PurchaseOrderDetail = lazy(() => import('./pages/purchase/PurchaseOrderDetail'));
const Suppliers = lazy(() => import('./pages/purchase/Suppliers'));
const SupplierDetail = lazy(() => import('./pages/purchase/SupplierDetail'));

const Products = lazy(() => import('./pages/inventory/Products'));
const ProductDetail = lazy(() => import('./pages/inventory/ProductDetail'));
const Shipments = lazy(() => import('./pages/inventory/Shipments'));
const StockMovements = lazy(() => import('./pages/inventory/StockMovements'));
const WarehouseLocations = lazy(() => import('./pages/inventory/WarehouseLocations'));
const InventoryAudit = lazy(() => import('./pages/inventory/InventoryAudit'));
const AuditDetail = lazy(() => import('./pages/inventory/AuditDetail'));
const ReceiveGoods = lazy(() => import('./pages/inventory/ReceiveGoods'));
const Stock = lazy(() => import('./pages/inventory/Stock'));

const Orders = lazy(() => import('./pages/fulfillment/orders/Orders'));
const OrderDetail = lazy(() => import('./pages/fulfillment/orders/orderDetail/OrderDetail'));
const Operations = lazy(() => import('./pages/fulfillment/Operations'));
const Returns = lazy(() => import('./pages/fulfillment/Returns'));
const ReturnDetail = lazy(() => import('./pages/fulfillment/ReturnDetail'));
const BulkUpdateOrders = lazy(() => import('./pages/fulfillment/orders/bulkUpdate/BulkUpdateOrders'));

const Collection = lazy(() => import('./pages/finance/Collection'));
const Expenses = lazy(() => import('./pages/finance/Expenses'));

const Reports = lazy(() => import('./pages/Reports'));
const ProfitLoss = lazy(() => import('./pages/reports/ProfitLoss'));
const ExpenseAnalysis = lazy(() => import('./pages/reports/ExpenseAnalysis'));
const CashFlow = lazy(() => import('./pages/reports/CashFlow'));
const StockLevels = lazy(() => import('./pages/reports/StockLevels'));
const SalesOverview = lazy(() => import('./pages/reports/SalesOverview'));
const ProductProfitability = lazy(() => import('./pages/reports/ProductProfitability'));

const Settings = lazy(() => import('./pages/Settings'));
const WooCommerceSettings = lazy(() => import('./pages/settings/WooCommerceSettings'));
const BarcodeSettings = lazy(() => import('./pages/settings/BarcodeSettings'));
const PackagingSettings = lazy(() => import('./pages/settings/PackagingSettings'));
const StoreProfile = lazy(() => import('./pages/settings/StoreProfile'));
const CourierSettings = lazy(() => import('./pages/settings/CourierSettings'));
const SmsSettings = lazy(() => import('./pages/settings/SmsSettings'));
const UserManagement = lazy(() => import('./pages/settings/UserManagement'));
const CsAssignment = lazy(() => import('./pages/settings/CsAssignment'));
const FraudAlertSettings = lazy(() => import('./pages/settings/FraudAlertSettings'));
const ApiAccessSettings = lazy(() => import('./pages/settings/ApiAccessSettings'));
const MiscSettings = lazy(() => import('./pages/settings/MiscSettings'));

const ComingSoon = lazy(() => import('./pages/ComingSoon'));
const Customers = lazy(() => import('./pages/customers/Customers'));
const CustomerDetail = lazy(() => import('./pages/customers/CustomerDetail'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

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

              <Route path="purchase/orders" element={<Suspense fallback={<PageLoader />}><PurchaseOrders /></Suspense>} />
              <Route path="purchase/orders/:id" element={<Suspense fallback={<PageLoader />}><PurchaseOrderDetail /></Suspense>} />
              <Route path="purchase/orders/:id/edit" element={<Suspense fallback={<PageLoader />}><CreatePurchaseOrder /></Suspense>} />
              <Route path="purchase/create" element={<Suspense fallback={<PageLoader />}><CreatePurchaseOrder /></Suspense>} />
              <Route path="purchase/suppliers" element={<Suspense fallback={<PageLoader />}><Suppliers /></Suspense>} />
              <Route path="purchase/suppliers/:id" element={<Suspense fallback={<PageLoader />}><SupplierDetail /></Suspense>} />

              <Route path="inventory/products" element={<Suspense fallback={<PageLoader />}><Products /></Suspense>} />
              <Route path="inventory/products/:id" element={<Suspense fallback={<PageLoader />}><ProductDetail /></Suspense>} />
              <Route path="inventory/shipments" element={<Suspense fallback={<PageLoader />}><Shipments /></Suspense>} />
              <Route path="inventory/stock" element={<Suspense fallback={<PageLoader />}><Stock /></Suspense>} />
              <Route path="inventory/movements" element={<Suspense fallback={<PageLoader />}><StockMovements /></Suspense>} />
              <Route path="inventory/locations" element={<Suspense fallback={<PageLoader />}><WarehouseLocations /></Suspense>} />
              <Route path="inventory/audit" element={<Suspense fallback={<PageLoader />}><InventoryAudit /></Suspense>} />
              <Route path="inventory/audit/:id" element={<Suspense fallback={<PageLoader />}><AuditDetail /></Suspense>} />
              <Route path="inventory/cycle-counts" element={<Navigate to="/inventory/audit" replace />} />
              <Route path="inventory/receive" element={<Suspense fallback={<PageLoader />}><ReceiveGoods /></Suspense>} />
              <Route path="inventory/warehouse" element={<Suspense fallback={<PageLoader />}><WarehouseLocations /></Suspense>} />

              <Route path="fulfillment/orders" element={<Suspense fallback={<PageLoader />}><Orders /></Suspense>} />
              <Route path="fulfillment/orders/bulk-update" element={<Suspense fallback={<PageLoader />}><BulkUpdateOrders /></Suspense>} />
              <Route path="fulfillment/orders/:id" element={<Suspense fallback={<PageLoader />}><OrderDetail /></Suspense>} />
              <Route path="fulfillment/operations" element={<Suspense fallback={<PageLoader />}><Operations /></Suspense>} />
              <Route path="fulfillment/returns" element={<Suspense fallback={<PageLoader />}><Returns /></Suspense>} />
              <Route path="fulfillment/returns/:id" element={<Suspense fallback={<PageLoader />}><ReturnDetail /></Suspense>} />

              <Route path="finance/collection" element={<Suspense fallback={<PageLoader />}><Collection /></Suspense>} />
              <Route path="finance/expenses" element={<Suspense fallback={<PageLoader />}><Expenses /></Suspense>} />
              <Route path="finance/profit" element={<Suspense fallback={<PageLoader />}><ComingSoon moduleName="Profit Analysis" /></Suspense>} />

              <Route path="customers" element={<Suspense fallback={<PageLoader />}><Customers /></Suspense>} />
              <Route path="customers/:id" element={<Suspense fallback={<PageLoader />}><CustomerDetail /></Suspense>} />
              <Route path="reports" element={<Suspense fallback={<PageLoader />}><Reports /></Suspense>} />
              <Route path="reports/profit-loss" element={<Suspense fallback={<PageLoader />}><ProfitLoss /></Suspense>} />
              <Route path="reports/expense-analysis" element={<Suspense fallback={<PageLoader />}><ExpenseAnalysis /></Suspense>} />
              <Route path="reports/cash-flow" element={<Suspense fallback={<PageLoader />}><CashFlow /></Suspense>} />
              <Route path="reports/stock-levels" element={<Suspense fallback={<PageLoader />}><StockLevels /></Suspense>} />
              <Route path="reports/sales-overview" element={<Suspense fallback={<PageLoader />}><SalesOverview /></Suspense>} />
              <Route path="reports/product-profitability" element={<Suspense fallback={<PageLoader />}><ProductProfitability /></Suspense>} />
              <Route path="settings" element={<Suspense fallback={<PageLoader />}><Settings /></Suspense>} />
              <Route path="settings/woocommerce" element={<Suspense fallback={<PageLoader />}><WooCommerceSettings /></Suspense>} />
              <Route path="settings/barcode" element={<Suspense fallback={<PageLoader />}><BarcodeSettings /></Suspense>} />
              <Route path="settings/packaging" element={<Suspense fallback={<PageLoader />}><PackagingSettings /></Suspense>} />
              <Route path="settings/store-profile" element={<Suspense fallback={<PageLoader />}><StoreProfile /></Suspense>} />
              <Route path="settings/courier" element={<Suspense fallback={<PageLoader />}><CourierSettings /></Suspense>} />
              <Route path="settings/sms" element={<Suspense fallback={<PageLoader />}><SmsSettings /></Suspense>} />
              <Route path="settings/users" element={<Suspense fallback={<PageLoader />}><UserManagement /></Suspense>} />
              <Route path="settings/cs-assignment" element={<Suspense fallback={<PageLoader />}><CsAssignment /></Suspense>} />
              <Route path="settings/fraud-alert" element={<Suspense fallback={<PageLoader />}><FraudAlertSettings /></Suspense>} />
              <Route path="settings/api-access" element={<Suspense fallback={<PageLoader />}><ApiAccessSettings /></Suspense>} />
              <Route path="settings/misc" element={<Suspense fallback={<PageLoader />}><MiscSettings /></Suspense>} />
            </Route>
          </Routes>
        </RefreshProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
