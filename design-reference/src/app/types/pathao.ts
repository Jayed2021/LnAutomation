/**
 * Pathao Courier API Type Definitions
 * Based on official API documentation
 * 
 * Sandbox/Test Environment:
 * - Base URL: https://courier-api-sandbox.pathao.com
 * - Client ID: 7N1aMJQbWm
 * - Client Secret: wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39
 * - Username: test@pathao.com
 * - Password: lovePathao
 * 
 * Production/Live Environment:
 * - Base URL: https://api-hermes.pathao.com
 * - Client ID: From merchant portal
 * - Client Secret: From merchant portal
 */

// Authentication Types
export interface PathaoIssueTokenRequest {
  client_id: string;
  client_secret: string;
  grant_type: 'password' | 'refresh_token';
  username?: string; // Required for password grant type
  password?: string; // Required for password grant type
  refresh_token?: string; // Required for refresh_token grant type
}

export interface PathaoTokenResponse {
  token_type: 'Bearer';
  expires_in: number; // Token expiry time in seconds (432000 = 5 days)
  access_token: string;
  refresh_token: string;
}

// Order Creation Types
export interface PathaoCreateOrderRequest {
  store_id: number; // Provided by merchant, sets pickup location
  merchant_order_id?: string; // Optional, your tracking ID
  recipient_name: string; // 3-100 characters
  recipient_phone: string; // 11 characters (017XXXXXXXX)
  recipient_secondary_phone?: string; // 11 characters
  recipient_address: string; // 10-220 characters
  recipient_city?: number; // Optional, auto-populated if not provided
  recipient_zone?: number; // Optional, auto-populated if not provided
  recipient_area?: number; // Optional, auto-populated if not provided
  delivery_type: 48 | 12; // 48 = Normal, 12 = On Demand
  item_type: 1 | 2; // 1 = Document, 2 = Parcel
  special_instruction?: string;
  item_quantity: number;
  item_weight: number; // 0.5 to 10 kg
  item_description?: string;
  amount_to_collect: number; // COD amount, 0 for non-COD
}

export interface PathaoCreateOrderResponse {
  message: string;
  type: 'success';
  code: 200;
  data: {
    consignment_id: string; // Unique Pathao tracking ID
    merchant_order_id: string;
    order_status: string; // e.g., "Pending"
    delivery_fee: number;
  };
}

// Order Info Types
export interface PathaoOrderInfoResponse {
  consignment_id: string;
  merchant_order_id: string;
  order_status_slug: string;
}

// Location Types
export interface PathaoCity {
  city_id: number;
  city_name: string;
}

export interface PathaoZone {
  zone_id: number;
  zone_name: string;
}

export interface PathaoArea {
  area_id: number;
  area_name: string;
  home_delivery_available: boolean;
  pickup_available: boolean;
}

export interface PathaoCityListResponse {
  message: string;
  type: 'success';
  code: 200;
  data: {
    data: PathaoCity[];
  };
}

export interface PathaoZoneListResponse {
  message: string;
  type: 'success';
  code: 200;
  data: {
    data: PathaoZone[];
  };
}

export interface PathaoAreaListResponse {
  message: string;
  type: 'success';
  code: 200;
  data: {
    data: PathaoArea[];
  };
}

// Price Calculation Types
export interface PathaoPriceCalculationRequest {
  store_id: number;
  item_type: 1 | 2; // 1 = Document, 2 = Parcel
  delivery_type: 48 | 12; // 48 = Normal, 12 = On Demand
  item_weight: number; // 0.5 to 10 kg
  recipient_city: number;
  recipient_zone: number;
}

export interface PathaoPriceCalculationResponse {
  message: string;
  type: 'success';
  code: 200;
  data: {
    price: number;
    discount: number;
    promo_discount: number;
    plan_id: number;
    cod_enabled: 1 | 0;
    cod_percentage: number;
    additional_charge: number;
    final_price: number;
  };
}

// Store Types
export interface PathaoStore {
  store_id: number;
  store_name: string;
  store_address: string;
  is_active: 1 | 0;
  city_id: number;
  zone_id: number;
  hub_id: number;
  is_default_store: boolean;
  is_default_return_store: boolean;
}

export interface PathaoStoreListResponse {
  message: string;
  type: 'success';
  code: 200;
  data: {
    data: PathaoStore[];
    total: number;
    current_page: number;
    per_page: number;
    total_in_page: number;
    last_page: number;
    path: string;
    to: number;
    from: number;
    last_page_url: string;
    first_page_url: string;
  };
}

// Webhook Types
export interface PathaoWebhookPayload {
  event: string; // e.g., "webhook_integration" for testing
  // Additional fields will be sent for actual order status updates
}

export interface PathaoWebhookHeaders {
  'X-PATHAO-Signature': string; // Your webhook secret
  'Content-Type': 'application/json';
}

// API Endpoints
export const PATHAO_ENDPOINTS = {
  ISSUE_TOKEN: '/aladdin/api/v1/issue-token',
  CREATE_ORDER: '/aladdin/api/v1/orders',
  GET_ORDER_INFO: '/aladdin/api/v1/orders/:consignment_id/info',
  GET_CITIES: '/aladdin/api/v1/city-list',
  GET_ZONES: '/aladdin/api/v1/cities/:city_id/zone-list',
  GET_AREAS: '/aladdin/api/v1/zones/:zone_id/area-list',
  CALCULATE_PRICE: '/aladdin/api/v1/merchant/price-plan',
  GET_STORES: '/aladdin/api/v1/stores',
} as const;

// Environment Configuration
export interface PathaoConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username?: string; // For password grant type
  password?: string; // For password grant type
}

export const PATHAO_ENVIRONMENTS = {
  SANDBOX: {
    baseUrl: 'https://courier-api-sandbox.pathao.com',
    clientId: '7N1aMJQbWm',
    clientSecret: 'wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39',
    username: 'test@pathao.com',
    password: 'lovePathao',
  },
  PRODUCTION: {
    baseUrl: 'https://api-hermes.pathao.com',
    // Client credentials provided by merchant
  },
} as const;
