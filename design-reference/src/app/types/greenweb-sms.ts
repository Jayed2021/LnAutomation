/**
 * Greenweb SMS API Type Definitions
 * Based on official API documentation
 * 
 * Base URL (HTML): http://api.greenweb.com.bd/api.php
 * Base URL (JSON): http://api.greenweb.com.bd/api.php?json
 * SSL Supported: https://api.greenweb.com.bd/api.php
 * Alternative: https://api.bdbulksms.net/g_api.php
 * 
 * Request Method: POST or GET
 * Required Parameters: token, to, message
 */

// SMS Sending Types
export interface GreenwebSendSMSRequest {
  token: string; // API token from SMS panel
  to: string; // Phone number(s) - format: +8801xxxxxxxxx or 01xxxxxxxxx (comma-separated for multiple)
  message: string; // SMS message content
}

export interface GreenwebSendSMSResponse {
  // Response format depends on whether ?json is used
  // HTML output: Plain text response
  // JSON output: Structured JSON response
  status?: string;
  message?: string;
}

// Balance Check Types
export interface GreenwebBalanceResponse {
  balance?: number | string;
}

// Rate Check Types
export interface GreenwebRateResponse {
  rate?: number | string;
}

// SMS Statistics Types
export interface GreenwebStatisticsResponse {
  balance?: number | string; // Current balance
  expiry?: string; // SMS validity/expiry date
  rate?: number | string; // SMS rate
  tokensms?: number | string; // Total SMS sent from this token
  totalsms?: number | string; // Total SMS sent from main account
  monthlysms?: number | string; // SMS sent this month from main account
  tokenmonthlysms?: number | string; // SMS sent this month from this token
}

// API Endpoints
export const GREENWEB_ENDPOINTS = {
  SEND_SMS_HTML: 'http://api.greenweb.com.bd/api.php',
  SEND_SMS_JSON: 'http://api.greenweb.com.bd/api.php?json',
  SEND_SMS_SSL: 'https://api.greenweb.com.bd/api.php',
  
  // Alternative endpoints
  ALT_SEND_SMS: 'https://api.bdbulksms.net/g_api.php',
  ALT_SEND_SMS_JSON: 'https://api.bdbulksms.net/g_api.php?json',
  
  // Statistics endpoints (append token parameter)
  GET_BALANCE: 'https://api.bdbulksms.net/g_api.php?token={token}&balance',
  GET_BALANCE_JSON: 'https://api.bdbulksms.net/g_api.php?token={token}&balance&json',
  GET_RATE: 'https://api.bdbulksms.net/g_api.php?token={token}&rate',
  GET_TOKEN_SMS: 'https://api.bdbulksms.net/g_api.php?token={token}&tokensms',
  GET_TOTAL_SMS: 'https://api.bdbulksms.net/g_api.php?token={token}&totalsms',
  GET_MONTHLY_SMS: 'https://api.bdbulksms.net/g_api.php?token={token}&monthlysms',
  GET_TOKEN_MONTHLY_SMS: 'https://api.bdbulksms.net/g_api.php?token={token}&tokenmonthlysms',
  GET_EXPIRY: 'https://api.bdbulksms.net/g_api.php?token={token}&expiry',
  GET_ALL_STATS: 'https://api.bdbulksms.net/g_api.php?token={token}&balance&expiry&rate&tokensms&totalsms&monthlysms&tokenmonthlysms',
  GET_ALL_STATS_JSON: 'https://api.bdbulksms.net/g_api.php?token={token}&balance&expiry&rate&tokensms&totalsms&monthlysms&tokenmonthlysms&json',
} as const;

// Configuration
export interface GreenwebSMSConfig {
  token: string;
  useSSL?: boolean; // Whether to use HTTPS
  useJSON?: boolean; // Whether to use JSON output format
}

// Phone number format helper
export const formatBDPhone = (phone: string): string => {
  // Remove spaces and dashes
  let cleaned = phone.replace(/[\s-]/g, '');
  
  // Add country code if not present
  if (cleaned.startsWith('01')) {
    cleaned = '+880' + cleaned;
  } else if (cleaned.startsWith('8801')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+880')) {
    cleaned = '+880' + cleaned;
  }
  
  return cleaned;
};

// SMS message helper (character limit for single SMS is 160 characters)
export const SMS_CHARACTER_LIMIT = 160;
export const SMS_MULTI_PART_LIMIT = 153; // For multi-part SMS (160 - 7 for UDH header)

export const calculateSMSParts = (message: string): number => {
  const length = message.length;
  if (length <= SMS_CHARACTER_LIMIT) return 1;
  return Math.ceil(length / SMS_MULTI_PART_LIMIT);
};
