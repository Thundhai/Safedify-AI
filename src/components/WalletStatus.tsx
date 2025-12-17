import React from 'react';
import { AlertTriangle, Download, Wallet, CheckCircle, XCircle } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

interface WalletStatusProps {
  showWhenDisabled?: boolean;
  className?: string;
}

export const WalletStatus: React.FC<WalletStatusProps> = ({ 
  showWhenDisabled = false,
  className = ''
}) => {
  const { 
    isAvailable, 
    isConnected, 
    walletType, 
    error, 
    isLoading,
    connect,
    shouldPromptInstall,
    getStatusMessage,
    isWalletFeatureEnabled
  } = useWallet();

  // Don't show if wallet features are disabled and showWhenDisabled is false
  if (!isWalletFeatureEnabled && !showWhenDisabled) {
    return null;
  }

  // Don't show if everything is working fine and no user action needed
  if (isAvailable && !error && !shouldPromptInstall()) {
    return null;
  }

  return (
    <div className={`wallet-status ${className}`}>
      {shouldPromptInstall() && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                MetaMask Required
              </h4>
              <p className="text-sm text-amber-700 mb-3">
                To use blockchain features, please install MetaMask browser extension.
              </p>
              <button
                onClick={() => window.open('https://metamask.io/download/', '_blank')}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-amber-900 bg-amber-100 border border-amber-300 rounded-md hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                <Download className="w-4 h-4 mr-2" />
                Install MetaMask
              </button>
            </div>
          </div>
        </div>
      )}

      {!isWalletFeatureEnabled && showWhenDisabled && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <Wallet className="w-5 h-5 text-slate-500 mr-3" />
            <div className="flex-1">
              <p className="text-sm text-slate-600">
                Blockchain features are currently disabled for this application.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && isWalletFeatureEnabled && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <XCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800 mb-1">
                Wallet Connection Issue
              </h4>
              <p className="text-sm text-red-700 mb-3">
                {getStatusMessage()}
              </p>
              {isAvailable && (
                <button
                  onClick={connect}
                  disabled={isLoading}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-900 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {isLoading ? 'Connecting...' : 'Try Again'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {isConnected && isWalletFeatureEnabled && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
            <div className="flex-1">
              <p className="text-sm text-green-800 font-medium">
                Connected to {walletType}
              </p>
              <p className="text-sm text-green-600">
                Blockchain features are available.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Compact version for status indicators
export const WalletStatusIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isAvailable, isConnected, shouldPromptInstall, isWalletFeatureEnabled } = useWallet();

  if (!isWalletFeatureEnabled) {
    return null;
  }

  return (
    <div className={`flex items-center ${className}`}>
      {shouldPromptInstall() ? (
        <>
          <AlertTriangle className="w-4 h-4 text-amber-500 mr-1" />
          <span className="text-xs text-amber-600">MetaMask Required</span>
        </>
      ) : isConnected ? (
        <>
          <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
          <span className="text-xs text-green-600">Wallet Connected</span>
        </>
      ) : isAvailable ? (
        <>
          <Wallet className="w-4 h-4 text-slate-500 mr-1" />
          <span className="text-xs text-slate-600">Wallet Available</span>
        </>
      ) : (
        <>
          <XCircle className="w-4 h-4 text-red-500 mr-1" />
          <span className="text-xs text-red-600">No Wallet</span>
        </>
      )}
    </div>
  );
};