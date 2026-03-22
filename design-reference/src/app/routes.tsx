import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { Login } from "./components/auth/Login";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { SetupWizard } from "./components/setup/SetupWizard";
import { Settings } from "./components/settings/Settings";

// Purchase components
import { PurchaseOrders } from "./components/purchase/PurchaseOrders";
import { CreatePO } from "./components/purchase/CreatePO";
import { PODetail } from "./components/purchase/PODetail";
import { ReceiveGoods } from "./components/purchase/ReceiveGoods";
import { Suppliers } from "./components/purchase/Suppliers";

// Inventory components
import { InventoryStock } from "./components/inventory/InventoryStock";
import { InventoryLots } from "./components/inventory/InventoryLots";
import { InventoryMovements } from "./components/inventory/InventoryMovements";
import { WarehouseLocations } from "./components/inventory/WarehouseLocations";
import { InventoryAudit } from "./components/inventory/InventoryAudit";
import { ProductDetail } from "./components/inventory/ProductDetail";

// Fulfilment components
import { Orders } from "./components/fulfilment/Orders";
import { OrderDetail } from "./components/fulfilment/OrderDetail";
import { Operations } from "./components/fulfilment/Operations";
import { OperationsOrderDetail } from "./components/fulfilment/OperationsOrderDetail";
import { Returns } from "./components/fulfilment/Returns";

// Finance components
import { Expenses } from "./components/finance/Expenses";
import { ProfitAnalysis } from "./components/finance/ProfitAnalysis";
import { Collection } from "./components/finance/Collection";

// Customer components
import { Customers } from "./components/customers/Customers";
import { CustomerDetail } from "./components/customers/CustomerDetail";

// Reports components
import { Reports } from "./components/reports/Reports";

// Placeholder component for routes that haven't been built yet
const ComingSoon = () => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
      <p className="text-gray-600">This feature is under development</p>
    </div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/setup",
    Component: SetupWizard,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, Component: Dashboard },
      
      // Redirects from old routes to new routes
      { path: "orders", element: <Navigate to="/fulfilment/orders" replace /> },
      { path: "orders/:id", element: <Navigate to="/fulfilment/orders/:id" replace /> },
      { path: "picking", element: <Navigate to="/fulfilment/operations" replace /> },
      { path: "returns", element: <Navigate to="/fulfilment/returns" replace /> },
      
      // Purchase
      { path: "purchase", Component: PurchaseOrders },
      { path: "purchase/create", Component: CreatePO },
      { path: "purchase/create/:id", Component: CreatePO },
      { path: "purchase/:id", Component: PODetail },
      { path: "purchase/suppliers", Component: Suppliers },
      
      // Inventory
      { path: "inventory/stock", Component: InventoryStock },
      { path: "inventory/lots", Component: InventoryLots },
      { path: "inventory/movements", Component: InventoryMovements },
      { path: "inventory/warehouse", Component: WarehouseLocations },
      { path: "inventory/audit", Component: InventoryAudit },
      { path: "inventory/receive", Component: ReceiveGoods },
      { path: "inventory/receive/:id", Component: ReceiveGoods },
      { path: "inventory/product/:sku", Component: ProductDetail },
      
      // Fulfilment
      { path: "fulfilment/orders", Component: Orders },
      { path: "fulfilment/orders/:id", Component: OrderDetail },
      { path: "fulfilment/operations", Component: Operations },
      { path: "fulfilment/operations/:id", Component: OperationsOrderDetail },
      { path: "fulfilment/returns", Component: Returns },
      
      // Finance
      { path: "finance/expenses", Component: Expenses },
      { path: "finance/profit", Component: ProfitAnalysis },
      { path: "finance/collection", Component: Collection },
      
      // Customers
      { path: "customers", Component: Customers },
      { path: "customers/:id", Component: CustomerDetail },
      
      // Reports
      { path: "reports", Component: Reports },
      
      // Settings
      { path: "settings", Component: Settings },
    ],
  },
]);