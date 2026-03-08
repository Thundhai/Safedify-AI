import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, CheckCircle, TrendingUp, ArrowLeft, Brain, ShieldAlert } from 'lucide-react';
import { getIncidents, calculateHSEMetrics } from '../services/storageService';
import { predictiveSafetyAlertsAI } from '../services/geminiService';
import { SubscriptionTier } from '../types';
import { EnvironmentalCard } from './EnvironmentalCard';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const PredictiveIntelligence: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [predictiveAlerts, setPredictiveAlerts] = useState<any[]>([]);
  const [loadingPredictions, setLoadingPredictions] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (user?.tier === SubscriptionTier.FREE) return;
      try {
        const incidents = (await getIncidents()) || [];
        if (incidents.length === 0) return;
        setLoadingPredictions(true);
        const metrics = await calculateHSEMetrics();
        const res = await predictiveSafetyAlertsAI(metrics, incidents);
        if (res && Array.isArray(res.predictions)) {
          setPredictiveAlerts(res.predictions);
        }
      } catch (err) {
        console.error('Predictive Alert Error:', err);
        setPredictiveAlerts([]);
      } finally {
        setLoadingPredictions(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Page Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Back to Dashboard"
        >
          <ArrowLeft size={20} className="text-slate-500" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-600 rounded-xl shadow-sm">
            <Brain className="text-white" size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Predictive &amp; Environmental Intelligence</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">AI-driven forecasts and real-time site condition monitoring</p>
          </div>
        </div>
      </div>

      {/* Environmental Intelligence Card */}
      <section>
        <EnvironmentalCard />
      </section>

      {/* Predictive Risk Forecast */}
      <section>
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-xl shadow-md border border-slate-700 relative overflow-hidden flex flex-col min-h-[300px]">
          {/* Overlay for Free Users */}
          {user?.tier === SubscriptionTier.FREE && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center">
              <Sparkles size={48} className="text-yellow-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Predictive AI Analytics</h3>
              <p className="text-slate-300 mb-6 text-sm">Upgrade to Pro to unlock 7-day risk forecasting and trend analysis.</p>
              <button
                onClick={() => navigate('/pricing')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-lg"
              >
                Unlock Intelligence
              </button>
            </div>
          )}

          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp size={150} />
          </div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <Sparkles className="text-yellow-400" size={20} />
              </div>
              <h3 className="text-lg font-bold">Predictive Risk Forecast (7 Days)</h3>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
              {loadingPredictions ? (
                <div className="flex items-center justify-center h-full text-slate-400 gap-2 py-12">
                  <Loader2 className="animate-spin" /> Analyzing historical data...
                </div>
              ) : (predictiveAlerts || []).length > 0 ? (
                predictiveAlerts.map((alert, idx) => (
                  <div key={idx} className="bg-white/10 border border-white/10 p-4 rounded-xl flex items-start gap-4 backdrop-blur-sm hover:bg-white/20 transition-colors">
                    <div className={`mt-1.5 w-3 h-3 rounded-full shrink-0 ${alert.likelihood === 'High' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 'bg-yellow-500'}`}></div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${alert.likelihood === 'High' ? 'bg-red-500/20 text-red-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                          {alert.likelihood} Probability
                        </span>
                      </div>
                      <p className="font-bold text-white mb-1">{alert.alert}</p>
                      <p className="text-sm text-slate-300">{alert.suggestedMitigation}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 py-12">
                  <CheckCircle size={48} className="text-green-500/50 mb-2" />
                  <p>No critical risk patterns detected for the upcoming week.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
