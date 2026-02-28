
import React, { useState, useEffect } from 'react';
import { 
    CloudRain, Wind, Thermometer, Droplets, Activity, Ear, 
    Sparkles, Loader2, AlertTriangle, CheckCircle2, RefreshCw, Lock
} from 'lucide-react';
import { EnvironmentalData, WeatherRiskAnalysis, PermitStatus, SubscriptionTier } from '../types';
import { analyzeWeatherRisksAI } from '../services/geminiService';
import { getPermits } from '../services/storageService';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const EnvironmentalCard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [weather, setWeather] = useState<EnvironmentalData | null>(null);
    const [riskAnalysis, setRiskAnalysis] = useState<WeatherRiskAnalysis | null>(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);

    useEffect(() => {
        // Initial load
        refreshWeather();
    }, []);

    const generateRandomWeather = (): EnvironmentalData => {
        // Simulate minor fluctuations for "Live" feel
        const baseTemp = 28 + (Math.random() * 6 - 3); // 25-31
        const baseWind = 20 + (Math.random() * 20 - 10); // 10-30
        const conditions = ['Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain'];
        
        return {
            temperature: Math.round(baseTemp),
            condition: conditions[Math.floor(Math.random() * conditions.length)],
            windSpeed: Math.round(baseWind), 
            humidity: Math.round(60 + (Math.random() * 20 - 10)),
            aqi: Math.round(80 + (Math.random() * 40 - 20)),
            noiseLevel: Math.round(75 + (Math.random() * 15 - 5)),
            location: 'Site Zone A'
        };
    };

    const refreshWeather = async () => {
        const newData = generateRandomWeather();
        setWeather(newData);
        
        // Trigger AI Analysis automatically if Pro+
        if (user?.tier !== SubscriptionTier.FREE) {
            handleRunAnalysis(newData);
        }
    };

    const handleRunAnalysis = async (data: EnvironmentalData) => {
        if (user?.tier === SubscriptionTier.FREE) return;
        setLoadingAnalysis(true);
        try {
            // Get active permits to see what work is happening
            const activePermits = (await getPermits()).filter(p => p.status === PermitStatus.APPROVED);
            const activeTypes = Array.from(new Set(activePermits.map(p => p.type))) as string[];
            
            // Fallback if no permits
            if(activeTypes.length === 0) activeTypes.push('General Construction', 'Vehicle Movement');

            const result = await analyzeWeatherRisksAI(data);
            setRiskAnalysis(result);
        } catch (e) {
            console.error("Env Analysis failed", e);
        } finally {
            setLoadingAnalysis(false);
        }
    };

    if (!weather) return <div className="h-48 flex items-center justify-center"><Loader2 className="animate-spin text-brand-navy" /></div>;

    const getAQIColor = (aqi: number) => {
        if (aqi <= 50) return 'text-green-500';
        if (aqi <= 100) return 'text-yellow-500';
        if (aqi <= 150) return 'text-orange-500';
        return 'text-red-600';
    };

    const getAQILabel = (aqi: number) => {
        if (aqi <= 50) return 'Good';
        if (aqi <= 100) return 'Moderate';
        if (aqi <= 150) return 'Unhealthy (Sensitive)';
        return 'Unhealthy';
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <CloudRain size={18} className="text-blue-600" /> Environmental Officer
                    </h3>
                    <p className="text-xs text-slate-500">Live Forecast & Site Monitoring</p>
                </div>
                <div className="text-right flex items-center gap-3">
                    <div>
                        <span className="text-xs font-bold text-slate-400 block uppercase">Location</span>
                        <span className="text-sm font-semibold text-slate-700">{weather.location}</span>
                    </div>
                    
                    <button 
                        onClick={refreshWeather} 
                        disabled={loadingAnalysis}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors"
                        title="Simulate Live Update"
                    >
                        <RefreshCw size={14} className={loadingAnalysis ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                {/* 1. Weather Stats */}
                <div className="p-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Thermometer size={18} />
                            <span className="text-sm font-medium">Temp</span>
                        </div>
                        <span className="text-lg font-bold text-slate-800">{weather.temperature}°C</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Wind size={18} />
                            <span className="text-sm font-medium">Wind</span>
                        </div>
                        <span className={`text-lg font-bold ${weather.windSpeed > 30 ? 'text-red-600' : 'text-slate-800'}`}>
                            {weather.windSpeed} km/h
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-600">
                            <Droplets size={18} />
                            <span className="text-sm font-medium">Humidity</span>
                        </div>
                        <span className="text-lg font-bold text-slate-800">{weather.humidity}%</span>
                    </div>
                    <div className="text-center pt-2">
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full">
                            {weather.condition}
                        </span>
                    </div>
                </div>

                {/* 2. Air & Noise */}
                <div className="p-4 space-y-6">
                    {/* AQI */}
                    <div className="text-center">
                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Air Quality Index</p>
                        <div className="relative inline-flex items-center justify-center">
                            <Activity size={48} className={`opacity-20 ${getAQIColor(weather.aqi)}`} />
                            <span className={`absolute text-2xl font-bold ${getAQIColor(weather.aqi)}`}>{weather.aqi}</span>
                        </div>
                        <p className={`text-xs font-medium mt-1 ${getAQIColor(weather.aqi)}`}>{getAQILabel(weather.aqi)}</p>
                    </div>

                    {/* Noise */}
                    <div className="text-center border-t border-slate-100 pt-4">
                        <p className="text-xs text-slate-400 uppercase font-bold mb-1 flex items-center justify-center gap-1">
                            <Ear size={12} /> Noise Level
                        </p>
                        <div className="flex items-end justify-center gap-1 h-8">
                            {[1,2,3,4,5].map(bar => (
                                <div 
                                    key={bar} 
                                    className={`w-2 rounded-t transition-all duration-500 ${
                                        (weather.noiseLevel / 20) >= bar ? (weather.noiseLevel > 85 ? 'bg-red-500' : 'bg-green-500') : 'bg-slate-200'
                                    }`}
                                    style={{ height: `${bar * 20}%` }}
                                ></div>
                            ))}
                        </div>
                        <p className="text-sm font-bold text-slate-700 mt-1">{weather.noiseLevel} dB</p>
                    </div>
                </div>

                {/* 3. AI Safety Recommendations */}
                <div className="p-4 bg-slate-50/50 flex flex-col relative">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={16} className="text-purple-600" />
                        <h4 className="text-sm font-bold text-slate-800">AI Safety Advisory</h4>
                    </div>

                    {user?.tier === SubscriptionTier.FREE ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                            <Lock size={32} className="text-slate-300 mb-2" />
                            <p className="text-xs text-slate-500 mb-3">Real-time risk analysis is available on Pro.</p>
                            <button 
                                onClick={() => navigate('/pricing')}
                                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700"
                            >
                                Upgrade
                            </button>
                        </div>
                    ) : loadingAnalysis ? (
                        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
                            <Loader2 className="animate-spin mr-2" size={16} /> Analyzing forecast...
                        </div>
                    ) : riskAnalysis ? (
                        <div className="flex-1 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-500">Risk Level</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                                    riskAnalysis.riskLevel === 'Critical' || riskAnalysis.riskLevel === 'High' 
                                    ? 'bg-red-100 text-red-700' 
                                    : riskAnalysis.riskLevel === 'Medium' 
                                    ? 'bg-orange-100 text-orange-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                    {riskAnalysis.riskLevel}
                                </span>
                            </div>
                            
                            <div className="space-y-2">
                                {(riskAnalysis.recommendations || []).slice(0, 3).map((rec, idx) => (
                                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2 rounded border border-slate-100 shadow-sm">
                                        {riskAnalysis.riskLevel === 'High' ? <AlertTriangle size={12} className="text-red-500 mt-0.5 shrink-0" /> : <CheckCircle2 size={12} className="text-blue-500 mt-0.5 shrink-0" />}
                                        <span className="leading-snug">{rec}</span>
                                    </div>
                                ))}
                            </div>

                            {(riskAnalysis.affectedActivities || []).length > 0 && (
                                <div className="text-[10px] text-slate-500 mt-auto pt-2">
                                    <span className="font-bold">Impacted:</span> {(riskAnalysis.affectedActivities || []).slice(0, 2).join(', ')}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400">Data unavailable.</p>
                    )}
                </div>
            </div>
        </div>
    );
};
