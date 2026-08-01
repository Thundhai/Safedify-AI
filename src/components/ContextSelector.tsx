import React from 'react';
import { getOrgContexts, getOrgSettings } from '../services/storageService';
import { OrgContext } from '../types';
import { Layers } from 'lucide-react';

interface ContextSelectorProps {
  value: string | undefined;
  onChange: (contextId: string | undefined) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

/** Inline dropdown for selecting a project/operation/plant on a record form. */
export const ContextSelector: React.FC<ContextSelectorProps> = ({
  value, onChange, disabled, required, className = '',
}) => {
  const settings = getOrgSettings();
  const contexts = getOrgContexts().filter(c => c.status === 'Active');
  const label = settings.contextLabel || 'Location';

  if (!settings.enableContextFilter && !required) return null;

  return (
    <div className={className}>
      <label className="block text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
        <Layers size={13} className="text-blue-500" /> {label}
        {required && <span className="text-red-500">*</span>}
      </label>
      <select
        disabled={disabled}
        value={value ?? ''}
        onChange={e => onChange(e.target.value || undefined)}
        className="w-full border border-slate-300 rounded-lg p-2.5 text-sm bg-white disabled:bg-slate-50"
      >
        <option value="">— Select {label} —</option>
        {contexts.map(ctx => (
          <option key={ctx.id} value={ctx.id}>
            {ctx.code} — {ctx.name}
          </option>
        ))}
      </select>
    </div>
  );
};

interface ContextBadgeProps {
  contextId?: string;
  className?: string;
}

/** Small inline badge showing which context a record belongs to. */
export const ContextBadge: React.FC<ContextBadgeProps> = ({ contextId, className = '' }) => {
  if (!contextId) return null;
  const ctx = getOrgContexts().find(c => c.id === contextId);
  if (!ctx) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${className}`}
      style={{ background: ctx.color ?? '#2563eb' }}
    >
      {ctx.code}
    </span>
  );
};

interface ContextFilterBarProps {
  value: string | undefined;
  onChange: (contextId: string | undefined) => void;
  className?: string;
}

/** Filter pill row — shown above module lists. */
export const ContextFilterBar: React.FC<ContextFilterBarProps> = ({
  value, onChange, className = '',
}) => {
  const settings = getOrgSettings();
  const contexts = getOrgContexts();
  const label = settings.contextLabel || 'Location';

  if (!settings.enableContextFilter || contexts.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-1 ${className}`}>
      <span className="flex items-center gap-1 text-xs font-bold text-slate-500 flex-shrink-0">
        <Layers size={12} /> {label}:
      </span>
      <button
        onClick={() => onChange(undefined)}
        className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 ${
          !value ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
        }`}
      >
        All
      </button>
      {contexts.map(ctx => (
        <button
          key={ctx.id}
          onClick={() => onChange(value === ctx.id ? undefined : ctx.id)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors flex-shrink-0 border ${
            value === ctx.id
              ? 'text-white border-transparent'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          style={value === ctx.id ? { background: ctx.color ?? '#2563eb', borderColor: ctx.color ?? '#2563eb' } : {}}
        >
          {ctx.code} — {ctx.name}
        </button>
      ))}
    </div>
  );
};
