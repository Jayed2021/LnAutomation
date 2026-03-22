import React from 'react';
import { Construction } from 'lucide-react';

interface ComingSoonProps {
  moduleName: string;
  description?: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ moduleName, description }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <Construction className="w-24 h-24 text-blue-600 mb-6" />
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{moduleName}</h1>
      <p className="text-gray-600 mb-6">
        {description || 'This module is under development and will be available soon.'}
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
        <p className="text-sm text-blue-800">
          The complete ERP system is being built with all the features from your documentation.
          This includes role-based access, lot-based inventory, FIFO costing, and comprehensive reporting.
        </p>
      </div>
    </div>
  );
};

export default ComingSoon;
