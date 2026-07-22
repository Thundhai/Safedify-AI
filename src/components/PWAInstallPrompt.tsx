/**
 * PWA INSTALL PROMPT
 * Encourages users to install the PWA on their mobile device
 * Features native app-like install experience
 */

import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Download, 
  X, 
  Shield, 
  Wifi, 
  Zap,
  Star
} from 'lucide-react';

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWA_FEATURES = [
  {
    icon: Shield,
    title: 'Offline Access',
    description: 'Report incidents even without internet'
  },
  {
    icon: Zap,
    title: 'Fast & Responsive',
    description: 'Native app-like performance'
  },
  {
    icon: Wifi,
    title: 'Auto-Sync',
    description: 'Data syncs when connection returns'
  }
];

export default function PWAInstallPrompt({ 
  onInstall, 
  onDismiss 
}: InstallPromptProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSource, setInstallSource] = useState<'browser' | 'manual' | null>(null);

  useEffect(() => {
    // Check if app is already installed (standalone mode)
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);

    // Check if user has dismissed install prompt before
    const dismissedAt = localStorage.getItem('pwa-install-dismissed');
    const dismissedDate = dismissedAt ? new Date(dismissedAt) : null;
    const daysSinceDismissed = dismissedDate ? 
      (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24) : 
      999;

    // Show prompt if not installed and not recently dismissed
    if (!isStandalone && daysSinceDismissed > 3) {
      // Listen for beforeinstallprompt event
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        const installEvent = e as BeforeInstallPromptEvent;
        setDeferredPrompt(installEvent);
        setInstallSource('browser');
        
        // Show prompt after a delay to avoid interrupting initial experience
        setTimeout(() => {
          setShowPrompt(true);
        }, 30000); // Show after 30 seconds
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      // Check for iOS/Safari and show manual install instructions
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      
      if (isIOS && isSafari && !isStandalone) {
        setInstallSource('manual');
        setTimeout(() => {
          setShowPrompt(true);
        }, 45000); // Show later for iOS users
      }

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, [isStandalone]);

  const handleInstall = async () => {
    if (!deferredPrompt && installSource === 'browser') {
      return;
    }

    setIsInstalling(true);

    try {
      if (deferredPrompt) {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          console.log('✅ PWA install accepted');
          setShowPrompt(false);
          if (onInstall) onInstall();
        } else {
          console.log('❌ PWA install dismissed');
        }
        
        setDeferredPrompt(null);
      }
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', new Date().toISOString());
    if (onDismiss) onDismiss();
  };

  const handleNotNow = () => {
    setShowPrompt(false);
    // Don't save dismissal for "Not Now" - user can see prompt again sooner
  };

  if (!showPrompt || isStandalone) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={handleDismiss}
      />
      
      <div className="relative bg-white rounded-t-3xl sm:rounded-3xl p-6 max-w-md w-full mx-4 transform transition-transform animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Install Safedify AI
              </h3>
              <p className="text-sm text-gray-600">
                Get the full mobile experience
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Features */}
        <div className="space-y-4 mb-6">
          {PWA_FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-gray-900">{feature.title}</div>
                  <div className="text-sm text-gray-600">{feature.description}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Install Instructions for iOS */}
        {installSource === 'manual' && (
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center">
              <Smartphone className="w-4 h-4 mr-2" />
              How to Install on iOS
            </h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Tap the Share button below (in Safari)</li>
              <li>2. Scroll down and tap "Add to Home Screen"</li>
              <li>3. Tap "Add" to install the app</li>
            </ol>
          </div>
        )}

        {/* Benefits */}
        <div className="bg-green-50 p-4 rounded-lg mb-6">
          <div className="flex items-center space-x-2 mb-2">
            <Star className="w-4 h-4 text-green-600" />
            <span className="font-medium text-green-900">Why Install?</span>
          </div>
          <ul className="text-sm text-green-800 space-y-1">
            <li>• Works offline for field workers</li>
            <li>• Faster than using a browser</li>
            <li>• Real-time safety notifications</li>
            <li>• Easy access from home screen</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {installSource === 'browser' ? (
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className={`w-full py-4 px-6 rounded-xl font-semibold text-lg transition-colors ${
                isInstalling
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isInstalling ? (
                <div className="flex items-center justify-center space-x-3">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Installing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-3">
                  <Download className="w-5 h-5" />
                  <span>Install App</span>
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={handleDismiss}
              className="w-full py-4 px-6 bg-blue-500 text-white rounded-xl font-semibold text-lg hover:bg-blue-600 transition-colors"
            >
              Got It
            </button>
          )}

          <div className="flex space-x-3">
            <button
              onClick={handleNotNow}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Not Now
            </button>
            <button
              onClick={handleDismiss}
              className="flex-1 py-3 px-4 text-gray-500 rounded-xl font-medium hover:bg-gray-100 transition-colors"
            >
              Don't Show Again
            </button>
          </div>
        </div>

        {/* App Store Alternative */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 text-center">
            Installing creates a shortcut to our web app. No app store needed!
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook to show install prompt programmatically
export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);
    
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  return {
    canInstall,
    isInstalled,
    showInstallPrompt: () => {
      const event = new CustomEvent('show-pwa-install');
      window.dispatchEvent(event);
    }
  };
}