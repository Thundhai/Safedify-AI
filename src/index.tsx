import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css'; // This must point to your Tailwind CSS file
import './i18n'; // Initialize i18next before App renders
import App from './App';

/**
 * ENTRY POINT
 * This file mounts the React application to the HTML 'root' element.
 * It uses StrictMode to help identify potential problems during development.
 */

// Global error handler for MetaMask and other wallet injection errors
window.addEventListener('error', (event) => {
  // Suppress MetaMask connection errors that aren't initiated by our app
  if (event.message && 
      (event.message.includes('MetaMask extension not found') ||
       event.message.includes('Failed to connect to MetaMask') ||
       event.filename?.includes('inpage.js'))) {
    console.warn('MetaMask auto-injection error suppressed:', event.message);
    event.preventDefault();
    return false;
  }
});

// Suppress unhandled promise rejections from MetaMask auto-connect attempts
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && 
      (event.reason.message?.includes('MetaMask') ||
       event.reason.message?.includes('ethereum') ||
       event.reason.toString().includes('Failed to connect'))) {
    console.warn('MetaMask promise rejection suppressed:', event.reason);
    event.preventDefault();
    return false;
  }
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  // This error helps you debug if your index.html is missing the <div id="root"></div>
  throw new Error("Target container 'root' is missing. Please check your index.html file.");
}

const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);