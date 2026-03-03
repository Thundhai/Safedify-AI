
import React, { useState, useEffect } from 'react';
import { getWorkers, getObservations } from '../services/storageService';
import { WorkerProfile } from '../types';
import { Award, Trophy, Star, Medal, Crown } from 'lucide-react';

export const Gamification: React.FC = () => {
    const [workers, setWorkers] = useState<WorkerProfile[]>([]);
    const [challengeProgress, setChallengeProgress] = useState({ completed: 0, goal: 5 });

    useEffect(() => {
        const load = async () => {
            const allWorkers = await getWorkers();
            // Sort by points desc
            const sorted = [...allWorkers].sort((a, b) => (b.points || 0) - (a.points || 0));
            setWorkers(sorted);

            // Calculate monthly challenge: count 'Positive' observations this month
            try {
                const observations = await getObservations();
                const now = new Date();
                const thisMonth = now.getMonth();
                const thisYear = now.getFullYear();
                const positiveThisMonth = observations.filter(o => {
                    const d = new Date(o.date);
                    return o.category === 'Positive' && d.getMonth() === thisMonth && d.getFullYear() === thisYear;
                }).length;
                setChallengeProgress({ completed: Math.min(positiveThisMonth, 5), goal: 5 });
            } catch { /* ignore */ }
        };
        load();
    }, []);

    const getRankIcon = (index: number) => {
        switch(index) {
            case 0: return <Crown size={24} className="text-yellow-500" />;
            case 1: return <Medal size={24} className="text-slate-400" />;
            case 2: return <Medal size={24} className="text-orange-700" />;
            default: return <span className="font-bold text-slate-400 w-6 text-center">{index + 1}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center py-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl text-white shadow-lg">
                <Trophy size={48} className="mx-auto mb-2 text-yellow-300 animate-bounce" />
                <h1 className="text-3xl font-bold">Safety Champions League</h1>
                <p className="text-blue-100">Recognizing excellence in workplace safety.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top 3 Podium */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <Star className="text-yellow-500" /> Leaderboard
                    </h3>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        {workers.map((worker, index) => (
                            <div key={worker.id} className={`flex items-center p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors ${index < 3 ? 'bg-yellow-50/30' : ''}`}>
                                <div className="w-12 flex justify-center shrink-0">
                                    {getRankIcon(index)}
                                </div>
                                <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mx-4 border-2 border-white shadow-sm">
                                    {worker.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                        {worker.name}
                                        {index === 0 && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full uppercase">Leader</span>}
                                    </h4>
                                    <p className="text-xs text-slate-500">{worker.level || 'Novice'} • {worker.role}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-bold text-blue-600">{worker.points || 0}</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">Points</p>
                                </div>
                            </div>
                        ))}
                        {workers.length === 0 && <p className="p-8 text-center text-slate-400">No worker data available.</p>}
                    </div>
                </div>

                {/* Achievements / Rules */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Award size={20} className="text-purple-600" /> How to Earn Points
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                <span className="text-slate-700">Submit Observation</span>
                                <span className="font-bold text-green-600">+10 pts</span>
                            </li>
                            <li className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                <span className="text-slate-700">Close Action Item</span>
                                <span className="font-bold text-green-600">+15 pts</span>
                            </li>
                            <li className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                <span className="text-slate-700">Complete Inspection</span>
                                <span className="font-bold text-green-600">+20 pts</span>
                            </li>
                            <li className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                                <span className="text-slate-700">Finish Training Module</span>
                                <span className="font-bold text-green-600">+30 pts</span>
                            </li>
                        </ul>
                    </div>

                    <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white shadow-md">
                        <h3 className="font-bold text-lg mb-2">Monthly Challenge</h3>
                        <p className="text-sm opacity-90 mb-4">
                            Identify 5 "Safe Behaviors" this month to unlock the <b>Positivity Badge</b>.
                        </p>
                        <div className="w-full bg-white/20 rounded-full h-2 mb-1">
                            <div className="bg-yellow-400 h-2 rounded-full" style={{ width: `${(challengeProgress.completed / challengeProgress.goal) * 100}%` }}></div>
                        </div>
                        <p className="text-xs text-right opacity-80">{challengeProgress.completed} / {challengeProgress.goal} Completed</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
