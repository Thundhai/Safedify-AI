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
  // Only initialize wallet detection if features are enabled
  if (!isWalletFeatureEnabled()) {
    console.log('Wallet features disabled - skipping wallet initialization');
    return;
  }

  // Start MetaMask installation detection
  if (!isMetaMaskAvailable()) {
    detectMetaMaskInstallation();
  }

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
 * Show user-friendly wallet installation prompt with enhanced guidance
 */
export const showWalletInstallPrompt = () => {
  const modal = document.createElement('div');
  modal.innerHTML = `
    <div style="
      position: fixed; 
      top: 0; 
      left: 0; 
      width: 100%; 
      height: 100%; 
      background: rgba(0,0,0,0.5); 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <div style="
        background: white; 
        padding: 2rem; 
        border-radius: 12px; 
        max-width: 500px; 
        margin: 1rem;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      ">
        <div style="text-align: center; margin-bottom: 1.5rem;">
          <div style="
            width: 64px; 
            height: 64px; 
            background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); 
            border-radius: 50%; 
            margin: 0 auto 1rem; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            font-size: 24px;
          ">🦊</div>
          <h2 style="margin: 0 0 0.5rem 0; color: #1f2937; font-size: 1.5rem;">MetaMask Required</h2>
          <p style="margin: 0; color: #6b7280; font-size: 0.9rem;">Install MetaMask to use blockchain features in Safedify AI</p>
        </div>
        
        <div style="margin-bottom: 1.5rem;">
          <h3 style="margin: 0 0 0.75rem 0; color: #374151; font-size: 1rem;">Quick Setup Steps:</h3>
          <ol style="margin: 0; padding-left: 1.25rem; color: #4b5563; font-size: 0.9rem; line-height: 1.6;">
            <li>Click "Install MetaMask" below to visit the official site</li>
            <li>Install the browser extension for your browser</li>
            <li>Create or import your wallet</li>
            <li>Return to this page and refresh (we'll detect it automatically)</li>
          </ol>
        </div>
        
        <div style="display: flex; gap: 0.75rem; justify-content: center;">
          <button 
            onclick="window.open('https://metamask.io/download/', '_blank')" 
            style="
              background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); 
              color: white; 
              border: none; 
              padding: 0.75rem 1.5rem; 
              border-radius: 8px; 
              font-weight: 600; 
              cursor: pointer; 
              font-size: 0.9rem;
              transition: transform 0.2s;
            "
            onmouseover="this.style.transform='scale(1.05)'"
            onmouseout="this.style.transform='scale(1)'"
          >
            🦊 Install MetaMask
          </button>
          <button 
            onclick="document.body.removeChild(this.closest('div').parentElement); window.location.reload();" 
            style="
              background: #f3f4f6; 
              color: #374151; 
              border: 1px solid #d1d5db; 
              padding: 0.75rem 1.5rem; 
              border-radius: 8px; 
              cursor: pointer; 
              font-size: 0.9rem;
              transition: background-color 0.2s;
            "
            onmouseover="this.style.backgroundColor='#e5e7eb'"
            onmouseout="this.style.backgroundColor='#f3f4f6'"
          >
            🔄 I installed it, refresh page
          </button>
        </div>
        
        <div style="margin-top: 1.25rem; padding-top: 1.25rem; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; text-align: center; font-size: 0.8rem; color: #9ca3af;">
            MetaMask is a secure wallet that helps you access blockchain features safely.
            <br>
            <button 
              onclick="document.body.removeChild(this.closest('div').parentElement);" 
              style="background: none; border: none; color: #6b7280; text-decoration: underline; cursor: pointer; font-size: 0.8rem; margin-top: 0.5rem;"
            >
              Skip for now
            </button>
          </p>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
};

/**
 * Enhanced MetaMask detection with auto-refresh capability
 */
export const detectMetaMaskInstallation = () => {
  // Set up periodic checking for MetaMask installation
  const checkInterval = setInterval(() => {
    if (isMetaMaskAvailable()) {
      clearInterval(checkInterval);
      
      // Show success notification
      const notification = document.createElement('div');
      notification.innerHTML = `
        <div style="
          position: fixed; 
          top: 20px; 
          right: 20px; 
          background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
          color: white; 
          padding: 1rem 1.5rem; 
          border-radius: 8px; 
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); 
          z-index: 10001;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          animation: slideIn 0.3s ease-out;
        ">
          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <span style="font-size: 1.25rem;">🎉</span>
            <div>
              <div style="font-weight: 600; font-size: 0.9rem;">MetaMask Detected!</div>
              <div style="font-size: 0.8rem; opacity: 0.9;">Refreshing page to enable features...</div>
            </div>
          </div>
        </div>
        <style>
          @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        </style>
      `;
      
      document.body.appendChild(notification);
      
      // Auto-refresh after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    }
  }, 1000); // Check every second
  
  // Stop checking after 5 minutes to prevent infinite loops
  setTimeout(() => {
    clearInterval(checkInterval);
  }, 300000);
};