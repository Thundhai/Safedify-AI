import React, { useState, useEffect } from 'react';
import {
  Wind, Thermometer, Droplets, Activity, Ear,
  Sparkles, Loader2, AlertTriangle, CheckCircle2, RefreshCw,
  Sun, Eye, Gauge, ArrowUp, ArrowDown, Minus, ShieldAlert,
  CloudSun, Cloud, CloudDrizzle, Umbrella,
  ChevronDown, ChevronUp,
  MapPin, Clock, Zap, Info, CircleAlert, TriangleAlert,
  Wifi, WifiOff
} from 'lucide-react';
import { EnvironmentalData, WeatherRiskAnalysis, PermitStatus } from '../types';
import { analyzeWeatherRisksAI } from '../services/geminiService';
import { getPermits } from '../services/storageService';
import { apiGetWeather } from '../services/apiService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/* ─── Safety Threshold Configuration ─── */
const THRESHOLDS = {
  temperature: { caution: 35, danger: 40, coldCaution: 5, coldDanger: 0 },
  wind: { caution: 25, danger: 40 },
  humidity: { lowCaution: 20, highCaution: 70, highDanger: 85 },
  aqi: { good: 50, moderate: 100, unhealthySensitive: 150, unhealthy: 200, veryUnhealthy: 300 },
  noise: { acceptable: 80, caution: 85, danger: 90 },
  uvIndex: { low: 2, moderate: 5, high: 7, veryHigh: 10 },
  visibility: { poor: 1, moderate: 4 },
};

/* ─── Helper Functions ─── */
const getConditionIcon = (condition: string, size = 24) => {
  const lower = condition.toLowerCase();
  if (lower.includes('sunny') || lower.includes('clear')) return <Sun size={size} className="text-yellow-500" />;
  if (lower.includes('partly')) return <CloudSun size={size} className="text-amber-500" />;
  if (lower.includes('overcast') || lower.includes('cloudy')) return <Cloud size={size} className="text-slate-400" />;
  if (lower.includes('drizzle') || lower.includes('light rain')) return <CloudDrizzle size={size} className="text-blue-400" />;
  if (lower.includes('rain') || lower.includes('storm')) return <Umbrella size={size} className="text-blue-600" />;
  return <CloudSun size={size} className="text-amber-500" />;
};

type StatusLevel = 'safe' | 'caution' | 'danger';

const statusColor: Record<StatusLevel, string> = {
  safe: 'text-emerald-600 dark:text-emerald-400',
  caution: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
};

const statusBg: Record<StatusLevel, string> = {
  safe: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
  caution: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  danger: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
};

const statusDot: Record<StatusLevel, string> = {
  safe: 'bg-emerald-500',
  caution: 'bg-amber-500 animate-pulse',
  danger: 'bg-red-500 animate-pulse',
};

const getAQIStatus = (aqi: number): { level: StatusLevel; label: string } => {
  if (aqi <= THRESHOLDS.aqi.good) return { level: 'safe', label: 'Good' };
  if (aqi <= THRESHOLDS.aqi.moderate) return { level: 'caution', label: 'Moderate' };
  if (aqi <= THRESHOLDS.aqi.unhealthySensitive) return { level: 'caution', label: 'Unhealthy (Sensitive)' };
  if (aqi <= THRESHOLDS.aqi.unhealthy) return { level: 'danger', label: 'Unhealthy' };
  return { level: 'danger', label: 'Very Unhealthy' };
};

const getNoiseStatus = (db: number | null): { level: StatusLevel; label: string } => {
  if (db === null || db === undefined) return { level: 'safe', label: 'No readings' };
  if (db <= THRESHOLDS.noise.acceptable) return { level: 'safe', label: 'Acceptable' };
  if (db <= THRESHOLDS.noise.caution) return { level: 'caution', label: 'Hearing Protection Advised' };
  return { level: 'danger', label: 'Hearing Protection Required' };
};

const getWindStatus = (speed: number): StatusLevel => {
  if (speed >= THRESHOLDS.wind.danger) return 'danger';
  if (speed >= THRESHOLDS.wind.caution) return 'caution';
  return 'safe';
};

const getTempStatus = (temp: number): StatusLevel => {
  if (temp >= THRESHOLDS.temperature.danger || temp <= THRESHOLDS.temperature.coldDanger) return 'danger';
  if (temp >= THRESHOLDS.temperature.caution || temp <= THRESHOLDS.temperature.coldCaution) return 'caution';
  return 'safe';
};

const getUVStatus = (uv: number): { level: StatusLevel; label: string } => {
  if (uv <= THRESHOLDS.uvIndex.low) return { level: 'safe', label: 'Low' };
  if (uv <= THRESHOLDS.uvIndex.moderate) return { level: 'safe', label: 'Moderate' };
  if (uv <= THRESHOLDS.uvIndex.high) return { level: 'caution', label: 'High' };
  if (uv <= THRESHOLDS.uvIndex.veryHigh) return { level: 'danger', label: 'Very High' };
  return { level: 'danger', label: 'Extreme' };
};

const getHumidityStatus = (h: number): StatusLevel => {
  if (h < THRESHOLDS.humidity.lowCaution) return 'caution';
  if (h > THRESHOLDS.humidity.highDanger) return 'danger';
  if (h > THRESHOLDS.humidity.highCaution) return 'caution';
  return 'safe';
};

const formatTime = (iso: string) => {
  try { return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  catch { return '--:--'; }
};

const TrendArrow: React.FC<{ trend: 'up' | 'down' | 'stable' }> = ({ trend }) => {
  if (trend === 'up') return <ArrowUp size={12} className="text-red-500" />;
  if (trend === 'down') return <ArrowDown size={12} className="text-blue-500" />;
  return <Minus size={12} className="text-slate-400" />;
};

/* ─── Gauge Bar Component ─── */
const GaugeBar: React.FC<{
  value: number; max: number;
  segments: { threshold: number; color: string }[];
}> = ({ value, max, segments }) => {
  const pct = Math.min((value / max) * 100, 100);
  let barColor = segments[0]?.color || 'bg-emerald-500';
  for (const seg of segments) { if (value >= seg.threshold) barColor = seg.color; }
  return (
    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

/* ─── Metric Tile Component ─── */
const MetricTile: React.FC<{
  icon: React.ReactNode; label: string; value: string; unit?: string;
  status: StatusLevel; statusLabel?: string; trend?: 'up' | 'down' | 'stable';
}> = ({ icon, label, value, unit = '', status, statusLabel, trend }) => (
  <div className={`relative rounded-xl border p-3.5 transition-all ${statusBg[status]}`}>
    <div className="flex items-start justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className={statusColor[status]}>{icon}</span>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        {trend && <TrendArrow trend={trend} />}
        <span className={`w-2 h-2 rounded-full ${statusDot[status]}`} />
      </div>
    </div>
    <div className="flex items-baseline gap-1">
      <span className={`text-2xl font-bold ${statusColor[status]}`}>{value}</span>
      {unit && <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">{unit}</span>}
    </div>
    {statusLabel && (
      <p className={`text-[11px] mt-1 font-medium ${status === 'safe' ? 'text-emerald-600/70 dark:text-emerald-400/70' : status === 'caution' ? 'text-amber-600/70 dark:text-amber-400/70' : 'text-red-600/70 dark:text-red-400/70'}`}>
        {statusLabel}
      </p>
    )}
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════ */
export const EnvironmentalCard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [weather, setWeather] = useState<EnvironmentalData | null>(null);
  const [prevWeather, setPrevWeather] = useState<EnvironmentalData | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<WeatherRiskAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [advisoryExpanded, setAdvisoryExpanded] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataSource, setDataSource] = useState<'live' | 'simulated'>('simulated');
  const [geoCoords, setGeoCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'pending' | 'granted' | 'denied' | 'unavailable'>('pending');

  // ── Auto-detect location via browser Geolocation API ──
  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoStatus('unavailable');
      refreshWeather(); // proceed without coords → uses server .env defaults
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGeoCoords(coords);
        setGeoStatus('granted');
        // Fetch weather with detected coordinates
        refreshWeatherWithCoords(coords.lat, coords.lng);
      },
      (_err) => {
        setGeoStatus('denied');
        refreshWeather(); // fallback to server-side defaults
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 }
    );
  }, []);

  const [fetchError, setFetchError] = useState(false);

  const refreshWeatherWithCoords = async (lat?: number, lng?: number) => {
    setRefreshing(true);
    setFetchError(false);
    try {
      const apiData = await apiGetWeather(lat, lng);
      const newData: EnvironmentalData = {
        temperature: apiData.temperature,
        feelsLike: apiData.feelsLike,
        humidity: apiData.humidity,
        pressure: apiData.pressure,
        windSpeed: apiData.windSpeed,
        windDirection: apiData.windDirection,
        visibility: apiData.visibility,
        condition: apiData.condition,
        uvIndex: apiData.uvIndex ?? 0,
        precipitation: apiData.precipitation ?? 0,
        aqi: apiData.aqi,
        noiseLevel: apiData.noiseLevel ?? 0,
        location: apiData.location || 'Unknown',
        updatedAt: apiData.updatedAt || new Date().toISOString(),
      };
      setPrevWeather(weather);
      setWeather(newData);
      setDataSource(apiData.dataSource === 'simulated' ? 'simulated' : 'live');
      handleRunAnalysis(newData);
    } catch {
      setFetchError(true);
      // Keep stale data if available, don't generate fake data
      if (!weather) {
        setDataSource('simulated');
      }
    }
    setTimeout(() => setRefreshing(false), 600);
  };

  const refreshWeather = () => refreshWeatherWithCoords(geoCoords?.lat, geoCoords?.lng);

  const handleRunAnalysis = async (data: EnvironmentalData) => {
    setLoadingAnalysis(true);
    try {
      const activePermits = (await getPermits()).filter(p => p.status === PermitStatus.APPROVED);
      const activeTypes = Array.from(new Set(activePermits.map(p => p.type))) as string[];
      if (activeTypes.length === 0) activeTypes.push('General Construction', 'Vehicle Movement');
      const result = await analyzeWeatherRisksAI(data);
      setRiskAnalysis(result);
    } catch (e: any) { console.error("Env Analysis failed", e); }
    finally { setLoadingAnalysis(false); }
  };

  const getTrend = (field: keyof EnvironmentalData): 'up' | 'down' | 'stable' => {
    if (!prevWeather || !weather) return 'stable';
    const curr = weather[field] as number;
    const prev = prevWeather[field] as number;
    if (typeof curr !== 'number' || typeof prev !== 'number') return 'stable';
    if (curr > prev + 1) return 'up';
    if (curr < prev - 1) return 'down';
    return 'stable';
  };

  if (!weather) {
    return (
      <div className="h-64 flex items-center justify-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <Loader2 className="animate-spin text-blue-600" size={28} />
      </div>
    );
  }

  const aqiStatus = getAQIStatus(weather.aqi);
  const noiseStatus = getNoiseStatus(weather.noiseLevel);
  const windStatus = getWindStatus(weather.windSpeed);
  const tempStatus = getTempStatus(weather.temperature);
  const uvStatus = getUVStatus(weather.uvIndex);
  const humidityStatus = getHumidityStatus(weather.humidity);

  // Overall site status — worst of all metrics
  const allStatuses: StatusLevel[] = [aqiStatus.level, noiseStatus.level, windStatus, tempStatus, uvStatus.level, humidityStatus];
  const overallStatus: StatusLevel = allStatuses.includes('danger') ? 'danger' : allStatuses.includes('caution') ? 'caution' : 'safe';
  const overallLabels: Record<StatusLevel, string> = {
    safe: 'All Clear — Safe Working Conditions',
    caution: 'Caution — Monitor Conditions',
    danger: 'Alert — Hazardous Conditions Detected',
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden col-span-1 lg:col-span-2">

      {/* ─── Header with Overall Status Banner ─── */}
      <div className={`px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b ${
        overallStatus === 'danger' ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-900' :
        overallStatus === 'caution' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900' :
        'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            overallStatus === 'danger' ? 'bg-red-100 dark:bg-red-900/40' :
            overallStatus === 'caution' ? 'bg-amber-100 dark:bg-amber-900/40' :
            'bg-emerald-100 dark:bg-emerald-900/40'
          }`}>
            {overallStatus === 'danger' ? <ShieldAlert size={22} className="text-red-600 dark:text-red-400" /> :
             overallStatus === 'caution' ? <TriangleAlert size={22} className="text-amber-600 dark:text-amber-400" /> :
             <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400" />}
          </div>
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-base">Environmental Intelligence</h3>
            <p className={`text-xs font-semibold ${statusColor[overallStatus]}`}>{overallLabels[overallStatus]}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            dataSource === 'live'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}>
            {dataSource === 'live' ? <Wifi size={10} /> : <WifiOff size={10} />}
            {dataSource === 'live' ? 'Live' : 'Simulated'}
          </span>
          <span className="flex items-center gap-1.5" title={
            geoStatus === 'granted' ? `Auto-detected GPS (${geoCoords?.lat.toFixed(4)}, ${geoCoords?.lng.toFixed(4)})` :
            geoStatus === 'denied' ? 'Location denied — using server default coordinates' :
            geoStatus === 'unavailable' ? 'Geolocation not available — using server default' :
            'Detecting location…'
          }>
            <MapPin size={12} className={geoStatus === 'granted' ? 'text-emerald-500' : ''} />
            {weather.location}
            {geoStatus === 'granted' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </span>
          <span className="flex items-center gap-1.5"><Clock size={12} /> {formatTime(weather.updatedAt)}</span>
          <button onClick={refreshWeather} disabled={refreshing}
            className="p-1.5 rounded-full hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
            title="Refresh data" aria-label="Refresh environmental data">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ─── Hero: Current Conditions ─── */}
      <div className="px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-4">
          {getConditionIcon(weather.condition, 44)}
          <div>
            <div className="flex items-baseline gap-2">
              <span className={`text-4xl font-extrabold ${statusColor[tempStatus]}`}>{weather.temperature}°</span>
              <span className="text-sm text-slate-400 dark:text-slate-500 font-medium">C</span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{weather.condition}</p>
          </div>
        </div>
        <div className="hidden sm:block w-px h-12 bg-slate-200 dark:bg-slate-700 mx-2" />
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
          <span className="flex items-center gap-1.5">
            <Thermometer size={14} className="text-orange-500" />
            Feels like <strong className={statusColor[getTempStatus(weather.feelsLike)]}>{weather.feelsLike}°C</strong>
          </span>
          <span className="flex items-center gap-1.5">
            <Wind size={14} className={statusColor[windStatus]} />
            {weather.windSpeed} km/h {weather.windDirection}
          </span>
          <span className="flex items-center gap-1.5">
            <Umbrella size={14} className="text-blue-500" />
            {weather.precipitation}% rain
          </span>
          <span className="flex items-center gap-1.5">
            <Gauge size={14} className="text-slate-400" />
            {weather.pressure} hPa
          </span>
        </div>
      </div>

      {/* ─── Detailed Metrics Grid ─── */}
      <div className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricTile icon={<Thermometer size={18} />} label="Temperature"
            value={`${weather.temperature}`} unit="°C" status={tempStatus}
            statusLabel={weather.temperature >= THRESHOLDS.temperature.caution ? 'Heat stress risk' : weather.temperature <= THRESHOLDS.temperature.coldCaution ? 'Cold stress risk' : 'Normal range'}
            trend={getTrend('temperature')}
          />
          <MetricTile icon={<Wind size={18} />} label="Wind"
            value={`${weather.windSpeed}`} unit={`km/h ${weather.windDirection}`} status={windStatus}
            statusLabel={weather.windSpeed >= THRESHOLDS.wind.danger ? 'Suspend crane ops' : weather.windSpeed >= THRESHOLDS.wind.caution ? 'Limit elevated work' : 'Safe for operations'}
            trend={getTrend('windSpeed')}
          />
          <MetricTile icon={<Droplets size={18} />} label="Humidity"
            value={`${weather.humidity}`} unit="%" status={humidityStatus}
            statusLabel={weather.humidity > THRESHOLDS.humidity.highDanger ? 'Heat illness risk' : weather.humidity > THRESHOLDS.humidity.highCaution ? 'Monitor hydration' : 'Comfortable'}
            trend={getTrend('humidity')}
          />
          <MetricTile icon={<Activity size={18} />} label="Air Quality"
            value={`${weather.aqi}`} unit="AQI" status={aqiStatus.level}
            statusLabel={aqiStatus.label} trend={getTrend('aqi')}
          />
          <MetricTile icon={<Ear size={18} />} label="Noise"
            value={weather.noiseLevel != null ? `${weather.noiseLevel}` : '—'} unit="dB" status={noiseStatus.level}
            statusLabel={noiseStatus.label} trend={getTrend('noiseLevel')}
          />
          <MetricTile icon={<Sun size={18} />} label="UV Index"
            value={`${weather.uvIndex}`} status={uvStatus.level}
            statusLabel={uvStatus.label} trend={getTrend('uvIndex')}
          />
        </div>

        {/* ─── AQI & Noise Detail Bars ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          {/* AQI Detail */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={13} /> Air Quality Breakdown
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                aqiStatus.level === 'safe' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                aqiStatus.level === 'caution' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
              }`}>{aqiStatus.label}</span>
            </div>
            <GaugeBar value={weather.aqi} max={300}
              segments={[
                { threshold: 0, color: 'bg-emerald-500' }, { threshold: 51, color: 'bg-yellow-500' },
                { threshold: 101, color: 'bg-orange-500' }, { threshold: 151, color: 'bg-red-500' },
                { threshold: 201, color: 'bg-purple-600' },
              ]}
            />
            <div className="flex justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500">
              <span>0 Good</span><span>50</span><span>100</span><span>150</span><span>200</span><span>300+</span>
            </div>
            {weather.aqi > THRESHOLDS.aqi.moderate && (
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-2 flex items-start gap-1.5">
                <Info size={12} className="mt-0.5 shrink-0" />
                {weather.aqi > THRESHOLDS.aqi.unhealthySensitive ? 'Respiratory protection required for outdoor work.' : 'Workers with respiratory conditions should limit outdoor exposure.'}
              </p>
            )}
          </div>

          {/* Noise Detail */}
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Ear size={13} /> Noise Exposure
              </span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                noiseStatus.level === 'safe' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' :
                noiseStatus.level === 'caution' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
              }`}>{noiseStatus.label}</span>
            </div>
            <GaugeBar value={weather.noiseLevel ?? 0} max={120}
              segments={[
                { threshold: 0, color: 'bg-emerald-500' }, { threshold: 80, color: 'bg-amber-500' },
                { threshold: 85, color: 'bg-orange-500' }, { threshold: 90, color: 'bg-red-500' },
              ]}
            />
            <div className="flex justify-between mt-2 text-[10px] text-slate-400 dark:text-slate-500">
              <span>40 dB</span><span>60</span><span>80</span><span>85</span><span>90</span><span>120+</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> &lt;80 dB Safe</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 80-85 dB TWA limit</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> &gt;85 dB Action level</span>
            </div>
          </div>
        </div>

        {/* ─── Additional Info Row ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2.5 border border-slate-100 dark:border-slate-700">
            <Eye size={16} className={weather.visibility < THRESHOLDS.visibility.poor ? 'text-red-500' : weather.visibility < THRESHOLDS.visibility.moderate ? 'text-amber-500' : 'text-emerald-500'} />
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Visibility</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{weather.visibility} km</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2.5 border border-slate-100 dark:border-slate-700">
            <Gauge size={16} className="text-slate-400 dark:text-slate-500" />
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Pressure</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{weather.pressure} hPa</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2.5 border border-slate-100 dark:border-slate-700">
            <Umbrella size={16} className={weather.precipitation > 50 ? 'text-blue-600' : 'text-blue-400'} />
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Rain Chance</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{weather.precipitation}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg px-3 py-2.5 border border-slate-100 dark:border-slate-700">
            <Thermometer size={16} className="text-orange-500" />
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">Feels Like</p>
              <p className={`text-sm font-bold ${statusColor[getTempStatus(weather.feelsLike)]}`}>{weather.feelsLike}°C</p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ AI SAFETY ADVISORY SECTION ═══ */}
      <div className="border-t border-slate-200 dark:border-slate-700">
        <button onClick={() => setAdvisoryExpanded(!advisoryExpanded)}
          className="w-full px-5 py-3 flex items-center justify-between bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 hover:from-purple-100 hover:to-blue-100 dark:hover:from-purple-950/50 dark:hover:to-blue-950/50 transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
              <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <span className="font-bold text-slate-800 dark:text-white text-sm">AI Safety Advisory</span>
            {riskAnalysis && (
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                riskAnalysis.riskLevel === 'Critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' :
                riskAnalysis.riskLevel === 'High' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' :
                riskAnalysis.riskLevel === 'Medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400' :
                'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
              }`}>{riskAnalysis.riskLevel} Risk</span>
            )}
            {loadingAnalysis && <Loader2 size={14} className="animate-spin text-purple-500" />}
          </div>
          {advisoryExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </button>

        {advisoryExpanded && (
          <div className="px-5 py-4 bg-white dark:bg-slate-900">
            {loadingAnalysis ? (
              <div className="flex items-center justify-center gap-3 py-8 text-slate-400 dark:text-slate-500">
                <Loader2 className="animate-spin" size={20} />
                <span className="text-sm font-medium">Analyzing environmental conditions against active operations…</span>
              </div>
            ) : riskAnalysis ? (
              <div className="space-y-4">
                {/* Risk Summary Banner */}
                <div className={`rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 ${
                  riskAnalysis.riskLevel === 'Critical' || riskAnalysis.riskLevel === 'High'
                    ? 'bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900'
                    : riskAnalysis.riskLevel === 'Medium'
                    ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'
                    : 'bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900'
                }`}>
                  <div className={`p-3 rounded-xl shrink-0 ${
                    riskAnalysis.riskLevel === 'Critical' || riskAnalysis.riskLevel === 'High' ? 'bg-red-100 dark:bg-red-900/40' :
                    riskAnalysis.riskLevel === 'Medium' ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'
                  }`}>
                    {riskAnalysis.riskLevel === 'Critical' || riskAnalysis.riskLevel === 'High'
                      ? <AlertTriangle size={28} className="text-red-600 dark:text-red-400" />
                      : riskAnalysis.riskLevel === 'Medium'
                      ? <CircleAlert size={28} className="text-amber-600 dark:text-amber-400" />
                      : <CheckCircle2 size={28} className="text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-white mb-1">
                      {riskAnalysis.riskLevel === 'Critical' ? 'Critical Safety Alert' :
                       riskAnalysis.riskLevel === 'High' ? 'High Risk Warning' :
                       riskAnalysis.riskLevel === 'Medium' ? 'Moderate Conditions' :
                       'Low Risk — Favorable Conditions'}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {riskAnalysis.summary || `Based on current environmental readings, the overall site risk level is ${riskAnalysis.riskLevel.toLowerCase()}. ${riskAnalysis.recommendations?.[0] || ''}`}
                    </p>
                  </div>
                </div>

                {/* Recommendations */}
                {(riskAnalysis.recommendations || []).length > 0 && (
                  <div>
                    <h5 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Zap size={12} /> Recommended Actions
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {riskAnalysis.recommendations.map((rec, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:shadow-sm transition-shadow">
                          <div className={`mt-0.5 p-1 rounded-md shrink-0 ${
                            riskAnalysis.riskLevel === 'Critical' || riskAnalysis.riskLevel === 'High'
                              ? 'bg-red-100 dark:bg-red-900/40' : riskAnalysis.riskLevel === 'Medium'
                              ? 'bg-amber-100 dark:bg-amber-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'
                          }`}>
                            {riskAnalysis.riskLevel === 'Critical' || riskAnalysis.riskLevel === 'High'
                              ? <AlertTriangle size={12} className="text-red-600 dark:text-red-400" />
                              : <CheckCircle2 size={12} className="text-emerald-600 dark:text-emerald-400" />}
                          </div>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{rec}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Affected Activities */}
                {(riskAnalysis.affectedActivities || []).length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">
                      Impacted Operations:
                    </span>
                    {riskAnalysis.affectedActivities.map((act, idx) => (
                      <span key={idx} className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {act}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">Click refresh to load latest environmental analysis.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
