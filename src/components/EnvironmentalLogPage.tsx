import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnvironmentalLogForm } from './EnvironmentalLogForm';
import { Leaf } from 'lucide-react';

export const EnvironmentalLogPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl">
          <Leaf size={22} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Environmental Log</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Record field environmental readings — noise, gas, dust, temperature &amp; more
          </p>
        </div>
      </div>

      {/* Log Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
        <EnvironmentalLogForm />
      </div>
    </div>
  );
};
