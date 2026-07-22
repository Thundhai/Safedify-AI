import React from 'react';
import { Loader2 } from '../utils/icons';

export const LoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
    <div className="flex items-center gap-3 text-slate-600">
      <Loader2 size={24} className="animate-spin" />
      <span className="text-lg font-medium">Loading...</span>
    </div>
    <p className="text-sm text-slate-500 mt-2">Please wait while we load the page</p>
  </div>
);