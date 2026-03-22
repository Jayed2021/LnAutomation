import { CustomerReports } from '../reports/CustomerReports';

export function Customers() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Customer Management</h1>
        <p className="text-gray-600 mt-1">Manage customer database, prescriptions, and delivery history</p>
      </div>

      <CustomerReports />
    </div>
  );
}
