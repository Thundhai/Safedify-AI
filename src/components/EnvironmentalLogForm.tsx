import React, { useState, useEffect } from 'react';
import {
  Ear, Activity, Wind, Thermometer, Gauge, FlaskConical,
  Plus, X, Check, Loader2, MapPin, Clock, BarChart3,
  ChevronDown, AlertTriangle, CheckCircle2
} from 'lucide-react';
import { apiLogEnvironmentalReading, apiGetEnvironmentalReadings } from '../services/apiService';
import { useAuth } from '../context/AuthContext';

/* ─── Reading Type Configuration ─── */
const READING_TYPES = [
  { id: 'noise', label: 'Noise Level', unit: 'dB', icon: Ear, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20', min: 0, max: 140, step: 1, placeholder: 'e.g. 85', warn: 85, danger: 90 },
  { id: 'dust', label: 'Dust / Particulate', unit: 'mg/m³', icon: Wind, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/20', min: 0, max: 50, step: 0.1, placeholder: 'e.g. 3.5', warn: 5, danger: 10 },
  { id: 'gas_h2s', label: 'H₂S Gas', unit: 'ppm', icon: FlaskConical, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', min: 0, max: 100, step: 0.1, placeholder: 'e.g. 5', warn: 10, danger: 20 },
  { id: 'gas_co', label: 'CO Gas', unit: 'ppm', icon: FlaskConical, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20', min: 0, max: 200, step: 1, placeholder: 'e.g. 25', warn: 35, danger: 50 },
  { id: 'gas_o2', label: 'Oxygen (O₂)', unit: '%', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20', min: 0, max: 25, step: 0.1, placeholder: 'e.g. 20.9', warn: 19.5, danger: 18 },
  { id: 'gas_lel', label: 'LEL (Flammable)', unit: '%LEL', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20', min: 0, max: 100, step: 1, placeholder: 'e.g. 5', warn: 10, danger: 25 },
  { id: 'temperature', label: 'Temperature', unit: '°C', icon: Thermometer, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', min: -20, max: 60, step: 0.5, placeholder: 'e.g. 35', warn: 38, danger: 42 },
  { id: 'vibration', label: 'Vibration', unit: 'mm/s', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/20', min: 0, max: 50, step: 0.1, placeholder: 'e.g. 2.5', warn: 5, danger: 10 },
] as const;

type ReadingTypeId = typeof READING_TYPES[number]['id'];

interface RecentReading {
  id: string;
  reading_type: string;
  value: number;
  unit: string;
  location: string;
  source: string;
  notes?: string;
  created_at: string;
}

/* ─── Main Component ─── */
export const EnvironmentalLogForm: React.FC<{ onClose?: () => void; onLogged?: () => void }> = ({ onClose, onLogged }) => {
  const { user } = useAuth();
  const [readingType, setReadingType] = useState<ReadingTypeId>('noise');
  const [value, setValue] = useState('');
  const [location, setLocation] = useState('Site Zone A');
  const [zone, setZone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [recentReadings, setRecentReadings] = useState<RecentReading[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  const config = READING_TYPES.find(t => t.id === readingType)!;

  // Load recent readings on mount and type change
  useEffect(() => {
    loadRecentReadings();
  }, [readingType]);

  const loadRecentReadings = async () => {
    setLoadingRecent(true);
    try {
      const data = await apiGetEnvironmentalReadings(readingType, 10);
      setRecentReadings(data);
    } catch { /* ignore */ }
    finally { setLoadingRecent(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) { setError('Reading value is required'); return; }

    const numVal = parseFloat(value);
    if (isNaN(numVal)) { setError('Value must be a number'); return; }

    setSubmitting(true);
    setError('');
    try {
      await apiLogEnvironmentalReading({
        reading_type: readingType,
        value: numVal,
        unit: config.unit,
        location,
        zone: zone || undefined,
        source: 'manual',
        notes: notes || undefined,
      });
      setSuccess(true);
      setValue('');
      setNotes('');
      loadRecentReadings();
      onLogged?.();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to log reading');
    } finally {
      setSubmitting(false);
    }
  };

  const getValueStatus = (val: number) => {
    // O2 is inverted — low is dangerous
    if (readingType === 'gas_o2') {
      if (val < config.danger) return 'danger';
      if (val < config.warn) return 'caution';
      return 'safe';
    }
    if (val >= config.danger) return 'danger';
    if (val >= config.warn) return 'caution';
    return 'safe';
  };

  const numValue = parseFloat(value);
  const currentStatus = !isNaN(numValue) ? getValueStatus(numValue) : null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
      {/* ─── Header ─── */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
            <Gauge size={18} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-sm">Log Environmental Reading</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Record noise, gas, dust or other sensor readings</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} title="Close" aria-label="Close form" className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* ─── Reading Type Selector ─── */}
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Reading Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {READING_TYPES.map(rt => {
              const Icon = rt.icon;
              const isActive = readingType === rt.id;
              return (
                <button key={rt.id} type="button" onClick={() => { setReadingType(rt.id); setValue(''); }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isActive
                      ? `${rt.bg} border-current ${rt.color} ring-1 ring-current/30`
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}>
                  <Icon size={14} />
                  <span className="truncate">{rt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── Value Input ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Value ({config.unit})
            </label>
            <div className="relative">
              <input
                type="number"
                value={value}
                onChange={e => setValue(e.target.value)}
                min={config.min}
                max={config.max}
                step={config.step}
                placeholder={config.placeholder}
                className={`w-full px-4 py-2.5 rounded-lg border text-lg font-bold transition-colors
                  ${currentStatus === 'danger' ? 'border-red-400 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800' :
                    currentStatus === 'caution' ? 'border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800' :
                    currentStatus === 'safe' ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800' :
                    'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white'
                  }`}
                required
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 dark:text-slate-500 font-medium">{config.unit}</span>
            </div>
            {currentStatus && (
              <p className={`mt-1.5 text-xs font-semibold flex items-center gap-1 ${
                currentStatus === 'danger' ? 'text-red-600 dark:text-red-400' :
                currentStatus === 'caution' ? 'text-amber-600 dark:text-amber-400' :
                'text-emerald-600 dark:text-emerald-400'
              }`}>
                {currentStatus === 'danger' ? <><AlertTriangle size={12} /> Exceeds action level</> :
                 currentStatus === 'caution' ? <><AlertTriangle size={12} /> Near threshold — monitor closely</> :
                 <><CheckCircle2 size={12} /> Within safe limits</>}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Location</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select value={location} onChange={e => setLocation(e.target.value)} title="Select location" aria-label="Select location"
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm appearance-none">
                <option value="Site Zone A">Site Zone A</option>
                <option value="Site Zone B">Site Zone B</option>
                <option value="Workshop">Workshop</option>
                <option value="Office">Office</option>
                <option value="Laydown Area">Laydown Area</option>
                <option value="Excavation">Excavation</option>
                <option value="Confined Space">Confined Space</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* ─── Zone & Notes ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Zone / Specific Area <span className="text-slate-400">(optional)</span>
            </label>
            <input type="text" value={zone} onChange={e => setZone(e.target.value)}
              placeholder="e.g. Near compressor, 2nd floor" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Notes <span className="text-slate-400">(optional)</span>
            </label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. After generator started" className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm" />
          </div>
        </div>

        {/* ─── Submit ─── */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={submitting || !value.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-navy text-white rounded-lg font-semibold text-sm hover:bg-opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Log Reading
          </button>
          {success && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 font-semibold animate-fade-in">
              <Check size={16} /> Saved successfully
            </span>
          )}
          {error && (
            <span className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</span>
          )}
        </div>
      </form>

      {/* ─── Recent Readings ─── */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={12} /> Recent {config.label} Readings
          </h4>
          {loadingRecent && <Loader2 size={12} className="animate-spin text-slate-400" />}
        </div>

        {recentReadings.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
            No {config.label.toLowerCase()} readings recorded yet. Log your first reading above.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {recentReadings.map(r => {
              const status = getValueStatus(r.value);
              return (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-3">
                    <span className={`text-base font-bold ${
                      status === 'danger' ? 'text-red-600 dark:text-red-400' :
                      status === 'caution' ? 'text-amber-600 dark:text-amber-400' :
                      'text-emerald-600 dark:text-emerald-400'
                    }`}>{r.value} <span className="text-xs font-normal text-slate-400">{r.unit}</span></span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                      <MapPin size={10} /> {r.location}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
                    {r.notes && <span className="hidden sm:inline max-w-[150px] truncate italic">{r.notes}</span>}
                    <span>{new Date(r.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
