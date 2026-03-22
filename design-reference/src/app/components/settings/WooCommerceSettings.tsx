import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, XCircle, AlertCircle, Package, Eye, EyeOff, Save, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../utils/supabase/client';
import { WOOCOMMERCE_CONFIG } from '../../config/woocommerce';

// ─── Types ───────────────────────────────────────────────────────────────────

interface WooCommerceConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  isConnected: boolean;
  lastSync?: string;
  syncStatus?: 'success' | 'failed';
  lastSyncProducts?: string;
  lastSyncOrders?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WooCommerceSettings() {
  const [config, setConfig] = useState<WooCommerceConfig>({
    storeUrl: WOOCOMMERCE_CONFIG.storeUrl,
    consumerKey: WOOCOMMERCE_CONFIG.consumerKey,
    consumerSecret: WOOCOMMERCE_CONFIG.consumerSecret,
    isConnected: false,
  });

  const [showConsumerKey, setShowConsumerKey] = useState(false);
  const [showConsumerSecret, setShowConsumerSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingProducts, setIsSyncingProducts] = useState(false);
  const [isSyncingOrders, setIsSyncingOrders] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if credentials are configured
  const isConfigured = config.storeUrl && 
                       config.consumerKey && 
                       config.consumerKey !== 'ck_your_consumer_key_here' &&
                       config.consumerSecret && 
                       config.consumerSecret !== 'cs_your_consumer_secret_here';

  // No need to load settings from backend - we're using config file
  // Remove the useEffect that calls loadSettings

  const handleTestConnection = async () => {
    if (!config.storeUrl || !config.consumerKey || !config.consumerSecret) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsTesting(true);
    
    try {
      // Test by attempting to fetch WooCommerce system status
      const wooAuth = btoa(`${config.consumerKey}:${config.consumerSecret}`);
      const testUrl = `${config.storeUrl}/wp-json/wc/v3/system_status`;
      
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Basic ${wooAuth}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Connection failed: ${response.statusText}`);
      }
      
      setConfig({
        ...config,
        isConnected: true,
        syncStatus: 'success',
      });
      
      toast.success('Connection test successful!');
    } catch (error: any) {
      console.error('Connection test error:', error);
      setConfig({
        ...config,
        isConnected: false,
        syncStatus: 'failed',
      });
      toast.error('Connection test failed: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!config.storeUrl || !config.consumerKey || !config.consumerSecret) {
      toast.error('Please fill all required fields');
      return;
    }

    setIsSaving(true);
    
    try {
      console.log('Saving WooCommerce settings...');
      console.log('Store URL:', config.storeUrl);
      console.log('Consumer Key:', config.consumerKey);
      console.log('Consumer Secret:', config.consumerSecret);

      const response = await fetch(
        `${API_BASE_URL}/woo/settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${config.consumerKey}:${config.consumerSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_url: config.storeUrl,
            consumer_key: config.consumerKey,
            consumer_secret: config.consumerSecret,
            auto_sync_enabled: true,
            sync_interval_minutes: 15,
          }),
        }
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        let error;
        try {
          error = JSON.parse(errorText);
        } catch {
          error = { error: errorText };
        }
        throw new Error(error.error || 'Failed to save settings');
      }

      const result = await response.json();
      console.log('Save successful:', result);

      toast.success('WooCommerce settings saved successfully');
      setConfig({ ...config, isConnected: true });
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save settings: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncProducts = async () => {
    if (!isConfigured) {
      toast.error('Please configure WooCommerce credentials in /src/app/config/woocommerce.ts first');
      return;
    }

    setIsSyncingProducts(true);
    toast.info('Starting product synchronization...');
    
    try {
      console.log('=== PRODUCT SYNC DEBUG ===');
      console.log('Store URL:', config.storeUrl);
      console.log('Consumer Key:', config.consumerKey.substring(0, 10) + '...');
      console.log('API Endpoint:', `${API_BASE_URL}/woo/sync-products-simple`);

      const response = await fetch(
        `${API_BASE_URL}/woo/sync-products-simple`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_url: config.storeUrl,
            consumer_key: config.consumerKey,
            consumer_secret: config.consumerSecret,
          }),
        }
      );

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Response body (raw):', responseText);
      
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch (e) {
        errorData = { error: responseText };
      }
      
      if (!response.ok) {
        console.error('❌ Sync failed with error:', errorData);
        throw new Error(errorData.error || responseText || 'Sync failed');
      }

      console.log('✅ Sync success:', errorData);
      
      setConfig({
        ...config,
        lastSyncProducts: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        syncStatus: 'success',
        isConnected: true,
      });
      
      toast.success(errorData.message || `Successfully synced ${errorData.imported} products`);
    } catch (error: any) {
      console.error('❌ PRODUCT SYNC ERROR:', error);
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      toast.error('Product sync failed: ' + error.message);
    } finally {
      setIsSyncingProducts(false);
    }
  };

  const handleSyncOrders = async () => {
    if (!isConfigured) {
      toast.error('Please configure WooCommerce credentials in /src/app/config/woocommerce.ts first');
      return;
    }

    setIsSyncingOrders(true);
    toast.info('Starting order synchronization...');
    
    try {
      console.log('Syncing orders...');
      console.log('Store URL:', config.storeUrl);
      console.log('Consumer Key:', config.consumerKey.substring(0, 10) + '...');

      const response = await fetch(
        `${API_BASE_URL}/woo/sync-orders-simple`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            store_url: config.storeUrl,
            consumer_key: config.consumerKey,
            consumer_secret: config.consumerSecret,
          }),
        }
      );

      console.log('Sync response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Sync error response:', errorData);
        throw new Error(errorData.error || 'Sync failed');
      }

      const data = await response.json();
      console.log('Sync success:', data);
      
      setConfig({
        ...config,
        lastSyncOrders: new Date().toISOString(),
        lastSync: new Date().toISOString(),
        syncStatus: 'success',
        isConnected: true,
      });
      
      toast.success(data.message || `Successfully synced ${data.imported} orders`);
    } catch (error: any) {
      console.error('Order sync error:', error);
      console.error('Error details:', error.message);
      toast.error('Order sync failed: ' + error.message);
    } finally {
      setIsSyncingOrders(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configuration Notice */}
      {!isConfigured && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900 mb-1">WooCommerce Not Configured</h4>
                <p className="text-sm text-yellow-800 mb-2">
                  To use WooCommerce integration, please edit the config file:
                </p>
                <code className="block bg-yellow-100 text-yellow-900 px-3 py-2 rounded text-sm font-mono">
                  /src/app/config/woocommerce.ts
                </code>
                <p className="text-sm text-yellow-800 mt-2">
                  Replace the placeholder values with your actual WooCommerce store URL, Consumer Key, and Consumer Secret.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>WooCommerce Integration</CardTitle>
              <CardDescription className="mt-1">
                Connect your WooCommerce store to sync orders automatically
              </CardDescription>
            </div>
            <Badge
              className={
                config.isConnected && config.syncStatus === 'success'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }
            >
              {config.isConnected && config.syncStatus === 'success' ? (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Disconnected
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Last Order Sync</p>
                <p className="text-xs text-gray-500 mt-1">
                  {config.lastSyncOrders ? new Date(config.lastSyncOrders).toLocaleString() : 'Never'}
                </p>
              </div>
              <Button 
                onClick={handleSyncOrders} 
                variant="outline" 
                size="sm"
                disabled={isSyncingOrders || !isConfigured}
              >
                {isSyncingOrders ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync Orders
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-700">Last Product Sync</p>
                <p className="text-xs text-gray-500 mt-1">
                  {config.lastSyncProducts ? new Date(config.lastSyncProducts).toLocaleString() : 'Never'}
                </p>
              </div>
              <Button 
                onClick={handleSyncProducts} 
                variant="outline" 
                size="sm"
                disabled={isSyncingProducts || !isConfigured}
              >
                {isSyncingProducts ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Sync Products
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>API Configuration</CardTitle>
          <CardDescription>
            Enter your WooCommerce REST API credentials. You can generate these from your WordPress admin panel.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Store URL */}
          <div className="space-y-2">
            <Label htmlFor="storeUrl">Store URL *</Label>
            <div className="flex gap-2">
              <Input
                id="storeUrl"
                type="url"
                value={config.storeUrl}
                onChange={(e) => setConfig({ ...config, storeUrl: e.target.value })}
                placeholder="https://your-store.com"
                className="flex-1"
              />
              <Button variant="outline" size="icon" asChild>
                <a href={config.storeUrl} target="_blank" rel="noopener noreferrer">
                  <Package className="w-4 h-4" />
                </a>
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Your WooCommerce store's base URL (e.g., https://example.com)
            </p>
          </div>

          {/* Consumer Key */}
          <div className="space-y-2">
            <Label htmlFor="consumerKey">Consumer Key *</Label>
            <div className="flex gap-2">
              <Input
                id="consumerKey"
                type={showConsumerKey ? 'text' : 'password'}
                value={config.consumerKey}
                onChange={(e) => setConfig({ ...config, consumerKey: e.target.value })}
                placeholder="ck_xxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowConsumerKey(!showConsumerKey)}
              >
                {showConsumerKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              The consumer key from WooCommerce &gt; Settings &gt; Advanced &gt; REST API
            </p>
          </div>

          {/* Consumer Secret */}
          <div className="space-y-2">
            <Label htmlFor="consumerSecret">Consumer Secret *</Label>
            <div className="flex gap-2">
              <Input
                id="consumerSecret"
                type={showConsumerSecret ? 'text' : 'password'}
                value={config.consumerSecret}
                onChange={(e) => setConfig({ ...config, consumerSecret: e.target.value })}
                placeholder="cs_xxxxxxxxxxxxxxxxxxxxx"
                className="flex-1 font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowConsumerSecret(!showConsumerSecret)}
              >
                {showConsumerSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              The consumer secret from WooCommerce &gt; Settings &gt; Advanced &gt; REST API
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleTestConnection} variant="outline" disabled={isTesting}>
              {isTesting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Generate API Keys</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700">
            <li>
              Log in to your WordPress admin dashboard
            </li>
            <li>
              Navigate to <strong>WooCommerce → Settings → Advanced → REST API</strong>
            </li>
            <li>
              Click <strong>"Add key"</strong>
            </li>
            <li>
              Enter a description (e.g., "ERP Integration")
            </li>
            <li>
              Select <strong>User</strong> with administrator privileges
            </li>
            <li>
              Set <strong>Permissions</strong> to <strong>"Read/Write"</strong>
            </li>
            <li>
              Click <strong>"Generate API key"</strong>
            </li>
            <li>
              Copy the <strong>Consumer key</strong> and <strong>Consumer secret</strong> and paste them above
            </li>
          </ol>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Store these credentials securely. The Consumer Secret will only be shown once and cannot be retrieved later.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Synchronization Settings</CardTitle>
          <CardDescription>
            Configure how products and orders are synchronized from WooCommerce
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📦 Product Sync</h4>
            <p className="text-sm text-blue-800">
              <strong>All products</strong> will be synced from WooCommerce including:
            </p>
            <ul className="list-disc list-inside text-sm text-blue-800 mt-2 space-y-1">
              <li>Product Name</li>
              <li>SKU</li>
              <li>Category</li>
              <li>Regular Price</li>
              <li>Product Images</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-2">📋 Order Sync</h4>
            <p className="text-sm text-yellow-800">
              <strong>Only the 100 most recent orders</strong> will be synced (sorted by date, newest first).
            </p>
            <p className="text-sm text-yellow-800 mt-2">
              New orders after initial sync will be added when you click "Sync Orders" again.
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Automatic Sync</p>
              <p className="text-sm text-gray-500 mt-1">
                Automatically sync new orders every 15 minutes
              </p>
            </div>
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Enabled
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Order Status Updates</p>
              <p className="text-sm text-gray-500 mt-1">
                Push order status updates back to WooCommerce
              </p>
            </div>
            <Badge className="bg-gray-100 text-gray-600">
              Coming Soon
            </Badge>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Customer Data Sync</p>
              <p className="text-sm text-gray-500 mt-1">
                Sync customer information and prescription data
              </p>
            </div>
            <Badge className="bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Enabled
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}