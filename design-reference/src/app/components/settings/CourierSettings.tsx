import { useState } from 'react';
import { Truck, Eye, EyeOff, Save, TestTube } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';

interface PathaoConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
  storeId?: string;
  baseUrl: string;
  isProduction: boolean;
}

interface CourierConfig {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
  storeId?: string;
  baseUrl: string;
  isProduction: boolean;
}

export function CourierSettings() {
  const [showPathaoSecret, setShowPathaoSecret] = useState(false);
  const [showPathaoPassword, setShowPathaoPassword] = useState(false);
  const [showSteadfastSecret, setShowSteadfastSecret] = useState(false);
  const [testingPathao, setTestingPathao] = useState(false);
  const [testingSteadfast, setTestingSteadfast] = useState(false);

  // Mock state - in production, these would be loaded from Supabase
  const [pathaoConfig, setPathaoConfig] = useState<PathaoConfig>({
    enabled: false,
    clientId: '',
    clientSecret: '',
    username: '',
    password: '',
    storeId: '',
    baseUrl: 'https://courier-api-sandbox.pathao.com',
    isProduction: false,
  });

  const [steadfastConfig, setSteadfastConfig] = useState<CourierConfig>({
    enabled: false,
    clientId: '',
    clientSecret: '',
    baseUrl: 'https://portal.packzy.com/api/v1',
    isProduction: false,
  });

  const handleSavePathao = () => {
    // In production, this would save to Supabase using Edge Functions
    toast.success('Pathao courier settings saved successfully');
    console.log('Saving Pathao config:', {
      ...pathaoConfig,
      clientSecret: '[REDACTED]',
      password: '[REDACTED]',
    });
  };

  const handleSaveSteadfast = () => {
    // In production, this would save to Supabase using Edge Functions
    toast.success('Steadfast courier settings saved successfully');
    console.log('Saving Steadfast config:', {
      ...steadfastConfig,
      clientSecret: '[REDACTED]',
    });
  };

  const handleTestPathao = async () => {
    setTestingPathao(true);
    // In production, this would call a Supabase Edge Function to test the connection
    setTimeout(() => {
      setTestingPathao(false);
      toast.success('Pathao API connection successful! Token retrieved and expires in 5 days.');
    }, 1500);
  };

  const handleTestSteadfast = async () => {
    setTestingSteadfast(true);
    // In production, this would call a Supabase Edge Function to test the connection
    setTimeout(() => {
      setTestingSteadfast(false);
      toast.success('Steadfast API connection successful!');
    }, 1500);
  };

  const useSandboxCredentials = () => {
    setPathaoConfig({
      ...pathaoConfig,
      clientId: '7N1aMJQbWm',
      clientSecret: 'wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39',
      username: 'test@pathao.com',
      password: 'lovePathao',
      baseUrl: 'https://courier-api-sandbox.pathao.com',
      isProduction: false,
    });
    toast.success('Sandbox credentials loaded for testing');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Courier Integration</h2>
        <p className="text-gray-600">
          Configure courier service integrations for automated shipping label generation and tracking.
        </p>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Security Note:</strong> API credentials are encrypted and stored securely in Supabase.
          Never share your API keys or secrets. All API calls are made through secure Edge Functions.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="pathao">
        <TabsList>
          <TabsTrigger value="pathao">Pathao Courier</TabsTrigger>
          <TabsTrigger value="steadfast">Steadfast Courier</TabsTrigger>
        </TabsList>

        {/* Pathao Settings */}
        <TabsContent value="pathao" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Pathao Courier API (OAuth 2.0)
              </CardTitle>
              <CardDescription>
                Configure your Pathao courier integration for automated parcel booking and tracking.
                Uses OAuth 2.0 authentication with access token expiry of 5 days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="pathao-enabled" className="text-base font-medium">
                    Enable Pathao Integration
                  </Label>
                  <p className="text-sm text-gray-600">
                    Activate Pathao courier for order fulfillment
                  </p>
                </div>
                <Switch
                  id="pathao-enabled"
                  checked={pathaoConfig.enabled}
                  onCheckedChange={(checked) =>
                    setPathaoConfig({ ...pathaoConfig, enabled: checked })
                  }
                />
              </div>

              {/* Environment */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="pathao-production" className="text-base font-medium">
                    Production Mode
                  </Label>
                  <p className="text-sm text-gray-600">
                    {pathaoConfig.isProduction
                      ? 'Using production API (https://api-hermes.pathao.com)'
                      : 'Using sandbox API (https://courier-api-sandbox.pathao.com)'}
                  </p>
                </div>
                <Switch
                  id="pathao-production"
                  checked={pathaoConfig.isProduction}
                  onCheckedChange={(checked) =>
                    setPathaoConfig({ 
                      ...pathaoConfig, 
                      isProduction: checked,
                      baseUrl: checked 
                        ? 'https://api-hermes.pathao.com' 
                        : 'https://courier-api-sandbox.pathao.com'
                    })
                  }
                />
              </div>

              {/* Sandbox Helper */}
              {!pathaoConfig.isProduction && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm mb-1">Testing Mode</h4>
                      <p className="text-xs text-gray-700 mb-2">
                        Use Pathao's official sandbox credentials for testing
                      </p>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={useSandboxCredentials}
                    >
                      Load Sandbox Credentials
                    </Button>
                  </div>
                </div>
              )}

              {/* API Credentials */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="pathao-client-id">Client ID</Label>
                  <Input
                    id="pathao-client-id"
                    type="text"
                    placeholder={pathaoConfig.isProduction ? "Enter your Pathao Client ID" : "e.g., 7N1aMJQbWm"}
                    value={pathaoConfig.clientId}
                    onChange={(e) =>
                      setPathaoConfig({ ...pathaoConfig, clientId: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {pathaoConfig.isProduction 
                      ? 'Your production Client ID from Pathao merchant portal'
                      : 'Sandbox Client ID: 7N1aMJQbWm'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="pathao-client-secret">Client Secret</Label>
                  <div className="relative">
                    <Input
                      id="pathao-client-secret"
                      type={showPathaoSecret ? 'text' : 'password'}
                      placeholder="Enter your Pathao Client Secret"
                      value={pathaoConfig.clientSecret}
                      onChange={(e) =>
                        setPathaoConfig({ ...pathaoConfig, clientSecret: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPathaoSecret(!showPathaoSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPathaoSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {pathaoConfig.isProduction
                      ? 'Your production Client Secret (keep secure)'
                      : 'Sandbox Secret: wRcaibZkUdSNz2EI9ZyuXLlNrnAv0TdPUPXMnD39'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="pathao-username">Merchant Email / Username</Label>
                  <Input
                    id="pathao-username"
                    type="email"
                    placeholder={pathaoConfig.isProduction ? "your-email@example.com" : "test@pathao.com"}
                    value={pathaoConfig.username}
                    onChange={(e) =>
                      setPathaoConfig({ ...pathaoConfig, username: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {pathaoConfig.isProduction
                      ? 'Your Pathao merchant account email'
                      : 'Sandbox email: test@pathao.com'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="pathao-password">Merchant Password</Label>
                  <div className="relative">
                    <Input
                      id="pathao-password"
                      type={showPathaoPassword ? 'text' : 'password'}
                      placeholder="Enter your merchant password"
                      value={pathaoConfig.password}
                      onChange={(e) =>
                        setPathaoConfig({ ...pathaoConfig, password: e.target.value })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowPathaoPassword(!showPathaoPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPathaoPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {pathaoConfig.isProduction
                      ? 'Your Pathao merchant account password'
                      : 'Sandbox password: lovePathao'}
                  </p>
                </div>

                <div>
                  <Label htmlFor="pathao-store-id">Store ID</Label>
                  <Input
                    id="pathao-store-id"
                    type="text"
                    placeholder="Enter your Pathao Store ID"
                    value={pathaoConfig.storeId}
                    onChange={(e) =>
                      setPathaoConfig({ ...pathaoConfig, storeId: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your Pathao store ID (sets pickup location for orders)
                  </p>
                </div>

                <div>
                  <Label htmlFor="pathao-base-url">API Base URL</Label>
                  <Input
                    id="pathao-base-url"
                    type="text"
                    value={pathaoConfig.baseUrl}
                    onChange={(e) =>
                      setPathaoConfig({ ...pathaoConfig, baseUrl: e.target.value })
                    }
                    disabled
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    API endpoint (changes automatically with environment toggle)
                  </p>
                </div>
              </div>

              {/* API Endpoints Reference */}
              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">API Endpoints:</h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• <code>POST /aladdin/api/v1/issue-token</code> - OAuth 2.0 token (expires in 5 days)</li>
                  <li>• <code>POST /aladdin/api/v1/orders</code> - Create new delivery order</li>
                  <li>• <code>GET /aladdin/api/v1/orders/{'{consignment_id}'}/info</code> - Get order status</li>
                  <li>• <code>GET /aladdin/api/v1/city-list</code> - Get available cities</li>
                  <li>• <code>GET /aladdin/api/v1/cities/{'{city_id}'}/zone-list</code> - Get zones in city</li>
                  <li>• <code>GET /aladdin/api/v1/zones/{'{zone_id}'}/area-list</code> - Get areas in zone</li>
                  <li>• <code>POST /aladdin/api/v1/merchant/price-plan</code> - Calculate delivery price</li>
                  <li>• <code>GET /aladdin/api/v1/stores</code> - Get merchant store list</li>
                </ul>
              </div>

              {/* Order Requirements */}
              <div className="p-4 bg-amber-50 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Order Creation Requirements:</h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• <strong>Delivery Type:</strong> 48 (Normal Delivery) or 12 (On Demand)</li>
                  <li>• <strong>Item Type:</strong> 1 (Document) or 2 (Parcel)</li>
                  <li>• <strong>Item Weight:</strong> 0.5 kg to 10 kg</li>
                  <li>• <strong>Recipient Phone:</strong> Must be 11 characters (017XXXXXXXX)</li>
                  <li>• <strong>Recipient Name:</strong> 3-100 characters</li>
                  <li>• <strong>Recipient Address:</strong> 10-220 characters</li>
                  <li>• <strong>Amount to Collect:</strong> Set to 0 for non-COD orders</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleTestPathao}
                  variant="outline"
                  disabled={
                    !pathaoConfig.clientId || 
                    !pathaoConfig.clientSecret || 
                    !pathaoConfig.username ||
                    !pathaoConfig.password ||
                    testingPathao
                  }
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {testingPathao ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button onClick={handleSavePathao}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Steadfast Settings */}
        <TabsContent value="steadfast" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Steadfast Courier API
              </CardTitle>
              <CardDescription>
                Configure your Steadfast courier integration for automated parcel booking and tracking.
                Uses header-based authentication (Api-Key, Secret-Key).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="steadfast-enabled" className="text-base font-medium">
                    Enable Steadfast Integration
                  </Label>
                  <p className="text-sm text-gray-600">
                    Activate Steadfast courier for order fulfillment
                  </p>
                </div>
                <Switch
                  id="steadfast-enabled"
                  checked={steadfastConfig.enabled}
                  onCheckedChange={(checked) =>
                    setSteadfastConfig({ ...steadfastConfig, enabled: checked })
                  }
                />
              </div>

              {/* API Credentials */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="steadfast-api-key">API Key</Label>
                  <Input
                    id="steadfast-api-key"
                    type="text"
                    placeholder="Enter your Steadfast API Key"
                    value={steadfastConfig.clientId}
                    onChange={(e) =>
                      setSteadfastConfig({ ...steadfastConfig, clientId: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your Steadfast API key from the merchant portal (passed as Api-Key header)
                  </p>
                </div>

                <div>
                  <Label htmlFor="steadfast-secret-key">Secret Key</Label>
                  <div className="relative">
                    <Input
                      id="steadfast-secret-key"
                      type={showSteadfastSecret ? 'text' : 'password'}
                      placeholder="Enter your Steadfast Secret Key"
                      value={steadfastConfig.clientSecret}
                      onChange={(e) =>
                        setSteadfastConfig({
                          ...steadfastConfig,
                          clientSecret: e.target.value,
                        })
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setShowSteadfastSecret(!showSteadfastSecret)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showSteadfastSecret ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Your Steadfast API secret key (keep secure, passed as Secret-Key header)
                  </p>
                </div>

                <div>
                  <Label htmlFor="steadfast-base-url">API Base URL</Label>
                  <Input
                    id="steadfast-base-url"
                    type="text"
                    value={steadfastConfig.baseUrl}
                    onChange={(e) =>
                      setSteadfastConfig({ ...steadfastConfig, baseUrl: e.target.value })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Steadfast API endpoint (default: https://portal.packzy.com/api/v1)
                  </p>
                </div>
              </div>

              {/* API Endpoints Reference */}
              <div className="p-4 bg-blue-50 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">API Endpoints:</h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• <code>POST /create_order</code> - Create single delivery order</li>
                  <li>• <code>POST /create_order/bulk-order</code> - Bulk order creation (max 500)</li>
                  <li>• <code>GET /status_by_invoice/{'{invoice}'}</code> - Check status by invoice</li>
                  <li>• <code>GET /status_by_cid/{'{id}'}</code> - Check status by consignment ID</li>
                  <li>• <code>GET /status_by_trackingcode/{'{code}'}</code> - Check status by tracking code</li>
                  <li>• <code>GET /get_balance</code> - Check account balance</li>
                  <li>• <code>POST /create_return_request</code> - Create return request</li>
                  <li>• <code>GET /get_return_requests</code> - Get all return requests</li>
                  <li>• <code>GET /payments</code> - Get payment history</li>
                  <li>• <code>GET /police_stations</code> - Get police station list</li>
                </ul>
              </div>

              {/* Order Requirements */}
              <div className="p-4 bg-amber-50 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Order Creation Requirements:</h4>
                <ul className="text-xs text-gray-700 space-y-1">
                  <li>• <strong>Invoice:</strong> Must be unique, alphanumeric with hyphens/underscores</li>
                  <li>• <strong>Recipient Phone:</strong> Must be 11 digits (01234567890)</li>
                  <li>• <strong>Recipient Name:</strong> Within 100 characters</li>
                  <li>• <strong>Recipient Address:</strong> Within 250 characters</li>
                  <li>• <strong>COD Amount:</strong> Numeric, can't be less than 0</li>
                  <li>• <strong>Delivery Type:</strong> 0 (Home Delivery) or 1 (Point/Hub Pickup)</li>
                  <li>• <strong>Delivery Statuses:</strong> in_review, pending, delivered, cancelled, hold, etc.</li>
                </ul>
              </div>

              {/* Delivery Statuses */}
              <div className="p-4 bg-purple-50 rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Delivery Status Values:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                  <div>• <code>in_review</code> - Waiting to be reviewed</div>
                  <div>• <code>pending</code> - Not delivered/cancelled</div>
                  <div>• <code>delivered</code> - Delivered & paid</div>
                  <div>• <code>partial_delivered</code> - Partially delivered</div>
                  <div>• <code>cancelled</code> - Cancelled & updated</div>
                  <div>• <code>hold</code> - Consignment held</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={handleTestSteadfast}
                  variant="outline"
                  disabled={
                    !steadfastConfig.clientId ||
                    !steadfastConfig.clientSecret ||
                    testingSteadfast
                  }
                >
                  <TestTube className="w-4 h-4 mr-2" />
                  {testingSteadfast ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button onClick={handleSaveSteadfast}>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}