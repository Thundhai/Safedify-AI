/**
 * MOBILE DASHBOARD
 * Touch-optimized dashboard for mobile PWA experience
 * Features quick stats, recent activity, and action shortcuts
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Eye,
  Shield,
  TrendingUp,
  TrendingDown,
  Clock,
  MapPin,
  Users,
  Calendar,
  ChevronRight,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import offlineStorage from '../services/offlineStorageService';

interface DashboardStats {
  todayIncidents: number;
  weeklyIncidents: number;
  activeObservations: number;
  safetyScore: number;
  daysWithoutIncident: number;
  pendingInspections: number;
  nearMisses: number;
  criticalIssues: number;
}

interface RecentActivity {
  id: string;
  type: 'incident' | 'observation' | 'inspection';
  title: string;
  location: string;
  timestamp: number;
  severity?: string;
  status: string;
}

const QUICK_ACTIONS = [
  {
    id: 'incident',
    title: 'Report Incident',
    icon: AlertTriangle,
    color: 'bg-red-500',
    path: '/incidents/new'
  },
  {
    id: 'observation',
    title: 'Log Observation',
    icon: Eye,
    color: 'bg-green-500',
    path: '/observations/new'
  },
  {
    id: 'inspection',
    title: 'Start Inspection',
    icon: Shield,
    color: 'bg-blue-500',
    path: '/inspections/new'
  },
  {
    id: 'emergency',
    title: 'Emergency',
    icon: Zap,
    color: 'bg-orange-500',
    path: '/emergency'
  }
];

export default function MobileDashboard() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    todayIncidents: 0,
    weeklyIncidents: 3,
    activeObservations: 8,
    safetyScore: 87,
    daysWithoutIncident: 12,
    pendingInspections: 2,
    nearMisses: 1,
    criticalIssues: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [offlineStatus, setOfflineStatus] = useState({
    pendingSubmissions: 0,
    cachedData: 0,
    lastSync: null as number | null
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadDashboardData();
    loadOfflineStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadDashboardData = async () => {
    try {
      // In a real app, this would fetch from API
      // For now, we'll use mock data and cache it offline
      const mockActivity: RecentActivity[] = [
        {
          id: '1',
          type: 'incident',
          title: 'Slip and fall in warehouse',
          location: 'Warehouse A, Section 3',
          timestamp: Date.now() - 2 * 60 * 60 * 1000,
          severity: 'medium',
          status: 'investigating'
        },
        {
          id: '2',
          type: 'observation',
          title: 'Proper PPE usage observed',
          location: 'Construction Site B',
          timestamp: Date.now() - 4 * 60 * 60 * 1000,
          status: 'completed'
        },
        {
          id: '3',
          type: 'inspection',
          title: 'Monthly safety inspection',
          location: 'Office Building',
          timestamp: Date.now() - 6 * 60 * 60 * 1000,
          status: 'pending'
        }
      ];

      setRecentActivity(mockActivity);

      // Cache the data offline
      await offlineStorage.cacheData('dashboard-stats', stats);
      await offlineStorage.cacheData('recent-activity', mockActivity);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      // Try to load from cache
      const cachedStats = await offlineStorage.getCachedData('dashboard-stats');
      const cachedActivity = await offlineStorage.getCachedData('recent-activity');
      
      if (cachedStats) setStats(cachedStats);
      if (cachedActivity) setRecentActivity(cachedActivity);
    }
  };

  const loadOfflineStatus = async () => {
    try {
      const status = await offlineStorage.getOfflineStatus();
      setOfflineStatus(status);
    } catch (error) {
      console.error('Failed to load offline status:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadDashboardData();
      await loadOfflineStatus();
      
      // Trigger sync if online
      if (isOnline) {
        await offlineStorage.syncPendingData();
      }
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'incident': return AlertTriangle;
      case 'observation': return Eye;
      case 'inspection': return Shield;
      default: return Clock;
    }
  };

  const getActivityColor = (type: string, severity?: string) => {
    if (type === 'incident') {
      switch (severity) {
        case 'critical': return 'text-purple-600';
        case 'high': return 'text-red-600';
        case 'medium': return 'text-orange-600';
        case 'low': return 'text-yellow-600';
        default: return 'text-red-600';
      }
    }
    if (type === 'observation') return 'text-green-600';
    if (type === 'inspection') return 'text-blue-600';
    return 'text-gray-600';
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));
    
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-20">
      {/* Header */}
      <div className="bg-white p-6 border-b">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}! 👋
            </h1>
            <p className="text-gray-600">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`p-3 rounded-full ${
              isRefreshing 
                ? 'bg-gray-100 text-gray-400' 
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Connection Status */}
        <div className="flex items-center space-x-2 mb-4">
          {isOnline ? (
            <div className="flex items-center space-x-2 text-green-600">
              <Wifi className="w-4 h-4" />
              <span className="text-sm">Connected</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-red-600">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm">Offline Mode</span>
            </div>
          )}
          
          {offlineStatus.pendingSubmissions > 0 && (
            <div className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
              {offlineStatus.pendingSubmissions} pending sync
            </div>
          )}
        </div>

        {/* Safety Score */}
        <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold">{stats.safetyScore}%</div>
              <div className="text-green-100">Safety Score</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{stats.daysWithoutIncident}</div>
              <div className="text-green-100">Days Safe</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-4">
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.id}
                to={action.path}
                className="p-4 bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow active:scale-95"
              >
                <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900">{action.title}</h3>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="px-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{stats.todayIncidents}</div>
                <div className="text-sm text-gray-600">Incidents Today</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{stats.activeObservations}</div>
                <div className="text-sm text-gray-600">Observations</div>
              </div>
              <Eye className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{stats.pendingInspections}</div>
                <div className="text-sm text-gray-600">Pending Inspections</div>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">{stats.nearMisses}</div>
                <div className="text-sm text-gray-600">Near Misses</div>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Link 
            to="/activity" 
            className="text-blue-600 text-sm font-medium flex items-center"
          >
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <div className="bg-white p-6 rounded-lg border text-center">
              <div className="text-gray-500 mb-2">No recent activity</div>
              <div className="text-sm text-gray-400">
                Start by reporting an incident or logging an observation
              </div>
            </div>
          ) : (
            recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              const color = getActivityColor(activity.type, activity.severity);
              
              return (
                <div key={activity.id} className="bg-white p-4 rounded-lg border hover:shadow-sm transition-shadow">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg bg-gray-50`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {activity.title}
                      </h3>
                      <div className="flex items-center space-x-2 text-sm text-gray-600 mt-1">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{activity.location}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(activity.timestamp)}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          activity.status === 'completed' 
                            ? 'bg-green-100 text-green-700'
                            : activity.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="px-6 mt-6 pb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">This Week</h2>
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">{stats.weeklyIncidents}</div>
              <div className="text-sm text-gray-600">Total Incidents</div>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingDown className="w-5 h-5 text-green-500" />
              <span className="text-sm text-green-600 font-medium">-12%</span>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-500">
            Compared to last week
          </div>
        </div>
      </div>
    </div>
  );
}