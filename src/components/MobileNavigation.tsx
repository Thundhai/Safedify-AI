/**
 * MOBILE NAVIGATION
 * Touch-optimized navigation for mobile PWA experience
 * Features bottom tab bar and gesture-friendly interactions
 */

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  AlertTriangle,
  Eye,
  BarChart3,
  Shield,
  Bell,
  User,
  Plus,
  Camera,
  Mic,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MobileNavProps {
  showFAB?: boolean;
  onQuickAction?: (action: string) => void;
}

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/dashboard',
    color: 'text-blue-600'
  },
  {
    id: 'incidents',
    label: 'Incidents',
    icon: AlertTriangle,
    path: '/incidents',
    color: 'text-red-600'
  },
  {
    id: 'observations',
    label: 'Observations',
    icon: Eye,
    path: '/observations',
    color: 'text-green-600'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/analytics',
    color: 'text-purple-600'
  },
  {
    id: 'emergency',
    label: 'Emergency',
    icon: Shield,
    path: '/emergency',
    color: 'text-orange-600'
  }
];

const QUICK_ACTIONS = [
  {
    id: 'incident',
    label: 'Report Incident',
    icon: AlertTriangle,
    color: 'bg-red-500 hover:bg-red-600'
  },
  {
    id: 'observation',
    label: 'Log Observation',
    icon: Eye,
    color: 'bg-green-500 hover:bg-green-600'
  },
  {
    id: 'photo',
    label: 'Take Photo',
    icon: Camera,
    color: 'bg-blue-500 hover:bg-blue-600'
  },
  {
    id: 'voice',
    label: 'Voice Note',
    icon: Mic,
    color: 'bg-purple-500 hover:bg-purple-600'
  }
];

export default function MobileNavigation({ 
  showFAB = true, 
  onQuickAction 
}: MobileNavProps) {
  const location = useLocation();
  const { user } = useAuth();
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleQuickAction = (actionId: string) => {
    setShowQuickActions(false);
    if (onQuickAction) {
      onQuickAction(actionId);
    }
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <>
      {/* Top Status Bar */}
      <div className="fixed top-0 left-0 right-0 bg-white border-b z-50 safe-area-top">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-semibold text-gray-900">Safedify AI</div>
              <div className="text-xs text-gray-500">
                {isOnline ? '🟢 Online' : '🔴 Offline'}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="relative p-2 text-gray-600 hover:text-gray-900">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </button>
            <button 
              onClick={() => setShowMenu(true)}
              className="p-2 text-gray-600 hover:text-gray-900"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t z-40 safe-area-bottom">
        <div className="grid grid-cols-5 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive = isActiveRoute(item.path);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex flex-col items-center py-2 px-1 transition-colors ${
                  isActive 
                    ? `${item.color} font-medium` 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className={`w-6 h-6 mb-1 ${isActive ? '' : 'stroke-[1.5]'}`} />
                <span className="text-xs leading-tight text-center">
                  {item.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 bg-current rounded-full mt-1"></div>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Floating Action Button */}
      {showFAB && (
        <div className="fixed bottom-20 right-4 z-30">
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className={`w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-all transform ${
              showQuickActions ? 'rotate-45' : 'rotate-0'
            } active:scale-95`}
          >
            <Plus className="w-6 h-6 mx-auto" />
          </button>

          {/* Quick Actions Menu */}
          {showQuickActions && (
            <>
              <div 
                className="fixed inset-0 bg-black bg-opacity-20"
                onClick={() => setShowQuickActions(false)}
              />
              <div className="absolute bottom-16 right-0 space-y-3">
                {QUICK_ACTIONS.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <div
                      key={action.id}
                      className="flex items-center space-x-3 animate-in slide-in-from-bottom-2 duration-300"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <span className="bg-white px-3 py-2 rounded-full shadow-md text-sm font-medium whitespace-nowrap">
                        {action.label}
                      </span>
                      <button
                        onClick={() => handleQuickAction(action.id)}
                        className={`w-12 h-12 rounded-full text-white shadow-lg transition-all active:scale-95 ${action.color}`}
                      >
                        <Icon className="w-5 h-5 mx-auto" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Side Menu */}
      {showMenu && (
        <div className="fixed inset-0 z-50">
          <div 
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute top-0 right-0 h-full w-80 bg-white shadow-xl transform transition-transform">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button
                  onClick={() => setShowMenu(false)}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              {/* User Profile */}
              <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg mb-6">
                <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-medium">{user?.name || 'Guest User'}</div>
                  <div className="text-sm text-gray-500">{user?.role || 'Worker'}</div>
                </div>
              </div>

              {/* Menu Items */}
              <nav className="space-y-2">
                <Link
                  to="/profile"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100"
                >
                  <User className="w-5 h-5 text-gray-500" />
                  <span>Profile Settings</span>
                </Link>

                <Link
                  to="/training"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100"
                >
                  <Shield className="w-5 h-5 text-gray-500" />
                  <span>Training Dashboard</span>
                </Link>

                <Link
                  to="/permits"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100"
                >
                  <BarChart3 className="w-5 h-5 text-gray-500" />
                  <span>Work Permits</span>
                </Link>

                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center space-x-3 p-3">
                    <div className={`w-3 h-3 rounded-full ${
                      isOnline ? 'bg-green-500' : 'bg-red-500'
                    }`} />
                    <span className="text-sm text-gray-600">
                      {isOnline ? 'Connected' : 'Offline Mode'}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-500 px-3">
                    PWA Version 1.0.0
                  </div>
                </div>
              </nav>
            </div>
          </div>
        </div>
      )}

      {/* Safe Area Styles */}
      <style jsx>{`
        .safe-area-top {
          padding-top: env(safe-area-inset-top);
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </>
  );
}