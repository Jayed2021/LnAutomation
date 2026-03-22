import { useState } from 'react';
import { Users, AlertTriangle, Info, RefreshCw, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { csAssignmentConfigs, updateCSAssignmentConfigs, orders, type CSAssignmentConfig } from '../../data/mockData';

export function CSAssignment() {
  const [configs, setConfigs] = useState<CSAssignmentConfig[]>([...csAssignmentConfigs]);
  const [hasChanges, setHasChanges] = useState(false);

  const totalPercentage = configs.filter(c => c.isActive).reduce((sum, c) => sum + c.percentage, 0);
  const isValid = totalPercentage === 100;

  const handlePercentageChange = (userId: string, value: string) => {
    const num = parseInt(value) || 0;
    setConfigs(configs.map(c => c.userId === userId ? { ...c, percentage: num } : c));
    setHasChanges(true);
  };

  const handleToggleActive = (userId: string, active: boolean) => {
    const updated = configs.map(c => c.userId === userId ? { ...c, isActive: active } : c);
    // Auto-redistribute percentages among active users
    const activeUsers = updated.filter(c => c.isActive);
    if (activeUsers.length > 0 && !active) {
      // The user being toggled off - redistribute their percentage equally
      const deactivated = updated.find(c => c.userId === userId)!;
      const sharePerUser = Math.floor(deactivated.percentage / activeUsers.length);
      const remainder = deactivated.percentage % activeUsers.length;
      let extra = remainder;
      const redistributed = updated.map(c => {
        if (c.isActive && c.userId !== userId) {
          const bonus = extra > 0 ? 1 : 0;
          extra--;
          return { ...c, percentage: c.percentage + sharePerUser + bonus };
        }
        if (c.userId === userId) return { ...c, isActive: false, percentage: 0 };
        return c;
      });
      setConfigs(redistributed);
    } else if (active) {
      // Reactivating - set a default percentage and adjust others
      const currentActive = updated.filter(c => c.isActive && c.userId !== userId);
      const newPercentage = Math.floor(100 / (currentActive.length + 1));
      const remainder = 100 - newPercentage * (currentActive.length + 1);
      let assigned = 0;
      const redistributed = updated.map(c => {
        if (c.userId === userId) return { ...c, isActive: true, percentage: newPercentage };
        if (c.isActive) {
          const share = Math.floor((100 - newPercentage) / currentActive.length);
          assigned++;
          if (assigned === currentActive.length) {
            return { ...c, percentage: share + remainder + (100 - newPercentage - share * currentActive.length) };
          }
          return { ...c, percentage: share };
        }
        return c;
      });
      setConfigs(redistributed);
    } else {
      setConfigs(updated);
    }
    setHasChanges(true);
  };

  const handleAutoBalance = () => {
    const activeCount = configs.filter(c => c.isActive).length;
    if (activeCount === 0) return;
    const baseShare = Math.floor(100 / activeCount);
    const remainder = 100 % activeCount;
    let extra = remainder;
    setConfigs(configs.map(c => {
      if (!c.isActive) return { ...c, percentage: 0 };
      const bonus = extra > 0 ? 1 : 0;
      extra--;
      return { ...c, percentage: baseShare + bonus };
    }));
    setHasChanges(true);
    toast.info('Percentages auto-balanced equally');
  };

  const handleSave = () => {
    if (!isValid) {
      toast.error('Active percentages must sum to 100%');
      return;
    }
    updateCSAssignmentConfigs(configs);
    setHasChanges(false);
    toast.success('CS assignment configuration saved successfully');
  };

  const handleDiscard = () => {
    setConfigs([...csAssignmentConfigs]);
    setHasChanges(false);
    toast.info('Changes discarded');
  };

  // Order stats per CS person
  const orderStats = configs.map(c => {
    const assigned = orders.filter(o => o.assigned_to === c.userId).length;
    const covered = orders.filter(o => o.assigned_to !== c.userId && o.confirmed_by === c.name).length;
    const confirmed = orders.filter(o => o.assigned_to === c.userId && !o.confirmed_by).length;
    return { userId: c.userId, name: c.name, assigned, covered, confirmed };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                CS Order Assignment
              </CardTitle>
              <CardDescription className="mt-1">
                Configure how new orders are automatically distributed among Customer Service representatives
              </CardDescription>
            </div>
            {hasChanges && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleDiscard}>Discard</Button>
                <Button onClick={handleSave} disabled={!isValid}>Save Changes</Button>
              </div>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* How It Works */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 space-y-1">
              <p className="font-medium">How Assignment Works</p>
              <ul className="list-disc list-inside space-y-0.5 text-blue-700">
                <li>New orders are automatically assigned to CS people based on configured percentages</li>
                <li>CS people can view orders "Assigned to Me" using the filter in the Orders view</li>
                <li>When a CS person is absent, another can confirm the order — their name appears as <strong>Confirmed By</strong></li>
                <li>Performance reports track both assigned orders and covered orders separately</li>
                <li>Marking a CS person <strong>Inactive</strong> automatically redistributes their share</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assignment Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Assignment Percentages</CardTitle>
            <div className="flex items-center gap-3">
              <div className={`text-sm font-medium px-3 py-1 rounded-full ${isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                Total: {totalPercentage}% {isValid ? '✓' : '≠ 100%'}
              </div>
              <Button variant="outline" size="sm" onClick={handleAutoBalance} className="gap-2">
                <RefreshCw className="w-4 h-4" />
                Auto-Balance
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!isValid && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Active percentages must sum to exactly 100%. Current total: {totalPercentage}%
            </div>
          )}
          <div className="space-y-4">
            {configs.map((config) => {
              const stats = orderStats.find(s => s.userId === config.userId);
              return (
                <div
                  key={config.userId}
                  className={`border rounded-lg p-4 transition-colors ${config.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0 ${config.isActive ? 'bg-blue-500' : 'bg-gray-400'}`}>
                      {config.name.split(' ').map(n => n[0]).join('')}
                    </div>

                    {/* Name & Status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-medium text-sm">{config.name}</span>
                        {config.isActive ? (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" />Active
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600 text-xs">
                            <XCircle className="w-3 h-3 mr-1" />Absent / Inactive
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">Customer Service · {stats?.assigned || 0} orders assigned</p>
                    </div>

                    {/* Percentage Input */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-600 whitespace-nowrap">Share:</Label>
                      <div className="relative w-24">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={config.percentage}
                          onChange={(e) => handlePercentageChange(config.userId, e.target.value)}
                          disabled={!config.isActive}
                          className="pr-8 text-center"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-32 hidden md:block">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${config.isActive ? 'bg-blue-500' : 'bg-gray-400'}`}
                          style={{ width: `${config.percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 text-center mt-1">{config.percentage}%</p>
                    </div>

                    {/* Active Toggle */}
                    <div className="flex flex-col items-center gap-1">
                      <Switch
                        checked={config.isActive}
                        onCheckedChange={(checked) => handleToggleActive(config.userId, checked)}
                      />
                      <span className="text-xs text-gray-500">{config.isActive ? 'Active' : 'Absent'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {!hasChanges && (
            <p className="text-xs text-gray-500 mt-4 text-center">
              Edit percentages or toggle active status, then click "Save Changes"
            </p>
          )}
        </CardContent>
      </Card>

      {/* Performance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Current Assignment Overview
          </CardTitle>
          <CardDescription>Live order distribution across all CS representatives</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orderStats.map(stat => (
              <div key={stat.userId} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-medium text-sm">
                    {stat.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{stat.name}</p>
                    <p className="text-xs text-gray-500">Customer Service</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 rounded p-2">
                    <div className="font-semibold text-blue-700">{stat.assigned}</div>
                    <div className="text-xs text-gray-600">Assigned</div>
                  </div>
                  <div className="bg-green-50 rounded p-2">
                    <div className="font-semibold text-green-700">{stat.confirmed}</div>
                    <div className="text-xs text-gray-600">Self-handled</div>
                  </div>
                  <div className="bg-amber-50 rounded p-2">
                    <div className="font-semibold text-amber-700">{stat.covered}</div>
                    <div className="text-xs text-gray-600">Covered others</div>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${orders.length > 0 ? (stat.assigned / orders.length) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 text-center">
                  {orders.length > 0 ? ((stat.assigned / orders.length) * 100).toFixed(1) : 0}% of all orders
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}