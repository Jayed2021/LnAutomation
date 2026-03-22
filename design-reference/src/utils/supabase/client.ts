import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

// Re-export for easier importing
export { projectId, publicAnonKey };

// Create a singleton Supabase client for the browser
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

// Get the base API URL for server routes
export const API_BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-4e2781f4`;

// Helper to make authenticated API requests
export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    // Don't fallback to anon key - this will cause 401 errors
    // Let the request fail so we can redirect to login
    console.warn('No active session - API request will fail');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}