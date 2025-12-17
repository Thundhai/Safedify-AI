/**
 * Web3 Wallet Service
 * Handles MetaMask and other wallet connections with proper detection and error handling
 */

// Type definitions for MetaMask/Web3
interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

/**
 * Check if MetaMask or compatible wallet is available
 */
export const isMetaMaskAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
};

/**
 * Check if MetaMask is specifically installed (not just any Ethereum provider)
 */
export const isMetaMaskInstalled = (): boolean => {
  return isMetaMaskAvailable() && window.ethereum?.isMetaMask === true;
};

/**
 * Get wallet info with proper error handling
 */
export const getWalletInfo = () => {
  if (!isMetaMaskAvailable()) {
    return {
      available: false,
      type: null,
      message: 'No Web3 wallet detected. MetaMask or compatible wallet required for blockchain features.'
    };
  }

  const isMetaMask = window.ethereum?.isMetaMask;
  return {
    available: true,
    type: isMetaMask ? 'MetaMask' : 'Unknown Web3 Wallet',
    message: `${isMetaMask ? 'MetaMask' : 'Web3 wallet'} detected and available.`
  };
};

/**
 * Safe MetaMask connection with proper error handling
 */
export const connectWalletSafely = async () => {
  // Check if wallet is available
  if (!isMetaMaskAvailable()) {
    console.warn('MetaMask connection attempted but no wallet found');
    return {
      success: false,
      error: 'NO_WALLET',
      message: 'Please install MetaMask or a compatible Web3 wallet to use blockchain features.',
      installUrl: 'https://metamask.io/download/'
    };
  }

  try {
    // Request account access
    const accounts = await window.ethereum!.request({
      method: 'eth_requestAccounts'
    });

    if (accounts.length === 0) {
      return {
        success: false,
        error: 'NO_ACCOUNTS',
        message: 'No accounts found. Please check your wallet connection.'
      };
    }

    return {
      success: true,
      accounts,
      message: `Successfully connected to ${getWalletInfo().type}`
    };

  } catch (error: any) {
    console.warn('Wallet connection failed:', error);

    // Handle specific error codes
    if (error.code === 4001) {
      return {
        success: false,
        error: 'USER_REJECTED',
        message: 'Connection was rejected by user. Please try again and approve the connection.'
      };
    }

    if (error.code === -32002) {
      return {
        success: false,
        error: 'ALREADY_PENDING',
        message: 'Connection request is already pending. Please check MetaMask.'
      };
    }

    return {
      success: false,
      error: 'CONNECTION_FAILED',
      message: `Failed to connect: ${error.message || 'Unknown error'}`
    };
  }
};

/**
 * Initialize wallet detection and suppress automatic connection attempts
 */
export const initializeWalletService = () => {
  // Suppress automatic MetaMask injection if not needed
  if (isMetaMaskAvailable() && !isWalletFeatureEnabled()) {
    console.log('Web3 wallet detected but blockchain features are disabled');
    
    // Prevent automatic connection attempts by other scripts
    try {
      // Override potential auto-connect functions
      if (window.ethereum && typeof window.ethereum.request === 'function') {
        const originalRequest = window.ethereum.request;
        window.ethereum.request = async (args) => {
          // Only allow requests initiated by our app
          if (args.method === 'eth_requestAccounts' && !isWalletFeatureEnabled()) {
            console.warn('MetaMask connection blocked - blockchain features not enabled');
            throw new Error('Blockchain features are not enabled for this application');
          }
          return originalRequest(args);
        };
      }
    } catch (e) {
      console.warn('Could not override wallet connection:', e);
    }
  }
};

/**
 * Check if wallet features should be enabled for this app
 * This can be configured based on user tier, feature flags, etc.
 */
export const isWalletFeatureEnabled = (): boolean => {
  // For now, disable wallet features as this is primarily an HSE management platform
  // This can be enabled later if blockchain features are needed
  return false;
};

/**
 * Show user-friendly wallet installation prompt
 */
export const showWalletInstallPrompt = () => {
  const message = `
    MetaMask Required
    
    To use blockchain features, please install MetaMask:
    1. Visit https://metamask.io/download/
    2. Install the browser extension
    3. Create or import a wallet
    4. Return to this page and try again
  `;

  // Could be replaced with a modal component
  if (confirm(message + '\n\nWould you like to visit the MetaMask download page?')) {
    window.open('https://metamask.io/download/', '_blank');
  }
};