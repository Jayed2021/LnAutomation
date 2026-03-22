import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle2, AlertCircle, Loader2, Database, UserPlus, Copy, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { API_BASE_URL, publicAnonKey } from '../../../utils/supabase/client';
import { ManualSetupSQL } from './ManualSetupSQL';

interface SetupStatus {
  database_setup: boolean;
  admin_user_exists: boolean;
  ready_to_use: boolean;
  next_action: string;
}

export function SetupWizard() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [setupStep, setSetupStep] = useState<'check' | 'database' | 'admin' | 'complete'>('check');
  
  // Admin form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [creatingAdmin, setCreatingAdmin] = useState(false);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/setup/status`, {
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`
        }
      });
      const data = await response.json();
      setStatus(data);

      // Determine which step we're on
      if (data.ready_to_use) {
        setSetupStep('complete');
      } else if (!data.database_setup) {
        setSetupStep('database');
      } else if (!data.admin_user_exists) {
        setSetupStep('admin');
      }
    } catch (error: any) {
      console.error('Error checking setup status:', error);
      toast.error('Failed to check setup status');
      setSetupStep('database'); // Default to database setup
    } finally {
      setLoading(false);
    }
  };

  const runDatabaseSetup = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/setup/database`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Database setup failed:', data);
        throw new Error(data.details || data.error || 'Database setup failed');
      }

      console.log('Database setup response:', data);
      toast.success('Database setup completed!');
      await checkSetupStatus();
    } catch (error: any) {
      console.error('Database setup error:', error);
      toast.error(
        'Database setup failed. Please use manual setup via Supabase dashboard.',
        { duration: 8000 }
      );
    } finally {
      setLoading(false);
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingAdmin(true);

    try {
      const response = await fetch(`${API_BASE_URL}/setup/create-admin`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create admin user');
      }

      toast.success('Admin user created successfully!');
      await checkSetupStatus();
    } catch (error: any) {
      console.error('Admin creation error:', error);
      toast.error(error.message || 'Failed to create admin user');
    } finally {
      setCreatingAdmin(false);
    }
  };

  if (loading && !status) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-violet-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Checking system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-violet-50 p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <Database className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Eyewear ERP Setup</CardTitle>
          <CardDescription className="text-center">
            Let's get your system configured and ready to use
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Setup Progress */}
          <div className="space-y-4">
            {/* Step 1: Database */}
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {status?.database_setup ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : setupStep === 'database' ? (
                  <div className="w-6 h-6 rounded-full border-2 border-blue-600 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Step 1: Database Setup</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Create all necessary tables and configure the database
                </p>
                {setupStep === 'database' && !status?.database_setup && (
                  <div className="mt-3 space-y-3">
                    <Button 
                      onClick={runDatabaseSetup} 
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Setting up database...
                        </>
                      ) : (
                        <>
                          <Database className="w-4 h-4 mr-2" />
                          Run Automatic Setup
                        </>
                      )}
                    </Button>
                    
                    <ManualSetupSQL />
                  </div>
                )}
                {status?.database_setup && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Database is configured
                  </p>
                )}
              </div>
            </div>

            {/* Step 2: Admin User */}
            <div className="flex items-start gap-4 p-4 border rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {status?.admin_user_exists ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                ) : setupStep === 'admin' ? (
                  <div className="w-6 h-6 rounded-full border-2 border-blue-600 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-blue-600" />
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-300" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">Step 2: Create Admin User</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Set up your administrator account to manage the system
                </p>
                {setupStep === 'admin' && !status?.admin_user_exists && (
                  <form onSubmit={createAdmin} className="mt-4 space-y-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@example.com"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        minLength={6}
                      />
                      <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                    </div>
                    <Button type="submit" disabled={creatingAdmin} className="w-full">
                      {creatingAdmin ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating admin...
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Create Admin User
                        </>
                      )}
                    </Button>
                  </form>
                )}
                {status?.admin_user_exists && (
                  <p className="text-sm text-green-600 mt-2 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Admin user is configured
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Completion */}
          {setupStep === 'complete' && status?.ready_to_use && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Setup Complete!
              </h3>
              <p className="text-sm text-green-700 mb-4">
                Your ERP system is ready to use. You can now log in with your admin credentials.
              </p>
              <Button onClick={() => navigate('/login')} size="lg">
                Go to Login
              </Button>
            </div>
          )}

          {/* Error State */}
          {!loading && !status && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-red-900 mb-2">
                Setup Error
              </h3>
              <p className="text-sm text-red-700 mb-4">
                Unable to connect to the setup service. Please try again.
              </p>
              <Button onClick={checkSetupStatus} variant="outline">
                Retry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}