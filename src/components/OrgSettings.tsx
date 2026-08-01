import React, { useState } from 'react';
import { Building2, Save, Globe, Factory, Wrench, AlertTriangle } from 'lucide-react';
import { getOrgSettings, saveOrgSettings } from '../services/storageService';
import { IndustryType, INDUSTRY_CONTEXT_LABEL, OrganizationSettings } from '../types';

const INDUSTRIES: { value: IndustryType; label: string; icon: string; examples: string }[] = [
  { value: 'Construction',   label: 'Construction',       icon: '🏗️', examples: 'Projects, Sites, Contracts' },
  { value: 'Oil & Gas',      label: 'Oil & Gas',          icon: '⚙️', examples: 'Operations, Plants, Wells, Platforms' },
  { value: 'Manufacturing',  label: 'Manufacturing',      icon: '🏭', examples: 'Plants, Facilities, Production Lines' },
  { value: 'Mining',         label: 'Mining',             icon: '⛏️', examples: 'Sites, Pits, Shafts, Tailing Dams' },
  { value: 'Utilities',      label: 'Utilities',          icon: '⚡', examples: 'Substations, Plants, Networks' },
  { value: 'Healthcare',     label: 'Healthcare',         icon: '🏥', examples: 'Facilities, Wards, Departments' },
  { value: 'General',        label: 'General / Other',    icon: '📍', examples: 'Locations, Areas, Departments' },
];

export const OrgSettings: React.FC = () => {
  const [settings, setSettings] = useState<OrganizationSettings>(getOrgSettings());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Auto-set context label from industry unless manually overridden
    const updated = { ...settings };
    if (!settings.contextLabel || settings.contextLabel === INDUSTRY_CONTEXT_LABEL[settings.industry as IndustryType]) {
      updated.contextLabel = INDUSTRY_CONTEXT_LABEL[settings.industry as IndustryType] ?? 'Location';
    }
    saveOrgSettings(updated);
    setSettings(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleIndustryChange = (industry: IndustryType) => {
    setSettings(prev => ({
      ...prev,
      industry,
      contextLabel: INDUSTRY_CONTEXT_LABEL[industry],
    }));
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Building2 size={22} className="text-blue-600" /> Organization Settings
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">Configure your organization profile and industry type.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 shadow-sm text-sm"
        >
          <Save size={16} /> {saved ? 'Saved ✓' : 'Save Settings'}
        </button>
      </div>

      {/* Organization Details */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 uppercase tracking-wide">Organization Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Organization / Company Name</label>
            <input
              value={settings.name}
              onChange={e => setSettings(s => ({ ...s, name: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              placeholder="e.g. AlBarq Construction LLC"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Country</label>
            <input
              value={settings.country ?? ''}
              onChange={e => setSettings(s => ({ ...s, country: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              placeholder="e.g. UAE"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Website (Optional)</label>
            <input
              value={settings.website ?? ''}
              onChange={e => setSettings(s => ({ ...s, website: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              placeholder="https://example.com"
            />
          </div>
        </div>
      </div>

      {/* Industry Type */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 uppercase tracking-wide">Industry Type</h3>
        <p className="text-xs text-slate-500">
          Selecting your industry sets the terminology used across all modules.
          A <strong>Construction</strong> company uses <em>Projects</em>; 
          an <strong>Oil &amp; Gas</strong> company uses <em>Operations</em>, etc.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {INDUSTRIES.map(ind => (
            <button
              key={ind.value}
              type="button"
              onClick={() => handleIndustryChange(ind.value)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                settings.industry === ind.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{ind.icon}</span>
                <span className={`font-bold text-sm ${settings.industry === ind.value ? 'text-blue-700' : 'text-slate-700'}`}>
                  {ind.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{ind.examples}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Context Label */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2 uppercase tracking-wide">Context Terminology</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              Context Label <span className="text-slate-400 font-normal">(auto-set from industry)</span>
            </label>
            <input
              value={settings.contextLabel}
              onChange={e => setSettings(s => ({ ...s, contextLabel: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm"
              placeholder="e.g. Project, Operation, Plant"
            />
            <p className="text-xs text-slate-400 mt-1">
              This label appears throughout the platform: "Select {settings.contextLabel}", "{settings.contextLabel} Filter" etc.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-bold text-blue-700 uppercase mb-1">Preview</p>
            <p className="text-sm text-blue-900">Filter by <strong>{settings.contextLabel}</strong></p>
            <p className="text-sm text-blue-900">New {settings.contextLabel}</p>
            <p className="text-sm text-blue-900">{settings.contextLabel} Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSettings(s => ({ ...s, enableContextFilter: !s.enableContextFilter }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.enableContextFilter ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.enableContextFilter ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <span className="text-sm font-medium text-slate-700">
            Enable {settings.contextLabel} filter across all modules
          </span>
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm font-medium flex items-center gap-2">
          ✓ Organization settings saved successfully.
        </div>
      )}
    </div>
  );
};
