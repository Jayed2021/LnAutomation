import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ArrowRight, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router';

interface Step {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

export function QuickStart() {
  const navigate = useNavigate();
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 'woo-setup',
      title: 'Configure WooCommerce Integration',
      description: 'Connect your WooCommerce store to sync products and orders',
      completed: false,
      action: () => navigate('/settings'),
      actionLabel: 'Go to Settings',
    },
    {
      id: 'sync-products',
      title: 'Sync Products from WooCommerce',
      description: 'Import all products from your WooCommerce store',
      completed: false,
      action: () => navigate('/settings'),
      actionLabel: 'Sync Now',
    },
    {
      id: 'create-supplier',
      title: 'Create Your First Supplier',
      description: 'Add suppliers to track where your inventory comes from',
      completed: false,
      action: () => navigate('/purchase/suppliers'),
      actionLabel: 'Add Supplier',
    },
    {
      id: 'create-location',
      title: 'Set Up Warehouse Locations',
      description: 'Create locations to organize your inventory',
      completed: false,
      action: () => navigate('/inventory/warehouse'),
      actionLabel: 'Add Location',
    },
    {
      id: 'create-po',
      title: 'Create Purchase Order',
      description: 'Order products from your supplier',
      completed: false,
      action: () => navigate('/purchase/create'),
      actionLabel: 'Create PO',
    },
    {
      id: 'receive-goods',
      title: 'Receive Goods',
      description: 'Receive your purchase order and add stock to inventory',
      completed: false,
      action: () => navigate('/inventory/receive'),
      actionLabel: 'Receive Goods',
    },
    {
      id: 'sync-orders',
      title: 'Sync Orders from WooCommerce',
      description: 'Import orders to start fulfilling',
      completed: false,
      action: () => navigate('/settings'),
      actionLabel: 'Sync Orders',
    },
    {
      id: 'fulfill-order',
      title: 'Fulfill Your First Order',
      description: 'Pick, pack, and ship an order',
      completed: false,
      action: () => navigate('/fulfilment/orders'),
      actionLabel: 'View Orders',
    },
  ]);

  const completedCount = steps.filter(s => s.completed).length;
  const progress = (completedCount / steps.length) * 100;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Start Guide</CardTitle>
        <CardDescription>
          Follow these steps to get your ERP system up and running
        </CardDescription>
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{completedCount} of {steps.length} completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => (
            <div 
              key={step.id}
              className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex-shrink-0 mt-1">
                {step.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">Step {index + 1}</span>
                </div>
                <h3 className="font-medium text-gray-900 mb-1">{step.title}</h3>
                <p className="text-sm text-gray-600">{step.description}</p>
              </div>
              {step.action && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={step.action}
                  className="flex-shrink-0"
                >
                  {step.actionLabel}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Need Help?</h4>
          <p className="text-sm text-blue-800 mb-3">
            Check the detailed documentation for step-by-step instructions
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href="/GETTING_STARTED.md" target="_blank">
              <ExternalLink className="w-4 h-4 mr-2" />
              View Documentation
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
