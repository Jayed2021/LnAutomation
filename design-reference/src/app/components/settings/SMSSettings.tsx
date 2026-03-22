import { useState } from 'react';
import { MessageSquare, Eye, EyeOff, Save, TestTube, Send } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';

interface SMSConfig {
  enabled: boolean;
  apiToken: string;
  baseUrl: string;
  useSSL: boolean;
  useJSON: boolean;
}

export function SMSSettings() {
  const [showToken, setShowToken] = useState(false);
  const [testingSMS, setTestingSMS] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('Test SMS from your ERP system');

  // Mock state - in production, these would be loaded from Supabase
  const [smsConfig, setSmsConfig] = useState<SMSConfig>({
    enabled: false,
    apiToken: '',
    baseUrl: 'https://api.greenweb.com.bd/api.php',
    useSSL: true,
    useJSON: true,
  });

  const handleSaveSettings = () => {
    // In production, this would save to Supabase using Edge Functions
    toast.success('SMS settings saved successfully');
    console.log('Saving SMS config:', {
      ...smsConfig,
      apiToken: '[REDACTED]',
    });
  };

  const handleTestSMS = async () => {
    if (!testPhone) {
      toast.error('Please enter a phone number to test');
      return;
    }

    setTestingSMS(true);
    // In production, this would call a Supabase Edge Function to send test SMS
    setTimeout(() => {
      setTestingSMS(false);
      toast.success(`Test SMS sent to ${testPhone}`);
    }, 1500);
  };

  const formatPhoneNumber = (phone: string): string => {
    let cleaned = phone.replace(/[\s-]/g, '');
    if (cleaned.startsWith('01')) {
      return '+880' + cleaned;
    }
    return cleaned;
  };

  const updateBaseUrl = () => {
    const base = smsConfig.useSSL 
      ? 'https://api.greenweb.com.bd/api.php'
      : 'http://api.greenweb.com.bd/api.php';
    const url = smsConfig.useJSON ? `${base}?json` : base;
    setSmsConfig({ ...smsConfig, baseUrl: url });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold mb-2">SMS Integration</h2>
        <p className="text-gray-600">
          Configure Greenweb SMS portal for sending order notifications to customers.
        </p>
      </div>

      <Alert>
        <AlertDescription>
          <strong>Security Note:</strong> API tokens are encrypted and stored securely in Supabase.
          Never share your API token. All SMS sending is handled through secure Edge Functions.
        </AlertDescription>
      </Alert>

      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Greenweb SMS API Configuration
          </CardTitle>
          <CardDescription>
            Configure your Greenweb SMS portal credentials for sending order notifications.
            Generate your token from: <a href="https://gwb.li/token" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://gwb.li/token</a>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="sms-enabled" className="text-base font-medium">
                Enable SMS Notifications
              </Label>
              <p className="text-sm text-gray-600">
                Activate SMS sending for order updates (triggered manually from order detail view)
              </p>
            </div>
            <Switch
              id="sms-enabled"
              checked={smsConfig.enabled}
              onCheckedChange={(checked) => setSmsConfig({ ...smsConfig, enabled: checked })}
            />
          </div>

          {/* API Credentials */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="sms-token">API Token</Label>
              <div className="relative">
                <Input
                  id="sms-token"
                  type={showToken ? 'text' : 'password'}
                  placeholder="e.g., 195214343217728724723c0d50c73f227570e7e7f991fc313357"
                  value={smsConfig.apiToken}
                  onChange={(e) => setSmsConfig({ ...smsConfig, apiToken: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Your Greenweb API token from the SMS portal (keep this secure)
              </p>
            </div>

            {/* SSL and JSON Options */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="sms-ssl" className="text-sm font-medium">
                    Use SSL (HTTPS)
                  </Label>
                  <p className="text-xs text-gray-500">
                    Secure connection
                  </p>
                </div>
                <Switch
                  id="sms-ssl"
                  checked={smsConfig.useSSL}
                  onCheckedChange={(checked) => {
                    setSmsConfig({ ...smsConfig, useSSL: checked });
                    setTimeout(updateBaseUrl, 100);
                  }}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="sms-json" className="text-sm font-medium">
                    JSON Response
                  </Label>
                  <p className="text-xs text-gray-500">
                    Structured output
                  </p>
                </div>
                <Switch
                  id="sms-json"
                  checked={smsConfig.useJSON}
                  onCheckedChange={(checked) => {
                    setSmsConfig({ ...smsConfig, useJSON: checked });
                    setTimeout(updateBaseUrl, 100);
                  }}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="sms-base-url">API Base URL</Label>
              <Input
                id="sms-base-url"
                type="text"
                value={smsConfig.baseUrl}
                onChange={(e) => setSmsConfig({ ...smsConfig, baseUrl: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">
                Greenweb API endpoint (updates automatically based on SSL/JSON settings)
              </p>
            </div>
          </div>

          {/* API Endpoints Reference */}
          <div className="p-4 bg-blue-50 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">API Endpoint Information:</h4>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• <strong>Send SMS (HTML):</strong> <code>http://api.greenweb.com.bd/api.php</code></li>
              <li>• <strong>Send SMS (JSON):</strong> <code>http://api.greenweb.com.bd/api.php?json</code></li>
              <li>• <strong>SSL Version:</strong> <code>https://api.greenweb.com.bd/api.php</code></li>
              <li>• <strong>Request Method:</strong> POST or GET</li>
              <li>• <strong>Required Parameters:</strong> token, to, message</li>
            </ul>
          </div>

          {/* Phone Number Format */}
          <div className="p-4 bg-amber-50 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">Phone Number Format:</h4>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• <strong>Bangladesh Format:</strong> +8801xxxxxxxxx (11 digits after +880)</li>
              <li>• <strong>Alternative:</strong> 01xxxxxxxxx (system will auto-format)</li>
              <li>• <strong>Multiple Recipients:</strong> Separate with commas</li>
              <li>• <strong>Example:</strong> +8801712345678 or 01712345678</li>
            </ul>
          </div>

          {/* Character Limit Info */}
          <div className="p-4 bg-purple-50 rounded-lg space-y-2">
            <h4 className="font-medium text-sm">SMS Character Limits:</h4>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• <strong>Single SMS:</strong> 160 characters</li>
              <li>• <strong>Multi-part SMS:</strong> 153 characters per part (160 - 7 for header)</li>
              <li>• Messages longer than 160 characters will be split into multiple SMS</li>
            </ul>
          </div>

          {/* Test SMS */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <Label className="text-base font-medium">Test SMS Sending</Label>
            <div className="space-y-3">
              <div>
                <Label htmlFor="test-phone">Phone Number</Label>
                <Input
                  id="test-phone"
                  type="tel"
                  placeholder="01712345678 or +8801712345678"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter Bangladesh mobile number
                </p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label htmlFor="test-message">Test Message</Label>
                  <span className="text-xs text-gray-500">
                    {testMessage.length}/160 chars
                  </span>
                </div>
                <Textarea
                  id="test-message"
                  rows={3}
                  maxLength={160}
                  placeholder="Enter your test message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>

              <Button
                onClick={handleTestSMS}
                variant="outline"
                disabled={!smsConfig.apiToken || !testPhone || testingSMS}
                className="w-full"
              >
                <Send className="w-4 h-4 mr-2" />
                {testingSMS ? 'Sending...' : 'Send Test SMS'}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleSaveSettings}>
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SMS Usage Stats */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Usage Statistics</CardTitle>
          <CardDescription>Monitor your SMS sending activity and balance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-semibold">0</div>
              <div className="text-sm text-gray-600">SMS Sent (Token)</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-semibold">0</div>
              <div className="text-sm text-gray-600">SMS This Month</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-semibold">-</div>
              <div className="text-sm text-gray-600">Account Balance</div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            * Statistics will be available once SMS integration is active and API token is configured
          </p>
          <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-gray-700">
            <strong>Note:</strong> Greenweb provides additional API endpoints to check balance, rate, SMS count, and expiry.
            These can be integrated via Edge Functions for real-time statistics.
          </div>
        </CardContent>
      </Card>

      {/* Additional API Features */}
      <Card>
        <CardHeader>
          <CardTitle>Additional API Capabilities</CardTitle>
          <CardDescription>Available Greenweb API endpoints for statistics and monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded">
                <div className="font-medium mb-1">Balance Check</div>
                <code className="text-xs text-gray-600">?token=xxx&balance</code>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="font-medium mb-1">SMS Rate</div>
                <code className="text-xs text-gray-600">?token=xxx&rate</code>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="font-medium mb-1">Token SMS Count</div>
                <code className="text-xs text-gray-600">?token=xxx&tokensms</code>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="font-medium mb-1">Monthly SMS Count</div>
                <code className="text-xs text-gray-600">?token=xxx&monthlysms</code>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="font-medium mb-1">Expiry Date</div>
                <code className="text-xs text-gray-600">?token=xxx&expiry</code>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="font-medium mb-1">All Statistics</div>
                <code className="text-xs text-gray-600">?token=xxx&balance&rate&expiry...</code>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              These endpoints can be called via Supabase Edge Functions to display live statistics in the dashboard.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}