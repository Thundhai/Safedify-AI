import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { isMetaMaskAvailable, showWalletInstallPrompt } from '../services/walletService';

interface MetaMaskInstallBannerProps {
  onDismiss?: () => void;
  persistent?: boolean;
  className?: string;
}

export const MetaMaskInstallBanner: React.FC<MetaMaskInstallBannerProps> = ({
  onDismiss,
  persistent = false,
  className = ''
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if MetaMask is already installed
    setIsInstalled(isMetaMaskAvailable());
    
    // Set up periodic checking for MetaMask installation
    const checkInterval = setInterval(() => {
      const installed = isMetaMaskAvailable();
      if (installed && !isInstalled) {
        setIsInstalled(true);
        // Show success message briefly
        setTimeout(() => {
          if (onDismiss) onDismiss();
          setDismissed(true);
        }, 3000);
      }
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [isInstalled, onDismiss]);

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  const handleInstallClick = () => {
    showWalletInstallPrompt();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  // Don't show if dismissed (unless persistent) or if MetaMask is already installed
  if ((dismissed && !persistent) || isInstalled) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {isInstalled ? (
        // Success state
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-800">
                🎉 MetaMask Detected!
              </h4>
              <p className="text-sm text-green-700">
                MetaMask has been successfully installed. Refreshing the page to enable blockchain features...
              </p>
            </div>
            {!persistent && (
              <button
                onClick={handleDismiss}
                className="text-green-600 hover:text-green-800 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ) : (
        // Installation prompt state
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
              🦊
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-orange-800">
                  MetaMask Required for Blockchain Features
                </h4>
                {!persistent && (
                  <button
                    onClick={handleDismiss}
                    className="text-orange-600 hover:text-orange-800 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <p className="text-sm text-orange-700 mb-3">
                Install MetaMask to access secure wallet features and blockchain functionality in Safedify AI.
              </p>
              
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleInstallClick}
                  className="inline-flex items-center px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-md hover:from-orange-600 hover:to-red-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-all duration-200 transform hover:scale-105"
                >
                  <Download className="w-3 h-3 mr-1.5" />
                  Install MetaMask
                </button>
                
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center px-3 py-2 text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-md hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 mr-1.5" />
                  I installed it, refresh
                </button>
                
                <a
                  href="https://metamask.io/faqs/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-3 py-2 text-xs font-medium text-orange-600 hover:text-orange-800 underline"
                >
                  Learn more about MetaMask
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact floating notification version
export const MetaMaskFloatingPrompt: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Show prompt only if MetaMask is not installed
    if (!isMetaMaskAvailable()) {
      const timer = setTimeout(() => setVisible(true), 5000); // Show after 5 seconds
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      const checkInterval = setInterval(() => {
        if (isMetaMaskAvailable()) {
          setInstalled(true);
          setTimeout(() => {
            setVisible(false);
            window.location.reload();
          }, 2000);
        }
      }, 1000);

      return () => clearInterval(checkInterval);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 transform transition-all duration-300 hover:scale-105">
        {installed ? (
          <div className="text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">MetaMask Detected!</p>
            <p className="text-xs text-gray-600">Refreshing page...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center mb-2">
              <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center mr-2 text-sm">
                🦊
              </div>
              <h4 className="text-sm font-medium text-gray-900">Add MetaMask?</h4>
              <button
                onClick={() => setVisible(false)}
                className="ml-auto text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Enable blockchain features with MetaMask wallet
            </p>
            <div className="flex gap-2">
              <button
                onClick={showWalletInstallPrompt}
                className="flex-1 bg-orange-500 text-white text-xs py-2 px-3 rounded-md hover:bg-orange-600 transition-colors"
              >
                Install
              </button>
              <button
                onClick={() => setVisible(false)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2"
              >
                Later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};