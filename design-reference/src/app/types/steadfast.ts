/**
 * Steadfast Courier API Type Definitions
 * Based on official API documentation
 * 
 * Base URL: https://portal.packzy.com/api/v1
 * Authentication: Via headers (Api-Key, Secret-Key)
 */

// Authentication Types
export interface SteadfastAuthHeaders {
  'Api-Key': string;
  'Secret-Key': string;
  'Content-Type': 'application/json';
}

// Order Creation Types
export interface SteadfastCreateOrderRequest {
  invoice: string; // Must be unique, alphanumeric with hyphens/underscores
  recipient_name: string; // Within 100 characters
  recipient_phone: string; // Must be 11 digits
  alternative_phone?: string; // Optional, must be 11 digits
  recipient_email?: string; // Optional
  recipient_address: string; // Within 250 characters
  cod_amount: number; // Cash on delivery amount in BDT, can't be less than 0
  note?: string; // Optional delivery instructions
  item_description?: string; // Optional items information
  total_lot?: number; // Optional total lot of items
  delivery_type?: 0 | 1; // 0 = home delivery, 1 = Point Delivery/Hub Pick Up
}

export interface SteadfastCreateOrderResponse {
  status: 200;
  message: string; // e.g., "Consignment has been created successfully."
  consignment: {
    consignment_id: number;
    invoice: string;
    tracking_code: string; // e.g., "15BAEB8A"
    recipient_name: string;
    recipient_phone: string;
    recipient_address: string;
    cod_amount: number;
    status: string; // e.g., "in_review"
    note: string | null;
    created_at: string; // ISO 8601 format
    updated_at: string; // ISO 8601 format
  };
}

// Bulk Order Creation Types
export interface SteadfastBulkOrderItem {
  invoice: string;
  recipient_name: string;
  recipient_address: string;
  recipient_phone: string;
  cod_amount: number;
  note?: string;
  alternative_phone?: string;
  recipient_email?: string;
  item_description?: string;
  total_lot?: number;
  delivery_type?: 0 | 1;
}

export interface SteadfastBulkOrderRequest {
  data: string; // JSON encoded array of orders (max 500 items)
}

export interface SteadfastBulkOrderResponseItem {
  invoice: string;
  recipient_name: string;
  recipient_address: string;
  recipient_phone: string;
  cod_amount: string;
  note: string | null;
  consignment_id: number | null;
  tracking_code: string | null;
  status: 'success' | 'error';
}

// Delivery Status Types
export type SteadfastDeliveryStatus =
  | 'pending' // Not delivered or cancelled yet
  | 'delivered_approval_pending' // Delivered, waiting for admin approval
  | 'partial_delivered_approval_pending' // Partially delivered, waiting for approval
  | 'cancelled_approval_pending' // Cancelled, waiting for approval
  | 'unknown_approval_pending' // Unknown pending status
  | 'delivered' // Delivered and balance added
  | 'partial_delivered' // Partially delivered and balance added
  | 'cancelled' // Cancelled and balance updated
  | 'hold' // Consignment is held
  | 'in_review' // Order placed, waiting to be reviewed
  | 'unknown'; // Unknown status

export interface SteadfastStatusResponse {
  status: 200;
  delivery_status: SteadfastDeliveryStatus;
}

// Balance Types
export interface SteadfastBalanceResponse {
  status: 200;
  current_balance: number;
}

// Return Request Types
export type SteadfastReturnStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'cancelled';

export interface SteadfastCreateReturnRequest {
  consignment_id?: number;
  invoice?: string;
  tracking_code?: string;
  reason?: string;
}

export interface SteadfastReturnRequest {
  id: number;
  user_id: number;
  consignment_id: number;
  reason: string | null;
  status: SteadfastReturnStatus;
  created_at: string; // ISO 8601 format
  updated_at: string; // ISO 8601 format
}

// Payment Types
export interface SteadfastPayment {
  payment_id: number;
  // Additional fields will be in the actual API response
}

// Police Station Types
export interface SteadfastPoliceStation {
  id: number;
  name: string;
  // Additional fields as per API response
}

// API Endpoints
export const STEADFAST_ENDPOINTS = {
  CREATE_ORDER: '/create_order',
  BULK_ORDER: '/create_order/bulk-order',
  STATUS_BY_CONSIGNMENT_ID: '/status_by_cid/:id',
  STATUS_BY_INVOICE: '/status_by_invoice/:invoice',
  STATUS_BY_TRACKING_CODE: '/status_by_trackingcode/:trackingCode',
  GET_BALANCE: '/get_balance',
  CREATE_RETURN_REQUEST: '/create_return_request',
  GET_RETURN_REQUEST: '/get_return_request/:id',
  GET_RETURN_REQUESTS: '/get_return_requests',
  GET_PAYMENTS: '/payments',
  GET_SINGLE_PAYMENT: '/payments/:payment_id',
  GET_POLICE_STATIONS: '/police_stations',
} as const;

// Environment Configuration
export interface SteadfastConfig {
  baseUrl: string; // https://portal.packzy.com/api/v1
  apiKey: string;
  secretKey: string;
}

export const STEADFAST_BASE_URL = 'https://portal.packzy.com/api/v1';
