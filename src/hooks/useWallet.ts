import { useState, useEffect, useCallback } from 'react';
import { 
  isMetaMaskAvailable, 
  isMetaMaskInstalled, 
  getWalletInfo, 
  connectWalletSafely,
  showWalletInstallPrompt,
  isWalletFeatureEnabled
} from '../services/walletService';

interface WalletState {
  isAvailable: boolean;
  isConnected: boolean;
  accounts: string[];
  walletType: string | null;
  error: string | null;
  isLoading: boolean;
}

export const useWallet = () => {
  const [state, setState] = useState<WalletState>({
    isAvailable: false,
    isConnected: false,
    accounts: [],
    walletType: null,
    error: null,
    isLoading: false
  });

  // Check wallet availability on mount
  useEffect(() => {
    const walletInfo = getWalletInfo();
    setState(prev => ({
      ...prev,
      isAvailable: walletInfo.available,
      walletType: walletInfo.type,
      error: walletInfo.available ? null : walletInfo.message
    }));
  }, []);

  // Connect to wallet
  const connect = useCallback(async () => {
    if (!isWalletFeatureEnabled()) {
      setState(prev => ({
        ...prev,
        error: 'Wallet features are not enabled for this application'
      }));
      return { success: false, error: 'FEATURE_DISABLED' };
    }

    if (!isMetaMaskAvailable()) {
      showWalletInstallPrompt();
      return { success: false, error: 'NO_WALLET' };
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await connectWalletSafely();
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isConnected: result.success,
        accounts: result.success ? result.accounts : [],
        error: result.success ? null : result.message
      }));

      return result;
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Connection failed'
      }));
      return { success: false, error: 'UNKNOWN_ERROR' };
    }
  }, []);

  // Disconnect from wallet
  const disconnect = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: false,
      accounts: [],
      error: null
    }));
  }, []);

  // Check if user should be prompted to install MetaMask
  const shouldPromptInstall = useCallback(() => {
    return isWalletFeatureEnabled() && !isMetaMaskAvailable();
  }, []);

  // Get user-friendly status message
  const getStatusMessage = useCallback(() => {
    if (!isWalletFeatureEnabled()) {
      return 'Wallet features are disabled';
    }
    if (!state.isAvailable) {
      return 'Please install MetaMask to use blockchain features';
    }
    if (state.error) {
      return state.error;
    }
    if (state.isConnected) {
      return `Connected to ${state.walletType}`;
    }
    return 'Wallet available but not connected';
  }, [state, isWalletFeatureEnabled]);

  return {
    ...state,
    connect,
    disconnect,
    shouldPromptInstall,
    getStatusMessage,
    isWalletFeatureEnabled: isWalletFeatureEnabled()
  };
};