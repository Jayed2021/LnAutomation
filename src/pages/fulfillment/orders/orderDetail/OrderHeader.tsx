import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Package, Phone } from 'lucide-react';
import { OrderDetail, OrderItem } from './types';
import { StatusBadge } from '../StatusBadge';

function getInitials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

interface Props {
  order: OrderDetail;
  items: OrderItem[];
  onPrintInvoice: () => void;
  onPrintPackingSlip: () => void;
  onDeleteOrder: () => void;
  canDelete: boolean;
}

export function OrderHeader({ order, items, onPrintInvoice, onPrintPackingSlip }: Props) {
  const navigate = useNavigate();

  const itemsSummary = items.length > 0
    ? items.map(i => `${i.product_name} (${i.quantity})`).join(', ')
    : '—';

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const phone = order.customer?.phone_primary ?? '';

  return (
    <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0 pt-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-2.5">
              <span className="text-xl font-bold text-gray-900">
                #{order.woo_order_id ?? order.order_number}
              </span>
              <StatusBadge status={order.cs_status} />
              <span className="text-sm text-gray-500">{formatDate(order.order_date)}</span>
              {order.assigned_user && (
                <div className="flex items-center gap-1.5 bg-gray-100 rounded-full pl-1 pr-3 py-0.5">
                  <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                    {getInitials(order.assigned_user.full_name)}
                  </div>
                  <span className="text-xs font-medium text-gray-700">{order.assigned_user.full_name}</span>
                </div>
              )}
            </div>
            <div className="mt-1.5 text-sm text-gray-500 truncate">
              <span className="font-medium text-gray-600">Items:</span>{' '}
              <span className="truncate">{itemsSummary}</span>
              <span className="ml-4 font-medium text-gray-800">
                Total: ৳{order.total_amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={onPrintInvoice}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Generate Invoice
          </button>
          <button
            onClick={onPrintPackingSlip}
            className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Package className="w-4 h-4" />
            Generate Packing Slip
          </button>
          {phone && (
            <a
              href={`tel:${phone}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call Customer
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
