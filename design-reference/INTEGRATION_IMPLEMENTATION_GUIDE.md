# ERP Integration Implementation Guide

## Overview
This document outlines the courier and SMS integrations implemented in the ERP system, with detailed API specifications for backend implementation using Supabase Edge Functions.

---

## 1. Pathao Courier Integration

### Authentication: OAuth 2.0
- **Sandbox Base URL**: `https://courier-api-sandbox.pathao.com`
- **Production Base URL**: `https://api-hermes.pathao.com`
- **Token Expiry**: 5 days (432,000 seconds)

### Configuration Fields
- `client_id` - OAuth client ID
- `client_secret` - OAuth client secret
- `username` - Merchant email
- `password` - Merchant password
- `store_id` - Store ID for pickup location

### API Endpoints

#### 1. Issue Access Token
```
POST /aladdin/api/v1/issue-token
Content-Type: application/json

{
  "client_id": "xxx",
  "client_secret": "xxx",
  "grant_type": "password",
  "username": "email@example.com",
  "password": "xxx"
}

Response:
{
  "token_type": "Bearer",
  "expires_in": 432000,
  "access_token": "xxx",
  "refresh_token": "xxx"
}
```

#### 2. Refresh Token
```
POST /aladdin/api/v1/issue-token

{
  "client_id": "xxx",
  "client_secret": "xxx",
  "grant_type": "refresh_token",
  "refresh_token": "xxx"
}
```

#### 3. Create Order
```
POST /aladdin/api/v1/orders
Authorization: Bearer {access_token}

{
  "store_id": 123,
  "merchant_order_id": "ORDER-123",
  "recipient_name": "John Doe",
  "recipient_phone": "01712345678",
  "recipient_address": "Full address here",
  "delivery_type": 48,  // 48 = Normal, 12 = On Demand
  "item_type": 2,       // 1 = Document, 2 = Parcel
  "item_quantity": 1,
  "item_weight": 0.5,   // 0.5 to 10 kg
  "item_description": "Product description",
  "amount_to_collect": 1000  // COD amount, 0 for non-COD
}

Response:
{
  "message": "Order Created Successfully",
  "type": "success",
  "code": 200,
  "data": {
    "consignment_id": "xxx",
    "merchant_order_id": "ORDER-123",
    "order_status": "Pending",
    "delivery_fee": 80
  }
}
```

#### 4. Get Order Status
```
GET /aladdin/api/v1/orders/{consignment_id}/info
Authorization: Bearer {access_token}
```

#### 5. Get Cities, Zones, Areas
```
GET /aladdin/api/v1/city-list
GET /aladdin/api/v1/cities/{city_id}/zone-list
GET /aladdin/api/v1/zones/{zone_id}/area-list
```

#### 6. Calculate Price
```
POST /aladdin/api/v1/merchant/price-plan
Authorization: Bearer {access_token}

{
  "store_id": 123,
  "item_type": 2,
  "delivery_type": 48,
  "item_weight": 0.5,
  "recipient_city": 1,
  "recipient_zone": 298
}
```

#### 7. Get Store List
```
GET /aladdin/api/v1/stores
Authorization: Bearer {access_token}
```

### Validation Rules
- **recipient_name**: 3-100 characters
- **recipient_phone**: 11 characters (e.g., 01712345678)
- **recipient_address**: 10-220 characters
- **item_weight**: 0.5 to 10 kg
- **delivery_type**: 48 (Normal) or 12 (On Demand)
- **item_type**: 1 (Document) or 2 (Parcel)

### Webhook Integration
Pathao can send status updates to a callback URL:
- Must respond within 10 seconds
- Must return status code 202
- Must return header: `X-Pathao-Merchant-Webhook-Integration-Secret`

---

## 2. Steadfast Courier Integration

### Authentication: Header-based
- **Base URL**: `https://portal.packzy.com/api/v1`

### Configuration Fields
- `Api-Key` - API key (header)
- `Secret-Key` - Secret key (header)

### Request Headers
```
Api-Key: your-api-key
Secret-Key: your-secret-key
Content-Type: application/json
```

### API Endpoints

#### 1. Create Single Order
```
POST /create_order

{
  "invoice": "ORDER-123",           // Unique, alphanumeric with -_
  "recipient_name": "John Doe",     // Max 100 chars
  "recipient_phone": "01712345678", // Must be 11 digits
  "recipient_address": "Full address", // Max 250 chars
  "cod_amount": 1000,               // BDT, can't be less than 0
  "note": "Delivery instructions",
  "item_description": "Products",
  "total_lot": 1,
  "delivery_type": 0                // 0 = Home, 1 = Point/Hub
}

Response:
{
  "status": 200,
  "message": "Consignment has been created successfully.",
  "consignment": {
    "consignment_id": 1424107,
    "invoice": "ORDER-123",
    "tracking_code": "15BAEB8A",
    "recipient_name": "John Doe",
    "recipient_phone": "01712345678",
    "recipient_address": "Full address",
    "cod_amount": 1000,
    "status": "in_review",
    "note": "Delivery instructions",
    "created_at": "2021-03-21T07:05:31.000000Z",
    "updated_at": "2021-03-21T07:05:31.000000Z"
  }
}
```

#### 2. Bulk Order Creation
```
POST /create_order/bulk-order

{
  "data": "[{...}, {...}]"  // JSON string, max 500 items
}
```

#### 3. Check Delivery Status
```
GET /status_by_invoice/{invoice}
GET /status_by_cid/{consignment_id}
GET /status_by_trackingcode/{tracking_code}

Response:
{
  "status": 200,
  "delivery_status": "in_review"
}
```

#### 4. Check Balance
```
GET /get_balance

Response:
{
  "status": 200,
  "current_balance": 0
}
```

#### 5. Create Return Request
```
POST /create_return_request

{
  "consignment_id": 12345,
  "reason": "Customer request"
}
```

#### 6. Other Endpoints
```
GET /get_return_request/{id}
GET /get_return_requests
GET /payments
GET /payments/{payment_id}
GET /police_stations
```

### Delivery Status Values
- `in_review` - Waiting to be reviewed
- `pending` - Not delivered or cancelled yet
- `delivered` - Delivered and balance added
- `partial_delivered` - Partially delivered
- `cancelled` - Cancelled and balance updated
- `hold` - Consignment is held
- `delivered_approval_pending` - Delivered, waiting approval
- `partial_delivered_approval_pending` - Partial, waiting approval
- `cancelled_approval_pending` - Cancelled, waiting approval
- `unknown_approval_pending` - Unknown pending
- `unknown` - Unknown status

### Validation Rules
- **invoice**: Must be unique, alphanumeric with hyphens/underscores
- **recipient_name**: Max 100 characters
- **recipient_phone**: Must be 11 digits
- **recipient_address**: Max 250 characters
- **cod_amount**: Numeric, can't be less than 0
- **delivery_type**: 0 (Home) or 1 (Point/Hub)

---

## 3. Greenweb SMS Integration

### Authentication: Token-based
- **Base URL (HTML)**: `http://api.greenweb.com.bd/api.php`
- **Base URL (JSON)**: `http://api.greenweb.com.bd/api.php?json`
- **SSL Supported**: `https://api.greenweb.com.bd/api.php`
- **Alternative**: `https://api.bdbulksms.net/g_api.php`

### Configuration Fields
- `token` - API token from SMS panel
- Generate token at: https://gwb.li/token

### Send SMS

#### Method 1: POST
```
POST http://api.greenweb.com.bd/api.php
Content-Type: application/x-www-form-urlencoded

token=xxx&to=+8801712345678&message=Your message here
```

#### Method 2: GET
```
GET http://api.greenweb.com.bd/api.php?token=xxx&to=+8801712345678&message=Your+message
```

#### JSON Response
```
GET http://api.greenweb.com.bd/api.php?json&token=xxx&to=+8801712345678&message=Your+message
```

### Phone Number Format
- **Bangladesh**: +8801xxxxxxxxx (11 digits after +880)
- **Alternative**: 01xxxxxxxxx (auto-format to +880)
- **Multiple**: Separate with commas

### Character Limits
- **Single SMS**: 160 characters
- **Multi-part SMS**: 153 characters per part (160 - 7 for UDH header)

### Statistics Endpoints

All statistics endpoints use GET method with token parameter:

```
// Balance
GET https://api.bdbulksms.net/g_api.php?token=xxx&balance
GET https://api.bdbulksms.net/g_api.php?token=xxx&balance&json

// SMS Rate
GET https://api.bdbulksms.net/g_api.php?token=xxx&rate

// Total SMS sent from token
GET https://api.bdbulksms.net/g_api.php?token=xxx&tokensms

// Total SMS sent from main account
GET https://api.bdbulksms.net/g_api.php?token=xxx&totalsms

// SMS sent this month (main account)
GET https://api.bdbulksms.net/g_api.php?token=xxx&monthlysms

// SMS sent this month (token)
GET https://api.bdbulksms.net/g_api.php?token=xxx&tokenmonthlysms

// SMS sent in specific month (format: MM-YYYY)
GET https://api.bdbulksms.net/g_api.php?token=xxx&monthlysms=03-2026
GET https://api.bdbulksms.net/g_api.php?token=xxx&tokenmonthlysms=03-2026

// Expiry date
GET https://api.bdbulksms.net/g_api.php?token=xxx&expiry

// All statistics combined
GET https://api.bdbulksms.net/g_api.php?token=xxx&balance&expiry&rate&tokensms&totalsms&monthlysms&tokenmonthlysms&json
```

---

## Supabase Backend Implementation

### Database Schema

#### `integration_settings` Table
```sql
CREATE TABLE integration_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_type TEXT NOT NULL, -- 'pathao', 'steadfast', 'greenweb_sms'
  enabled BOOLEAN DEFAULT false,
  config JSONB NOT NULL, -- Encrypted credentials
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `courier_orders` Table
```sql
CREATE TABLE courier_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  courier_type TEXT NOT NULL, -- 'pathao', 'steadfast'
  consignment_id TEXT,
  tracking_code TEXT,
  status TEXT,
  delivery_fee DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `sms_logs` Table
```sql
CREATE TABLE sms_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT, -- 'sent', 'failed'
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Edge Functions

#### 1. `pathao-create-order`
```typescript
import { createClient } from '@supabase/supabase-js'

export async function handler(req: Request) {
  const { orderId } = await req.json()
  
  // 1. Get Pathao credentials from integration_settings
  // 2. Get or refresh access token
  // 3. Create order via Pathao API
  // 4. Store consignment_id in courier_orders
  // 5. Return result
}
```

#### 2. `steadfast-create-order`
```typescript
export async function handler(req: Request) {
  const { orderId } = await req.json()
  
  // 1. Get Steadfast credentials
  // 2. Create order via Steadfast API
  // 3. Store tracking_code in courier_orders
  // 4. Return result
}
```

#### 3. `send-sms`
```typescript
export async function handler(req: Request) {
  const { orderId, phone, message } = await req.json()
  
  // 1. Get Greenweb token from integration_settings
  // 2. Format phone number (+880)
  // 3. Send SMS via Greenweb API
  // 4. Log to sms_logs
  // 5. Return result
}
```

#### 4. `pathao-webhook`
```typescript
export async function handler(req: Request) {
  const webhookData = await req.json()
  
  // 1. Verify webhook signature
  // 2. Update order status in courier_orders
  // 3. Return 202 status
}
```

### Security Best Practices

1. **Encrypt API Credentials**: Store all credentials encrypted in Supabase
2. **Use Edge Functions**: Never expose API keys to frontend
3. **Token Management**: Implement automatic token refresh for Pathao
4. **Rate Limiting**: Add rate limits to prevent API abuse
5. **Error Handling**: Log all API errors for debugging
6. **Webhook Validation**: Verify webhook signatures

### Usage in Order Detail View

When viewing an order, admins can:
1. **Create Courier Order**: Select Pathao or Steadfast and create delivery
2. **Track Order**: View tracking code and current status
3. **Send SMS**: Manually trigger SMS to customer with order updates

---

## Type Definitions Location

All TypeScript type definitions are available in:
- `/src/app/types/pathao.ts` - Pathao API types
- `/src/app/types/steadfast.ts` - Steadfast API types
- `/src/app/types/greenweb-sms.ts` - Greenweb SMS API types

These types should be used in Edge Functions for type safety.

---

## Testing

### Pathao Sandbox Credentials
```
Base URL: https://courier-api-sandbox.pathao.com
Client ID: 7N1aMJQbWm
Client Secret: wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39
Username: test@pathao.com
Password: lovePathao
```

Use these credentials to test the integration before going live with production credentials.

---

## Next Steps

1. Set up Supabase project
2. Create database tables
3. Implement Edge Functions
4. Configure webhook endpoints
5. Test with sandbox/test credentials
6. Deploy to production
7. Configure production credentials in settings UI
